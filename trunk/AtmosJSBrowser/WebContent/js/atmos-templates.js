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
    aclUserRow : '',
    aclGroupRow : '',
    directoryPage : '<div class="atmosDirectortyPage"><div class="atmosButtonBar"><div class="atmosDirectoryDisplay" /><div class="atmosButton upButton" title="#{UP_BUTTON_DESC}">#{UP_BUTTON_NAME}</div><div class="atmosButton createButton" title="#{CREATE_BUTTON_DESC}">#{CREATE_BUTTON_NAME</div></div><ul class="atmosDirectoryList" /><div class="atmosButtonBar"><div class="atmosButton okButton" title="#{OK_BUTTON_DESC}">#{OK_BUTTON_NAME}</div><div class="atmosButton cancelButton" title="#{CANCEL_BUTTON_DESC}">#{CANCEL_BUTTON_NAME}</div></div></div>',
    directoryItem : '<li class="atmosDirectoryItem">%{name}</li>',

    functionNotSupportedError : 'This function is not currently supported',
    newDirectoryNamePrompt : 'What would you like to name the new directory?',
    validNameError : '%{name} is not a valid name.\nNote: the characters "?" and "@" cannot be used in a name.',
    validPathError : "%{path} is not a valid path",
    nothingSelectedError : "Please select an item first",
    multipleFilesSelectedError : 'You can only perform this operation on one item',
    selectionContainsDirectoryError : 'This operation cannot be performed on multiple directories or files and directories simultaneously.\nEither select multiple files or a single directory.',
    deleteItemsPrompt : 'Are you sure you want to delete the selected item(s)?',
    deleteDirectoryPrompt : 'Are you sure you want to delete this directory?\n\n%{path}\n\nAll of its contents will be deleted as well.',
    renameItemPrompt : 'What name would you like to give this item?',
    itemExistsPrompt : 'An object named %{name} already exists.\nWould you like to overwrite it?',
    itemExistsError : 'An object named %{name} already exists.',
    directoryExistsError : 'A directory named %{name} already exists.\nYou cannot overwrite directories.',
    tagPrompt : 'What would you like to name this tag?',
    tagEmpty : 'You must specify a tag',
    tagExists : 'There is already a property named %{tag}',
    invalidNumberError : '#{value} is not a valid number',

    loginPageTitle : 'Please provide your credentials',
    propertiesPageTitle : '%{name} properties',
    sharePageTitle : 'Share %{name}',
    aclPageTitle : 'ACL for %{name}',
    directoryPageTitle : 'Select target directory'
};
