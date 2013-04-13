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
var isNodejs = (typeof(require) == 'function' );
if ( isNodejs ) {
    crypto = require( 'crypto' );
    XMLHttpRequest = require( 'xmlhttprequest' ).XMLHttpRequest;
    if ( typeof(AtmosUtil) == 'undefined' ) AtmosUtil = require( './AtmosUtil' ).AtmosUtil;
}

/**
 * Provides access to the EMC Atmos REST API through JavaScript.
 * Constructs a new AtmosRest object.
 *
 * @param {AtmosConfig} atmosConfig the Atmos configuration object.
 * @constructor
 */
AtmosRest = function( atmosConfig ) {
    this.atmosConfig = atmosConfig;

    this.info( "AtmosRest loaded" );
};

// release version
/** @define {string} */
var ATMOS_REST_VERSION = '0.1';
AtmosRest.version = ATMOS_REST_VERSION;

/** @define {boolean} */
var ATMOS_REST_COMPILED = false;
AtmosRest.compiled = ATMOS_REST_COMPILED;

// counters
AtmosRest.iframeCount = 0;

/**
 * The URI context for the REST service.  Defaults to "/rest"
 * @type {string}
 */
AtmosRest.prototype.context = "/rest";

////////////////////
// Public Methods //
////////////////////

/**
 * Returns the information about the Atmos REST web service
 * @param {function} callback the completion callback (both error and success). In the callback, result.value will
 *        reference an AtmosServiceInfo object which contains service information such as features and version
 */
AtmosRest.prototype.getServiceInformation = function( callback ) {
    var me = this;
    this._ajax( /** @type HttpRequest */ {
        method: 'GET',
        uri: this.context + '/service',
        headers: {},
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            var version = "n/a";

            // looking for /Version/Atmos (<Version><Atmos>X.X.X</Atmos></Version>)
            var doc = me._getXmlDoc( xhr );
            var versionNodes = doc.getElementsByTagName( "Version" );
            if ( versionNodes.length ) version = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( versionNodes[0], "Atmos" ) );

            result.value = new AtmosServiceInfo( version, false, false, false, false, false );
            result.value.loadFeaturesFromHeader( xhr.getResponseHeader( "x-emc-features" ),
                xhr.getResponseHeader( "x-emc-support-utf8" ) );
        },
        complete: callback
    } );
};

/**
 * Creates an object in Atmos
 * @param {Acl} acl an Acl for the new object.  If null, the object will get the default Acl.
 * @param {Object} meta regular Metadata for the new object.  May be null for no regular metadata.
 * @param {Object} listableMeta listable Metadata for the new object.  May be null for no listable metadata.
 * @param {string} form the form element that contains the file(s) to upload. Either form or data must be specified.
 *                 NOTE: multipart forms must be supported by your Atmos version (check AtmosServiceInfo.browsercompat).
 * @param {string|File} data the data for the new object (can be a String, Blob or File). Either form or data must be specified
 * @param {string} mimeType the mimeType for the new object.  If null, the object will be assigned application/octet-stream.
 *                          Leave blank if form is present (mime type will be extracted from multipart data)
 * @param {function} successCallback the callback for when the function completes.  Should have the signature function(result)
 *                   where result will be an AtmosResult object.  The created Object ID will be in the value field of the result object.
 * @param {function=} progressCallback (optional) the callback for progress updates (i.e. status bar)
 */
AtmosRest.prototype.createObject = function( acl, meta, listableMeta, form, data, mimeType, successCallback, progressCallback ) {
    var headers = {};
    var me = this;

    this._addAclHeaders( acl, headers );
    this._addMetadataHeaders( meta, headers, false );
    this._addMetadataHeaders( listableMeta, headers, true );

    this._ajax( /** @type HttpRequest */ {
        uri: this.context + '/objects',
        method: 'POST',
        headers: headers,
        data: data,
        mimeType: mimeType,
        progress: progressCallback,
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            me._processCreateObjectResult( result, xhr );
        },
        complete: successCallback,
        form: form
    } );
};

/**
 * Creates an object in Atmos on the path provided.
 *
 * @param {string} path the namespace path in Atmos (must start with a slash)
 * @param {Acl} acl an Acl for the new object.  If null, the object will get the default Acl.
 * @param {Object} meta regular Metadata for the new object.  May be null for no regular metadata.
 * @param {Object} listableMeta listable Metadata for the new object.  May be null for no listable metadata.
 * @param {Element} form the form element that contains the file(s) to upload. Either form or data must be specified
 *                 NOTE: multipart forms must be supported by your Atmos version (check AtmosServiceInfo.browsercompat).
 * @param {string|File} data the data for the new object (can be a String, Blob or File). Either form or data must be specified
 * @param {string} mimeType the mimeType for the new object.  If null, the object will be assigned application/octet-stream.
 *                          Leave blank if form is present (mime type will be extracted from multipart data)
 * @param {function} successCallback the callback for when the function completes.  Should have the signature function(result)
 *                   where result will be an AtmosResult object.  The created Object ID will be in the value field of the result object.
 * @param {function=} progressCallback the (optional) callback for progress updates (i.e. status bar)
 */
AtmosRest.prototype.createObjectOnPath = function( path, acl, meta, listableMeta, form, data, mimeType, successCallback, progressCallback ) {
    if ( !AtmosRest.objectPathMatch.test( path ) ) {
        throw "The path '" + path + "' is not valid";
    }
    var headers = {};
    var me = this;

    this._addAclHeaders( acl, headers );
    this._addMetadataHeaders( meta, headers, false );
    this._addMetadataHeaders( listableMeta, headers, true );

    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( path ),
        method: 'POST',
        headers: headers,
        data: data,
        mimeType: mimeType,
        progress: progressCallback,
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            me._processCreateObjectResult( result, xhr );
        },
        complete: successCallback,
        form: form
    } );
};

/**
 * Reads the contents of an object from Atmos
 * @param {string} id the object identifier (either an object path or an object id)
 * @param {AtmosRange} range the range of the object to read, pass null to read the entire object.
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's content will be returned in the data property of the result object.
 */
