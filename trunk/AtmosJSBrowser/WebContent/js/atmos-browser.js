var ENTRY_TYPE = {
    DIRECTORY: 'directory',
    REGULAR: 'regular'
};

(function( $ ) {

    function AtmosBrowser( element, options ) {
        // default settings
        this.settings = {
            uid : null,
            secret : null,
            location : '/',
            deletePrompt : false
        };
        if ( options ) {
            $.extend( this.settings, options );
        }
        this.atmos = new AtmosRest( this.settings );
        this.$root = $( element ).addClass( 'atmosBrowser' );
        this.locationBar = new LocationBar( this );
        this.fileList = new FileList( this );
        this.modalWindow = new ModalWindow();

        this.$root.append( this.locationBar.$root ).append( this.fileList.$root ).append( this.modalWindow.$root );

        var browser = this;
        this.$root.mousedown( function( event ) {
            if ( event.source !== browser.locationBar.$field[0] ) browser.locationBar.resetLocation();
        } );

        // set up scrolling in the body of the file list
        // TODO: refactor this
        this.fileList.$body.height( this.$root.height() - this.locationBar.$root.outerHeight() - this.fileList.$header.outerHeight() );

        this.openDirectory( this.settings.location );
    }

    AtmosBrowser.prototype.createDirectory = function() {
        var name = prompt( 'What would you like to name the new directory?', '' );
        while ( name != null && !this._validName( name ) ) {
            alert( 'That is not a valid name.\nNote: the characters \'?\' and \'@\' cannot be used in a name.' );
            name = prompt( 'What would you like to name the new directory?', name );
        }
        if ( name == null ) return;
        var currentLocation = this.locationBar.currentLocation;
        var path = this._makeDirectory( currentLocation + name );
        var browser = this;
        this.atmos.createObjectOnPath( path, null, null, null, null, null, null, function( result ) {
            if ( result.success ) {
                browser.fileList.addRow( new FileRow( browser.fileList, {name: name, path: path, type: ENTRY_TYPE.DIRECTORY} ) );
            } else {
                browser.error( result.dump() );
            }
        } )
    };
    AtmosBrowser.prototype.openDirectory = function( path ) {
        if ( !path || path === '' ) path = '/';
        if ( !this._validPath( path ) ) {
            this.error( path + " is not a valid path" );
            return;
        }
        path = this._makeDirectory( path );
        this.fileList.showWaitMessage();

        var browser = this;
        var fileList = this.fileList;
        var options = new ListOptions( 0, null, true, null, null );
        this.atmos.listDirectory( path, options, null, function( result ) {
            if ( result.success ) {
                browser.locationBar.setCurrentLocation( path );
                fileList.clear();

                if ( path !== '/' ) {
                    fileList.addRow( new FileRow( fileList, {name: '..', path: browser._parentDirectory( path ), type: ENTRY_TYPE.DIRECTORY} ) );
                }

                for ( var i = 0; i < result.results.length; i++ ) {
                    var entry = result.results[i];
                    if ( path === '/' && entry.name === 'apache' ) continue;
                    fileList.addRow( new FileRow( fileList, entry ) );
                }
                fileList.sort( 0, false );
            } else {
                browser.error( result.dump() );
            }
        } );
    };
    AtmosBrowser.prototype.openFile = function( path ) {
        window.open( this.atmos.getShareableUrl( path, this._createExpirationDate() ) );
    };
    AtmosBrowser.prototype.viewSelectedItemProperties = function() {
        var fileRow = this.fileList.getSelectedRow();
        if ( !fileRow ) {
            alert( "Nothing selected" );
            return;
        }
        var browser = this;
        this.atmos.getUserMetadata( fileRow.entry.path, null, null, function( result ) {
            if ( result.success ) {
                fileRow.entry.userMeta = result.meta;
                fileRow.entry.listableUserMeta = result.listableMeta;
                new PropertiesPage( browser, fileRow.entry, browser.atmos, browser.modalWindow );
            } else {
                browser.error( result.dump() );
            }
        } );
    };
    AtmosBrowser.prototype.dropFiles = function( event ) {
        // FileList (HTML5 File API)
        var fileList = event.dataTransfer.files;
        for ( var i = 0; i < fileList.length; i++ ) {
            var file = fileList[i];
            var path = this.locationBar.currentLocation + file.name;
            var fileRow = new FileRow( this.fileList, {name: file.name, path: path, size: file.size, type: ENTRY_TYPE.REGULAR} );
            this.fileList.addRow( fileRow );

            fileRow.showStatus();

            // upload file
            var browser = this;
            var reader = new FileReader();
            (function( file, path, fileRow ) {
                reader.onload = function( event ) {
                    var content = event.target.result;
                    browser.atmos.createObjectOnPath( path, null, null, null, content, file.type || 'application/octet-stream', null,
                        function( result ) {
                            if ( result.success ) {
                                fileRow.hideStatus();
                            } else {
                                browser.error( result.dump() );
                                fileRow.remove();
                            }
                        },
                        function( status ) {
                            fileRow.setStatus( status );
                        } );
                };
            })( file, path, fileRow ); // localize scope for asynchronous call
            reader.readAsBinaryString( file );
        }
    };
    AtmosBrowser.prototype.deleteSelectedItem = function() {
        var selectedRow = this.fileList.getSelectedRow();
        if ( !selectedRow ) {
            alert( "Nothing selected" );
            return;
        }
        var entry = selectedRow.entry;
        if ( this.settings.deletePrompt && !confirm( 'Are you sure you want to delete this path?\n' + entry.path ) ) return;
        this.atmos.deleteObject( entry.path, null, function( result ) {
            if ( result.success ) {
                selectedRow.remove();
            } else {
                this.error( result.dump() );
            }
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
    AtmosBrowser.prototype._parentDirectory = function( path ) {
        if ( !this._validPath( path ) ) {
            throw path + " is not a valid path";
        }

        path = path.substr( 0, path.length - 1 ); // remove last character in case it's a slash

        var lastSlashIndex = path.lastIndexOf( '/' );
        if ( lastSlashIndex === 0 ) return '/';
        else return path.substr( 0, lastSlashIndex );
    };

    function LocationBar( atmosBrowser ) {
        this.browser = atmosBrowser;
        this.$root = $( '<div class="atmosLocation" />' );
        this.$field = $( '<input type="text" class="atmosLocationField" />' );
        this.$goButton = $( '<div class="atmosButton" />' ).text( 'Go' );
        this.$deleteButton = $( '<div class="atmosButton" />' ).text( 'X' ).attr( 'title', 'Delete selected item' );
        this.$createDirectoryButton = $( '<div class="atmosButton" />' ).text( '+' ).attr( 'title', 'Create directory' );
        this.$propertiesButton = $( '<div class="atmosButton" />' ).text( '...' ).attr( 'title', 'Properties of selected item' );

        this.$root.append( this.$field ).append( this.$deleteButton ).append( this.$createDirectoryButton ).append( this.$propertiesButton );

        var locationBar = this;
        this.$field.keypress(
            function( event ) {
                if ( event.which == 13 ) {
                    event.stopPropagation();
                    event.preventDefault();
                    locationBar.browser.openDirectory( locationBar.$field.val() );
                }
            } ).blur( function() {
                locationBar.resetLocation();
            } );
        this.$goButton.click( function() {
            locationBar.browser.openDirectory( locationBar.$field.val() );
        } );
        this.$deleteButton.click( function() {
            locationBar.browser.deleteSelectedItem();
        } );
        this.$createDirectoryButton.click( function() {
            locationBar.browser.createDirectory();
        } );
        this.$propertiesButton.click( function() {
            locationBar.browser.viewSelectedItemProperties();
        } );
    }

    LocationBar.prototype.setCurrentLocation = function( currentLocation ) {
        this.currentLocation = currentLocation;
        this.$field.val( currentLocation );
    };
    LocationBar.prototype.resetLocation = function() {
        this.$field.val( this.currentLocation );
    };

    function FileList( atmosBrowser ) {
        this.browser = atmosBrowser;
        this.$root = $( '<div class="atmosFileList" />' );
        this.$header = $( '<div class="head"><div class="table"><div class="row"><h4 class="cell atmosFileName">Name</h4><h4 class="cell atmosFileSize">Size</h4><h4 class="cell atmosFileType">Type</h4></div></div></div>' );
        this.$body = $( '<div class="body" />' );
        this.$table = $( '<div class="table" />' );

        this.$body.append( this.$table );
        this.$root.append( this.$header ).append( this.$body );

        var fileList = this;

        // prevent default behaviors
        this.$root.mousedown( function( event ) {
            event.stopPropagation();
            event.preventDefault();
        } );

        this.$body[0].addEventListener( 'dragover', function( event ) {
            event.stopPropagation();
            event.preventDefault();
        } );

        this.$body[0].addEventListener( 'drop', function( event ) {
            event.stopPropagation();
            event.preventDefault();
            fileList.browser.dropFiles( event );
        } );

        // sortable columns
        this.$header.find( '.cell' ).each( function() {
            var header = $( this ),
                index = header.index(),
                inverse = false;

            header.click( function() {
                fileList.sort( index, inverse );
                inverse = !inverse;
            } );
        } );
    }

    FileList.prototype.sort = function( columnIndex, inverse ) {
        this.$table.find( '.row' ).filter(
            function() {
                return $( this ).find( '.atmosFileName' ).text() != '..';
            } ).sortElements( function( a, b ) {
                return $( a ).find( '.cell:eq(' + columnIndex + ')' ).text() > $( b ).find( '.cell:eq(' + columnIndex + ')' ).text() ?
                    inverse ? -1 : 1
                    : inverse ? 1 : -1;
            } );
    };
    FileList.prototype.clear = function() {
        this.$table.html( '' );
    };
    FileList.prototype.showWaitMessage = function() {
        this.$table.html( '<p>please wait..</p>' );
    };
    FileList.prototype.addRow = function( fileRow ) {
        this.$table.append( fileRow.$root );
    };
    FileList.prototype.selectRow = function( fileRow ) {
        this.selectedRow = fileRow;
        $( '.selected', this.$table ).toggleClass( 'selected' ); // turn off all selected rows
        if ( fileRow ) fileRow.$root.toggleClass( 'selected' ); // select this row
    };
    FileList.prototype.getSelectedRow = function() {
        return this.selectedRow || null;
    };

    function FileRow( fileList, entry ) {
        this.fileList = fileList;
        this.$root = $( '<div class="row" />' );
        this.$name = $( '<div class="cell atmosFileName" />' );
        this.$size = $( '<div class="cell atmosFileSize" />' );
        this.$type = $( '<div class="cell atmosFileType" />' );
        this.$status = $( '<div class="atmosStatusBar" />' );
        this.interactive = true;

        this.$root.append( this.$name ).append( this.$size ).append( this.$type );

        this.updateEntry( entry );

        var fileRow = this;
        this.$root.mousedown( function() {
            if ( fileRow.interactive ) {
                fileList.selectRow( fileRow );
            }
        } );
        this.$root.dblclick( function( event ) {
            event.stopPropagation();
            event.preventDefault();
            if ( fileRow.interactive ) {
                if ( entry.type === ENTRY_TYPE.DIRECTORY ) {
                    fileList.browser.openDirectory( entry.path );
                } else {
                    fileList.browser.openFile( entry.path );
                }
            }
        } );
    }

    FileRow.prototype.updateEntry = function( entry ) {
        var size = entry.size || '';
        if ( entry.type !== ENTRY_TYPE.DIRECTORY && entry.systemMeta ) size = entry.systemMeta.size || 'n/a';

        this.$name.text( entry.name );
        this.$size.text( size );
        this.$type.text( entry.type );
        this.entry = entry;
    };
    FileRow.prototype.showStatus = function() {
        this.interactive = false;
        this.sizeWidth = this.$size.width();
        this.$size.html( this.$status );
        this.$status.width( 0 );
    };
    FileRow.prototype.setStatus = function( fraction ) {
        this.$status.width( this.sizeWidth * fraction / 100 );
        this.$status.text( fraction + "%" );
    };
    FileRow.prototype.hideStatus = function() {
        this.updateEntry( this.entry );
        this.interactive = true;
    };
    FileRow.prototype.remove = function() {
        this.$root.remove();
        this.fileList.selectRow( null );
    };

    function ModalWindow() {
        this.$root = $( '<div />' );
        this.$background = $( '<div class="atmosModalBackground" />' );
        this.$window = $( '<div class="atmosModalWindow" />' );
        this.$titleBar = $( '<div class="atmosModalWindowTitleBar" />' );
        this.$title = $( '<div class="atmosModalWindowTitle" />' );
        this.$closeButton = $( '<div class="closeButton" />' ).text( 'x' );
        this.$content = $( '<div class="atmosModalWindowContent" />' );
        this.$titleBar.append( this.$title ).append( this.$closeButton );
        this.$window.append( this.$titleBar ).append( this.$content );
        this.$root.append( this.$background ).append( this.$window );

        var modal = this;
        this.$closeButton.click( function() {
            modal.hide();
        } );

        this.hide();
    }

    ModalWindow.prototype.show = function() {
        this.$background.show();
        this.$window.show();
    };
    ModalWindow.prototype.hide = function() {
        this.$background.hide();
        this.$window.hide();
        this.$content.html( '' );
    };
    ModalWindow.prototype.showCloseButton = function() {
        this.$closeButton.show();
    };
    ModalWindow.prototype.hideCloseButton = function() {
        this.$closeButton.hide();
    };
    ModalWindow.prototype.showContent = function( title, content ) {
        this.$title.html( title );
        this.$content.html( content );
        this.show();
    };

    function PropertiesPage( browser, entry, atmos, modalWindow ) {
        this.browser = browser;
        this.entry = entry;
        this.atmos = atmos;
        this.modalWindow = modalWindow;
        this.$root = $( '<div class="atmosProperties" />' );
        this.$saveButton = $( '<div class="atmosButton" />' ).text( 'Save' );
        this.$cancelButton = $( '<div class="atmosButton" />' ).text( 'Cancel' );

        this.$root.append( this.$saveButton ).append( this.$cancelButton );

        var page = this;
        this.$saveButton.click( function() {
            page.save();
        } );

        this.$cancelButton.click( function() {
            page.modalWindow.hide();
        } );

        this.userMetaTable = new PropertiesTable( this, 'User Metadata', entry.userMeta, true );
        this.listableMetaTable = new PropertiesTable( this, 'Listable Metadata', entry.listableUserMeta, true );
        this.systemMetaTable = new PropertiesTable( this, 'System Metadata', entry.systemMeta, false );
        this.$root.append( this.userMetaTable.$root ).append( this.listableMetaTable.$root ).append( this.systemMetaTable.$root );

        this.modalWindow.showContent( entry.name + ' properties', this.$root );
        this.modalWindow.hideCloseButton();
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
                    page.browser.error( result.dump() );
                }
            } );
        } else metaSaved = true;
        if ( deletedTags.length > 0 ) {
            page.atmos.deleteUserMetadata( page.entry.path, deletedTags, null, function( result ) {
                if ( result.success ) {
                    metaDeleted = true;
                    callComplete();
                } else {
                    page.browser.error( result.dump() );
                }
            } );
        } else metaDeleted = true;
        callComplete(); // in case there's no metadata and no deletes
    };
    PropertiesPage.prototype._validTag = function( tag ) {
        if ( !tag || tag.trim().length == 0 ) {
            alert( 'You must specify a tag' );
            return false;
        }
        var properties = new Object();
        $.extend( properties, this.userMetaTable.getProperties(), this.listableMetaTable.getProperties() );
        if ( properties.hasOwnProperty( tag ) ) {
            alert( 'There is already a property named ' + tag );
            return false;
        }
        if ( !this.browser._validName( tag ) ) {
            alert( tag + ' is not a valid name\nNote: the characters \'?\' and \'@\' cannot be used in a name.' );
            return false;
        }
        return true;
    };

    function PropertiesTable( page, title, properties, editable ) {
        this.page = page;
        this.editable = editable;
        this.$root = $( '<div class="atmosPropertiesTableWrapper" />' );
        this.$tableTitle = $( '<div class="atmosPropertiesTableTitle" />' ).text( title );
        this.$addButton = $( '<div class="atmosButton" />' ).text( "+" );
        this.$table = $( '<div class="atmosPropertiesTable" />' );
        this.$root.append( this.$tableTitle ).append( this.$addButton ).append( this.$table );
        for ( var prop in properties ) {
            if ( !properties.hasOwnProperty( prop ) ) continue;
            this.$table.append( new Property( prop, properties[prop], editable ).$root );
        }

        var table = this;
        this.$addButton.click( function() {
            table.createProperty();
        } );
    }

    PropertiesTable.prototype.createProperty = function() {
        var tag = prompt( 'What would you like to name this tag?', '' );
        while ( tag != null && !this.page._validTag( tag ) ) {
            tag = prompt( 'What would you like to name this tag?', tag );
        }
        if ( tag != null ) {
            this.$table.append( new Property( tag, '', true ).$root );
        }
    };
    PropertiesTable.prototype.getProperties = function() {
        var properties = new Object();
        this.$table.children().each( function() {
            var prop = null, val = null;
            $( this ).children().each( function() {
                if ( $( this ).index() == 0 ) prop = $( this ).text();
                else if ( $( this ).index() == 1 ) val = $( this ).val();
            } );
            if ( prop ) properties[prop] = val;
        } );
        return properties;
    };

    function Property( name, value, editable ) {
        if ( editable ) {
            this.$root = $( '<div class="row"><h4 class="cell atmosPropertyName">' + name + '</h4><input type="text" class="cell atmosPropertyValue" value="' + value + '" /></div>' );
        } else {
            this.$root = $( '<div class="row"><h4 class="cell atmosPropertyName">' + name + '</h4><div class="cell atmosPropertyValue">' + value + '</div></div>' );
        }
        this.$deleteButton = $( '<div class="atmosButton" />' ).text( 'X' );
        if ( editable ) this.$root.append( $( '<div class="cell" />' ).append( this.$deleteButton ) );

        var property = this;
        this.$deleteButton.click( function() {
            property.$root.remove();
        } );
    }

    function LoginPage( subtenant, user, secret, callback ) {
        this.$root = $( '<div class="atmosLoginFrame" />' );
        this.$table = $( '<div class="atmosLoginTable" />' );
        this.$subtenant = $( '<input type="text" class="cell atmosCredentialValue" />' ).val( subtenant );
        this.$user = $( '<input type="text" class="cell atmosCredentialValue" />' ).val( user );
        this.$secret = $( '<input type="text" class="cell atmosCredentialValue" />' ).val( secret );
        this.$loginButton = $( '<div class="atmosButton" />' ).text( 'Login' );
        this.modalWindow = new ModalWindow();

        $( 'body' ).append( this.modalWindow.$root );

        this.$root.append( this.$table ).append( this.$loginButton );
        this.$table.append( $( '<div class="row" />' ).append( $( '<div class="cell atmosCredentialName" />' ).text( 'Subtenant ID' ) ).append( this.$subtenant ) );
        this.$table.append( $( '<div class="row" />' ).append( $( '<div class="cell atmosCredentialName" />' ).text( 'User' ) ).append( this.$user ) );
        this.$table.append( $( '<div class="row" />' ).append( $( '<div class="cell atmosCredentialName" />' ).text( 'Secret' ) ).append( this.$secret ) );

        var page = this;
        this.$loginButton.click( function() {
            var uid = page.$subtenant.val() + '/' + page.$user.val();
            callback( uid, page.$secret.val() );
            page.modalWindow.hide();
        } );

        this.modalWindow.showContent( 'Please provide your credentials', this.$root );
        this.modalWindow.hideCloseButton();
    }

    $.fn.atmosBrowser = function( options ) {
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

})( jQuery );