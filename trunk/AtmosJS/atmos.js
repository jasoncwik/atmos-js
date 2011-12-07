/*

 Copyright (c) 2011, EMC Corporation

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

var isNodejs = false;
if ( typeof(require) != 'undefined' ) {
    // We're running inside node.js
    crypto = require( 'crypto' );
    jsdom = require( 'jsdom' );
    XMLHttpRequest = require( './lib/XMLHttpRequest.js' ).XMLHttpRequest;

    isNodejs = true;
} else {
    ///////////////////////////////////////////////////
    // Array function backported from JavaScript 1.6 //
    // Needed by some browsers                       //
    ///////////////////////////////////////////////////
    if ( !Array.prototype.forEach ) {
        Array.prototype.forEach = function( fun /*, thisp*/ ) {
            var len = this.length;
            if ( typeof fun != "function" )
                throw new TypeError();

            var thisp = arguments[1];
            for ( var i = 0; i < len; i++ ) {
                if ( i in this )
                    fun.call( thisp, this[i], i, this );
            }
        };
    }

    //////////////////////////////////////////////////
    // String function backported from ECMAScript-5 //
    // Needed by some browsers                      //
    //////////////////////////////////////////////////
    if ( !String.prototype.trim ) {
        String.prototype.trim = function() {
            return this.replace( /^\s+|\s+$/g, "" );
        };
    }

    //////////////////////////////////////////////////
    // Object function backported                   //
    // Needed by some browsers                      //
    //////////////////////////////////////////////////
    if ( !Object.keys ) {
        Object.keys = function( obj ) {
            var objKeys = [];
            for ( var p in obj ) {
                if ( !obj.hasOwnProperty( p ) ) continue;
                objKeys.push( p );
            }
            return objKeys;
        };
    }
}

//////////////////////////////////////////////////
// dump function for use in debugging           //
// (recursive)                                  //
//////////////////////////////////////////////////
function dumpObject( object, maxLevel ) {
    if ( typeof(maxLevel) == 'undefined' ) maxLevel = 1;
    if ( maxLevel < 0 ) return object; // we've reached our max depth
    var output = "[";
    for ( var property in object ) {
        if ( !object.hasOwnProperty( property ) ) continue;
        var value = object[property];
        if ( typeof(value) === 'object' && value != null ) value = dumpObject( value, maxLevel - 1 );
        output += property + "=" + value + ", ";
    }
    if ( output.length > 1 ) output = output.substr( 0, output.length - 2 );
    output += "]";
    return output;
}

/**
 * The AtmosRange object is used to specify a range of object data to store or retrieve.
 * @param {Number} offset the byte offset within an object's data from which to start the range.
 * @param {Number} size the number of bytes to include in the range.
 */
function AtmosRange( offset, size ) {
    this.offset = offset;
    this.size = size;
}
AtmosRange.prototype.toString = function() {
    return 'bytes=' + this.offset + '-' + (this.offset + this.size - 1);
};

/**
 * The AtmosResult object is returned to all of the
 * asynchronous callbacks.  See individual functions
 * to determine the contents of the result object.
 * @param success
 * @param state
 * @class AtmosResult
 */
function AtmosResult( success, state ) {
    this.success = success;
    this.state = state;
}


/**
 * ACL objects contain two properties: userEntries and groupEntries
 * Each of those properties should be an Array of AclEntry
 * objects.
 * @class Acl
 */
function Acl( userEntries, groupEntries ) {
    this.userEntries = userEntries;
    this.groupEntries = groupEntries;
}

/**
 * Defines an entry on an ACL (grantee -> Permission).  Use of this class is optional, you
 * can simply define with JSON, e.g.
 * [ {key=AclEntry.GROUPS.OTHER,value=AclEntry.ACL_PERMISSIONS.READ} ]
 * @class AclEntry
 */
function AclEntry( key, value ) {
    this.key = key;
    this.value = value;
}

/**
 * Predefined permissions you can grant
 * @static
 */
AclEntry.ACL_PERMISSIONS = { READ: "READ", WRITE: "WRITE", FULL_CONTROL: "FULL_CONTROL", NONE: "NONE" };
/**
 * Predefined groups
 * @static
 */
AclEntry.GROUPS = { OTHER: "other" };

/**
 * Constructs a new ListOptions object.  Used for listObjects and listDirectory methods.
 * Note that use of this class is optional; you can simply use a JSON object, e.g.
 * { limit: 0, includeMeta: true }
 * @param {int} limit maximum number of objects to return from server.  0=default (generally
 * the default limit is 5000).
 * @param {String} token server token for continuing results.  Check your results object for a
 * token and pass into this field on the subsequent request to continue your listing.
 * @param {boolean} includeMeta if true, object metadata will be returned with the results
 * @param {Array} userMetaTags if non-null, the list of user metadata tags to return in the metadata
 * (assumes includeMeta=true).  If null, all metadata tags will be returned.
 * @param {Array} systemMetaTags if non-null, the list of system metadata tags to return in the metadata
 * (assumes includeMeta=true).  If null, all system metadata tags will be returned.
 * @class ListOptions
 */
function ListOptions( limit, token, includeMeta, userMetaTags, systemMetaTags ) {
    this.limit = limit;
    this.token = token;
    this.includeMeta = includeMeta;
    this.userMetaTags = userMetaTags;
    this.systemMetaTags = systemMetaTags;
}

/**
 * @param {String} objectId the object's identifier
 * @param {Object} userMeta an object containing the user metadata properties
 * @param {Object} listableUserMeta an object containing the listable user metadata properties
 * @param {Object} systemMeta an object containing the system metadata properties
 * @class ObjectResult
 */
function ObjectResult( objectId, userMeta, listableUserMeta, systemMeta ) {
    this.id = objectId;
    this.objectId = objectId;
    this.userMeta = userMeta;
    this.listableUserMeta = listableUserMeta;
    this.systemMeta = systemMeta;
}

/**
 * @param path the full path of the object
 * @param name the name of the object (excluding path info)
 * @param type the type of object ("directory" or "regular")
 * @param objectId the object's identifier
 * @param {Object} userMeta an object containing the user metadata properties
 * @param {Object} listableUserMeta an object containing the listable user metadata properties
 * @param {Object} systemMeta an object containing the system metadata properties
 * @class DirectoryEntry
 */
function DirectoryEntry( path, name, type, objectId, userMeta, listableUserMeta, systemMeta ) {
    this.id = path;
    this.path = path;
    this.name = name;
    this.type = type;
    this.objectId = objectId;
    this.userMeta = userMeta;
    this.listableUserMeta = listableUserMeta;
    this.systemMeta = systemMeta;
}

/**
 * @class ObjectInfo
 * @param objectId the Object ID of the object
 * @param selection the replica selection for read access. Values can be geographic or random
 * @param {Array} replicas array of ObjectReplica objects
 * @param expirationEnabled whether expiration is enabled for the object
 * @param expirationEndsAt when this object's expiration period ends
 * @param retentionEnabled whether retention is enabled for the object
 * @param retentionEndsAt when this object's retention period expires
 */
function ObjectInfo( objectId, selection, replicas, expirationEnabled, expirationEndsAt, retentionEnabled, retentionEndsAt ) {
    this.objectId = objectId;
    this.selection = selection;
    this.replicas = replicas;
    this.expirationEnabled = expirationEnabled;
    this.expirationEndsAt = expirationEndsAt;
    this.retentionEnabled = retentionEnabled;
    this.retentionEndsAt = retentionEndsAt;
}

