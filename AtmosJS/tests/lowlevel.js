/*

 Copyright (c) 2011, EMC Corporation

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

if ( typeof(require) != 'undefined' ) {
    // We're running inside node.js
    require( '../src/deps' );
    AccessToken = require( '../src/AccessToken' ).AccessToken;
    AccessTokenPolicy = require( '../src/AccessToken' ).AccessTokenPolicy;
    AccessTokenFormField = require( '../src/AccessToken' ).AccessTokenFormField;
    Acl = require( '../src/Acl' ).Acl;
    AclEntry = require( '../src/Acl' ).AclEntry;
    AtmosConfig = require( '../src/AtmosConfig' ).AtmosConfig;
    AtmosResult = require( '../src/AtmosResult' ).AtmosResult;
    AtmosServiceInfo = require( '../src/AtmosServiceInfo' ).AtmosServiceInfo;
    AtmosUtil = require( '../src/AtmosUtil' ).AtmosUtil;
    DirectoryItem = require( '../src/DirectoryItem' ).DirectoryItem;
    HttpRequest = require( '../src/HttpRequest' ).HttpRequest;
    AtmosRange = require( '../src/HttpRequest' ).AtmosRange;
    ListOptions = require( '../src/ListOptions' ).ListOptions;
    ObjectInfo = require( '../src/ObjectInfo' ).ObjectInfo;
    ObjectReplica = require( '../src/ObjectInfo' ).ObjectReplica;
    ObjectResult = require( '../src/ObjectResult' ).ObjectResult;
    ObjectVersion = require( '../src/ObjectVersion' ).ObjectVersion;
    AtmosRest = require( '../src/AtmosRest' ).AtmosRest;
    require( './atmos-config' );
    require( './test-deps' );
    atmos = new AtmosRest( atmosConfig );
}

atmosLowLevel = {
    'sanity test': function( test ) {
        test.ok( true, 'nodeunit is ok' );
        test.done();
    },

    'dump test': function( test ) {
        test.ok( dumpObject( {foo: "bar", obj1: {a: "b", c: "d"}} ) === "[foo=bar, obj1=[a=b, c=d]]", "dumpObject is ok" );
        test.done();
    },

    'Object.keys test': function( test ) {
        var keys = Object.keys( {foo: "bar", x: 'y'} );
        var correctKeys = ['foo', 'x'];
        test.ok( keys.length == correctKeys.length );
        for ( var i = 0; i < keys.length; i++ ) {
            test.ok( keys[i] == correctKeys[i] );
        }
        test.done();
    },

    'async test': function( test ) {
        test.expect( 1 );

        var callback = function() {
            test.ok( true, 'timeout passed' );
            test.done();
        };

        setTimeout( callback, 100 );
    },

    'atmos credentials': function( test ) {
        test.ok( typeof(atmosConfig) !== 'undefined', 'Found atmosConfig' );
        test.ok( typeof(atmosConfig.uid) !== 'undefined', 'Found atmos UID: ' + atmosConfig.uid );
        test.ok( typeof(atmosConfig.secret) !== 'undefined', 'Found atmos shared secret' );
        test.done();
    },

    /*!
     * Test the signature algorithm using the request in the programmer's guide.
     */
    'signature test': function( test ) {

        var config = {
            uid: '6039ac182f194e15b9261d73ce044939/user1',
            secret: 'LJLuryj6zs8ste6Y3jTGQp71xq0='
        };
        var esu = new AtmosRest( config );

        var headers = {};
        headers["X-Emc-Date"] = 'Thu, 05 Jun 2008 16:38:19 GMT';
        headers["Date"] = 'Thu, 05 Jun 2008 16:38:19 GMT';
        headers["X-Emc-Listable-Meta"] = 'part4/part7/part8=quick';
        headers["X-Emc-Meta"] = 'part1=buy';
        headers["X-Emc-Groupacl"] = 'other=NONE';
        headers["X-Emc-Useracl"] = 'john=FULL_CONTROL,mary=WRITE';
        headers["Content-Type"] = 'application/octet-stream';
        headers["Range"] = '';

        var signature = esu._signRequest( 'POST', headers, '/rest/objects' );

        test.equal( signature, 'WHJo1MFevMnK4jCthJ974L3YHoo=', 'Signature matches' );
        test.done();
    },

    'resolve dots test': function( test ) {
        test.equal( atmos._resolveDots( "/x/test/../y" ), '/x/y', '.. passed' );
        test.equal( atmos._resolveDots( "/x/./y" ), '/x/y', '. passed' );
        test.equal( atmos._resolveDots( "/x/test/./../y" ), '/x/y', '. .. passed' );
        test.equal( atmos._resolveDots( "/x/test/.././y" ), '/x/y', '.. . passed' );
        test.done();
    },

    'UTF-8 encode test': function( test ) {
        test.ok( atmos.createAttachmentDisposition( "бöｼ.txt" ) == "attachment; filename*=UTF-8''%D0%B1%C3%B6%EF%BD%BC.txt" );
        test.done();
    },

    'XML test': function( test ) {
        var xml = "<root><main><child></child><child></child></main></root>";
        var doc = AtmosUtil.parseXml( xml );
        var children = AtmosUtil.getChildrenByTagName( doc.getElementsByTagName( 'main' )[0], 'child' );
        var child = AtmosUtil.getChildByTagName( doc.getElementsByTagName( 'main' )[0], 'child' );
        test.equal( children.length, 2, "found 2 children" );
        test.ok( child != null );
        test.done();
    },

    'Form response test': function( test ) {
        var responseText = "135\nHTTP/1.1 201 Created\nx-emc-policy: default\nx-emc-delta: 19096\nlocation: /rest/objects/4e4ec927a1068f5a04e4ec9918004304efb2ad7236d3";
        var xhr = atmos._parseFormResponse( responseText );
        test.equal( xhr.status, 201, "httpCode correct" );
        test.equal( xhr.statusText, 'Created', "httpMessage correct" );
        test.equal( xhr.responseText, '', "responseText correct" );
        test.equal( xhr.getResponseHeader( 'location' ), '/rest/objects/4e4ec927a1068f5a04e4ec9918004304efb2ad7236d3', "location header correct" );
        test.equal( Object.keys( xhr.headers ).length, 3, "headers.length correct" );
        test.done();
    },

    'Resolve URL test': function( test ) {
        var path = '/this/is/a/path/to/an/object';
        var query = 'querystring=true';
        var url = atmos._resolveUrl( path, query );
        var scheme = atmosConfig.protocol || window.location.protocol;
        var host = atmosConfig.host || window.location.host;
        var port = '';
        if ( atmosConfig.port || (typeof(window) != 'undefined' && window.location.port) ) port = ':' + atmosConfig.port || window.location.port;

        test.equal( url, scheme + '//' + host + port + path + '?' + query, "URL matches" );
        test.done();
    },

    'Date parse test': function( test ) {
        var date = new Date();
        date.setUTCFullYear( 2020, 0, 1 );
        date.setUTCHours( 5, 0, 0, 0 );
        test.deepEqual( AtmosUtil.parseIso8601Date( '2020-01-01T05:00:00.000Z' ), date, 'Z date matches' );
        test.deepEqual( AtmosUtil.parseIso8601Date( '2020-01-01T05:00:00.000+0000' ), date, '+0000 date matches' );
        test.deepEqual( AtmosUtil.parseIso8601Date( '2020-01-01T01:30:00-0330' ), date, '-0330 date matches' );
        test.deepEqual( AtmosUtil.parseIso8601Date( '2019-12-31T23:00:00-0600' ), date, 'roll forward date matches' );
        date.setUTCHours( 22, 0, 0, 0 );
        test.deepEqual( AtmosUtil.parseIso8601Date( '2020-01-02T04:00:00+0600' ), date, 'roll back date matches' );

        test.done();
    },

    'Access token XML test': function( test ) {
        var now = new Date();
        now.setUTCFullYear( 2020, 0, 1 );
        now.setUTCHours( 12, 0, 0, 0 );
        var policy = new AccessTokenPolicy( now, 5, 6, ['1.1.1.1', '2.2.2.2'], ['3.3.3.3', '4.4.4.4'], 0, 1000, [
            new AccessTokenFormField( 'x-emc-meta', true, 'name=value' ),
            new AccessTokenFormField( 'x-emc-listable-meta', true, undefined, 'listable=' )
        ] );
        var xml1 = '<policy><expiration>' + now.toISOString() + '</expiration><max-uploads>5</max-uploads><max-downloads>6</max-downloads><source><allow>1.1.1.1</allow><allow>2.2.2.2</allow><disallow>3.3.3.3</disallow><disallow>4.4.4.4</disallow></source><content-length-range from="0" to="1000"></content-length-range><form-field name="x-emc-meta" optional="true"><eq>name=value</eq></form-field><form-field name="x-emc-listable-meta" optional="true"><starts-with>listable=</starts-with></form-field></policy>';
        var xml2 = '<policy><expiration>' + now.toISOString() + '</expiration><max-uploads>5</max-uploads><max-downloads>6</max-downloads><source><allow>1.1.1.1</allow><allow>2.2.2.2</allow><disallow>3.3.3.3</disallow><disallow>4.4.4.4</disallow></source><content-length-range from="0" to="1000"/><form-field name="x-emc-meta" optional="true"><eq>name=value</eq></form-field><form-field name="x-emc-listable-meta" optional="true"><starts-with>listable=</starts-with></form-field></policy>';
        var sxml = AtmosUtil.serializeXml( policy.toDocument() ).trim();
        test.ok( xml1 == sxml || xml2 == sxml, 'XML serialization is valid' );
        var ppolicy = AccessTokenPolicy.fromNode( AtmosUtil.getChildByTagName( AtmosUtil.parseXml( xml1 ), 'policy' ) );
        test.deepEqual( ppolicy, policy, "policy XML parsing is valid" );

        var myAccess = new AclEntry( 'USER_A', AclEntry.ACL_PERMISSIONS.FULL_CONTROL );
        var groupAccess = new AclEntry( AclEntry.GROUPS.OTHER, AclEntry.ACL_PERMISSIONS.READ );
        var acl = new Acl( [myAccess], [groupAccess] );
        var token = new AccessToken( 'xxxxxxx_token_id', policy, undefined, 'abcdef0123456789', acl );

        xml1 = '<access-token><access-token-id>xxxxxxx_token_id</access-token-id><expiration>2020-01-01T12:00:00Z</expiration><max-uploads>5</max-uploads><max-downloads>6</max-downloads><source><allow>1.1.1.1</allow><allow>2.2.2.2</allow><disallow>3.3.3.3</disallow><disallow>4.4.4.4</disallow></source><content-length-range from="0" to="1000"/><form-field name="x-emc-meta" optional="true"><eq>name=value</eq></form-field><form-field name="x-emc-listable-meta" optional="true"><starts-with>listable=</starts-with></form-field><object-id>abcdef0123456789</object-id><useracl>USER_A=FULL_CONTROL</useracl><groupacl>other=READ</groupacl></access-token>';
        var parsedToken = AccessToken.fromNode( AtmosUtil.getChildByTagName( AtmosUtil.parseXml( xml1 ), 'access-token' ) );
        test.deepEqual( parsedToken, token, "token XML parsing is valid" );

        // test minimal
        policy = new AccessTokenPolicy();
        sxml = AtmosUtil.serializeXml( policy.toDocument() ).trim();
        test.ok( sxml == '<policy></policy>' || sxml == '<policy/>', 'minimal XML serialization is valid' );

        test.done();
    },

    'Checksum test': function( test ) {
        var validHeaders = {
            'x-emc-wschecksum': 'SHA1/12/2ef7bde608ce5404e97d5f042f95f89f1c232871'
        };
        var badAlgHeaders = {
            'x-emc-wschecksum': 'MD5/12/2ef7bde608ce5404e97d5f042f95f89f1c232872'
        };
        var badSumHeaders = {
            'x-emc-wschecksum': 'SHA1/12/2ef7bde608ce5404e97d5f042f95f89f1c232872'
        };
        var xhr = function(headers) {
            this.responseText = 'Hello World!';
            this.getResponseHeader = function(key) {
                return headers[key];
            };
        };
        var result = {success: true};
        atmos._verifyChecksum(result, new xhr(validHeaders));
        test.ok( result.success && Object.keys(result).length == 1 , "valid checksum" );
        result = {success: true};
        atmos._verifyChecksum(result, new xhr(badAlgHeaders));
        test.ok( result.success && Object.keys(result).length == 1 , "wrong algorithm" );
        result = {success: true};
        atmos._verifyChecksum(result, new xhr(badSumHeaders));
        test.ok( !result.success && result.errorMessage == 'checksum failed' && Object.keys(result).length == 2 , "bad checksum" );
        test.done();
    }
};

if ( typeof(exports) != 'undefined' ) {
    // Register the test groups for node.js
    exports.atmosLowLevel = atmosLowLevel;
}