AtmosRest.prototype.readObject = function( id, range, callback ) {
    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ),
        method: 'GET',
        headers: {},
        range: range,
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            result.data = xhr.responseText;
        },
        complete: callback
    } );
};

/**
 * Updates an object in Atmos with the given ID.
 *
 * @param {string} id the object ID or namespace path in Atmos.
 * @param {Acl} acl an Acl for the object.  May be null for no updates.
 * @param {Object} meta regular Metadata for the object.  May be null for no updates.
 * @param {Object} listableMeta listable Metadata for the object.  May be null for no updates.
 * @param {string} form the form element that contains the file(s) to upload. Either form or data must be specified
 *                 NOTE: multipart forms must be supported by your Atmos version (check AtmosServiceInfo.browsercompat).
 * @param {string|File} data the data for the new object (can be a String, Blob or File). Either form or data must be specified
 * @param {AtmosRange} range the range of the object to update, pass null to replace the entire object or if a form is used.
 * @param {string} mimeType the mimeType for the new object.  If null, the object will be assigned application/octet-stream.
 *                          Leave blank if form is present (mime type will be extracted from multipart data)
 * @param {function} successCallback the callback for when the function completes.  Should have the signature function(result)
 *                   where result will be an AtmosResult object. The result of this call will only contain status information.
 * @param {function=} progressCallback the (optional) callback for progress updates (i.e. status bar)
 */
AtmosRest.prototype.updateObject = function( id, acl, meta, listableMeta, form, data, range, mimeType, successCallback, progressCallback ) {
    var headers = {};

    this._addAclHeaders( acl, headers );
    this._addMetadataHeaders( meta, headers, false );
    this._addMetadataHeaders( listableMeta, headers, true );

    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ),
        method: 'PUT',
        headers: headers,
        data: data,
        mimeType: mimeType,
        range: range,
        progress: progressCallback,
        complete: successCallback,
        form: form
    } );
};

/**
 * Deletes an object from Atmos.
 * @param {string} id an object identifier (either an object path or object id)
 * @param {function=} callback the completion callback (both error and success).
 */
AtmosRest.prototype.deleteObject = function( id, callback ) {
    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ),
        method: 'DELETE',
        headers: {},
        complete: callback
    } );
};

/**
 * Lists the versions of an object.
 * @param {string} id the id of the object (either an object path or object id)
 * @param {function} callback the completion callback (both error and success). On success, a list of object IDs will
 * be in result.value
 */
AtmosRest.prototype.listVersions = function( id, callback ) {
    var me = this;
    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + '?versions',
        method: 'GET',
        headers: {},
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            result.value = me._parseObjectVersions( xhr );
        },
        complete: callback
    } );
};

/**
 * Creates a new immutable version of an object.
 * @param {string} id the id of the object to version (either an object path or object id)
 * @param {function=} callback the completion callback (both error and success). On success, the ID of the newly created
 * version will be in result.value
 */
AtmosRest.prototype.versionObject = function( id, callback ) {
    var me = this;
    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + "?versions",
        method: 'POST',
        headers: {},
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            me._processCreateObjectResult( result, xhr );
        },
        complete: callback
    } );
};

/**
 * Restores a version of an object to the base version (i.e. "promote" an
 * old version to the current version).
 * @param {string} id Base object ID (target of the restore)
 * @param {string} vId Version object ID to restore
 * @param {function=} callback the completion callback (both error and success).
 */
AtmosRest.prototype.restoreVersion = function( id, vId, callback ) {
    var headers = {};

    // Version to promote
    headers["x-emc-version-oid"] = vId;

    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + '?versions',
        method: 'PUT',
        headers: headers,
        complete: callback
    } );
};

/**
 * Deletes a version of an object from the cloud.
 * @param {string} vId the object ID of the version of the object to delete.
 * @param {function=} callback the completion callback (both error and success).
 */
AtmosRest.prototype.deleteVersion = function( vId, callback ) {
    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( vId ) + '?versions',
        method: 'DELETE',
        headers: {},
        complete: callback
    } );
};

/**
 * Renames a file or directory within the namespace.
 * @param {string} oldPath The file or directory to rename
 * @param {string} newPath The new path for the file or directory
 * @param {boolean} force If true, the desination file or
 * directory will be overwritten.  Directories must be empty to be
 * overwritten.  Also note that overwrite operations on files are
 * not synchronous; a delay may be required before the object is
 * available at its destination.
 * @param {function=} callback the completion callback (both error and success).
 */
AtmosRest.prototype.rename = function( oldPath, newPath, force, callback ) {
    if ( !AtmosRest.objectPathMatch.test( newPath ) ) {
        throw "The path '" + newPath + "' is not valid";
    }
    var headers = {};

    headers["x-emc-path"] = this.atmosConfig.enableUtf8 ? encodeURIComponent( newPath.substr( 1 ) ) : newPath.substr( 1 );
    if ( force ) headers["x-emc-force"] = "true";

    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( oldPath ) + "?rename",
        method: 'POST',
        headers: headers,
        complete: callback
    } );
};

/**
 * Creates a string to be used as the disposition string when creating a shareable URL with disposition (download link).
 * Example code:<pre>
 *     var futureDate = new Date(...); // date in future
 *     var disposition = atmosRest.createAttachmentDisposition(); // fileName optional for namespace API (required for object API)
 *     var url = atmosRest.getShareableUrl( "/my/object", futureDate, disposition ); // URL response will contain a Content-Disposition header
 * </pre>
 * NOTE: this feature must be supported by your Atmos version (check AtmosServiceInfo.browsercompat).
 * @param {string=} fileName
 */
AtmosRest.prototype.createAttachmentDisposition = function( fileName ) {
    if ( fileName ) return "attachment; filename*=" + encodeURIComponent( "UTF-8''" + fileName );
    else return "attachment";
};

/**
 * Creates a shareable URL that anyone (globally) can access.
 *
 * @param {string} id the object ID or path for which to generate the URL
 * @param {Date} expirationDate the expiration date of the URL (as
 * @param {string=} disposition the content-disposition that should be specified in the response header for the shareable
 *        URL. NOTE: this feature must be supported by your Atmos version (check AtmosServiceInfo.browsercompat).
 * @return {string} a URL that can be used to share the object's content
 */