/**
 * @class ObjectReplica
 * @param id the replica ID
 * @param location the replica location    The replica’s storage type. Values can be stripe, normal, cloud, compression, ErasureCode, and dedup
 * @param replicaType the replica type. Values can be sync or async
 * @param current true if the replica is current, or false if the replica is not current
 * @param storageType the replica's storage type. Values can be stripe, normal, cloud, compression, ErasureCode, and dedup
 */
function ObjectReplica( id, location, replicaType, current, storageType ) {
    this.id = id;
    this.location = location;
    this.replicaType = replicaType;
    this.current = current;
    this.storageType = storageType;
}

/**
 * Provides access to the EMC Atmos REST API through JavaScript.
 * Constructs a new AtmosRest object.
 *
 * @param {Object} atmosConfig the Atmos configuration object. Possible settings:
 *
 * <ul>
 * <li>uid (required): the Atmos UID for the connection
 * <li>secret (required): the Atmos shared secret key for the connection
 * </ul>
 *
 * @class AtmosRest
 */
var AtmosRest = function( atmosConfig ) {
    this.atmosConfig = atmosConfig;

    this.info( "AtmosRest loaded" );
};

/**
 * Context the URI context for the REST service.  Defaults to "/rest"
 * @type {String}
 */
AtmosRest.prototype.context = "/rest";

////////////////////
// Public Methods //
////////////////////

/**
 * Returns the information about the Atmos REST web service (right now, just the version number)
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success). The version number is contained in
 *        result.value
 */
AtmosRest.prototype.getServiceInformation = function( state, callback ) {
    var me = this;
    this._ajax( {
        method: 'GET',
        uri: this.context + '/service',
        headers: {},
        state: state,
        callback: callback,
        success: function( xhr ) {
            var result = me._createResult( xhr, true, state );
            var doc = me._getXmlDoc( xhr );

            // looking for /Version/Atmos (<Version><Atmos>X.X.X</Atmos></Version>)
            var versionNodes = doc.getElementsByTagName( "Version" );
            if ( versionNodes.length )
                result.value = me._getText( me._getChildByTagName( versionNodes[0], "Atmos" ) );
            callback( result );
        }
    } );
};

/**
 * Creates an object in Atmos
 * @param {Acl} acl an Acl for the new object.  If null, the object will get the default Acl.
 * @param {Object} meta regular Metadata for the new object.  May be null for no regular metadata.
 * @param {Object} listableMeta listable Metadata for the new object.  May be null for no listable metadata.
 * @param {Object} data the data for the new object (can be a String, Blob or File).
 * @param {String} mimeType the mimeType for the new object.  If null, the object will be assigned application/octet-stream.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} successCallback the callback for when the function completes.  Should have the signature function(result)
 * where result will be an AtmosResult object.  The created Object ID will be in the value field of the result object.
 * @param {function} progressCallback the (optional) callback for progress updates (i.e. status bar)
 */
AtmosRest.prototype.createObject = function( acl, meta, listableMeta, data, mimeType, state, successCallback, progressCallback ) {
    var headers = new Object();
    var me = this;

    this._addAclHeaders( acl, headers );
    this._addMetadataHeaders( meta, headers, false );
    this._addMetadataHeaders( listableMeta, headers, true );

    this._ajax( {
        method: 'POST',
        uri: this.context + '/objects',
        headers: headers,
        data: data,
        mimeType: mimeType,
        state: state,
        callback: successCallback,
        success: function( xhr ) {
            me._createObjectHandler( xhr, state, successCallback );
        },
        progress: progressCallback
    } );
};

/**
 * Creates an object in Atmos on the path provided.
 *
 * @param {String} path the namespace path in Atmos (must start with a slash)
 * @param {Acl} acl an Acl for the new object.  If null, the object will get the default Acl.
 * @param {Object} meta regular Metadata for the new object.  May be null for no regular metadata.
 * @param {Object} listableMeta listable Metadata for the new object.  May be null for no listable metadata.
 * @param {Object} data the data for the new object (can be a String, Blob or File).
 * @param {String} mimeType the mimeType for the new object.  If null, the object will be assigned application/octet-stream.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} successCallback the callback for when the function completes.  Should have the signature function(result)
 * where result will be an AtmosResult object.  The created Object ID will be in the value field of the result object.
 * @param {function} progressCallback the (optional) callback for progress updates (i.e. status bar)
 */
AtmosRest.prototype.createObjectOnPath = function( path, acl, meta, listableMeta, data, mimeType, state, successCallback, progressCallback ) {
    if ( !AtmosRest.objectPathMatch.test( path ) ) {
        throw "The path '" + path + "' is not valid";
    }
    var headers = new Object();
    var me = this;

    this._addAclHeaders( acl, headers );
    this._addMetadataHeaders( meta, headers, false );
    this._addMetadataHeaders( listableMeta, headers, true );

    this._ajax( {
        method: 'POST',
        uri: this._getPath( path ),
        headers: headers,
        data: data,
        mimeType: mimeType,
        state: state,
        callback: successCallback,
        success: function( xhr ) {
            me._createObjectHandler( xhr, state, successCallback );
        },
        progress: progressCallback
    } );
};

/**
 * Reads the contents of an object from Atmos
 * @param {String} id the object identifier (either an object path or an object id)
 * @param {AtmosRange} range the range of the object to read, pass null to read the entire object.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's content will be returned in the data property of the result object.
 */
AtmosRest.prototype.readObject = function( id, range, state, callback ) {
    var me = this;
    this._ajax( {
        method: 'GET',
        uri: this._getPath( id ),
        headers: {},
        range: range,
        state: state,
        callback: callback,
        success: function( xhr ) {
            var result = me._createResult( xhr, true, state );
            result.data = xhr.responseText;
            callback( result );
        }
    } );
};

/**
 * Updates an object in Atmos with the given ID.
 *
 * @param {String} id the object ID or namespace path in Atmos.
 * @param {Acl} acl an Acl for the object.  May be null for no updates.
 * @param {Object} meta regular Metadata for the object.  May be null for no updates.
 * @param {Object} listableMeta listable Metadata for the object.  May be null for no updates.
 * @param {Object} data the replacement data for the object (can be a String, Blob or File).
 * @param {AtmosRange} range the range of the object to update, pass null to replace the entire object.
 * @param {String} mimeType the mimeType for the object.  If null, the object will be assigned application/octet-stream.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} successCallback the callback for when the function completes.  Should have the signature function(result)
 * where result will be an AtmosResult object. The result of this call will only contain status information.
 * @param {function} progressCallback the (optional) callback for progress updates (i.e. status bar)
 */
AtmosRest.prototype.updateObject = function( id, acl, meta, listableMeta, data, range, mimeType, state, successCallback, progressCallback ) {
    var headers = new Object();

    this._addAclHeaders( acl, headers );
    this._addMetadataHeaders( meta, headers, false );
    this._addMetadataHeaders( listableMeta, headers, true );

    this._ajax( {
        method: 'PUT',
        uri: this._getPath( id ),
        headers: headers,
        data: data,
        range: range,
        mimeType: mimeType,
        state: state,
        callback: successCallback,
        progress: progressCallback
    } );
};

/**
 * Deletes an object from Atmos.
 * @param {String} id an object identifier (either an object path or object id)
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).
 */
