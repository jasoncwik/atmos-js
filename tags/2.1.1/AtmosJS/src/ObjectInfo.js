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
 * @param {string} objectId the Object ID of the object
 * @param {string} selection the replica selection for read access. Values can be geographic or random
 * @param {Array.<ObjectReplica>} replicas array of ObjectReplica objects
 * @param {boolean} expirationEnabled whether expiration is enabled for the object
 * @param {Date} expirationEndsAt when this object's expiration period ends
 * @param {boolean} retentionEnabled whether retention is enabled for the object
 * @param {Date} retentionEndsAt when this object's retention period expires
 */
ObjectInfo = function( objectId, selection, replicas, expirationEnabled, expirationEndsAt, retentionEnabled, retentionEndsAt ) {
    this.objectId = objectId;
    this.selection = selection;
    this.replicas = replicas;
    this.expirationEnabled = expirationEnabled;
    this.expirationEndsAt = expirationEndsAt;
    this.retentionEnabled = retentionEnabled;
    this.retentionEndsAt = retentionEndsAt;
};

/**
 * @constructor
 * @param {number} id the replica ID
 * @param {string} location the replica location
 * @param {string} replicaType the replica type. Values can be sync or async
 * @param {boolean} current true if the replica is current, or false if the replica is not current
 * @param {string} storageType the replica's storage type. Values can be stripe, normal, cloud, compression, ErasureCode, and dedup
 */
ObjectReplica = function( id, location, replicaType, current, storageType ) {
    this.id = id;
    this.location = location;
    this.replicaType = replicaType;
    this.current = current;
    this.storageType = storageType;
};

////////////////////////
// Exports for NodeJS //
////////////////////////
if ( typeof(exports) != 'undefined' ) {
    exports.ObjectInfo = ObjectInfo;
    exports.ObjectReplica = ObjectReplica;
}