AtmosRest.prototype.getShareableUrl = function( id, expirationDate, disposition ) {
    if ( !expirationDate.getTime ) throw "expirationDate must be a Date object";

    var method = "GET";
    var path = this._getPath( id );
    var expires = Math.floor( expirationDate.getTime() / 1000 ); // convert to seconds

    // establish hash string for signing
    var hashString = method + "\n" + path.toLowerCase() + "\n" + this.atmosConfig.uid + "\n" + expires;
    if ( disposition ) hashString += "\n" + disposition;
    this.debug( "hash string:\n" + hashString );

    // sign hash string
    var signature = this._doSignature( hashString, this.atmosConfig.secret );

    // generate query string
    var query = "uid=" + encodeURIComponent( this.atmosConfig.uid );
    query += "&expires=" + expires;
    query += "&signature=" + encodeURIComponent( signature );
    if ( disposition ) query += "&disposition=" + encodeURIComponent( disposition );

    // compose URL
    var url = this._resolveUrl( this._encodeURI( path ), query );
    this.debug( "Shareable URL: " + url );

    return url;
};

/**
 * Returns an object's ACL
 * @param {string} id the object identifier (either an object path or an object id)
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's ACL will be returned in the value property of the result object.
 */
AtmosRest.prototype.getAcl = function( id, callback ) {
    var me = this;
    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + '?acl',
        method: 'GET',
        headers: {},
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            var userAcls = me._parseAclEntries( xhr.getResponseHeader( "x-emc-useracl" ) );
            var groupAcls = me._parseAclEntries( xhr.getResponseHeader( "x-emc-groupacl" ) );
            result.value = new Acl( userAcls, groupAcls );
        },
        complete: callback, x: 2
    } );
};

/**
 * Sets (overwrites) the ACL on the object.
 * @param {string} id the object identifier (either an object path or an object id)
 * @param {Acl} acl the new ACL for the object.
 * @param {function=} callback the completion callback (both error and success).
 */
AtmosRest.prototype.setAcl = function( id, acl, callback ) {
    var headers = {};

    this._addAclHeaders( acl, headers );

    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + "?acl",
        method: 'POST',
        headers: headers,
        complete: callback
    } );
};

/**
 * Returns the list of user metadata tags assigned to the object.
 * @param {string} id the object identifier (either an Object ID or an Object Path)
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's non-listable tags will be in result.value.tags and the
 * listable tags will be in result.value.listableTags
 */
AtmosRest.prototype.listUserMetadataTags = function( id, callback ) {
    var me = this;
    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + '?metadata/tags',
        method: 'GET',
        headers: {},
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            var decode = xhr.getResponseHeader( "x-emc-utf8" ) == "true";
            result.value = {};
            var tagHeader = xhr.getResponseHeader( "x-emc-tags" );
            if ( tagHeader ) result.value.tags = me._listToArray( tagHeader, decode );
            var lTagHeader = xhr.getResponseHeader( "x-emc-listable-tags" );
            if ( lTagHeader ) result.value.listableTags = me._listToArray( lTagHeader, decode );
        },
        complete: callback
    } );
};

/**
 * Reads the user metadata for an object.
 * @param {string} id the object identifier (either an Object ID or an Object Path)
 * @param {Array} filter if not null, an array of strings defining which metadata tags should be returned.
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's metadata will be returned in result.value.meta and the
 * listable metadata will be returned in result.value.listableMeta.
 */
AtmosRest.prototype.getUserMetadata = function( id, filter, callback ) {
    var headers = {};
    var me = this;

    if ( filter ) this._addTagHeader( filter, headers );

    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + '?metadata/user',
        method: 'GET',
        headers: headers,
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            var decode = xhr.getResponseHeader( "x-emc-utf8" ) == "true";
            result.value = {};
            result.value.meta = me._parseMetadata( xhr.getResponseHeader( "x-emc-meta" ), decode );
            result.value.listableMeta = me._parseMetadata( xhr.getResponseHeader( "x-emc-listable-meta" ), decode );
        },
        complete: callback
    } );
};

/**
 * Reads the system metadata for an object.
 * @param {string} id the object identifier (either an Object ID or an Object Path)
 * @param {Array} filter if not null, an array of strings defining which metadata tags should be returned.
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's system metadata will be returned in result.value.systemMeta (the mime type will be in
 * result.value.systemMeta.mimeType)
 */
AtmosRest.prototype.getSystemMetadata = function( id, filter, callback ) {
    var headers = {};
    var me = this;

    if ( filter ) this._addTagHeader( filter, headers );

    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + '?metadata/system',
        method: 'GET',
        headers: headers,
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            var decode = xhr.getResponseHeader( "x-emc-utf8" ) == "true";
            result.value = {};
            result.value.systemMeta = me._parseMetadata( xhr.getResponseHeader( "x-emc-meta" ), decode );
            result.value.systemMeta.mimeType = xhr.getResponseHeader( "Content-Type" );
        },
        complete: callback
    } );
};

/**
 * Returns all of an object's user metadata and its ACL in one call.
 * @param {string} id the object identifier (either an Object ID or an Object Path)
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's user metadata will be returned in result.value.meta, listable metadata will be in
 * result.value.listableMeta and its ACL will be in result.value.acl
 * NOTE: System metadata is included with user metadata here even though they exist in different namespaces. If you need
 *       to differentiate between the two, use getSystemMetadata and getUserMetadata
 */
AtmosRest.prototype.getAllMetadata = function( id, callback ) {
    var me = this;
    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ),
        method: 'HEAD',
        headers: {},
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            var decode = xhr.getResponseHeader( "x-emc-utf8" ) == "true";
            result.value = {};
            result.value.meta = me._parseMetadata( xhr.getResponseHeader( "x-emc-meta" ), decode );
            result.value.listableMeta = me._parseMetadata( xhr.getResponseHeader( "x-emc-listable-meta" ), decode );
            var userAcls = me._parseAclEntries( xhr.getResponseHeader( "x-emc-useracl" ) );
            var groupAcls = me._parseAclEntries( xhr.getResponseHeader( "x-emc-groupacl" ) );
            result.value.acl = new Acl( userAcls, groupAcls );
        },
        complete: callback
    } );
};