AtmosRest.prototype.deleteObject = function( id, state, callback ) {
    this._ajax( {
        method: 'DELETE',
        uri: this._getPath( id ),
        headers: {},
        state: state,
        callback: callback
    } );
};

/**
 * Lists the versions of an object.
 * @param {String} id the id of the object (either an object path or object id)
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success). On success, a list of object IDs will
 * be in result.value
 */
AtmosRest.prototype.listVersions = function( id, state, callback ) {
    var me = this;
    this._ajax( {
        method: 'GET',
        uri: this._getPath( id ) + '?versions',
        headers: {},
        state: state,
        callback: callback,
        success: function( xhr ) {
            var result = me._createResult( xhr, true, state );
            result.value = me._parseObjectVersions( xhr );
            callback( result );
        }
    } );
};

/**
 * Creates a new immutable version of an object.
 * @param {String} id the id of the object to version (either an object path or object id)
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success). On success, the ID of the newly created
 * version will be in result.value
 */
AtmosRest.prototype.versionObject = function( id, state, callback ) {
    var me = this;
    this._ajax( {
        method: 'POST',
        uri: this._getPath( id ) + "?versions",
        headers: {},
        state: state,
        callback: callback,
        success: function( xhr ) {
            me._createObjectHandler( xhr, state, callback );
        }
    } );
};

/**
 * Restores a version of an object to the base version (i.e. "promote" an
 * old version to the current version).
 * @param {String} id Base object ID (target of the restore)
 * @param {String} vId Version object ID to restore
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).
 */
AtmosRest.prototype.restoreVersion = function( id, vId, state, callback ) {
    var headers = new Object();

    // Version to promote
    headers["x-emc-version-oid"] = vId;

    this._ajax( {
        method: 'PUT',
        uri: this._getPath( id ) + '?versions',
        headers: headers,
        state: state,
        callback: callback
    } );
};

/**
 * Deletes a version of an object from the cloud.
 * @param {String} vId the object ID of the version of the object to delete.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).
 */
AtmosRest.prototype.deleteVersion = function( vId, state, callback ) {
    this._ajax( {
        method: 'DELETE',
        uri: this._getPath( vId ) + '?versions',
        headers: {},
        state: state,
        callback: callback
    } );
};

/**
 * Renames a file or directory within the namespace.
 * @param {String} oldPath The file or directory to rename
 * @param {String} newPath The new path for the file or directory
 * @param {Boolean} force If true, the desination file or
 * directory will be overwritten.  Directories must be empty to be
 * overwritten.  Also note that overwrite operations on files are
 * not synchronous; a delay may be required before the object is
 * available at its destination.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).
 */
AtmosRest.prototype.rename = function( oldPath, newPath, force, state, callback ) {
    if ( !AtmosRest.objectPathMatch.test( newPath ) ) {
        throw "The path '" + path + "' is not valid";
    }
    var headers = new Object();

    headers["x-emc-path"] = newPath.substr( 1 );
    if ( force ) headers["x-emc-force"] = "true";

    this._ajax( {
        method: 'POST',
        uri: this._getPath( oldPath ) + "?rename",
        headers: headers,
        state: state,
        callback: callback
    } );
};

/**
 * Creates a string to be used as the disposition string when creating a shareable URL with disposition (download link).
 * Example code:<pre>
 *     var futureDate = new Date(...); // date in future
 *     var disposition = atmosRest.createAttachmentDisposition(); // fileName optional for namespace API (required for object API)
 *     var url = atmosRest.getShareableUrl( "/my/object", futureDate, disposition ); // URL response will contain a Content-Disposition header
 * </pre>
 * NOTE: this feature is only supported on Atmos 2.0.1 + hotfix XXXX
 * @param fileName
 */
AtmosRest.prototype.createAttachmentDisposition = function( fileName ) {
    if ( fileName ) return "attachment; filename*=" + encodeURIComponent( "UTF-8''" + fileName );
    else return "attachment";
};

/**
 * Creates a shareable URL that anyone (globally) can access.
 *
 * @param {String} id the object ID or path for which to generate the URL
 * @param {Date} expirationDate the expiration date of the URL (as
 * @param {String} disposition the content-disposition that should be specified in the response header for the shareable
 *        URL. NOTE: this feature is only supported on Atmos 2.0.1 + hotfix XXXX
 * @return a URL that can be used to share the object's content
 */
AtmosRest.prototype.getShareableUrl = function( id, expirationDate, disposition ) {
    if ( !expirationDate.getTime ) throw "expirationDate must be a Date object";

    var method = "GET";
    var path = this._getPath( id );
    var expires = Math.floor( expirationDate.getTime() / 1000 ); // convert to seconds

    // establish hash string for signing
    var hashString = method + "\n" + path.toLowerCase() + "\n" + this.atmosConfig.uid + "\n" + expires;
    if ( disposition ) hashString += "\n" + disposition;
    this.info( "hash string:\n" + hashString );

    // sign hash string
    var signature = this._doSignature( hashString, this.atmosConfig.secret );

    // generate query string
    var query = "uid=" + encodeURIComponent( this.atmosConfig.uid );
    query += "&expires=" + expires;
    query += "&signature=" + encodeURIComponent( signature );
    if ( disposition ) query += "&disposition=" + encodeURIComponent( disposition );

    var protocol, host;
    if ( typeof(window) != 'undefined' ) {
        protocol = window.location.protocol;
        host = window.location.host;
    } else {
        protocol = this.atmosConfig.protocol;
        host = this.atmosConfig.host;
    }

    // compose URL
    var url = protocol + "//" + host + this._encodeURI( path ) + "?" + query;
    this.info( "Shareable URL: " + url );

    return url;
};

/**
 * Returns an object's ACL
 * @param {String} id the object identifier (either an object path or an object id)
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's ACL will be returned in the value property of the result object.
 */
AtmosRest.prototype.getAcl = function( id, state, callback ) {
    var me = this;
    this._ajax( {
        method: 'GET',
        uri: this._getPath( id ) + '?acl',
        headers: {},
        state: state,
        callback: callback,
        success: function( xhr ) {
            var result = me._createResult( xhr, true, state );
            var userAcls = me._parseAclEntries( xhr.getResponseHeader( "x-emc-useracl" ) );
            var groupAcls = me._parseAclEntries( xhr.getResponseHeader( "x-emc-groupacl" ) );
            result.value = new Acl( userAcls, groupAcls );
            callback( result );
        }
    } );
};

/**
 * Sets (overwrites) the ACL on the object.
 * @param {String} id the object identifier (either an object path or an object id)
 * @param {Acl} acl the new ACL for the object.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).
 */
AtmosRest.prototype.setAcl = function( id, acl, state, callback ) {
    var headers = new Object();

    this._addAclHeaders( acl, headers );

    this._ajax( {
        method: 'POST',
        uri: this._getPath( id ) + "?acl",
        headers: headers,
        state: state,
        callback: callback
    } );
};

/**
 * Returns the list of user metadata tags assigned to the object.
 * @param {String} id the object identifier (either an Object ID or an Object Path)
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's non-listable tags will be in result.value.tags and the
 * listable tags will be in result.value.listableTags
 */
