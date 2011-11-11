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
    require( 'tests/atmos-config.js' );
    AtmosRest = require( 'atmos.js' ).AtmosRest;

    console.log( "AtmosRest: " + AtmosRest );
}

this.atmosLowLevel = {
    'sanity test': function( test ) {
        test.ok( true, 'nodeunit is ok' );
        test.done();
    },

    'dump test': function( test ) {
        test.ok( dumpObject( {foo: "bar", obj1: {a: "b", c: "d"}} ) === "[foo=bar, obj1=[a=b, c=d]]", "dumpObject is ok" );
        test.done();
    },

    'Object.keys test': function( test ) {
        var keys = Object.keys( {foo:"bar", x:'y'} );
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

        var headers = new Object();
        headers["X-Emc-Date"] = 'Thu, 05 Jun 2008 16:38:19 GMT';
        headers["Date"] = 'Thu, 05 Jun 2008 16:38:19 GMT';
        headers["X-Emc-Listable-Meta"] = 'part4/part7/part8=quick';
        headers["X-Emc-Meta"] = 'part1=buy';
        headers["X-Emc-Groupacl"] = 'other=NONE';
        headers["X-Emc-Useracl"] = 'john=FULL_CONTROL,mary=WRITE';

        var signature = esu._signRequest( 'POST', headers, 'application/octet-stream', '', '/rest/objects' );

        test.equal( signature, 'WHJo1MFevMnK4jCthJ974L3YHoo=', 'Signature matches' );
        test.done();
    },

    'resolve dots test': function( test ) {
        var config = {
            uid: '6039ac182f194e15b9261d73ce044939/user1',
            secret: 'LJLuryj6zs8ste6Y3jTGQp71xq0='
        };
        var esu = new AtmosRest( config );

        test.equal( esu._resolveDots( "/x/test/../y" ), '/x/y', '.. passed' );
        test.equal( esu._resolveDots( "/x/./y" ), '/x/y', '. passed' );
        test.equal( esu._resolveDots( "/x/test/./../y" ), '/x/y', '. .. passed' );
        test.equal( esu._resolveDots( "/x/test/.././y" ), '/x/y', '.. . passed' );
        test.done();
    },

    'UTF-16 encode test': function( test ) {
        test.ok( atmos.createAttachmentDisposition( "бöｼ.txt" ) == "attachment; filename*=UTF-8''%D0%B1%C3%B6%EF%BD%BC.txt" );
        test.done();
    }
};