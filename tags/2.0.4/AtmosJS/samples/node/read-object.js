AtmosJS = require( '../../atmos.js' );
AtmosRest = AtmosJS.AtmosRest;
ListOptions = AtmosJS.ListOptions;
AtmosRange = AtmosJS.AtmosRange;
AclEntry = AtmosJS.AclEntry;
Acl = AtmosJS.Acl;

require( './atmos-config.js' );

atmos = new AtmosRest( atmosConfig );

atmos.info( "calling getServiceInformation" ); // logs to console

var objectId = "4ee696e4a41f549804f0b909b6c90a04f569598cbd8c";
atmos.readObject( objectId, null, null, function( result ) {
    if ( result.success ) {
        var data = result.data;
        atmos.info( "Object read. Contents:\n" + data );
    }
} );