AtmosRest.prototype.listUserMetadataTags = function( id, state, callback ) {
    var me = this;
    this._ajax( {
        method: 'GET',
        uri: this._getPath( id ) + '?metadata/tags',
        headers: {},
        state: state,
        callback: callback,
        success: function( xhr ) {
            var result = me._createResult( xhr, true, state );
            result.value = {};
            var tagHeader = xhr.getResponseHeader( "x-emc-tags" );
            if ( tagHeader ) result.value.tags = me._headerValueToArray( tagHeader );
            var lTagHeader = xhr.getResponseHeader( "x-emc-listable-tags" );
            if ( lTagHeader ) result.value.listableTags = me._headerValueToArray( lTagHeader );
            callback( result );
        }
    } );
};

/**
 * Reads the user metadata for an object.
 * @param {String} id the object identifier (either an Object ID or an Object Path)
 * @param {Array} filter if not null, an array of strings defining which metadata tags should be returned.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's metadata will be returned in result.value.meta and the
 * listable metadata will be returned in result.value.listableMeta.
 */
AtmosRest.prototype.getUserMetadata = function( id, filter, state, callback ) {
    var headers = new Object();
    var me = this;

    if ( filter ) headers["x-emc-tags"] = filter.join( "," );

    this._ajax( {
        method: 'GET',
        uri: this._getPath( id ) + '?metadata/user',
        headers: headers,
        state: state,
        callback: callback,
        success: function( xhr ) {
            var result = me._createResult( xhr, true, state );
            result.value = {};
            result.value.meta = me._parseMetadata( xhr.getResponseHeader( "x-emc-meta" ) );
            result.value.listableMeta = me._parseMetadata( xhr.getResponseHeader( "x-emc-listable-meta" ) );
            callback( result );
        }
    } );
};

/**
 * Reads the system metadata for an object.
 * @param {String} id the object identifier (either an Object ID or an Object Path)
 * @param {Array} filter if not null, an array of strings defining which metadata tags should be returned.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's system metadata will be returned in result.value.systemMeta (the mime type will be in
 * result.value.systemMeta.mimeType)
 */
AtmosRest.prototype.getSystemMetadata = function( id, filter, state, callback ) {
    var headers = new Object();
    var me = this;

    if ( filter ) headers["x-emc-tags"] = filter.join( "," );

    this._ajax( {
        method: 'GET',
        uri: this._getPath( id ) + '?metadata/system',
        headers: headers,
        state: state,
        callback: callback,
        success: function( xhr ) {
            var result = me._createResult( xhr, true, state );
            result.value = {};
            result.value.systemMeta = me._parseMetadata( xhr.getResponseHeader( "x-emc-meta" ) );
            result.value.systemMeta.mimeType = xhr.getResponseHeader( "Content-Type" );
            callback( result );
        }
    } );
};

/**
 * Returns all of an object's user metadata and its ACL in one call.
 * @param {String} id the object identifier (either an Object ID or an Object Path)
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's user metadata will be returned in result.value.meta, listable metadata will be in
 * result.value.listableMeta and its ACL will be in result.value.acl
 * NOTE: System metadata is included with user metadata here even though they exist in different namespaces. If you need
 *       to differentiate between the two, use getSystemMetadata and getUserMetadata
 */
AtmosRest.prototype.getAllMetadata = function( id, state, callback ) {
    var me = this;
    this._ajax( {
        method: 'HEAD',
        uri: this._getPath( id ),
        headers: {},
        state: state,
        callback: callback,
        success: function( xhr ) {
            var result = me._createResult( xhr, true, state );
            result.value = {};
            result.value.meta = me._parseMetadata( xhr.getResponseHeader( "x-emc-meta" ) );
            result.value.listableMeta = me._parseMetadata( xhr.getResponseHeader( "x-emc-listable-meta" ) );
            var userAcls = me._parseAclEntries( xhr.getResponseHeader( "x-emc-useracl" ) );
            var groupAcls = me._parseAclEntries( xhr.getResponseHeader( "x-emc-groupacl" ) );
            result.value.acl = new Acl( userAcls, groupAcls );
            callback( result );
        }
    } );
};

/**
 * Get information about an object's state including
 * replicas, expiration, and retention.
 * @param {String} id the object identifier (either an Object ID or an Object Path)
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's info will be returned in result.value (as an ObjectInfo object).
 */
AtmosRest.prototype.getObjectInfo = function( id, state, callback ) {
    var me = this;
    this._ajax( {
        method: 'GET',
        uri: this._getPath( id ) + '?info',
        headers: {},
        state: state,
        callback: callback,
        success: function( xhr ) {
            me._handleObjectInfoResponse( xhr, state, callback );
        }
    } );
};

/**
 * Sets the user metadata for an object.
 * @param {String} id the object identifier (either an Object ID or an Object Path)
 * @param {Object} meta a map of regular Metadata for the object.  May be null or empty for no regular metadata.
 * @param {Object} listableMeta a map of listable Metadata for the object.  May be null or empty for no listable metadata.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).
 */
AtmosRest.prototype.setUserMetadata = function( id, meta, listableMeta, state, callback ) {
    var headers = new Object();

    this._addMetadataHeaders( meta, headers, false );
    this._addMetadataHeaders( listableMeta, headers, true );

    this._ajax( {
        method: 'POST',
        uri: this._getPath( id ) + "?metadata/user",
        headers: headers,
        state: state,
        callback: callback
    } );
};

/**
 * Deletes metadata tags from an object.
 * @param {String} id the object identifier (either an Object ID or an Object Path)
 * @param {Array} tags a list of tags (metadata names) to delete from the object
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success).
 */
AtmosRest.prototype.deleteUserMetadata = function( id, tags, state, callback ) {
    var headers = new Object();

    this._addTagHeader( tags, headers );

    this._ajax( {
        method: 'DELETE',
        uri: this._getPath( id ) + '?metadata/user',
        headers: headers,
        state: state,
        callback: callback
    } );
};

/**
 * Returns a list of the tags that are listable the current user's tennant.
 * @param {String} tag optional.  If specified, the list will be limited to the tags
 * under the specified tag.  If null, only top level tags will be returned.
 * @param {Object} state the user-defined state object passed to the callback as result.state
 * @param {function} callback the completion callback (both error and success). The list of tags returned will be in
 * result.value
 */
AtmosRest.prototype.getListableTags = function( tag, state, callback ) {
    var headers = new Object();
    var me = this;

    if ( tag ) headers["x-emc-tags"] = tag;

    this._ajax( {
        method: 'GET',
        uri: this.context + "/objects?listabletags",
        headers: headers,
        state: state,
        callback: callback,
        success: function( xhr ) {
            var result = me._createResult( xhr, true, state );
            var tagHeader = xhr.getResponseHeader( "x-emc-listable-tags" );
            if ( tagHeader ) result.value = me._headerValueToArray( tagHeader );
            callback( result );
        }
    } );
};

/**
 * Lists objects from the server using a listable tag.
 * @param {String} tag the listable tag to search
 * @param {ListOptions} options for listing objects.  See the ListOptions class.
 * @param {Object} state the user-defined state object that will be passed to the callback
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the result's value property will be populated with an Array of ObjectResult objects.  Also
 * be sure to check the token property.  If defined, you did not receive all results
 * and should call this method again using the token inside a ListOptions object to continue
 * your listing.
 */
