

"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var HoloLensAccount;
    (function (HoloLensAccount) {
        function createWorkAccount(username, password) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                var provider = new Windows.Security.Cryptography.DataProtection.DataProtectionProvider("local=user");
                var buffer = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(password, Windows.Security.Cryptography.BinaryStringEncoding.utf8);

                provider.protectAsync(buffer).then(function (protectedBuffer) {
                    var encodedString = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(protectedBuffer);

                    var propertySet = CloudExperienceHost.Storage.PrivateData.getValues();
                    propertySet['tokenUpn'] = username;
                    propertySet['oobe-password'] = encodedString;
                    propertySet['configureSignIn'] = 'once';

                    var cloudDomainJoinWorker = new CloudDomainJoin.DataModel.CloudDomainJoinWorker();
                    return cloudDomainJoinWorker.prepareAzureADAccountAsync(propertySet);
                }).done(
                    function () { completeDispatch(); },
                    function (err) { errorDispatch(err); },
                    function (progress) { progressDispatch(progress); });
            });
        }
        HoloLensAccount.createWorkAccount = createWorkAccount;

        
        function localizedStrings() {
            var hololensAccountResources = {};
            var keyList = ['Title', 'LeadText', 'UserPlaceholder', 'PasswordTitle', 'PasswordPlaceholder', 'Error_NoUsername', 'Error_UserExists', 'Error_UsernameFormat', 'Error_Creating_Account_Warning', 'BackButton', 'NextButton'];
            var i = 0;
            for (i = 0; i < keyList.length; i++) {
                var resourceId = '/hololensAccount/' + keyList[i];
                hololensAccountResources[keyList[i]] = WinJS.Resources.getString(resourceId).value;
            }
            return JSON.stringify(hololensAccountResources);
        }
        HoloLensAccount.localizedStrings = localizedStrings;
    })(CloudExperienceHost.HoloLensAccount || (CloudExperienceHost.HoloLensAccount = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
