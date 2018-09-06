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
AtmosBrowserUtil = function( uid, secret, templateEngine, $statusMessage ) {
    this.templates = templateEngine;
    this.useNamespace = true;
    this.$statusMessage = $statusMessage;
    this.setCredentials( uid, secret );
};
// hackery to support IE <9. jQuery's bind will break remove() for any elements with associated events, so we can't use that either.
AtmosBrowserUtil.bind = function( element, eventName, eventFunction ) {
    element['on' + eventName] = function( event ) {
        if ( !event ) event = window.event;
        if ( !event.stopPropagation ) event.stopPropagation = function() {
            event.cancelBubble = true;
        };
        if ( !event.preventDefault ) event.preventDefault = function() {
            event.returnValue = false;
        };
        if ( !event.pageX && event.x ) event.pageX = event.x + (document.body.scrollLeft || document.documentElement.scrollLeft);
        if ( !event.pageY && event.y ) event.pageY = event.y + (document.body.scrollTop || document.documentElement.scrollTop);
        if ( !event.which && event.button ) { // translate IE's mouse button
            event.which = (event.button < 2) ? 1 : (event.button == 4) ? 2 : 3; // 1 => 1, 4 => 2, * => 3
        }
        if ( !event.target ) event.target = event.srcElement;
        eventFunction( event );
    };
};
AtmosBrowserUtil.dumpObject = function( object, maxLevel ) {
    if ( typeof(maxLevel) == 'undefined' ) maxLevel = 1;
    if ( maxLevel < 0 ) return object; // we've reached our max depth
    var output = "[";
    for ( var property in object ) {
        if ( !object.hasOwnProperty( property ) ) continue;
        var value = object[property];
        if ( typeof(value) === 'object' && value != null ) value = AtmosBrowserUtil.dumpObject( value, maxLevel - 1 );
        output += property + "=" + value + ", ";
    }
    if ( output.length > 1 ) output = output.substr( 0, output.length - 2 );
    output += "]";
    return output;
};
AtmosBrowserUtil.prototype.setCredentials = function( uid, secret ) {
    this.atmos = new AtmosRest( {uid: uid, secret: secret} );
};
AtmosBrowserUtil.prototype.debug = function( message ) {
    if ( typeof(console) !== 'undefined' ) {
        if ( typeof(console.debug) !== 'undefined' ) {
            console.debug( message );
        } else if ( typeof(console.log) !== 'undefined' ) {
            console.log( message );
        }
    }
};
AtmosBrowserUtil.prototype.prompt = function( templateName, model, validatorFunction, validationFailedTemplateName, initialValue ) {
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
AtmosBrowserUtil.prototype.getAtmosInfo = function( callback ) {
    var util = this;
    this.atmos.getServiceInformation( function( result ) {
        if ( result.successful ) {
            util.updateServiceInfo( result.value );
            callback( result.value )
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.updateServiceInfo = function( serviceInfo ) {
    this.atmos.atmosConfig.utf8Support = serviceInfo.utf8;
};
AtmosBrowserUtil.prototype.createDirectory = function( parentDirectory, callback ) {
    var name = this.prompt( 'newDirectoryNamePrompt', {}, this.validName, 'validNameError' );
    if ( name == null || name.length == 0 ) return;
    var path = this.endWithSlash( parentDirectory + name );
    var util = this;
    this.showStatus( 'Checking for existing object...' );
    this.atmos.getSystemMetadata( path, null, function( result ) {
        util.hideStatus( 'Checking for existing object...' );
        if ( result.successful ) {
            alert( util.templates.get( 'itemExistsError' ).render( {name: path} ) );
            return;
        }
        util.showStatus( 'Creating directory...' );
        util.atmos.createObjectOnPath( path, null, null, null, null, null, null, function( result ) {
            util.hideStatus( 'Creating directory...' );
            if ( result.successful ) {
                callback( name );
            } else {
                util.atmosError( result );
                callback( null );
            }
        } );
    } );
};
AtmosBrowserUtil.prototype.showStatus = function( message ) {
    if ( this.$statusMessage ) {
        this.$statusMessage.text( message );
        this.$statusMessage.fadeIn( 100 );
        if ( !this.statusMessageQueue ) this.statusMessageQueue = {};
        var count = this.statusMessageQueue[message] || 0;
        this.statusMessageQueue[message] = count + 1;
    }
};
AtmosBrowserUtil.prototype.hideStatus = function( message ) {
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
AtmosBrowserUtil.prototype.error = function( message ) {
    alert( message );
};
AtmosBrowserUtil.prototype.atmosError = function( result ) {
    this.debug( AtmosBrowserUtil.dumpObject( result ) );
    try {
        this.error( this.templates.get( 'atmosError.' + (result.errorCode || result.httpCode ) ).render( {message: (result.errorMessage || result.httpMessage)} ) );
    } catch ( error ) {
        this.error( result.errorMessage || result.httpMessage ); // if we don't have a template for the error, use the plain message
    }
};
AtmosBrowserUtil.prototype.futureDate = function( howMany, ofWhat ) {
    try {
        howMany = parseInt( howMany );
    } catch ( error ) {
        this.error( this.templates.get( 'invalidNumberError' ).render( {value: howMany} ) );
        return null;
    }
    var date = new Date();
    var currentNumber = {hours: date.getHours(), days: date.getDate(), months: date.getMonth(), years: date.getFullYear()}[ofWhat.toLowerCase()];
    var func = {hours: date.setHours, days: date.setDate, months: date.setMonth, years: date.setFullYear}[ofWhat.toLowerCase()];
    func.call( date, currentNumber + howMany );
    return date;
};
AtmosBrowserUtil.prototype.validTag = function( tag ) {
    // cannot be null or empty, cannot start or end with a slash
    return !(!tag || tag.trim().length == 0 || /^\//.test( tag ) || /\/$/.test( tag ));
};
AtmosBrowserUtil.prototype.validPath = function( path ) {
    // cannot be null or empty, must start with a slash
    return !(!path || path.trim().length == 0 || !/^\//.test( path ));
};
AtmosBrowserUtil.prototype.validName = function( name ) {
    // cannot be null or empty, cannot contain /
    return !(!name || name.trim().length == 0 || /[/]/.test( name ));
};
AtmosBrowserUtil.prototype.endWithSlash = function( path ) {
    path = path.trim();
    if ( path.charAt( path.length - 1 ) !== '/' ) path += '/';
    return path;
};
AtmosBrowserUtil.prototype.noSlashes = function( path ) {
    if ( !path || path.length == 0 ) return path;
    if ( path.charAt( 0 ) == '/' ) path = path.substr( 1 );
    if ( path.charAt( path.length - 1 ) == '/' ) path = path.substr( 0, path.length - 1 );
    return path;
};
AtmosBrowserUtil.prototype.isListable = function( entryType ) {
    return this.isDirectory( entryType ) || this.isTag( entryType );
};
AtmosBrowserUtil.prototype.isDirectory = function( entryType ) {
    return entryType == FileRow.ENTRY_TYPE.DIRECTORY;
};
AtmosBrowserUtil.prototype.isTag = function( entryType ) {
    return entryType == FileRow.ENTRY_TYPE.TAG;
};
AtmosBrowserUtil.prototype.parentDirectory = function( path ) {
    path = path.substr( 0, path.length - 1 ); // remove last character in case it's a slash

    var lastSlashIndex = path.lastIndexOf( '/' );
    if ( lastSlashIndex === 0 ) return '/';
    else return path.substr( 0, lastSlashIndex );
};
AtmosBrowserUtil.prototype.list = function( path, includeMetadata, callback ) {
    var util = this;
    var options = new ListOptions( 0, null, includeMetadata, null, null );
    this.showStatus( 'Listing directory...' );
    if ( this.useNamespace ) {
        var list_call = function( util, options, entries ) {
            util.atmos.listDirectory( path, options, function( result ) {
                util.hideStatus( 'Listing directory...' );
                if ( result.successful ) {
                    for ( var i = 0; i < result.value.length; i++ ) {
                        if ( path === '/' && result.value[i].name === 'apache' ) continue;
                        entries.push( result.value[i] );
                    }
                    if ( result.token ) { // we don't have all the results, so make another list call
                        options.token = result.token;
                        util.showStatus( 'Listing directory...' );
                        list_call( util, options, entries );
                    } else callback( entries );
                } else {
                    util.atmosError( result );
                    callback( null );
                }
            } );
        };
        list_call( util, options, [] );
    } else { // object API
        this.atmos.getListableTags( this.noSlashes( path ), function( result ) {
            if ( result.successful ) {
                var entries = [];
                if ( result.value ) {
                    for ( var i = 0; i < result.value.length; i++ ) {
                        entries.push( {id: path + result.value[i], name: result.value[i], type: FileRow.ENTRY_TYPE.TAG} );
                    }
                }
                if ( path != '/' ) {
                    var list_call = function( util, options, entries ) {
                        util.atmos.listObjects( util.noSlashes( path ), options, function( result2 ) {
                            util.hideStatus( 'Listing directory...' );
                            if ( result2.successful ) {
                                for ( var i = 0; i < result2.value.length; i++ ) {
                                    result2.value[i].type = FileRow.ENTRY_TYPE.REGULAR;
                                    entries.push( result2.value[i] );
                                }
                                if ( result2.token ) { // we don't have all the results so make another list call
                                    options.token = result2.token;
                                    util.showStatus( 'Listing directory...' );
                                    list_call( util, options, entries );
                                } else callback( entries );
                            } else {
                                util.atmosError( result2 );
                                callback( null );
                            }
                        } );
                    };
                    list_call( util, options, entries );
                } else {
                    util.hideStatus( 'Listing directory...' );
                    callback( entries );
                }
            } else if ( result.httpCode == 404 ) { // try object id
                util.atmos.getSystemMetadata( util.noSlashes( path ), null, function( result2 ) {
                    util.hideStatus( 'Listing directory...' );
                    if ( result2.successful ) {
                        callback( [
                            {id: result2.value.systemMeta.objectid, size: result2.value.systemMeta.size, type: FileRow.ENTRY_TYPE.REGULAR, systemMeta: result2.value.systemMeta}
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
AtmosBrowserUtil.prototype.getAcl = function( id, callback ) {
    var util = this;
    this.showStatus( 'Retrieving ACL...' );
    this.atmos.getAcl( id, function( result ) {
        util.hideStatus( 'Retrieving ACL...' );
        if ( result.successful ) {
            callback( result.value );
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.setAcl = function( id, acl, callback ) {
    var util = this;
    this.showStatus( 'Setting ACL...' );
    this.atmos.setAcl( id, acl, function( result ) {
        util.hideStatus( 'Setting ACL...' );
        if ( result.successful ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.getSystemMetadata = function( id, callback ) {
    var util = this;
    this.showStatus( 'Retrieving system metadata...' );
    this.atmos.getSystemMetadata( id, null, function( result ) {
        util.hideStatus( 'Retrieving system metadata...' );
        if ( result.successful ) {
            callback( result.value.systemMeta );
        } else if ( result.httpCode == 404 ) { // execute callback passing null if object doesn't exist
            callback( null );
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.getUserMetadata = function( entry, callback ) {
    var util = this;
    this.showStatus( 'Retrieving metadata...' );
    this.atmos.getUserMetadata( entry.id, null, function( result ) {
        util.hideStatus( 'Retrieving metadata...' );
        if ( result.successful ) {
            entry.userMeta = result.value.meta;
            entry.listableUserMeta = result.value.listableMeta;
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.setUserMetadata = function( id, userMeta, listableMeta, callback ) {
    var util = this;
    this.showStatus( 'Saving metadata...' );
    this.atmos.setUserMetadata( id, userMeta, listableMeta, function( result ) {
        util.hideStatus( 'Saving metadata...' );
        if ( result.successful ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.deleteUserMetadata = function( id, tags, callback ) {
    var util = this;
    this.showStatus( 'Saving metadata...' );
    this.atmos.deleteUserMetadata( id, tags, function( result ) {
        util.hideStatus( 'Saving metadata...' );
        if ( result.successful ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.getObjectInfo = function( id, callback ) {
    var util = this;
    this.showStatus( 'Retrieving Object Info...' );
    this.atmos.getObjectInfo( id, function( result ) {
        util.hideStatus( 'Retrieving Object Info...' );
        if ( result.successful ) {
            callback( result.value );
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.createObject = function( path, form, data, mimeType, completeCallback, progressCallback, currentLocation ) {
    var util = this;
    this.showStatus( 'Creating object...' );
    var callback = function( result ) {
        util.hideStatus( 'Creating object...' );
        if ( result.successful ) {
            completeCallback( result.value );
        } else {
            util.atmosError( result );
            completeCallback( false );
        }
    };
    if ( path ) this.atmos.createObjectOnPath( path, null, null, null, form, data, mimeType, callback, progressCallback );
    else {
        var listableMeta = {}; // add new object to current tag path if using object API
        if ( currentLocation != '/' ) listableMeta[this.noSlashes( currentLocation )] = '';
        this.atmos.createObject( null, null, this.useNamespace ? null : listableMeta, form, data, mimeType, callback, progressCallback );
    }
};
AtmosBrowserUtil.prototype.overwriteObject = function( id, form, data, mimeType, completeCallback, progressCallback ) {
    var util = this;
    this.showStatus( 'Overwriting object...' );
    this.atmos.updateObject( id, null, null, null, form, data, null, mimeType, function( result ) {
        util.hideStatus( 'Overwriting object...' );
        if ( result.successful ) {
            completeCallback( true );
        } else {
            util.atmosError( result );
            completeCallback( false );
        }
    }, progressCallback );
};
AtmosBrowserUtil.prototype.renameObject = function( existingPath, newPath, callback ) {
    var util = this;
    this.showStatus( 'Checking for existing object...' );
    this.atmos.getSystemMetadata( newPath, null, function( result ) {
        util.hideStatus( 'Checking for existing object...' );
        var overwrite = false;
        if ( result.successful ) {
            if ( util.isDirectory( result.value.systemMeta.type ) ) {
                alert( util.templates.get( 'directoryExistsError' ).render( {name: newPath} ) );
                return;
            }
            overwrite = confirm( util.templates.get( 'itemExistsPrompt' ).render( {name: newPath} ) );
            if ( !overwrite ) return;
        }
        util.showStatus( 'Renaming object...' );
        util.atmos.rename( existingPath, newPath, overwrite, function( result2 ) {
            util.hideStatus( 'Renaming object...' );
            if ( result2.successful ) {
                callback();
            } else {
                util.atmosError( result2 );
            }
        } );
    } );
};
AtmosBrowserUtil.prototype.deleteObject = function( id, callback ) {
    var util = this;
    this.showStatus( 'Deleting object...' );
    this.atmos.deleteObject( id, function( result ) {
        util.hideStatus( 'Deleting object...' );
        if ( result.successful ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.createVersion = function( id, callback ) {
    var util = this;
    this.showStatus( 'Creating version...' );
    this.atmos.versionObject( id, function( result ) {
        util.hideStatus( 'Creating version...' );
        if ( result.successful ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.listVersions = function( id, callback ) {
    var util = this;
    this.showStatus( 'Listing versions...' );
    this.atmos.listVersions( id, function( result ) {
        util.hideStatus( 'Listing versions...' );
        if ( result.successful ) {
            callback( result.value );
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.restoreVersion = function( id, vId, callback ) {
    var util = this;
    this.showStatus( 'Restoring version...' );
    this.atmos.restoreVersion( id, vId, function( result ) {
        util.hideStatus( 'Restoring version...' );
        if ( result.successful ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.deleteVersion = function( vId, callback ) {
    var util = this;
    this.showStatus( 'Deleting version...' );
    this.atmos.deleteVersion( vId, function( result ) {
        util.hideStatus( 'Deleting version...' );
        if ( result.successful ) {
            callback();
        } else {
            util.atmosError( result );
        }
    } );
};
/**
 * @param {AccessTokenPolicy} policy the token policy to use
 * @param {string=} id (optional) the object identifier
 * @param {function=} callback the callback function (token URL will be the parameter)
 */
AtmosBrowserUtil.prototype.createAccessToken = function( policy, id, callback ) {
    var util = this;
    this.showStatus( 'Creating access token...' );
    this.atmos.createAccessToken( policy, id, null, null, null, function( result ) {
        util.hideStatus( 'Creating access token...' );
        if ( result.successful ) {
            callback( result.value );
        } else {
            util.atmosError( result );
        }
    } );
};
AtmosBrowserUtil.prototype.getShareableUrl = function( id, date, asAttachment, attachmentName ) {
    var disposition = this.atmos.createAttachmentDisposition( attachmentName || (AtmosRest.objectPathMatch.test( id ) ? this.getFileName( id ) : id ) );
    return this.atmos.getShareableUrl( id, date, (asAttachment ? disposition : false) );
};
AtmosBrowserUtil.prototype.getFileName = function( path ) {
    var pattern = /\/[^/]*$/;
    var name = pattern.exec( path );
    if ( name ) {
        if ( name[0].length ) name = name[0];
        return name.substr( 1 );
    }
    return path;
};
AtmosBrowserUtil.prototype.downloadFile = function( id, index, downloadName ) {
    var iframe = $( 'iframe#atmosIframe' + index );
    if ( iframe.length == 0 ) {
        iframe = $( '<iframe id="atmosIframe' + index + '" style="display: none;" />' );
        $( 'body' ).append( iframe );
    }
    iframe.prop( 'src', this.getShareableUrl( id, this.futureDate( 1, 'hours' ), true, downloadName ) );
};
AtmosBrowserUtil.prototype.sort = function( $table, subSelector, inverse ) {

    // save sort state
    if ( !this.sortMap ) this.sortMap = {};
    if ( typeof(inverse) == 'undefined' ) {
        inverse = !this.sortMap[subSelector];
    }
    this.sortMap[subSelector] = inverse;
    $table.find( '.row' ).sortElements( function( a, b ) {
        var $a = jQuery( a ).find( subSelector ), $b = jQuery( b ).find( subSelector );
        var valA = $a.data( 'rawValue' ) || $a.text();
        valA = valA.toLowerCase();
        var valB = $b.data( 'rawValue' ) || $b.text();
        valB = valB.toLowerCase();
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
