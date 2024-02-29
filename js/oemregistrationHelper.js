//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var OEMRegistrationInfo;
    (function (OEMRegistrationInfo) {
        function getOEMRegistrationKeyNames() {
            return {
                "title": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.title,
                "subtitle": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.subtitle,
                "hideSkip": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.hideSkip,
                "showPhoneNumber": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.showPhoneNumber,
                "customerInfo": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.customerInfo,
                "fields": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.fields,
                "type": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.type,
                "id": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.id,
                "label": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.label,
                "value": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.value,
                "checkboxType": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.checkboxType,
                "textboxType": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.textboxType,
                "linkType": CloudExperienceHostAPI.OEMRegistrationKeyNamesStatics.linkType,
            };
        }
        OEMRegistrationInfo.getOEMRegistrationKeyNames = getOEMRegistrationKeyNames;
        function retrieveOEMRegistrationInfo() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                CloudExperienceHostAPI.OEMRegistrationStatics.retrieveInfoAsync().then(function (oemRegistrationInfo) {
                    completeDispatch(oemRegistrationInfo);
                }, errorDispatch);
            });
        }
        OEMRegistrationInfo.retrieveOEMRegistrationInfo = retrieveOEMRegistrationInfo;
        function saveOEMRegistrationInfo(oemRegistrationInfo) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                CloudExperienceHostAPI.OEMRegistrationStatics.saveInfoAsync(oemRegistrationInfo).then(function () {
                    completeDispatch();
                }, errorDispatch);
            });
        }
        OEMRegistrationInfo.saveOEMRegistrationInfo = saveOEMRegistrationInfo;
        function getLinkFileContent(filePath) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                CloudExperienceHostAPI.OEMRegistrationStatics.getLinkFileAsync(filePath).then(function (file) {
                    return Windows.Storage.FileIO.readTextAsync(file);
                }).done(function (contentBuffer) {
                    completeDispatch(contentBuffer);
                }, function (err) {
                    errorDispatch(err);
                });
            });
        }
        OEMRegistrationInfo.getLinkFileContent = getLinkFileContent;
        function getShouldShowOEMRegistration() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                var oemRegistration = CloudExperienceHostAPI.OEMRegistrationStatics;
                oemRegistration.getShouldSkipAsync().done(function (shouldSkip) {
                    completeDispatch(!shouldSkip);
                }, function (err) {
                    errorDispatch(err);
                }, function (progress) {
                    progressDispatch(progress);
                });
            });
        }
        OEMRegistrationInfo.getShouldShowOEMRegistration = getShouldShowOEMRegistration;
        function getShouldSkipAsync() {
            return new WinJS.Promise(function (completeDispatch /*, errorDispatch, progressDispatch*/) {
                let shouldSkip = false;
                let shouldRestrictionsApply = false;
                let oemRegistrationStaticsPromise = CloudExperienceHostAPI.OEMRegistrationStatics.getShouldSkipAsync().then((result) => {
                    shouldSkip = result; // Skip if we can't show OEM reg page due to system config
                });
                let ageAppropriateDesignCodeEligibilityPromise = CloudExperienceHost.AgeAppropriateDesignCode.Eligibility.shouldRestrictionsApplyToCurrentUserAsync().then((result) => {
                    shouldRestrictionsApply = result; // Skip for AADC restricted users
                });
                WinJS.Promise.join([oemRegistrationStaticsPromise, ageAppropriateDesignCodeEligibilityPromise]).then(() => {
                    completeDispatch(shouldSkip || shouldRestrictionsApply);
                });
            });
        }
        OEMRegistrationInfo.getShouldSkipAsync = getShouldSkipAsync;
        // Function to get all the strings via bridge as access from webview is not possible
        function localizedStrings() {
            var oemRegistrationResources = {};
            var keyList = ['VoiceOver'];
            for (var i = 0; i < keyList.length; i++) {
                var resourceId = '/oemRegistration/' + keyList[i];
                oemRegistrationResources[keyList[i]] = WinJS.Resources.getString(resourceId).value;
            }
            return JSON.stringify(oemRegistrationResources);
        }
        OEMRegistrationInfo.localizedStrings = localizedStrings;
    })(OEMRegistrationInfo = CloudExperienceHost.OEMRegistrationInfo || (CloudExperienceHost.OEMRegistrationInfo = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=oemregistrationHelper.js.map