AtmosRest.prototype.listObjects = function( tag, options, state, callback ) {
    if ( !tag ) throw "Tag cannot be null";
    var headers = new Object();
    var me = this;

    headers["x-emc-tags"] = tag;

    this._addListOptionHeaders( headers, options );

    this._ajax( {
        method: 'GET',
        uri: this.context + "/objects",
        headers: headers,
        state: state,
        callback: callback,
        success: function( xhr ) {
            me._handleListObjectsResponse( xhr, state, callback );
        }
    } );
};

/**
 * Lists objects from the server within a directory (path).
 * @param {String} directory the directory (path) in which to list objects (must exist!)
 * @param {ListOptions} options for listing objects.  See the ListOptions class. NOTE: metadata can only be returned in
 * Atmos >1.3
 * @param {Object} state the user-defined state object that will be passed to the callback
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the result's value property will be populated with an Array of ObjectResult objects.  Also
 * be sure to check the token property.  If defined, you did not receive all results
 * and should call this method again using the token inside a ListOptions object to continue
 * your listing.
 */
AtmosRest.prototype.listDirectory = function( directory, options, state, callback ) {
    if ( !directory ) throw "Directory cannot be null";
    if ( directory.charAt( directory.length - 1 ) !== "/" ) {
        throw "Directory must end with a slash";
    }
    var headers = new Object();
    var me = this;

    this._addListOptionHeaders( headers, options );

    this._ajax( {
        method: 'GET',
        uri: this.context + "/namespace" + directory,
        headers: headers,
        state: state,
        callback: callback,
        success: function( xhr ) {
            me._handleListDirectoryResponse( directory, xhr, state, callback );
        }
    } );
};

/////////////////////
// Private Methods //
/////////////////////

AtmosRest.locationMatch = /^\/rest\/objects\/(.*)/;
AtmosRest.objectPathMatch = /^\//;

/**
 * Determines whether id is a path or objectid and constructs the proper
 * resource path.
 */
AtmosRest.prototype._getPath = function( id ) {
    if ( AtmosRest.objectPathMatch.test( id ) ) {
        return this.context + "/namespace" + id;
    } else {
        return this.context + "/objects/" + id;
    }
};

/**
 * Adds Acl entries to the headers of a request
 * @param {Acl} acl
 */
AtmosRest.prototype._addAclHeaders = function( acl, headers ) {
    if ( acl == null ) return;

    headers["x-emc-useracl"] = this._mapEntriesToString( acl.userEntries );
    headers["x-emc-groupacl"] = this._mapEntriesToString( acl.groupEntries );
};

/**
 * Serialize a list of map entries into a parameter string (entry1.key=entry1.value,entry2.key=entry2.value)
 */
AtmosRest.prototype._mapEntriesToString = function( entries ) {
    if ( entries == undefined || entries.length < 1 ) return null;

    var params = [];
    for ( var i = 0; i < entries.length; i++ ) {
        params.push( entries[i].key + "=" + entries[i].value );
    }
    return params.join( "," );
};

/**
 * Compiles a list of tags into a header value (comma-separated0
 */
AtmosRest.prototype._addTagHeader = function( tags, headers ) {
    var value = "";
    for ( var i = 0; i < tags.length; i++ ) {
        if ( i > 0 ) value += ",";
        value += tags[i];
    }
    headers["x-emc-tags"] = value;
};

/**
 * Compiles a list of metadata into a header value
 */
AtmosRest.prototype._addMetadataHeaders = function( meta, headers, listable ) {
    if ( meta == null || Object.keys( meta ).length == 0 ) {
        return;
    }
    if ( listable ) {
        headers["x-emc-listable-meta"] = this._mapToString( meta );
    } else {
        headers["x-emc-meta"] = this._mapToString( meta );
    }
};

/**
 * Serialize a map into a paremeter string (map.key1=map.value1,map.key2=map.value2)
 */
AtmosRest.prototype._mapToString = function( map ) {
    var params = [], keys = Object.keys( map );
    for ( var i = 0; i < keys.length; i++ ) {
        params.push( keys[i] + "=" + map[keys[i]] );
    }
    return params.join( "," );
};

/**
 * Converts a comma-separated list of values into an array of those values.
 */
AtmosRest.prototype._headerValueToArray = function( value ) {
    if ( !value ) return null;
    if ( value.trim().length == 0 ) return [];
    var array = value.split( "," );
    for ( var i = 0; i < array.length; i++ ) {
        array[i] = array[i].trim();
    }
    return array;
};

/**
 * Adds headers for the list options
 * @param headers {Array} the existing headers map
 * @param options {ListOptions} the desired list options
 */
AtmosRest.prototype._addListOptionHeaders = function( headers, options ) {
    if ( options ) {
        if ( options.limit ) {
            headers["x-emc-limit"] = "" + options.limit;
        }
        if ( options.token ) {
            headers["x-emc-token"] = options.token;
        }
        if ( options.includeMeta ) {
            headers["x-emc-include-meta"] = "1";
            if ( options.userMetaTags ) {
                headers["x-emc-user-tags"] = options.userMetaTags.join( "," );
            }
            if ( options.systemMetaTags ) {
                headers["x-emc-system-tags"] = options.systemMetaTags.join( "," );
            }
        }
    }
};

AtmosRest.prototype._prepBaseHeaders = function( headers, range ) {
    headers["x-emc-date"] = new Date().toGMTString();
    if ( range ) headers["Range"] = range.toString();
};

AtmosRest.prototype._prepUploadHeaders = function( headers, mimeType ) {
    if ( mimeType == "" || mimeType == undefined ) {
        mimeType = "text/plain; charset=UTF-8";
    }

    // The browser will append this on the way out.  Do it ourselves
    // so it gets into our signature.
    if ( mimeType.indexOf( "charset" ) == -1 ) {
        mimeType += "; charset=UTF-8";
    }

    headers["Content-Type"] = mimeType;
};

/**
 * Abstracts an ajax call
 * @param {Object} options the options for the call
 * options are:
 * method: HTTP method to use
 * uri: uri to call
 * headers: map/object of header name/value pairs
 * data: (optional) data to send
 * range: (optional) range of data to set in the target object
 * mimeType: (optional) mime type to use for data sent
 * state: (optional) state parameter to pass on to the callback under result.state
 * callback: async callback (completion) method
 * success: (optional) success method - if present, should create a result object and call the callback method
 * progress: (optional) callback for updating progress of an upload (applies only to PUT and POST requests)
 * formId: (optional) the element ID of a form to use instead of XHR for a POST or PUT request
 * iframeId: (required if using a form) the element ID of the iframe to use as the target of the form specified above
 */
