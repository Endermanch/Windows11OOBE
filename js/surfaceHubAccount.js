

"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var SurfaceHubAccount;
    (function (SurfaceHubAccount) {
        function createLocalAccount(username, password) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                if ((password == null) || (password === "")) {
                    
                    var localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
                    localAccountManager.createLocalAccountAsync(username, null, null)
                        .done(function () {
                            CloudExperienceHost.IUserManager.getInstance().setSignInIdentityProvider(CloudExperienceHostAPI.SignInIdentityProviders.local);
                            completeDispatch();
                        }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
                }
                else {
                    var provider = new Windows.Security.Cryptography.DataProtection.DataProtectionProvider("local=user");
                    var binary = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(password, Windows.Security.Cryptography.BinaryStringEncoding.utf8);

                    
                    provider.protectAsync(binary).then(function (protectedData) {
                        var localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
                        return localAccountManager.createLocalAccountAsync(username, protectedData, null); })
                        .done(function () {
                            CloudExperienceHost.IUserManager.getInstance().setSignInIdentityProvider(CloudExperienceHostAPI.SignInIdentityProviders.local);
                            completeDispatch();
                        }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
                }
            });
        }
        SurfaceHubAccount.createLocalAccount = createLocalAccount;

        
        function localizedStrings() {
            var surfaceHubAccountResources = {};
            var keyList = ['Title', 'LeadText', 'UserNameLegend', 'UserPlaceholder', 'PasswordLegend', 'PasswordPlaceholder', 'ReenterPlaceholder',
                 'LocalUser_NoUsername_Error', 'Username_Too_Long', 'UserEmpty_Error_Title', 'Username_Error', 'UsernameContainsAt_Error', 'UserExists_Error', 'UserReserved_Error', 'UserIsComputer_Error_Title',
                 'PasswordConfirm_Error', 'PasswordPolicy_Error', 'PasswordEmpty_Error', 'Error_Creating_Account_Warning', 'BackButton', 'NextButton'];
            var i = 0;
            for (i = 0; i < keyList.length; i++) {
                var resourceId = '/surfaceHubAccount/' + keyList[i];
                surfaceHubAccountResources[keyList[i]] = WinJS.Resources.getString(resourceId).value;
            }
            return JSON.stringify(surfaceHubAccountResources);
        }
        SurfaceHubAccount.localizedStrings = localizedStrings;
    })(CloudExperienceHost.SurfaceHubAccount || (CloudExperienceHost.SurfaceHubAccount = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
