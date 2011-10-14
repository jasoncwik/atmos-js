var ENTRY_TYPE = {
    DIRECTORY: 'directory',
    REGULAR: 'regular'
};

// Select Text plug-in (http://jsfiddle.net/edelman/KcX6A/94/)
jQuery.fn.selectText = function() {
    var element = this[0];
    var range = null;
    if ( document.body.createTextRange ) {
        range = document.body.createTextRange();
        range.moveToElementText( element );
        range.select();
    } else if ( window.getSelection ) {
        var selection = window.getSelection();
        if ( selection.setBaseAndExtent ) {
            selection.setBaseAndExtent( element, 0, element, 1 );
        } else {
            range = document.createRange();
            range.selectNodeContents( element );
            selection.removeAllRanges();
            selection.addRange( range );
        }
    }
};

// Plug-in to detect scroll bar width (necessary for layouts)
jQuery.scrollbarWidth = function() {
    if ( !jQuery._scrollbarWidth ) {
        var $temp = jQuery( '<div />' ).css( {position: 'absolute', left: '-200px', top: '0', width: '100px', height: '100px', 'overflow-y': 'scroll', 'background-color': 'red'} );
        var $inner = jQuery( '<div />' ).css( {width: '100%', height: '50px', 'background-color': 'red'} );
        $temp.append( $inner );
        jQuery( 'body' ).append( $temp );
        jQuery._scrollbarWidth = $temp.width() - $inner.width();
        $temp.remove();
    }
    return jQuery._scrollbarWidth;
};


// hackery to support IE <9. jQuery's bind will break remove() for any elements with associated events, so we can't use that either.
function atmosBind( element, eventName, eventFunction ) {
    element['on' + eventName] = function( event ) {
        if ( !event ) event = window.event;
        if ( !event.stopPropagation ) event.stopPropagation = function() {
            event.cancelBubble = true;
        };
        if ( !event.preventDefault ) event.preventDefault = function() {
            event.returnValue = false;
        };
        if ( !event.pageX ) event.pageX = event.x + document.scrollLeft;
        if ( !event.pageY ) event.pageY = event.y + document.scrollTop;
        eventFunction( event );
    };
}

/**
 * Use this to render a template (object markup). Provide a template name and a model and the appropriate tags will be
 * replaced with model values.
 * @param {String} templateName the name of the template to render (see atmos-templates.js)
 * @param {Object} model the model to use (tag/variable replacement) when rendering markup (optional)
 */
function atmosTemplate( templateName, model ) {
    var template = ATMOS_TEMPLATES[templateName];
    if ( !template ) throw templateName + " not found in templates";
    return atmosTemplateParse( template, model );
}

/**
 * Parser for templates. Probably should only be used by atmosTemplate, but does provide a velocity-like parser for strings.
 * @param {String} text the template text (to be parsed and rendered)
 * @param {Object} model the model from which to pull values for replacing tags/variables
 */
function atmosTemplateParse( text, model ) {
    var tags = text.match( /%\{[^}]+\}/g );
    if ( tags && !model ) throw "Template contains tags, but no model was specified";
    if ( !tags ) return text;
    var left = text;
    var complete = '';
    for ( var i = 0; i < tags.length; i++ ) {
        var tag = tags[i];
        var tagName = tag.substr( 2, tag.length - 3 );
        var tagStart = left.indexOf( tag );
        complete += left.substr( 0, tagStart ) + model[tagName];
        left = left.substr( tagStart + tag.length );
    }
    complete += left;
    return complete;
}

function AtmosBrowser( element, options ) {
    // default settings
    this.settings = {
        title: 'Atmos File Browser',
        uid : null,
        secret : null,
        location : '/',
        deletePrompt : true
    };
    if ( options ) {
        jQuery.extend( this.settings, options );
    }
    this.atmos = new AtmosRest( this.settings );
    this.$root = jQuery( element ).addClass( 'atmosBrowser' );
    this.$titleBar = jQuery( atmosTemplate( 'TITLE_BAR' ) ).text( this.settings.title );
    this.$root.append( this.$titleBar );
    this.toolBar = new ToolBar( this.$root, this );
    this.fileList = new FileList( this.$root, this );
    this.modalWindow = new ModalWindow();

    this.openDirectory( this.settings.location );
}

