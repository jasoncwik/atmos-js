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
if( typeof(require) != 'undefined' ) {
	// We're running inside node.js
	var crypto = require( 'crypto' );
	var jsdom = require('jsdom');
	var XMLHttpRequest = require( 'lib/XMLHttpRequest.js' ).XMLHttpRequest;

	isNodejs = true;
} else {
	///////////////////////////////////////////////////
	// Array function backported from JavaScript 1.6 //
	// Needed by some browsers                       //
	///////////////////////////////////////////////////
	if (!Array.prototype.forEach)
	{
	  Array.prototype.forEach = function(fun /*, thisp*/)
	  {
	    var len = this.length;
	    if (typeof fun != "function")
	      throw new TypeError();

	    var thisp = arguments[1];
	    for (var i = 0; i < len; i++)
	    {
	      if (i in this)
	        fun.call(thisp, this[i], i, this);
	    }
	  };
	}

	//////////////////////////////////////////////////
	// String function backported from ECMAScript-5 //
	// Needed by some browsers                      //
	//////////////////////////////////////////////////
	if(!String.prototype.trim) {
		String.prototype.trim = function() {
		    return this.replace(/^\s+|\s+$/g,"");
		};
	}

	//////////////////////////////////////////////////
	// dump function for use in debugging           //
	// (recursive)                                  //
	//////////////////////////////////////////////////
    if(!Object.prototype.dump) {
        Object.prototype.dump = function() {
            var output = "[";
            for (var property in this) {
                if (!this.hasOwnProperty(property)) continue;
                var value = this[property];
                if (typeof(value) === 'object') value = value.dump();
                output += property + "=" + value + ", ";
            }
            output = output.substr(0, output.length - 2) + "]";
            return output;
        };
    }

}


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
 * ACL objects contain two properties: useracl and groupacl
 * Each of those properties should be an Array of AclEntry
 * objects.
 * @class Acl
 */
