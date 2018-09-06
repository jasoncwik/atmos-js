/*

 Copyright (c) 2011-2013, EMC Corporation

 All rights reserved.

 Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * Neither the name of the EMC Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 */
AtmosBrowser = function( options, $parent ) {
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
        this.showConfig( true );
    } else this._init();
};

// release version
/** @define {string} */
var ATMOS_BROWSER_VERSION = '0.1';
AtmosBrowser.version = ATMOS_BROWSER_VERSION;

/** @define {boolean} */
var ATMOS_BROWSER_COMPILED = false;
AtmosBrowser.compiled = ATMOS_BROWSER_COMPILED;

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
    this.$versionsButton = $main.find( '.atmosVersionsButton' );
    this.$filterButton = $main.find( '.atmosFilterButton' );
    this.$disableFilterButton = $main.find( '.atmosDisableFilterButton' );
    this.$uploadField = $main.find( 'input.atmosUploadField' );
    this.$filterField = $main.find( 'input.atmosFilterField' );
    this.$filterContainer = $main.find( '.atmosFilterContainer' );

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
    if ( this.$versionsButton.length > 0 ) this.$versionsButton[0].onclick = function() {
        fileRow = browser.singleSelectedRow();
        if ( fileRow ) browser.showVersions( fileRow.entry );
    };
    if ( this.$filterButton.length > 0 ) this.$filterButton[0].onclick = function() {
        browser.enableFilter();
    };
    if ( this.$disableFilterButton.length > 0 ) this.$disableFilterButton[0].onclick = function() {
        browser.disableFilter();
    };

    // quick-filter
    if ( this.$filterField.length > 0 ) {
        AtmosBrowserUtil.bind( this.$filterField[0], 'keyup', function( event ) {
            if ( event.keyCode == 27 ) browser.disableFilter();
            else browser.filterRows();
        } );
    }

    // handle enter in location field
    AtmosBrowserUtil.bind( this.$locationField[0], 'keypress', function( event ) {
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
    $main.find( '[data-sort-class]' ).each( function() {
        var sortClass = jQuery( this ).data( 'sortClass' );
        this.onclick = function() {
            browser.util.sort( browser.$fileTable, '.' + sortClass );
        };
    } );

    // selecting files triggers an upload
    if ( this.$uploadField.length > 0 ) AtmosBrowserUtil.bind( this.$uploadField[0], 'change', function( event ) {
        if ( event.target.files ) browser.uploadFiles( event.target.files );
        else browser.uploadFile( null, true );
    } );

    // drag-n-drop upload
    var $dropTarget = $main.find( '.atmosDropTarget' );
    if ( $dropTarget.length == 0 ) $dropTarget = this.$fileTable;
    var cancelEvent = function( event ) {
        event.stopPropagation();
        event.preventDefault();
    };
    AtmosBrowserUtil.bind( $main[0], 'dragenter', cancelEvent );
    AtmosBrowserUtil.bind( $main[0], 'dragover', cancelEvent );
    AtmosBrowserUtil.bind( $main[0], 'drop', cancelEvent );
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
    this.util = new AtmosBrowserUtil( this.settings.uid, this.settings.secret, this.templates, $statusMessage );
    this.list( this.settings.location );
    this.util.getAtmosInfo( function( serviceInfo ) {
        browser.atmosInfo = serviceInfo;
    } )
};
AtmosBrowser.prototype.enableFilter = function() {
    this.$filterButton.hide();
    this.$filterContainer.show();
    this.$filterField.focus();
};
AtmosBrowser.prototype.disableFilter = function() {
    this.$filterField.val( '' );
    this.$filterContainer.hide();
    this.$filterButton.show();
    this.filterRows();
};
AtmosBrowser.prototype.showConfig = function( init ) {
    var browser = this;
    new ConfigPage( this.templates, function( uid, secret ) {
        browser.settings.uid = uid;
        browser.settings.secret = secret;
        if ( init ) browser._init();
        else {
            browser.util.setCredentials( uid, secret );
            browser.list( '/' );
        }
    }, !init );
};
AtmosBrowser.prototype.createDirectory = function() {
    var browser = this;
    this.util.createDirectory( this.currentLocation, function( name ) {
        var path = browser.util.endWithSlash( browser.currentLocation + name );
        var fileRow = browser.addRow( {id: path, name: name, type: FileRow.ENTRY_TYPE.DIRECTORY} );
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
        browser.filterRows();
    } );
};
AtmosBrowser.prototype.refresh = function() {
    this.list( this.currentLocation );
};
AtmosBrowser.prototype.openFile = function( id ) {
    window.open( this.util.getShareableUrl( id, this.util.futureDate( 1, 'hours' ), false ) );
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
    var selectedRows = this.getSelectedRows();
    if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
    if ( !this._checkNoDirectories( selectedRows ) ) return;
    for ( i = 0; i < selectedRows.length; i++ ) {
        this.util.downloadFile( selectedRows[i].entry.id, i );
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
AtmosBrowser.prototype.showVersions = function( entry ) {
    if ( this.util.isListable( entry.type ) ) {
        this.util.error( this.templates.get( 'directoryNotAllowedError' ).render() );
        return;
    }
    new VersionsPage( entry, this.util, this.templates );
};
AtmosBrowser.prototype.shareEntry = function( entry ) {
    if ( this.util.isListable( entry.type ) ) {
        this.util.error( this.templates.get( 'directoryNotAllowedError' ).render() );
        return;
    }
    new SharePage( entry, this.util, this.templates, this.atmosInfo );
};
AtmosBrowser.prototype.moveSelectedItems = function() {
    var fileRows = this.getSelectedRows();
    if ( fileRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
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
            fileRow = browser.addRow( {id: id, name: fileName, size: (file ? file.size : 'n/a'), type: FileRow.ENTRY_TYPE.REGULAR} );
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
                    fileRow.updateEntry( {id: id, name: (browser.util.useNamespace ? fileName : id), objectId: returnValue, systemMeta: systemMeta} );
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
        entry.name = name;
        entry.path = path;
        if ( AtmosRest.objectPathMatch.test( entry.id ) ) entry.id = path;
        browser.findRow( entry.id ).updateEntry( entry );
    } );
};
AtmosBrowser.prototype.filterRows = function() {
    if ( this.$filterField.length > 0 ) {
        var filterExp = new RegExp( this.$filterField.val(), 'i' ); // case-insensitive
        this.fileRows.forEach( function( row ) {
            if ( filterExp.test( row.entry.name ) ) {
                row.$root.show();
            } else {
                row.$root.hide();
            }
        } );
    }
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
    jQuery( '.atmosNamespaceButton' ).show();
};
AtmosBrowser.prototype.useObjectApi = function() {
    if ( !this.util.useNamespace ) return;
    this.namespaceLocation = this.currentLocation;
    this.util.useNamespace = false;
    this.list( this.objectLocation );
    jQuery( '.atmosNamespaceButton' ).hide();
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
