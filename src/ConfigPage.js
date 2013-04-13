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
ConfigPage = function( templateEngine, callback, showCloseButton ) {
    this.templates = templateEngine;
    this.callback = callback;
    this.$root = jQuery( this.templates.get( 'configPage' ).render( {}, ['.atmosUidTable', '.atmosAddButton'] ) );
    this.$uidTable = this.$root.find( '.atmosUidTable' ).empty();
    var $addButton = this.$root.find( '.atmosAddButton' );
    var $closeButton = this.$root.find( '.atmosCloseButton' );

    this.loadConfiguration();

    this.modalWindow = new ModalWindow( this.templates.get( 'configPageTitle' ).render(), this.$root, this.templates, 525 );
    if ( arguments.length > 2 && !showCloseButton ) {
        $closeButton.hide();
        this.modalWindow.hideCloseButton();
    }

    var page = this;
    if ( $addButton.length > 0 ) $addButton[0].onclick = function() {
        page.showUidPage();
    };
    if ( $closeButton.length > 0 ) $closeButton[0].onclick = function() {
        page.modalWindow.remove();
    };
};
/** If possible, use the HTML5 storage API to hold active token */
ConfigPage.loadActiveToken = function() {
    var token = null;
    if ( window.localStorage ) {
        var uid = window.localStorage.getItem( 'uid' );
        var secretC = window.localStorage.getItem( 'secret' );
        if ( uid && secretC ) token = {uid: uid, secret: Crypto.AES.decrypt( secretC, AtmosBrowser.k )};
    }
    return token;
};
/** If possible, use the HTML5 storage API to hold active token */
ConfigPage.saveActiveToken = function( token ) {
    if ( window.localStorage ) {
        try {
            window.localStorage.setItem( 'uid', token.uid );
            window.localStorage.setItem( 'secret', Crypto.AES.encrypt( token.secret, AtmosBrowser.k ) );
        } catch ( error ) {
            alert( this.templates.get( 'storageDisabledPrompt' ).render() );
        }
    }
};
ConfigPage.deleteActiveToken = function( token ) {
    if ( window.localStorage ) {
        if ( !token || window.localStorage.getItem( 'uid' ) == token.uid ) {
            try {
                window.localStorage.removeItem( 'uid' );
                window.localStorage.removeItem( 'secret' );
            } catch ( error ) {
                alert( this.templates.get( 'storageDisabledPrompt' ).render() );
            }
        }
    }
};
/** If possible, use the HTML5 storage API to hold configuration */
ConfigPage.prototype.loadConfiguration = function() {
    if ( window.localStorage ) {
        var page = this;
        var configuration;
        try {
            configuration = JSON.parse( window.localStorage.getItem( 'configuration' ) || '{}' );
        } catch ( error ) {
            alert( this.templates.get( 'configDataCorruptPrompt' ).render() );
        }
        if ( configuration && configuration.uids ) {
            configuration.uids.forEach( function( token ) {
                page.addUid( {uid: token.uid, secret: Crypto.AES.decrypt( token.secret, AtmosBrowser.k )} )
            } );
        } else { // import legacy settings
            var token = ConfigPage.loadActiveToken();
            if ( token ) {
                page.addUid( token );
                page.saveConfiguration();
            }
        }
    }
};
/** If possible, use the HTML5 storage API to hold configuration */
ConfigPage.prototype.saveConfiguration = function() {
    var configuration = {};
    configuration.uids = [];
    this.$uidTable.find( '.row' ).each( function() {
        var $this = jQuery( this );
        var uid = $this.find( '.atmosUid' ).text();
        var secret = $this.find( '.atmosSecret' ).text();
        configuration.uids.push( {uid: uid, secret: Crypto.AES.encrypt( secret, AtmosBrowser.k )} );
    } );
    if ( window.localStorage ) {
        try {
            window.localStorage.setItem( 'configuration', JSON.stringify( configuration ) );
        } catch ( error ) {
            alert( this.templates.get( 'storageDisabledPrompt' ).render() );
        }
    }
};
ConfigPage.prototype.addUid = function( token ) {
    var $uidRow = jQuery( this.templates.get( 'uidRow' ).render( {token: token}, ['.atmosUid', '.atmosSecret', '.atmosLoginButton', '.atmosDeleteButton'] ) );
    var $loginButton = $uidRow.find( '.atmosLoginButton' );
    var $deleteButton = $uidRow.find( '.atmosDeleteButton' );
    var page = this;
    $loginButton[0].onclick = function() {
        ConfigPage.saveActiveToken( token );
        page.modalWindow.remove();
        page.callback( token.uid, token.secret );
    };
    $deleteButton[0].onclick = function() {
        if ( confirm( page.templates.get( 'deleteUidPrompt' ).render( {token: token} ) ) ) {
            $uidRow.remove();
            page.saveConfiguration();
            ConfigPage.deleteActiveToken( token );
        }
    };
    this.$uidTable.append( $uidRow );
};
ConfigPage.prototype.showUidPage = function() {
    var requiredSelectors = [
        'input.atmosUidField',
        'input.atmosSecretField',
        '.atmosSaveButton'
    ];
    var $uidRoot = jQuery( this.templates.get( 'uidPage' ).render( {}, requiredSelectors ) );
    var $uid = $uidRoot.find( '.atmosUidField' );
    var $secret = $uidRoot.find( '.atmosSecretField' );
    var $testButton = $uidRoot.find( '.atmosTestButton' );
    var $saveButton = $uidRoot.find( '.atmosSaveButton' );
    var $cancelButton = $uidRoot.find( '.atmosCancelButton' );

    var modalWindow = new ModalWindow( this.templates.get( 'uidPageTitle' ).render(), $uidRoot, this.templates );
    modalWindow.hideCloseButton();

    var page = this;
    if ( $testButton.length > 0 ) $testButton[0].onclick = function() {
        var atmos = new AtmosRest( {uid: $uid.val(), secret: $secret.val()} );
        atmos.getServiceInformation( function( result ) {
            if ( result.successful ) alert( page.templates.get( 'uidSuccessPrompt' ).render() );
            else alert( page.templates.get( 'uidFailurePrompt' ).render() );
        } );
    };
    $saveButton[0].onclick = function() {
        page.addUid( { uid: $uid.val(), secret: $secret.val()} );
        page.saveConfiguration();
        modalWindow.remove();
    };
    if ( $cancelButton.length > 0 ) $cancelButton[0].onclick = function() {
        modalWindow.remove();
    };

    $uid.focus();
};
