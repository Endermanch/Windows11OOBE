// Copyright (C) Microsoft. All rights reserved.
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var StringResources;
    (function (StringResources) {
        var WinResCore = Windows.ApplicationModel.Resources.Core;
        function getRetailDemoStrings() {
            return makeResourceObject("retailDemo", [
                "rdamTitle", "rdamText", "racLegend", "skuLegend",
                "storeIdLegend", "errorBlankRac", "errorExpiredRac", "errorInvalidRac", "errorRequestTimeout",
                "msaTitle", "msaText", "signInLink", "continueWithoutRAC",
                "nextButton", "finishButton", "shutdownText", "shutdownTextOnline",
                "extraConfigText", "cancelButton", "shutdownsTitle",
                "useOfflineShutdownToggle", "timeZoneText", "advancedTitle", "configureText",
                "removeRdxTitle", "removeRdxInfo", "removeRdxText", "shutdownsInfo",
                "securityTitle", "securityText", "passwordManagmentLegend", "timeoutLegend",
                "passwordLegend", "confirmPassword", "editField", "passwordError", "enterPassword", "immediatelyText",
                "dayText", "daysText", "passwordSuggestion", "retypePassword", "rdxTitle",
                "controlPanelTitle", "controlPanelInfo", "controlPanelText"
            ]);
        }
        StringResources.getRetailDemoStrings = getRetailDemoStrings;
        function makeResourceObject(fileName, keyList, language) {
            var resources = {};
            if (keyList != null) {
                for (var i = 0; i < keyList.length; i++) {
                    var resourceId = "/" + fileName + "/" + keyList[i];
                    resources[keyList[i]] = WinJS.Resources.getString(resourceId).value;
                }
            }
            else {
                // Load and resolve all resources for this file
                let context = WinResCore.ResourceContext;
                let resourceContext = context.getForCurrentView();
                if (language != null) {
                    let languagesVector = new Array(language);
                    resourceContext.languages = languagesVector;
                }
                let mainResourceMap = WinResCore.ResourceManager.current.mainResourceMap;
                let resourceMap = mainResourceMap.getSubtree(fileName);
                let iter = resourceMap.first();
                while (iter.hasCurrent) {
                    resources[iter.current.key] = iter.current.value.resolve(resourceContext).valueAsString;
                    iter.moveNext();
                }
            }
            return JSON.stringify(resources);
        }
        StringResources.makeResourceObject = makeResourceObject;
    })(StringResources = CloudExperienceHost.StringResources || (CloudExperienceHost.StringResources = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=stringResources.js.map