/**
 * Get information about an object's state including
 * replicas, expiration, and retention.
 * @param {string} id the object identifier (either an Object ID or an Object Path)
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's info will be returned in result.value (as an ObjectInfo object).
 */
AtmosRest.prototype.getObjectInfo = function( id, callback ) {
    var me = this;
    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + '?info',
        method: 'GET',
        headers: {},
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            me._processObjectInfoResult( result, xhr );
        },
        complete: callback
    } );
};

/**
 * Sets the user metadata for an object.
 * @param {string} id the object identifier (either an Object ID or an Object Path)
 * @param {Object} meta a map of regular Metadata for the object.  May be null or empty for no regular metadata.
 * @param {Object} listableMeta a map of listable Metadata for the object.  May be null or empty for no listable metadata.
 * @param {function=} callback the completion callback (both error and success).
 */
AtmosRest.prototype.setUserMetadata = function( id, meta, listableMeta, callback ) {
    var headers = {};

    this._addMetadataHeaders( meta, headers, false );
    this._addMetadataHeaders( listableMeta, headers, true );

    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + "?metadata/user",
        method: 'POST',
        headers: headers,
        complete: callback
    } );
};

/**
 * Deletes metadata tags from an object.
 * @param {string} id the object identifier (either an Object ID or an Object Path)
 * @param {Array} tags a list of tags (metadata names) to delete from the object
 * @param {function=} callback the completion callback (both error and success).
 */
AtmosRest.prototype.deleteUserMetadata = function( id, tags, callback ) {
    var headers = {};

    this._addTagHeader( tags, headers );

    this._ajax( /** @type HttpRequest */ {
        uri: this._getPath( id ) + '?metadata/user',
        method: 'DELETE',
        headers: headers,
        complete: callback
    } );
};

/**
 * Returns a list of the tags that are listable the current user's tennant.
 * @param {string} tag optional.  If specified, the list will be limited to the tags
 * under the specified tag.  If null, only top level tags will be returned.
 * @param {function} callback the completion callback (both error and success). The list of tags returned will be in
 * result.value
 */
AtmosRest.prototype.getListableTags = function( tag, callback ) {
    var headers = {};
    var me = this;

    if ( tag ) this._addTagHeader( [tag], headers );

    this._ajax( /** @type HttpRequest */ {
        uri: this.context + "/objects?listabletags",
        method: 'GET',
        headers: headers,
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            var decode = xhr.getResponseHeader( "x-emc-utf8" ) == "true";
            var tagHeader = xhr.getResponseHeader( "x-emc-listable-tags" );
            if ( tagHeader ) result.value = me._listToArray( tagHeader, decode );
        },
        complete: callback
    } )
};

/**
 * Lists objects from the server using a listable tag.
 * @param {string} tag the listable tag to search
 * @param {ListOptions} options for listing objects.  See the ListOptions class.
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the result's value property will be populated with an Array of ObjectResult objects.  Also
 * be sure to check the token property.  If defined, you did not receive all results
 * and should call this method again using the token inside a ListOptions object to continue
 * your listing.
 */
AtmosRest.prototype.listObjects = function( tag, options, callback ) {
    if ( !tag ) throw "Tag cannot be null";
    var headers = {};
    var me = this;

    this._addTagHeader( [tag], headers );

    this._addListOptionHeaders( headers, options );

    this._ajax( /** @type HttpRequest */ {
        uri: this.context + "/objects",
        method: 'GET',
        headers: headers,
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            me._processListObjectsResult( result, xhr );
        },
        complete: callback
    } )
};

/**
 * Lists objects from the server within a directory (path).
 * @param {string} directory the directory (path) in which to list objects (must exist!)
 * @param {ListOptions} options for listing objects.  See the ListOptions class. NOTE: metadata can only be returned in
 * Atmos >1.3
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the result's value property will be populated with an Array of DirectoryItem objects.  Also
 * be sure to check the token property.  If defined, you did not receive all results
 * and should call this method again using the token inside a ListOptions object to continue
 * your listing.
 */
AtmosRest.prototype.listDirectory = function( directory, options, callback ) {
    if ( !directory ) throw "Directory cannot be null";
    if ( directory.charAt( directory.length - 1 ) !== "/" ) {
        throw "Directory must end with a slash";
    }
    var headers = {};
    var me = this;

    this._addListOptionHeaders( headers, options );

    this._ajax( /** @type HttpRequest */ {
        uri: this.context + "/namespace" + directory,
        method: 'GET',
        headers: headers,
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            me._processListDirectoryResult( directory, result, xhr );
        },
        complete: callback
    } );
};

/**
 * Creates an anonymous access token.
 * @param {AccessTokenPolicy} tokenPolicy the token policy for the new access token
 * @param {string=} id the object identifier (either an object path or an object id) targeted by the access token
 * @param {Acl=} acl the ACL that will be assigned to objects created using this access token
 * @param {Object=} meta a map of regular Metadata for uploads.  May be null or empty for no regular metadata.
 * @param {Object=} listableMeta a map of listable Metadata for uploads.  May be null or empty for no listable metadata.
 * @param {function=} callback the completion callback (both error and success).  Upon success,
 * the result's value property will be populated with the access token's URL
 */
AtmosRest.prototype.createAccessToken = function( tokenPolicy, id, acl, meta, listableMeta, callback ) {
    var headers = {};
    var me = this;

    if ( id ) {
        if ( AtmosRest.objectPathMatch.test( id ) )
            headers['x-emc-path'] = this.atmosConfig.enableUtf8 ? encodeURIComponent( id ) : id;
        else headers['x-emc-objectid'] = id;
    }
    this._addAclHeaders( acl, headers );
    this._addMetadataHeaders( meta, headers, false );
    this._addMetadataHeaders( listableMeta, headers, true );

    this._ajax( /** @type HttpRequest */ {
        uri: this.context + '/accesstokens',
        method: 'POST',
        headers: headers,
        data: AtmosUtil.serializeXml( tokenPolicy.toDocument() ),
        mimeType: 'application/xml',
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            result.value = me._resolveUrl( xhr.getResponseHeader( 'location' ) );
        },
        complete: callback
    } );
};

