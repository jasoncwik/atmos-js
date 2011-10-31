function AtmosBrowser( options, pageElements, $parent ) {
    this.templates = new AtmosTemplateEngine( pageElements );

    // default settings
    this.settings = {
        uid : null,
        secret : null,
        deletePrompt : true,
        location : '/'
    };
    if ( options ) {
        jQuery.extend( this.settings, options );
    }

    if ( this.settings.subtenant && this.settings.user ) this.settings.uid = this.settings.subtenant + '/' + this.settings.user;

    // get credentials if necessary
    if ( !this.settings.uid || !this.settings.secret ) {
        var browser = this;
        new LoginPage( browser.settings, browser.templates, function( uid, secret ) {
            browser.settings.uid = uid;
            browser.settings.secret = secret;
            browser._init();
        } );
    } else this._init( $parent );
}

AtmosBrowser.prototype._init = function( $parent ) {

    // locate content flags
    var $main = jQuery( this.templates.get( 'main' ).render( {}, ['input.atmosLocationField', '.atmosFileListTable'] ) );
    this.$locationField = $main.find( 'input.atmosLocationField' );
    this.$fileTable = $main.find( '.atmosFileListTable' );

    // write main template
    if ( $parent ) $parent.append( $main );
    else $( 'body' ).append( $main );

    // wire up buttons
    var $goButton = $main.find( '.atmosGoButton' );
    var $upButton = $main.find( '.atmosUpButton' );
    var $createButton = $main.find( '.atmosCreateButton' );
    var $openButton = $main.find( '.atmosOpenButton' );
    var $downloadButton = $main.find( '.atmosDownloadButton' );
    var $deleteButton = $main.find( '.atmosDeleteButton' );
    var $renameButton = $main.find( '.atmosRenameButton' );
    var $moveButton = $main.find( '.atmosMoveButton' );
    var $shareButton = $main.find( '.atmosShareButton' );
    var $propertiesButton = $main.find( '.atmosPropertiesButton' );
    var $aclButton = $main.find( '.atmosAclButton' );

    var browser = this, fileRow = null;
    if ( $goButton.length > 0 ) $goButton[0].onclick = function() {
        browser.listDirectory( browser.$locationField.val() );
    };
    if ( $upButton.length > 0 ) $upButton[0].onclick = function() {
        browser.listDirectory( browser.util.parentDirectory( browser.currentLocation ) );
    };
    if ( $createButton.length > 0 ) $createButton[0].onclick = function() {
        browser.createDirectory();
    };
    if ( $openButton.length > 0 ) $openButton[0].onclick = function() {
        browser.openSelectedItems();
    };
    if ( $downloadButton.length > 0 ) $downloadButton[0].onclick = function() {
        browser.downloadSelectedItems();
    };
    if ( $deleteButton.length > 0 ) $deleteButton[0].onclick = function() {
        browser.deleteSelectedItems();
    };
    if ( $renameButton.length > 0 ) $renameButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.renameEntry( fileRow.entry );
    };
    if ( $moveButton.length > 0 ) $moveButton[0].onclick = function() {
        browser.moveSelectedItems();
    };
    if ( $shareButton.length > 0 ) $shareButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.shareEntry( fileRow.entry );
    };
    if ( $propertiesButton.length > 0 ) $propertiesButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.showProperties( fileRow.entry );
    };
    if ( $aclButton.length > 0 ) $aclButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.showAcl( fileRow.entry );
    };

    // handle enter in location field
    atmosBind( this.$locationField[0], 'keypress', function( event ) {
        if ( event.which == 13 ) {
            event.stopPropagation();
            event.preventDefault();
            $goButton.click();
        }
    } );

    // clicking out of the location field resets it to the current path
    this.$locationField[0].onblur = function() {
        browser.$locationField.val( browser.currentLocation );
    };
    jQuery( window ).mousedown( function( event ) {
        if ( event.source !== browser.$locationField[0] ) browser.$locationField.val( browser.currentLocation );
    } );

    // sortable columns
    var $nameHeader = $main.find( '.atmosFileNameHeader' );
    var $sizeHeader = $main.find( '.atmosFileSizeHeader' );
    var $typeHeader = $main.find( '.atmosFileTypeHeader' );
    if ( $nameHeader.length > 0 ) $nameHeader[0].onclick = function() {
        browser.util.sort( browser.$fileTable, '.atmosFileName' );
    };
    if ( $sizeHeader.length > 0 ) $sizeHeader[0].onclick = function() {
        browser.util.sort( browser.$fileTable, '.atmosFileSize' );
    };
    if ( $typeHeader.length > 0 ) $typeHeader[0].onclick = function() {
        browser.util.sort( browser.$fileTable, '.atmosFileType' );
    };

    // selecting files triggers an upload
    var $uploadField = $main.find( 'input.atmosUploadField' );
    if ( $uploadField.length > 0 ) atmosBind( $uploadField[0], 'change', function( event ) {
        browser.uploadFiles( event.target.files );
    } );

    // drag-n-drop upload
    var $dropTarget = $main.find( '.atmosDropTarget' );
    if ( $dropTarget.length == 0 ) $dropTarget = this.$fileTable;
    var cancelEvent = function( event ) {
        event.stopPropagation();
        event.preventDefault();
    };
    atmosBind( $main[0], 'dragenter', cancelEvent );
    atmosBind( $main[0], 'dragover', cancelEvent );
    atmosBind( $main[0], 'drop', cancelEvent );
    $dropTarget[0].ondragenter = function() {
        $dropTarget.addClass( 'targetActive' );
    };
    $dropTarget[0].ondragleave = function() {
        $dropTarget.removeClass( 'targetActive' );
    };
    $dropTarget[0].ondrop = function( event ) {
        $dropTarget.removeClass( 'targetActive' );
        browser.uploadFiles( event.dataTransfer.files );
    };

    var $statusMessage = $main.find( '.atmosStatusMessage' );
    this.util = new AtmosUtil( this.settings.uid, this.settings.secret, this.templates, $statusMessage );
    this.listDirectory( this.settings.location );
};

