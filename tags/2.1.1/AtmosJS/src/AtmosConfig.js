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
 * Defines configuration parameters for an AtmosRest client.
 * @param {string} uid (required) the Atmos UID for the connection
 * @param {string} secret (required) the Atmos shared secret key for the connection
 * @param {boolean=} enableUtf8 (optional) set to true to enable UTF8 non-latin character support in metadata values.
 *                              NOTE: this feature must be supported by your Atmos version (check AtmosServiceInfo.utf8).
 * @param {boolean=} enableDebug (optional) set to true to enable log output for debugging (default is false).
 * @param {string=} protocol (optional) for node.js or if CORS is enabled on the endpoint.
 *                           the protocol to use when connecting to the endpoint (HTTP or HTTPS)
 * @param {string=} host (optional) for node.js or if CORS is enabled on the endpoint. the endpoint host.
 * @param {number=} port (optional) for node.js or if CORS is enabled on the endpoint. the endpoint port.
 * @constructor
 */
AtmosConfig = function(uid, secret, enableUtf8, enableDebug, protocol, host, port) {
    this.uid = uid;
    this.secret = secret;
    this.enableUtf8 = enableUtf8;
    this.enableDebug = enableDebug;
    this.protocol = protocol;
    this.host = host;
    this.port = port;
};

////////////////////////
// Exports for NodeJS //
////////////////////////
if ( typeof(exports) != 'undefined' ) {
    exports.AtmosConfig = AtmosConfig;
}