/**
 * Retrieves details about the specified access token
 * @param {string} tokenUri the URL, URI, path or id of the access token to retrieve
 * @param {function=} callback the completion callback (both error and success).  Upon success,
 * the AccessToken object will be in result.value.
 */
AtmosRest.prototype.getAccessToken = function( tokenUri, callback ) {
    if ( !tokenUri ) tokenUri = '';
    var elements = tokenUri.split( '/' );
    var tokenId = elements[elements.length - 1];
    var me = this;

    this._ajax( /** @type HttpRequest */ {
        uri: this.context + '/accesstokens/' + tokenId + '?info',
        method: 'GET',
        headers: {},
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            result.value = AccessToken.fromNode( AtmosUtil.getChildByTagName( me._getXmlDoc( xhr ), 'access-token' ) );
        },
        complete: callback
    } );
};

/**
 * Deletes an access token
 * @param {string} tokenUri the URL, URI, path or id of the access token to delete
 * @param {function=} callback the completion callback (both error and success).
 */
AtmosRest.prototype.deleteAccessToken = function( tokenUri, callback ) {
    var elements = tokenUri.split( '/' );
    var tokenId = elements[elements.length - 1];

    this._ajax( /** @type HttpRequest */ {
        uri: this.context + '/accesstokens/' + tokenId,
        method: 'DELETE',
        headers: {},
        complete: callback
    } );
};

/**
 * Lists all access tokens created by the user.
 * @param {ListOptions} options for listing objects.  See the ListOptions class. NOTE: metadata can only be returned in
 * Atmos >1.3
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the result's value property will be populated with an Array of AccessToken objects.  Also
 * be sure to check the token property.  If defined, you did not receive all results
 * and should call this method again using the token inside a ListOptions object to continue
 * your listing.
 */
