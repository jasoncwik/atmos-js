/**
 * 
 */

// Check to make sure jQuery is loaded
if( !window.$ ) {
	alert( "Please load jQuery before atmos-js" );
}

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

/**
 * The AtmosResult object is returned to all of the
 * asynchronous callbacks.  See individual functions
 * to determine the contents of the result object.
 * @param success
 * @param state
 * @class creates a new AtmosResult object
 */
function AtmosResult( success, state ) {
	this.success = success;
	this.state = state;
}


/**
 * ACL objects contain two properties: useracl and groupacl
 * Each of those properties should be an Array of AclEntry 
 * objects.
 * @class Creates a new ACL
 */
function Acl( useracl, groupacl ) {
	this.useracl = useracl;
	this.groupacl = groupacl;
}

/**
 * Defines an entry on an ACL.  Use of this class is optional, you
 * can simply define with JSON, e.g.
 * [ {key=AclEntry.GROUPS.OTHER,value=AclEntry.ACL_PERMISSIONS.READ} ]
 * @class Constructs a new ACL Entry
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
 * Constructs a new AtmosRest object.
 * 
 * @param {Object} atmosConfig the Atmos configuration object. Possible settings:
 * 
 * <ul>
 * <li>uid (required): the Atmos UID for the connection
 * <li>secret (required): the Atmos shared secret key for the connection
 * </ul>
 * 
 * @class Provides access to the EMC Atmos REST API through JavaScript
 */
