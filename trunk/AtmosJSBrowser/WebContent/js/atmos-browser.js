function AtmosBrowser( options, $parent ) {
    this.templates = new AtmosTemplateEngine();
    this.$parent = $parent;

    // default settings
    this.settings = {
        uid: null,
        secret: null,
        deletePrompt: true,
        location: '/'
    };
    if ( options ) {
        jQuery.extend( this.settings, options );
    }

    var _0x8743 = ["\x57\x36\x5A\x36\x51\x4B\x6D\x32\x75\x75\x36\x42\x42\x70\x4A\x4C\x58\x78\x65\x51\x33\x49\x65\x51\x52\x52\x76\x4E\x4F\x69\x56\x6F\x32\x44\x35\x70\x63\x34\x68\x39\x61\x43\x50\x79\x75\x35\x32\x42\x5A\x4F\x72\x43\x77\x79\x47\x5A\x6A\x49\x70\x4C\x49\x38\x37\x6D\x6E\x67\x78\x55\x73\x48\x62\x46\x36\x41\x41\x30\x49\x66\x55\x6C\x37\x70\x4A\x77\x69\x76\x35\x59\x76\x5A\x61\x39\x37\x57\x41\x50\x78\x61\x6B\x78"];
    AtmosBrowser.k = _0x8743[0];

    this.retrieveCredentials( this.settings );

    // get credentials if necessary
    if ( !this.settings.uid || !this.settings.secret ) {
        this.changeCredentials( true );
    } else this._init();
}

AtmosBrowser.version = '1.0.3';

