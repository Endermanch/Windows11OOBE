//
// Copyright (C) Microsoft. All rights reserved.
//
(function () {
    "use strict";
    var resources = {};
    var isNavigationBlocked = false;
    var navigationBlockedUri = "";
    var bridge = new CloudExperienceHost.Bridge();
    WinJS.UI.Pages.define("/views/nointernet.html", {
        init: function (element, options) {
            var languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _htmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            var dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _htmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            let getLocalizedStringsPromise = bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", 'errors').then((resourceStrings) => {
                this.resources = JSON.parse(resourceStrings);
            });
            let isNavigationBlockedPromise = bridge.invoke("CloudExperienceHost.Storage.VolatileSharableData.getItem", "NavigationAccessPolicyValues", "blockedNavigationInstanceOutstanding").then((isBlocked) => {
                this.isNavigationBlocked = (isBlocked === true); // boolify the input in case it was undefined
            });
            let navigationBlockedUriPromise = bridge.invoke("CloudExperienceHost.Storage.VolatileSharableData.getItem", "NavigationAccessPolicyValues", "blockedNavigationUri").then((blockedUri) => {
                this.navigationBlockedUri = blockedUri ? blockedUri : "";
            });
            let cssPromise;
            if (CloudExperienceHostAPI.FeatureStaging.isOobeFeatureEnabled("NodeCapabilityForNoInternetPage")) {
                cssPromise = bridge.invoke("CloudExperienceHost.getContext").then((targetContext) => {
                    if (targetContext && targetContext.capabilities) {
                        let capabilities = JSON.parse(targetContext.capabilities);
                        const nodeCapabilitiesValue = capabilities['NodeCapabilities'];
                        if (nodeCapabilitiesValue !== undefined) {
                            let nodeCapabilitiesJson = JSON.parse(nodeCapabilitiesValue);
                            const personality = nodeCapabilitiesJson['Personality'];
                            if (personality !== undefined) {
                                return uiHelpers.LoadPersonalityCssPromise(document.head, "..", personality, bridge);
                            }
                        }
                    }
                    return uiHelpers.LoadCssPromise(document.head, "..", bridge);
                 });
            }
            else {
                cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            }
            return WinJS.Promise.join({ languagePromise: languagePromise, dirPromise: dirPromise, getLocalizedStringsPromise: getLocalizedStringsPromise, isNavigationBlockedPromise: isNavigationBlockedPromise, navigationBlockedUriPromise: navigationBlockedUriPromise, cssPromise: cssPromise });
        },
        ready: function (element, options) {
            if (this.isNavigationBlocked) {
                Title.textContent = this.resources.NavigationBlockedTitle;
                let navigationBlockedText = this.resources.NavigationBlockedText;
                navigationBlockedText = navigationBlockedText.replace("{0}", this.navigationBlockedUri);
                SubHeader.textContent = navigationBlockedText;
            } else {
                Title.textContent = this.resources.NoNetworkMsaTitle;
                SubHeader.textContent = this.resources.NoNetworkMsaText;
            }
            RetryButton.textContent = this.resources.Retry;
            CancelButton.textContent = this.resources.Cancel;

            RetryButton.addEventListener("click", function () {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
            });

            CancelButton.addEventListener("click", function () {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.cancel);
            });

            bridge.fireEvent(CloudExperienceHost.Events.visible, true);

            if (this.isNavigationBlocked) {
                bridge.invoke("CloudExperienceHost.Storage.VolatileSharableData.removeItem", "NavigationAccessPolicyValues", "blockedNavigationInstanceOutstanding");
                bridge.invoke("CloudExperienceHost.Storage.VolatileSharableData.removeItem", "NavigationAccessPolicyValues", "blockedNavigationUri");
            }
        },
    });
})();