AtmosBrowser.prototype.createDirectory = function() {
    var browser = this;
    this.util.createDirectory( this.currentLocation, function( name ) {
        var path = browser.util.endWithSlash( browser.currentLocation + name );
        var fileRow = browser.addRow( {name: name, path: path, type: ENTRY_TYPE.DIRECTORY} );
        browser.$fileTable.append( fileRow.$root );
    } );
};
AtmosBrowser.prototype.listDirectory = function( path ) {
    if ( !path || path === '' ) path = '/';
    if ( !this.util.validPath( path ) ) {
        this.error( this.templates.get( 'validPathError' ).render( {path: path} ) );
        return;
    }
    path = this.util.endWithSlash( path );
    this.$fileTable.html( this.templates.get( 'fileRowLoading' ).render() );

    var browser = this;
    this.util.listDirectory( path, true, function( entries ) {
        if ( entries ) {
            browser.currentLocation = path;
            browser.fileRows = [];
            browser.$locationField.val( path );
            browser.$fileTable.empty();
            for ( var i = 0; i < entries.length; i++ ) {
                var fileRow = browser.addRow( entries[i] );
                browser.$fileTable.append( fileRow.$root );
            }
        } else {

            // revert location
            browser.$locationField.val( browser.currentLocation );
            browser.$fileTable.empty();
            for ( var j = 0; j < browser.fileRows.length; j++ ) {
                browser.$fileTable.append( browser.fileRows[j].$root );
            }
        }
        browser.util.sort( browser.$fileTable, '.atmosFileName', false );
    } );
};
AtmosBrowser.prototype.refresh = function() {
    this.listDirectory( this.currentLocation );
};
AtmosBrowser.prototype.openFile = function( path ) {
    window.open( this.util.getShareableUrl( path, this.util.futureDate( 1, 'hours' ) ) );
};
AtmosBrowser.prototype.openSelectedItems = function() {
    var selectedRows = this.getSelectedRows();
    if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
    if ( selectedRows.length == 1 && this.util.isDirectory( selectedRows[0].entry ) ) {
        this.listDirectory( selectedRows[0].entry.path );
    } else {
        for ( var i = 0; i < selectedRows.length; i++ ) {
            if ( this.util.isDirectory( selectedRows[i].entry ) ) {
                this.util.error( this.templates.get( 'selectionContainsDirectoryError' ).render() );
                return;
            }
        }
        for ( i = 0; i < selectedRows.length; i++ ) {
            this.openFile( selectedRows[i].entry.path );
        }
    }
};
AtmosBrowser.prototype.downloadSelectedItems = function() {
    this.util.error( this.templates.get( 'functionNotSupportedError' ).render() );
};
AtmosBrowser.prototype.showProperties = function( entry ) {
    var browser = this;
    this.util.getUserMetadata( entry, function() {
        new PropertiesPage( entry, browser.util, browser.templates );
    } );
};
AtmosBrowser.prototype.showAcl = function( entry ) {
    var browser = this;
    this.util.getAcl( entry.path, function( acl ) {
        entry.acl = acl;
        new AclPage( entry, browser.util, browser.templates );
    } );
};
AtmosBrowser.prototype.shareEntry = function( entry ) {
    var requiredSelectors = ['input.atmosExpirationCount','select.atmosExpirationUnit','.atmosShareUrl','.atmosGenerateButton'];
    var $sharePage = jQuery( this.templates.get( 'sharePage' ).render( {}, requiredSelectors ) );
    var $expirationCount = $sharePage.find( 'input.atmosExpirationCount' );
    var $expirationUnit = $sharePage.find( 'select.atmosExpirationUnit' );
    var $shareUrl = $sharePage.find( '.atmosShareUrl' );
    var $generateButton = $sharePage.find( '.atmosGenerateButton' );

    var browser = this;
    $generateButton[0].onclick = function() {
        var date = browser.util.futureDate( $expirationCount.val(), $expirationUnit.val() );
        $shareUrl.text( browser.util.getShareableUrl( entry.path, date ) );
        $shareUrl.selectText();
    };

    new ModalWindow( this.templates.get( 'sharePageTitle' ).render( {name: entry.name} ), $sharePage, this.templates );
};
AtmosBrowser.prototype.moveSelectedItems = function() {
    var fileRows = this.getSelectedRows();
    var browser = this;
    new DirectoryPage( this.util, this.currentLocation, this.templates, function( path ) {
        if ( !path || path == browser.currentLocation ) return;
        for ( var i = 0; i < fileRows.length; i++ ) {
            (function( fileRow ) {
                browser.util.renameObject( fileRow.entry.path, path + fileRow.entry.name, function() {
                    browser.removeRow( fileRow.entry.path );
                } );
            })( fileRows[i] ); // create scope for loop variables in closure
        }
    } );
};
AtmosBrowser.prototype.uploadFiles = function( files ) { // FileList (HTML5 File API)
    for ( var i = 0; i < files.length; i++ ) {
        var file = files[i];
        var path = this.currentLocation + file.name;

        // upload file (in webkit and mozilla browsers, we can call xhr.send(file) directly without processing it (major time saver!)
        var browser = this;
        (function( path, file ) {

            // first check if the file exists
            browser.util.getSystemMetadata( path, function( systemMeta ) {
                var overwrite = false;
                if ( systemMeta ) {
                    if ( systemMeta.type == ENTRY_TYPE.DIRECTORY ) {

                        // can't overwrite directories
                        alert( browser.templates.get( 'directoryExistsError' ).render( {name: file.name} ) );
                        return;
                    }

                    // prompt to see if the users wishes to overwrite
                    overwrite = confirm( browser.templates.get( 'itemExistsPrompt' ).render( {name: file.name} ) );
                    if ( !overwrite ) return;
                }

                // grab the file row or create one
                var fileRow = browser.findRow( path );
                if ( !fileRow ) {
                    fileRow = browser.addRow( {name: file.name, path: path, size: file.size, type: ENTRY_TYPE.REGULAR} );
                    browser.$fileTable.append( fileRow.$root );
                }
                fileRow.showStatus();
                fileRow.setStatus( 0 );
                var completeF = function( success ) {
                    if ( success ) {

                        // refresh local metadata
                        browser.util.getSystemMetadata( path, function( systemMeta ) {
                            fileRow.updateEntry( {name: file.name, path: path, systemMeta: systemMeta, type: ENTRY_TYPE.REGULAR} );
                            fileRow.hideStatus();
                        } );
                    } else {
                        if ( !overwrite ) browser.removeRow( path );
                        else fileRow.hideStatus();
                    }
                };
                var progressF = function( status ) {
                    fileRow.setStatus( status );
                };
                if ( overwrite ) {
                    browser.util.overwriteObject( path, file, (file.type || 'application/octet-stream'), completeF, progressF );
                } else {
                    browser.util.createObject( path, file, (file.type || 'application/octet-stream'), completeF, progressF );
                }
            } );
        })( path, file ); // create scope for loop variables in closure
    }
};
AtmosBrowser.prototype.deleteSelectedItems = function() {
    var selectedRows = this.getSelectedRows();
    if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
    else {
        if ( this.settings.deletePrompt && !confirm( this.templates.get( 'deleteItemsPrompt' ).render() ) ) return;
        var browser = this;
        for ( var i = 0; i < selectedRows.length; i++ ) {
            if ( this.util.isDirectory( selectedRows[i].entry ) && !confirm( browser.templates.get( 'deleteDirectoryPrompt' ).render( {path: selectedRows[i].entry.path} ) ) ) continue;
            (function( fileRow ) {
                browser.util.deleteObject( fileRow.entry.path, function() {
                    browser.removeRow( fileRow.entry.path );
                } );
            })( selectedRows[i] ); // create scope for loop variables in closure
        }
    }
};
AtmosBrowser.prototype.renameEntry = function( entry ) {
    var name = this.util.prompt( 'renameItemPrompt', {}, this.util.validName, 'validNameError', entry.name );
    if ( name == null || name.length == 0 ) return;
    var path = this.currentLocation + name;
    var browser = this;
    this.util.renameObject( entry.path, path, function() {
        entry.path = path;
        entry.name = name;
        browser.findRow( path ).updateEntry( entry );
    } );
};
AtmosBrowser.prototype.findRow = function( path ) {
    for ( var i = 0; i < this.fileRows.length; i++ ) {
        var fileRow = this.fileRows[i];
        if ( fileRow.entry.path == path ) return fileRow;
    }
    return null;
};
AtmosBrowser.prototype.addRow = function( entry ) {
    var fileRow = new FileRow( this, entry );
    this.fileRows.push( fileRow );
    this.$fileTable.append( fileRow.$root );
    return fileRow;
};
AtmosBrowser.prototype.removeRow = function( path ) {
    for ( var i = 0; i < this.fileRows.length; i++ ) {
        if ( this.fileRows[i].entry.path == path ) {
            this.fileRows[i].remove();
            this.fileRows.splice( i, 1 );
            return;
        }
    }
};
AtmosBrowser.prototype.getSelectedRows = function() {
    var selectedRows = [];
    for ( var i = 0; i < this.fileRows.length; i++ ) {
        if ( this.fileRows[i].isSelected() ) selectedRows.push( this.fileRows[i] );
    }
    return selectedRows;
};
AtmosBrowser.prototype.singleSelectedRow = function() {
    var selectedRows = this.getSelectedRows();
    if ( selectedRows.length == 1 ) return selectedRows[0];
    else if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
    else this.util.error( this.templates.get( 'multipleFilesSelectedError' ).render() );
    return null;
};
AtmosBrowser.prototype.unselectAll = function() {
    for ( var i = 0; i < this.fileRows.length; i++ ) {
        this.fileRows[i].unselect();
    }
};

