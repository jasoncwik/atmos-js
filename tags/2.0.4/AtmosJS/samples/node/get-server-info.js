AtmosJS = require( '../../atmos.js' );
AtmosRest = AtmosJS.AtmosRest;
ListOptions = AtmosJS.ListOptions;
AtmosRange = AtmosJS.AtmosRange;
AclEntry = AtmosJS.AclEntry;
Acl = AtmosJS.Acl;

require( './atmos-config.js' );

atmos = new AtmosRest( atmosConfig );

atmos.info( "calling getServiceInformation" ); // logs to console

atmos.getServiceInformation( null, function( result ) {
    if ( result.success ) {
        var serverInfo = result.value;
        atmos.info( "Connected to Atmos version " + serverInfo.version + " on host " + atmos.atmosConfig.host );
    }
} );
