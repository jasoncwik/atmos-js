AtmosRest.prototype.getServiceInformation_incompat = AtmosRest.prototype.getServiceInformation;
AtmosRest.prototype.getServiceInformation = function( state, callback ) {
    this.getServiceInformation_incompat( function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.createObject_incompat = AtmosRest.prototype.createObject;
AtmosRest.prototype.createObject = function( path, acl, meta, listableMeta, form, data, mimeType, state, successCallback, progressCallback ) {
    this.createObject_incompat( acl, meta, listableMeta, form, data, mimeType, function( result ) {
        result.state = state;
        successCallback( result );
    }, progressCallback );
};
AtmosRest.prototype.readObject_incompat = AtmosRest.prototype.readObject;
AtmosRest.prototype.readObject = function( id, range, state, callback ) {
    this.readObject_incompat( id, range, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.updateObject_incompat = AtmosRest.prototype.updateObject;
AtmosRest.prototype.updateObject = function( id, acl, meta, listableMeta, form, data, range, mimeType, state, successCallback, progressCallback ) {
    this.updateObject_incompat( id, acl, meta, listableMeta, form, data, range, mimeType, function( result ) {
        result.state = state;
        successCallback( result );
    }, progressCallback );
};
AtmosRest.prototype.deleteObject_incompat = AtmosRest.prototype.deleteObject;
AtmosRest.prototype.deleteObject = function( id, state, callback ) {
    this.deleteObject_incompat( id, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.listVersions_incompat = AtmosRest.prototype.listVersions;
AtmosRest.prototype.listVersions = function( id, state, callback ) {
    this.listVersions_incompat( id, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.versionObject_incompat = AtmosRest.prototype.versionObject;
AtmosRest.prototype.versionObject = function( id, state, callback ) {
    this.versionObject_incompat( id, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.restoreVersion_incompat = AtmosRest.prototype.restoreVersion;
AtmosRest.prototype.restoreVersion = function( id, vId, state, callback ) {
    this.restoreVersion_incompat( id, vId, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.deleteVersion_incompat = AtmosRest.prototype.deleteVersion;
AtmosRest.prototype.deleteVersion = function( vId, state, callback ) {
    this.deleteVersion_incompat( vId, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.rename_incompat = AtmosRest.prototype.rename;
AtmosRest.prototype.rename = function( oldPath, newPath, force, state, callback ) {
    this.rename_incompat( oldPath, newPath, force, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.getAcl_incompat = AtmosRest.prototype.getAcl;
AtmosRest.prototype.getAcl = function( id, state, callback ) {
    this.getAcl_incompat( id, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.setAcl_incompat = AtmosRest.prototype.setAcl;
AtmosRest.prototype.setAcl = function( id, acl, state, callback ) {
    this.setAcl_incompat( id, acl, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.listUserMetadataTags_incompat = AtmosRest.prototype.listUserMetadataTags;
AtmosRest.prototype.listUserMetadataTags = function( id, state, callback ) {
    this.listUserMetadataTags_incompat( id, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.getUserMetadata_incompat = AtmosRest.prototype.getUserMetadata;
AtmosRest.prototype.getUserMetadata = function( id, filter, state, callback ) {
    this.getUserMetadata_incompat( id, filter, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.getSystemMetadata_incompat = AtmosRest.prototype.getSystemMetadata;
AtmosRest.prototype.getSystemMetadata = function( id, filter, state, callback ) {
    this.getSystemMetadata_incompat( id, filter, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.getAllMetadata_incompat = AtmosRest.prototype.getAllMetadata;
AtmosRest.prototype.getAllMetadata = function( id, state, callback ) {
    this.getAllMetadata_incompat( id, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.getObjectInfo_incompat = AtmosRest.prototype.getObjectInfo;
AtmosRest.prototype.getObjectInfo = function( id, state, callback ) {
    this.getObjectInfo_incompat( id, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.setUserMetadata_incompat = AtmosRest.prototype.setUserMetadata;
AtmosRest.prototype.setUserMetadata = function( id, meta, listableMeta, state, callback ) {
    this.setUserMetadata_incompat( id, meta, listableMeta, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.deleteUserMetadata_incompat = AtmosRest.prototype.deleteUserMetadata;
AtmosRest.prototype.deleteUserMetadata = function( id, tags, state, callback ) {
    this.deleteUserMetadata_incompat( id, tags, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.getListableTags_incompat = AtmosRest.prototype.getListableTags;
AtmosRest.prototype.getListableTags = function( tag, state, callback ) {
    this.getListableTags_incompat( tag, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.listObjects_incompat = AtmosRest.prototype.listObjects;
AtmosRest.prototype.listObjects = function( tag, options, state, callback ) {
    this.listObjects_incompat( tag, options, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.prototype.listDirectory_incompat = AtmosRest.prototype.listDirectory;
AtmosRest.prototype.listDirectory = function( directory, options, state, callback ) {
    this.listDirectory_incompat( directory, options, function( result ) {
        result.state = state;
        callback( result );
    } );
};
AtmosRest.compatibilityMode = true;