function Acl( useracl, groupacl ) {
	this.useracl = useracl;
	this.groupacl = groupacl;
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
 * Creates a new ObjectResult
 * @param {String} objectId the object's identifier
 * @param {Object} userMeta an object containing the user metadata properties
 * @param {Object} listableUserMeta an object containing the listable user metadata properties
 * @param {Object} systemMeta an object containing the system metadata properties
 * @class ObjectResult.
 */
function ObjectResult( objectId, userMeta, listableUserMeta, systemMeta ) {
	this.objectId = objectId;
	this.userMeta = userMeta;
	this.listableUserMeta = listableUserMeta;
	this.systemMeta = systemMeta;
}

/**
 * Creates a new DirectoryEntry
 * @param path the full path of the object
 * @param name the name of the object (excluding path info)
 * @param objectId the object's identifier
 * @param type the type of object ("directory" or "regular")
 * @class DirectoryEntry
 */
function DirectoryEntry( path, name, objectId, type ) {
    this.path = path;
    this.name = name;
    this.objectId = objectId;
    this.type = type;
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
 * Creates an object in Atmos
 * @param {Acl} acl an Acl for the new object.  If null, the object will get the default Acl.
 * @param {Object} meta regular Metadata for the new object.  May be null for no regular metadata.
 * @param {Object} listableMeta listable Metadata for the new object.  May be null for no listable metadata.
 * @param {String} data the data for the new object.
 * @param {String} mimeType the mimeType for the new object.  If null, the object will be assigned application/octet-stream.
 * @param {Object} state the user-defined state object passed to the callback
 * @param {function} callback the callback for when the function completes.  Should have the signature function(result)
 * where result will be an AtmosResult object.  The created Object ID will be in the objectId field of the result object.
 */
AtmosRest.prototype.createObject = function( acl, meta, listableMeta, data, mimeType, state, callback ) {

	var headers = new Object();
	var me = this;

	this._processAcl( acl, headers );
	this._processMeta( meta, headers, false );
	this._processMeta( listableMeta, headers, true );

	this._restPost( this.context + '/objects', headers, data, null, mimeType, state, callback, function(xhr, state, callback) {
		me._createObjectHandler(xhr, state, callback); } );

};

/**
 * Creates an object in Atmos on the path provided.
 *
 * @param {String} path the namespace path in Atmos (must start with a slash)
 * @param {Acl} acl an Acl for the new object.  If null, the object will get the default Acl.
 * @param {Object} meta regular Metadata for the new object.  May be null for no regular metadata.
 * @param {Object} listableMeta listable Metadata for the new object.  May be null for no listable metadata.
 * @param {String} data the data for the new object.
 * @param {String} mimeType the mimeType for the new object.  If null, the object will be assigned application/octet-stream.
 * @param {Object} state the user-defined state object passed to the callback
 * @param {function} callback the callback for when the function completes.  Should have the signature function(result)
 * where result will be an AtmosResult object.  The created Object ID will be in the objectId field of the result object.
 */
AtmosRest.prototype.createObjectOnPath = function( path, acl, meta, listableMeta, data, mimeType, state, callback ) {
	if( !AtmosRest.objectPathMatch.test(path) ) {
		throw "The path '" + path + "' is not valid";
	}
	var headers = new Object();
	var me = this;

	this._processAcl( acl, headers );
	this._processMeta( meta, headers, false );
	this._processMeta( listableMeta, headers, true );

	this._restPost( this._getPath(path), headers, data, null, mimeType, state, callback, function(xhr, state, callback) {
		me._createObjectHandler(xhr, state, callback); } );

};


/**
 * Creates a shareable URL that anyone (globally) can access.
 *
 * @param id the object ID or path for which to generate the URL
 * @param expirationDate the expiration date of the URL (as
 * @return a URL that can be used to share the object's content
 */
AtmosRest.prototype.getShareableUrl = function( id, expirationDate ) {
    if (!expirationDate.getTime) {
        throw "expirationDate must be a Date object";
    }

    var expires = Math.floor(expirationDate.getTime() / 1000);

    var hash_string = "GET\n" + this._getPath(id).toLowerCase() + "\n" + this.atmosConfig.uid + "\n" + expires;

    var signature = this._doSignature(hash_string, this.atmosConfig.secret);

    var query = "uid=" + escape(this.atmosConfig.uid) + "&expires=" + expires +
        "&signature=" + escape(signature);

    var port = '';
    if (window.location.protocol === "http" && window.location.port == 80) {
    } else if (window.location.protocol === "https" && window.location.port == 443) {
    } else if (!window.location.port) {
    } else {
        port = ':' + window.location.port;
    }

    return window.location.protocol + "//" + window.location.host + port + this._getPath(id) + "?" + query;
};


/**
 * Deletes an object from Atmos.
 * @param {String} id an object identifier (either an object path or object id)
 * @param {Object} state the user-defined state object passed to the callback
 * @param {function} callback the completion callback (both error and success).
 */
AtmosRest.prototype.deleteObject = function( id, state, callback ) {
	var headers = new Object();
	var me = this;

	this._restDelete(this._getPath(id), headers, state, callback, function(xhr, state, callback) {
		me._genericHandler(xhr, state, callback);
	});
};

/**
 * Reads the contents of an object from Atmos
 * @param {String} id the object identifier (either an object path or an object id)
 * @param {AtmosRange} range the range of the object to read, pass null to read the entire object.
 * @param {Object} state the user-defined state object passed to the callback
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's content will be returned in the data property of the result object.
 */
AtmosRest.prototype.readObject = function( id, range, state, callback ) {
	var headers = new Object();
	var me = this;

	this._restGet(this._getPath(id), headers, range, state, callback, function(xhr, state, callback) {
		me._readObjectHandler(xhr, state, callback);
	});

};

/**
 * Reads the user metadata for an object.
 * @param {String} id the object identifier (either an Object ID or an Object Path)
 * @param {Array} filter if not null, an array of strings defining which metadata tags should be returned.
 * @param {Object} state the user-defined state object passed to the callback
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the object's metadata will be returned in the meta property of the result object and the
 * listable metadata will be returned in the listableMeta property.
 */
AtmosRest.prototype.getUserMetadata = function( id, filter, state, callback ) {
	var headers = new Object();
	var me = this;

	if( filter ) {
		headers["x-emc-tags"] = filter.join(",");
	}

	this._restGet(this._getPath(id) + "?metadata/user", headers, null, state, callback,
			function(xhr, state, callback) {
		me._readUserMetadataHandler(xhr, state, callback);
	});
};

/**
 * Lists objects from the server using a listable tag.
 * @param {String} tag the listable tag to search
 * @param {ListOptions} options for listing objects.  See the ListOptions class.
 * @param {Object} state the user-defined state object that will be passed to the callback
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the result's results property will be populated with an Array of ObjectResult objects.  Also
 * be sure to check the value of the token property.  If defined, you did not receive all results
 * and should call this method again using the token inside a ListOptions object to continue
 * your listing.
 */
AtmosRest.prototype.listObjects = function( tag, options, state, callback ) {
	var headers = new Object();
	var me = this;

	if( !tag ) {
		throw "Tag cannot be null";
	}

	headers["x-emc-tags"] = tag;

    this._addListOptions(headers, options);

	this._restGet(this.context + "/objects", headers, null, state, callback,
			function(xhr, state, callback) {
		me._handleListObjectsResponse(xhr, state, callback);
	});
};

/**
 * Lists objects from the server within a directory (path).
 * @param {String} directory the directory (path) in which to list objects (must exist!)
 * @param {ListOptions} options for listing objects.  See the ListOptions class. NOTE: metadata cannot be returned in
 * this call (Atmos 1.2)
 * @param {Object} state the user-defined state object that will be passed to the callback
 * @param {function} callback the completion callback (both error and success).  Upon success,
 * the result's results property will be populated with an Array of ObjectResult objects.  Also
 * be sure to check the value of the token property.  If defined, you did not receive all results
 * and should call this method again using the token inside a ListOptions object to continue
 * your listing.
 */
AtmosRest.prototype.listDirectory = function( directory, options, state, callback ) {
	var headers = new Object();
	var me = this;

	if( !directory ) {
		throw "Directory cannot be null";
	}
    if ( directory.substr(-1) !== "/" ) {
        throw "Directory must end with a slash";
    }

    this._addListOptions(headers, options);

	this._restGet(this.context + "/namespace" + directory, headers, null, state, callback,
			function(xhr, state, callback) {
		me._handleListDirectoryResponse(directory, xhr, state, callback);
	});
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
	if( AtmosRest.objectPathMatch.test(id) ) {
		return this.context + "/namespace" + id;
	} else {
		return this.context + "/objects/" + id;
	}
};

/**
 * Compile an Acl object into a String
 */
AtmosRest.prototype._processAcl = function( acl, headers ) {
	if( acl == null ) {
		return;
	}
	headers["x-emc-useracl"] = this._processAclEntries( acl.useracl );
	headers["x-emc-groupacl"] = this._processAclEntries( acl.groupacl );
};

/**
 * Compile an Array of AclEntry objects into a String
 */
AtmosRest.prototype._processAclEntries = function( entries ) {
	if( entries == undefined || entries.length < 1 ) {
		return null;
	}

	var value = "";

	for( var i=0; i<entries.length; i++ ) {
		if( i>0 ) {
			value += ",";
		}
		value += entries[i].key + "=" + entries[i].value;
	}
};

/**
 * Compiles a list of metadata into a header value
 */
AtmosRest.prototype._processMeta = function( meta, headers, listable ) {
	if( meta == null ) {
		return;
	}
	if( listable ) {
		headers["x-emc-listable-meta"] = this._processMetaList( meta );
	} else {
		headers["x-emc-meta"] = this._processMetaList( meta );
	}
};

/**
 * Processes the metadata list object and returns the header value
 * @param {Object} meta
 * @returns {String} the string formatted for the header value
 */
AtmosRest.prototype._processMetaList = function( meta ) {
	var value = "";
	for( prop in meta ) {
        if (!meta.hasOwnProperty(prop)) continue;
		if( value != "" ) {
			value += ",";
		}
		value += prop + "=" + meta[prop];
	}

	return value;
};

/**
 * Adds headers for the list options
 * @param headers {Map} the existing headers map
 * @param options {ListOptions} the desired list options
 */
AtmosRest.prototype._addListOptions = function( headers, options ) {
    if( options ) {
        if( options.limit ) {
            headers["x-emc-limit"] = ""+options.limit;
        }
        if( options.token ) {
            headers["x-emc-token"] = options.token;
        }
        if( options.includeMeta ) {
            headers["x-emc-include-meta"] = "1";
            if( options.userMetaTags ) {
                headers["x-emc-user-tags"] = options.userMetaTags.join(",");
            }
            if( options.systemMetaTags ) {
                headers["x-emc-system-tags"] = options.systemMetaTags.join(",");
            }
        }
    }
};

/**
 * Performs a REST POST operation
 * @param {String} uri the request URI
 * @param {Object} headers an object hash of the header values
 * @param {String} data the content for the request
 * @param {AtmosRange} range the HTTP range value, if required
 * @param {String} mimeType the mimeType of the data
 * @param {Object} state the user's state object
 * @param {function} callback the user's callback
 * @param {function} handler the response processing handler function
 * @param {function} progress an optional function to track upload progress
 */
AtmosRest.prototype._restPost = function( uri, headers, data, range, mimeType, state, callback, handler, progress ) {
	headers["x-emc-date"] = new Date().toGMTString();
	if( mimeType == "" || mimeType == undefined) {
		mimeType = "text/plain; charset=UTF-8";
	}

	// The browser will append this on the way out.  Do it ourselves
	// so it gets into our signature.
	if ( mimeType.indexOf("charset") == -1 ){
		mimeType += "; charset=UTF-8";
	}

	this._signRequest( 'POST', headers, mimeType, range, uri);
	var errorHandler = this._handleError;
	var setHeaders = this._setHeaders;
	this._ajax({
		url: this._encodeURI(uri),
		data: data,
		dataType: "text",
		processData: false,
		mimeType: mimeType,
		beforeSend: function(jqXHR, settings) {
			setHeaders(jqXHR, headers);
		},
		error: function( jqXHR, textStatus, errorThrown) {
			errorHandler( jqXHR, textStatus + " " + errorThrown, state, callback );
		},
		type: "POST",
		success: function( textStatus, jqXHR ) {
			handler( jqXHR, state, callback );
		},
        progress: function( progressPercent ) {
            if ( progress ) progress( progressPercent );
        }
	});

};

/**
 * Performs a REST DELETE operation
 * @param {String} uri the request URI
 * @param {Object} headers an object property hash of the header values
 * @param {String} state the user's state object
 * @param {function} callback the user's callback function
 * @param {function} handler the response processing function
 */
AtmosRest.prototype._restDelete = function( uri, headers, state, callback, handler ) {
	headers["x-emc-date"] = new Date().toGMTString();

	this._signRequest( 'DELETE', headers, null, null, uri);
	var errorHandler = this._handleError;
	var setHeaders = this._setHeaders;
	this._ajax({
		type: "DELETE",
		url: this._encodeURI(uri),
		beforeSend: function(jqXHR, settings) {
			setHeaders(jqXHR, headers);
		},
		error: function( jqXHR, textStatus, errorThrown) {
			errorHandler( jqXHR, textStatus + " " + errorThrown, state, callback );
		},
		success: function( textStatus, jqXHR ) {
			handler( jqXHR, state, callback );
		}
	});

};

/**
 * Performs a REST GET operation
 * @param {String} uri
 * @param {Object} headers
 * @param {AtmosRange} range
 * @param {Object} state
 * @param {function} callback
 * @param {function} handler
 */
AtmosRest.prototype._restGet = function(uri, headers, range, state, callback, handler) {
	headers["x-emc-date"] = new Date().toGMTString();

	this._signRequest( 'GET', headers, null, range, uri);
	var errorHandler = this._handleError;
	var setHeaders = this._setHeaders;
	this._ajax({
		type: "GET",
		url: this._encodeURI(uri),
		beforeSend: function(jqXHR, settings) {
			setHeaders(jqXHR, headers);
		},
		error: function( jqXHR, textStatus, errorThrown) {
			errorHandler( jqXHR, textStatus + " " + errorThrown, state, callback );
		},
		success: function( textStatus, jqXHR ) {
			handler( jqXHR, state, callback );
		}
	});
};

/**
 * Simulates a jQuery ajax call
 * @param {Object} options the options for the call
 */
AtmosRest.prototype._ajax = function( options ) {
	// If a cross-domain request...
	if( this.atmosConfig.host && this.atmosConfig.protocol ) {
		options.url = this.atmosConfig.protocol + "://" + this.atmosConfig.host + options.url;
	}

	var xhr = this._getXMLHttpRequest();
	var me = this;
	xhr.onreadystatechange = function(evt) {
		me._onreadystatechange( evt, options, xhr );
	};
    xhr.onprogress = function(evt) {
        me._onprogress( evt, options, xhr );
    };
	xhr.open( options.type, options.url, true );
	if(options.beforeSend) {
		options.beforeSend( xhr, options );
	}

	if( options.mimeType ) {
		xhr.setRequestHeader( "Content-Type", options.mimeType );
	}


	if( options.data ) {
		xhr.send(options.data);
	} else {
		xhr.send();
	}
};

AtmosRest.prototype._getXMLHttpRequest = function()
{
	if( isNodejs ) {
		return new XMLHttpRequest();
	}

    if (window.XMLHttpRequest) {
        return new window.XMLHttpRequest;
    }
    else {
        try {
            return new ActiveXObject("MSXML2.XMLHTTP.3.0");
        }
        catch(ex) {
            return null;
        }
    }
}

/**
 * Handles asynchronous events from XHR.
 * @param {Event} evt the XMLHttpRequest event
 * @param {Object} the ajax options object
 * @param {XMLHttpRequest} xhr the request object
 */
AtmosRest.prototype._onreadystatechange = function( evt, options, xhr ) {
	if( xhr.readyState == 4 ) {
		if( xhr.status < 400 ) {
			options.success( xhr.statusText, xhr );
		} else {
			options.error( xhr, xhr.statusText, "" );
		}
	}
};

AtmosRest.prototype._onprogress = function( evt, options, xhr ) {
    if ( evt.lengthComputable ) {
        var progressPercent = ( evt.loaded / evt.total ) * 100;
        options.progress( progressPercent );
    }
};

/**
 * Sets the headers on the XMLHttpRequest
 * @param {XMLHttpRequest} xhr the XMLHttpRequest
 * @param {Object} headers the property hash containing the header values to set
 */
AtmosRest.prototype._setHeaders = function( xhr, headers ) {
	for(var prop in headers) {
        if (!headers.hasOwnProperty(prop)) continue;
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
	if( queryIndex != -1 ) {
		query = uri.substring( queryIndex );
		uri = uri.substring( 0, queryIndex );
	}
	var parts = uri.split( "/" );
	var outURI = "";
	for( var i=0; i<parts.length; i++ ) {
		parts[i] = encodeURIComponent(parts[i]);
	}
	outURI = parts.join( "/" );

	if( queryIndex != -1 ) {
		outURI += encodeURI(query);
	}

	this.debug( "encodeURI: out: " + outURI );

	return outURI;
};

/**
 * Processes the create object response and extracts the new object ID
 * @param {XMLHttpRequest} xhr the XHR object containing the response
 * @param {Object} state the user's state object
 * @param {function} callback the user's callback function
 */
AtmosRest.prototype._createObjectHandler = function( xhr, state, callback ) {
	// Extract the new ObjectId and return
	var location = xhr.getResponseHeader('location');

	this.debug( "location: " + location );

	var matches = location.match( AtmosRest.locationMatch );
	if( matches == null ) {
		var err = new AtmosResult( false, state );
		err.message = "Could not find location in " + location;
		callback(err);
	}

	var result = new AtmosResult( true, state );
	result.httpCode = xhr.status;
	result.httpMessage = xhr.statusText;
	result.objectId = matches[1];
	this.debug( "Location: " + result.objectId );
	callback(result);
};

/**
 * Processes the read object response and extracts the data.
 * @param {jqXHR} jqXHR the JQuery XHR object containing the response
 * @param {Object} state the user's state object
 * @param {function} callback the user's callback function
 */
AtmosRest.prototype._readObjectHandler = function( jqXHR, state, callback ) {
	var result = new AtmosResult( true, state );
	result.httpCode = jqXHR.status;
	result.httpMessage = jqXHR.statusText;
	result.data = jqXHR.responseText;
	callback(result);
};

/**
 * Handles the readUserMetadata response.  Parses the lists of metadata and listable metadata.
 * @param {jqXHR} jqXHR the JQuery XHR object
 * @param {Object} state the user's state object
 * @param {function} callback the user's callback function
 */
AtmosRest.prototype._readUserMetadataHandler = function( jqXHR, state, callback ) {
	var result = new AtmosResult( true, state );

	result.meta = this._parseMetadata( jqXHR.getResponseHeader( "x-emc-meta" ) );
	result.listableMeta = this._parseMetadata( jqXHR.getResponseHeader( "x-emc-listable-meta" ) );

	callback(result);
};

/**
 * Parses a metadata value string into a property object
 * @param {String} value the metadata value string
 * @returns {Object} a property object containing the values
 */
AtmosRest.prototype._parseMetadata = function( value ) {
	if( typeof(value) == 'undefined' || value == null ) {
		return null;
	}

	var result = {};

	var values = value.split(",");
	for( var i=0; i<values.length; i++ ) {
		var nvpair = values[i].split("=", 2);
		var name = nvpair[0].trim();
		if( nvpair.length == 1 ) {
			result[name] = "";
		} else {
			result[name] = nvpair[1];
		}
	}

	return result;
};

/**
 * Response handler for responses that no not require any specific
 * handling.
 */
AtmosRest.prototype._genericHandler = function( jqXHR, state, callback ) {
	var result = new AtmosResult( true, state );
	result.httpCode = jqXHR.status;
	result.httpMessage = jqXHR.statusText;

	callback(result);
};

/**
 * Error handler.  Used by most functions.
 */
AtmosRest.prototype._handleError = function( jqXHR, message, state, callback ) {
	var result = new AtmosResult( false, state );
	result.errorMessage = message;
	result.httpCode = jqXHR.status;
	result.httpMessage = jqXHR.statusText;

	callback( result );
};

/**
 * Handles the response from the ListObjects method
 * @param {XMLHttpRequest} xhr the XHR object
 *
 */
AtmosRest.prototype._handleListObjectsResponse = function( xhr, state, callback ) {
	var result = new AtmosResult( true, state );
	result.httpCode = xhr.status;
	result.httpMessage = xhr.statusText;
	result.token = xhr.getResponseHeader("x-emc-token");

	var doc = null;

	if( isNodejs ) {
		// NodeJS doesn't have an XML parser yet; use the jsdom parser.
		doc = jsdom.jsdom(xhr.responseText);
	} else {
		doc = xhr.responseXML;
	}

	/**
	 * @type Array
	 */
	var objects = Array();

	/**
	 * @type NodeList
	 */
	var objlist = doc.getElementsByTagName("Object");

//	this.debug( "Found " + objlist.length + " objects" );

	for( var i=0; i<objlist.length; i++ ) {
		var userMeta = null;
		var systemMeta = null;
		var userListableMeta = null;

		var node = objlist.item(i);
//		this.debug( "node is " + node );
		var oidNode = this._getChildByTagName(node, "ObjectID");
//		this.debug( "oidNode is " + oidNode );
		var smNode = this._getChildByTagName(node, "SystemMetadataList");
		var umNode = this._getChildByTagName(node, "UserMetadataList");

		if( smNode ) {
			systemMeta = new Object();
			this._parseResponseMeta( smNode.childNodes, systemMeta, null );
		}
		if( umNode ) {
			userMeta = new Object();
			userListableMeta = new Object();
			this._parseResponseMeta( umNode.childNodes, userMeta, userListableMeta );
		}

		var obj = new ObjectResult( this._getText(oidNode), userMeta, userListableMeta, systemMeta );
		objects.push(obj);
	}

	result.results = objects;
	callback(result);
};

/**
 * Handles the response from the ListDirectory method
 * @param {XMLHttpRequest} xhr the XHR object
 *
 */
AtmosRest.prototype._handleListDirectoryResponse = function( directoryPath, xhr, state, callback ) {
	var result = new AtmosResult( true, state );
	result.httpCode = xhr.status;
	result.httpMessage = xhr.statusText;
	result.token = xhr.getResponseHeader("x-emc-token");

	var doc = null;

	if( isNodejs ) {
		// NodeJS doesn't have an XML parser yet; use the jsdom parser.
		doc = jsdom.jsdom(xhr.responseText);
	} else {
		doc = xhr.responseXML;
	}

	/**
	 * @type Array
	 */
	var entries = Array();

	/**
	 * @type NodeList
	 */
	var dirlist = doc.getElementsByTagName("DirectoryEntry");

	for( var i=0; i<dirlist.length; i++ ) {
		var node = dirlist.item(i);
		var oidNode = this._getChildByTagName(node, "ObjectID");
        var pathName = this._getChildByTagName(node, "Filename");
        var type = this._getChildByTagName(node, "FileType");

		var entry = new DirectoryEntry( directoryPath + this._getText(pathName), this._getText(pathName), this._getText(oidNode), this._getText(type) );
		entries.push(entry);
	}

	result.results = entries;
	callback(result);
};

/**
 * Parses object metadata for an object listing result
 * @param {NodeList} nodeList the node list containing Metadata
 * @param {Object} regMeta property object to populate with regular metadata
 * @param {Object} listableMeta property object to populate with listable metadata
 */
AtmosRest.prototype._parseResponseMeta = function( nodeList, regMeta, listableMeta ) {
	for( var i=0; i<nodeList.length; i++ ) {
		var child = nodeList.item(i);
		if(  !/Metadata/i.test(child.nodeName) ) {
			continue;
		}
		var metaName = this._getText( this._getChildByTagName(child, "Name") );
		var metaValue = this._getText( this._getChildByTagName(child, "Value") );
		var listableNode = this._getChildByTagName(child, "Listable");
		if( listableNode) {
			if( this._getText(listableNode) == "true" ) {
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
	var reg = new RegExp(tagName, "i"); // jsnode uses HTML uppercase names, so do insensitive
	var children = node.childNodes;
//	this.debug( "found " + children.length + " child nodes" );
	for( var i=0; i<children.length; i++ ) {
		var child = children.item(i);
		if( child.nodeType != 1 ) {
			continue; // not an element
		}
//		this.debug( "child " + child.tagName );
		if( reg.test(child.nodeName) ) {
			return child;
		}
	}
	return null;
};

/**
 * Gets the text from a node
 * @param {Node} node the node to collect text from
 * @return {String} the node's child text
 */
AtmosRest.prototype._getText = function( node ) {
	var children = node.childNodes;
	var text = "";
	for( var i=0; i<children.length; i++ ) {
		var child = children.item(i);
		if( child.nodeType == 3 ) { // Text node
			text += child.data;
		}
	}

	return text;
};

/**
 * Signs the REST request
 * @param {String} method the HTTP method (GET, PUT, DELETE, POST, HEAD)
 * @param {Object} headers the object containing the HTTP headers as properties
 * @param {String} content_type the MIME type of the request body
 * @param {AtmosRange} range the range, if requested
 * @param {String} uri the path to the request
 */
AtmosRest.prototype._signRequest = function( method, headers, content_type, range, uri ) {
	this.debug( this.atmosConfig.uid );
	this.debug( this.atmosConfig.secret );
	var emcheaders;
	if (headers == "") {
	    emcheaders= new Hash();
	} else {
	    emcheaders = headers;
	}

	emcheaders["x-emc-uid"] = this.atmosConfig.uid;
	var hash_string = this._buildHashString(method, content_type, '',
			headers["Date"], uri, emcheaders);

	this.debug( "HashString:\n" + hash_string );

	signature = this._doSignature(hash_string,this.atmosConfig.secret);

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
AtmosRest.prototype._buildHashString = function(method, content_type, range, date, path, headers){

	var emcheaders = new Object();
	var string = "";
	string = method + "\n";

	if (content_type) {
	    string += content_type + "\n";
	} else {
	    string +="\n";
	}
	if (range) {
	    string += range + "\n";
	} else {
	    string +="\n";
	}
	if (date) {
	    string += date+'\n';
	} else {
	    string +="\n";
	}

	string += path.toLowerCase().trim() + "\n";

	for(var prop in headers) {
        if (!headers.hasOwnProperty(prop)) continue;
        this.debug("headers: prop: " + prop + " value: " + headers[prop]);


        var key = this._normalizeWS(prop.toLowerCase().trim());
        if( key.indexOf("x-emc") != 0) {
            this.debug( "Skipping " + key );
            continue;
        }

        var value = this._normalizeWS(headers[prop].trim());
        emcheaders[key] = value;
	}

	var keys = this._getKeys(emcheaders);
	this.debug( "keys " + keys );

	keys.sort().forEach (function (k) {
		string += k+":" + emcheaders[k] + "\n";
	    });

	return string.trim();
};

/**
 * Normalizes the whitespace in an object (condenses multiple spaces into one space)
 * @param {String} str the string to process
 * @returns {String} the output string
 */
AtmosRest.prototype._normalizeWS = function(str) {
    str = str.replace(/\n/," ");
    return str.replace(/\s+/," ");
};

/**
 * Lists the keys in an object
 * @param {Object} obj the object to enumerate
 * @returns {Array} the list of keys in the object
 */
AtmosRest.prototype._getKeys = function(obj) {
	var keys = Array();
	for(var prop in obj) {
        if (!obj.hasOwnProperty(prop)) continue;
        keys.push( prop );
	}
	return keys;
};

/**
 * Signs a string using HMAC-SHA1
 * @param {String} string the string content to sign
 * @param {String} secret the secret key, base-64 encoded.
 * @returns {String} the signature, base-64 encoded.
 */
AtmosRest.prototype._doSignature = function(string, secret) {
	this.debug( "Secret: " + secret );

	if( isNodejs ) {
		var key = new Buffer(secret, 'base64');
		var hmac = crypto.createHmac( "sha1", key.toString('binary') );
		hmac.update(string);
		return hmac.digest('base64');
	} else {
		var sig = Crypto.HMAC(Crypto.SHA1,string, Crypto.util.base64ToBytes(secret), {asBytes:true});
		return Crypto.util.bytesToBase64(sig);
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
	if( typeof(console) !== 'undefined' ) {
		if( typeof(console.debug) !== 'undefined' ) {
			console.debug( message );
		} else if( typeof(console.log) !== 'undefined' ) {
			console.log( message );
		}
	}
};

/**
 * Outputs to the Console object (if it exists) as info text
 * @param message the string to write to the console.
 */
AtmosRest.prototype.info = function( message ) {
	if( typeof(console) !== 'undefined' && typeof(console.info) !== 'undefined' ) {
		console.info( message );
	}
};

/**
 * Outputs to the Console object (if it exists) as warning text
 * @param message the string to write to the console.
 */
AtmosRest.prototype.warn = function( message ) {
	if( typeof(console) !== 'undefined' && typeof(console.warn) !== 'undefined' ) {
		console.warn( message );
	}
};

/**
 * Outputs to the Console object (if it exists) as error text
 * @param message the string to write to the console.
 */
AtmosRest.prototype.error = function( message ) {
	if( typeof(console) !== 'undefined' && typeof(console.error) !== 'undefined' ) {
		console.error( message );
	}
};


////////////////////////
// Exports for NodeJS //
////////////////////////
if( typeof(exports) != 'undefined' ) {
	exports.AtmosRest = AtmosRest;
	exports.Acl = Acl;
	exports.AclEntry = AclEntry;
	exports.AtmosResult = AtmosResult;
	exports.ListOptions = ListOptions;
	exports.ObjectResult = ObjectResult;
    exports.DirectoryEntry = DirectoryEntry;
}
