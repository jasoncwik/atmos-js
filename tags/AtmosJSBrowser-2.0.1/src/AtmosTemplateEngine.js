/*

 Copyright (c) 2011-2013, EMC Corporation

 All rights reserved.

 Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * Neither the name of the EMC Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 */
AtmosTemplateEngine = function() {
    this.templates = [];

    // find in-line HTML templates
    var i, prefix = "template\\.atmos\\.";
    for ( i = 0; i < AtmosTemplateEngine.HTML_TEMPLATES.length; i++ ) {
        var name = AtmosTemplateEngine.HTML_TEMPLATES[i];
        var $template = jQuery( '#' + prefix + name );
        if ( $template.length == 0 ) throw 'Required in-line template "' + prefix + name + '" not found';
        this.templates[name] = new AtmosTemplate( name, $template.html(), this );
    }

    // fixed templates (messages)
    var templateNames = Object.keys( AtmosTemplateEngine.MESSAGE_TEMPLATES );
    for ( i = 0; i < templateNames.length; i++ ) {
        this.templates[templateNames[i]] = new AtmosTemplate( templateNames[i], AtmosTemplateEngine.MESSAGE_TEMPLATES[templateNames[i]], this );
    }
};
/**
 * Returns an AtmosTemplate of the specified name or an error if it is not found in the map of templates
 * @param name the name of the template to return
 */
AtmosTemplateEngine.prototype.get = function( name ) {
    var template = this.templates[name];
    if ( !template ) throw name + " not found in templates";
    return template;
};

AtmosTemplateEngine.HTML_TEMPLATES = [
    "modalBackground",
    "modalWindow",
    "configPage",
    "uidRow",
    "uidPage",
    "main",
    "fileRow",
    "fileRowContents",
    "fileRowLoading",
    "statusBar",
    "directoryContextMenu",
    "tagContextMenu",
    "fileContextMenu",
    "propertiesPage",
    "editablePropertyRow",
    "readonlyPropertyRow",
    "sharePage",
    "ipRow",
    "aclPage",
    "aclRow",
    "objectInfoPage",
    "objectInfoReplica",
    "directoryPage",
    "directoryItem",
    "versionsPage",
    "versionRow"
];