function AtmosRest( atmosConfig ) {
	this.atmosConfig = atmosConfig;
	
	this.info( "AtmosRest loaded" );
}

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
	
	this._restPost( this.context + '/objects', headers, data, null, mimeType, state, callback, function(jqXHR, state, callback) {
		me._createObjectHandler(jqXHR, state, callback); } );

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
	
	this._restPost( this._getPath(path), headers, data, null, mimeType, state, callback, function(jqXHR, state, callback) {
		me._createObjectHandler(jqXHR, state, callback); } );

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
	
	this._restDelete(this._getPath(id), headers, state, callback, function(jqXHR, state, callback) {
		me._genericHandler(jqXHR, state, callback);
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
	
	this._restGet(this._getPath(id), headers, range, state, callback, function(jqXHR, state, callback) {
		me._readObjectHandler(jqXHR, state, callback);
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
	headers["X-Emc-Useracl"] = this._processAclEntries( acl.useracl );
	headers["X-Emc-Groupacl"] = this._processAclEntries( acl.groupacl );
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
		headers["X-Emc-Meta-Listable"] = this._processMetaList( meta );
	} else {
		headers["X-Emc-Meta"] = this._processMetaList( meta );
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
		if( value != "" ) {
			value += ",";
		}
		value += prop + "=" + meta[prop];
	}
	
	return value;
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
 */
AtmosRest.prototype._restPost = function( uri, headers, data, range, mimeType, state, callback, handler ) {
	headers["X-Emc-Date"] = new Date().toGMTString();
	if( mimeType == "" || mimeType == undefined) {
		mimeType = "text/plain;charset=UTF-8";
	}
	
	// The browser will append this on the way out.  Do it ourselves
	// so it gets into our signature.
	if ( mimeType.indexOf("charset") == -1 ){ 
		mimeType += "; charset=UTF-8";
	}

	this._signRequest( 'POST', headers, mimeType, range, uri);
	var errorHandler = this._handleError;
	var setHeaders = this._setHeaders;
	$.ajax({
		url: uri,
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
		success: function( data, textStatus, jqXHR ) {
			handler( jqXHR, state, callback );
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
	headers["X-Emc-Date"] = new Date().toGMTString();

	this._signRequest( 'DELETE', headers, null, null, uri);
	var errorHandler = this._handleError;
	var setHeaders = this._setHeaders;
	$.ajax({
		type: "DELETE",
		url: uri,
		beforeSend: function(jqXHR, settings) {
			setHeaders(jqXHR, headers);
		},
		error: function( jqXHR, textStatus, errorThrown) {
			errorHandler( jqXHR, textStatus + " " + errorThrown, state, callback );
		},
		success: function( data, textStatus, jqXHR ) {
			handler( jqXHR, state, callback );
		}
	});
	
};

/**
 * Performs a REST GET operation
 * @param uri
 * @param headers
 * @param range
 * @param state
 * @param callback
 * @param handler
 */
AtmosRest.prototype._restGet = function(uri, headers, range, state, callback, handler) {
	headers["X-Emc-Date"] = new Date().toGMTString();
	
	this._signRequest( 'GET', headers, null, range, uri);
	var errorHandler = this._handleError;
	var setHeaders = this._setHeaders;
	$.ajax({
		type: "GET",
		url: uri,
		beforeSend: function(jqXHR, settings) {
			setHeaders(jqXHR, headers);
		},
		error: function( jqXHR, textStatus, errorThrown) {
			errorHandler( jqXHR, textStatus + " " + errorThrown, state, callback );
		},
		success: function( data, textStatus, jqXHR ) {
			handler( jqXHR, state, callback );
		}
	});
};

/**
 * Sets the headers on the XMLHttpRequest
 * @param {jqXHR} jqXHR the JQuery XMLHttpRequest
 * @param {Object} headers the property hash containing the header values to set
 */
AtmosRest.prototype._setHeaders = function( jqXHR, headers ) {
	for(var prop in headers){
		jqXHR.setRequestHeader( prop, headers[prop] );
	}
};

/**
 * Processes the create object response and extracts the new object ID
 * @param {jqXHR} jqXHR the JQuery XHR object containing the response
 * @param {Object} state the user's state object
 * @param {function} callback the user's callback function
 */
AtmosRest.prototype._createObjectHandler = function( jqXHR, state, callback ) {
	// Extract the new ObjectId and return
	var location = jqXHR.getResponseHeader('location');
	
	var matches = location.match( AtmosRest.locationMatch );
	if( matches == null ) {
		var err = new AtmosResult( false, state );
		err.message = "Could not find location in " + location;
		callback(err);
	}
	
	var result = new AtmosResult( true, state );
	result.httpCode = jqXHR.status;
	result.httpMessage = jqXHR.statusText;
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
 * Signs the REST request
 * @param {String} method the HTTP method (GET, PUT, DELETE, POST, HEAD)
 * @param {Object} headers the object containing the HTTP headers as properties
 * @param {String} content_type the MIME type of the request body
 * @param {AtmosRange} range the range, if requested
 * @param {String} uri the path to the request
 * @returns
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

	emcheaders["X-Emc-Uid"] = this.atmosConfig.uid;
	var hash_string = this._buildHashString(method, content_type, '', 
			headers["Date"], uri, emcheaders);
	
	this.debug( "HashString:\n" + hash_string );
	
	signature = this._doSignature(hash_string,this.atmosConfig.secret);
	
	this.debug( "Signature: " + signature );
	emcheaders["X-Emc-Signature"] = signature;
	if( content_type != null ) {
		emcheaders["content-type"] = content_type;
	}
	
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
	    if(headers.hasOwnProperty(prop)) {
	    	this.debug("headers: prop: " + prop + " value: " + emcheaders[prop]);
	    
	    	
			var key = this._normalizeWS(prop.toLowerCase().trim());
			if( key.indexOf("x-emc") != 0) {
				this.debug( "Skipping " + key );
				continue;
			}
			
			var value = this._normalizeWS(headers[prop].trim());
			emcheaders[key] = value;
	    }
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
	    if(obj.hasOwnProperty(prop)) {
	    	keys.push( prop );
	    }
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
	var sig = Crypto.HMAC(Crypto.SHA1,string, Crypto.util.base64ToBytes(secret), {asBytes:true});	
	return Crypto.util.bytesToBase64(sig);		
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