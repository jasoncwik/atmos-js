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
if ( typeof(require) == 'function' && typeof(AtmosUtil) == 'undefined' ) AtmosUtil = require( './AtmosUtil' ).AtmosUtil;
/**
 * Represents an anonymous access token
 * @param {string} tokenId the identifier of the token
 * @param {AccessTokenPolicy} tokenPolicy the policy of the token
 * @param {string=} objectPath the path of the object targeted by the token (if using namespace)
 * @param {string=} objectId the OID of the object targeted by the token
 * @param {Acl=} acl the ACL assigned to an uploaded object via this access token
 * @constructor
 */
AccessToken = function( tokenId, tokenPolicy, objectPath, objectId, acl ) {
    this.tokenId = tokenId;
    this.tokenPolicy = tokenPolicy;
    this.objectPath = objectPath;
    this.objectId = objectId;
    this.acl = acl;
};

/**
 * Returns a new AccessToken object parsed from the specified XML DOM node
 * @param {Node} tokenNode an XML node containing the token's XML representation (<access-token>)
 * @return {AccessToken}
 */
AccessToken.fromNode = function( tokenNode ) {
    var token = new AccessToken();

    var node, useracl, groupacl;
    if ( node = AtmosUtil.getChildByTagName( tokenNode, 'access-token-id' ) )
        token.tokenId = AtmosUtil.getTextContent( node );
    if ( node = AtmosUtil.getChildByTagName( tokenNode, 'path' ) )
        token.objectPath = AtmosUtil.getTextContent( node );
    if ( node = AtmosUtil.getChildByTagName( tokenNode, 'object-id' ) )
        token.objectId = AtmosUtil.getTextContent( node );
    if ( node = AtmosUtil.getChildByTagName( tokenNode, 'useracl' ) )
        useracl = AccessToken._parseAclEntries( AtmosUtil.getTextContent( node ) );
    if ( node = AtmosUtil.getChildByTagName( tokenNode, 'groupacl' ) )
        groupacl = AccessToken._parseAclEntries( AtmosUtil.getTextContent( node ) );

    if ( useracl || groupacl )
        token.acl = new Acl( useracl, groupacl );

    token.tokenPolicy = AccessTokenPolicy.fromNode( tokenNode );

    return token;
};

/**
 * Parses ACL entries from a comma-delimited string
 * @param {string} text a comma-delimited string representing a user or group ACL
 */
