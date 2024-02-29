//
// Copyright (C) Microsoft. All rights reserved.
//
(() => {
    WinJS.UI.Pages.define("/webapps/inclusiveOobe/view/oobeprovisioningentry-main.html", {
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
                return result.legacy_bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeProvisioningEntry");
            }).then((result) => {
                this.resourceStrings = JSON.parse(result);
            });

            let getProvisioningDataPromise = requireAsync(['oobeprovisioningentry-data']).then((result) => {
                return result.oobeprovisioningentry_data.getProvisioningDataAsync();
            }).then((result) => {
                this.provisioningData = result;
            });

            return WinJS.Promise.join({ loadCssPromise: loadCssPromise, langAndDirPromise: langAndDirPromise, getLocalizedStringsPromise: getLocalizedStringsPromise, getProvisioningDataPromise: getProvisioningDataPromise });
        },
        error: (e) => {
            require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        },
        ready: (element, options) => {
            require(['lib/knockout', 'corejs/knockouthelpers', 'legacy/bridge', 'legacy/events', 'oobeprovisioningentry-vm', 'lib/knockout-winjs'], (ko, KoHelpers, bridge, constants, ProvisioningEntryViewModel) => {
                // Setup knockout customizations
                koHelpers = new KoHelpers();
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                window.KoHelpers = KoHelpers;

                let provisioningViewModel = new ProvisioningEntryViewModel(this.resourceStrings, this.provisioningData);

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
