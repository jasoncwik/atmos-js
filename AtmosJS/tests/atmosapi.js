/**
 * 
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