AtmosRest.prototype._ajax = function( options ) {
    options.uri = this._resolveDots( options.uri );

    if ( options.headers ) {
        this._prepBaseHeaders( options.headers, options.range );
        if ( /(POST|PUT)/.test( options.method ) ) this._prepUploadHeaders( options.headers, options.mimeType );

        this._signRequest( options.method, options.headers, options.uri );
    }

    if ( !/^https?:\/\//.test( options.uri ) ) {

        // encode *after* signing
        options.uri = this._encodeURI( options.uri );

        // If a cross-domain request...
        if ( this.atmosConfig.host && this.atmosConfig.protocol ) {
            options.uri = this.atmosConfig.protocol + "//" + this.atmosConfig.host + options.uri;
        }
    }

    // success/error handling
    var me = this;
    if ( options.formId ) { // using form

        var form = document.getElementById( options.formId ), iframe = document.getElementById( options.iframeId );
        iframe.onreadystatechange = function() {
            if ( iframe.readyState == 'complete' ) {

                // workaround to get document contents
                var temp = document.createElement( "div" );
                temp.appendChild( iframe.contentWindow.document.documentElement );
                var responseText = temp.innerHTML;
                if ( responseText.indexOf( "<Error>" == 0 ) ) { // error
                    if ( options.error ) options.error( {responseText: responseText} );
                    else options.callback( me._createResult( {responseText: responseText}, false, options.state ) );
                } else {
                    if ( options.success ) options.success( {responseText: responseText} );
                    else options.callback( me._createResult( {responseText: responseText}, true, options.state ) );
                }
            }
        };

        // headers get passed as form parameters
        var keys = Object.keys( options.headers );
        for ( var i = 0; i < keys.length; i++ ) {
            var element = form.elements[keys[i]];
            if ( !element ) {
                element = document.createElement( 'input' );
                element.setAttribute( 'type', 'hidden' );
                element.setAttribute( 'name', keys[i] );
                form.insertBefore( element, form.childNodes[0] );
            }
            element.setAttribute( 'value', options.headers[keys[i]] );
        }

        form.setAttribute( 'target', options.iframeId );
        form.submit();

    } else { // using XHR

        var xhr = this._getXMLHttpRequest()
        xhr.onreadystatechange = function() {
            if ( xhr.readyState == 4 ) {
                if ( xhr.status < 400 ) {
                    if ( options.success ) options.success( xhr );
                    else options.callback( me._createResult( xhr, true, options.state ) );
                } else { // error
                    if ( options.error ) options.error( xhr );
                    else options.callback( me._createResult( xhr, false, options.state ) );
                }
            }
        };

        // progress callback
        try {
            if ( options.progress ) {
                (xhr.upload || xhr).onprogress = function( event ) {
                    if ( event.lengthComputable ) {
                        var progressPercent = Math.floor( (event.position || event.loaded) / (event.totalSize || event.total) * 100 );
                        options.progress( progressPercent );
                    }
                };
            }
        } catch( e ) {
            // progress isn't supported
        }

        xhr.open( options.method, options.uri, true );

        this._setHeaders( xhr, options.headers );

        if ( options.data ) xhr.send( options.data );
        else xhr.send();

    }
};

AtmosRest.prototype._getXMLHttpRequest = function() {
    if ( isNodejs ) {
        return new XMLHttpRequest();
    }

    if ( window.XMLHttpRequest ) {
        return new window.XMLHttpRequest;
    }
    else {
        try {
            return new ActiveXObject( "MSXML2.XMLHTTP.3.0" );
        }
        catch( ex ) {
            return null;
        }
    }
};

/**
 * Resolves dot references in a path (parent/child/../ => parent/)
 * @param path the path to resolve
 */
AtmosRest.prototype._resolveDots = function( path ) {
    if ( !path ) return path;
    var segments = path.split( "/" );
    for ( var i = 0; i < segments.length; i++ ) {
        if ( segments[i] == ".." ) {
            segments.splice( i - 1, 2 ); // remove this segment and the last
            i -= 2; // two items were removed, so make sure the index rewinds by two
        } else if ( segments[i] == "." ) {
            segments.splice( i--, 1 ); // remove only this segment and rewind the index by one
        }
    }
    return segments.join( "/" );
};

/**
 * Sets the headers on the XMLHttpRequest
 * @param {XMLHttpRequest} xhr the XMLHttpRequest
 * @param {Object} headers the property hash containing the header values to set
 */
AtmosRest.prototype._setHeaders = function( xhr, headers ) {
    if ( !headers ) return;
    for ( var prop in headers ) {
        if ( !headers.hasOwnProperty( prop ) ) continue;
        xhr.setRequestHeader( prop, headers[prop] );
    }
};

/**
 * Encodes the individual path components of a URI.
 * @param uri
 * @returns {String} the URI with the path components encoded.
 */
AtmosRest.prototype._encodeURI = function( uri ) {
    this.debug( "encodeURI: in: " + uri );
    var queryIndex = uri.indexOf( "?" );
    var query = "";
    if ( queryIndex != -1 ) {
        query = uri.substring( queryIndex );
        uri = uri.substring( 0, queryIndex );
    }
    var parts = uri.split( "/" );
    var outURI = "";
    for ( var i = 0; i < parts.length; i++ ) {
        parts[i] = encodeURIComponent( parts[i] );
    }
    outURI = parts.join( "/" );

    if ( queryIndex != -1 ) {
        outURI += encodeURI( query );
    }

    this.debug( "encodeURI: out: " + outURI );

    return outURI;
};

AtmosRest.prototype._createResult = function( xhr, success, state ) {
    var result = new AtmosResult( success, state );

    result.httpCode = xhr.status;
    result.httpMessage = xhr.statusText;

    if ( !success ) {
        var doc = this._getXmlDoc( xhr );
        var errorNodes = doc.getElementsByTagName( "Error" );
        if ( errorNodes.length ) {
            result.errorCode = this._getText( this._getChildByTagName( errorNodes[0], "Code" ) );
            result.errorMessage = this._getText( this._getChildByTagName( errorNodes[0], "Message" ) );
        }
    }

    return result;
};

AtmosRest.prototype._getXmlDoc = function( xhr ) {
    if ( xhr.responseXML ) {
        return xhr.responseXML;
    } else {
        // use the jsdom parser.
        this.debug( "response:\n" + xhr.responseText );
        return this._createXmlDoc( xhr.responseText );
    }
};

AtmosRest.prototype._createXmlDoc = function( xmlString ) {
    if ( isNodejs ) {
        return jsdom.jsdom( xmlString );
    } else if ( window.DOMParser ) {
        var parser = new DOMParser();
        return parser.parseFromString( xmlString, "text/xml" );
    } else if ( typeof ActiveXObject != 'undefined' ) {
        var doc = new ActiveXObject( "MSXML.DomDocument" );
        doc.loadXML( xmlString );
        return doc;
    }
};

/**
 * Processes the create object response and extracts the new object ID
 * @param {XMLHttpRequest} xhr the XHR object containing the response
 * @param {Object} state the user's state object
 * @param {function} callback the user's callback function
 */
AtmosRest.prototype._createObjectHandler = function( xhr, state, callback ) {
    // Extract the new ObjectId and return
    var location = xhr.getResponseHeader( 'location' );

    this.debug( "location: " + location );

    var matches = location.match( AtmosRest.locationMatch );
    if ( matches == null ) {
        var err = this._createResult( xhr, false, state );
        err.message = "Could not find location in " + location;
        callback( err );

    } else {
        var result = this._createResult( xhr, true, state );
        result.value = matches[1];
        this.debug( "Location: " + result.value );
        callback( result );
    }
};

/**
 * Parses a metadata value string into a property object
 * @param {String} value the metadata value string
 * @returns {Object} a property object containing the values
 */
AtmosRest.prototype._parseMetadata = function( value ) {
    if ( typeof(value) == 'undefined' || value == null || value.length == 0 ) {
        return null;
    }

    var result = {};

    var values = value.split( "," );
    for ( var i = 0; i < values.length; i++ ) {
        var nvpair = values[i].split( "=", 2 );
        var name = nvpair[0].trim();
        if ( nvpair.length == 1 ) {
            result[name] = "";
        } else {
            result[name] = nvpair[1];
        }
    }

    return result;
};

