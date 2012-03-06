AtmosJS = require( '../../atmos.js' );
AtmosRest = AtmosJS.AtmosRest;
ListOptions = AtmosJS.ListOptions;
AtmosRange = AtmosJS.AtmosRange;
AclEntry = AtmosJS.AclEntry;
Acl = AtmosJS.Acl;

require( './atmos-config.js' );

atmos = new AtmosRest( atmosConfig );

atmos.info( "calling createObject" ); // logs to console

atmos.createObject( null, null, null, null, "Hello World!", "text/plain", null, function( result ) {
    if ( result.success ) {
        var objectId = result.value;
        atmos.info( "Object created.  id=" + objectId );
    }
} );
