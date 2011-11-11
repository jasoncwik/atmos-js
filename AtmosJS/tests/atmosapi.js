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
    console.log( "Loading modules" );
    // We're running inside node.js
    //require( 'tests/atmos-config.js' );

    var AtmosJS = require( 'atmos.js' );
    var AtmosRest = AtmosJS.AtmosRest;
    var ListOptions = AtmosJS.ListOptions;
    require( 'tests/atmos-config.js' );
    global.atmos = new AtmosRest( atmosConfig );

}


cleanup = [];

fileChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=+*,!#%$&()";
innerChars = this.fileChars + " ";

randomFilename = function( name, ext ) {
    var fn = "";
    for ( var i = 0; i < name; i++ ) {
        if ( i == 0 ) {
            fn += this.fileChars.charAt( Math.floor( Math.random() * (this.fileChars.length - 1) ) );
        } else {
            fn += this.innerChars.charAt( Math.floor( Math.random() * (this.innerChars.length - 1) ) );
        }
    }

    if ( ext && ext > 0 ) {
        fn += ".";
        for ( var j = 0; j < ext; j++ ) {
            fn += this.fileChars.charAt( Math.floor( Math.random() * (this.fileChars.length - 1) ) );
        }
    }

    return fn;
};

var directoryName = randomFilename( 8, 0 );
var specialCharacterName = ",:&=+$#";
// NOTE: percent (%) for some reason causes signature errors on the server side. I still haven't found a way to avoid this.

