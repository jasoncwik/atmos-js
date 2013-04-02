AtmosJS = require( '../../atmos-min-2.1.0.js' );
AtmosRest = AtmosJS.AtmosRest;
ListOptions = AtmosJS.ListOptions;
AtmosRange = AtmosJS.AtmosRange;
AclEntry = AtmosJS.AclEntry;
Acl = AtmosJS.Acl;

require( './atmos-config.js' );

atmos = new AtmosRest( atmosConfig );

atmos.info( "calling getServiceInformation" ); // logs to console

atmos.getServiceInformation( function( result ) {
    if ( result.successful ) {
        var serverInfo = result.value;
        atmos.info( "Connected to Atmos version " + serverInfo.version + " on host " + atmos.atmosConfig.host );
    }
} );