AtmosRest.prototype.listAccessTokens = function( options, callback ) {
    var headers = {};
    var me = this;

    this._addListOptionHeaders( headers, options );

    this._ajax( /** @type HttpRequest */ {
        uri: this.context + "/accesstokens",
        method: 'GET',
        headers: headers,
        processResult: function( result, xhr ) {
            if ( !result.successful ) return;
            result.token = xhr.getResponseHeader( "x-emc-token" );
            var root = AtmosUtil.getChildByTagName( me._getXmlDoc( xhr ), 'list-access-tokens-result' );
            var listNode = AtmosUtil.getChildByTagName( root, 'access-tokens-list' );
            var tokenList = [];
            AtmosUtil.getChildrenByTagName( listNode, 'access-token' ).forEach( function( tokenNode ) {
                tokenList.push( AccessToken.fromNode( tokenNode ) );
            } );
            result.value = tokenList;
        },
        complete: callback
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
 * @param {string} id
 * @return {string}
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
 * @param {Object} headers
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
        value += this.atmosConfig.enableUtf8 ? encodeURIComponent( tags[i] ) : tags[i];
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
        headers["x-emc-listable-meta"] = this._metaToHeaderValue( meta );
    } else {
        headers["x-emc-meta"] = this._metaToHeaderValue( meta );
    }
};

/**
 * Serialize a metadata object into a header value (map.key1=map.value1,map.key2=map.value2)
 */
AtmosRest.prototype._metaToHeaderValue = function( meta ) {
    var params = [], keys = Object.keys( meta );
    for ( var i = 0; i < keys.length; i++ ) {
        var key = this.atmosConfig.enableUtf8 ? encodeURIComponent( keys[i] ) : keys[i];
        var value = this.atmosConfig.enableUtf8 ? encodeURIComponent( meta[keys[i]] ) : meta[keys[i]];
        params.push( key + "=" + value );
    }
    return params.join( "," );
};

/**
 * Converts a comma-separated list of values into an array of those values.
 */
AtmosRest.prototype._listToArray = function( listString, decode ) {
    if ( !listString ) return null;
    if ( listString.trim().length == 0 ) return [];
    var array = listString.split( "," );
    for ( var i = 0; i < array.length; i++ ) {
        array[i] = decode ? decodeURIComponent( array[i].trim() ) : array[i].trim();
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
 * @param {HttpRequest} request abstracted HTTP request
 */
AtmosRest.prototype._ajax = function( request ) {
    request.uri = this._resolveDots( request.uri );

    if ( request.headers ) {
        if ( this.atmosConfig.enableUtf8 ) {
            request.headers["x-emc-utf8"] = "true";
        }

        this._prepBaseHeaders( request.headers, request.range );
        if ( /(POST|PUT)/.test( request.method ) ) this._prepUploadHeaders( request.headers, request.mimeType );

        this._signRequest( request.method, request.headers, request.uri );
    }

    // skip for absolute URLs
    if ( !/^https?:\/\//.test( request.uri ) ) {

        // encode *after* signing
        request.uri = this._encodeURI( request.uri );

        // If a cross-domain request...
        if ( this.atmosConfig.host && this.atmosConfig.protocol ) {
            var baseUri = this.atmosConfig.protocol + "//" + this.atmosConfig.host;
            if ( this.atmosConfig.port ) baseUri += ':' + this.atmosConfig.port;
            request.uri = baseUri + request.uri;
        }
    }

    // success/error handling
    var me = this;
    var responseHandler = function( xhr ) {
        var result = me._createResult( xhr, xhr.status < 400 );
        if ( request.processResult ) request.processResult( result, xhr );
        if ( request.complete ) request.complete( result );
    };

    if ( request.form ) { // using form

        // make sure headers are returned in the response text (we cannot access response headers in an iframe)
        request.headers['x-http-inject-response-headers'] = 'true';

        // we can only POST a form
        if ( request.method != 'POST' ) request.headers['x-http-method-override'] = request.method;

        var iframe = this._createTargetIframe( function( responseText ) {
            var xhrFacade = me._parseFormResponse( responseText );
            responseHandler( xhrFacade );
        } );

        this._setFormHeaders( request.form, request.headers );

        // progress is unsupported
        if ( request.progress ) request.progress( -1 );

        request.form.action = request.uri;
        request.form.method = 'POST';
        request.form.enctype = request.form.encoding = 'multipart/form-data';
        request.form.target = iframe.name;
        request.form.submit();

        // make sure we clean up our added fields, or they will be included in future POSTs
        this._unsetFormHeaders( request.form, request.headers );

    } else { // using XHR

        var xhr = this._getXMLHttpRequest();
        xhr.onreadystatechange = function() {
            if ( xhr.readyState == 4 ) {
                responseHandler( xhr );
            }
        };

        // progress callback
        try {
            if ( request.progress ) {
                (xhr.upload || xhr).onprogress = function( event ) {
                    if ( event.lengthComputable ) {
                        var progressPercent = Math.floor( (event.position || event.loaded) / (event.totalSize || event.total) * 100 );
                        request.progress( progressPercent );
                    }
                };
            }
        } catch ( e ) {
            // progress isn't supported
            request.progress( -1 );
        }

        xhr.open( request.method, request.uri, true );

        this._setHeaders( xhr, request.headers );

        if ( request.data ) xhr.send( request.data );
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
        catch ( ex ) {
            return null;
        }
    }
};

AtmosRest.prototype._setFormHeaders = function( form, headers ) {

    // headers get passed as form parameters
    var keys = Object.keys( headers );
    for ( var i = 0; i < keys.length; i++ ) {
        var element = form.elements[keys[i]];
        if ( !element ) {
            try { // for IE6
                element = document.createElement( '<input type="hidden" name="' + keys[i] + '">' );
            } catch ( e ) {
                element = document.createElement( 'input' );
                element.name = keys[i];
            }
            element.type = "hidden";
            form.insertBefore( element, form.childNodes[0] );
        }
        element.value = headers[keys[i]];
    }
};

AtmosRest.prototype._unsetFormHeaders = function( form, headers ) {

    // remove headers form form parameters to avoid re-POSTing them
    var keys = Object.keys( headers );
    for ( var i = 0; i < keys.length; i++ ) {
        var element = form.elements[keys[i]];
        if ( element ) {
            form.removeChild( element );
        }
    }
};

AtmosRest.prototype._createTargetIframe = function( callback ) {
    var name = 'ATMOS_IFRAME_' + ++AtmosRest.iframeCount;
    var iframe;
    try { // for IE6
        iframe = document.createElement( '<iframe name="' + name + '"></iframe>' );
    } catch ( e ) {
        iframe = document.createElement( 'iframe' );
        iframe.name = name;
    }
    iframe.id = name;
    iframe.style.display = 'none';
    document.body.appendChild( iframe );
    var complete = function() {
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        var content = iframeDoc.body != null ? iframeDoc.body.firstChild.innerHTML : iframeDoc.documentElement.innerHTML;
        callback.call( iframe, content );
        document.body.removeChild( iframe );
    };
    if ( iframe.attachEvent ) iframe.attachEvent( "onload", complete );
    else iframe.onload = complete;
    return iframe;
};

AtmosRest.prototype._parseFormResponse = function( responseText ) {
    this.debug( 'form response (raw):\n' + responseText );

    var xhrFacade = {};
    xhrFacade.headers = {};

    // parse headers
    var headerLength;
    try {
        var charCount = 0;
        var nextLine = function( purge ) {
            var breakIndex = responseText.indexOf( '\n' );
            if ( breakIndex < 0 ) breakIndex = responseText.length;
            var line = responseText.substr( 0, breakIndex );
            if ( purge ) {
                responseText = responseText.substr( breakIndex + 1 ); // exclude endline char
                charCount += breakIndex + 1;
            }
            if ( line.charAt( line.length - 1 ) == '\r' ) line = line.substr( 0, line.length - 1 ); // remove CR when in Windows
            return line;
        };

        // get header length
        headerLength = parseInt( nextLine( false ) );
        if ( !isNaN( headerLength ) ) {
            nextLine( true );

            var statusLine = nextLine( true );
            var statusWords = statusLine.split( ' ' );
            xhrFacade.status = parseInt( statusWords[1] );
            xhrFacade.statusText = statusLine.substr( statusWords[0].length + statusWords[1].length + 2 );

            while ( charCount < headerLength ) {
                var line = nextLine( true );
                var separatorIndex = line.indexOf( ': ' );
                xhrFacade.headers[line.substr( 0, separatorIndex )] = line.substr( separatorIndex + 2 );
            }
        }
    } catch ( error ) {
        this.warn( 'could not parse headers in form response: ' + error );
    }

    xhrFacade.getResponseHeader = function( name ) {
        return this.headers[name];
    };
    xhrFacade.responseText = this._decodeXmlEntities( responseText );

    return xhrFacade;
};

/**
 * Decodes XML entities ('&gt;' => '<')
 * @param raw raw text to decode
 */
AtmosRest.prototype._decodeXmlEntities = function( raw ) {
    raw = raw.replace( /&gt;/g, '>' );
    raw = raw.replace( /&lt;/g, '<' );
    return raw;
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
 * @returns {string} the URI with the path components encoded.
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
    var outURI;
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

/**
 * @param xhr {XMLHttpRequest}
 * @param success {boolean}
 * @return {AtmosResult}
 * @private
 */
AtmosRest.prototype._createResult = function( xhr, success ) {
    var result = new AtmosResult( success );

    result.httpCode = xhr.status;
    result.httpMessage = xhr.statusText;

    if ( !success ) {
        var doc = this._getXmlDoc( xhr );
        var errorNodes = doc.getElementsByTagName( "Error" );
        if ( errorNodes.length ) {
            result.errorCode = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( errorNodes[0], "Code" ) );
            result.errorMessage = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( errorNodes[0], "Message" ) );
        }
    }

    return result;
};

AtmosRest.prototype._getXmlDoc = function( xhr ) {
    if ( xhr.responseXML ) {
        return xhr.responseXML;
    } else {
        this.debug( "response:\n" + xhr.responseText );
        return AtmosUtil.parseXml( xhr.responseText );
    }
};

/**
 * Processes the create object response and extracts the new object ID
 * @param {AtmosResult} result result object passed from _ajax callback
 * @param {XMLHttpRequest} xhr the XHR object containing the response
 */
AtmosRest.prototype._processCreateObjectResult = function( result, xhr ) {
    // Extract the new ObjectId and return
    var location = xhr.getResponseHeader( 'location' );

    this.debug( "location: " + location );

    var matches = location.match( AtmosRest.locationMatch );
    if ( !matches ) {
        result.successful = false;
        result.message = "Could not find location in " + location;
    } else {
        result.value = matches[1];
        this.debug( "Location: " + result.value );
    }
};

/**
 * Parses a metadata value string into a property object
 * @param {string} value the metadata value string
 * @param {boolean} decode whether to URI decode the name/value pairs (if UTF8 header is set)
 * @returns {Object} a property object containing the values
 */
AtmosRest.prototype._parseMetadata = function( value, decode ) {
    if ( typeof(value) == 'undefined' || value == null || value.length == 0 ) {
        return null;
    }

    var result = {};

    var values = value.split( "," );
    for ( var i = 0; i < values.length; i++ ) {
        var nvpair = values[i].split( "=", 2 );
        var name = decode ? decodeURIComponent( nvpair[0].trim() ) : nvpair[0].trim();
        if ( nvpair.length == 1 ) {
            result[name] = "";
        } else {
            result[name] = decode ? decodeURIComponent( nvpair[1] ) : nvpair[1];
        }
    }

    return result;
};

/**
 * Handles the response from the ListObjects method
 * @param {AtmosResult} result
 * @param {XMLHttpRequest} xhr the XHR object
 */
AtmosRest.prototype._processListObjectsResult = function( result, xhr ) {
    result.token = xhr.getResponseHeader( "x-emc-token" );

    var doc = this._getXmlDoc( xhr );

    var objects = [];

    /**
     * @type NodeList
     */
    var objlist = doc.getElementsByTagName( "Object" );

    for ( var i = 0; i < objlist.length; i++ ) {
        var userMeta = null;
        var systemMeta = null;
        var userListableMeta = null;

        var node = objlist.item( i );
        var oidNode = AtmosUtil.getChildByTagName( node, "ObjectID" );
        var smNode = AtmosUtil.getChildByTagName( node, "SystemMetadataList" );
        var umNode = AtmosUtil.getChildByTagName( node, "UserMetadataList" );

        if ( smNode ) {
            systemMeta = {};
            this._parseResponseMeta( smNode.childNodes, systemMeta, null );
        }
        if ( umNode ) {
            userMeta = {};
            userListableMeta = {};
            this._parseResponseMeta( umNode.childNodes, userMeta, userListableMeta );
        }

        var obj = new ObjectResult( AtmosUtil.getTextContent( oidNode ), userMeta, userListableMeta, systemMeta );
        objects.push( obj );
    }

    result.value = objects;
};

/**
 * Handles the response from the ListDirectory method
 * @param {string} directoryPath
 * @param {AtmosResult} result
 * @param {XMLHttpRequest} xhr the XHR object
 */
AtmosRest.prototype._processListDirectoryResult = function( directoryPath, result, xhr ) {
    result.token = xhr.getResponseHeader( "x-emc-token" );

    var doc = this._getXmlDoc( xhr );

    var entries = [];

    /**
     * @type NodeList
     */
    var dirlist = doc.getElementsByTagName( "DirectoryEntry" );

    for ( var i = 0; i < dirlist.length; i++ ) {
        var userMeta = null;
        var systemMeta = null;
        var userListableMeta = null;

        var node = dirlist.item( i );
        var oidNode = AtmosUtil.getChildByTagName( node, "ObjectID" );
        var pathName = AtmosUtil.getChildByTagName( node, "Filename" );
        var type = AtmosUtil.getChildByTagName( node, "FileType" );
        var smNode = AtmosUtil.getChildByTagName( node, "SystemMetadataList" );
        var umNode = AtmosUtil.getChildByTagName( node, "UserMetadataList" );

        if ( smNode ) {
            systemMeta = {};
            this._parseResponseMeta( smNode.childNodes, systemMeta, null );
        }
        if ( umNode ) {
            userMeta = {};
            userListableMeta = {};
            this._parseResponseMeta( umNode.childNodes, userMeta, userListableMeta );
        }

        var entry = new DirectoryItem( directoryPath + AtmosUtil.getTextContent( pathName ),
            AtmosUtil.getTextContent( pathName ), AtmosUtil.getTextContent( type ),
            AtmosUtil.getTextContent( oidNode ), userMeta, userListableMeta, systemMeta );
        entries.push( entry );
    }

    result.value = entries;
};

/**
 * Handles the response from the GetObjectInfo method
 */
AtmosRest.prototype._processObjectInfoResult = function( result, xhr ) {
    var doc = this._getXmlDoc( xhr );
    var objectId = null, selection = null, replicas = [];
    var expirationEnabled = false, expirationEndsAt = null, retentionEnabled = false, retentionEndsAt = null;

    var nodes = doc.getElementsByTagName( "objectId" );
    if ( nodes.length ) objectId = AtmosUtil.getTextContent( nodes.item( 0 ) );

    nodes = doc.getElementsByTagName( "selection" );
    if ( nodes.length ) selection = AtmosUtil.getTextContent( nodes.item( 0 ) );

    nodes = doc.getElementsByTagName( "replicas" );
    if ( nodes.length ) {
        nodes = AtmosUtil.getChildrenByTagName( nodes.item( 0 ), 'replica' );
        for ( var i = 0; i < nodes.length; i++ ) {
            var node = nodes[i];
            var id = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( node, 'id' ) );
            var location = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( node, 'location' ) );
            var replicaType = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( node, 'type' ) );
            var current = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( node, 'current' ) );
            var storageType = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( node, 'storageType' ) );
            replicas.push( new ObjectReplica( id, location, replicaType, current, storageType ) );
        }
    }

    nodes = doc.getElementsByTagName( "expiration" );
    if ( nodes.length ) {
        node = nodes.item( 0 );
        expirationEnabled = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( node, 'enabled' ) );
        expirationEndsAt = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( node, 'endAt' ) );
    }

    nodes = doc.getElementsByTagName( "retention" );
    if ( nodes.length ) {
        node = nodes.item( 0 );
        retentionEnabled = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( node, 'enabled' ) );
        retentionEndsAt = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( node, 'endAt' ) );
    }

    result.value = new ObjectInfo( objectId, selection, replicas, expirationEnabled, expirationEndsAt, retentionEnabled, retentionEndsAt );
};

