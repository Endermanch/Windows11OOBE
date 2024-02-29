//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var LocalAccount;
    (function (LocalAccount) {
        function getShouldSkipAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                try {
                    let localDisallowed = (CloudExperienceHost.getAllowedIdentityProviders().indexOf(CloudExperienceHost.SignInIdentityProviders.Local) == -1);
                    const forcedEnrollmentPromise = EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getDwordPolicyAsync("CloudAssignedForcedEnrollment");
                    forcedEnrollmentPromise.then((result) => {
                        let isForcedEnrollmentEnabled = (result === 1);
                        // Let the page we're returning to know that the local account creation flow
                        // was blocked so the appropriate error can be reported to the end user.
                        if (isForcedEnrollmentEnabled) {
                            CloudExperienceHost.Telemetry.logEvent("CommercialOOBE_LocalAccount_BlockedByForcedEnrollmentPolicy");
                            CloudExperienceHost.Storage.VolatileSharableData.addItem("AutopilotValues", "LocalAccountCreationBlockedByForcedEnrollmentPolicy", true);
                        }

                        if (localDisallowed) {
                            CloudExperienceHost.Telemetry.logEvent("CommercialOOBE_LocalAccount_BlockedByWinSEPolicy");
                        }

                        completeDispatch(localDisallowed || isForcedEnrollmentEnabled);
                    });
                } catch (err) {
                    // If an exception is thrown, proceed to the Local Account page.
                    CloudExperienceHost.Telemetry.logEvent("CloudExperienceHost_LocalAccount_GetShouldSkipAsyncFailed", JSON.stringify({ error: err }));
                    completeDispatch(false);
                }
            });
        }
        LocalAccount.getShouldSkipAsync = getShouldSkipAsync;

        function createLocalAccount(username, password, recoveryData) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                if ((password == null) || (password === "")) {
                    // If there is no password, pass the null auth buffer
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

                    // Chaining promises to first encrypt the password and then pass it to the API to create the account
                    provider.protectAsync(binary).then(function (protectedData) {
                        var localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
                        var recoveryKind = localAccountManager.isLocalSecurityQuestionResetAllowed ? CloudExperienceHostBroker.Account.RecoveryKind.questions : CloudExperienceHostBroker.Account.RecoveryKind.hint;
                        return localAccountManager.createLocalAccountAsync(username, protectedData, recoveryData, recoveryKind); })
                        .done(function () {
                            CloudExperienceHost.IUserManager.getInstance().setSignInIdentityProvider(CloudExperienceHostAPI.SignInIdentityProviders.local);
                            completeDispatch();
                        }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
                }
            });
        }
        LocalAccount.createLocalAccount = createLocalAccount;

        function createRetailAccount(password, isAdmin) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
                if ((password == null) || (password === "")) {
                    localAccountManager.createRetailAccountAsync(null, isAdmin).done(completeDispatch, errorDispatch);
                } else {
                    var provider = new Windows.Security.Cryptography.DataProtection.DataProtectionProvider("local=user");
                    var binary = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(password, Windows.Security.Cryptography.BinaryStringEncoding.utf8);
                    provider.protectAsync(binary).then(function (protectedData) {
                        return localAccountManager.createRetailAccountAsync(protectedData, isAdmin);
                    }).done(completeDispatch, errorDispatch);
                }
            });
        }
        LocalAccount.createRetailAccount = createRetailAccount;

        function verifyLocalAccountCredentials() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                let localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
                return localAccountManager.verifyLocalAccountCreds(WinJS.Resources.getString('/localAccount/UpdateSQSATitle').value,
                    WinJS.Resources.getString('/localAccount/CredMessageText').value).done(completeDispatch, errorDispatch);
            });
        }
        LocalAccount.verifyLocalAccountCredentials = verifyLocalAccountCredentials;

        function updateSQSA(recoveryData) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                let localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
                return localAccountManager.updateSecurityQuestionsForUserAsync(null, recoveryData)
                    .done(completeDispatch, errorDispatch);
            });
        }
        LocalAccount.updateSQSA = updateSQSA;

        // Function to get all the strings for local account creation via bridge as access from webview is not possible
        function localizedStrings() {
            let localAccountResources = {};
            const keyList = ['Title', 'LeadText1', 'LeadText', 'UserNameLegend', 'UserPlaceholder', 'PasswordLegend', 'SQSALegend',
                'PasswordPlaceholder', 'ReenterPlaceholder', 'HintPlaceholder', 'SecurityQuestion1Placeholder',
                'SecurityQuestion2Placeholder', 'SecurityQuestion3Placeholder', 'SecurityQuestion1', 'SecurityQuestion2',
                'SecurityQuestion3', 'SecurityQuestion4', 'SecurityQuestion5', 'SecurityQuestion6', 'SecurityAnswerPlaceholder',
                'LocalUser_NoUsername_Error', 'Username_Too_Long', 'UserEmpty_Error_Title', 'Username_Error', 'UsernameContainsAt_Error',
                'UserExists_Error', 'UserReserved_Error', 'UserIsComputer_Error_Title', 'PasswordConfirm_Error',
                'PasswordHint_Empty_Error', 'PasswordHint_Invalid_Error', 'PasswordPolicy_Error', 'Error_Creating_Account_Warning',
                'SQSA_Error', 'BackButton', 'NextButton', 'VoiceOver'];
            for (let i = 0; i < keyList.length; i++) {
                let resourceId = '/localAccount/' + keyList[i];
                localAccountResources[keyList[i]] = WinJS.Resources.getString(resourceId).value;
            }
            return JSON.stringify(localAccountResources);
        }
        LocalAccount.localizedStrings = localizedStrings;

        // Function to get all the strings for SQSA setup/change via bridge as access from webview is not possible
        function localizedStringsSetupSQSA() {
            let localAccountResources = {};
            const keyList = ['UpdateSQSATitle', 'SQSALegend', 'SecurityQuestion1Placeholder', 'SecurityQuestion2Placeholder',
                'SecurityQuestion3Placeholder', 'SecurityQuestion1', 'SecurityQuestion2', 'SecurityQuestion3',
                'SecurityQuestion4', 'SecurityQuestion5', 'SecurityQuestion6', 'SecurityAnswerPlaceholder',
                'Error_Creating_Account_Warning', 'SQSA_Error', 'CancelButton', 'FinishButton'];
            for (let i = 0; i < keyList.length; i++) {
                let resourceId = '/localAccount/' + keyList[i];
                localAccountResources[keyList[i]] = WinJS.Resources.getString(resourceId).value;
            }
            return JSON.stringify(localAccountResources);
        }
        LocalAccount.localizedStringsSetupSQSA = localizedStringsSetupSQSA;

        // Function to determine if SQSA is allowed
        function isSQSAAllowed() {
            var localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
            return localAccountManager.isLocalSecurityQuestionResetAllowed;
        }
        LocalAccount.isSQSAAllowed = isSQSAAllowed;

    })(CloudExperienceHost.LocalAccount || (CloudExperienceHost.LocalAccount = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