AtmosTemplateEngine.MESSAGE_TEMPLATES = {
    functionNotSupportedError: 'This function is not currently supported',
    newDirectoryNamePrompt: 'What would you like to name the new directory?',
    validNameError: '%{name} is not a valid name.\nNote: the characters "?" and "@" cannot be used in a name.',
    validPathError: "%{path} is not a valid path",
    nothingSelectedError: "Please select an item first",
    multipleFilesSelectedError: 'You can only perform this operation on one item',
    selectionContainsDirectoryError: 'This operation cannot be performed on directories.\nRemove the directories from your selection and try again.',
    directoryNotAllowedError: 'This operation cannot be performed on directories.',
    deleteItemsPrompt: 'Are you sure you want to delete the selected item(s)?',
    deleteNonEmptyDirectoryPrompt: 'The directory %{path} is not empty. If you continue, all of its contents will be deleted.',
    renameItemPrompt: 'What name would you like to give this item?',
    itemExistsPrompt: 'An object named %{name} already exists.\nWould you like to overwrite it?',
    itemExistsError: 'An object named %{name} already exists.',
    directoryExistsError: 'A directory named %{name} already exists.\nYou cannot overwrite directories.',
    tagPrompt: 'What would you like to name this tag?',
    tagEmpty: 'You must specify a tag',
    tagExists: 'There is already a property named %{tag}',
    invalidNumberError: '#{value} is not a valid number',
    userAclNamePrompt: 'What user name would you like to add?',
    groupAclNamePrompt: 'What group name would you like to add?',
    restoreVersionPrompt: 'Restoring this snapshot will revert the object to\nthe state it was at D{version.dateCreated}.\nAre you sure you want to do this?',
    restoreVersionSuccessPrompt: 'Successfully restored this object from the snapshot\ncreated D{version.dateCreated}.',
    deleteVersionPrompt: 'Are you sure you want to delete the snapshot\ntaken at D{version.dateCreated}?',
    uidSuccessPrompt: 'These credentials appear to be correct.',
    uidFailurePrompt: 'These credentials are invalid!',
    configDataCorruptPrompt: 'Your configuration data has been corrupted and will be reset.',
    deleteUidPrompt: 'Are you sure you want to delete the following UID?\n%{token.uid}',
    storageDisabledPrompt: 'Browser data storage seems to be disabled\n(are you in private browsing mode?)\nYour credentials cannot be saved,\nbut will be available until the browser window is closed.',

    configPageTitle: 'Configuration',
    uidPageTitle: 'Add UID',
    propertiesPageTitle: '%{name} properties',
    sharePageTitle: 'Share %{name}',
    aclPageTitle: 'ACL for %{name}',
    objectInfoPageTitle: 'Storage info for %{name}',
    directoryPageTitle: 'Select target directory',
    versionsPageTitle: 'Snapshots of %{name}',

    'atmosError.403': 'You are not authorized to perform this action',
    'atmosError.404': 'The item you\'ve requested cannot be found',
    'atmosError.500': 'An unexpected server error has occured: %{message}',
    'atmosError.1001': 'The server encountered an internal error. Please try again.',
    'atmosError.1002': 'One or more arguments in the request were invalid.',
    'atmosError.1003': 'The requested object was not found.',
    'atmosError.1004': 'The specified range cannot be satisfied.',
    'atmosError.1005': 'One or more metadata tags were not found for the requested object.',
    'atmosError.1006': 'Operation aborted because of a conflicting operation in process against the resource. Note this error code may indicate that the system temporarily is too busy to process the request. This is a non-fatal error; you can re-try the request later.',
    'atmosError.1007': 'The server encountered an internal error. Please try again.',
    'atmosError.1008': 'The requested resource was not found on the server.',
    'atmosError.1009': 'The method specified in the Request is not allowed for the resource identified.',
    'atmosError.1010': 'The requested object size exceeds the maximum allowed upload/download size.',
    'atmosError.1011': 'The specified object length does not match the actual length of the attached object.',
    'atmosError.1012': 'There was a mismatch between the attached object size and the specified extent size.',
    'atmosError.1013': 'The server encountered an internal error. Please try again.',
    'atmosError.1014': 'The maximum allowed metadata entries per object has been exceeded.',
    'atmosError.1015': 'The request could not be finished due to insufficient access privileges.',
    'atmosError.1016': 'The resource you are trying to create already exists.',
    'atmosError.1019': 'The server encountered an I/O error. Please try again.',
    'atmosError.1020': 'The requested resource is missing or could not be found.',
    'atmosError.1021': 'The requested resource is not a directory.',
    'atmosError.1022': 'The requested resource is a directory.',
    'atmosError.1023': 'The directory you are attempting to delete is not empty.',
    'atmosError.1024': 'The server encountered an internal error. Please try again.',
    'atmosError.1025': 'The server encountered an internal error. Please try again.',
    'atmosError.1026': 'The server encountered an internal error. Please try again.',
    'atmosError.1027': 'The server encountered an internal error. Please try again.',
    'atmosError.1028': 'The server encountered an internal error. Please try again.',
    'atmosError.1029': 'The server encountered an internal error. Please try again.',
    'atmosError.1031': 'The request timestamp was outside the valid time window.',
    'atmosError.1032': 'There was a mismatch between the signature in the request and the signature as computed by the server.\nPlease check your credentials and try again',
    'atmosError.1033': 'Unable to retrieve the secret key for the specified user.',
    'atmosError.1034': 'Unable to read the contents of the HTTP body.',
    'atmosError.1037': 'The specified token is invalid.',
    'atmosError.1040': 'The server is busy. Please try again',
    'atmosError.1041': 'The requested filename length exceeds the maximum length allowed.',
    'atmosError.1042': 'The requested operation is not supported.',
    'atmosError.1043': 'The object has the maximum number of links',
    'atmosError.1044': 'The specified parent does not exist.',
    'atmosError.1045': 'The specified parent is not a directory.',
    'atmosError.1046': 'The specified object is not in the namespace.',
    'atmosError.1047': 'Source and target are the same file.',
    'atmosError.1048': 'The target directory is not empty and may not be overwritten',
    'atmosError.1049': 'The checksum sent with the request did not match the checksum as computed by the server',
    'atmosError.1050': 'The requested checksum algorithm is different than the one previously used for this object.',
    'atmosError.1051': 'Checksum verification may only be used with append update requests',
    'atmosError.1052': 'The specified checksum algorithm is not implemented.',
    'atmosError.1053': 'Checksum cannot be computed for an object on update for which one wasn\'t computed at create time.',
    'atmosError.1054': 'The checksum input parameter was missing from the request.',
    'atmosError.noBrowserCompat': 'This feature is not supported on your current browser by this version of Atmos (%{info}).'
};