AccessToken._parseAclEntries = function( text ) {
    var aclEntries = [];
    var grants = text.split( / *, */ );
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
 * Represents a public access token policy
 * @param {Date=} expiration the time at which this access token expires
 * @param {number=} maxUploads the maximum number of times this access token can be used to upload an object
 * @param {number=} maxDownloads the maximum number of times this access token can be used to download an object
 * @param {Array.<string>=} sourceAllowList a list of source IPs (possibly with subnets) that are allowed to use this
 * access token
 * @param {Array.<string>=} sourceDenyList a list of source IPs (possibly with subnets) that are not allowed to use this
 * access token
 * @param {number=} minSize the minimum size to accept for an uploaded object
 * @param {number=} maxSize the maximum size to accept for an uploaded object
 * @param {Array.<AccessTokenFormField>=} formFieldList a list of form field criteria that must be met for an upload
 * to be accepted
 * @constructor
 */
AccessTokenPolicy = function( expiration, maxUploads, maxDownloads, sourceAllowList, sourceDenyList, minSize, maxSize, formFieldList ) {
    this.expiration = expiration;
    this.maxUploads = maxUploads;
    this.maxDownloads = maxDownloads;
    this.sourceAllowList = sourceAllowList;
    this.sourceDenyList = sourceDenyList;
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.formFieldList = formFieldList;
};

/**
 * Returns a new AccessTokenPolicy object parsed from the specified XML DOM node
 * @param {Node} policyNode an XML node containing the policy's XML representation
 * @return {AccessTokenPolicy}
 */
AccessTokenPolicy.fromNode = function( policyNode ) {
    var policy = new AccessTokenPolicy();
    var node, nodes;
    if ( node = AtmosUtil.getChildByTagName( policyNode, 'expiration' ) )
        policy.expiration = AtmosUtil.parseIso8601Date( AtmosUtil.getTextContent( node ) );
    if ( node = AtmosUtil.getChildByTagName( policyNode, 'max-uploads' ) )
        policy.maxUploads = parseInt( AtmosUtil.getTextContent( node ) );
    if ( node = AtmosUtil.getChildByTagName( policyNode, 'max-downloads' ) )
        policy.maxDownloads = parseInt( AtmosUtil.getTextContent( node ) );
    if ( node = AtmosUtil.getChildByTagName( policyNode, 'source' ) ) {
        if ( nodes = AtmosUtil.getChildrenByTagName( node, 'allow' ) ) {
            policy.sourceAllowList = [];
            nodes.forEach( function( allowNode ) {
                policy.sourceAllowList.push( AtmosUtil.getTextContent( allowNode ) );
            } );
        }
        if ( nodes = AtmosUtil.getChildrenByTagName( node, 'disallow' ) ) {
            policy.sourceDenyList = [];
            nodes.forEach( function( denyNode ) {
                policy.sourceDenyList.push( AtmosUtil.getTextContent( denyNode ) );
            } );
        }
    }
    if ( node = AtmosUtil.getChildByTagName( policyNode, 'content-length-range' ) ) {
        policy.minSize = parseInt( node.getAttribute( 'from' ) );
        policy.maxSize = parseInt( node.getAttribute( 'to' ) );
    }
    if ( nodes = AtmosUtil.getChildrenByTagName( policyNode, 'form-field' ) ) {
        policy.formFieldList = [];
        nodes.forEach( function( fieldNode ) {
            policy.formFieldList.push( AccessTokenFormField.fromElement( fieldNode ) );
        } );
    }
    return policy;
};

/**
 * Generates the XML representation of this token policy
 * @return {Document}
 */
AccessTokenPolicy.prototype.toDocument = function() {
    var doc = AtmosUtil.createDocument();
    var policyNode = AtmosUtil.createElement( doc, 'policy' );
    doc.appendChild( policyNode );

    // expiration
    if ( this.expiration ) policyNode.appendChild( AtmosUtil.createElement( doc, 'expiration', this.expiration.toISOString() ) );

    // max uploads/downloads
    if ( this.maxUploads ) policyNode.appendChild( AtmosUtil.createElement( doc, 'max-uploads', this.maxUploads ) );
    if ( this.maxDownloads ) policyNode.appendChild( AtmosUtil.createElement( doc, 'max-downloads', this.maxDownloads ) );

    // source
    if ( (this.sourceAllowList && this.sourceAllowList.length)
        || (this.sourceDenyList && this.sourceDenyList.length) ) {
        var source = AtmosUtil.createElement( doc, 'source' );
        policyNode.appendChild( source );
        if ( this.sourceAllowList ) {
            this.sourceAllowList.forEach( function( allowItem ) {
                source.appendChild( AtmosUtil.createElement( doc, 'allow', allowItem ) );
            } );
        }
        if ( this.sourceDenyList ) {
            this.sourceDenyList.forEach( function( denyItem ) {
                source.appendChild( AtmosUtil.createElement( doc, 'disallow', denyItem ) );
            } );
        }
    }

    // content-length range
    if ( typeof(this.minSize) == 'number' || typeof(this.maxSize) == 'number' ) {
        var attributes = {};
        if ( typeof(this.minSize) == 'number' ) attributes.from = this.minSize;
        if ( typeof(this.maxSize) == 'number' ) attributes.to = this.maxSize;
        policyNode.appendChild( AtmosUtil.createElement( doc, 'content-length-range', null, attributes ) );
    }

    // form fields
    if ( this.formFieldList ) {
        this.formFieldList.forEach( function( field ) {
            policyNode.appendChild( field.toElement( doc ) );
        } );
    }
    return doc;
};

/**
 * Represents a form field criteria for an anonymous upload
 * @param {string} name the name of the form field
 * @param {boolean=} optional whether the field is optional
 * @param {string=} eq the field must match this value to be accepted
 * @param {string=} startsWith the field must start with this value to be accepted
 * @param {string=} endsWith the field must end with this value to be accepted
 * @param {string=} contains the field must contain this value to be accepted
 * @param {string=} matches the field must match this regular expression to be accepted
 * @constructor
 */
AccessTokenFormField = function( name, optional, eq, startsWith, endsWith, contains, matches ) {
    this.name = name;
    this.optional = optional;
    this.eq = eq;
    this.startsWith = startsWith;
    this.endsWith = endsWith;
    this.contains = contains;
    this.matches = matches;
};

/**
 * Returns a new AccessTokenFormField objectd parsed from the specified XML element
 * @param {Element} element an XML element representing a form field
 * @return {AccessTokenFormField}
 */
AccessTokenFormField.fromElement = function( element ) {
    var field = new AccessTokenFormField( element.getAttribute( 'name' ), element.getAttribute( 'optional' ) ? true : false );
    var child;
    if ( child = AtmosUtil.getChildByTagName( element, 'eq' ) )
        field.eq = AtmosUtil.getTextContent( child );
    if ( child = AtmosUtil.getChildByTagName( element, 'starts-with' ) )
        field.startsWith = AtmosUtil.getTextContent( child );
    if ( child = AtmosUtil.getChildByTagName( element, 'ends-with' ) )
        field.endsWith = AtmosUtil.getTextContent( child );
    if ( child = AtmosUtil.getChildByTagName( element, 'contains' ) )
        field.contains = AtmosUtil.getTextContent( child );
    if ( child = AtmosUtil.getChildByTagName( element, 'matches' ) )
        field.matches = AtmosUtil.getTextContent( child );

    return field;
};

/**
 * Generates the XMLElement representation of this token policy
 * @param {Document} doc the document in which to create the element
 * @return {Element}
 */
AccessTokenFormField.prototype.toElement = function( doc ) {
    var field = AtmosUtil.createElement( doc, 'form-field', null, {name: this.name} );
    if ( this.optional ) field.setAttribute( 'optional', 'true' );
    if ( this.eq )
        field.appendChild( AtmosUtil.createElement( doc, 'eq', this.eq ) );
    else if ( this.startsWith )
        field.appendChild( AtmosUtil.createElement( doc, 'starts-with', this.startsWith ) );
    else if ( this.endsWith )
        field.appendChild( AtmosUtil.createElement( doc, 'ends-with', this.endsWith ) );
    else if ( this.contains )
        field.appendChild( AtmosUtil.createElement( doc, 'contains', this.contains ) );
    else if ( this.matches )
        field.appendChild( AtmosUtil.createElement( doc, 'matches', this.matches ) );

    return field;
};

////////////////////////
// Exports for NodeJS //
////////////////////////
if ( typeof(exports) != 'undefined' ) {
    exports.AccessToken = AccessToken;
    exports.AccessTokenPolicy = AccessTokenPolicy;
    exports.AccessTokenFormField = AccessTokenFormField;
}