this.atmosApi = {

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
        this.atmos.info( "atmosApi.testCreateObject" );

        test.expect( 6 );
        atmos.createObject( null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                // Read the object back and verify content
                atmos.readObject( result.objectId, null, null, function( result2 ) {
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
            test.ok( result.objectId != null, "Object ID not null" );

            atmos.deleteObject( result.objectId, null, function( result2 ) {
                test.ok( result2.success, "Delete successful" );
                test.equal( result2.httpCode, 204, "HttpCode correct" );

                test.done();
            } );
        } );
    },

    'testCreateObjectOnPath' : function( test ) {
        atmos.info( "atmosApi.testCreateObjectOnPath" );

        test.expect( 6 );

        var filename = "/" + directoryName + "/" + this.randomFilename( 8, 3 );
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + filename + ")" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

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
        var filename = this.randomFilename( 8, 3 );
        var path = subdirectory + filename;

        atmos.createObjectOnPath( path, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + path + ")" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                // Read the object back and verify content
                atmos.readObject( path, null, null, function( result2 ) {
                    test.ok( result2.success, "Read content file successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, "Hello World!", "Data correct" );

                    // List the .. directory
                    atmos.listDirectory( subdirectory, null, null, function( result3 ) {
                        test.ok( result3.success, "List successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );
                        test.ok( result3.results.length > 0, "List not empty" );
                        test.done();
                    } )
                } );

            } );
    },

    'testDeleteObjectOnPath' : function( test ) {
        atmos.info( "atmosApi.testDeleteObjectOnPath" );

        test.expect( 5 );

        var filename = "/" + directoryName + "/" + this.randomFilename( 8, 3 );
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + filename + ")" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                atmos.deleteObject( filename, null, function( result2 ) {
                    test.ok( result2.success, "Delete successful" );
                    test.equal( result2.httpCode, 204, "HttpCode correct" );

                    if ( !result2.success ) {
                        // Delete failed, so make sure object is cleaned up
                        this.cleanup.push( result.objectId );
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
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                // Read the object metadata back and verify content
                atmos.getUserMetadata( result.objectId, ["foo", "listable"], null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.meta["foo"], "bar", "Metadata value: " + result2.meta["foo"] );
                    test.equal( result2.listableMeta["listable"], "", "Listable metadata" );
                    test.equal( result2.meta["foo2"], null, "Metadata filtering" );
                    test.done();
                } );
            } );
    },

    'testUpdateObject' : function( test ) {
        this.atmos.info( "atmosApi.testCreateObject" );

        test.expect( 21 );
        var data = "Hello World!";
        atmos.createObject( null, null, null, data, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Create successful" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                // Read the object back and verify content
                atmos.readObject( result.objectId, null, null, function( result2 ) {
                    test.ok( result2.success, "Read successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.data, data, "Data correct" );

                    // Update object range
                    var range = new AtmosRange( 6, 5 );
                    atmos.updateObject( result.objectId, null, null, null, "Timmy", range, "text/plain", null, function( result3 ) {
                        test.ok( result3.success, "Update range successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );

                        atmos.readObject( result.objectId, null, null, function( result4 ) {
                            test.ok( result4.success, "Request successful" );
                            test.equal( result4.httpCode, 200, "HttpCode correct" );
                            test.equal( result4.data, "Hello Timmy!", "Update range confirmed" );

                            // Update entire object
                            data = "Timmy was here.";
                            atmos.updateObject( result.objectId, null, null, null, data, null, "text/plain", null, function( result5 ) {
                                test.ok( result5.success, "Update whole successful" );
                                test.equal( result5.httpCode, 200, "HttpCode correct" );

                                atmos.readObject( result.objectId, null, null, function( result6 ) {
                                    test.ok( result6.success, "Request successful" );
                                    test.equal( result6.httpCode, 200, "HttpCode correct" );
                                    test.equal( result6.data, data, "Update whole confirmed" );

                                    // Append to object
                                    var appended = " And so was Stu.";
                                    range = new AtmosRange( data.length, appended.length );
                                    atmos.updateObject( result.objectId, null, null, null, appended, range, "text/plain", null, function( result7 ) {
                                        test.ok( result7.success, "Append successful" );
                                        test.equal( result7.httpCode, 200, "HttpCode correct" );

                                        atmos.readObject( result.objectId, null, null, function( result8 ) {
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

    'testListObjects' : function( test ) {
        atmos.info( "atmosApi.testListObjects" );

        test.expect( 8 );
        var listableMeta = {listable3:""};
        var userMeta = {foo:"bar"};
        atmos.createObject( null, userMeta, listableMeta, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                var options = new ListOptions( 0, null, true, null, null );
                atmos.listObjects( "listable3", options, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    if ( !result2.success ) {
                        test.done();
                        return;
                    }
                    // Iterate through the results and make sure our OID is present
                    for ( var i = 0; i < result2.results.length; i++ ) {
                        // @type ObjectResult
                        var obj = result2.results[i];
                        if ( obj.objectId == result.objectId ) {
                            test.equal( obj.objectId, result.objectId, "Object ID equal" );
                            test.equal( obj.userMeta["foo"], "bar", "Object metadata" );
                            test.equal( obj.listableUserMeta["listable3"], "", "Listable object metadata" );
                            test.equal( obj.systemMeta["size"], "12", "System metadata" );
                            test.done();
                            return;
                        }
                    }

                    test.ok( false, "Could not find oid " + result.objectId + " in object list" );
                    test.done();
                } );
            } );
    },

    'testListDirectory' : function( test ) {
        atmos.info( "atmosApi.testListDirectory" );

        test.expect( 10 );

        var directory = "/" + directoryName + "/";
        var filename = this.randomFilename( 8, 3 );
        var fullPath = directory + filename;
        var listableMeta = {listable3:""};
        var userMeta = {foo:"bar"};
        atmos.debug( "Full Path: " + fullPath );

        atmos.createObjectOnPath( fullPath, null, userMeta, listableMeta, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                var options = new ListOptions( 0, null, true, null, null );
                atmos.listDirectory( directory, options, null, function( result2 ) {
                    test.ok( result2.success, "List successful" );
                    if ( !result2.success ) {
                        test.done();
                        return;
                    }
                    // Iterate through the results and make sure our OID is present
                    for ( var i = 0; i < result2.results.length; i++ ) {
                        // @type DirectoryEntry
                        var entry = result2.results[i];
                        atmos.debug( "entry: " + dumpObject( entry ) );
                        if ( entry.objectId == result.objectId ) {
                            test.equal( entry.path, fullPath, "Path equal" );
                            test.equal( entry.name, filename, "Filename equal" );
                            test.equal( entry.objectId, result.objectId, "Object ID equal" );
                            test.equal( entry.userMeta["foo"], "bar", "Object metadata" );
                            test.equal( entry.listableUserMeta["listable3"], "", "Listable object metadata" );
                            test.equal( entry.systemMeta["size"], "12", "System metadata" );
                            test.done();
                            return;
                        }
                    }

                    test.ok( false, "Could not find oid " + result.objectId + " in object list" );
                    test.done();
                } );
            } );
    },

    'testGetShareableUrl' : function( test ) {
        this.atmos.info( "atmosApi.testGetShareableUrl" );
        var text = "Hello World!";

        test.expect( 4 );
        atmos.createObject( null, null, null, text, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var url = atmos.getShareableUrl( result.objectId, expires );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( jqXHR, textStatus, errorThrown ) {
                        test.ok( false, textStatus );
                        test.done();
                    },
                    success: function( textStatus, jqXHR ) {
                        test.ok( jqXHR.responseText == text, "Correct content returned" );
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
        var filename = this.randomFilename( 8, 3 );
        var fullPath = directory + filename;
        atmos.debug( "Full Path: " + fullPath );

        atmos.createObjectOnPath( fullPath, null, null, null, text, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var url = atmos.getShareableUrl( fullPath, expires );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( jqXHR, textStatus, errorThrown ) {
                        test.ok( false, textStatus );
                        test.done();
                    },
                    success: function( textStatus, jqXHR ) {
                        test.ok( jqXHR.responseText == text, "Correct content returned" );
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
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

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
        var fullPath = "/" + directoryName + "/" + this.randomFilename( 8, 3 );

        atmos.createObjectOnPath( fullPath, null, null, null, text, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var disposition = atmos.createAttachmentDisposition();
                var url = atmos.getShareableUrl( fullPath, expires, disposition );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( jqXHR, textStatus, errorThrown ) {
                        test.ok( false, textStatus );
                        test.done();
                    },
                    success: function( textStatus, jqXHR ) {
                        test.ok( jqXHR.responseText == text, "Correct content returned" );
                        test.done();
                    }
                } );
            } );
    },

    'testGetShareableUrlOnPathWithDispositionFilename' : function( test ) {
        atmos.info( "atmosApi.testGetShareableUrlOnPathWithDispositionFilename" );

        test.expect( 4 );

        var text = "Hello World!";
        var fullPath = "/" + directoryName + "/" + this.randomFilename( 8, 3 );

        atmos.createObjectOnPath( fullPath, null, null, null, text, "text/plain", null,
            function( result ) {

                test.ok( result.success, "Creation successful" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var disposition = atmos.createAttachmentDisposition( "бöｼ.txt" );
                var url = atmos.getShareableUrl( fullPath, expires, disposition );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( jqXHR, textStatus, errorThrown ) {
                        test.ok( false, textStatus );
                        test.done();
                    },
                    success: function( textStatus, jqXHR ) {
                        test.ok( jqXHR.responseText == text, "Correct content returned" );
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
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                var expires = new Date();
                expires.setMinutes( expires.getMinutes() + 5 );
                var url = atmos.getShareableUrl( filename, expires );

                atmos._ajax( {
                    type: "GET",
                    url: url,
                    error: function( jqXHR, textStatus, errorThrown ) {
                        test.ok( false, textStatus );
                        test.done();
                    },
                    success: function( textStatus, jqXHR ) {
                        test.ok( jqXHR.responseText == "Hello World!", "Correct content returned" );
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
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                // Read the ACL back and verify
                atmos.getAcl( result.objectId, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( dumpObject( result2.acl ), dumpObject( acl ) );
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
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                // Set ACL
                atmos.setAcl( result.objectId, acl, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );

                    // Read the ACL back and verify
                    atmos.getAcl( result.objectId, null, function( result3 ) {
                        test.ok( result3.success, "Request successful" );
                        test.equal( result3.httpCode, 200, "HttpCode correct" );
                        test.equal( dumpObject( result3.acl ), dumpObject( acl ) );
                        test.done();
                    } );
                } );
            } );
    },

    'testGetSystemMetadata' : function( test ) {
        this.atmos.info( "atmosApi.testGetSystemMetadata" );

        test.expect( 7 );
        atmos.createObject( null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                // Read the system metadata and verify content
                atmos.getSystemMetadata( result.objectId, null, null, function( result2 ) {
                    test.ok( result2.success, "Request successful" );
                    test.equal( result2.httpCode, 200, "HttpCode correct" );
                    test.equal( result2.systemMeta["size"], 12, "Size correct" );
                    test.equal( result2.systemMeta["type"], "regular", "Type correct" );
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
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                // add metadata
                var meta = {foo:"bar", foo2:"baz"};
                var listableMeta = {listable:""};
                atmos.setUserMetadata( result.objectId, meta, listableMeta, null, function( result2 ) {
                    test.ok( result2.success, "Add metadata request successful" );
                    // Read back and verify content
                    atmos.getUserMetadata( result.objectId, null, null, function( result3 ) {
                        test.ok( result3.success, "Get metadata request successful" );
                        test.equal( result3.meta["foo"], "bar", "Add metadata" );
                        test.equal( result3.meta["foo2"], "baz", "Add metadata" );
                        test.equal( result3.listableMeta["listable"], "", "Add metadata" );

                        // update metadata
                        meta.foo2 = "bazbaz";
                        atmos.setUserMetadata( result.objectId, meta, listableMeta, null, function( result4 ) {
                            test.ok( result4.success, "Update metadata request successful" );
                            // Read back and verify content
                            atmos.getUserMetadata( result.objectId, null, null, function( result5 ) {
                                test.ok( result5.success, "Get metadata request successful" );
                                test.ok( result5.meta["foo2"], "bazbaz", "Metadata update" );
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
            test.ok( result.objectId != null, "Object ID not null" );
            test.equal( result.httpCode, 201, "HttpCode correct" );

            // Enqueue for cleanup
            this.cleanup.push( result.objectId );

            // Read the object metadata back and verify content
            atmos.getUserMetadata( result.objectId, null, null, function( result2 ) {
                test.ok( result2.success, "Request successful" );
                test.equal( result2.meta["foo"], "bar", "Metadata" );
                test.equal( result2.meta["foo2"], "baz", "Metadata" );
                test.equal( result2.listableMeta["listable"], "", "Listable metadata" );

                // delete metadata
                var tags = ["foo2","listable"];
                atmos.deleteUserMetadata( result.objectId, tags, null, function( result3 ) {
                    test.ok( result3.success, "Delete metadata request successful" );

                    // Read back and verify content
                    atmos.getUserMetadata( result.objectId, null, null, function( result4 ) {
                        test.ok( result4.success, "Get metadata request successful" );
                        test.equal( result4.meta["foo"], "bar", "Metadata" );
                        test.equal( result4.meta["foo2"], null, "Metadata" );
                        test.equal( result4.listableMeta, null, "Metadata" );
                        test.done();
                    } );
                } );
            } );
        } );
    },

    'testRename' : function( test ) {
        atmos.info( "atmosApi.testRename" );

        test.expect( 8 );

        var filename = "/" + directoryName + "/" + this.randomFilename( 8, 3 );
        atmos.debug( "Filename: " + filename );

        atmos.createObjectOnPath( filename, null, null, null, "Hello World!", "text/plain", null,
            function( result ) {

                test.ok( result.success, "Request successful (" + filename + ")" );
                test.ok( result.objectId != null, "Object ID not null" );
                test.equal( result.httpCode, 201, "HttpCode correct" );

                // Enqueue for cleanup
                this.cleanup.push( result.objectId );

                // rename the object
                var newName = "/" + directoryName + "/" + this.randomFilename( 8, 3 );
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
    }

};

cleanupTest = {

    'testCleanup' : function( test ) {
        atmos.info( "cleanupTest.testCleanup" );
        this.cleanupCount = 0;

        this.cleanup.push( "/" + specialCharacterName );
        this.cleanup.push( "/" + directoryName );

        test.expect( this.cleanup.length );

        atmos.info( this.cleanup.length + " objects to cleanup" );
        for ( var i = 0; i < this.cleanup.length; i++ ) {
            this.doCleanup( i, this.cleanup[i], test );
        }
    }/*,

     'wipeOutHelloWorldFiles' : function(test) {
     test.expect(1);
     atmos.info("cleaning up all Hello World files and directories");
     atmos.listDirectory("/", null, null, function(result) {
     if (result.success) {
     var rootEntries = result.results;
     for (var i = 0; i < rootEntries.length; i++) {
     var entry = rootEntries[i];
     if (entry.name.length == 8 && entry.type == 'directory') {
     (function(path) {
     atmos.listDirectory(path + "/", new ListOptions(0, null, true, null, null), null, function(result2) {
     var subEntries = result2.results;
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
    atmos.deleteObject( this.cleanup[i], null, function( result ) {
        atmos.debug( "Deleted " + current + ": " + this.cleanup[current] );
        test.ok( result.success, "Request successful" );
        this.cleanupCount++;
        if ( this.cleanupCount == this.cleanup.length ) {
            test.done();
        }
    } );
};

if ( typeof(exports) != 'undefined' ) {
    // Register the test groups for node.js
    exports.atmosApi = atmosApi;
    exports.cleanupTest = cleanupTest;
}
