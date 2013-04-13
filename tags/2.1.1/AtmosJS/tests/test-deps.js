//////////////////////////////////////////////////
// dump function for use in debugging           //
// (recursive)                                  //
//////////////////////////////////////////////////
function dumpObject( object, maxLevel ) {
    if ( typeof(maxLevel) == 'undefined' ) maxLevel = 1;
    if ( maxLevel < 0 ) return object; // we've reached our max depth
    var output = "[";
    for ( var property in object ) {
        if ( !object.hasOwnProperty( property ) ) continue;
        var value = object[property];
        if ( typeof(value) === 'object' && value != null ) value = dumpObject( value, maxLevel - 1 );
        output += property + "=" + value + ", ";
    }
    if ( output.length > 1 ) output = output.substr( 0, output.length - 2 );
    output += "]";
    return output;
}

if ( typeof(global) != 'undefined' ) {
    global.dumpObject = dumpObject;
}