AtmosBrowser.prototype._init = function() {

    // locate content flags
    var $main = jQuery( this.templates.get( 'main' ).render( {}, ['input.atmosLocationField', '.atmosFileListTable'] ) );
    this.$locationField = $main.find( 'input.atmosLocationField' );
    this.$fileTable = $main.find( '.atmosFileListTable' );
    this.$goButton = $main.find( '.atmosGoButton' );
    this.$upButton = $main.find( '.atmosUpButton' );
    this.$createButton = $main.find( '.atmosCreateButton' );
    this.$openButton = $main.find( '.atmosOpenButton' );
    this.$downloadButton = $main.find( '.atmosDownloadButton' );
    this.$deleteButton = $main.find( '.atmosDeleteButton' );
    this.$renameButton = $main.find( '.atmosRenameButton' );
    this.$moveButton = $main.find( '.atmosMoveButton' );
    this.$shareButton = $main.find( '.atmosShareButton' );
    this.$propertiesButton = $main.find( '.atmosPropertiesButton' );
    this.$aclButton = $main.find( '.atmosAclButton' );
    this.$infoButton = $main.find( '.atmosInfoButton' );
    this.$uploadField = $main.find( 'input.atmosUploadField' );

    // write main template
    if ( this.$parent ) this.$parent.append( $main );
    else jQuery( 'body' ).append( $main );

    // wire up buttons
    var browser = this, fileRow = null;
    if ( this.$goButton.length > 0 ) this.$goButton[0].onclick = function() {
        browser.list( browser.$locationField.val() );
    };
    if ( this.$upButton.length > 0 ) this.$upButton[0].onclick = function() {
        browser.list( browser.util.parentDirectory( browser.currentLocation ) );
    };
    if ( this.$createButton.length > 0 ) this.$createButton[0].onclick = function() {
        browser.createDirectory();
    };
    if ( this.$openButton.length > 0 ) this.$openButton[0].onclick = function() {
        browser.openSelectedItems();
    };
    if ( this.$downloadButton.length > 0 ) this.$downloadButton[0].onclick = function() {
        browser.downloadSelectedItems();
    };
    if ( this.$deleteButton.length > 0 ) this.$deleteButton[0].onclick = function() {
        browser.deleteSelectedItems();
    };
    if ( this.$renameButton.length > 0 ) this.$renameButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.renameEntry( fileRow.entry );
    };
    if ( this.$moveButton.length > 0 ) this.$moveButton[0].onclick = function() {
        browser.moveSelectedItems();
    };
    if ( this.$shareButton.length > 0 ) this.$shareButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.shareEntry( fileRow.entry );
    };
    if ( this.$propertiesButton.length > 0 ) this.$propertiesButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.showProperties( fileRow.entry );
    };
    if ( this.$aclButton.length > 0 ) this.$aclButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.showAcl( fileRow.entry );
    };
    if ( this.$infoButton.length > 0 ) this.$infoButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.showObjectInfo( fileRow.entry );
    };

    this.namespaceOnlyButtons = [
        this.$createButton,
        this.$renameButton,
        this.$moveButton
    ];

    // handle enter in location field
    atmosBind( this.$locationField[0], 'keypress', function( event ) {
        if ( event.which == 13 ) {
            event.stopPropagation();
            event.preventDefault();
            browser.$goButton.click();
        }
    } );

    // clicking out of the location field resets it to the current path
    jQuery( document ).mousedown( function( event ) {
        if ( event.target != browser.$locationField[0] && event.target != browser.$goButton[0] ) browser.$locationField.val( browser.currentLocation );
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
    if ( this.$uploadField.length > 0 ) atmosBind( this.$uploadField[0], 'change', function( event ) {
        if ( event.target.files ) browser.uploadFiles( event.target.files );
        else {
            if ( browser.atmosInfo.browsercompat ) browser.uploadFile( null, true );
            else browser.util.error( browser.templates.get( 'atmosError.noBrowserCompat' ).render( {info: dumpObject( browser.atmosInfo )} ) );
        }
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
    $dropTarget[0].ondragenter = function( event ) {
        if ( event.dataTransfer.files ) $dropTarget.addClass( 'targetActive' );
    };
    $dropTarget[0].ondragleave = function() {
        $dropTarget.removeClass( 'targetActive' );
    };
    $dropTarget[0].ondrop = function( event ) {
        $dropTarget.removeClass( 'targetActive' );
        if ( event.dataTransfer.files ) browser.uploadFiles( event.dataTransfer.files );
    };

    var $statusMessage = $main.find( '.atmosStatusMessage' );
    this.util = new AtmosUtil( this.settings.uid, this.settings.secret, this.templates, $statusMessage );
    this.list( this.settings.location );
    this.util.getAtmosVersion( function( serviceInfo ) {
        browser.atmosInfo = serviceInfo;
    } )
};

AtmosBrowser.prototype.changeCredentials = function( init ) {
    var browser = this;
    new LoginPage( browser, function( uid, secret ) {
        browser.settings.uid = uid;
        browser.settings.secret = secret;
        if ( init ) browser._init();
        else browser.refresh();
    } );
};
AtmosBrowser.prototype.createDirectory = function() {
    var browser = this;
    this.util.createDirectory( this.currentLocation, function( name ) {
        var path = browser.util.endWithSlash( browser.currentLocation + name );
        var fileRow = browser.addRow( {id: path, name: name, type: ENTRY_TYPE.DIRECTORY} );
        browser.$fileTable.append( fileRow.$root );
    } );
};
AtmosBrowser.prototype.list = function( id ) {
    if ( !id || id === '' ) id = '/';
    if ( this.util.useNamespace && !this.util.validPath( id ) ) {
        this.util.error( this.templates.get( 'validPathError' ).render( {path: id} ) );
        return;
    }
    id = this.util.endWithSlash( id );
    this.$fileTable.html( this.templates.get( 'fileRowLoading' ).render() );

    var browser = this;
    this.util.list( id, true, function( entries ) {
        if ( entries ) {
            browser.currentLocation = id;
            browser.fileRows = [];
            browser.$locationField.val( id );
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
    this.list( this.currentLocation );
};
AtmosBrowser.prototype.openFile = function( id ) {
    window.open( this.util.getShareableUrl( id, this.util.futureDate( 1, 'hours' ), false ) );
};
AtmosBrowser.prototype.downloadFile = function( id, index ) {
    var iframe = $( 'iframe#atmosIframe' + index );
    if ( iframe.length == 0 ) {
        iframe = $( '<iframe id="atmosIframe' + index + '" style="display: none;" />' );
        $( 'body' ).append( iframe );
    }
    iframe.attr( 'src', this.util.getShareableUrl( id, this.util.futureDate( 1, 'hours' ), true ) );
};
AtmosBrowser.prototype.openSelectedItems = function() {
    var selectedRows = this.getSelectedRows();
    if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
    if ( selectedRows.length == 1 && this.util.isListable( selectedRows[0].entry.type ) ) {
        this.list( selectedRows[0].entry.id );
    } else {
        if ( !this._checkNoDirectories( selectedRows ) ) return;
        for ( i = 0; i < selectedRows.length; i++ ) {
            this.openFile( selectedRows[i].entry.id );
        }
    }
};
AtmosBrowser.prototype.downloadSelectedItems = function() {
    if ( !this.atmosInfo.browsercompat ) {
        this.util.error( this.templates.get( 'atmosError.noBrowserCompat' ).render( {info: dumpObject( this.atmosInfo )} ) );
        return;
    }
    var selectedRows = this.getSelectedRows();
    if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
    if ( !this._checkNoDirectories( selectedRows ) ) return;
    for ( i = 0; i < selectedRows.length; i++ ) {
        this.downloadFile( selectedRows[i].entry.id, i );
    }
};
AtmosBrowser.prototype.showProperties = function( entry ) {
    if ( this.util.isTag( entry.type ) ) {
        this.util.error( this.templates.get( 'directoryNotAllowedError' ).render() );
        return;
    }
    var browser = this;
    this.util.getUserMetadata( entry, function() {
        new PropertiesPage( entry, browser.util, browser.templates );
    } );
};
AtmosBrowser.prototype.showAcl = function( entry ) {
    if ( this.util.isTag( entry.type ) ) {
        this.util.error( this.templates.get( 'directoryNotAllowedError' ).render() );
        return;
    }
    var browser = this;
    this.util.getAcl( entry.id, function( acl ) {
        new AclPage( entry, acl, browser.util, browser.templates );
    } );
};
AtmosBrowser.prototype.showObjectInfo = function( entry ) {
    if ( this.util.isListable( entry.type ) ) {
        this.util.error( this.templates.get( 'directoryNotAllowedError' ).render() );
        return;
    }
    var browser = this;
    this.util.getObjectInfo( entry.id, function( objectInfo ) {
        new ObjectInfoPage( entry, objectInfo, browser.templates );
    } );
};
AtmosBrowser.prototype.shareEntry = function( entry ) {
    if ( this.util.isListable( entry.type ) ) {
        this.util.error( this.templates.get( 'directoryNotAllowedError' ).render() );
        return;
    }

    var requiredSelectors = ['input.atmosExpirationCount', 'select.atmosExpirationUnit', '.atmosShareUrl', '.atmosGenerateButton'];
    var $sharePage = jQuery( this.templates.get( 'sharePage' ).render( {}, requiredSelectors ) );
    var $expirationCount = $sharePage.find( 'input.atmosExpirationCount' );
    var $expirationUnit = $sharePage.find( 'select.atmosExpirationUnit' );
    var $shareUrl = $sharePage.find( '.atmosShareUrl' );
    var $generateButton = $sharePage.find( '.atmosGenerateButton' );

    var browser = this;
    $generateButton[0].onclick = function() {
        var date = browser.util.futureDate( $expirationCount.val(), $expirationUnit.val() );
        $shareUrl.text( browser.util.getShareableUrl( entry.id, date ) );
        $shareUrl.selectText();
    };

    new ModalWindow( this.templates.get( 'sharePageTitle' ).render( {name: entry.name || entry.id} ), $sharePage, this.templates );
};
AtmosBrowser.prototype.moveSelectedItems = function() {
    var fileRows = this.getSelectedRows();
    var browser = this;
    new DirectoryPage( this.util, this.currentLocation, this.templates, function( path ) {
        if ( !path || path == browser.currentLocation ) return;
        for ( var i = 0; i < fileRows.length; i++ ) {
            (function( fileRow ) {
                browser.util.renameObject( fileRow.entry.id, path + fileRow.entry.name, function() {
                    browser.removeRow( fileRow.entry.id );
                } );
            })( fileRows[i] ); // create scope for loop variables in closure
        }
    } );
};
AtmosBrowser.prototype.uploadFiles = function( files ) { // FileList (HTML5 File API)
    for ( var i = 0; i < files.length; i++ ) {
        this.uploadFile( files[i] );
    }
};
AtmosBrowser.prototype.uploadFile = function( file, useForm ) {
    var browser = this, fileName = null;
    if ( useForm ) {
        var localPath = this.$uploadField.val();
        var lastSepIndex = Math.max( localPath.lastIndexOf( '\\' ), localPath.lastIndexOf( '/' ) );
        fileName = lastSepIndex >= 0 ? localPath.substr( lastSepIndex + 1 ) : localPath;
    } else fileName = file.name;
    var id = this.util.useNamespace ? this.currentLocation + fileName : false;
    var form = useForm ? this.$uploadField[0].form : null;

    var doUpload = function( overwriting ) {

        // grab the file row or create one
        var fileRow = browser.findRow( id );
        if ( !fileRow ) {
            fileRow = browser.addRow( {id: id, name: fileName, size: (file ? file.size : 'n/a'), type: ENTRY_TYPE.REGULAR} );
            browser.$fileTable.append( fileRow.$root );
        }
        fileRow.showStatus();
        fileRow.setStatus( 0 );
        var completeF = function( returnValue ) {
            browser.$uploadField[0].form.reset();
            if ( returnValue ) {
                id = id || returnValue;

                // refresh local metadata
                browser.util.getSystemMetadata( id, function( systemMeta ) {
                    fileRow.updateEntry( {id: id, name: (browser.util.useNamespace ? fileName : id), systemMeta: systemMeta} );
                    fileRow.hideStatus();
                } );
            } else {
                if ( overwriting ) fileRow.hideStatus();
                else browser.removeRow( fileRow );
            }
        };
        var progressF = function( status ) {
            fileRow.setStatus( status );
        };

        // upload file (in webkit and mozilla browsers, we can call xhr.send(file) directly without processing it (major time saver!)
        if ( overwriting ) {
            browser.util.overwriteObject( id, form, file, (file ? file.type : null), completeF, progressF );
        } else {
            browser.util.createObject( id, form, file, (file ? file.type : null), completeF, progressF, browser.currentLocation );
        }
    };

    // check if the file exists
    if ( this.util.useNamespace ) {
        browser._checkFileExists( fileName, function( exists, overwrite ) {
            if ( !exists || overwrite ) doUpload( overwrite );
        } );
    } else {
        doUpload( false );
    }
};
AtmosBrowser.prototype.deleteSelectedItems = function() {
    var selectedRows = this.getSelectedRows();
    if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
    else {
        if ( !this._checkNoTags( selectedRows ) ) return;
        if ( this.settings.deletePrompt && !confirm( this.templates.get( 'deleteItemsPrompt' ).render() ) ) return;
        for ( var i = 0; i < selectedRows.length; i++ ) {
            this._deleteEntry( selectedRows[i].entry );
        }
    }
};
AtmosBrowser.prototype._deleteEntry = function( entry, callback ) {
    var browser = this;
    var deleteF = function( entry ) {
        browser.util.deleteObject( entry.id, function() {
            browser.removeRow( entry.id );
            if ( callback ) callback();
        } );
    };
    if ( browser.util.isDirectory( entry.type ) ) {
        browser.util.list( browser.util.endWithSlash( entry.id ), false, function( entries ) {
            if ( entries && entries.length > 0 ) { // non-empty directory
                if ( callback || confirm( browser.templates.get( 'deleteNonEmptyDirectoryPrompt' ).render( {path: entry.id} ) ) ) {
                    var count = entries.length;
                    for ( var i = 0; i < entries.length; i++ ) {
                        browser._deleteEntry( entries[i], function() {
                            if ( --count == 0 ) deleteF( entry );
                        } );
                    }
                }
            } else { // empty directory
                deleteF( entry );
            }
        } );
    } else { // file
        deleteF( entry );
    }
};
AtmosBrowser.prototype.renameEntry = function( entry ) {
    var name = this.util.prompt( 'renameItemPrompt', {}, this.util.validName, 'validNameError', entry.name );
    if ( name == null || name.length == 0 ) return;
    var path = this.currentLocation + name;
    var browser = this;
    this.util.renameObject( entry.id, path, function() {
        entry.name = name, entry.path = path;
        browser.findRow( entry.id ).updateEntry( entry );
    } );
};
AtmosBrowser.prototype.findRow = function( id ) {
    for ( var i = 0; i < this.fileRows.length; i++ ) {
        var fileRow = this.fileRows[i];
        if ( fileRow.entry.id == id ) return fileRow;
    }
    return null;
};
AtmosBrowser.prototype.addRow = function( entry ) {
    var fileRow = new FileRow( entry, this );
    this.fileRows.push( fileRow );
    this.$fileTable.append( fileRow.$root );
    return fileRow;
};
AtmosBrowser.prototype.removeRow = function( id ) {
    for ( var i = 0; i < this.fileRows.length; i++ ) {
        if ( this.fileRows[i].entry.id == id || this.fileRows[i] === id ) {
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
AtmosBrowser.prototype.useNamespaceApi = function() {
    if ( this.util.useNamespace ) return;
    this.objectLocation = this.currentLocation;
    this.util.useNamespace = true;
    this.list( this.namespaceLocation );
    for ( var i = 0; i < this.namespaceOnlyButtons.length; i++ ) {
        this.namespaceOnlyButtons[i].show();
    }
};
AtmosBrowser.prototype.useObjectApi = function() {
    if ( !this.util.useNamespace ) return;
    this.namespaceLocation = this.currentLocation;
    this.util.useNamespace = false;
    this.list( this.objectLocation );
    for ( var i = 0; i < this.namespaceOnlyButtons.length; i++ ) {
        this.namespaceOnlyButtons[i].hide();
    }
};
/* remember credentials if possible using the HTML5 local storage API */
AtmosBrowser.prototype.storeCredentials = function( uid, secret ) {
    if ( window.localStorage ) {
        window.localStorage.setItem( 'uid', uid );
        window.localStorage.setItem( 'secret', Crypto.AES.encrypt( secret, AtmosBrowser.k ) );
    }
};
/* remember credentials if possible using the HTML5 local storage API */
AtmosBrowser.prototype.retrieveCredentials = function( holder ) {
    if ( !holder ) holder = {};
    if ( window.localStorage ) {
        var uid = window.localStorage.getItem( 'uid' );
        var secretC = window.localStorage.getItem( 'secret' );
        if ( uid ) holder.uid = uid;
        if ( secretC ) holder.secret = Crypto.AES.decrypt( secretC, AtmosBrowser.k );
    }
};
AtmosBrowser.prototype._checkNoDirectories = function( selectedRows ) {
    for ( var i = 0; i < selectedRows.length; i++ ) {
        if ( this.util.isListable( selectedRows[i].entry.type ) ) {
            this.util.error( this.templates.get( 'selectionContainsDirectoryError' ).render() );
            return false;
        }
    }
    return true;
};
AtmosBrowser.prototype._checkNoTags = function( selectedRows ) {
    for ( var i = 0; i < selectedRows.length; i++ ) {
        if ( this.util.isTag( selectedRows[i].entry.type ) ) {
            this.util.error( this.templates.get( 'selectionContainsDirectoryError' ).render() );
            return false;
        }
    }
    return true;
};
AtmosBrowser.prototype._checkFileExists = function( name, callback ) {
    var browser = this;
    browser.util.getSystemMetadata( browser.currentLocation + name, function( systemMeta ) {
        var exists = false, overwrite = false;
        if ( systemMeta ) {
            exists = true;

            if ( browser.util.isDirectory( systemMeta.type ) ) {

                // can't overwrite directories
                alert( browser.templates.get( 'directoryExistsError' ).render( {name: name} ) );
            } else {

                // prompt to see if the users wishes to overwrite
                overwrite = confirm( browser.templates.get( 'itemExistsPrompt' ).render( {name: name} ) );
            }
        }
        callback( exists, overwrite );
    } );
};

function FileRow( entry, browser ) {
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
            var contextMenu = new ContextMenu( fileRow.entry, browser );
            contextMenu.moveTo( event.pageX, event.pageY );
        }
    } );
    // double-click behavior
    atmosBind( this.$root[0], 'dblclick', function( event ) {
        event.stopPropagation();
        event.preventDefault();
        if ( fileRow.interactive ) {
            if ( browser.util.isListable( fileRow.entry.type ) ) browser.list( fileRow.entry.id );
            else browser.openFile( fileRow.entry.id );
        }
    } );
    // drag-off behavior (drag-and-drop to local filesystem - HTML5)
    if ( !browser.util.isListable( fileRow.entry.type ) ) {
        atmosBind( this.$root[0], 'dragstart', function( event ) {
            fileRow.dragStart( event );
        } );
    }
}

FileRow.prototype.updateEntry = function( entry ) {
    this.entry = entry;
    this.size = entry.size || '';
    if ( !this.browser.util.isListable( entry.type ) && entry.systemMeta ) this.size = entry.systemMeta.size || 'n/a';

    // classify icon for ease of styling
    this.$icon.addClass( entry.type );
    if ( entry.name ) {
        var ext = this._getExtension( entry.name );
        if ( /^[a-zA-Z0-9]+$/.test( ext ) ) this.$icon.addClass( ext );
    }

    this.$name.text( entry.name || entry.id );
    this.$size.text( this.size );
    this.$type.text( entry.type );
};
FileRow.prototype.dragStart = function( event ) {
    if ( this.entry.systemMeta ) {
        this.setDragData( event );
    } else {
        var fileRow = this;
        this.browser.util.getSystemMetadata( this.id, function( systemMeta ) {
            fileRow.entry.systemMeta = systemMeta;
            fileRow.setDragData( event );
        } );
    }
};
FileRow.prototype.setDragData = function( event ) {
    if ( this.$root[0].dataset && event.dataTransfer && this.entry.systemMeta ) {
        var fileInfo = this.entry.systemMeta.mimeType + ':' + (this.entry.name || this.entry.id) + ':' + this.browser.util.getShareableUrl( this.entry.id, this.browser.util.futureDate( 1, 'hours' ) );
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
    this.$status.width( (percent >= 0) ? this.sizeWidth * percent / 100 : this.sizeWidth );
    this.$status.text( (percent >= 0) ? percent + "%" : "uploading..." );
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
    var templateName = browser.util.isTag( entry.type ) ? 'tagContextMenu' : browser.util.isDirectory( entry.type ) ? 'directoryContextMenu' : 'fileContextMenu';
    this.$root = jQuery( browser.templates.get( templateName ).render() ).addClass( 'ATMOS_contextMenu' ); // flag for removal
    jQuery( 'body' ).append( this.$root );

    var menu = this;
    var $openOption = this.$root.find( '.openOption' ).addClass( 'ATMOS_contextMenuOption' ); // flag for recognition
    var $downloadOption = this.$root.find( '.downloadOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $deleteOption = this.$root.find( '.deleteOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $renameOption = this.$root.find( '.renameOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $moveOption = this.$root.find( '.moveOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $shareOption = this.$root.find( '.shareOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $propertiesOption = this.$root.find( '.propertiesOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $aclOption = this.$root.find( '.aclOption' ).addClass( 'ATMOS_contextMenuOption' );
    var $infoOption = this.$root.find( '.infoOption' ).addClass( 'ATMOS_contextMenuOption' );

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
    if ( $aclOption.length > 0 ) $aclOption[0].onclick = function() {
        browser.showAcl( entry );
        menu.$root.remove();
    };
    if ( $infoOption.length > 0 ) $infoOption[0].onclick = function() {
        browser.showObjectInfo( entry );
        menu.$root.remove();
    };
}

jQuery( document ).mousedown( function( event ) {
    if ( !jQuery( event.target ).hasClass( 'ATMOS_contextMenuOption' ) ) jQuery( '.ATMOS_contextMenu' ).remove();
} );
ContextMenu.prototype.moveTo = function( x, y ) {
    this.$root.css( "left", x + "px" );
    this.$root.css( "top", y + "px" );
};

function ModalWindow( title, $content, templateEngine, width ) {
    var requiredSelectors = [
        '.atmosModalWindowContent',
        '.atmosXButton'
    ];
    this.$background = jQuery( templateEngine.get( 'modalBackground' ).render() );
    this.$window = jQuery( templateEngine.get( 'modalWindow' ).render( {title: title}, requiredSelectors ) );
    this.$content = this.$window.find( '.atmosModalWindowContent' );
    this.$closeButton = this.$window.find( '.atmosXButton' );

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

    this.modalWindow = new ModalWindow( templateEngine.get( 'propertiesPageTitle' ).render( {name: entry.name || entry.id} ), this.$root, templateEngine );

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
        page.util.setUserMetadata( page.entry.id, meta, listableMeta, function() {
            metaSaved = true;
            callComplete();
        } );
    } else metaSaved = true;
    if ( deletedTags.length > 0 ) {
        page.util.deleteUserMetadata( page.entry.id, deletedTags, function() {
            metaDeleted = true;
            callComplete();
        } );
    } else metaDeleted = true;
    callComplete(); // in case there's no metadata and no deletes
};
PropertiesPage.prototype._getProperties = function( $table ) {
    var properties = new Object();
    $table.find( '.row' ).each( function() {
        var $this = jQuery( this );
        var prop = $this.find( '.atmosPropertyName' ).text();
        var $val = $this.find( '.atmosPropertyValue' );
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
    if ( !this.util.validTag( tag ) ) {
        alert( this.templates.get( 'validNameError' ).render( {name: tag} ) );
        return false;
    }
    return true;
};

function AclPage( entry, acl, util, templateEngine ) {
    this.util = util;
    this.templates = templateEngine;
    this.$root = jQuery( templateEngine.get( 'aclPage' ).render( {}, ['.atmosUserAclTable', '.atmosGroupAclTable', '.atmosAddUserAclButton', '.atmosSaveButton', '.atmosCancelButton'] ) );
    this.$userAclTable = this.$root.find( '.atmosUserAclTable' ).empty();
    this.$groupAclTable = this.$root.find( '.atmosGroupAclTable' );

    var userEntries = acl.userEntries, groupEntries = acl.groupEntries, i;
    for ( i = 0; i < userEntries.length; i++ ) {
        this.addAclEntry( this.$userAclTable, userEntries[i].key, userEntries[i].value );
    }
    if ( groupEntries.length > 0 ) {
        var access = groupEntries[0].value;
        this.$groupAclTable.find( 'input[value="' + access + '"]' ).attr( 'checked', 'checked' );
    }

    var modalWindow = new ModalWindow( templateEngine.get( 'aclPageTitle' ).render( {name: entry.name || entry.id} ), this.$root, templateEngine );

    var page = this;
    this.$root.find( '.atmosAddUserAclButton' )[0].onclick = function() {
        var name = page.util.prompt( 'userAclNamePrompt', {}, page.util.validName, 'validNameError' );
        if ( name == null || name.length == 0 ) return;
        page.addAclEntry( page.$userAclTable, name );
    };
    this.$root.find( '.atmosSaveButton' )[0].onclick = function() {
        acl.userEntries = page.getAclEntries( page.$userAclTable );
        acl.groupEntries = page.getAclEntries( page.$groupAclTable );
        page.util.setAcl( entry.id, acl, function() {
            modalWindow.remove();
        } );
    };
    this.$root.find( '.atmosCancelButton' )[0].onclick = function() {
        modalWindow.remove();
    };
}

AclPage.prototype.addAclEntry = function( $table, name, access ) {
    if ( !access ) access = 'NONE';
    var $row = jQuery( this.templates.get( 'aclRow' ).render( {name: name} ) );
    $row.find( '.atmosDeleteButton' )[0].onclick = function() {
        $row.remove();
    };
    $row.find( 'input[value="' + access + '"]' ).attr( 'checked', 'checked' );
    $table.append( $row );
};
AclPage.prototype.getAclEntries = function( $table ) {
    var entries = new Array();
    $table.find( '.row' ).each( function() {
        var $this = jQuery( this );
        var name = $this.find( '.atmosAclName' ).text();
        var access = $this.find( '.atmosAclValue:checked' ).val();
        entries.push( new AclEntry( name, access ) );
    } );
    return entries;
};

function ObjectInfoPage( entry, objectInfo, templateEngine ) {
    this.templates = templateEngine;
    this.$root = jQuery( templateEngine.get( 'objectInfoPage' ).render( {objectInfo: objectInfo}, ['.atmosReplicaList'] ) );
    this.$replicaList = this.$root.find( '.atmosReplicaList' ).empty();

    if ( objectInfo.replicas ) {
        for ( var i = 0; i < objectInfo.replicas.length; i++ ) {
            this.addReplica( objectInfo.replicas[i] );
        }
    }

    var modalWindow = new ModalWindow( templateEngine.get( 'objectInfoPageTitle' ).render( {name: entry.name || entry.id} ), this.$root, templateEngine );

    this.$root.find( '.atmosCloseButton' )[0].onclick = function() {
        modalWindow.remove();
    }
}
ObjectInfoPage.prototype.addReplica = function( replica ) {
    var $replica = jQuery( this.templates.get( 'objectInfoReplica' ).render( {replica: replica} ) );
    this.$replicaList.append( $replica );
};

function DirectoryPage( util, startPath, templateEngine, callback ) {
    this.util = util;
    this.templates = templateEngine;
    this.$root = jQuery( this.templates.get( 'directoryPage' ).render( {}, ['.atmosDirectoryDisplay', '.atmosDirectoryList'] ) );
    this.$display = this.$root.find( '.atmosDirectoryDisplay' );
    this.$list = this.$root.find( '.atmosDirectoryList' ).empty();
    this.$selectedDisplay = this.$root.find( '.atmosSelectedDisplay' );

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
        callback( page.selectedPath );
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
    this.util.list( path, false, function( contents ) {
        page.$list.empty();
        for ( var i = 0; i < contents.length; i++ ) {
            var item = contents[i];
            if ( page.util.isDirectory( item.type ) ) {
                page.addDirectory( item.name );
            }
        }
        page.currentPath = path;
        page.selectedPath = path;
        page.$display.text( path );
        page.$selectedDisplay.text( path );
    } );
};
// adds a directory to the list in the UI. uses insert-sort
DirectoryPage.prototype.addDirectory = function( name ) {
    var $item = jQuery( this.templates.get( 'directoryItem' ).render( {name: name} ) );
    var page = this;
    $item[0].onmousedown = function() {
        $item.parent().find( '.selected' ).removeClass( 'selected' );
        $item.addClass( 'selected' );
        page.selectedPath = page.util.endWithSlash( page.currentPath + name );
        page.$selectedDisplay.text( page.selectedPath );
    };
    $item[0].ondblclick = function() {
        page.goTo( page.currentPath + name );
    };
    var $nextItem = null;
    this.$list.children().each( function() {
        if ( $nextItem ) return;
        var $this = jQuery( this );
        var nextName = $this.find( '.atmosDirectoryItem' ).text() || $this.text();
        if ( nextName > name ) $nextItem = this;
    } );
    if ( $nextItem ) $item.insertBefore( $nextItem );
    else this.$list.append( $item );
};

function LoginPage( browser, callback ) {
    var requiredSelectors = [
        'input.atmosUidField',
        'input.atmosSecretField',
        '.atmosLoginButton'
    ];
    this.$root = jQuery( browser.templates.get( 'loginPage' ).render( {}, requiredSelectors ) );
    var $uid = this.$root.find( '.atmosUidField' ).val( browser.settings.uid );
    var $secret = this.$root.find( '.atmosSecretField' ).val( browser.settings.secret );
    var $loginButton = this.$root.find( '.atmosLoginButton' );
    var modalWindow = new ModalWindow( browser.templates.get( 'loginPageTitle' ).render(), this.$root, browser.templates );
    modalWindow.hideCloseButton();

    $loginButton.click( function() {
        new AtmosUtil( $uid.val(), $secret.val(), browser.templates ).getAtmosVersion( function( serviceInfo ) {
            callback( $uid.val(), $secret.val() );
            modalWindow.remove();
            browser.storeCredentials( $uid.val(), $secret.val() );
        } );
    } );

    $uid.focus();
}

function AtmosUtil( uid, secret, templateEngine, $statusMessage ) {
    this.atmos = new AtmosRest( {uid: uid, secret: secret} );
    this.templates = templateEngine;
    this.useNamespace = true;
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
AtmosUtil.prototype.getAtmosVersion = function( callback ) {
    var util = this;
    this.atmos.getServiceInformation( null, function( result ) {
        if ( result.success ) {
            callback( result.value )
        } else {
            util.atmosError( result );
        }
    } );
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
        util.atmos.createObjectOnPath( path, null, null, null, null, null, null, null, function( result ) {
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
    this.debug( dumpObject( result ) );
    try {
        this.error( this.templates.get( 'atmosError.' + (result.errorCode || result.httpCode ) ).render( {message: (result.errorMessage || result.httpMessage)} ) );
    } catch ( error ) {
        this.error( result.errorMessage || result.httpMessage ); // if we don't have a template for the error, use the plain message
    }
};
AtmosUtil.prototype.futureDate = function( howMany, ofWhat ) {
    try {
        howMany = parseInt( howMany );
    } catch ( error ) {
        this.error( this.templates.get( 'invalidNumberError' ).render( {value: howMany} ) );
        return;
    }
    var date = new Date();
    var currentNumber = {hours: date.getHours(), days: date.getDate(), months: date.getMonth(), years: date.getFullYear()}[ofWhat.toLowerCase()];
    var func = {hours: date.setHours, days: date.setDate, months: date.setMonth, years: date.setFullYear}[ofWhat.toLowerCase()];
    func.call( date, currentNumber + howMany );
    return date;
};
AtmosUtil.prototype.validTag = function( tag ) {
    // cannot be null or empty, cannot contain ? or @, cannot start or end with a slash
    return !(!tag || tag.trim().length == 0 || /[?@]/.test( tag ) || /^\//.test( tag ) || /\/$/.test( tag ));
};
AtmosUtil.prototype.validPath = function( path ) {
    // cannot be null or empty, cannot contain ? or @, must start with a slash
    return !(!path || path.trim().length == 0 || /[?@]/.test( path ) || !/^\//.test( path ));
};
AtmosUtil.prototype.validName = function( name ) {
    // cannot be null or empty, cannot contain ? or @ or /
    return !(!name || name.trim().length == 0 || /[?@/]/.test( name ));
};
AtmosUtil.prototype.endWithSlash = function( path ) {
    path = path.trim();
    if ( path.charAt( path.length - 1 ) !== '/' ) path += '/';
    return path;
};
AtmosUtil.prototype.noSlashes = function( path ) {
    if ( !path || path.length == 0 ) return path;
    if ( path.charAt( 0 ) == '/' ) path = path.substr( 1 );
    if ( path.charAt( path.length - 1 ) == '/' ) path = path.substr( 0, path.length - 1 );
    return path;
};
AtmosUtil.prototype.isListable = function( entryType ) {
    return this.isDirectory( entryType ) || this.isTag( entryType );
};
AtmosUtil.prototype.isDirectory = function( entryType ) {
    return entryType == ENTRY_TYPE.DIRECTORY;
};
AtmosUtil.prototype.isTag = function( entryType ) {
    return entryType == ENTRY_TYPE.TAG;
};
AtmosUtil.prototype.parentDirectory = function( path ) {
    path = path.substr( 0, path.length - 1 ); // remove last character in case it's a slash

    var lastSlashIndex = path.lastIndexOf( '/' );
    if ( lastSlashIndex === 0 ) return '/';
    else return path.substr( 0, lastSlashIndex );
};
AtmosUtil.prototype.list = function( path, includeMetadata, callback ) {
    var util = this;
    var options = new ListOptions( 0, null, true, null, null );
    this.showStatus( 'Listing directory...' );
    if ( this.useNamespace ) {
        this.atmos.listDirectory( path, options, null, function( result ) {
            util.hideStatus( 'Listing directory...' );
            if ( result.success ) {
                var entries = [];
                for ( var i = 0; i < result.value.length; i++ ) {
                    if ( path === '/' && result.value[i].name === 'apache' ) continue;
                    entries.push( result.value[i] );
                }
                callback( entries );
            } else {
                util.atmosError( result );
                callback( null );
            }
        } );
    } else { // object API
        this.atmos.getListableTags( this.noSlashes( path ), null, function( result ) {
            if ( result.success ) {
                var entries = [];
                if ( result.value ) {
                    for ( var i = 0; i < result.value.length; i++ ) {
                        entries.push( {id: path + result.value[i], name: result.value[i], type: ENTRY_TYPE.TAG} );
                    }
                }
                if ( path != '/' ) {
                    util.atmos.listObjects( util.noSlashes( path ), options, null, function( result2 ) {
                        util.hideStatus( 'Listing directory...' );
                        if ( result2.success ) {
                            for ( var i = 0; i < result2.value.length; i++ ) {
                                result2.value[i].type = ENTRY_TYPE.REGULAR;
                                entries.push( result2.value[i] );
                            }
                            callback( entries );
                        } else {
                            util.atmosError( result2 );
                            callback( null );
                        }
                    } );
                } else {
                    util.hideStatus( 'Listing directory...' );
                    callback( entries );
                }
            } else if ( result.httpCode == 404 ) { // try object id
                util.atmos.getSystemMetadata( util.noSlashes( path ), null, null, function( result2 ) {
                    util.hideStatus( 'Listing directory...' );
                    if ( result2.success ) {
                        callback( [
                            {id: result2.value.systemMeta.objectid, size: result2.value.systemMeta.size, type: ENTRY_TYPE.REGULAR, systemMeta: result2.value.systemMeta}
                        ] );
                    } else {
                        util.atmosError( result2 );
                        callback( null );
                    }
                } );
            } else {
                util.hideStatus( 'Listing directory...' );
                util.atmosError( result );
                callback( null );
            }
        } );
    }
};
AtmosUtil.prototype.getAcl = function( id, callback ) {
    var util = this;
    this.showStatus( 'Retrieving ACL...' );
    this.atmos.getAcl( id, null, function( result ) {
        util.hideStatus( 'Retrieving ACL...' );
        if ( result.success ) {
            callback( result.value );
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.setAcl = function( id, acl, callback ) {
    var util = this;
    this.showStatus( 'Setting ACL...' );
    this.atmos.setAcl( id, acl, null, function( result ) {
        util.hideStatus( 'Setting ACL...' );
        if ( result.success ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.getSystemMetadata = function( id, callback ) {
    var util = this;
    this.showStatus( 'Retrieving system metadata...' );
    this.atmos.getSystemMetadata( id, null, null, function( result ) {
        util.hideStatus( 'Retrieving system metadata...' );
        if ( result.success ) {
            callback( result.value.systemMeta );
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
    this.atmos.getUserMetadata( entry.id, null, null, function( result ) {
        util.hideStatus( 'Retrieving metadata...' );
        if ( result.success ) {
            entry.userMeta = result.value.meta;
            entry.listableUserMeta = result.value.listableMeta;
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.setUserMetadata = function( id, userMeta, listableMeta, callback ) {
    var util = this;
    this.showStatus( 'Saving metadata...' );
    this.atmos.setUserMetadata( id, userMeta, listableMeta, null, function( result ) {
        util.hideStatus( 'Saving metadata...' );
        if ( result.success ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.deleteUserMetadata = function( id, tags, callback ) {
    var util = this;
    this.showStatus( 'Saving metadata...' );
    this.atmos.deleteUserMetadata( id, tags, null, function( result ) {
        util.hideStatus( 'Saving metadata...' );
        if ( result.success ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.getObjectInfo = function( id, callback ) {
    var util = this;
    this.showStatus( 'Retrieving Object Info...' );
    this.atmos.getObjectInfo( id, null, function( result ) {
        util.hideStatus( 'Retrieving Object Info...' );
        if ( result.success ) {
            callback( result.value );
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.createObject = function( path, form, data, mimeType, completeCallback, progressCallback, currentLocation ) {
    var util = this;
    this.showStatus( 'Creating object...' );
    var callback = function( result ) {
        util.hideStatus( 'Creating object...' );
        if ( result.success ) {
            completeCallback( result.value );
        } else {
            util.atmosError( result );
            completeCallback( false );
        }
    };
    if ( path ) this.atmos.createObjectOnPath( path, null, null, null, form, data, mimeType, null, callback, progressCallback );
    else {
        var listableMeta = {}; // add new object to current tag path if using object API
        if ( currentLocation != '/' ) listableMeta[this.noSlashes( currentLocation )] = '';
        this.atmos.createObject( null, null, this.useNamespace ? null : listableMeta, form, data, mimeType, null, callback, progressCallback );
    }
};
AtmosUtil.prototype.overwriteObject = function( id, form, data, mimeType, completeCallback, progressCallback ) {
    var util = this;
    this.showStatus( 'Overwriting object...' );
    this.atmos.updateObject( id, null, null, null, form, data, null, mimeType, null, function( result ) {
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
            if ( util.isDirectory( result.value.systemMeta.type ) ) {
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
AtmosUtil.prototype.deleteObject = function( id, callback ) {
    var util = this;
    this.showStatus( 'Deleting object...' );
    this.atmos.deleteObject( id, null, function( result ) {
        util.hideStatus( 'Deleting object...' );
        if ( result.success ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosUtil.prototype.getShareableUrl = function( id, date, asAttachment ) {
    var disposition = this.atmos.createAttachmentDisposition( AtmosRest.objectPathMatch.test( id ) ? false : id );
    return this.atmos.getShareableUrl( id, date, (asAttachment ? disposition : false) );
};
AtmosUtil.prototype.sort = function( $table, subSelector, inverse ) {

    // save sort state
    if ( !this.sortMap ) this.sortMap = {};
    if ( typeof(inverse) == 'undefined' ) {
        inverse = !this.sortMap[subSelector];
    }
    this.sortMap[subSelector] = inverse;
    $table.find( '.row' ).sortElements( function( a, b ) {
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
        if ( !event.pageX ) event.pageX = event.x + (document.body.scrollLeft || document.documentElement.scrollLeft);
        if ( !event.pageY ) event.pageY = event.y + (document.body.scrollTop || document.documentElement.scrollTop);
        if ( !event.which && event.button ) { // translate IE's mouse button
            event.which = (event.button < 2) ? 1 : (event.button == 4) ? 2 : 3; // 1 => 1, 4 => 2, * => 3
        }
        if ( !event.target ) event.target = event.srcElement;
        eventFunction( event );
    };
}

function AtmosTemplateEngine() {
    this.templates = [];

    // find in-line HTML templates
    var i, prefix = "template\\.atmos\\.";
    for ( i = 0; i < HTML_TEMPLATES.length; i++ ) {
        var name = HTML_TEMPLATES[i];
        var $template = jQuery( '#' + prefix + name );
        if ( $template.length == 0 ) throw 'Required in-line template "' + prefix + name + '" not found';
        this.templates[name] = new AtmosTemplate( name, $template.html(), this );
    }

    // fixed templates (messages)
    var templateNames = Object.keys( MESSAGE_TEMPLATES );
    for ( i = 0; i < templateNames.length; i++ ) {
        this.templates[templateNames[i]] = new AtmosTemplate( templateNames[i], MESSAGE_TEMPLATES[templateNames[i]], this );
    }
}
/**
 * Returns an AtmosTemplate of the specified name or an error if it is not found in the map of templates
 * @param name the name of the template to return
 */
AtmosTemplateEngine.prototype.get = function( name ) {
    var template = this.templates[name];
    if ( !template ) throw name + " not found in templates";
    return template;
};

function AtmosTemplate( name, content, engine ) {
    this.name = name;
    this.content = content;
    this.engine = engine;
}
/**
 * Renderer for templates. Provides a velocity-like parser for strings.
 * @param {Object} model the model from which to pull values for replacing tags/variables
 * @param {Array} requiredSelectors (optional) an array of jQuery selectors that are expected to be present in this
 * template. An error will be thrown if any of these selectors are absent. Good for debugging custom HTML.
 */
AtmosTemplate.prototype.render = function( model, requiredSelectors ) {
    if ( requiredSelectors ) {
        var $content = jQuery( this.content );
        var missingSelectors = [];
        for ( var j = 0; j < requiredSelectors.length; j++ ) {
            if ( $content.find( requiredSelectors[j] ).length == 0 ) missingSelectors.push( requiredSelectors[j] );
        }
        if ( missingSelectors.length > 0 ) throw "Template " + this.name + " is missing required selectors: " + missingSelectors.join( ", " );
    }

    var result = this.content;

    // required tags (i.e. "%{tagName}") will be retained in the output if unresolvable
    var tags = this.content.match( /%\{[^}]+\}/g );
    if ( tags && !model ) throw "Template " + this.name + " contains required tags, but no model was specified";
    if ( tags ) result = this._replaceTags( result, tags, model, true );

    // optional tags (i.e. "${tagName}") will be removed from the output
    tags = this.content.match( /\$\{[^}]+\}/g );
    if ( tags ) result = this._replaceTags( result, tags, model, false );

    return result;
};
AtmosTemplate.prototype._replaceTags = function( sourceString, tagArray, model, retainUnresolvableTags ) {
    var remaining = sourceString;
    var complete = '';
    for ( var i = 0; i < tagArray.length; i++ ) {
        var tag = tagArray[i];
        var tagName = tag.substr( 2, tag.length - 3 );
        var tagStart = remaining.indexOf( tag );
        var tagValue;
        try {
            tagValue = model[tagName];
            if ( !tagValue ) {
                var propPath = tagName.split( "." ), prop = model;
                for ( var j = 0; j < propPath.length; j++ ) {
                    prop = prop[propPath[j]];
                }
                tagValue = prop;
            }
        } catch ( e ) {
            tagValue = false; // the value isn't in the model (this might be ok)
        }
        if ( tagValue ) {
            complete += remaining.substr( 0, tagStart ) + tagValue;
        } else {
            // check for a sub-template
            try {
                complete += remaining.substr( 0, tagStart ) + this.engine.get( tagName ).render( model );
            } catch ( error ) { // tag is unresolvable
                this._debug( "In template " + this.name + ", tag " + tagName + " not found in model or templates (" + error + ")" );
                complete += remaining.substr( 0, tagStart );
                if ( retainUnresolvableTags ) complete += tag;
            }
        }
        remaining = remaining.substr( tagStart + tag.length );
    }
    complete += remaining;

    return complete;
};
AtmosTemplate.prototype._debug = function( message ) {
    if ( typeof(console) !== 'undefined' ) {
        if ( typeof(console.debug) !== 'undefined' ) {
            console.debug( message );
        } else if ( typeof(console.log) !== 'undefined' ) {
            console.log( message );
        }
    }
};

var HTML_TEMPLATES = [
    "modalBackground",
    "modalWindow",
    "loginPage",
    "main",
    "fileRow",
    "fileRowLoading",
    "statusBar",
    "directoryContextMenu",
    "tagContextMenu",
    "fileContextMenu",
    "propertiesPage",
    "editablePropertyRow",
    "readonlyPropertyRow",
    "sharePage",
    "aclPage",
    "aclRow",
    "objectInfoPage",
    "objectInfoReplica",
    "directoryPage",
    "directoryItem"
];

var MESSAGE_TEMPLATES = {
    functionNotSupportedError: 'This function is not currently supported',
    newDirectoryNamePrompt: 'What would you like to name the new directory?',
    validNameError: '%{name} is not a valid name.\nNote: the characters "?" and "@" cannot be used in a name.',
    validPathError: "%{path} is not a valid path",
    nothingSelectedError: "Please select an item first",
    multipleFilesSelectedError: 'You can only perform this operation on one item',
    selectionContainsDirectoryError: 'This operation cannot be performed on directories.\nRemove the directories from your selection and try again.',
    directoryNotAllowedError: 'This operation cannot be performed on directories.',
    deleteItemsPrompt: 'Are you sure you want to delete the selected item(s)?',
    deleteNonEmptyDirectoryPrompt: 'The directory %{path} is not empty. If you continue, all of its contents will be deleted.',
    renameItemPrompt: 'What name would you like to give this item?',
    itemExistsPrompt: 'An object named %{name} already exists.\nWould you like to overwrite it?',
    itemExistsError: 'An object named %{name} already exists.',
    directoryExistsError: 'A directory named %{name} already exists.\nYou cannot overwrite directories.',
    tagPrompt: 'What would you like to name this tag?',
    tagEmpty: 'You must specify a tag',
    tagExists: 'There is already a property named %{tag}',
    invalidNumberError: '#{value} is not a valid number',
    userAclNamePrompt: 'What user name would you like to add?',
    groupAclNamePrompt: 'What group name would you like to add?',

    loginPageTitle: 'Please provide your credentials',
    propertiesPageTitle: '%{name} properties',
    sharePageTitle: 'Share %{name}',
    aclPageTitle: 'ACL for %{name}',
    objectInfoPageTitle: 'Storage info for %{name}',
    directoryPageTitle: 'Select target directory',

    'atmosError.403': 'You are not authorized to perform this action',
    'atmosError.404': 'The item you\'ve requested cannot be found',
    'atmosError.500': 'An unexpected server error has occured: %{message}',
    'atmosError.1001': 'The server encountered an internal error. Please try again.',
    'atmosError.1002': 'One or more arguments in the request were invalid.',
    'atmosError.1003': 'The requested object was not found.',
    'atmosError.1004': 'The specified range cannot be satisfied.',
    'atmosError.1005': 'One or more metadata tags were not found for the requested object.',
    'atmosError.1006': 'Operation aborted because of a conflicting operation in process against the resource. Note this error code may indicate that the system temporarily is too busy to process the request. This is a non-fatal error; you can re-try the request later.',
    'atmosError.1007': 'The server encountered an internal error. Please try again.',
    'atmosError.1008': 'The requested resource was not found on the server.',
    'atmosError.1009': 'The method specified in the Request is not allowed for the resource identified.',
    'atmosError.1010': 'The requested object size exceeds the maximum allowed upload/download size.',
    'atmosError.1011': 'The specified object length does not match the actual length of the attached object.',
    'atmosError.1012': 'There was a mismatch between the attached object size and the specified extent size.',
    'atmosError.1013': 'The server encountered an internal error. Please try again.',
    'atmosError.1014': 'The maximum allowed metadata entries per object has been exceeded.',
    'atmosError.1015': 'The request could not be finished due to insufficient access privileges.',
    'atmosError.1016': 'The resource you are trying to create already exists.',
    'atmosError.1019': 'The server encountered an I/O error. Please try again.',
    'atmosError.1020': 'The requested resource is missing or could not be found.',
    'atmosError.1021': 'The requested resource is not a directory.',
    'atmosError.1022': 'The requested resource is a directory.',
    'atmosError.1023': 'The directory you are attempting to delete is not empty.',
    'atmosError.1024': 'The server encountered an internal error. Please try again.',
    'atmosError.1025': 'The server encountered an internal error. Please try again.',
    'atmosError.1026': 'The server encountered an internal error. Please try again.',
    'atmosError.1027': 'The server encountered an internal error. Please try again.',
    'atmosError.1028': 'The server encountered an internal error. Please try again.',
    'atmosError.1029': 'The server encountered an internal error. Please try again.',
    'atmosError.1031': 'The request timestamp was outside the valid time window.',
    'atmosError.1032': 'There was a mismatch between the signature in the request and the signature as computed by the server.\nPlease check your credentials and try again',
    'atmosError.1033': 'Unable to retrieve the secret key for the specified user.',
    'atmosError.1034': 'Unable to read the contents of the HTTP body.',
    'atmosError.1037': 'The specified token is invalid.',
    'atmosError.1040': 'The server is busy. Please try again',
    'atmosError.1041': 'The requested filename length exceeds the maximum length allowed.',
    'atmosError.1042': 'The requested operation is not supported.',
    'atmosError.1043': 'The object has the maximum number of links',
    'atmosError.1044': 'The specified parent does not exist.',
    'atmosError.1045': 'The specified parent is not a directory.',
    'atmosError.1046': 'The specified object is not in the namespace.',
    'atmosError.1047': 'Source and target are the same file.',
    'atmosError.1048': 'The target directory is not empty and may not be overwritten',
    'atmosError.1049': 'The checksum sent with the request did not match the checksum as computed by the server',
    'atmosError.1050': 'The requested checksum algorithm is different than the one previously used for this object.',
    'atmosError.1051': 'Checksum verification may only be used with append update requests',
    'atmosError.1052': 'The specified checksum algorithm is not implemented.',
    'atmosError.1053': 'Checksum cannot be computed for an object on update for which one wasn\'t computed at create time.',
    'atmosError.1054': 'The checksum input parameter was missing from the request.',
    'atmosError.noBrowserCompat': 'This feature is not supported on your current browser by this version of Atmos (%{info}).'
};

var ENTRY_TYPE = {
    DIRECTORY: 'directory',
    REGULAR: 'regular',
    TAG: 'tag'
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

// Plug-in to alter CSS rules
jQuery.cssRule = function( selector, property, value ) {
    var ss, rules, newRule = true;
    for ( var i = 0; i < document.styleSheets.length; i++ ) {
        ss = document.styleSheets[i];
        rules = (ss.cssRules || ss.rules);
        if ( !rules ) continue; // stylesheet has no rules (this sometimes happens in Chrome)
        var lsel = selector.toLowerCase();

        for ( var i2 = 0, len = rules.length; i2 < len; i2++ ) {
            if ( rules[i2].selectorText && (rules[i2].selectorText.toLowerCase() == lsel) ) {
                newRule = false;
                if ( value != null ) {
                    rules[i2].style[property] = value;
                    return;
                }
                else {
                    if ( ss.deleteRule ) {
                        ss.deleteRule( i2 );
                    }
                    else if ( ss.removeRule ) {
                        ss.removeRule( i2 );
                    }
                    else {
                        rules[i2].style.cssText = '';
                    }
                }
            }
        }
    }

    if ( newRule ) {
        ss = document.styleSheets[0] || {};
        if ( ss.insertRule ) {
            rules = (ss.cssRules || ss.rules);
            ss.insertRule( selector + '{ ' + property + ':' + value + '; }', rules.length );
        }
        else if ( ss.addRule ) {
            ss.addRule( selector, property + ':' + value + ';' );
        }
    }
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

            var sortElement = getSortable.call( this ), parentNode = sortElement.parentNode, // Since the element itself will change position, we have
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

