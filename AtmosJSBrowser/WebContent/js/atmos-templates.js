function AtmosTemplateEngine( pageElements ) {
    this.templates = [];

    var templateNames = Object.keys( ATMOS_TEMPLATES );
    for ( var i = 0; i < templateNames.length; i++ ) {
        var templateName = templateNames[i];
        var templateContent = ATMOS_TEMPLATES[templateName];
        if ( pageElements ) {
            var templateElement = pageElements[templateName];
            if ( templateElement ) {
                $templateContent = (templateElement instanceof jQuery) ? templateElement : jQuery( templateElement );
                templateContent = $templateContent.outerHTML();

                // wipe out existing templates from the page (they are only present to provide examples)
                $templateContent.remove();
            }
        }
        this.templates[templateName] = new AtmosTemplate( templateName, templateContent, this );
    }
}
/**
 * Returns an AtmosTemplate of the specified name or an error if it is not found in the map of templates
 * @param name the name of the template to return
 */
AtmosTemplateEngine.prototype.get = function( name ) {
    var template = this.templates[name];
    if ( !template ) throw name + " not found in templates";
    return template;
};

function AtmosTemplate( name, content, engine ) {
    this.name = name;
    this.content = content;
    this.engine = engine;
}
/**
 * Renderer for templates. Provides a velocity-like parser for strings.
 * @param {Object} model the model from which to pull values for replacing tags/variables
 * @param {Array} requiredSelectors (optional) an array of jQuery selectors that are expected to be present in this
 * template. An error will be thrown if any of these selectors are absent. Good for debugging custom HTML.
 */
AtmosTemplate.prototype.render = function( model, requiredSelectors ) {
    var tags = this.content.match( /%\{[^}]+\}/g );
    if ( tags && !model ) throw "Template " + this.name + " contains tags, but no model was specified";

    if ( requiredSelectors ) {
        var $content = jQuery( this.content );
        var missingSelectors = [];
        for ( var j = 0; j < requiredSelectors.length; j++ ) {
            if ( $content.find( requiredSelectors[j] ).length == 0 ) missingSelectors.push( requiredSelectors[j] );
        }
        if ( missingSelectors.length > 0 ) throw "Template " + this.name + " is missing required selectors: " + missingSelectors.join( ", " );
    }

    if ( !tags ) return this.content;

    var remaining = this.content;
    var complete = '';
    for ( var i = 0; i < tags.length; i++ ) {
        var tag = tags[i];
        var tagName = tag.substr( 2, tag.length - 3 );
        var tagStart = remaining.indexOf( tag );
        if ( typeof(model[tagName]) != 'undefined' ) {
            complete += remaining.substr( 0, tagStart ) + model[tagName];
        } else {
            // check for a sub-template
            try {
                complete += remaining.substr( 0, tagStart ) + this.engine.get( tagName ).render( model );
            } catch ( error ) {
                this.debug( "In template " + this.name + ", tag " + tagName + " not found in model or templates (" + error + ")" );
                complete += remaining.substr( 0, tagStart ) + tag; // if there's no replacement, simply output the tag
            }
        }
        remaining = remaining.substr( tagStart + tag.length );
    }
    complete += remaining;

    return complete;
};
AtmosTemplate.prototype.debug = function( message ) {
    if ( typeof(console) !== 'undefined' ) {
        if ( typeof(console.debug) !== 'undefined' ) {
            console.debug( message );
        } else if ( typeof(console.log) !== 'undefined' ) {
            console.log( message );
        }
    }
};

