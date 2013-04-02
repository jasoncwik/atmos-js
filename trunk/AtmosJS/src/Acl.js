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
 * ACL objects contain two properties: userEntries and groupEntries
 * Each of those properties should be an Array of AclEntry
 * objects.
 * @param {Array.<AclEntry>} userEntries list of user entries
 * @param {Array.<AclEntry>} groupEntries list of group entries
 * @constructor
 */
Acl = function( userEntries, groupEntries ) {
    this.userEntries = userEntries;
    this.groupEntries = groupEntries;
};

/**
 * Defines an entry on an ACL (grantee -> Permission).  Use of this class is optional, you
 * can simply define with JSON, e.g.
 * [ {key:AclEntry.GROUPS.OTHER,value:AclEntry.ACL_PERMISSIONS.READ} ]
 * @param {String} key name of the user or group
 * @param {String} value permission granted to the user or group
 * @constructor
 */
AclEntry = function( key, value ) {
    this.key = key;
    this.value = value;
};

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

////////////////////////
// Exports for NodeJS //
////////////////////////
if ( typeof(exports) != 'undefined' ) {
    exports.Acl = Acl;
    exports.AclEntry = AclEntry;
}