/**
 * Parses the object versions list from a listVersions request
 * @param xhr {XMLHttpRequest} xhr the XHR object
 * @return {Array.<ObjectVersion>} the list of object versions represented by the XML
 */
AtmosRest.prototype._parseObjectVersions = function( xhr ) {
    var versions = [];

    var doc = this._getXmlDoc( xhr );

    var verNodes = doc.getElementsByTagName( "Ver" );
    for ( var i = 0; i < verNodes.length; i++ ) {
        versions.push( /** ObjectVersion */ {
            num: AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( verNodes.item( i ), "VerNum" ) ),
            oid: AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( verNodes.item( i ), "OID" ) ),
            dateCreated: AtmosUtil.parseIso8601Date( AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( verNodes.item( i ), "itime" ) ) )
        } );
    }

    return versions;
};

/**
 * Parses ACL entries from a response header list from a get ACL request
 * @param {string} header the response header from a get ACL request
 */
AtmosRest.prototype._parseAclEntries = function( header ) {
    var aclEntries = [];
    var grants = this._listToArray( header );
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
        var metaName = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( child, "Name" ) );
        var metaValue = AtmosUtil.getTextContent( AtmosUtil.getChildByTagName( child, "Value" ) );
        var listableNode = AtmosUtil.getChildByTagName( child, "Listable" );
        if ( listableNode ) {
            if ( AtmosUtil.getTextContent( listableNode ) == "true" ) {
                listableMeta[metaName] = metaValue;
                continue;
            }
        }
        regMeta[metaName] = metaValue;
    }
};

