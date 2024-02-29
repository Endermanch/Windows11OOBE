//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var DeviceUser;
    (function (DeviceUser) {
        function createDeviceUser(username, password) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let provider = new Windows.Security.Cryptography.DataProtection.DataProtectionProvider("local=user");
                let binary = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(password, Windows.Security.Cryptography.BinaryStringEncoding.utf8);

                // Chaining promises to first encrypt the password and then pass it to the API to create the account
                provider.protectAsync(binary).then(function (protectedData) {
                    let deviceUserManager = new Microsoft.ResourceAccountManager.ResourceAccountSetup();
                    return deviceUserManager.createResourceAccountWithAADAccountAsync(username, protectedData);
                })
                .done(function () { completeDispatch(); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
            });
        }
        DeviceUser.createDeviceUser = createDeviceUser;
        function activateLicense(contentId, policyId) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                let deviceUserManager = new Microsoft.ResourceAccountManager.ResourceAccountLicense();
                deviceUserManager.activateLicenseAsync(contentId, policyId).done(completeDispatch, errorDispatch);
            });
        }
        DeviceUser.activateLicense = activateLicense;
        function shouldSkipForAutopilot() {
            return EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getOobeSettingsOverrideAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotOobeSetting.aadAuthUsingDeviceTicket);
        }
        DeviceUser.shouldSkipForAutopilot = shouldSkipForAutopilot;
        function getUPN() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                let deviceUserManager = new Microsoft.ResourceAccountManager.ResourceAccountSetup();
                completeDispatch(deviceUserManager.upn);
            });
        }
        DeviceUser.getUPN = getUPN;
    })(CloudExperienceHost.DeviceUser || (CloudExperienceHost.DeviceUser = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