AtmosBrowser.prototype.createDirectory = function() {
    var name = prompt( atmosTemplate( 'NEW_DIRECTORY_NAME_PROMPT' ), '' );
    while ( name != null && name.length > 0 && !this._validName( name ) ) {
        alert( atmosTemplate( 'VALID_NAME_ERROR', {name: name} ) );
        name = prompt( atmosTemplate( 'NEW_DIRECTORY_NAME_PROMPT' ), name );
    }
    if ( name == null || name.length == 0 ) return;
    var currentLocation = this.toolBar.currentLocation;
    var path = this._makeDirectory( currentLocation + name );
    var browser = this;
    this.atmos.createObjectOnPath( path, null, null, null, null, null, null, function( result ) {
        if ( result.success ) {
            browser.fileList.createRow( {name: name, path: path, type: ENTRY_TYPE.DIRECTORY} );
        } else {
            browser.error( dumpObject( result ) );
        }
    } );
};
AtmosBrowser.prototype.openDirectory = function( path ) {
    if ( !path || path === '' ) path = '/';
    if ( !this._validPath( path ) ) {
        this.error( atmosTemplate( 'VALID_PATH_ERROR', {path: path} ) );
        return;
    }
    path = this._makeDirectory( path );
    this.fileList.showWaitMessage();

    var browser = this;
    var fileList = this.fileList;
    var options = new ListOptions( 0, null, true, null, null );
    this.atmos.listDirectory( path, options, null, function( result ) {
        if ( result.success ) {
            browser.toolBar.setCurrentLocation( path );
            fileList.clear();

            for ( var i = 0; i < result.results.length; i++ ) {
                var entry = result.results[i];
                if ( path === '/' && entry.name === 'apache' ) continue;
                fileList.createRow( entry );
            }
            fileList.sort( 0, false );
        } else {
            browser.error( dumpObject( result ) );
        }
    } );
};
AtmosBrowser.prototype.refresh = function() {
    this.openDirectory( this.toolBar.currentLocation );
};
AtmosBrowser.prototype.openFile = function( path ) {
    window.open( this.atmos.getShareableUrl( path, this._createExpirationDate() ) );
};
AtmosBrowser.prototype.openSelectedItem = function() {
    var fileRow = this.fileList.getSelectedRow();
    if ( fileRow.entry.type == ENTRY_TYPE.DIRECTORY ) {
        this.openDirectory( fileRow.entry.path );
    } else {
        this.openFile( fileRow.entry.path );
    }
};
AtmosBrowser.prototype.viewSelectedItemProperties = function() {
    var fileRow = this.fileList.getSelectedRow();
    if ( !fileRow ) {
        alert( atmosTemplate( 'NOTHING_SELECTED_ERROR' ) );
        return;
    }
    var browser = this;
    this.atmos.getUserMetadata( fileRow.entry.path, null, null, function( result ) {
        if ( result.success ) {
            fileRow.entry.userMeta = result.meta;
            fileRow.entry.listableUserMeta = result.listableMeta;
            new PropertiesPage( browser, fileRow.entry, browser.atmos, browser.modalWindow );
        } else {
            browser.error( dumpObject( result ) );
        }
    } );
};
AtmosBrowser.prototype.shareSelectedItem = function() {
    var fileRow = this.fileList.getSelectedRow();
    var $sharePage = jQuery( atmosTemplate( 'SHARE_PAGE' ) );
    var $expirationWrapper = jQuery( atmosTemplate( 'SHARE_EXPIRATION_WRAPPER' ) );
    var $expirationLabel = jQuery( atmosTemplate( 'SHARE_EXPIRATION_LABEL' ) );
    var $expirationField = jQuery( '<input type="text" class="atmosExpirationDate" />' );
    var $shareInstructions = jQuery( atmosTemplate( 'SHARE_INSTRUCTIONS' ) );
    var $shareUrl = jQuery( atmosTemplate( 'SHARE_URL' ) );
    $expirationField.datepicker();

    var browser = this;
    $sharePage.append( $expirationWrapper );
    new ButtonBar( $sharePage ).createButton( atmosTemplate( 'GENERATE_BUTTON_NAME' ), atmosTemplate( 'GENERATE_BUTTON_DESC' ), function() {
        var expDate = $expirationField.datepicker( "getDate" );
        if ( expDate ) {
            $shareUrl.text( browser.atmos.getShareableUrl( fileRow.entry.path, expDate ) );
            $shareUrl.selectText();
        }
    } );
    $sharePage.append( $shareInstructions ).append( $shareUrl );
    $expirationWrapper.append( $expirationLabel ).append( $expirationField );

    this.modalWindow.showContent( atmosTemplate( 'SHARE_TITLE', {name: fileRow.entry.name} ), $sharePage );
};
AtmosBrowser.prototype.uploadFiles = function( files ) { // FileList (HTML5 File API)
    for ( var i = 0; i < files.length; i++ ) {
        var file = files[i];
        var path = this.toolBar.currentLocation + file.name;

        // upload file (in webkit and mozilla browsers, we can call xhr.send(file) directly without processing it (major time saver!)
        var browser = this;
        (function( path, file ) {

            // first check if the file exists
            browser.atmos.getSystemMetadata( path, null, null, function( result ) {
                var overwrite = false;
                if ( result.success ) {
                    if ( result.systemMeta.type == ENTRY_TYPE.DIRECTORY ) {

                        // can't overwrite directories
                        alert( atmosTemplate( 'DIRECTORY_EXISTS_ERROR', {name: file.name} ) );
                        return;
                    }

                    // prompt to see if the users wishes to overwrite
                    overwrite = confirm( atmosTemplate( 'ITEM_EXISTS_PROMPT', {name: file.name} ) );
                    if ( !overwrite ) return;
                }

                // grab the file row or create one
                var fileRow = browser.fileList.findRow( file.name );
                if ( !fileRow ) fileRow = browser.fileList.createRow( {name: file.name, path: path, size: file.size, type: ENTRY_TYPE.REGULAR} );
                fileRow.showStatus();
                fileRow.setStatus( 0 );
                var successF = function( result2 ) {
                    if ( result2.success ) {

                        // refresh local metadata
                        browser.atmos.getSystemMetadata( path, null, null, function( result3 ) {
                            if ( result3.success ) {
                                fileRow.updateEntry( {name: file.name, path: path, systemMeta: result3.systemMeta, type: ENTRY_TYPE.REGULAR} );
                                fileRow.hideStatus();
                            } else {
                                browser.error( dumpObject( result3 ) );
                            }
                        } );
                    } else {
                        browser.error( dumpObject( result2 ) );
                        if ( !overwrite ) fileRow.remove();
                        else fileRow.hideStatus();
                    }
                };
                var progressF = function( status ) {
                    fileRow.setStatus( status );
                };
                if ( overwrite ) {
                    browser.atmos.updateObject( path, null, null, null, file, null, (file.type || 'application/octet-stream'), null, successF, progressF );
                } else {
                    browser.atmos.createObjectOnPath( path, null, null, null, file, (file.type || 'application/octet-stream'), null, successF, progressF );
                }
            } );
        })( path, file ); // add scope for asynchronous call
    }
};
AtmosBrowser.prototype.deleteSelectedItem = function() {
    var selectedRow = this.fileList.getSelectedRow();
    if ( !selectedRow ) {
        alert( atmosTemplate( 'NOTHING_SELECTED_ERROR' ) );
        return;
    }
    var entry = selectedRow.entry;
    var browser = this;
    if ( this.settings.deletePrompt && !confirm( atmosTemplate( 'DELETE_ITEM_PROMPT', {path: entry.path} ) ) ) return;
    this.atmos.deleteObject( entry.path, null, function( result ) {
        if ( result.success ) {
            selectedRow.remove();
        } else {
            browser.error( dumpObject( result ) );
        }
    } );
};
AtmosBrowser.prototype.renameSelectedItem = function() {
    var selectedRow = this.fileList.getSelectedRow();
    var name = prompt( atmosTemplate( 'RENAME_ITEM_PROMPT' ), selectedRow.entry.name );
    while ( name != null && name.length > 0 && !this._validName( name ) ) {
        alert( atmosTemplate( 'VALID_NAME_ERROR', {name: name} ) );
        name = prompt( atmosTemplate( 'RENAME_ITEM_PROMPT' ), name );
    }
    if ( name == null || name.length == 0 ) return;
    var currentLocation = this.toolBar.currentLocation;
    var path = this._makeDirectory( currentLocation + name );
    var browser = this;
    browser.atmos.getSystemMetadata( path, null, null, function( result ) {
        var overwrite = false;
        if ( result.success ) {
            if ( result.systemMeta.type == ENTRY_TYPE.DIRECTORY ) {
                alert( atmosTemplate( 'DIRECTORY_EXISTS_ERROR', {name: name} ) );
                return;
            }
            overwrite = confirm( atmosTemplate( 'ITEM_EXISTS_PROMPT', {name: name} ) );
            if ( !overwrite ) return;
        }
        browser.atmos.rename( selectedRow.entry.path, path, overwrite, null, function( result2 ) {
            if ( result2.success ) {
                if ( overwrite ) {
                    var existingRow = browser.fileList.findRow( name );
                    if ( existingRow ) existingRow.remove();
                }
                selectedRow.entry.path = path;
                selectedRow.entry.name = name;
                selectedRow.updateEntry( selectedRow.entry );
            } else {
                browser.error( dumpObject( result2 ) );
            }
        } );
    } );
};
AtmosBrowser.prototype.error = function( message ) {
    alert( message );
};
AtmosBrowser.prototype._createExpirationDate = function() {
    var date = new Date();
    date.setHours( date.getHours() + 1 ); // 1 hour in the future
    return date;
};
AtmosBrowser.prototype._validPath = function( path ) {
    return !(!path || path.trim().length == 0 || /[?@]/.test( path ) || !/^\//.test( path ));
};
AtmosBrowser.prototype._validName = function( name ) {
    return !(!name || name.trim().length == 0 || /[?@/]/.test( name ));

};
AtmosBrowser.prototype._makeDirectory = function( path ) {
    path = path.trim();
    if ( path[path.length - 1] !== '/' ) path += '/';
    return path;
};
AtmosBrowser.prototype.parentDirectory = function( path ) {
    if ( !this._validPath( path ) ) {
        throw path + " is not a valid path";
    }

    path = path.substr( 0, path.length - 1 ); // remove last character in case it's a slash

    var lastSlashIndex = path.lastIndexOf( '/' );
    if ( lastSlashIndex === 0 ) return '/';
    else return path.substr( 0, lastSlashIndex );
};

function ToolBar( parent, atmosBrowser ) {
    this.browser = atmosBrowser;
    this.$root = jQuery( atmosTemplate( 'TOOL_BAR' ) );
    this.$locationField = jQuery( atmosTemplate( 'LOCATION_FIELD' ) );
    this.$uploadSection = jQuery( '<div />' ).css( {position: 'relative', display: 'inline-block', overflow: 'hidden'} );
    this.$uploadField = jQuery( atmosTemplate( 'UPLOAD_FIELD' ) ).attr( 'title', atmosTemplate( 'UPLOAD_FIELD_DESC' ) );
    parent.append( this.$root );

    var toolBar = this;

    new ButtonBar( this.$root ).add( this.$locationField ).createButton( atmosTemplate( 'GO_BUTTON_NAME' ), atmosTemplate( 'GO_BUTTON_DESC' ),
        function() {
            toolBar.browser.openDirectory( toolBar.$locationField.val() );
        } ).createButton( atmosTemplate( 'UP_BUTTON_NAME' ), atmosTemplate( 'UP_BUTTON_DESC' ),
        function() {
            var parentPath = toolBar.browser.parentDirectory( toolBar.currentLocation );
            if ( parentPath ) toolBar.browser.openDirectory( parentPath );
        } ).createButton( atmosTemplate( 'CREATE_BUTTON_NAME' ), atmosTemplate( 'CREATE_BUTTON_DESC' ), function() {
            toolBar.browser.createDirectory();
        } );

    new ButtonBar( this.$root ).createButton( atmosTemplate( 'DELETE_BUTTON_NAME' ), atmosTemplate( 'DELETE_BUTTON_DESC' ),
        function() {
            toolBar.browser.deleteSelectedItem();
        } ).createButton( atmosTemplate( 'RENAME_BUTTON_NAME' ), atmosTemplate( 'RENAME_BUTTON_DESC' ),
        function() {
            toolBar.browser.renameSelectedItem();
        } ).createButton( atmosTemplate( 'SHARE_BUTTON_NAME' ), atmosTemplate( 'SHARE_BUTTON_DESC' ),
        function() {
            toolBar.browser.shareSelectedItem();
        } ).createButton( atmosTemplate( 'PROPERTIES_BUTTON_NAME' ), atmosTemplate( 'PROPERTIES_BUTTON_DESC' ),
        function() {
            toolBar.browser.viewSelectedItemProperties();
        } ).add( this.$uploadSection );
    /*.createButton( atmosTemplate( 'DOWNLOAD_BUTTON_NAME' ), atmosTemplate( 'DOWNLOAD_BUTTON_DESC' ), function() {
     toolBar.browser.downloadSelectedItem();
     } );*/

    // overlay upload field for browsers that don't support input[type=file].click() firing (FireFox).
    this.uploadButton = new Button( this.$uploadSection, atmosTemplate( 'UPLOAD_BUTTON_NAME' ), atmosTemplate( 'UPLOAD_BUTTON_DESC' ), function() {
        toolBar.$uploadField.click();
    } );
    this.$uploadSection.append( this.uploadButton.$root ).append( this.$uploadField );
    this.$uploadField.css( {position: 'absolute', left: '0', top: '0', opacity: '0.0', filter: 'alpha(opacity = 0)'} );
    this.$uploadSection.width( this.uploadButton.$root.outerWidth( true ) );

    atmosBind( this.$locationField[0], 'keypress', function( event ) {
        if ( event.which == 13 ) {
            event.stopPropagation();
            event.preventDefault();
            toolBar.browser.openDirectory( toolBar.$locationField.val() );
        }
    } );
    this.$locationField[0].onblur = function() {
        toolBar.resetLocation();
    };
    jQuery( window ).mousedown( function( event ) {
        if ( event.source !== toolBar.$locationField[0] ) toolBar.resetLocation();
    } );

    atmosBind( this.$uploadField[0], 'change', function( event ) {
        toolBar.browser.uploadFiles( event.target.files );
    } );
}

ToolBar.prototype.setCurrentLocation = function( currentLocation ) {
    this.currentLocation = currentLocation;
    this.$locationField.val( currentLocation );
};
ToolBar.prototype.resetLocation = function() {
    this.$locationField.val( this.currentLocation );
};

function ButtonBar( parent ) {
    this.$root = jQuery( atmosTemplate( 'BUTTON_BAR' ) );
    parent.append( this.$root );
}

ButtonBar.prototype.add = function( component ) {
    this.$root.append( component );
    return this;
};
ButtonBar.prototype.createButton = function( name, description, clickFunction ) {
    new Button( this.$root, name, description, clickFunction );
    return this;
};

function Button( parent, name, description, clickFunction ) {
    this.$root = jQuery( atmosTemplate( 'BUTTON' ) ).text( name ).attr( 'title', description );
    parent.append( this.$root );
    this.$root[0].onclick = clickFunction;
}

function FileList( parent, atmosBrowser ) {
    this.browser = atmosBrowser;
    this.$root = jQuery( atmosTemplate( 'FILE_LIST' ) );
    parent.append( this.$root );
    this.$header = jQuery( atmosTemplate( 'FILE_LIST_HEADER' ) );
    this.$body = jQuery( atmosTemplate( 'FILE_LIST_BODY' ) );
    this.$table = jQuery( atmosTemplate( 'FILE_LIST_TABLE' ) ).addClass( 'table' );
    this.fileRows = [];

    this.$body.append( this.$table );
    this.$root.append( this.$header ).append( this.$body );

    var fileList = this;

    // drag-n-drop
    atmosBind( this.$body[0], 'dragenter', function( event ) {
        event.stopPropagation();
        event.preventDefault();
    } );
    atmosBind( this.$body[0], 'dragover', function( event ) {
        event.stopPropagation();
        event.preventDefault();
    } );
    atmosBind( this.$body[0], 'drop', function( event ) {
        event.stopPropagation();
        event.preventDefault();
        fileList.browser.uploadFiles( event.dataTransfer.files );
    } );

    // account for the scrollbar (must be dynamic to support Lion's overlay scrollbars)
    this.$header.css( 'margin-right', jQuery.scrollbarWidth() + 'px' );

    // sortable columns
    this.$header.find( '.cell' ).each( function() {
        var header = jQuery( this ),
            index = header.index(),
            inverse = false;

        header[0].onclick = function() {
            fileList.sort( index, inverse );
            inverse = !inverse;
        };
    } );
}

FileList.prototype.sort = function( columnIndex, inverse ) {
    this.$table.find( '.row' ).sortElements( function( a, b ) {
        return jQuery( a ).find( '.cell:eq(' + columnIndex + ')' ).text() > jQuery( b ).find( '.cell:eq(' + columnIndex + ')' ).text() ?
            inverse ? -1 : 1
            : inverse ? 1 : -1;
    } );
};
FileList.prototype.clear = function() {
    this.fileRows = [];
    this.$table.html( '' );
};
FileList.prototype.showWaitMessage = function() {
    this.fileRows = [];
    this.$table.html( atmosTemplate( 'FILE_LIST_WAIT_MESSAGE' ) );
};
FileList.prototype.createRow = function( entry ) {
    var fileRow = new FileRow( this.$table, this, entry );
    this.fileRows.push( fileRow );
    return fileRow;
};
FileList.prototype.selectRow = function( fileRow ) {
    this.selectedRow = fileRow;
    jQuery( '.selected', this.$table ).toggleClass( 'selected' ); // turn off all selected rows
    if ( fileRow ) fileRow.$root.toggleClass( 'selected' ); // select this row
};
FileList.prototype.getSelectedRow = function() {
    return this.selectedRow || null;
};
FileList.prototype.findRow = function( name ) {
    for ( var i = 0; i < this.fileRows.length; i++ ) {
        var fileRow = this.fileRows[i];
        if ( fileRow.entry.name == name ) return fileRow;
    }
    return null;
};

function FileRow( parent, fileList, entry ) {
    this.fileList = fileList;
    this.$root = jQuery( atmosTemplate( 'FILE_ROW' ) ).addClass( 'row' );
    parent.append( this.$root );
    this.$icon = jQuery( atmosTemplate( 'FILE_ICON_CELL' ) ).addClass( 'cell' );
    this.$name = jQuery( atmosTemplate( 'FILE_NAME_CELL' ) ).addClass( 'cell' );
    this.$size = jQuery( atmosTemplate( 'FILE_SIZE_CELL' ) ).addClass( 'cell' );
    this.$type = jQuery( atmosTemplate( 'FILE_TYPE_CELL' ) ).addClass( 'cell' );
    this.$status = jQuery( atmosTemplate( 'STATUS_BAR' ) );
    this.interactive = true;

    this.$root.append( this.$icon ).append( this.$name ).append( this.$size ).append( this.$type );
    this.contextMenu = new ContextMenu( fileList.browser );

    this.updateEntry( entry );

    var fileRow = this;
    this.$root[0].onmousedown = function() {
        if ( fileRow.interactive ) fileList.selectRow( fileRow );
    };
    // right-click behavior
    atmosBind( this.$root[0], 'contextmenu', function( event ) {
        if ( fileRow.interactive ) {
            event.stopPropagation();
            event.preventDefault();
            fileRow.contextMenu.show();
            fileRow.contextMenu.moveTo( {x: event.pageX, y: event.pageY} );
        }
    } );
    atmosBind( this.$root[0], 'dblclick', function( event ) {
        event.stopPropagation();
        event.preventDefault();
        if ( fileRow.interactive ) {
            fileList.browser.openSelectedItem();
        }
    } );
}

FileRow.prototype.updateEntry = function( entry ) {
    this.size = entry.size || '';
    if ( entry.type !== ENTRY_TYPE.DIRECTORY && entry.systemMeta ) this.size = entry.systemMeta.size || 'n/a';

    // classify icon for ease of styling
    var $icon = jQuery( atmosTemplate( 'FILE_ICON' ) ).addClass( 'icon' ).addClass( entry.type );
    var ext = this._getExtension( entry.name );
    if ( /^[a-zA-Z0-9]+$/.test( ext ) ) $icon.addClass( ext );

    this.$icon.html( $icon );
    this.$name.text( entry.name );
    this.$size.text( this.size );
    this.$type.text( entry.type );
    this.entry = entry;
};
FileRow.prototype.showStatus = function() {
    this.interactive = false;
    this.sizeWidth = this.$size.width();
    this.$size.html( this.$status );
    this.$status.width( 0 );
};
FileRow.prototype.setStatus = function( percent ) {
    this.$status.width( this.sizeWidth * percent / 100 );
    this.$status.text( percent + "%" );
};
FileRow.prototype.hideStatus = function() {
    this.$size.html( this.size );
    this.interactive = true;
};
FileRow.prototype.remove = function() {
    this.$root.remove();
    this.fileList.selectRow( null );
};
FileRow.prototype._getExtension = function( fileName ) {
    var dotIndex = fileName.lastIndexOf( '.' );
    if ( dotIndex == -1 ) return null;
    return fileName.substr( dotIndex + 1 );
};

function ContextMenu( browser ) {
    this.browser = browser;

    this.$root = jQuery( atmosTemplate( 'CONTEXT_MENU' ) ).addClass( 'atmosContextMenu' );
    jQuery( 'body' ).append( this.$root );

    this.createOption( atmosTemplate( 'OPEN_BUTTON_NAME' ),
        function() {
            browser.openSelectedItem();
        } )/*.createOption( atmosTemplate( 'SAVE_AS_BUTTON_NAME' ),
     function() {
     alert( 'TODO: implement' ); // TODO: implement
     } )*/.createOption( atmosTemplate( 'RENAME_BUTTON_NAME' ),
        function() {
            browser.renameSelectedItem();
        } ).createOption( atmosTemplate( 'DELETE_BUTTON_NAME' ),
        function() {
            browser.deleteSelectedItem();
        } ).createOption( atmosTemplate( 'PROPERTIES_BUTTON_NAME' ), function() {
            browser.viewSelectedItemProperties();
        } );

    this.hide();
}

jQuery( window ).mousedown( function( event ) {
    if ( !jQuery( event.target ).hasClass( 'atmosContextMenuOption' ) ) jQuery( '.atmosContextMenu' ).hide();
} );
ContextMenu.prototype.createOption = function( name, callback ) {
    var $option = jQuery( atmosTemplate( 'CONTEXT_MENU_OPTION', {name: name} ) ).addClass( 'atmosContextMenuOption' );
    this.$root.append( $option );

    var menu = this;
    $option[0].onclick = function() {
        callback();
        menu.hide();
    };
    return this;
};
ContextMenu.prototype.show = function() {
    this.$root.show();
};
ContextMenu.prototype.hide = function() {
    this.$root.hide();
};
ContextMenu.prototype.moveTo = function( location ) {
    this.$root.css( "left", location.x + "px" );
    this.$root.css( "top", location.y + "px" );
};

function ModalWindow() {
    this.$background = jQuery( atmosTemplate( 'MODAL_BACKGROUND' ) );
    this.$window = jQuery( atmosTemplate( 'MODAL_WINDOW' ) );
    this.$titleBar = jQuery( atmosTemplate( 'TITLE_BAR' ) );
    this.$title = jQuery( atmosTemplate( 'TITLE' ) );
    this.$closeButton = jQuery( atmosTemplate( 'CLOSE_BUTTON' ) );
    this.$content = jQuery( atmosTemplate( 'MODAL_WINDOW_CONTENT' ) );

    this.$titleBar.append( this.$title ).append( this.$closeButton );
    this.$window.append( this.$titleBar ).append( this.$content );
    jQuery( 'body' ).append( this.$background ).append( this.$window );

    var modal = this;
    this.$closeButton[0].onclick = function() {
        modal.hide();
    };

    this.hide();
}

ModalWindow.prototype.show = function() {
    this.$background.show();
    this.$window.show();
};
ModalWindow.prototype.hide = function() {
    this.$background.hide();
    this.$window.hide();
};
ModalWindow.prototype.showCloseButton = function() {
    this.$closeButton.show();
};
ModalWindow.prototype.hideCloseButton = function() {
    this.$closeButton.hide();
};
ModalWindow.prototype.showContent = function( title, content, width ) {
    if ( !width ) width = 500; // TODO: refactor as an option with default
    this.$title.html( title );
    this.$content.html( content );
    this.$window.width( width );
    this.$window.css( {top:'50%',left:'50%',margin:('-' + (this.$window.height() / 2) + 'px 0 0 -' + (width / 2) + 'px')} );
    this.show();
};
ModalWindow.prototype.remove = function() {
    this.$background.remove();
    this.$window.remove();
};

function PropertiesPage( browser, entry, atmos, modalWindow ) {
    this.browser = browser;
    this.entry = entry;
    this.atmos = atmos;
    this.modalWindow = modalWindow;
    this.$root = jQuery( atmosTemplate( 'PROPERTIES_PAGE' ) );

    var page = this;
    new ButtonBar( this.$root ).createButton( atmosTemplate( 'SAVE_BUTTON_NAME' ), atmosTemplate( 'SAVE_BUTTON_DESC' ),
        function() {
            page.save();
        } ).createButton( atmosTemplate( 'CANCEL_BUTTON_NAME' ), atmosTemplate( 'CANCEL_BUTTON_DESC' ), function() {
            page.modalWindow.hide();
        } );

    this.userMetaTable = new PropertiesTable( this, atmosTemplate( 'USER_METADATA_NAME' ), entry.userMeta, true );
    this.listableMetaTable = new PropertiesTable( this, atmosTemplate( 'LISTABLE_METADATA_NAME' ), entry.listableUserMeta, true );
    this.systemMetaTable = new PropertiesTable( this, atmosTemplate( 'SYSTEM_METADATA_NAME' ), entry.systemMeta, false );
    this.$root.append( this.userMetaTable.$root ).append( this.listableMetaTable.$root ).append( this.systemMetaTable.$root );

    this.modalWindow.showContent( atmosTemplate( 'PROPERTIES_PAGE_TITLE', {name: entry.name} ), this.$root );
}

PropertiesPage.prototype.save = function() {
    var page = this;

    var meta = this.userMetaTable.getProperties();
    var listableMeta = this.listableMetaTable.getProperties();

    var allTags = Object.keys( meta ).concat( Object.keys( listableMeta ) );
    var existingTags = Object.keys( page.entry.userMeta || {} ).concat( Object.keys( page.entry.listableUserMeta || {} ) );

    var deletedTags = new Array();
    for ( var i = 0; i < existingTags.length; i++ ) {
        var p = existingTags[i];
        if ( allTags.indexOf( p ) == -1 ) deletedTags.push( p );
    }

    var metaSaved = false, metaDeleted = false;
    var callComplete = function() {
        if ( metaSaved && metaDeleted ) page.modalWindow.hide();
    };
    if ( allTags.length > 0 ) {
        page.atmos.setUserMetadata( page.entry.path, meta, listableMeta, null, function( result ) {
            if ( result.success ) {
                metaSaved = true;
                callComplete();
            } else {
                page.browser.error( dumpObject( result ) );
            }
        } );
    } else metaSaved = true;
    if ( deletedTags.length > 0 ) {
        page.atmos.deleteUserMetadata( page.entry.path, deletedTags, null, function( result ) {
            if ( result.success ) {
                metaDeleted = true;
                callComplete();
            } else {
                page.browser.error( dumpObject( result ) );
            }
        } );
    } else metaDeleted = true;
    callComplete(); // in case there's no metadata and no deletes
};
PropertiesPage.prototype._validTag = function( tag ) {
    if ( !tag || tag.trim().length == 0 ) {
        alert( atmosTemplate( 'TAG_EMPTY' ) );
        return false;
    }
    var properties = new Object();
    jQuery.extend( properties, this.userMetaTable.getProperties(), this.listableMetaTable.getProperties() );
    if ( properties.hasOwnProperty( tag ) ) {
        alert( atmosTemplate( 'TAG_EXISTS', {tag: tag} ) );
        return false;
    }
    if ( !this.browser._validName( tag ) ) {
        alert( atmosTemplate( 'VALID_NAME_ERROR', {name: tag} ) );
        return false;
    }
    return true;
};

function PropertiesTable( page, title, properties, editable ) {
    this.page = page;
    this.editable = editable;
    this.$root = jQuery( atmosTemplate( 'PROPERTIES_TABLE_CONTAINER' ) );
    this.$tableTitle = jQuery( atmosTemplate( 'PROPERTIES_TABLE_TITLE', {title: title} ) );
    this.$table = jQuery( atmosTemplate( 'PROPERTIES_TABLE' ) ).addClass( 'table' );

    var table = this;

    this.$root.append( this.$tableTitle );
    if ( editable ) {
        new Button( this.$root, atmosTemplate( 'ADD_BUTTON_NAME' ), atmosTemplate( 'ADD_PROPERTY_DESC' ), function() {
            table.createProperty();
        } );
    }
    this.$root.append( this.$table );
    for ( var prop in properties ) {
        if ( !properties.hasOwnProperty( prop ) ) continue;
        this.$table.append( new Property( prop, properties[prop], editable ).$root );
    }
}

PropertiesTable.prototype.createProperty = function() {
    var tag = prompt( atmosTemplate( 'TAG_PROMPT' ), '' );
    while ( tag != null && tag.length > 0 && !this.page._validTag( tag ) ) {
        tag = prompt( atmosTemplate( 'TAG_PROMPT' ), tag );
    }
    if ( tag != null && tag.length > 0 ) {
        this.$table.append( new Property( tag, '', true ).$root );
    }
};
PropertiesTable.prototype.getProperties = function() {
    var properties = new Object();
    this.$table.children( '.row' ).each( function() {
        var prop = jQuery( this ).find( '.atmosPropertyName' ).text();
        var $val = jQuery( this ).find( '.atmosPropertyValue' );
        var val = $val.is( 'input' ) ? $val.val() : $val.text();
        if ( prop ) properties[prop] = val;
    } );
    return properties;
};

function Property( name, value, editable ) {
    this.$root = jQuery( atmosTemplate( 'PROPERTY_ROW' ) ).addClass( 'row' );
    this.$name = jQuery( atmosTemplate( 'PROPERTY_NAME_CELL', {name: name} ) ).addClass( 'cell' ).addClass( 'atmosPropertyName' );
    this.$value = jQuery( atmosTemplate( 'PROPERTY_VALUE_CELL' ) ).addClass( 'cell' );
    if ( editable ) {
        this.$value.append( jQuery( '<input type="text" class="atmosPropertyValue" />' ).val( value ) );
    } else {
        this.$value.addClass( 'atmosPropertyValue' ).text( value );
    }

    this.$root.append( this.$name ).append( this.$value );

    var property = this;
    if ( editable ) {
        var $delete = jQuery( atmosTemplate( 'PROPERTY_BUTTON_CELL' ) ).addClass( 'cell' );
        this.$root.append( $delete );
        new Button( $delete, atmosTemplate( 'DELETE_BUTTON_NAME' ), atmosTemplate( 'DELETE_PROPERTY_DESC' ), function() {
            property.$root.remove();
        } );
    }
}

function LoginPage( subtenant, user, secret, callback ) {
    this.$root = jQuery( atmosTemplate( 'LOGIN_PAGE' ) );
    this.$table = jQuery( atmosTemplate( 'LOGIN_TABLE' ) ).addClass( 'table' );
    this.$subtenant = jQuery( '<input type="text" class="atmosCredentialValue" />' ).val( subtenant );
    this.$user = jQuery( '<input type="text" class="atmosCredentialValue" />' ).val( user );
    this.$secret = jQuery( '<input type="text" class="atmosCredentialValue" />' ).val( secret );
    this.modalWindow = new ModalWindow();

    var $subtenantLabel = jQuery( atmosTemplate( 'SUBTENANT_LABEL_CELL' ) ).addClass( 'cell' );
    var $userLabel = jQuery( atmosTemplate( 'USER_LABEL_CELL' ) ).addClass( 'cell' );
    var $secretLabel = jQuery( atmosTemplate( 'SECRET_LABEL_CELL' ) ).addClass( 'cell' );

    this.$root.append( this.$table );
    this.$table.append( jQuery( atmosTemplate( 'LOGIN_ROW' ) ).addClass( 'row' ).append(
        $subtenantLabel ).append(
        jQuery( atmosTemplate( 'CREDENTIAL_VALUE_CELL' ) ).addClass( 'cell' ).append( this.$subtenant ) ) );
    this.$table.append( jQuery( atmosTemplate( 'LOGIN_ROW' ) ).addClass( 'row' ).append(
        $userLabel ).append(
        jQuery( atmosTemplate( 'CREDENTIAL_VALUE_CELL' ) ).addClass( 'cell' ).append( this.$user ) ) );
    this.$table.append( jQuery( atmosTemplate( 'LOGIN_ROW' ) ).addClass( 'row' ).append(
        $secretLabel ).append(
        jQuery( atmosTemplate( 'CREDENTIAL_VALUE_CELL' ) ).addClass( 'cell' ).append( this.$secret ) ) );

    var page = this;
    new ButtonBar( this.$root ).createButton( atmosTemplate( 'LOGIN_BUTTON_NAME' ), atmosTemplate( 'LOGIN_BUTTON_DESC' ), function() {
        var uid = page.$subtenant.val() + '/' + page.$user.val();
        callback( uid, page.$secret.val() );
        page.modalWindow.remove();
    } );

    this.modalWindow.showContent( atmosTemplate( 'LOGIN_PAGE_TITLE' ), this.$root, 400 );
    this.modalWindow.hideCloseButton();
}

jQuery.fn.atmosBrowser = function( options ) {
    var jq = this;
    if ( !options.uid || !options.secret ) {
        new LoginPage( options.subtenant, options.user, options.secret, function( uid, secret ) {
            options.uid = uid;
            options.secret = secret;
            jq.each( function() {
                new AtmosBrowser( this, options );
            } );
        } );
    }

    return jq;
};