/**
 * Signs the REST request
 * @param {string} method the HTTP method (GET, PUT, DELETE, POST, HEAD)
 * @param {Object} headers the object containing the HTTP headers as properties
 *        !!IMPORTANT!! this method assumes Content-Type and Range are already set!
 * @param {string} uri the path to the request
 */
AtmosRest.prototype._signRequest = function( method, headers, uri ) {
    this.debug( this.atmosConfig.uid );
    this.debug( this.atmosConfig.secret );

    headers["x-emc-uid"] = this.atmosConfig.uid;

    var hash_string = this._buildHashString( method, uri, headers );
    this.debug( "HashString:\n" + hash_string );

    var signature = this._doSignature( hash_string, this.atmosConfig.secret );
    this.debug( "Signature: " + signature );

    headers["x-emc-signature"] = signature;

    return signature;
};

/**
 * Generates the string to sign
 * @param {string} method the HTTP method
 * @param {string} path the request uri
 * @param {Object} headers the object containing the HTTP headers as properties
 * @returns {string} the string to sign
 */
AtmosRest.prototype._buildHashString = function( method, path, headers ) {
    var content_type = headers["Content-Type"];
    var range = headers["Range"];
    var date = headers["Date"];

    var emcheaders = {};
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

    keys.sort().forEach( function( k ) {
        string += k + ":" + emcheaders[k] + "\n";
    } );

    return string.trim();
};

/**
 * Normalizes the whitespace in an object (condenses multiple spaces into one space)
 * @param {string} str the string to process
 * @returns {string} the output string
 */
AtmosRest.prototype._normalizeWS = function( str ) {
    if ( str == null ) return null;
    str = str.replace( /\n/, " " );
    return str.replace( /\s+/, " " );
};

/**
 * Signs a string using HMAC-SHA1
 * @param {string} string the string content to sign
 * @param {string} secret the secret key, base-64 encoded.
 * @returns {string} the signature, base-64 encoded.
 */
AtmosRest.prototype._doSignature = function( string, secret ) {
    this.debug( "Secret: " + secret );

    if ( isNodejs ) {
        var key = new Buffer( secret, 'base64' );
        var hmac = crypto.createHmac( "sha1", key.toString( 'binary' ) );
        hmac.update( string, 'utf8' );
        return hmac.digest( 'base64' );
    } else {
        var sig = Crypto.HMAC( Crypto.SHA1, string, Crypto.util.base64ToBytes( secret ), {asBytes: true} );
        return Crypto.util.bytesToBase64( sig );
    }
};

/**
 * resolves a path and querystring to a fully qualified URL if a protocol and host can be inferred. looks in atmosConfig
 * first and then window.location for a protocol, host and port to use.
 * @param {string} path the absolute path of the URL
 * @param {string=} query the querystring (without the question mark) of the URL
 * @return {string} a fully qualified URL including protocol (scheme), host and port.
 */
AtmosRest.prototype._resolveUrl = function( path, query ) {
    var url = "";
    if ( this.atmosConfig.protocol && this.atmosConfig.host ) {
        url = this.atmosConfig.protocol + "//" + this.atmosConfig.host;
        if ( this.atmosConfig.port ) url += ":" + this.atmosConfig.port;
    } else if ( typeof(window) != 'undefined' ) {
        url = window.location.protocol + "//" + window.location.host;
        if ( window.location.port > 0 ) url += ":" + window.location.port;
    }

    url += path;
    if ( query ) url += "?" + query;
    return url;
};

//
// Logging functions: see if the console is available and log to it.
//

/**
 * Outputs to the Console object (if it exists) as debug text
 * @param {string} message the string to write to the console.
 */
AtmosRest.prototype.debug = function( message ) {
    if ( !this.atmosConfig.enableDebug ) return;
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
 * @param {string} message the string to write to the console.
 */
AtmosRest.prototype.info = function( message ) {
    if ( typeof(console) !== 'undefined' && typeof(console.info) !== 'undefined' ) {
        console.info( message );
    }
};

/**
 * Outputs to the Console object (if it exists) as warning text
 * @param {string} message the string to write to the console.
 */
AtmosRest.prototype.warn = function( message ) {
    if ( typeof(console) !== 'undefined' && typeof(console.warn) !== 'undefined' ) {
        console.warn( message );
    }
};

/**
 * Outputs to the Console object (if it exists) as error text
 * @param {string} message the string to write to the console.
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
}
