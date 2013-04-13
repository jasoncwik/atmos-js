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
 * Class to abstract an HTTP request (could use XHR or a form POST)
 * @constructor
 * @param {string} uri the URI of the request
 * @param {string} method the HTTP method to use for the request (GET, POST, PUT, DELETE, HEAD)
 * @param {Object=} headers HTTP headers of the request
 * @param {string|File=} data (only for object creates/updates) data to send (can be a string or File object)
 * @param {string=} mimeType (only for object creates/updates) the mimeType of the data to be sent
 * @param {AtmosRange=} range (optional) the range of bytes of an object to read or update
 * @param {function=} progress (optional) provides progress updates for uploads (progress bar)
 * @param {function=} processResult (optional) provides for custom result processing (result and XHR objects are passed as arguments)
 * @param {function=} complete (optional) called upon completion of the request (called after success or error)
 * @param {Element=} form a form element to use instead of XHR for a POST or PUT request
 */
HttpRequest = function( uri, method, headers, data, mimeType, range, progress, processResult, complete, form ) {
    this.uri = uri;
    this.method = method;
    this.headers = headers;
    this.data = data;
    this.mimeType = mimeType;
    this.range = range;
    this.progress = progress;
    this.processResult = processResult;
    this.complete = complete;
    this.form = form;
};

/**
 * The AtmosRange object is used to specify a range of object data to store or retrieve.
 * @param {number} offset the byte offset within an object's data from which to start the range.
 * @param {number} size the number of bytes to include in the range.
 */
AtmosRange = function( offset, size ) {
    this.offset = offset;
    this.size = size;
};

AtmosRange.prototype.toString = function() {
    return 'bytes=' + this.offset + '-' + (this.offset + this.size - 1);
};

////////////////////////
// Exports for NodeJS //
////////////////////////
if ( typeof(exports) != 'undefined' ) {
    exports.HttpRequest = HttpRequest;
    exports.AtmosRange = AtmosRange;
}
