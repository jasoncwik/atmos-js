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

if ( typeof(exports) != 'undefined' ) {
    // We're running inside node.js
    AtmosJS = require( '../atmos.js' );
    AtmosRest = AtmosJS.AtmosRest;
    ListOptions = AtmosJS.ListOptions;
    AtmosRange = AtmosJS.AtmosRange;
    dumpObject = AtmosJS.dumpObject;
    AclEntry = AtmosJS.AclEntry;
    Acl = AtmosJS.Acl;

    require( './atmos-config.js' );
    atmos = new AtmosRest( atmosConfig );
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
var specialCharacterName = ",:&=+$#";
// NOTE: percent (%) for some reason causes signature errors on the server side. I still haven't found a way to avoid this.

atmosApi = {

    'testEncodeUri' : function( test ) {
        atmos.info( "atmosApi.testEncodeUri" );
        test.expect( 3 );

        test.equal( atmos._encodeURI( "/foo#bar" ), "/foo%23bar", "Encode file" );
        test.equal( atmos._encodeURI( "/foo#bar/" ), "/foo%23bar/", "Encode directory" );
        test.equal( atmos._encodeURI( "/foo#bar?baz=bl#ah" ), "/foo%23bar?baz=bl#ah", "Encode file with query" );

        test.done();
    },

    // Basic Create object with some content.
    'testCreateObject' : function( test ) {
        atmos.info( "atmosApi.testCreateObject" );

        test.expect( 6 );
        atmos.createObject( null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( result.value, null, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, "Hello World!", "Data correct" );
                    test.done();
                } );

            } );

    },

    'testDeleteObject' : function( test ) {
        atmos.info( "atmosApi.testDeleteObject" );
        test.expect( 4 );

        atmos.createObject( null, null, null, "Hello World!", null, null, function( result ) {
            test.ok( result.success, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );

            atmos.deleteObject( result.value, null, function( result2 ) {
                test.ok( result2.success, "Delete successful" );
                test.equal( result2.httpCode, 204, "HttpCode correct" );

                test.done();
            } );
        } );
    },

    'testCreateObjectOnPath' : function( test ) {
        atmos.info( "atmosApi.testCreateObjectOnPath" );

        test.expect( 6 );

        var filename = "/" + directoryName + "/" + randomFilename( 8, 3 );
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( filename, null, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, "Hello World!", "Data correct" );
                    test.done();
                } );

            } );
    },

    'testDotDotDirectory' : function( test ) {
        atmos.info( "atmosApi.testDotDotDirectory" );

        test.expect( 9 );

        var subdirectory = "/" + directoryName + "/test/../";
        var filename = randomFilename( 8, 3 );
        var path = subdirectory + filename;

        atmos.createObjectOnPath( path, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + path + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( path, null, null, function( result2 ) {
                    test.ok( result2.success, "Read content file successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, "Hello World!", "Data correct" );

                    // List the .. directory
                    atmos.listDirectory( subdirectory, null, null, function( result3 ) {
                        test.ok( result3.success, "List successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );
                        test.ok( result3.value.length > 0, "List not empty" );
                        test.done();
                    } )
                } );

            } );
    },

    'testDeleteObjectOnPath' : function( test ) {
        atmos.info( "atmosApi.testDeleteObjectOnPath" );

        test.expect( 5 );

        var filename = "/" + directoryName + "/" + randomFilename( 8, 3 );
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                atmos.deleteObject( filename, null, function( result2 ) {
                    test.ok( result2.success, "Delete successful" );
                    test.equal( result2.httpCode, 204, "HttpCode correct" );

                    if ( !result2.success ) {
                        // Delete failed, so make sure object is cleaned up
                        cleanup.push( result.value );
                    }

                    test.done();
                } );
            } );
    },

    'testCreateObjectWithMetadata' : function( test ) {
        atmos.info( "atmosApi.testCreateObjectWithMetadata" );

        test.expect( 7 );
        var meta = {foo:"bar", foo2:"baz"};
        var listableMeta = {listable:""};
        atmos.createObject( null, meta, listableMeta, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object metadata back and verify content
                atmos.getUserMetadata( result.value, ["foo", "listable"], null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.value.meta["foo"], "bar", "Metadata value: " + result2.value.meta["foo"] );
                    test.equal( result2.value.listableMeta["listable"], "", "Listable metadata" );
                    test.equal( result2.value.meta["foo2"], null, "Metadata filtering" );
                    test.done();
                } );
            } );
    },

    'testUpdateObject' : function( test ) {
        atmos.info( "atmosApi.testCreateObject" );

        test.expect( 21 );
        var data = "Hello World!";
        atmos.createObject( null, null, null, data, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Create successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( result.value, null, null, function( result2 ) {
                    test.ok( result2.success, "Read successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, data, "Data correct" );

                    // Update object range
                    var range = new AtmosRange( 6, 5 );
                    atmos.updateObject( result.value, null, null, null, "Timmy", range, "text/plain", null, function( result3 ) {
                        test.ok( result3.success, "Update range successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );

                        atmos.readObject( result.value, null, null, function( result4 ) {
                            test.ok( result4.success, "Request successful" );
                            test.equal( result4.httpCode, 200, "HttpCode correct" );
                            test.equal( result4.data, "Hello Timmy!", "Update range confirmed" );

                            // Update entire object
                            data = "Timmy was here.";
                            atmos.updateObject( result.value, null, null, null, data, null, "text/plain", null, function( result5 ) {
                                test.ok( result5.success, "Update whole successful" );
                                test.equal( result5.httpCode, 200, "HttpCode correct" );

                                atmos.readObject( result.value, null, null, function( result6 ) {
                                    test.ok( result6.success, "Request successful" );
                                    test.equal( result6.httpCode, 200, "HttpCode correct" );
                                    test.equal( result6.data, data, "Update whole confirmed" );

                                    // Append to object
                                    var appended = " And so was Stu.";
                                    range = new AtmosRange( data.length, appended.length );
                                    atmos.updateObject( result.value, null, null, null, appended, range, "text/plain", null, function( result7 ) {
                                        test.ok( result7.success, "Append successful" );
                                        test.equal( result7.httpCode, 200, "HttpCode correct" );

                                        atmos.readObject( result.value, null, null, function( result8 ) {
                                            test.ok( result8.success, "Request successful" );
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

    'testGetListableTags' : function( test ) {
        atmos.info( "atmosApi.testGetListableTags" );

        test.expect( 6 );
        var listableMeta = {'listable4/listable5':""};
        atmos.createObject( null, null, listableMeta, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                atmos.getListableTags( "listable4", null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.value.length, 1, "One result returned" );
                    test.equal( result2.value[0], "listable5", "Correct data returned" );
                    test.done();
                } );
            } );
    },

    'testListObjects' : function( test ) {
        atmos.info( "atmosApi.testListObjects" );

        test.expect( 8 );
        var listableMeta = {listable3:""};
        var userMeta = {foo:"bar"};
        atmos.createObject( null, userMeta, listableMeta, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var options = new ListOptions( 0, null, true, null, null );
                atmos.listObjects( "listable3", options, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    if ( !result2.success ) {
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

    'testListDirectory' : function( test ) {
        atmos.info( "atmosApi.testListDirectory" );

        test.expect( 10 );

        var directory = "/" + directoryName + "/";
        var filename = randomFilename( 8, 3 );
        var fullPath = directory + filename;
        var listableMeta = {listable3:""};
        var userMeta = {foo:"bar"};
        atmos.debug( "Full Path: " + fullPath );

        atmos.createObjectOnPath( fullPath, null, userMeta, listableMeta, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var options = new ListOptions( 0, null, true, null, null );
                atmos.listDirectory( directory, options, null, function( result2 ) {
                    test.ok( result2.success, "List successful" );
                    if ( !result2.success ) {
                        test.done();
                        return;
                    }
                    // Iterate through the results and make sure our OID is present
                    for ( var i = 0; i < result2.value.length; i++ ) {
                        // @type DirectoryEntry
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

    'testGetShareableUrl' : function( test ) {
        atmos.info( "atmosApi.testGetShareableUrl" );
        var text = "Hello World!";

        test.expect( 4 );
        atmos.createObject( null, null, null, text, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var url = atmos.getShareableUrl( result.value, expires );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( xhr ) {
                        test.ok( false, xhr.responseText );
                        atmos.info( xhr.responseText );
                        test.done();
                    },
                    success: function( xhr ) {
                        test.ok( xhr.responseText == text, "Correct content returned" );
                        test.done();
                    }
                } );
            } );
    },

    'testGetShareableUrlOnPath' : function( test ) {
        atmos.info( "atmosApi.testGetShareableUrlOnPath" );

        test.expect( 4 );

        var text = "Hello World!";
        var directory = "/" + directoryName + "/";
        var filename = randomFilename( 8, 3 );
        var fullPath = directory + filename;
        atmos.debug( "Full Path: " + fullPath );

        atmos.createObjectOnPath( fullPath, null, null, null, text, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var url = atmos.getShareableUrl( fullPath, expires );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( xhr ) {
                        test.ok( false, xhr.responseText );
                        atmos.info( xhr.responseText );
                        test.done();
                    },
                    success: function( xhr ) {
                        test.ok( xhr.responseText == text, "Correct content returned" );
                        test.done();
                    }
                } );
            } );
    },

    'testCreateObjectOnPathWithSpecialCharacters' : function( test ) {
        atmos.info( "atmosApi.testCreateObjectOnPathWithSpecialCharacters" );

        test.expect( 6 );

        var filename = "/" + specialCharacterName + "/test123.stu";
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object back and verify content
                atmos.readObject( filename, null, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, "Hello World!", "Data correct" );
                    test.done();
                } );

            } );
    },

    'testGetShareableUrlOnPathWithDisposition' : function( test ) {
        atmos.info( "atmosApi.testGetShareableUrlOnPathWithDisposition" );

        test.expect( 4 );

        var text = "Hello World!";
        var fullPath = "/" + directoryName + "/" + randomFilename( 8, 3 );

        atmos.createObjectOnPath( fullPath, null, null, null, text, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var disposition = atmos.createAttachmentDisposition();
                var url = atmos.getShareableUrl( fullPath, expires, disposition );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( xhr ) {
                        test.ok( false, xhr.responseText );
                        atmos.info( xhr.responseText );
                        test.done();
                    },
                    success: function( xhr ) {
                        test.ok( xhr.responseText == text, "Correct content returned" );
                        test.done();
                    }
                } );
            } );
    },

    'testGetShareableUrlOnPathWithDispositionFilename' : function( test ) {
        atmos.info( "atmosApi.testGetShareableUrlOnPathWithDispositionFilename" );

        test.expect( 4 );

        var text = "Hello World!";
        var fullPath = "/" + directoryName + "/" + randomFilename( 8, 3 );

        atmos.createObjectOnPath( fullPath, null, null, null, text, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var disposition = atmos.createAttachmentDisposition( "бöｼ.txt" );
                var url = atmos.getShareableUrl( fullPath, expires, disposition );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( xhr ) {
                        test.ok( false, xhr.responseText );
                        atmos.info( xhr.responseText );
                        test.done();
                    },
                    success: function( xhr ) {
                        test.ok( xhr.responseText == text, "Correct content returned" );
                        test.done();
                    }
                } );
            } );
    },

    'testGetShareableUrlWithSpecialCharacters' : function( test ) {
        atmos.info( "atmosApi.testGetShareableUrlWithSpecialCharacters" );

        test.expect( 4 );

        var filename = "/" + specialCharacterName + "/test2123.stu";
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var url = atmos.getShareableUrl( filename, expires );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( xhr ) {
                        test.ok( false, xhr.responseText );
                        atmos.info( xhr.responseText );
                        test.done();
                    },
                    success: function( xhr ) {
                        test.ok( xhr.responseText == "Hello World!", "Correct content returned" );
                        test.done();
                    }
                } );
            } );
    },

    'testGetAcl' : function( test ) {
        atmos.info( "atmosApi.testGetAcl" );

        test.expect( 6 );

        var myAccess = new AclEntry( 'stu', AclEntry.ACL_PERMISSIONS.FULL_CONTROL );
        var groupAccess = new AclEntry( AclEntry.GROUPS.OTHER, AclEntry.ACL_PERMISSIONS.READ );
        var acl = new Acl( [myAccess], [groupAccess] );

        atmos.createObject( acl, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the ACL back and verify
                atmos.getAcl( result.value, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( dumpObject( result2.value ), dumpObject( acl ) );
                    test.done();
                } );

            } );
    },

    'testSetAcl' : function( test ) {
        atmos.info( "atmosApi.testSetAcl" );

        test.expect( 8 );

        var myAccess = new AclEntry( 'stu', AclEntry.ACL_PERMISSIONS.FULL_CONTROL );
        var bobsAccess = new AclEntry( 'jimbob', AclEntry.ACL_PERMISSIONS.READ );
        var groupAccess = new AclEntry( AclEntry.GROUPS.OTHER, AclEntry.ACL_PERMISSIONS.READ );
        var acl = new Acl( [myAccess, bobsAccess], [groupAccess] );

        atmos.createObject( null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Set ACL
                atmos.setAcl( result.value, acl, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );

                    // Read the ACL back and verify
                    atmos.getAcl( result.value, null, function( result3 ) {
                        test.ok( result3.success, "Request successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );
                        test.equal( dumpObject( result3.value ), dumpObject( acl ) );
                        test.done();
                    } );
                } );
            } );
    },

    'testGetSystemMetadata' : function( test ) {
        atmos.info( "atmosApi.testGetSystemMetadata" );

        test.expect( 7 );
        atmos.createObject( null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the system metadata and verify content
                atmos.getSystemMetadata( result.value, null, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.value.systemMeta["size"], 12, "Size correct" );
                    test.equal( result2.value.systemMeta["type"], "regular", "Type correct" );
                    test.done();
                } );

            } );

    },

    'testSetUserMetadata' : function( test ) {
        atmos.info( "atmosApi.testSetUserMetadata" );

        test.expect( 11 );
        atmos.createObject( null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // add metadata
                var meta = {foo:"bar", foo2:"baz"};
                var listableMeta = {listable:""};
                atmos.setUserMetadata( result.value, meta, listableMeta, null, function( result2 ) {
                    test.ok( result2.success, "Add metadata request successful" );
                    // Read back and verify content
                    atmos.getUserMetadata( result.value, null, null, function( result3 ) {
                        test.ok( result3.success, "Get metadata request successful" );
                        test.equal( result3.value.meta["foo"], "bar", "Add metadata" );
                        test.equal( result3.value.meta["foo2"], "baz", "Add metadata" );
                        test.equal( result3.value.listableMeta["listable"], "", "Add metadata" );

                        // update metadata
                        meta.foo2 = "bazbaz";
                        atmos.setUserMetadata( result.value, meta, listableMeta, null, function( result4 ) {
                            test.ok( result4.success, "Update metadata request successful" );
                            // Read back and verify content
                            atmos.getUserMetadata( result.value, null, null, function( result5 ) {
                                test.ok( result5.success, "Get metadata request successful" );
                                test.ok( result5.value.meta["foo2"], "bazbaz", "Metadata update" );
                                test.done();
                            } );
                        } );
                    } );
                } );
            } );
    },

    'testDeleteUserMetadata' : function( test ) {
        atmos.info( "atmosApi.testDeleteUserMetadata" );

        test.expect( 12 );

        var meta = {foo:"bar", foo2:"baz"};
        var listableMeta = {listable:""};
        atmos.createObject( null, meta, listableMeta, "Hello World!", "text/plain", null, function( result ) {
            test.ok( result.success, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // Read the object metadata back and verify content
            atmos.getUserMetadata( result.value, null, null, function( result2 ) {
                test.ok( result2.success, "Request successful" );
                test.equal( result2.value.meta["foo"], "bar", "Metadata" );
                test.equal( result2.value.meta["foo2"], "baz", "Metadata" );
                test.equal( result2.value.listableMeta["listable"], "", "Listable metadata" );

                // delete metadata
                var tags = ["foo2","listable"];
                atmos.deleteUserMetadata( result.value, tags, null, function( result3 ) {
                    test.ok( result3.success, "Delete metadata request successful" );

                    // Read back and verify content
                    atmos.getUserMetadata( result.value, null, null, function( result4 ) {
                        test.ok( result4.success, "Get metadata request successful" );
                        test.equal( result4.value.meta["foo"], "bar", "Metadata" );
                        test.equal( result4.value.meta["foo2"], null, "Metadata" );
                        test.equal( result4.value.listableMeta, null, "Metadata" );
                        test.done();
                    } );
                } );
            } );
        } );
    },

    'testRename' : function( test ) {
        atmos.info( "atmosApi.testRename" );

        test.expect( 8 );

        var filename = "/" + directoryName + "/" + randomFilename( 8, 3 );
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + filename + ")" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // rename the object
                var newName = "/" + directoryName + "/" + randomFilename( 8, 3 );
                atmos.rename( filename, newName, false, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );

                    // Read the object back and verify content
                    atmos.readObject( newName, null, null, function( result3 ) {
                        test.ok( result3.success, "Request successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );
                        test.equal( result3.data, "Hello World!", "Data correct" );
                        test.done();
                    } );
                } );
            } );
    },

    'testGetAllMetadata' : function( test ) {
        atmos.info( "atmosApi.testGetAllMetadata" );

        test.expect( 9 );

        var myAccess = new AclEntry( 'stu', AclEntry.ACL_PERMISSIONS.FULL_CONTROL );
        var groupAccess = new AclEntry( AclEntry.GROUPS.OTHER, AclEntry.ACL_PERMISSIONS.READ );
        var acl = new Acl( [myAccess], [groupAccess] );
        var meta = {foo:"bar", foo2:"baz"};
        var listableMeta = {listable:""};
        atmos.createObject( acl, meta, listableMeta, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the system metadata and verify content
                atmos.getAllMetadata( result.value, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
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

    'testlistUserMetadataTags' : function( test ) {
        atmos.info( "atmosApi.testlistUserMetadataTags" );

        test.expect( 7 );

        var meta = {foo:"bar", foo2:"baz"};
        var listableMeta = {listable:""};
        atmos.createObject( null, meta, listableMeta, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the system metadata and verify content
                atmos.listUserMetadataTags( result.value, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( dumpObject( result2.value.tags ), dumpObject( Object.keys( meta ) ), "Non-listable tags equal" );
                    test.equal( dumpObject( result2.value.listableTags ), dumpObject( Object.keys( listableMeta ) ), "Listable tags equal" );
                    test.done();
                } );

            } );
    },

    'testGetObjectInfo' : function( test ) {
        atmos.info( "atmosApi.testGetObjectInfo" );

        test.expect( 6 );

        atmos.createObject( null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.value != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                cleanup.push( result.value );

                // Read the object info and verify content
                atmos.getObjectInfo( result.value, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.value.objectId, result.value, "object IDs equal" );
                    test.done();
                } );

            } );
    },

    'testVersionObject' : function( test ) {
        atmos.info( "atmosApi.testVersionObject" );

        test.expect( 12 );

        atmos.createObject( null, null, null, "Hello World!", "text/plain", null, function( result ) {
            test.ok( result.success, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // create version
            atmos.versionObject( result.value, null, function( result2 ) {
                test.ok( result2.success, "Request successful" );
                test.ok( result2.value != null, "Object ID not null" );
                test.equal( result2.httpCode, 201, "HttpCode correct" );

                // modify base object
                atmos.updateObject( result.value, null, null, null, "Goodbye World!", null, "text/plain", null, function( result3 ) {
                    test.ok( result3.success, "Request successful" );
                    test.equal( result3.httpCode, 200, "HttpCode correct" );

                    // read base object
                    atmos.readObject( result.value, null, null, function( result4 ) {
                        test.ok( result4.success, "Request successful" );
                        test.equal( result4.data, "Goodbye World!" );

                        // read version
                        atmos.readObject( result2.value, null, null, function( result5 ) {
                            test.ok( result5.success, "Request successful" );
                            test.equal( result5.data, "Hello World!" );
                            test.done();
                        } );
                    } );
                } );
            } );
        } );
    },

    'testListVersions' : function( test ) {
        atmos.info( "atmosApi.testListVersions" );

        test.expect( 9 );

        atmos.createObject( null, null, null, "Hello World!", "text/plain", null, function( result ) {
            test.ok( result.success, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // create version
            atmos.versionObject( result.value, null, function( result2 ) {
                test.ok( result2.success, "Request successful" );
                test.ok( result2.value != null, "Object ID not null" );
                test.equal( result2.httpCode, 201, "HttpCode correct" );

                // list versions
                atmos.listVersions( result.value, null, function( result3 ) {
                    test.ok( result3.success, "Request successful" );
                    test.equal( result3.httpCode, 200, "HttpCode correct" );
                    test.equal( result3.value.length, 1 );
                    test.done();
                } );
            } );
        } );
    },

    'testRestoreVersion' : function( test ) {
        atmos.info( "atmosApi.testRestoreVersion" );

        test.expect( 13 );

        atmos.createObject( null, null, null, "Hello World!", "text/plain", null, function( result ) {
            test.ok( result.success, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // create version
            atmos.versionObject( result.value, null, function( result2 ) {
                test.ok( result2.success, "Request successful" );
                test.ok( result2.value != null, "Object ID not null" );
                test.equal( result2.httpCode, 201, "HttpCode correct" );

                // modify base object
                atmos.updateObject( result.value, null, null, null, "Goodbye World!", null, "text/plain", null, function( result3 ) {
                    test.ok( result3.success, "Request successful" );
                    test.equal( result3.httpCode, 200, "HttpCode correct" );

                    // restore version
                    atmos.restoreVersion( result.value, result2.value, null, function( result4 ) {
                        test.ok( result4.success, "Request successful" );
                        test.equal( result4.httpCode, 200, "HttpCode correct" );

                        // read base object
                        atmos.readObject( result.value, null, null, function( result5 ) {
                            test.ok( result5.success, "Request successful" );
                            test.equal( result5.httpCode, 200, "HttpCode correct" );
                            test.equal( result5.data, "Hello World!" );
                            test.done();
                        } );
                    } );
                } );
            } );
        } );
    },

    'testDeleteVersion' : function( test ) {
        atmos.info( "atmosApi.testDeleteVersion" );

        test.expect( 8 );

        atmos.createObject( null, null, null, "Hello World!", "text/plain", null, function( result ) {
            test.ok( result.success, "Request successful" );
            test.ok( result.value != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            cleanup.push( result.value );

            // create version
            atmos.versionObject( result.value, null, function( result2 ) {
                test.ok( result2.success, "Request successful" );
                test.ok( result2.value != null, "Object ID not null" );
                test.equal( result2.httpCode, 201, "HttpCode correct" );

                // delete version
                atmos.deleteVersion( result2.value, null, function( result3 ) {
                    test.ok( result3.success, "Request successful" );
                    test.equal( result3.httpCode, 204, "HttpCode correct" );
                    test.done();
                } );
            } );
        } );
    }
};

cleanupTest = {

    'testCleanup' : function( test ) {
        atmos.info( "cleanupTest.testCleanup" );
        cleanupCount = 0;

        cleanup.push( "/" + specialCharacterName );
        cleanup.push( "/" + directoryName );

        test.expect( cleanup.length );

        atmos.info( cleanup.length + " objects to cleanup" );
        for ( var i = 0; i < cleanup.length; i++ ) {
            doCleanup( i, cleanup[i], test );
        }
    }/*,

     'wipeOutHelloWorldFiles' : function(test) {
     test.expect(1);
     atmos.info("cleaning up all Hello World files and directories");
     atmos.listDirectory("/", null, null, function(result) {
     if (result.success) {
     var rootEntries = result.value;
     for (var i = 0; i < rootEntries.length; i++) {
     var entry = rootEntries[i];
     if (entry.name.length == 8 && entry.type == 'directory') {
     (function(path) {
     atmos.listDirectory(path + "/", new ListOptions(0, null, true, null, null), null, function(result2) {
     var subEntries = result2.value;
     if (result2.success) {
     if (subEntries.length == 1 && subEntries[0].name.length == 12 && subEntries[0].type == 'regular' && subEntries[0].systemMeta.size == 12) {
     atmos.deleteObject(subEntries[0].path, null, function(result3) {
     if (result3.success) {
     atmos.info("Deleted " + subEntries[0].path);
     atmos.deleteObject(path, null, function(result4) {
     if (result4.success) atmos.info("Deleted " + path);
     });
     }
     });
     } else if (subEntries.length == 0) {
     atmos.deleteObject(path, null, function(result3) {
     atmos.info("Deleted empty directory " + path);
     });
     }
     }
     });
     })(entry.path);
     }
     }
     }
     });
     test.ok(true, "cleanup complete");
     test.done();
     }*/
};

doCleanup = function( i, oid, test ) {
    var current = i;
    atmos.deleteObject( cleanup[i], null, function( result ) {
        atmos.debug( "Deleted " + current + ": " + cleanup[current] );
        test.ok( result.success, "Request successful" );
        cleanupCount++;
        if ( cleanupCount == cleanup.length ) {
            test.done();
        }
    } );
};

if ( typeof(exports) != 'undefined' ) {
    // Register the test groups for node.js
    exports.atmosApi = atmosApi;
    exports.cleanupTest = cleanupTest;
}
