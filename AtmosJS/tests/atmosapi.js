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

isNodeJs = false;
if ( typeof(exports) != 'undefined' ) {
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
    isNodeJs = true;
}

cleanup = [];

fileChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=+*,!#$&()"; // % removed
innerChars = fileChars + " ";

randomFilename = function( name, ext ) {
    var fn = "";
    for ( var i = 0; i < name; i++ ) {
        if ( i == 0 ) {
            fn += fileChars.charAt( Math.floor( Math.random() * (fileChars.length - 1) ) );
        } else {
            fn += innerChars.charAt( Math.floor( Math.random() * (innerChars.length - 1) ) );
        }
    }

    if ( ext && ext > 0 ) {
        fn += ".";
        for ( var j = 0; j < ext; j++ ) {
            fn += fileChars.charAt( Math.floor( Math.random() * (fileChars.length - 1) ) );
        }
    }

    return fn;
};

var directoryName = randomFilename( 8, 0 );
// NOTE: percent (%) for some reason causes signature errors on the server side. I still haven't found a way to avoid this.
var specialCharacterName = ",:&=+$#";
var user = atmosConfig.uid.substr( atmosConfig.uid.lastIndexOf( '/' ) + 1 );

atmosApi = {
    'testEncodeUri': function( test ) {
        atmos.debug( "atmosApi.testEncodeUri" );
        test.expect( 3 );

        test.equal( atmos._encodeURI( "/foo#bar" ), "/foo%23bar", "Encode file" );
        test.equal( atmos._encodeURI( "/foo#bar/" ), "/foo%23bar/", "Encode directory" );
        test.equal( atmos._encodeURI( "/foo#bar?baz=bl#ah" ), "/foo%23bar?baz=bl#ah", "Encode file with query" );

        test.done();
    },

    'testGetServiceInfo': function( test ) {
        atmos.debug( "atmosApi.testGetServiceInfo" );

        atmos.getServiceInformation( function( result ) {
            test.ok( result.successful, "Request successful" );
            test.ok( result.value != null, "Service Info:\n" + dumpObject( result.value ) );
            test.done();
        } );
    },

    // Basic Create object with some content.
    'testCreateObject': function( test ) {
        atmos.debug( "atmosApi.testCreateObject" );

        test.expect( 6 );
        atmos.createObject( null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( result.value, null, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, "Hello World!", "Data correct" );
                    test.done();
                } );

            } );

    },

    'testDeleteObject': function( test ) {
        atmos.debug( "atmosApi.testDeleteObject" );
        test.expect( 4 );

        atmos.createObject( null, null, null, null, "Hello World!", null, function( result ) {
            test.ok( result.successful, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );

            atmos.deleteObject( result.value, function( result2 ) {
                test.ok( result2.successful, "Delete successful" );
                test.equal( result2.httpCode, 204, "HttpCode correct" );

                test.done();
            } );
        } );
    },

    'testCreateObjectOnPath': function( test ) {
        atmos.debug( "atmosApi.testCreateObjectOnPath" );

        test.expect( 6 );

        var filename = "/" + directoryName + "/" + randomFilename( 8, 3 );
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( filename, null, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, "Hello World!", "Data correct" );
                    test.done();
                } );

            } );
    },

    'testDotDotDirectory': function( test ) {
        atmos.debug( "atmosApi.testDotDotDirectory" );

        test.expect( 9 );

        var subdirectory = "/" + directoryName + "/test/../";
        var filename = randomFilename( 8, 3 );
        var path = subdirectory + filename;

        atmos.createObjectOnPath( path, null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful (" + path + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( path, null, function( result2 ) {
                    test.ok( result2.successful, "Read content file successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, "Hello World!", "Data correct" );

                    // List the .. directory
                    atmos.listDirectory( subdirectory, null, function( result3 ) {
                        test.ok( result3.successful, "List successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );
                        test.ok( result3.value.length > 0, "List not empty" );
                        test.done();
                    } )
                } );

            } );
    },

    'testDeleteObjectOnPath': function( test ) {
        atmos.debug( "atmosApi.testDeleteObjectOnPath" );

        test.expect( 5 );

        var filename = "/" + directoryName + "/" + randomFilename( 8, 3 );
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                atmos.deleteObject( filename, function( result2 ) {
                    test.ok( result2.successful, "Delete successful" );
                    test.equal( result2.httpCode, 204, "HttpCode correct" );

                    if ( !result2.successful ) {
                        // Delete failed, so make sure object is cleaned up
                        cleanup.push( result.value );
                    }

                    test.done();
                } );
            } );
    },

    'testCreateObjectWithMetadata': function( test ) {
        atmos.debug( "atmosApi.testCreateObjectWithMetadata" );

        test.expect( 7 );
        var meta = {foo: "bar", foo2: "baz"};
        var listableMeta = {listable: ""};
        atmos.createObject( null, meta, listableMeta, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object metadata back and verify content
                atmos.getUserMetadata( result.value, ["foo", "listable"], function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.value.meta["foo"], "bar", "Metadata value: " + result2.value.meta["foo"] );
                    test.equal( result2.value.listableMeta["listable"], "", "Listable metadata" );
                    test.equal( result2.value.meta["foo2"], null, "Metadata filtering" );
                    test.done();
                } );
            } );
    },

    'testUpdateObject': function( test ) {
        atmos.debug( "atmosApi.testCreateObject" );

        test.expect( 21 );
        var data = "Hello World!";
        atmos.createObject( null, null, null, null, data, "text/plain",
            function( result ) {

                test.ok( result.successful, "Create successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( result.value, null, function( result2 ) {
                    test.ok( result2.successful, "Read successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, data, "Data correct" );

                    // Update object range
                    var range = new AtmosRange( 6, 5 );
                    atmos.updateObject( result.value, null, null, null, null, "Timmy", range, "text/plain", function( result3 ) {
                        test.ok( result3.successful, "Update range successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );

                        atmos.readObject( result.value, null, function( result4 ) {
                            test.ok( result4.successful, "Request successful" );
                            test.equal( result4.httpCode, 200, "HttpCode correct" );
                            test.equal( result4.data, "Hello Timmy!", "Update range confirmed" );

                            // Update entire object
                            data = "Timmy was here.";
                            atmos.updateObject( result.value, null, null, null, null, data, null, "text/plain", function( result5 ) {
                                test.ok( result5.successful, "Update whole successful" );
                                test.equal( result5.httpCode, 200, "HttpCode correct" );

                                atmos.readObject( result.value, null, function( result6 ) {
                                    test.ok( result6.successful, "Request successful" );
                                    test.equal( result6.httpCode, 200, "HttpCode correct" );
                                    test.equal( result6.data, data, "Update whole confirmed" );

                                    // Append to object
                                    var appended = " And so was Stu.";
                                    range = new AtmosRange( data.length, appended.length );
                                    atmos.updateObject( result.value, null, null, null, null, appended, range, "text/plain", function( result7 ) {
                                        test.ok( result7.successful, "Append successful" );
                                        test.equal( result7.httpCode, 200, "HttpCode correct" );

                                        atmos.readObject( result.value, null, function( result8 ) {
                                            test.ok( result8.successful, "Request successful" );
                                            test.equal( result8.httpCode, 200, "HttpCode correct" );
                                            test.equal( result8.data, data + appended, "Append confirmed" );
                                            test.done();
                                        } );
                                    } );
                                } );
                            } );
                        } );
                    } );
                } );

            } );

    },

    'testGetListableTags': function( test ) {
        atmos.debug( "atmosApi.testGetListableTags" );

        test.expect( 6 );
        var listableMeta = {'listable4/listable5': ""};
        atmos.createObject( null, null, listableMeta, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                atmos.getListableTags( "listable4", function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.value.length, 1, "One result returned" );
                    test.equal( result2.value[0], "listable5", "Correct data returned" );
                    test.done();
                } );
            } );
    },

    'testListObjects': function( test ) {
        atmos.debug( "atmosApi.testListObjects" );

        test.expect( 8 );
        var listableMeta = {listable3: ""};
        var userMeta = {foo: "bar"};
        atmos.createObject( null, userMeta, listableMeta, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var options = new ListOptions( 0, null, true, null, null );
                atmos.listObjects( "listable3", options, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    if ( !result2.successful ) {
                        test.done();
                        return;
                    }
                    // Iterate through the results and make sure our OID is present
                    for ( var i = 0; i < result2.value.length; i++ ) {
                        // @type ObjectResult
                        var obj = result2.value[i];
                        if ( obj.objectId == result.value ) {
                            test.equal( obj.objectId, result.value, "Object ID equal" );
                            test.equal( obj.userMeta["foo"], "bar", "Object metadata" );
                            test.equal( obj.listableUserMeta["listable3"], "", "Listable object metadata" );
                            test.equal( obj.systemMeta["size"], "12", "System metadata" );
                            test.done();
                            return;
                        }
                    }

                    test.ok( false, "Could not find oid " + result.value + " in object list" );
                    test.done();
                } );
            } );
    },

    'testListDirectory': function( test ) {
        atmos.debug( "atmosApi.testListDirectory" );

        test.expect( 10 );

        var directory = "/" + directoryName + "/";
        var filename = randomFilename( 8, 3 );
        var fullPath = directory + filename;
        var listableMeta = {listable3: ""};
        var userMeta = {foo: "bar"};
        atmos.debug( "Full Path: " + fullPath );

        atmos.createObjectOnPath( fullPath, null, userMeta, listableMeta, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var options = new ListOptions( 0, null, true, null, null );
                atmos.listDirectory( directory, options, function( result2 ) {
                    test.ok( result2.successful, "List successful" );
                    if ( !result2.successful ) {
                        test.done();
                        return;
                    }
                    // Iterate through the results and make sure our OID is present
                    for ( var i = 0; i < result2.value.length; i++ ) {
                        // @type DirectoryItem
                        var entry = result2.value[i];
                        atmos.debug( "entry: " + dumpObject( entry ) );
                        if ( entry.objectId == result.value ) {
                            test.equal( entry.path, fullPath, "Path equal" );
                            test.equal( entry.name, filename, "Filename equal" );
                            test.equal( entry.objectId, result.value, "Object ID equal" );
                            test.equal( entry.userMeta["foo"], "bar", "Object metadata" );
                            test.equal( entry.listableUserMeta["listable3"], "", "Listable object metadata" );
                            test.equal( entry.systemMeta["size"], "12", "System metadata" );
                            test.done();
                            return;
                        }
                    }

                    test.ok( false, "Could not find oid " + result.value + " in object list" );
                    test.done();
                } );
            } );
    },

    'testGetShareableUrl': function( test ) {
        atmos.debug( "atmosApi.testGetShareableUrl" );
        var text = "Hello World!";

        test.expect( 4 );
        atmos.createObject( null, null, null, null, text, "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var url = atmos.getShareableUrl( result.value, expires );

                atmos._ajax( /** @type HttpRequest */ {
                    uri: url,
                    method: "GET",
                    processResult: function( result, xhr ) {
                        result.data = xhr.responseText;
                    },
                    complete: function( result ) {
                        if ( result.successful ) {
                            test.ok( result.data == text, "Correct content returned" );
                            test.done();
                        } else {
                            test.ok( false, result.data );
                            atmos.info( result.data );
                            test.done();
                        }
                    }
                } );
            } );
    },

    'testGetShareableUrlOnPath': function( test ) {
        atmos.debug( "atmosApi.testGetShareableUrlOnPath" );

        test.expect( 4 );

        var text = "Hello World!";
        var directory = "/" + directoryName + "/";
        var filename = randomFilename( 8, 3 );
        var fullPath = directory + filename;
        atmos.debug( "Full Path: " + fullPath );

        atmos.createObjectOnPath( fullPath, null, null, null, null, text, "text/plain",
            function( result ) {

                test.ok( result.successful, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var url = atmos.getShareableUrl( fullPath, expires );

                atmos._ajax( /** @type HttpRequest */ {
                    uri: url,
                    method: "GET",
                    processResult: function( result, xhr ) {
                        result.data = xhr.responseText;
                    },
                    complete: function( result ) {
                        if ( result.successful ) {
                            test.ok( result.data == text, "Correct content returned" );
                            test.done();
                        } else {
                            test.ok( false, result.data );
                            atmos.info( result.data );
                            test.done();
                        }
                    }
                } );
            } );
    },

    'testCreateObjectOnPathWithSpecialCharacters': function( test ) {
        atmos.debug( "atmosApi.testCreateObjectOnPathWithSpecialCharacters" );

        test.expect( 6 );

        var filename = "/" + specialCharacterName + "/test123.stu";
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( filename, null, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, "Hello World!", "Data correct" );
                    test.done();
                } );

            } );
    },

    'testGetShareableUrlOnPathWithDisposition': function( test ) {
        atmos.debug( "atmosApi.testGetShareableUrlOnPathWithDisposition" );

        test.expect( 4 );

        var text = "Hello World!";
        var fullPath = "/" + directoryName + "/" + randomFilename( 8, 3 );

        atmos.createObjectOnPath( fullPath, null, null, null, null, text, "text/plain",
            function( result ) {

                test.ok( result.successful, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var disposition = atmos.createAttachmentDisposition();
                var url = atmos.getShareableUrl( fullPath, expires, disposition );

                atmos._ajax( /** @type HttpRequest */ {
                    uri: url,
                    method: "GET",
                    processResult: function( result, xhr ) {
                        result.data = xhr.responseText;
                    },
                    complete: function( result ) {
                        if ( result.successful ) {
                            test.ok( result.data == text, "Correct content returned" );
                            test.done();
                        } else {
                            test.ok( false, result.data );
                            atmos.info( result.data );
                            test.done();
                        }
                    }
                } );
            } );
    },

    'testGetShareableUrlOnPathWithDispositionFilename': function( test ) {
        atmos.debug( "atmosApi.testGetShareableUrlOnPathWithDispositionFilename" );

        test.expect( 4 );

        var text = "Hello World!";
        var fullPath = "/" + directoryName + "/" + randomFilename( 8, 3 );

        atmos.createObjectOnPath( fullPath, null, null, null, null, text, "text/plain",
            function( result ) {

                test.ok( result.successful, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var disposition = atmos.createAttachmentDisposition( "бöｼ.txt" );
                var url = atmos.getShareableUrl( fullPath, expires, disposition );

                atmos._ajax( /** @type HttpRequest */ {
                    uri: url,
                    method: "GET",
                    processResult: function( result, xhr ) {
                        result.data = xhr.responseText;
                    },
                    complete: function( result ) {
                        if ( result.successful ) {
                            test.ok( result.data == text, "Correct content returned" );
                            test.done();
                        } else {
                            test.ok( false, result.data );
                            atmos.info( result.data );
                            test.done();
                        }
                    }
                } );
            } );
    },

    'testGetShareableUrlWithSpecialCharacters': function( test ) {
        atmos.debug( "atmosApi.testGetShareableUrlWithSpecialCharacters" );

        test.expect( 4 );

        var filename = "/" + specialCharacterName + "/test2123.stu";
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var url = atmos.getShareableUrl( filename, expires );

                atmos._ajax( /** @type HttpRequest */ {
                    uri: url,
                    method: "GET",
                    processResult: function( result, xhr ) {
                        result.data = xhr.responseText;
                    },
                    complete: function( result ) {
                        if ( result.successful ) {
                            test.ok( result.data == "Hello World!", "Correct content returned" );
                            test.done();
                        } else {
                            test.ok( false, result.data );
                            atmos.info( result.data );
                            test.done();
                        }
                    }
                } );
            } );
    },

    'testGetAcl': function( test ) {
        atmos.debug( "atmosApi.testGetAcl" );

        test.expect( 6 );

        var myAccess = new AclEntry( user, AclEntry.ACL_PERMISSIONS.FULL_CONTROL );
        var groupAccess = new AclEntry( AclEntry.GROUPS.OTHER, AclEntry.ACL_PERMISSIONS.READ );
        var acl = new Acl( [myAccess], [groupAccess] );

        atmos.createObject( acl, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the ACL back and verify
                atmos.getAcl( result.value, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( dumpObject( result2.value ), dumpObject( acl ) );
                    test.done();
                } );

            } );
    },

    'testSetAcl': function( test ) {
        atmos.debug( "atmosApi.testSetAcl" );

        test.expect( 8 );

        var myAccess = new AclEntry( user, AclEntry.ACL_PERMISSIONS.FULL_CONTROL );
        var bobsAccess = new AclEntry( 'jimbob', AclEntry.ACL_PERMISSIONS.READ );
        var groupAccess = new AclEntry( AclEntry.GROUPS.OTHER, AclEntry.ACL_PERMISSIONS.READ );
        var acl = new Acl( [myAccess, bobsAccess], [groupAccess] );

        atmos.createObject( null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Set ACL
                atmos.setAcl( result.value, acl, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );

                    // Read the ACL back and verify
                    atmos.getAcl( result.value, function( result3 ) {
                        test.ok( result3.successful, "Request successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );
                        test.equal( dumpObject( result3.value ), dumpObject( acl ) );
                        test.done();
                    } );
                } );
            } );
    },

    'testGetSystemMetadata': function( test ) {
        atmos.debug( "atmosApi.testGetSystemMetadata" );

        test.expect( 7 );
        atmos.createObject( null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the system metadata and verify content
                atmos.getSystemMetadata( result.value, null, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.value.systemMeta["size"], 12, "Size correct" );
                    test.equal( result2.value.systemMeta["type"], "regular", "Type correct" );
                    test.done();
                } );

            } );

    },

    'testSetUserMetadata': function( test ) {
        atmos.debug( "atmosApi.testSetUserMetadata" );

        test.expect( 11 );
        atmos.createObject( null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // add metadata
                var meta = {foo: "bar", foo2: "baz"};
                var listableMeta = {listable: ""};
                atmos.setUserMetadata( result.value, meta, listableMeta, function( result2 ) {
                    test.ok( result2.successful, "Add metadata request successful" );
                    // Read back and verify content
                    atmos.getUserMetadata( result.value, null, function( result3 ) {
                        test.ok( result3.successful, "Get metadata request successful" );
                        test.equal( result3.value.meta["foo"], "bar", "Add metadata" );
                        test.equal( result3.value.meta["foo2"], "baz", "Add metadata" );
                        test.equal( result3.value.listableMeta["listable"], "", "Add metadata" );

                        // update metadata
                        meta.foo2 = "bazbaz";
                        atmos.setUserMetadata( result.value, meta, listableMeta, function( result4 ) {
                            test.ok( result4.successful, "Update metadata request successful" );
                            // Read back and verify content
                            atmos.getUserMetadata( result.value, null, function( result5 ) {
                                test.ok( result5.successful, "Get metadata request successful" );
                                test.ok( result5.value.meta["foo2"], "bazbaz", "Metadata update" );
                                test.done();
                            } );
                        } );
                    } );
                } );
            } );
    },

    'testDeleteUserMetadata': function( test ) {
        atmos.debug( "atmosApi.testDeleteUserMetadata" );

        test.expect( 12 );

        var meta = {foo: "bar", foo2: "baz"};
        var listableMeta = {listable: ""};
        atmos.createObject( null, meta, listableMeta, null, "Hello World!", "text/plain", function( result ) {
            test.ok( result.successful, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // Read the object metadata back and verify content
            atmos.getUserMetadata( result.value, null, function( result2 ) {
                test.ok( result2.successful, "Request successful" );
                test.equal( result2.value.meta["foo"], "bar", "Metadata" );
                test.equal( result2.value.meta["foo2"], "baz", "Metadata" );
                test.equal( result2.value.listableMeta["listable"], "", "Listable metadata" );

                // delete metadata
                var tags = ["foo2", "listable"];
                atmos.deleteUserMetadata( result.value, tags, function( result3 ) {
                    test.ok( result3.successful, "Delete metadata request successful" );

                    // Read back and verify content
                    atmos.getUserMetadata( result.value, null, function( result4 ) {
                        test.ok( result4.successful, "Get metadata request successful" );
                        test.equal( result4.value.meta["foo"], "bar", "Metadata" );
                        test.equal( result4.value.meta["foo2"], null, "Metadata" );
                        test.equal( result4.value.listableMeta, null, "Metadata" );
                        test.done();
                    } );
                } );
            } );
        } );
    },

    'testRename': function( test ) {
        atmos.debug( "atmosApi.testRename" );

        test.expect( 8 );

        var filename = "/" + directoryName + "/" + randomFilename( 8, 3 );
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // rename the object
                var newName = "/" + directoryName + "/" + randomFilename( 8, 3 );
                atmos.rename( filename, newName, false, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );

                    // Read the object back and verify content
                    atmos.readObject( newName, null, function( result3 ) {
                        test.ok( result3.successful, "Request successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );
                        test.equal( result3.data, "Hello World!", "Data correct" );
                        test.done();
                    } );
                } );
            } );
    },

    'testGetAllMetadata': function( test ) {
        atmos.debug( "atmosApi.testGetAllMetadata" );

        test.expect( 9 );

        var myAccess = new AclEntry( user, AclEntry.ACL_PERMISSIONS.FULL_CONTROL );
        var groupAccess = new AclEntry( AclEntry.GROUPS.OTHER, AclEntry.ACL_PERMISSIONS.READ );
        var acl = new Acl( [myAccess], [groupAccess] );
        var meta = {foo: "bar", foo2: "baz"};
        var listableMeta = {listable: ""};
        atmos.createObject( acl, meta, listableMeta, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the system metadata and verify content
                atmos.getAllMetadata( result.value, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    // user meta and system meta are not differentiated in this call, so we can't do an object comparison
                    test.equal( result2.value.meta.foo, meta.foo, "Metadata equal" );
                    test.equal( result2.value.meta.foo2, meta.foo2, "Metadata equal" );
                    test.equal( dumpObject( result2.value.listableMeta ), dumpObject( listableMeta ), "Listable metadata equal" );
                    test.equal( dumpObject( result2.value.acl ), dumpObject( acl ), "ACL equal" );
                    test.done();
                } );

            } );
    },

    'testlistUserMetadataTags': function( test ) {
        atmos.debug( "atmosApi.testlistUserMetadataTags" );

        test.expect( 7 );

        var meta = {foo: "bar", foo2: "baz"};
        var listableMeta = {listable: ""};
        atmos.createObject( null, meta, listableMeta, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the system metadata and verify content
                atmos.listUserMetadataTags( result.value, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( dumpObject( result2.value.tags ), dumpObject( Object.keys( meta ) ), "Non-listable tags equal" );
                    test.equal( dumpObject( result2.value.listableTags ), dumpObject( Object.keys( listableMeta ) ), "Listable tags equal" );
                    test.done();
                } );

            } );
    },

    'testGetObjectInfo': function( test ) {
        atmos.debug( "atmosApi.testGetObjectInfo" );

        test.expect( 6 );

        atmos.createObject( null, null, null, null, "Hello World!", "text/plain",
            function( result ) {

                test.ok( result.successful, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object info and verify content
                atmos.getObjectInfo( result.value, function( result2 ) {
                    test.ok( result2.successful, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.value.objectId, result.value, "object IDs equal" );
                    test.done();
                } );

            } );
    },

    'testVersionObject': function( test ) {
        atmos.debug( "atmosApi.testVersionObject" );

        test.expect( 12 );

        atmos.createObject( null, null, null, null, "Hello World!", "text/plain", function( result ) {
            test.ok( result.successful, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // create version
            atmos.versionObject( result.value, function( result2 ) {
                test.ok( result2.successful, "Request successful" );
                test.ok( result2.value != null, "Object ID not null" );
                test.equal( result2.httpCode, 201, "HttpCode correct" );

                // modify base object
                atmos.updateObject( result.value, null, null, null, null, "Goodbye World!", null, "text/plain", function( result3 ) {
                    test.ok( result3.successful, "Request successful" );
                    test.equal( result3.httpCode, 200, "HttpCode correct" );

                    // read base object
                    atmos.readObject( result.value, null, function( result4 ) {
                        test.ok( result4.successful, "Request successful" );
                        test.equal( result4.data, "Goodbye World!" );

                        // read version
                        atmos.readObject( result2.value, null, function( result5 ) {
                            test.ok( result5.successful, "Request successful" );
                            test.equal( result5.data, "Hello World!" );
                            test.done();
                        } );
                    } );
                } );
            } );
        } );
    },

    'testListVersions': function( test ) {
        atmos.debug( "atmosApi.testListVersions" );

        test.expect( 13 );

        atmos.createObject( null, null, null, null, "Hello World!", "text/plain", function( result ) {
            test.ok( result.successful, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // create version
            atmos.versionObject( result.value, function( result2 ) {
                test.ok( result2.successful, "Request successful" );
                test.ok( result2.value != null, "Object ID not null" );
                test.equal( result2.httpCode, 201, "HttpCode correct" );

                // list versions
                atmos.listVersions( result.value, function( result3 ) {
                    test.ok( result3.successful, "Request successful" );
                    test.equal( result3.httpCode, 200, "HttpCode correct" );
                    test.equal( result3.value.length, 1 );
                    test.ok( result3.value[0].num != null, "num present" );
                    test.ok( result3.value[0].oid != null, "oid present" );
                    test.ok( result3.value[0].dateCreated != null, "dateCreated present" );
                    test.equal( typeof( result3.value[0].dateCreated.getUTCDate ), "function", "dateCreated is a date" );
                    test.done();
                } );
            } );
        } );
    },

    'testRestoreVersion': function( test ) {
        atmos.debug( "atmosApi.testRestoreVersion" );

        test.expect( 13 );

        atmos.createObject( null, null, null, null, "Hello World!", "text/plain", function( result ) {
            test.ok( result.successful, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // create version
            atmos.versionObject( result.value, function( result2 ) {
                test.ok( result2.successful, "Request successful" );
                test.ok( result2.value != null, "Object ID not null" );
                test.equal( result2.httpCode, 201, "HttpCode correct" );

                // modify base object
                atmos.updateObject( result.value, null, null, null, null, "Goodbye World!", null, "text/plain", function( result3 ) {
                    test.ok( result3.successful, "Request successful" );
                    test.equal( result3.httpCode, 200, "HttpCode correct" );

                    // restore version
                    atmos.restoreVersion( result.value, result2.value, function( result4 ) {
                        test.ok( result4.successful, "Request successful" );
                        test.equal( result4.httpCode, 200, "HttpCode correct" );

                        // read base object
                        atmos.readObject( result.value, null, function( result5 ) {
                            test.ok( result5.successful, "Request successful" );
                            test.equal( result5.httpCode, 200, "HttpCode correct" );
                            test.equal( result5.data, "Hello World!" );
                            test.done();
                        } );
                    } );
                } );
            } );
        } );
    },

    'testDeleteVersion': function( test ) {
        atmos.debug( "atmosApi.testDeleteVersion" );

        test.expect( 8 );

        atmos.createObject( null, null, null, null, "Hello World!", "text/plain", function( result ) {
            test.ok( result.successful, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // create version
            atmos.versionObject( result.value, function( result2 ) {
                test.ok( result2.successful, "Request successful" );
                test.ok( result2.value != null, "Object ID not null" );
                test.equal( result2.httpCode, 201, "HttpCode correct" );

                // delete version
                atmos.deleteVersion( result2.value, function( result3 ) {
                    test.ok( result3.successful, "Request successful" );
                    test.equal( result3.httpCode, 204, "HttpCode correct" );
                    test.done();
                } );
            } );
        } );
    },

    'testUtf8Path': function( test ) {
        atmos.debug( "atmosApi.testUtf8Path" );

        test.expect( 4 );

        var oneByteChars = "Hello! ,";
        var twoByteChars = "АБВГ"; // Cyrillic letters
        var fourByteChars = "𠜎𠜱𠝹𠱓"; // Chinese symbols
        var utf8String = oneByteChars + twoByteChars + fourByteChars;
        var directory = "/" + directoryName + "/";
        var fullPath = directory + utf8String;

        atmos.createObjectOnPath( fullPath, null, null, null, null, "Hello World!", "text/plain",
            function( result ) {
                test.ok( result.successful, "Creation successful" );
                if ( !result.successful ) return;

                // Enqueue for cleanup
                cleanup.push( result.value );

                var options = new ListOptions( 0, null, true, null, null );
                atmos.listDirectory( directory, options, function( result2 ) {
                    test.ok( result2.successful, "List successful" );
                    if ( !result2.successful ) return;

                    // Iterate through the results and make sure our UTF8 object is present
                    var found = false;
                    for ( var i = 0; i < result2.value.length; i++ ) {
                        if ( result2.value[i].path == fullPath ) {
                            found = true;
                            break;
                        }
                    }
                    test.ok( found, "UTF8 path found in directory listing" );

                    // test read
                    atmos.readObject( fullPath, null, function( result3 ) {
                        test.ok( result3.data == "Hello World!", "Content matches" );
                        test.done();
                    } );
                } );
            } );
    },

    'testUtf8Rename': function( test ) {
        atmos.debug( "atmosApi.testUtf8Rename" );

        test.expect( 5 );

        var oneByteChars = "Hello2! ,";
        var twoByteChars = "АБВГ"; // Cyrillic letters
        var fourByteChars = "𠜎𠜱𠝹𠱓"; // Chinese symbols
        var utf8String = oneByteChars + twoByteChars + fourByteChars;
        var directory = "/" + directoryName + "/";
        var normalPath = directory + "utf8Rename.txt";
        var fullPath = directory + utf8String;

        atmos.createObjectOnPath( normalPath, null, null, null, null, "Hello World!", "text/plain",
            function( result ) {
                test.ok( result.successful, "Creation successful" );
                if ( !result.successful ) return;

                // Enqueue for cleanup
                cleanup.push( result.value );

                // rename to UTF8 string
                atmos.rename( normalPath, fullPath, true, function( result2 ) {
                    test.ok( result2.successful, "Rename successful" );
                    if ( !result2.successful ) return;

                    // wait for rename to propagate
                    setTimeout( function() {

                        var options = new ListOptions( 0, null, true, null, null );
                        atmos.listDirectory( directory, options, function( result3 ) {
                            test.ok( result3.successful, "List successful" );
                            if ( !result3.successful ) return;

                            // Iterate through the results and make sure our UTF8 object is present
                            var found = false;
                            for ( var i = 0; i < result3.value.length; i++ ) {
                                if ( result3.value[i].path == fullPath ) {
                                    found = true;
                                    break;
                                }
                            }
                            test.ok( found, "UTF8 path found in directory listing" );

                            // test read
                            atmos.readObject( fullPath, null, function( result4 ) {
                                test.ok( result4.data == "Hello World!", "Content matches" );
                                test.done();
                            } );
                        } );
                    }, 5000 );
                } );
            } );
    },

    'testUtf8Content': function( test ) {
        atmos.debug( "atmosApi.testUtf8Content" );

        test.expect( 2 );

        var oneByteChars = "Hello! ,";
        var twoByteChars = "АБВГ"; // Cyrillic letters
        var fourByteChars = "𠜎𠜱𠝹𠱓"; // Chinese symbols
        var utf8String = oneByteChars + twoByteChars + fourByteChars;
        var directory = "/" + directoryName + "/";
        var fullPath = directory + "utf8Content.txt";

        atmos.createObjectOnPath( fullPath, null, null, null, null, utf8String, "text/plain",
            function( result ) {
                test.ok( result.successful, "Creation successful" );
                if ( !result.successful ) return;

                // Enqueue for cleanup
                cleanup.push( result.value );

                // test read
                atmos.readObject( fullPath, null, function( result3 ) {
                    test.ok( result3.data == utf8String, "Content matches" );
                    test.done();
                } );
            } );
    },

    'testUtf8Metadata': function( test ) {
        atmos.debug( "atmosApi.testUtf8Metadata" );

        test.expect( 3 );

        var oneByteChars = "Hello2! ,";
        var twoByteChars = "АБВГ"; // Cyrillic letters
        var fourByteChars = "𠜎𠜱𠝹𠱓"; // Chinese symbols
        var utf8String = oneByteChars + twoByteChars + fourByteChars;
        var directory = "/" + directoryName + "/";
        var fullPath = directory + "utf8Metadata.txt";

        var meta = {};
        meta["utf8Key"] = utf8String;
        meta[utf8String] = "utf8Value";

        atmos.createObjectOnPath( fullPath, null, meta, null, null, "Hello World!", "text/plain",
            function( result ) {
                test.ok( result.successful, "Creation successful" );
                if ( !result.successful ) return;

                // Enqueue for cleanup
                cleanup.push( result.value );

                atmos.getUserMetadata( fullPath, null, function( result4 ) {
                    test.ok( result4.value.meta["utf8Key"] == utf8String, "UTF8 value matches" );
                    test.ok( result4.value.meta[utf8String] == "utf8Value", "UTF8 key matches" );
                    test.done();
                } );
            } );
    },

    'testUtf8ListableMeta': function( test ) {
        atmos.debug( "atmosApi.testUtf8ListableMeta" );

        test.expect( 3 );

        var oneByteChars = "Hello! ";
        var twoByteChars = "АБВГ"; // Cyrillic letters
        var fourByteChars = "𠜎𠜱𠝹𠱓"; // Chinese symbols
        var utf8String = oneByteChars + twoByteChars + fourByteChars;
        var directory = "/" + directoryName + "/";
        var fullPath = directory + "utf8Listable.txt";

        var listable = {};
        listable[utf8String] = "";

        atmos.createObjectOnPath( fullPath, null, null, listable, null, "Hello World!", "text/plain",
            function( result ) {
                test.ok( result.successful, "Creation successful" );
                if ( !result.successful ) return;

                // Enqueue for cleanup
                cleanup.push( result.value );

                atmos.listObjects( utf8String, null, function( result2 ) {
                    test.ok( result2.successful, "List successful" );
                    if ( !result2.successful ) return;

                    // Iterate through the results and make sure our UTF8 object is present
                    var found = false;
                    for ( var i = 0; i < result2.value.length; i++ ) {
                        if ( result2.value[i].id == result.value ) {
                            found = true;
                            break;
                        }
                    }
                    test.ok( found, "object found in UTF8 tag listing" );

                    test.done();
                } );
            } );
    },

    'testAccessTokenCrud': function( test ) {
        atmos.debug( "testAccessTokenCrud" );

        test.expect( 13 );

        var text = 'Hello World!', fin1 = false, fin2 = false;
        var fin = function() {
            if ( fin1 && fin2 ) {
                atmosConfig.enableUtf8 = true;
                testlist();
            }
        };

        var token1, token2;
        var expires = new Date();
        expires.setMinutes( expires.getMinutes() + 5 );
        expires.setMilliseconds( 0 );

        // test OID
        atmos.createObject( null, null, null, null, text, 'text/plain', function( result ) {
            test.ok( result.successful, 'Create oid object' );
            cleanup.push( result.value );

            var policy1 = new AccessTokenPolicy( expires, 0, 1, undefined, undefined, 0, 1024, [] );
            atmos.createAccessToken( policy1, result.value, null, null, null, function( result2 ) {
                test.ok( result2.successful, 'Create oid token' );

                atmos.getAccessToken( result2.value, function( result3 ) {
                    test.ok( result3.successful, 'Get oid token' );

                    if ( !result3.value ) result3.value = {tokenId: 'x'}; // avoid 'undefined' error
                    token1 = new AccessToken( result3.value.tokenId, policy1, undefined, result.value );
                    test.deepEqual( result3.value, token1, 'Tokens equal' );

                    fin1 = true;
                    fin();
                } );
            } );
        } );

        // test path
        var fullPath = "/token_test/accesstokendownload1";
        atmosConfig.enableUtf8 = false; // TODO: remove this when testing against >=2.1.3

        var myAccess = new AclEntry( user, AclEntry.ACL_PERMISSIONS.FULL_CONTROL );
        var groupAccess = new AclEntry( AclEntry.GROUPS.OTHER, AclEntry.ACL_PERMISSIONS.READ );
        var acl = new Acl( [myAccess], [groupAccess] );

        var policy2 = new AccessTokenPolicy( expires, 1, 1, undefined, undefined, 0, 1024, [] );
        atmos.createAccessToken( policy2, fullPath, acl, null, null, function( result2 ) {
            test.ok( result2.successful, 'Create path token' );

            atmos.getAccessToken( result2.value, function( result3 ) {
                test.ok( result3.successful, 'Get path token' );

                if ( !result3.value ) result3.value = {tokenId: 'x'}; // avoid 'undefined' error
                token2 = new AccessToken( result3.value.tokenId, policy2, fullPath, undefined, acl );
                test.deepEqual( result3.value, token2, 'Tokens equal' );

                fin2 = true;
                fin();
            } );
        } );

        // test listing
        var testlist = function() {
            atmos.listAccessTokens( null, function( result ) {
                test.ok( result.successful, 'List tokens' );

                var foundCount = 0;
                result.value.forEach( function( token ) {
                    if ( token.tokenId == token1.tokenId ) {
                        test.deepEqual( token, token1, 'oid token in list matches' );
                        foundCount++;
                    } else if ( token.tokenId == token2.tokenId ) {
                        test.deepEqual( token, token2, 'path token in list matches' );
                        foundCount++;
                    }
                } );
                test.equal( foundCount, 2, 'both tokens found in list' );

                atmos.deleteAccessToken( token1.tokenId, function( result2 ) {
                    test.ok( result2.successful, 'Delete oid token' );

                    atmos.deleteAccessToken( token2.tokenId, function( result3 ) {
                        test.ok( result3.successful, 'Delete path token' );

                        test.done();
                    } );
                } );
            } )
        }
    },

    'testAccessTokenDownload': function( test ) {
        atmos.debug( "testAccessTokenDownload" );

        test.expect( 6 );

        var text = 'Hello World!', fin1 = false, fin2 = false;
        var fin = function() {
            if ( fin1 && fin2 ) {
                atmosConfig.enableUtf8 = true;
                test.done();
            }
        };

        // test OID
        atmos.createObject( null, null, null, null, text, 'text/plain', function( result ) {
            test.ok( result.successful, 'Create oid object' );
            cleanup.push( result.value );

            var expires = new Date();
            expires.setMinutes( expires.getMinutes() + 5 );
            var policy = new AccessTokenPolicy( expires, 0, 1 );
            atmos.createAccessToken( policy, result.value, null, null, null, function( result2 ) {
                test.ok( result2.successful, 'Create oid token' );

                atmos._ajax( /** @type HttpRequest */ {
                    uri: result2.value, // token URL
                    method: "GET",
                    processResult: function( result, xhr ) {
                        result.data = xhr.responseText;
                    },
                    complete: function( result ) {
                        if ( result.successful ) {
                            test.ok( result.data == text, "Correct content returned" );
                        } else {
                            test.ok( false, result.data );
                            atmos.info( result.data );
                        }
                        fin1 = true;
                        fin();
                    }
                } );
            } );
        } );

        // test path
        var fullPath = "/token_test/accesstokendownload2";
        atmosConfig.enableUtf8 = false; // TODO: remove this when testing against >=2.1.3
        atmos.createObjectOnPath( fullPath, null, null, null, null, text, 'text/plain', function( result ) {
            test.ok( result.successful, 'Create path object' );
            cleanup.push( result.value );

            var expires = new Date();
            expires.setMinutes( expires.getMinutes() + 5 );
            var policy = new AccessTokenPolicy( expires, 0, 1 );
            atmos.createAccessToken( policy, fullPath, null, null, null, function( result2 ) {
                test.ok( result2.successful, 'Create path token' );

                atmos._ajax( /** @type HttpRequest */ {
                    uri: result2.value, // token URL
                    method: "GET",
                    processResult: function( result, xhr ) {
                        result.data = xhr.responseText;
                    },
                    complete: function( result ) {
                        if ( result.successful ) {
                            test.ok( result.data == text, "Correct content returned" );
                        } else {
                            test.ok( false, result.data );
                            atmos.info( result.data );
                        }
                        fin2 = true;
                        fin();
                    }
                } );
            } );
        } );
    }
};

cleanupTest = {

    'testCleanup': function( test ) {
        atmos.debug( "cleanupTest.testCleanup" );
        cleanupCount = 0;

        cleanup.push( "/" + specialCharacterName );
        cleanup.push( "/" + directoryName );
        cleanup.push( "/token_test" );

        test.expect( cleanup.length );

        atmos.debug( cleanup.length + " objects to cleanup" );
        doCleanup( 0, test );
    },

    'accessTokenCleanup': function( test ) {
        atmos.debug( "cleanupTest.accessTokenCleanup" );

        cleanup = [];
        cleanupCount = 0;
        var tokens = atmos.listAccessTokens( null, function( result ) {
            result.value.forEach( function( /** @type AccessToken */ token ) {
                cleanup.push( token.tokenId );
            } );
            test.expect( cleanup.length );
            atmos.debug( cleanup.length + " tokens to cleanup" );
            if ( cleanup.length > 0 ) doCleanAccessTokens( 0, test );
            else test.done();
        } );
    }//,

//    'wipeOutHelloWorldFiles': function( test ) {
//        test.expect( 1 );
//        atmos.debug( "cleaning up all Hello World files and directories" );
//        atmos.listDirectory( "/", null, function( result ) {
//            if ( result.successful ) {
//                var rootEntries = result.value;
//                for ( var i = 0; i < rootEntries.length; i++ ) {
//                    var entry = rootEntries[i];
//                    if ( entry.name.length == 8 && entry.type == 'directory' ) {
//                        (function( path ) {
//                            atmos.listDirectory( path + "/", new ListOptions( 0, null, true, null, null ), function( result2 ) {
//                                var subEntries = result2.value;
//                                if ( result2.successful ) {
//                                    if ( subEntries.length == 1 && subEntries[0].name.length == 12 && subEntries[0].type == 'regular' && subEntries[0].systemMeta.size == 12 ) {
//                                        atmos.deleteObject( subEntries[0].path, function( result3 ) {
//                                            if ( result3.successful ) {
//                                                atmos.debug( "Deleted " + subEntries[0].path );
//                                                atmos.deleteObject( path, function( result4 ) {
//                                                    if ( result4.successful ) atmos.debug( "Deleted " + path );
//                                                } );
//                                            }
//                                        } );
//                                    } else if ( subEntries.length == 0 ) {
//                                        atmos.deleteObject( path, function() {
//                                            atmos.debug( "Deleted empty directory " + path );
//                                        } );
//                                    }
//                                }
//                            } );
//                        })( entry.path );
//                    }
//                }
//            }
//        } );
//        test.ok( true, "cleanup complete" );
//        test.done();
//    }
};

doCleanup = function( i, test ) {
    atmos.deleteObject( cleanup[i], function( result ) {
        atmos.debug( "Deleted " + i + ": " + cleanup[i] );
        test.ok( result.successful, "Request successful" );
        cleanupCount++;
        if ( cleanupCount == cleanup.length ) {
            test.done();
        } else {
            doCleanup( i + 1, test )
        }
    } );
};

doCleanAccessTokens = function( i, test ) {
    atmos.deleteAccessToken( cleanup[i], function( result ) {
        atmos.debug( "Deleted token " + i + ": " + cleanup[i] );
        test.ok( result.successful, "Request successful" );
        cleanupCount++;
        if ( cleanupCount == cleanup.length ) {
            test.done();
        } else {
            doCleanAccessTokens( i + 1, test )
        }
    } );
};

if ( typeof(exports) != 'undefined' ) {
    // Register the test groups for node.js
    exports.atmosApi = atmosApi;
    exports.cleanupTest = cleanupTest;
}
