// Copyright (C) Microsoft. All rights reserved.
(function () {
    "use strict";

    var bridge = new CloudExperienceHost.Bridge();
    var resources;
    var navFlow;
    var rdamJson = null;

    WinJS.UI.Pages.define("/RetailDemo/retailDemoAdvanced.html", {
        init: function (element, options) {
            let pagePromise = bridge.invoke("CloudExperienceHost.StringResources.getRetailDemoStrings").done(function (result) {
                resources = JSON.parse(result);
            });
            let cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            let languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _htmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            let dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _htmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            let navFlowPromise = bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                navFlow = result.host;
            }, function () { });

            return WinJS.Promise.join({ pagePromise: pagePromise, cssPromise: cssPromise, languagePromise: languagePromise, dirPromise: dirPromise, navFlowPromise: navFlowPromise });
        },

        ready: function (element, options) {
            // Load string resources in HTML elements
            advancedTitle.textContent = resources.advancedTitle;
            nextButton.textContent = resources.finishButton;

            shutdownLegend.textContent = resources.shutdownsTitle;
            shutdownInfo.textContent = resources.shutdownsInfo;
            shutdownButton.textContent = resources.configureText;
            removeRdxLegend.textContent = resources.removeRdxTitle;
            removeRdxInfo.textContent = resources.removeRdxInfo;
            removeRdxButton.textContent = resources.removeRdxText;
            controlPanelLegend.textContent = resources.controlPanelTitle;
            controlPanelInfo.textContent = resources.controlPanelInfo;
            controlPanelButton.textContent = resources.controlPanelText;

            if (!CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_TimedShutdown")) {
                shutdownField.style.visibility = "hidden";
            }

            let platform = CloudExperienceHost.Environment.getPlatform();
            if ((platform === CloudExperienceHost.TargetPlatform.MOBILE) || !CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_DisableAdminAccount")) {
                removeRdxField.style.visibility = "hidden";
            }

            controlPanelButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                bridge.invoke("CloudExperienceHost.RetailDemo.openOnDeviceAdmin");
            });

            shutdownButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action1);
            });

            removeRdxButton.addEventListener("click", function (eventInfo) {
                if (platform != CloudExperienceHost.TargetPlatform.MOBILE) {
                    CloudExperienceHostBroker.RetailDemo.ConfigureRetailDemo.exitRetailDemo()
                        .then(function () {
                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                        })
                        .done();
                }
            });

            nextButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
            });

            bridge.fireEvent(CloudExperienceHost.Events.visible, true);

            // Call to register EaseOfAccess and InputSwitcher controls
            uiHelpers.RegisterEaseOfAccess(easeOfAccess, bridge);
            uiHelpers.RegisterInputSwitcher(inputSwitcher, bridge);
        }
    });
})();
