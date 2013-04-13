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
 * Constructs a new ListOptions object.  Used for listObjects and listDirectory methods.
 * Note that use of this class is optional; you can simply use a JSON object, e.g.
 * { limit: 0, includeMeta: true }
 * @param {int} limit maximum number of objects to return from server.  0=default (generally
 * the default limit is 5000).
 * @param {string} token server token for continuing results.  Check your results object for a
 * token and pass into this field on the subsequent request to continue your listing.
 * @param {boolean} includeMeta if true, object metadata will be returned with the results
 * @param {Array.<string>} userMetaTags if non-null, the list of user metadata tags to return in the metadata
 * (assumes includeMeta=true).  If null, all metadata tags will be returned.
 * @param {Array.<string>} systemMetaTags if non-null, the list of system metadata tags to return in the metadata
 * (assumes includeMeta=true).  If null, all system metadata tags will be returned.
 * @constructor
 */
ListOptions = function( limit, token, includeMeta, userMetaTags, systemMetaTags ) {
    this.limit = limit;
    this.token = token;
    this.includeMeta = includeMeta;
    this.userMetaTags = userMetaTags;
    this.systemMetaTags = systemMetaTags;
};

////////////////////////
// Exports for NodeJS //
////////////////////////
if ( typeof(exports) != 'undefined' ) {
    exports.ListOptions = ListOptions;
}
