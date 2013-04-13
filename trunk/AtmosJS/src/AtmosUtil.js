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
isNodeJs = false;
if ( typeof(require) == 'function' ) {
    isNodeJs = true;
    var dom = require( 'xmldom' );
    DOMParser = dom.DOMParser;
    XMLSerializer = dom.XMLSerializer;
}

/**
 * Utility methods for Atmos JS SDK
 */
AtmosUtil = {};

/**
 * @return {Document}
 */
AtmosUtil.createDocument = function() {
    if ( isNodeJs ) return new dom.DOMImplementation().createDocument( "", "", null );
    else if ( document.implementation.createDocument ) return document.implementation.createDocument( "", "", null );
    else if ( typeof ActiveXObject != 'undefined' ) return /** @type {Document} */ new ActiveXObject( "MSXML.DomDocument" );
    else return null;
};

/**
 * @param {Document} doc parent document in which to create an element
 * @param {string} name name of the element to create (tag name)
 * @param {string=} text optional text content for the new element
 * @param {Object=} attributes optional attributes of the new element
 * @return {Element}
 */
AtmosUtil.createElement = function( doc, name, text, attributes ) {
    var element = doc.createElement( name );
    if ( text ) element.appendChild( doc.createTextNode( text ) );
    if ( attributes ) {
        for ( var key in attributes ) {
            if ( !attributes.hasOwnProperty( key ) ) continue;
            element.setAttribute( key, attributes[key] );
        }
    }
    return element;
};

/**
 * Parses an XML string into a Document object
 * @param {string} xmlString the XML string to parse
 * @return {Document} a document object representing the specified XML string
 */
AtmosUtil.parseXml = function( xmlString ) {
    if ( isNodeJs ) {
        return new DOMParser().parseFromString( xmlString );
    } else if ( window.DOMParser ) {
        var parser = new DOMParser();
        return parser.parseFromString( xmlString, "text/xml" );
    } else if ( typeof ActiveXObject != 'undefined' ) {
        var doc = /** @type {Document} */ new ActiveXObject( "MSXML.DomDocument" );
        doc.async = false;
        doc.loadXML( xmlString );
        return doc;
    }
    return null;
};

/**
 * Generates an XML string from the specified Document object
 * @param {Document} doc an XML node
 * @return {string} XML string representing the specified document
 */
AtmosUtil.serializeXml = function( doc ) {
    if ( isNodeJs ) {
        return new XMLSerializer().serializeToString( doc );
    } else if ( window.XMLSerializer ) {
        return new XMLSerializer().serializeToString( doc );
    } else if ( doc.xml ) {
        return doc.xml;
    }
    return null;
}

/**
 * Searches a node for a first-level child with the given tag name.  If
 * not found, null will be returned.
 * @param {Node} node the node to search
 * @param {string} tagName the tag name to look for
 * @return {Node} the found node or null if not found.
 */
AtmosUtil.getChildByTagName = function( node, tagName ) {
    var children = AtmosUtil.getChildrenByTagName( node, tagName );
    if ( children.length ) return children[0];
    return null;
};

/**
 * Searches a node for all first-level children with the given tag name.  If
 * not found, an empty array will be returned.
 * @param {Node} node the node to search
 * @param {string} tagName the tag name to look for
 * @return {Array.<Element>} the found child nodes or an empty array if not found.
 */
AtmosUtil.getChildrenByTagName = function( node, tagName ) {
    var reg = new RegExp( '^' + tagName + '$', "i" ); // jsnode uses HTML uppercase names, so do insensitive
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
 * @return {string} the node's child text
 */
AtmosUtil.getTextContent = function( node ) {
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
 * Parses an ISO-8601 date (with or without a timezone offset, i.e. '-0600').
 * @param text
 * @return {Date}
 */
AtmosUtil.parseIso8601Date = function( text ) {
    var iso8601RE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.[0-9]{3})?(?:([+-][0-9]{2})([0-9]{2})|Z)$/;
    var match = iso8601RE.exec( text ), date;
    if ( match ) {
        var year = parseInt( match[1] ), month = parseInt( match[2] ) - 1, day = parseInt( match[3] );
        var hour = parseInt( match[4] ), min = parseInt( match[5] ), sec = parseInt( match[6] );
        var hourOffset = 0, minuteOffset = 0;
        if ( match[7] ) {
            hourOffset = -parseInt( match[7] );
            minuteOffset = parseInt( match[8] );
        }
        date = new Date();
        date.setUTCFullYear( year, month, day );
        date.setUTCHours( hour + hourOffset, min + minuteOffset, sec, 0 );
    } else {
        date = new Date( text );
        date.setMilliseconds( 0 );
    }
    return date;
};

////////////////////////
// Exports for NodeJS //
////////////////////////
if ( typeof(exports) != 'undefined' ) {
    exports.AtmosUtil = AtmosUtil;
}
