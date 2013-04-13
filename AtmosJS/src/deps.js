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
