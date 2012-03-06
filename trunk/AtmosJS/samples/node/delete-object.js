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
atmos.deleteObject( objectId, null, function( result ) {
    var httpCode = result.httpCode; // always available
    var httpMessage = result.httpMessage; // always available
    if ( result.success ) {
        atmos.info( "Object deleted." );
    } else {
        var errorCode = result.errorCode; // available on error
        var errorMessage = result.errorMessage; // available on error

        atmos.error( "Error occurred (httpCode: " + httpCode + ", httpMessage: " + httpMessage + ", atmosCode: " + errorCode + ", atmosMessage: " + errorMessage );
    }
} );