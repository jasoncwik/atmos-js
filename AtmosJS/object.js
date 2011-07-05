
function MyObject() {
	this.foo = "foo";
}

MyObject.prototype.toString = function() {
	return "MyObject";
};

exports.MyObject = MyObject;