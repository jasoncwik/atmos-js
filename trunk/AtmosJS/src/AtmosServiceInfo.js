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
/**
 * @constructor
 * @param {String} version the version of Atmos
 * @param {boolean} object whether this Atmos instance supports the object REST API
 * @param {boolean} namespace whether this Atmos instance supports the namespace REST API
 * @param {boolean} utf8 whether this Atmos instance supports non-latin UTF8 content in headers
 * @param {boolean} browsercompat whether this Atmos instance supports additional browser compatibility features
 *                  (i.e. multipart form posts, response header inclusion, cache and content-disposition headers, etc.)
 * @param {boolean} keyvalue whether this Atmos instance supports key-value identifiers
 * @param {boolean} versioning whether this Atmos instance support object versioning
 */
AtmosServiceInfo = function( version, object, namespace, utf8, browsercompat, keyvalue, versioning ) {
    this.version = version;
    this.object = object;
    this.namespace = namespace;
    this.utf8 = utf8;
    this.browsercompat = browsercompat;
    this.keyvalue = keyvalue;
    this.versioning = versioning;
};

/**
 * parses the feature properties of this object from header values to localize code
 * @param {String} featuresHeader the value of the x-emc-features header to be parsed into an AtmosServiceInfo object
 * @param {String} utf8Header the value of the x-emc-support-utf8 header (legacy)
 */
AtmosServiceInfo.prototype.loadFeaturesFromHeader = function( featuresHeader, utf8Header ) {
    if ( featuresHeader ) {
        var tokens = featuresHeader.split( ", " );
        for ( var i = 0; i < tokens.length; i++ ) {
            tokens[i] = tokens[i].replace( /-/g, "" ); // remove hyphens
            this[tokens[i]] = true; // serviceInfo[feature] = true
        }
    } else {
        this.object = true;
        this.namespace = true;
        this.utf8 = utf8Header == "true";
    }
};

////////////////////////
// Exports for NodeJS //
////////////////////////
if ( typeof(exports) != 'undefined' ) {
    exports.AtmosServiceInfo = AtmosServiceInfo;
}
