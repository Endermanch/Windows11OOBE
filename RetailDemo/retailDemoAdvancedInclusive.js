// Copyright (C) Microsoft. All rights reserved.
(function () {
    "use strict";

    var bridge = new CloudExperienceHost.Bridge();
    var resources;
    var navFlow;
    var rdamJson = null;

    WinJS.UI.Pages.define("/RetailDemo/retailDemoAdvancedInclusive.html", {
        init: function (element, options) {
            require.config(new RequirePathConfig('/webapps/inclusiveOobe'));
            let pagePromise = bridge.invoke("CloudExperienceHost.StringResources.getRetailDemoStrings").done(function (result) {
                resources = JSON.parse(result);
            });
            let cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            let languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _rdxHtmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            let dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _rdxHtmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            let navFlowPromise = bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                navFlow = result.host;
            }, function () { });

            return WinJS.Promise.join({ pagePromise: pagePromise, cssPromise: cssPromise, languagePromise: languagePromise, dirPromise: dirPromise, navFlowPromise: navFlowPromise });
        },

        ready: function (element, options) {
            let processingFlag = false;

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
                require(['lib/knockout', 'corejs/knockouthelpers'], (ko, KoHelpers) => {
                    // Setup knockout customizations
                    let dialogElement = document.querySelector("oobe-retaildemo-exit-dialog");
                    if (!dialogElement) {
                        new KoHelpers().registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                        KoHelpers.registerDialogComponents();
                        dialogElement = document.createElement("oobe-retaildemo-exit-dialog");
                        ko.applyBindings({}, dialogElement);
                        document.body.appendChild(dialogElement);
                    }

                    KoHelpers.waitForDialogComponentLoadAsync().then(() => {
                        dialogElement.koComponent.showDlg().done((eventInfo) => {
                            if (eventInfo.result == WinJS.UI.ContentDialog.DismissalResult.primary && !processingFlag) {
                                processingFlag = true;
                                bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);
                                CloudExperienceHostBroker.RetailDemo.ConfigureRetailDemo.exitRetailDemo()
                                    .then(function () {
                                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                    })
                                    .done();
                            }
                        });
                    });
                });
            });

            nextButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
            });

            bridge.fireEvent(CloudExperienceHost.Events.visible, true);
        }
    });
})();