/**
 * Handles the response from the ListObjects method
 * @param {XMLHttpRequest} xhr the XHR object
 *
 */
AtmosRest.prototype._handleListObjectsResponse = function( xhr, state, callback ) {
    var result = this._createResult( xhr, true, state );
    result.token = xhr.getResponseHeader( "x-emc-token" );

    var doc = this._getXmlDoc( xhr );

    var objects = new Array();

    /**
     * @type NodeList
     */
    var objlist = doc.getElementsByTagName( "Object" );

    for ( var i = 0; i < objlist.length; i++ ) {
        var userMeta = null;
        var systemMeta = null;
        var userListableMeta = null;

        var node = objlist.item( i );
        var oidNode = this._getChildByTagName( node, "ObjectID" );
        var smNode = this._getChildByTagName( node, "SystemMetadataList" );
        var umNode = this._getChildByTagName( node, "UserMetadataList" );

        if ( smNode ) {
            systemMeta = new Object();
            this._parseResponseMeta( smNode.childNodes, systemMeta, null );
        }
        if ( umNode ) {
            userMeta = new Object();
            userListableMeta = new Object();
            this._parseResponseMeta( umNode.childNodes, userMeta, userListableMeta );
        }

        var obj = new ObjectResult( this._getText( oidNode ), userMeta, userListableMeta, systemMeta );
        objects.push( obj );
    }

    result.value = objects;
    callback( result );
};

/**
 * Handles the response from the ListDirectory method
 * @param {XMLHttpRequest} xhr the XHR object
 *
 */
AtmosRest.prototype._handleListDirectoryResponse = function( directoryPath, xhr, state, callback ) {
    var result = this._createResult( xhr, true, state );
    result.token = xhr.getResponseHeader( "x-emc-token" );

    var doc = this._getXmlDoc( xhr );

    var entries = new Array();

    /**
     * @type NodeList
     */
    var dirlist = doc.getElementsByTagName( "DirectoryEntry" );

    for ( var i = 0; i < dirlist.length; i++ ) {
        var userMeta = null;
        var systemMeta = null;
        var userListableMeta = null;

        var node = dirlist.item( i );
        var oidNode = this._getChildByTagName( node, "ObjectID" );
        var pathName = this._getChildByTagName( node, "Filename" );
        var type = this._getChildByTagName( node, "FileType" );
        var smNode = this._getChildByTagName( node, "SystemMetadataList" );
        var umNode = this._getChildByTagName( node, "UserMetadataList" );

        if ( smNode ) {
            systemMeta = new Object();
            this._parseResponseMeta( smNode.childNodes, systemMeta, null );
        }
        if ( umNode ) {
            userMeta = new Object();
            userListableMeta = new Object();
            this._parseResponseMeta( umNode.childNodes, userMeta, userListableMeta );
        }

        var entry = new DirectoryEntry( directoryPath + this._getText( pathName ), this._getText( pathName ), this._getText( type ), this._getText( oidNode ), userMeta, userListableMeta, systemMeta );
        entries.push( entry );
    }

    result.value = entries;
    callback( result );
};

/**
 * Handles the response from the GetObjectInfo method
 */
AtmosRest.prototype._handleObjectInfoResponse = function( xhr, state, callback ) {
    var result = this._createResult( xhr, true, state );

    var doc = this._getXmlDoc( xhr );
    var objectId = null, selection = null, replicas = [];
    var expirationEnabled = false, expirationEndsAt = null, retentionEnabled = false, retentionEndsAt = null;

    var nodes = doc.getElementsByTagName( "objectId" );
    if ( nodes.length ) objectId = this._getText( nodes.item( 0 ) );

    nodes = doc.getElementsByTagName( "selection" );
    if ( nodes.length ) selection = this._getText( nodes.item( 0 ) );

    nodes = doc.getElementsByTagName( "replicas" );
    if ( nodes.length ) {
        nodes = this._getChildrenByTagName( nodes.item( 0 ), 'replica' );
        for ( var i = 0; i < nodes.length; i++ ) {
            var node = nodes[i];
            var id = this._getText( this._getChildByTagName( node, 'id' ) );
            var location = this._getText( this._getChildByTagName( node, 'location' ) );
            var replicaType = this._getText( this._getChildByTagName( node, 'type' ) );
            var current = this._getText( this._getChildByTagName( node, 'current' ) );
            var storageType = this._getText( this._getChildByTagName( node, 'storageType' ) );
            replicas.push( new ObjectReplica( id, location, replicaType, current, storageType ) );
        }
    }

    nodes = doc.getElementsByTagName( "expiration" );
    if ( nodes.length ) {
        node = nodes.item( 0 );
        expirationEnabled = this._getText( this._getChildByTagName( node, 'enabled' ) );
        expirationEndsAt = this._getText( this._getChildByTagName( node, 'endAt' ) );
    }

    nodes = doc.getElementsByTagName( "retention" );
    if ( nodes.length ) {
        node = nodes.item( 0 );
        retentionEnabled = this._getText( this._getChildByTagName( node, 'enabled' ) );
        retentionEndsAt = this._getText( this._getChildByTagName( node, 'endAt' ) );
    }

    result.value = new ObjectInfo( objectId, selection, replicas, expirationEnabled, expirationEndsAt, retentionEnabled, retentionEndsAt );
    callback( result );
};

/**
 * Parses the object versions list from a listVersions request
 * @param xhr {XMLHttpRequest} xhr the XHR object
 */
AtmosRest.prototype._parseObjectVersions = function( xhr ) {
    var objectIds = new Array();

    var doc = this._getXmlDoc( xhr );

    var versions = doc.getElementsByTagName( "Ver" );
    for ( var i = 0; i < versions.length; i++ ) {
        objectIds.push( this._getText( this._getChildByTagName( versions.item( i ), "OID" ) ) );
    }

    return objectIds;
};

/**
 * Parses ACL entries from a response header list from a get ACL request
 * @param {String} header the response header from a get ACL request
 */
AtmosRest.prototype._parseAclEntries = function( header ) {
    var aclEntries = new Array();
    var grants = this._headerValueToArray( header );
    for ( var i = 0; i < grants.length; i++ ) {
        var nvpair = grants[i].split( "=", 2 );
        var grantee = nvpair[0];
        var permission = nvpair[1];

        grantee = grantee.trim();

        // Currently, the server returns "FULL" instead of "FULL_CONTROL".
        // For consistency, change this to value use in the request
        if ( "FULL" === permission ) {
            permission = AclEntry.ACL_PERMISSIONS.FULL_CONTROL;
        }

        aclEntries[i] = new AclEntry( grantee, permission );
    }
    return aclEntries;
};

/**
 * Parses object metadata for an object listing result
 * @param {NodeList} nodeList the node list containing Metadata
 * @param {Object} regMeta property object to populate with regular metadata
 * @param {Object} listableMeta property object to populate with listable metadata
 */
AtmosRest.prototype._parseResponseMeta = function( nodeList, regMeta, listableMeta ) {
    for ( var i = 0; i < nodeList.length; i++ ) {
        var child = nodeList.item( i );
        if ( !/Metadata/i.test( child.nodeName ) ) {
            continue;
        }
        var metaName = this._getText( this._getChildByTagName( child, "Name" ) );
        var metaValue = this._getText( this._getChildByTagName( child, "Value" ) );
        var listableNode = this._getChildByTagName( child, "Listable" );
        if ( listableNode ) {
            if ( this._getText( listableNode ) == "true" ) {
                listableMeta[metaName] = metaValue;
                continue;
            }
        }
        regMeta[metaName] = metaValue;
    }
};