var ATMOS_TEMPLATES = {
    modalBackground : '<div class="atmosModalBackground" />',
    modalWindow : '<div class="atmosModalWindow" />',
    loginPage : '<div class="atmosLoginPage"><div class="table"><div class="row"><div class="atmosLabel cell">Subtenant ID:</div><div class="cell"><input type="text" class="atmosSubtenantField"/></div></div><div class="row"><div class="atmosLabel cell">User:</div><div class="cell"><input type="text" class="atmosUserField"/></div></div><div class="row"><div class="atmosLabel cell">Secret:</div><div class="cell"><input type="text" class="atmosSecretField"/></div></div></div><div class="atmosButtonBar"><div id="atmosLoginButton" class="atmosButton" title="Login">Login</div></div></div>',
    main : '<div class="atmosBrowser"><div class="atmosTitleBar">File Manager</div><div class="atmosToolBar"><div class="atmosButtonBar"><input class="atmosLocationField" type="text"/><div class="atmosButton atmosGoButton" title="Go">Go</div><div class="atmosButton atmosUpButton" title="Go to the parent directory">Up</div><div class="atmosButton atmosCreateButton" title="Create directory">Create</div></div><div class="atmosButtonBar"><div class="atmosButton atmosDeleteButton" title="Delete selected item(s)">Delete</div><div class="atmosButton atmosRenameButton" title="Rename selected item">Rename</div><div class="atmosButton atmosShareButton" title="Share selected item with other people">Share</div><div class="atmosButton atmosPropertiesButton" title="Properties of selected item">Properties</div><div class="atmosUploadContainer"><div class="atmosButton atmosUploadButton" title="Upload files">Upload</div><input type="file" multiple="multiple" class="atmosUploadField" title="Select files to upload"/></div></div></div><div class="atmosFileList"><div class="head"><div class="table"><div class="row" unselectable="on"><h4 class="cell atmosFileName atmosFileNameHeader">Name</h4><h4 class="cell atmosFileSize atmosFileSizeHeader">Size</h4><h4 class="cell atmosFileType atmosFileTypeHeader">Type</h4></div></div></div><div class="body"><div class="table"><div unselectable="on" class="row"><div class="atmosIcon cell"><span class="atmosFileIcon icon"></span></div><div class="atmosFileName cell"></div><div class="atmosFileSize cell"><div class="atmosStatusBar"></div></div><div class="atmosFileType cell"></div></div></div></div></div></div>',
    fileRow : '<div unselectable="on" class="row"><div class="atmosIcon cell"><span class="atmosFileIcon icon"></span></div><div class="atmosFileName cell"></div><div class="atmosFileSize cell"><div class="atmosStatusBar"></div></div><div class="atmosFileType cell"></div></div>',
    fileRowLoading : '<p>please wait..</p>',
    statusBar : '<div class="atmosStatusBar" />',
    directoryContextMenu : '<div class="atmosContextMenu atmosDirectoryContextMenu"><div class="atmosContextMenuOption openOption">Open</div><div class="atmosContextMenuOption renameOption">Rename</div><div class="atmosContextMenuOption deleteOption">Delete</div><div class="atmosContextMenuOption propertiesOption">Properties</div></div>',
    fileContextMenu : '<div class="atmosContextMenu atmosFileContextMenu"><div class="atmosContextMenuOption openOption">Open</div><div class="atmosContextMenuOption renameOption">Rename</div><div class="atmosContextMenuOption deleteOption">Delete</div><div class="atmosContextMenuOption propertiesOption">Properties</div></div>',
    propertiesPage : '<div class="atmosProperties" />',
    editablePropertyRow : '<div />',
    readonlyPropertyRow : '<div>%{name}</div>',
    sharePage : '<div class="atmosSharePage" />',
    aclPage : '',
    aclRow : '',
    directoryPage : '<div class="atmosDirectortyPage"><div class="atmosButtonBar"><div class="atmosDirectoryDisplay" /><div class="atmosButton upButton" title="#{UP_BUTTON_DESC}">#{UP_BUTTON_NAME}</div><div class="atmosButton createButton" title="#{CREATE_BUTTON_DESC}">#{CREATE_BUTTON_NAME</div></div><ul class="atmosDirectoryList" /><div class="atmosButtonBar"><div class="atmosButton okButton" title="#{OK_BUTTON_DESC}">#{OK_BUTTON_NAME}</div><div class="atmosButton cancelButton" title="#{CANCEL_BUTTON_DESC}">#{CANCEL_BUTTON_NAME}</div></div></div>',
    directoryItem : '<li class="atmosDirectoryItem">%{name}</li>',

    functionNotSupportedError : 'This function is not currently supported',
    newDirectoryNamePrompt : 'What would you like to name the new directory?',
    validNameError : '%{name} is not a valid name.\nNote: the characters "?" and "@" cannot be used in a name.',
    validPathError : "%{path} is not a valid path",
    nothingSelectedError : "Please select an item first",
    multipleFilesSelectedError : 'You can only perform this operation on one item',
    selectionContainsDirectoryError : 'This operation cannot be performed on directories.\nRemove the directories from your selection and try again.',
    deleteItemsPrompt : 'Are you sure you want to delete the selected item(s)?',
    deleteNonEmptyDirectoryPrompt : 'The directory %{path} is not empty. If you continue, all of its contents will be deleted.',
    renameItemPrompt : 'What name would you like to give this item?',
    itemExistsPrompt : 'An object named %{name} already exists.\nWould you like to overwrite it?',
    itemExistsError : 'An object named %{name} already exists.',
    directoryExistsError : 'A directory named %{name} already exists.\nYou cannot overwrite directories.',
    tagPrompt : 'What would you like to name this tag?',
    tagEmpty : 'You must specify a tag',
    tagExists : 'There is already a property named %{tag}',
    invalidNumberError : '#{value} is not a valid number',
    userAclNamePrompt : 'What user name would you like to add?',
    groupAclNamePrompt : 'What group name would you like to add?',

    loginPageTitle : 'Please provide your credentials',
    propertiesPageTitle : '%{name} properties',
    sharePageTitle : 'Share %{name}',
    aclPageTitle : 'ACL for %{name}',
    directoryPageTitle : 'Select target directory',

    'atmosError.403' : 'You are not authorized to perform this action',
    'atmosError.404' : 'The item you\'ve requested cannot be found',
    'atmosError.500' : 'An unexpected server error has occured: %{message}',
    'atmosError.1001' : 'The server encountered an internal error. Please try again.',
    'atmosError.1002' : 'One or more arguments in the request were invalid.',
    'atmosError.1003' : 'The requested object was not found.',
    'atmosError.1004' : 'The specified range cannot be satisfied.',
    'atmosError.1005' : 'One or more metadata tags were not found for the requested object.',
    'atmosError.1006' : 'Operation aborted because of a conflicting operation in process against the resource. Note this error code may indicate that the system temporarily is too busy to process the request. This is a non-fatal error; you can re-try the request later.',
    'atmosError.1007' : 'The server encountered an internal error. Please try again.',
    'atmosError.1008' : 'The requested resource was not found on the server.',
    'atmosError.1009' : 'The method specified in the Request is not allowed for the resource identified.',
    'atmosError.1010' : 'The requested object size exceeds the maximum allowed upload/download size.',
    'atmosError.1011' : 'The specified object length does not match the actual length of the attached object.',
    'atmosError.1012' : 'There was a mismatch between the attached object size and the specified extent size.',
    'atmosError.1013' : 'The server encountered an internal error. Please try again.',
    'atmosError.1014' : 'The maximum allowed metadata entries per object has been exceeded.',
    'atmosError.1015' : 'The request could not be finished due to insufficient access privileges.',
    'atmosError.1016' : 'The resource you are trying to create already exists.',
    'atmosError.1019' : 'The server encountered an I/O error. Please try again.',
    'atmosError.1020' : 'The requested resource is missing or could not be found.',
    'atmosError.1021' : 'The requested resource is not a directory.',
    'atmosError.1022' : 'The requested resource is a directory.',
    'atmosError.1023' : 'The directory you are attempting to delete is not empty.',
    'atmosError.1024' : 'The server encountered an internal error. Please try again.',
    'atmosError.1025' : 'The server encountered an internal error. Please try again.',
    'atmosError.1026' : 'The server encountered an internal error. Please try again.',
    'atmosError.1027' : 'The server encountered an internal error. Please try again.',
    'atmosError.1028' : 'The server encountered an internal error. Please try again.',
    'atmosError.1029' : 'The server encountered an internal error. Please try again.',
    'atmosError.1031' : 'The request timestamp was outside the valid time window.',
    'atmosError.1032' : 'There was a mismatch between the signature in the request and the signature as computed by the server.\nPlease check your credentials and try again',
    'atmosError.1033' : 'Unable to retrieve the secret key for the specified user.',
    'atmosError.1034' : 'Unable to read the contents of the HTTP body.',
    'atmosError.1037' : 'The specified token is invalid.',
    'atmosError.1040' : 'The server is busy. Please try again',
    'atmosError.1041' : 'The requested filename length exceeds the maximum length allowed.',
    'atmosError.1042' : 'The requested operation is not supported.',
    'atmosError.1043' : 'The object has the maximum number of links',
    'atmosError.1044' : 'The specified parent does not exist.',
    'atmosError.1045' : 'The specified parent is not a directory.',
    'atmosError.1046' : 'The specified object is not in the namespace.',
    'atmosError.1047' : 'Source and target are the same file.',
    'atmosError.1048' : 'The target directory is not empty and may not be overwritten',
    'atmosError.1049' : 'The checksum sent with the request did not match the checksum as computed by the server',
    'atmosError.1050' : 'The requested checksum algorithm is different than the one previously used for this object.',
    'atmosError.1051' : 'Checksum verification may only be used with append update requests',
    'atmosError.1052' : 'The specified checksum algorithm is not implemented.',
    'atmosError.1053' : 'Checksum cannot be computed for an object on update for which one wasn\'t computed at create time.',
    'atmosError.1054' : 'The checksum input parameter was missing from the request.'
};
