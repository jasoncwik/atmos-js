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

this.cleanup = [];

this.fileChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=+*,!#%$&()";
this.innerChars = this.fileChars + " ";

this.randomFilename = function( name, ext ) {
	var name = "";
	for( var i = 0; i<name; i++ ) {
		if( i == 0 ) {
			name += this.fileChars.charAt( Math.floor( Math.random() * (this.fileChars.length-1)));
		} else {
			name += this.innerChars.charAt( Math.floor( Math.random() * (this.innerChars.length-1)));			
		}
	}
	
	if( ext && ext>0 ) {
		name += ".";
		for( var j=0; j<ext; j++ ) {
			name += this.fileChars.charAt( Math.floor( Math.random() * (this.fileChars.length-1)));
		}
	}
	
	return name;
};

this.atmosApi = {

		// Basic Create object with some content.
		testCreateObject: function(test) {
			this.atmos.info( "atmosApi.testCreateObject" );
			
			test.expect(6);
			this.atmos.createObject(null, null, null, "Hello World!", "text/plain", null,
					function(result) {
				
				test.ok( result.success, "Request successful" );
				test.ok( result.objectId != null, "Object ID not null" );
				test.equal( result.httpCode, 201, "HttpCode correct" );
				
				// Enqueue for cleanup
				this.cleanup.push( result.objectId );
				
				// Read the object back and verify content
				this.atmos.readObject( result.objectId, null, null, function(result2) {
					test.ok( result2.success, "Request successful" );
					test.equal( result2.httpCode, 200, "HttpCode correct" );
					test.equal( result2.data, "Hello World!", "Data correct" );
					test.done();
				});
				
			});
			
		},

		testDeleteObject: function(test) {
			this.atmos.info( "atmosApi.testDeleteObject" );
			test.expect(4);
			
			this.atmos.createObject( null, null, null, "Hello World!", null, null, function(result) {
				test.ok( result.success, "Request successful" );
				test.ok( result.objectId != null, "Object ID not null" );
				
				this.atmos.deleteObject( result.objectId, null, function(result2) {
					test.ok( result2.success, "Delete successful" );
					test.equal( result2.httpCode, 204, "HttpCode correct" );
					
					test.done();
				});
			});
		},
		
		testCreateObjectOnPath: function(test) {
			this.atmos.info( "atmosApi.testCreateObject" );
			
			test.expect(6);
			
			var filename = this.randomFilename(8,0) + "/" + this.randomFilename(8,3);
			this.atmos.debug( "Filename: " + filename );
			
			this.atmos.createObjectOnPath(filename, null, null, null, "Hello World!", "text/plain", null,
					function(result) {
				
				test.ok( result.success, "Request successful" );
				test.ok( result.objectId != null, "Object ID not null" );
				test.equal( result.httpCode, 201, "HttpCode correct" );
				
				// Enqueue for cleanup
				this.cleanup.push( result.objectId );
				
				// Read the object back and verify content
				this.atmos.readObject( filename, null, null, function(result2) {
					test.ok( result2.success, "Request successful" );
					test.equal( result2.httpCode, 200, "HttpCode correct" );
					test.equal( result2.data, "Hello World!", "Data correct" );
					test.done();
				});
				
			});			
		}


};

this.cleanupTest = {
		
		testCleanup: function(test) {
			this.cleanupCount = 0;
			
			test.expect( this.cleanup.length );
			
			this.atmos.info( this.cleanup.length + " objects to cleanup" );
			for( var i=0; i<this.cleanup.length; i++ ) {
				var current = i;
				this.atmos.deleteObject( this.cleanup[i], null, function(result) {
					this.atmos.debug( "Deleted " + current + ": " + this.cleanup[current] );
					test.ok( result.success, "Request successful" );
					this.cleanupCount++;
					if( this.cleanupCount == this.cleanup.length ) {
						test.done();
					}
				} );
			}
		}
};