/**
 * Searches a node for a first-level child with the given tag name.  If
 * not found, null will be returned.
 * @param {Node} node the node to search
 * @param {String} tagName the tag name to look for
 * @return {Node} the found node or null if not found.
 */
AtmosRest.prototype._getChildByTagName = function( node, tagName ) {
    var children = this._getChildrenByTagName( node, tagName );
    if ( children.length ) return children[0];
    return null;
};

/**
 * Searches a node for all first-level children with the given tag name.  If
 * not found, an empty array will be returned.
 * @param {Node} node the node to search
 * @param {String} tagName the tag name to look for
 * @return {Array} the found child nodes or an empty array if not found.
 */
AtmosRest.prototype._getChildrenByTagName = function( node, tagName ) {
    var reg = new RegExp( tagName, "i" ); // jsnode uses HTML uppercase names, so do insensitive
    var children = node.childNodes;
    var nodes = [];
    for ( var i = 0; i < children.length; i++ ) {
        var child = children.item( i );
        if ( child.nodeType != 1 ) {
            continue; // not an element
        }
        if ( reg.test( child.nodeName ) ) {
            nodes.push( child );
        }
    }
    return nodes;
};

/**
 * Gets the text from a node
 * @param {Node} node the node to collect text from
 * @return {String} the node's child text
 */
AtmosRest.prototype._getText = function( node ) {
    var children = node.childNodes;
    var text = "";
    for ( var i = 0; i < children.length; i++ ) {
        var child = children.item( i );
        if ( child.nodeType == 3 ) { // Text node
            text += child.data;
        }
    }

    return text;
};

/**
 * Signs the REST request
 * @param {String} method the HTTP method (GET, PUT, DELETE, POST, HEAD)
 * @param {Object} headers the object containing the HTTP headers as properties
 *        !!IMPORTANT!! this method assumes Content-Type and Range are already set!
 * @param {String} uri the path to the request
 */
AtmosRest.prototype._signRequest = function( method, headers, uri ) {
    this.debug( this.atmosConfig.uid );
    this.debug( this.atmosConfig.secret );

    var mimeType = headers["Content-Type"];
    var range = headers["Range"];

    var emcheaders;
    if ( headers == "" ) {
        emcheaders = new Hash();
    } else {
        emcheaders = headers;
    }

    emcheaders["x-emc-uid"] = this.atmosConfig.uid;

    var hash_string = this._buildHashString( method, mimeType, range, headers["Date"], uri, emcheaders );
    this.debug( "HashString:\n" + hash_string );

    var signature = this._doSignature( hash_string, this.atmosConfig.secret );
    this.debug( "Signature: " + signature );

    emcheaders["x-emc-signature"] = signature;

    return signature;
};

/**
 * Generates the string to sign
 * @param {String} method the HTTP method
 * @param {String} content_type the MIME type of the request body
 * @param {AtmosRange} range the HTTP range of the request, if needed
 * @param {String} date the HTTP Date header
 * @param {String} path the request uri
 * @param {Object} headers the object containing the HTTP headers as properties
 * @returns {String} the string to sign
 */
AtmosRest.prototype._buildHashString = function( method, content_type, range, date, path, headers ) {

    var emcheaders = new Object();
    var string = "";
    string = method + "\n";

    if ( content_type ) {
        string += content_type + "\n";
    } else {
        string += "\n";
    }
    if ( range ) {
        string += range.toString() + "\n";
    } else {
        string += "\n";
    }
    if ( date ) {
        string += date + '\n';
    } else {
        string += "\n";
    }

    string += path.toLowerCase().trim() + "\n";

    for ( var prop in headers ) {
        if ( !headers.hasOwnProperty( prop ) ) continue;
        this.debug( "headers: prop: " + prop + " value: " + headers[prop] );


        var key = this._normalizeWS( prop.toLowerCase().trim() );
        if ( key.indexOf( "x-emc" ) != 0 ) {
            this.debug( "Skipping " + key );
            continue;
        }

        var value = headers[prop];
        if ( value ) value = this._normalizeWS( value.trim() );
        emcheaders[key] = value;
    }

    var keys = Object.keys( emcheaders );
    this.debug( "keys " + keys );

    keys.sort().forEach( function ( k ) {
        string += k + ":" + emcheaders[k] + "\n";
    } );

    return string.trim();
};

/**
 * Normalizes the whitespace in an object (condenses multiple spaces into one space)
 * @param {String} str the string to process
 * @returns {String} the output string
 */
AtmosRest.prototype._normalizeWS = function( str ) {
    if ( str == null ) return null;
    str = str.replace( /\n/, " " );
    return str.replace( /\s+/, " " );
};

/**
 * Signs a string using HMAC-SHA1
 * @param {String} string the string content to sign
 * @param {String} secret the secret key, base-64 encoded.
 * @returns {String} the signature, base-64 encoded.
 */
AtmosRest.prototype._doSignature = function( string, secret ) {
    this.debug( "Secret: " + secret );

    if ( isNodejs ) {
        var key = new Buffer( secret, 'base64' );
        var hmac = crypto.createHmac( "sha1", key.toString( 'binary' ) );
        hmac.update( string );
        return hmac.digest( 'base64' );
    } else {
        var sig = Crypto.HMAC( Crypto.SHA1, string, Crypto.util.base64ToBytes( secret ), {asBytes:true} );
        return Crypto.util.bytesToBase64( sig );
    }
};

//
// Logging functions: see if the console is available and log to it.
//

/**
 * Outputs to the Console object (if it exists) as debug text
 * @param message the string to write to the console.
 */
AtmosRest.prototype.debug = function( message ) {
    if ( typeof(console) !== 'undefined' ) {
        if ( typeof(console.debug) !== 'undefined' ) {
            console.debug( message );
        } else if ( typeof(console.log) !== 'undefined' ) {
            console.log( message );
        }
    }
};

/**
 * Outputs to the Console object (if it exists) as info text
 * @param message the string to write to the console.
 */
AtmosRest.prototype.info = function( message ) {
    if ( typeof(console) !== 'undefined' && typeof(console.info) !== 'undefined' ) {
        console.info( message );
    }
};

/**
 * Outputs to the Console object (if it exists) as warning text
 * @param message the string to write to the console.
 */
AtmosRest.prototype.warn = function( message ) {
    if ( typeof(console) !== 'undefined' && typeof(console.warn) !== 'undefined' ) {
        console.warn( message );
    }
};

/**
 * Outputs to the Console object (if it exists) as error text
 * @param message the string to write to the console.
 */
AtmosRest.prototype.error = function( message ) {
    if ( typeof(console) !== 'undefined' && typeof(console.error) !== 'undefined' ) {
        console.error( message );
    }
};


////////////////////////
// Exports for NodeJS //
////////////////////////
if ( typeof(exports) != 'undefined' ) {
    exports.AtmosRest = AtmosRest;
    exports.AtmosRange = AtmosRange;
    exports.Acl = Acl;
    exports.AclEntry = AclEntry;
    exports.AtmosResult = AtmosResult;
    exports.ListOptions = ListOptions;
    exports.ObjectResult = ObjectResult;
    exports.DirectoryEntry = DirectoryEntry;
    exports.dumpObject = dumpObject;
}
