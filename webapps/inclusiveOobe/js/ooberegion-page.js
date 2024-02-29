(() => {
    WinJS.UI.Pages.define("/webapps/inclusiveOobe/view/ooberegion-main.html", {
        init: (element, options) => {
            require.config(new RequirePathConfig('/webapps/inclusiveOobe'));

            // Load css per scenario
            let loadCssPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                return result.legacy_uiHelpers.LoadCssPromise(document.head, "", result.legacy_bridge);
            });

            let langAndDirPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                return result.legacy_uiHelpers.LangAndDirPromise(document.documentElement, result.legacy_bridge);
            });

            let getLocalizedStringsPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeRegion");
            }).then((result) => {
                this.resourceStrings = JSON.parse(result);
            });

            let getRegionsPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.Globalization.GeographicRegion.getAll");
            }).then((result) => {
                this.regions = result;
            });

            let getDefaultRegionPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.Globalization.GeographicRegion.getCode");
            }).then((result) => {
                this.defaultregion = result;
            });

            return WinJS.Promise.join({ loadCssPromise: loadCssPromise, langAndDirPromise: langAndDirPromise, getLocalizedStringsPromise: getLocalizedStringsPromise, getRegionsPromise: getRegionsPromise, getDefaultRegionPromise: getDefaultRegionPromise });
        },
        error: (e) => {
            require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        },
        ready: (element, options) => {
            require(['lib/knockout', 'corejs/knockouthelpers', 'jsCommon/oobe-gesture-manager', 'legacy/bridge', 'legacy/core', 'legacy/events', 'ooberegion-vm', 'lib/knockout-winjs'], (ko, KoHelpers, gestureManager, bridge, core, constants, RegionViewModel) => {

                // Setup knockout customizations
                koHelpers = new KoHelpers();
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                window.KoHelpers = KoHelpers;

                let vm = new RegionViewModel(this.resourceStrings, this.regions, this.defaultregion, gestureManager);
                // Apply bindings and show the page
                ko.applyBindings(vm);
                KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                    WinJS.Utilities.addClass(document.body, "pageLoaded");
                    bridge.fireEvent(constants.Events.visible, true);
                    vm.startVoiceOver();
                    vm.subscribeToDeviceInsertion(gestureManager);
                });
            });
        }
    });
})();
