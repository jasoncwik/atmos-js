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

/** @define {boolean} */
var COMPILED = false;

isNodeJs = false;
if ( typeof(require) == 'function' ) {
    isNodeJs = true;
    var dom = require( 'xmldom' );
    DOMParser = dom.DOMParser;
    XMLSerializer = dom.XMLSerializer;
}

///////////////////////////////////////////////////
// Array function backported from JavaScript 1.6 //
// Needed by some browsers                       //
///////////////////////////////////////////////////
if ( !Array.prototype.forEach ) {
    Array.prototype.forEach = function( fn, scope ) {
        for ( var i = 0, len = this.length; i < len; ++i ) {
            fn.call( scope, this[i], i, this );
        }
    };
}

//////////////////////////////////////////////////
// String function backported from ECMAScript-5 //
// Needed by some browsers                      //
//////////////////////////////////////////////////
if ( !String.prototype.trim ) {
    String.prototype.trim = function() {
        return this.replace( /^\s+|\s+$/g, '' );
    };
}

//////////////////////////////////////////////////////
// String function backported from JavaScript 1.8.6 //
// Needed by some browsers and node.js              //
//////////////////////////////////////////////////////
if ( !String.prototype.startsWith ) {
    String.prototype.startsWith = function( searchString, position ) {
        position = position || 0;
        return this.indexOf( searchString, position ) === position;
    };
}

//////////////////////////////////////////////////
// Object function backported from ECMAScript-5 //
// Needed by some browsers                      //
//////////////////////////////////////////////////
if ( !Object.keys ) {
    Object.keys = (function() {
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !({toString: null}).propertyIsEnumerable( 'toString' ),
            dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ],
            dontEnumsLength = dontEnums.length;

        return function( obj ) {
            if ( typeof obj !== 'object' && typeof obj !== 'function' || obj === null )
                throw new TypeError( 'Object.keys called on non-object' );

            var result = [];

            for ( var prop in obj ) {
                if ( hasOwnProperty.call( obj, prop ) ) result.push( prop );
            }

            if ( hasDontEnumBug ) {
                for ( var i = 0; i < dontEnumsLength; i++ ) {
                    if ( hasOwnProperty.call( obj, dontEnums[i] ) ) result.push( dontEnums[i] );
                }
            }
            return result;
        }
    })();
}

//////////////////////////////////////////////////
// Date function backported from ECMAScript-5   //
// Needed by some browsers                      //
//////////////////////////////////////////////////
if ( !Date.prototype.toISOString ) {
    (function() {
        function pad( number ) {
            var r = String( number );
            if ( r.length === 1 ) {
                r = '0' + r;
            }
            return r;
        }

        Date.prototype.toISOString = function() {
            return this.getUTCFullYear()
                + '-' + pad( this.getUTCMonth() + 1 )
                + '-' + pad( this.getUTCDate() )
                + 'T' + pad( this.getUTCHours() )
                + ':' + pad( this.getUTCMinutes() )
                + ':' + pad( this.getUTCSeconds() )
                + '.' + String( (this.getUTCMilliseconds() / 1000).toFixed( 3 ) ).slice( 2, 5 )
                + 'Z';
        };
    })();
}

/**
 * @return {Document}
 */
createDocument = function() {
    if ( isNodeJs ) return new dom.DOMImplementation().createDocument( "", "", null );
    else if ( document.implementation.createDocument ) return document.implementation.createDocument( "", "", null );
    else if ( typeof ActiveXObject != 'undefined' ) return /** @type {Document} */ new ActiveXObject( "MSXML.DomDocument" );
    else return null;
};

/**
 * @param {Document} doc parent document in which to create an element
 * @param {String} name name of the element to create (tag name)
 * @param {String=} text optional text content for the new element
 * @param {Object=} attributes optional attributes of the new element
 * @return {Element}
 */
createElement = function( doc, name, text, attributes ) {
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
 * @param {String} xmlString the XML string to parse
 * @return {Document} a document object representing the specified XML string
 */
parseXml = function( xmlString ) {
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
 * @return {String} XML string representing the specified document
 */
serializeXml = function( doc ) {
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
 * @param {String} tagName the tag name to look for
 * @return {Node} the found node or null if not found.
 */
getChildByTagName = function( node, tagName ) {
    var children = getChildrenByTagName( node, tagName );
    if ( children.length ) return children[0];
    return null;
};

/**
 * Searches a node for all first-level children with the given tag name.  If
 * not found, an empty array will be returned.
 * @param {Node} node the node to search
 * @param {String} tagName the tag name to look for
 * @return {Array.<Element>} the found child nodes or an empty array if not found.
 */
getChildrenByTagName = function( node, tagName ) {
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
getTextContent = function( node ) {
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

////////////////////////
// Globals for NodeJS //
////////////////////////
if ( typeof(global) != 'undefined' ) {
    global.createDocument = createDocument;
    global.createElement = createElement;
    global.parseXml = parseXml;
    global.getChildByTagName = getChildByTagName;
    global.getChildrenByTagName = getChildrenByTagName;
    global.getTextContent = getTextContent;
}