function FileRow( browser, entry ) {
    var requiredSelectors = [
        '.atmosFileIcon',
        '.atmosFileName',
        '.atmosFileSize',
        '.atmosFileType'
    ];
    this.$root = jQuery( browser.templates.get( 'fileRow' ).render( {}, requiredSelectors ) );
    this.$icon = this.$root.find( '.atmosFileIcon' );
    this.$name = this.$root.find( '.atmosFileName' );
    this.$size = this.$root.find( '.atmosFileSize' );
    this.$type = this.$root.find( '.atmosFileType' );
    this.$status = jQuery( browser.templates.get( 'statusBar' ).render() );
    this.interactive = true;
    this.browser = browser;

    this.updateEntry( entry );

    var fileRow = this;
    atmosBind( this.$root[0], 'mousedown', function( event ) {
        if ( fileRow.interactive ) {
            if ( event.which == 3 && !fileRow.isSelected() ) {
                browser.unselectAll();
                fileRow.select();
            } else if ( event.which == 1 ) {
                if ( !event.ctrlKey && !event.metaKey ) browser.unselectAll();
                fileRow.toggleSelected();
            }
        }
    } );
    // right-click behavior
    atmosBind( this.$root[0], 'contextmenu', function( event ) {
        if ( fileRow.interactive ) {
            event.stopPropagation();
            event.preventDefault();
            var contextMenu = new ContextMenu( entry, browser );
            contextMenu.moveTo( event.pageX, event.pageY );
        }
    } );
    // double-click behavior
    atmosBind( this.$root[0], 'dblclick', function( event ) {
        event.stopPropagation();
        event.preventDefault();
        if ( fileRow.interactive ) {
            if ( browser.util.isDirectory( entry ) ) browser.listDirectory( entry.path );
            else browser.openFile( entry.path );
        }
    } );
    // drag-off behavior (drag-and-drop to local filesystem - HTML5)
    atmosBind( this.$root[0], 'dragstart', function( event ) {
        fileRow.dragStart( event );
    } );
}
FileRow.prototype.updateEntry = function( entry ) {
    this.size = entry.size || '';
    if ( !this.browser.util.isDirectory( entry ) && entry.systemMeta ) this.size = entry.systemMeta.size || 'n/a';

    // classify icon for ease of styling
    this.$icon.addClass( entry.type );
    var ext = this._getExtension( entry.name );
    if ( /^[a-zA-Z0-9]+$/.test( ext ) ) this.$icon.addClass( ext );

    this.$name.text( entry.name );
    this.$size.text( this.size );
    this.$type.text( entry.type );
    this.entry = entry;
};
FileRow.prototype.dragStart = function( event ) {
    if ( this.entry.systemMeta ) {
        this.setDragData( event );
    } else {
        var fileRow = this;
        this.browser.util.getSystemMetadata( this.entry.path, function( systemMeta ) {
            fileRow.entry.systemMeta = systemMeta;
            fileRow.setDragData( event );
        } );
    }
};
FileRow.prototype.setDragData = function( event ) {
    if ( this.$root[0].dataset && event.dataTransfer && this.entry.systemMeta ) {
        var fileInfo = this.entry.systemMeta.mimeType + ':' + this.entry.name + ':' + this.browser.util.getShareableUrl( this.entry.path, this.browser.util.futureDate( 1, 'hours' ) );
        event.dataTransfer.setData( "DownloadURL", fileInfo );
    }
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
FileRow.prototype.select = function() {
    this.$root.addClass( 'selected' );
};
FileRow.prototype.unselect = function() {
    this.$root.removeClass( 'selected' );
};
FileRow.prototype.isSelected = function() {
    return this.$root.hasClass( 'selected' );
};
FileRow.prototype.toggleSelected = function() {
    this.$root.toggleClass( 'selected' );
};
FileRow.prototype.remove = function() {
    this.$root.remove();
};
FileRow.prototype._getExtension = function( fileName ) {
    var dotIndex = fileName.lastIndexOf( '.' );
    if ( dotIndex == -1 ) return null;
    return fileName.substr( dotIndex + 1 );
};

function ContextMenu( entry, browser ) {
    if ( browser.util.isDirectory( entry ) ) {
        this.$root = jQuery( browser.templates.get( 'directoryContextMenu' ).render() ).addClass( 'ATMOS_contextMenu' ); // flag for removal
    } else {
        this.$root = jQuery( browser.templates.get( 'fileContextMenu' ).render() ).addClass( 'ATMOS_contextMenu' ); // flag for removal
    }
    jQuery( 'body' ).append( this.$root );

    var menu = this;
    var $openOption = this.$root.find( '.openOption' ).addClass( 'ATMOS_contextMenuOption' ); // flag for recognition
    var $downloadOption = this.$root.find( '.downloadOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $deleteOption = this.$root.find( '.deleteOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $renameOption = this.$root.find( '.renameOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $moveOption = this.$root.find( '.moveOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $shareOption = this.$root.find( '.shareOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $propertiesOption = this.$root.find( '.propertiesOption' ).addClass( 'ATMOS_contextMenuOption' );

    if ( $openOption.length > 0 ) $openOption[0].onclick = function() {
        browser.openSelectedItems();
        menu.$root.remove();
    };
    if ( $downloadOption.length > 0 ) $downloadOption[0].onclick = function() {
        browser.downloadSelectedItems();
        menu.$root.remove();
    };
    if ( $deleteOption.length > 0 ) $deleteOption[0].onclick = function() {
        browser.deleteSelectedItems();
        menu.$root.remove();
    };
    if ( $renameOption.length > 0 ) $renameOption[0].onclick = function() {
        browser.renameEntry( entry );
        menu.$root.remove();
    };
    if ( $moveOption.length > 0 ) $moveOption[0].onclick = function() {
        browser.moveSelectedItems();
        menu.$root.remove();
    };
    if ( $shareOption.length > 0 ) $shareOption[0].onclick = function() {
        browser.shareEntry( entry );
        menu.$root.remove();
    };
    if ( $propertiesOption.length > 0 ) $propertiesOption[0].onclick = function() {
        browser.showProperties( entry );
        menu.$root.remove();
    };
}
jQuery( window ).mousedown( function( event ) {
    if ( !jQuery( event.target ).hasClass( 'ATMOS_contextMenuOption' ) ) jQuery( '.ATMOS_contextMenu' ).remove();
} );
ContextMenu.prototype.moveTo = function( x, y ) {
    this.$root.css( "left", x + "px" );
    this.$root.css( "top", y + "px" );
};

function ModalWindow( title, $content, templateEngine, width ) {
    var requiredSelectors = [
        '.atmosModalWindowContent',
        '.atmosCloseButton'
    ];
    this.$background = jQuery( templateEngine.get( 'modalBackground' ).render() );
    this.$window = jQuery( templateEngine.get( 'modalWindow' ).render( {title: title}, requiredSelectors ) );
    this.$content = this.$window.find( '.atmosModalWindowContent' );
    this.$closeButton = this.$window.find( '.atmosCloseButton' );

    jQuery( 'body' ).append( this.$background ).append( this.$window );
    this.$content.empty();
    this.$content.append( $content );

    var modal = this;
    this.$closeButton[0].onclick = function() {
        modal.remove();
    };

    if ( !width ) width = 500; // TODO: refactor as an option with default
    this.$window.width( width );
    this.$window.css( {top: '50%', left: '50%', margin: ('-' + (this.$window.height() / 2 + 50) + 'px 0 0 -' + (width / 2) + 'px')} );
}
ModalWindow.prototype.hideCloseButton = function() {
    this.$closeButton.hide();
};
ModalWindow.prototype.remove = function() {
    this.$background.remove();
    this.$window.remove();
};

function PropertiesPage( entry, util, templateEngine ) {
    this.entry = entry;
    this.util = util;
    this.templates = templateEngine;
    var requiredSelectors = [
        '.atmosAddUserMetadataButton',
        '.atmosUserMetadataTable',
        '.atmosAddListableMetadataButton',
        '.atmosListableMetadataTable',
        '.atmosSystemMetadataTable',
        '.atmosSaveButton',
        '.atmosCancelButton'
    ];
    this.$root = jQuery( templateEngine.get( 'propertiesPage' ).render( {}, requiredSelectors ) );
    var $addUserMetaButton = this.$root.find( '.atmosAddUserMetadataButton' );
    this.$userMetaTable = this.$root.find( '.atmosUserMetadataTable' ).empty();
    var $addListableMetaButton = this.$root.find( '.atmosAddListableMetadataButton' );
    this.$listableMetaTable = this.$root.find( '.atmosListableMetadataTable' ).empty();
    var $systemMetaTable = this.$root.find( '.atmosSystemMetadataTable' ).empty();
    var $saveButton = this.$root.find( '.atmosSaveButton' );
    var $cancelButton = this.$root.find( '.atmosCancelButton' );

    var prop;
    for ( prop in entry.userMeta ) {
        if ( !entry.userMeta.hasOwnProperty( prop ) ) continue;
        this.addTag( this.$userMetaTable, prop, entry.userMeta[prop], true );
    }
    for ( prop in entry.listableUserMeta ) {
        if ( !entry.listableUserMeta.hasOwnProperty( prop ) ) continue;
        this.addTag( this.$listableMetaTable, prop, entry.listableUserMeta[prop], true );
    }
    for ( prop in entry.systemMeta ) {
        if ( !entry.systemMeta.hasOwnProperty( prop ) ) continue;
        this.addTag( $systemMetaTable, prop, entry.systemMeta[prop], false );
    }

    this.modalWindow = new ModalWindow( templateEngine.get( 'propertiesPageTitle' ).render( {name: entry.name} ), this.$root, templateEngine );

    var page = this;
    $addUserMetaButton[0].onclick = function() {
        page.createTag( false );
    };
    $addListableMetaButton[0].onclick = function() {
        page.createTag( true );
    };
    $saveButton[0].onclick = function() {
        page.save();
    };
    $cancelButton[0].onclick = function() {
        page.modalWindow.remove();
    };
}
PropertiesPage.prototype.addTag = function( $table, name, value, editable ) {
    var $propertyRow;
    if ( editable ) $propertyRow = jQuery( this.templates.get( 'editablePropertyRow' ).render( {name: name, value: value}, ['.atmosPropertyName', 'input.atmosPropertyValue', '.atmosDeleteButton'] ) );
    else $propertyRow = jQuery( this.templates.get( 'readonlyPropertyRow' ).render( {name: name, value: value}, ['.atmosPropertyName', '.atmosPropertyValue'] ) );
    var $deleteButton = $propertyRow.find( '.atmosDeleteButton' );
    if ( $deleteButton.length > 0 ) $deleteButton[0].onclick = function() {
        $propertyRow.remove();
    };
    $table.append( $propertyRow );
};
PropertiesPage.prototype.createTag = function( listable ) {
    var tag = prompt( this.templates.get( 'tagPrompt' ).render(), '' );
    while ( tag != null && tag.length > 0 && !this._validTag( tag ) ) {
        tag = prompt( this.templates.get( 'tagPrompt' ).render(), tag );
    }
    if ( tag != null && tag.length > 0 ) {
        this.addTag( listable ? this.$listableMetaTable : this.$userMetaTable, tag, '', true );
    }
};
PropertiesPage.prototype.save = function() {
    var page = this;

    var meta = this._getProperties( this.$userMetaTable );
    var listableMeta = this._getProperties( this.$listableMetaTable );

    var allTags = Object.keys( meta ).concat( Object.keys( listableMeta ) );
    var existingTags = Object.keys( page.entry.userMeta || {} ).concat( Object.keys( page.entry.listableUserMeta || {} ) );

    var deletedTags = new Array();
    for ( var i = 0; i < existingTags.length; i++ ) {
        var p = existingTags[i];
        if ( allTags.indexOf( p ) == -1 ) deletedTags.push( p );
    }

    var metaSaved = false, metaDeleted = false;
    var callComplete = function() {
        if ( metaSaved && metaDeleted ) page.modalWindow.remove();
    };
    if ( allTags.length > 0 ) {
        page.util.setUserMetadata( page.entry.path, meta, listableMeta, function() {
            metaSaved = true;
            callComplete();
        } );
    } else metaSaved = true;
    if ( deletedTags.length > 0 ) {
        page.util.deleteUserMetadata( page.entry.path, deletedTags, function() {
            metaDeleted = true;
            callComplete();
        } );
    } else metaDeleted = true;
    callComplete(); // in case there's no metadata and no deletes
};
PropertiesPage.prototype._getProperties = function( $table ) {
    var properties = new Object();
    $table.children().each( function() {
        var prop = jQuery( this ).find( '.atmosPropertyName' ).text();
        var $val = jQuery( this ).find( '.atmosPropertyValue' );
        var val = $val.is( 'input' ) ? $val.val() : $val.text();
        if ( prop ) properties[prop] = val;
    } );
    return properties;
};
PropertiesPage.prototype._validTag = function( tag ) {
    if ( !tag || tag.trim().length == 0 ) {
        alert( this.templates.get( 'tagEmpty' ).render() );
        return false;
    }
    var properties = new Object();
    jQuery.extend( properties, this._getProperties( this.$userMetaTable ), this._getProperties( this.$listableMetaTable ) );
    if ( properties.hasOwnProperty( tag ) ) {
        alert( this.templates.get( 'tagExists' ).render( {tag: tag} ) );
        return false;
    }
    if ( !this.util.validName( tag ) ) {
        alert( this.templates.get( 'validNameError' ).render( {name: tag} ) );
        return false;
    }
    return true;
};

function AclPage( entry, util, templateEngine ) {
    this.util = util;
    this.templates = templateEngine;
    this.$root = jQuery( templateEngine.get( 'aclPage' ).render( {}, ['.atmosUserAclTable', '.atmosGroupAclTable'] ) );
    this.$userAclTable = this.$root.find( '.atmosUserAclTable' ).empty();
    this.$groupAclTable = this.$root.find( '.atmosGroupAclTable' ).empty();

    var userEntries = entry.acl.userEntries,
        groupEntries = entry.acl.groupEntries,
        i;
    for ( i = 0; i < userEntries.length; i++ ) {
        this.addUserAcl( userEntries[i].key, userEntries[i].value );
    }
    for ( i = 0; i < groupEntries.length; i++ ) {
        this.addGroupAcl( groupEntries[i].key, groupEntries[i].value );
    }
    new ModalWindow( templateEngine.get( 'aclPageTitle' ).render( {name: entry.name} ), this.$root, templateEngine );
}
AclPage.prototype.addUserAcl = function( name, access ) {
    var $row = jQuery( this.templates.get( 'aclUserRow' ).render( {name: name} ) );
    $row.find( 'input[value="' + access + '"]' ).attr( 'checked', true );
    this.$userAclTable.append( $row );
};
AclPage.prototype.addGroupAcl = function( name, access ) {
    var $row = jQuery( this.templates.get( 'aclGroupRow' ).render( {name: name} ) );
    $row.find( 'input[value="' + access + '"]' ).attr( 'checked', true );
    this.$groupAclTable.append( $row );
};

function DirectoryPage( util, startPath, templateEngine, callback ) {
    this.util = util;
    this.templates = templateEngine;
    this.$root = jQuery( this.templates.get( 'directoryPage' ).render( {}, ['.atmosDirectoryDisplay', '.atmosDirectoryList'] ) );
    this.$display = this.$root.find( '.atmosDirectoryDisplay' );
    this.$list = this.$root.find( '.atmosDirectoryList' ).empty();

    var $upButton = this.$root.find( '.atmosUpButton' );
    var $createButton = this.$root.find( '.atmosCreateButton' );
    var $selectButton = this.$root.find( '.atmosSelectButton' );
    var $cancelButton = this.$root.find( '.atmosCancelButton' );

    var modalWindow = new ModalWindow( templateEngine.get( 'directoryPageTitle' ).render(), this.$root, templateEngine, 400 );

    var page = this;
    if ( $upButton.length > 0 ) $upButton[0].onclick = function() {
        page.goTo( util.parentDirectory( page.currentPath ) );
    };
    if ( $createButton.length > 0 ) $createButton[0].onclick = function() {
        util.createDirectory( page.currentPath, function( name ) {
            page.addDirectory( name );
        } );
    };
    if ( $selectButton.length > 0 ) $selectButton[0].onclick = function() {
        modalWindow.remove();
        callback( page.currentPath );
    };
    if ( $cancelButton.length > 0 ) $cancelButton[0].onclick = function() {
        modalWindow.remove();
        callback( null );
    };


    this.goTo( startPath );
}

DirectoryPage.prototype.goTo = function( path ) {
    path = this.util.endWithSlash( path );
    var page = this;
    this.util.listDirectory( path, false, function( contents ) {
        page.$list.empty();
        for ( var i = 0; i < contents.length; i++ ) {
            var item = contents[i];
            if ( page.util.isDirectory( item ) ) {
                page.addDirectory( item.name );
            }
        }
        page.currentPath = path;
        page.$display.text( path );
    } );
};
// adds a directory to the list in the UI. uses insert-sort
DirectoryPage.prototype.addDirectory = function( name ) {
    var $item = jQuery( this.templates.get( 'directoryItem' ).render( {name: name} ) );
    var page = this;
    $item[0].onmousedown = function() {
        $item.parent().find( '.selected' ).removeClass( 'selected' );
        $item.addClass( 'selected' );
    };
    $item[0].ondblclick = function() {
        page.goTo( page.currentPath + name );
    };
    var $nextItem = null;
    this.$list.children().each( function() {
        if ( $nextItem ) return;
        var $this = $( this );
        var nextName = $this.find( '.atmosDirectoryItem' ).text() || $this.text();
        if ( nextName > name ) $nextItem = this;
    } );
    if ( $nextItem ) $item.insertBefore( $nextItem );
    else this.$list.append( $item );
};

function LoginPage( options, templateEngine, callback ) {
    var requiredSelectors = [
        'input.atmosSubtenantField',
        'input.atmosUserField',
        'input.atmosSecretField',
        '.atmosLoginButton'
    ];
    this.$root = jQuery( templateEngine.get( 'loginPage' ).render( {}, requiredSelectors ) );
    var $subtenant = this.$root.find( '.atmosSubtenantField' ).val( options.subtenant );
    var $user = this.$root.find( '.atmosUserField' ).val( options.user );
    var $secret = this.$root.find( '.atmosSecretField' ).val( options.secret );
    var $loginButton = this.$root.find( '.atmosLoginButton' );
    var modalWindow = new ModalWindow( templateEngine.get( 'loginPageTitle' ).render(), this.$root, templateEngine, 400 );
    modalWindow.hideCloseButton();

    $loginButton.click( function() {
        var uid = $subtenant.val() + '/' + $user.val();
        callback( uid, $secret.val() );
        modalWindow.remove();
    } );
}

function AtmosUtil( uid, secret, templateEngine, $statusMessage ) {
    this.atmos = new AtmosRest( {uid: uid, secret: secret} );
    this.templates = templateEngine;
    this.$statusMessage = $statusMessage;
}

AtmosUtil.prototype.debug = function( message ) {
    if ( typeof(console) !== 'undefined' ) {
        if ( typeof(console.debug) !== 'undefined' ) {
            console.debug( message );
        } else if ( typeof(console.log) !== 'undefined' ) {
            console.log( message );
        }
    }
};
AtmosUtil.prototype.prompt = function( templateName, model, validatorFunction, validationFailedTemplateName, initialValue ) {
    var promptString = this.templates.get( templateName ).render( model );
    var failureTemplate = this.templates.get( validationFailedTemplateName );
    var value = prompt( promptString, initialValue || '' );
    while ( value != null && value.length > 0 && !validatorFunction( value ) ) {
        alert( failureTemplate.render( {value: value} ) );
        value = prompt( promptString, value );
    }
    if ( value == null || value.length == 0 ) return null;
    return value;
};
AtmosUtil.prototype.createDirectory = function( parentDirectory, callback ) {
    var name = this.prompt( 'newDirectoryNamePrompt', {}, this.validName, 'validNameError' );
    if ( name == null || name.length == 0 ) return;
    var path = this.endWithSlash( parentDirectory + name );
    var util = this;
    this.showStatus( 'Checking for existing object...' );
    this.atmos.getSystemMetadata( path, null, null, function( result ) {
        util.hideStatus( 'Checking for existing object...' );
        if ( result.success ) {
            alert( util.templates.get( 'itemExistsError' ).render( {name: path} ) );
            return;
        }
        util.showStatus( 'Creating directory...' );
        util.atmos.createObjectOnPath( path, null, null, null, null, null, null, function( result ) {
            util.hideStatus( 'Creating directory...' );
            if ( result.success ) {
                callback( name );
            } else {
                util.atmosError( result );
                callback( null );
            }
        } );
    } );
};
AtmosUtil.prototype.showStatus = function( message ) {
    if ( this.$statusMessage ) {
        this.$statusMessage.text( message );
        this.$statusMessage.fadeIn( 100 );
        if ( !this.statusMessageQueue ) this.statusMessageQueue = {};
        var count = this.statusMessageQueue[message] || 0;
        this.statusMessageQueue[message] = count + 1;
    }
};
AtmosUtil.prototype.hideStatus = function( message ) {
    if ( this.$statusMessage ) {
        this.statusMessageQueue[message] = this.statusMessageQueue[message] - 1;
        var messages = Object.keys( this.statusMessageQueue );
        for ( var i = 0; i < messages.length; i++ ) {
            if ( this.statusMessageQueue[messages[i]] > 0 ) {
                this.$statusMessage.text( messages[i] );
                return;
            }
        }
        this.$statusMessage.fadeOut( 100 );
    }
};
AtmosUtil.prototype.error = function( message ) {
    alert( message );
};
AtmosUtil.prototype.atmosError = function( result ) {
    this.error( dumpObject( result ) );
};
AtmosUtil.prototype.futureDate = function( howMany, ofWhat ) {
    try {
        howMany = parseInt( howMany );
    } catch( error ) {
        this.error( this.templates.get( 'invalidNumberError' ).render( {value: howMany} ) );
        return;
    }
    var date = new Date();
    var currentNumber = {hours: date.getHours(), days: date.getDate(), months: date.getMonth(), years: date.getFullYear()}[ofWhat.toLowerCase()];
    var func = {hours: date.setHours, days: date.setDate, months: date.setMonth, years: date.setFullYear}[ofWhat.toLowerCase()];
    func.call( date, currentNumber + howMany );
    return date;
};
AtmosUtil.prototype.validPath = function( path ) {
    return !(!path || path.trim().length == 0 || /[?@]/.test( path ) || !/^\//.test( path ));
};
AtmosUtil.prototype.validName = function( name ) {
    return !(!name || name.trim().length == 0 || /[?@/]/.test( name ));

};
AtmosUtil.prototype.endWithSlash = function( path ) {
    path = path.trim();
    if ( path[path.length - 1] !== '/' ) path += '/';
    return path;
};
AtmosUtil.prototype.isDirectory = function( entry ) {
    return entry.type == ENTRY_TYPE.DIRECTORY;
};
AtmosUtil.prototype.parentDirectory = function( path ) {
    if ( !this.validPath( path ) ) {
        throw path + " is not a valid path";
    }

    path = path.substr( 0, path.length - 1 ); // remove last character in case it's a slash

    var lastSlashIndex = path.lastIndexOf( '/' );
    if ( lastSlashIndex === 0 ) return '/';
    else return path.substr( 0, lastSlashIndex );
};
AtmosUtil.prototype.listDirectory = function( path, includeMetadata, callback ) {
    var util = this;
    var options = new ListOptions( 0, null, true, null, null );
    this.showStatus( 'Listing directory...' );
    this.atmos.listDirectory( path, options, null, function( result ) {
        util.hideStatus( 'Listing directory...' );
        if ( result.success ) {
            var entries = [];
            for ( var i = 0; i < result.results.length; i++ ) {
                if ( path === '/' && result.results[i].name === 'apache' ) continue;
                entries.push( result.results[i] );
            }
            callback( entries );
        } else {
            util.atmosError( result );
            callback( null );
        }
    } );
};
AtmosUtil.prototype.getAcl = function( path, callback ) {
    var util = this;
    this.showStatus( 'Retrieving ACL...' );
    this.atmos.getAcl( path, null, function( result ) {
        util.hideStatus( 'Retrieving ACL...' );
        if ( result.success ) {
            callback( result.acl );
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.getSystemMetadata = function( path, callback ) {
    var util = this;
    this.showStatus( 'Retrieving system metadata...' );
    this.atmos.getSystemMetadata( path, null, null, function( result ) {
        util.hideStatus( 'Retrieving system metadata...' );
        if ( result.success ) {
            callback( result.systemMeta );
        } else if ( result.httpCode == 404 ) { // execute callback passing null if object doesn't exist
            callback( null );
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.getUserMetadata = function( entry, callback ) {
    var util = this;
    this.showStatus( 'Retrieving metadata...' );
    this.atmos.getUserMetadata( entry.path, null, null, function( result ) {
        util.hideStatus( 'Retrieving metadata...' );
        if ( result.success ) {
            entry.userMeta = result.meta;
            entry.listableUserMeta = result.listableMeta;
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.setUserMetadata = function( path, userMeta, listableMeta, callback ) {
    var util = this;
    this.showStatus( 'Saving metadata...' );
    this.atmos.setUserMetadata( path, userMeta, listableMeta, null, function( result ) {
        util.hideStatus( 'Saving metadata...' );
        if ( result.success ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.deleteUserMetadata = function( path, tags, callback ) {
    var util = this;
    this.showStatus( 'Saving metadata...' );
    this.atmos.deleteUserMetadata( path, tags, null, function( result ) {
        util.hideStatus( 'Saving metadata...' );
        if ( result.success ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.createObject = function( path, data, mimeType, completeCallback, progressCallback ) {
    var util = this;
    this.showStatus( 'Creating object...' );
    this.atmos.createObjectOnPath( path, null, null, null, data, mimeType, null, function( result ) {
        util.hideStatus( 'Creating object...' );
        if ( result.success ) {
            completeCallback( true );
        } else {
            util.atmosError( result );
            completeCallback( false );
        }
    }, progressCallback );
};
AtmosUtil.prototype.overwriteObject = function( path, data, mimeType, completeCallback, progressCallback ) {
    var util = this;
    this.showStatus( 'Overwriting object...' );
    this.atmos.updateObject( path, null, null, null, data, null, mimeType, null, function( result ) {
        util.hideStatus( 'Overwriting object...' );
        if ( result.success ) {
            completeCallback( true );
        } else {
            util.atmosError( result );
            completeCallback( false );
        }
    }, progressCallback );
};
AtmosUtil.prototype.renameObject = function( existingPath, newPath, callback ) {
    var util = this;
    this.showStatus( 'Checking for existing object...' );
    this.atmos.getSystemMetadata( newPath, null, null, function( result ) {
        util.hideStatus( 'Checking for existing object...' );
        var overwrite = false;
        if ( result.success ) {
            if ( result.systemMeta.type == ENTRY_TYPE.DIRECTORY ) {
                alert( util.templates.get( 'directoryExistsError' ).render( {name: newPath} ) );
                return;
            }
            overwrite = confirm( util.templates.get( 'itemExistsPrompt' ).render( {name: newPath} ) );
            if ( !overwrite ) return;
        }
        util.showStatus( 'Renaming object...' );
        util.atmos.rename( existingPath, newPath, overwrite, null, function( result2 ) {
            util.hideStatus( 'Renaming object...' );
            if ( result2.success ) {
                callback();
            } else {
                util.atmosError( result2 );
            }
        } );
    } );
};
AtmosUtil.prototype.deleteObject = function( path, callback ) {
    var util = this;
    this.showStatus( 'Deleting object...' );
    this.atmos.deleteObject( path, null, function( result ) {
        util.hideStatus( 'Deleting object...' );
        if ( result.success ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.getShareableUrl = function( path, date ) {
    return this.atmos.getShareableUrl( path, date );
};
AtmosUtil.prototype.sort = function( $table, subSelector, inverse ) {

    // save sort state
    if ( !this.sortMap ) this.sortMap = {};
    if ( typeof(inverse) == 'undefined' ) {
        inverse = !this.sortMap[subSelector];
    }
    this.sortMap[subSelector] = inverse;
    $table.children().sortElements( function( a, b ) {
        var valA = jQuery( a ).find( subSelector ).text().toLowerCase();
        var valB = jQuery( b ).find( subSelector ).text().toLowerCase();
        if ( valA.length == 0 && valB.length > 0 ) return inverse ? 1 : -1;
        else if ( valA.length > 0 && valB.length == 0 ) return inverse ? -1 : 1;
        if ( !isNaN( valA ) && !isNaN( valB ) ) {
            valA = parseFloat( valA );
            valB = parseFloat( valB );
        }
        return valA > valB ?
            inverse ? -1 : 1
            : inverse ? 1 : -1;
    } );
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

// Plug-in to return outer HTML of an element (necessary for FireFox)
jQuery.fn.outerHTML = function( replacement ) {
    if ( replacement ) return this.replaceWith( replacement );
    else if ( this.length == 0 ) return null;
    else {
        if ( this[0].outerHTML ) return this[0].outerHTML;
        else {
            var attributes = '';
            for ( var i = 0; i < this[0].attributes.length; i++ ) {
                attributes += ' ' + this[0].attributes[i].name + '="' + this[0].attributes[i].value + '"';
            }
            return '<' + this[0].tagName + attributes + '>' + this[0].innerHTML + '</' + this[0].tagName + '>';
        }
    }
};

/**
 * jQuery.fn.sortElements
 * --------------
 * @author James Padolsey (http://james.padolsey.com)
 * @version 0.11
 * @updated 18-MAR-2010
 * --------------
 * @param Function comparator:
 *   Exactly the same behaviour as [1,2,3].sort(comparator)
 *
 * @param Function getSortable
 *   A function that should return the element that is
 *   to be sorted. The comparator will run on the
 *   current collection, but you may want the actual
 *   resulting sort to occur on a parent or another
 *   associated element.
 *
 *   E.g. $('td').sortElements(comparator, function(){
 *      return this.parentNode;
 *   })
 *
 *   The <td>'s parent (<tr>) will be sorted instead
 *   of the <td> itself.
 */
jQuery.fn.sortElements = (function() {
    var sort = [].sort;
    return function( comparator, getSortable ) {
        getSortable = getSortable || function() {
            return this;
        };

        var placements = this.map( function() {

            var sortElement = getSortable.call( this ),
                parentNode = sortElement.parentNode,

                // Since the element itself will change position, we have
                // to have some way of storing it's original position in
                // the DOM. The easiest way is to have a 'flag' node:
                nextSibling = parentNode.insertBefore(
                    document.createTextNode( '' ),
                    sortElement.nextSibling
                );

            return function() {
                if ( parentNode === this ) {
                    throw new Error(
                        "You can't sort elements if any one is a descendant of another."
                    );
                }

                // Insert before flag:
                parentNode.insertBefore( this, nextSibling );
                // Remove flag:
                parentNode.removeChild( nextSibling );
            };
        } );

        return sort.call( this, comparator ).each( function( i ) {
            placements[i].call( getSortable.call( this ) );
        } );
    };
})();

