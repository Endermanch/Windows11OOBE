//
// Copyright (C) Microsoft. All rights reserved.
//
(() => {
    WinJS.UI.Pages.define("/webapps/inclusiveOobe/view/oobeprovisioningstatus-main.html", {
        init: (element, options) => {
            require.config(new RequirePathConfig('/webapps/inclusiveOobe'));

            // Load css per scenario
            let loadCssPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                return result.legacy_uiHelpers.LoadCssPromise(document.head, "", result.legacy_bridge);
            });

            let langAndDirPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                return result.legacy_uiHelpers.LangAndDirPromise(document.documentElement, result.legacy_bridge);
            });

            // Load resource strings
            let getLocalizedStringsPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeProvisioningStatus");
            }).then((result) => {
                this.resourceStrings = JSON.parse(result);
            });

            let getProvisioningResultsPromise = requireAsync(['oobeprovisioningstatus-data']).then((result) => {
                return result.oobeprovisioningstatus_data.getLastProvisioningResultsAsync();
            }).then((result) => {
                this.provisioningResults = result;
            });

            let getPlatformPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.Environment.getPlatform");
            }).then((platform) => {
                this.showEjectMediaMessage = (platform !== CloudExperienceHost.TargetPlatform.SURFACEHUB);
            });

            return WinJS.Promise.join({ loadCssPromise: loadCssPromise, langAndDirPromise: langAndDirPromise, getLocalizedStringsPromise: getLocalizedStringsPromise, getProvisioningResultsPromise: getProvisioningResultsPromise, getPlatformPromise: getPlatformPromise });
        },
        error: (e) => {
            require(['legacy/bridge', 'legacy/events', 'legacy/core'], (bridge, constants, core) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OobeProvisioningStatusPageInitializationFailed", core.GetJsonFromError(e));
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        },
        ready: (element, options) => {
            require(['lib/knockout', 'corejs/knockouthelpers', 'legacy/bridge', 'legacy/events', 'oobeprovisioningstatus-vm', 'lib/knockout-winjs'], (ko, KoHelpers, bridge, constants, ProvisioningStatusViewModel) => {
                // Setup knockout customizations
                koHelpers = new KoHelpers();
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                window.KoHelpers = KoHelpers;

                let provisioningViewModel = new ProvisioningStatusViewModel(this.resourceStrings, this.provisioningResults, this.showEjectMediaMessage);

                // Apply bindings and show the page
                ko.applyBindings(provisioningViewModel);
                KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                    WinJS.Utilities.addClass(document.body, "pageLoaded");
                    bridge.fireEvent(constants.Events.visible, true);
                    provisioningViewModel.ready();
                });
            });
        }
    });
})();
