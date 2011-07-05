MyObject = require( "./object.js").MyObject;

console.log( "MyObject is " + MyObject );

exports.tests = {
	foo: function(test) {
		test.expect(2);
		var obj = new MyObject();
		test.ok( obj.foo == "foo", "foo" );
		test.ok( ""+obj == "MyObject", "MyObj" );
		test.done();
	}
};