//
// Copyright (C) Microsoft. All rights reserved.
//

(() => {
    WinJS.UI.Pages.define("/webapps/inclusiveoobe/view/oobeautopilotupdate-main.html", {
        init: (element, options) => {
            require.config(new RequirePathConfig('/webapps/inclusiveoobe'));

            // Load css per scenario
            let loadCssPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                return result.legacy_uiHelpers.LoadCssPromise(document.head, "", result.legacy_bridge);
            });

            let langAndDirPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                return result.legacy_uiHelpers.LangAndDirPromise(document.documentElement, result.legacy_bridge);
            });

            // Load resource strings
            let getLocalizedStringsPromise = requireAsync(['legacy/bridge', 'legacy/core']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.makeAutopilotResourceObject").then((resultString) => {
                    this.resourceStrings = JSON.parse(resultString);
                }, (error) => {
                    result.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot_OobeAutopilotUpdatePage_FailedToLoadResource", result.legacy_core.GetJsonFromError(error));
                });
            });

            let getPersonalityPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.getContext");
            }).then((targetContext) => {
                this.targetPersonality = targetContext.personality;
            });

            return WinJS.Promise.join({
                loadCssPromise: loadCssPromise,
                langAndDirPromise: langAndDirPromise,
                getLocalizedStringsPromise: getLocalizedStringsPromise,
                getPersonalityPromise: getPersonalityPromise
            });
        },
        error: (e) => {
            require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        },
        ready: (element, options) => {
            require(['lib/knockout', 'corejs/knockouthelpers', 'legacy/bridge', 'legacy/events', 'oobeautopilotupdate-vm', 'lib/knockout-winjs'], (ko, KoHelpers, bridge, constants, AutopilotUpdateViewModel) => {
                // Setup knockout customizations
                koHelpers = new KoHelpers();
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.LightProgress, true /*holdForAdditionalRegistration*/);
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);

                // Apply bindings and show the page
                ko.applyBindings(new AutopilotUpdateViewModel(this.resourceStrings, this.targetPersonality));
                KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                    WinJS.Utilities.addClass(document.body, "pageLoaded");
                    bridge.fireEvent(constants.Events.visible, true);
                    KoHelpers.setFocusOnAutofocusElement();
                });
            });
        }
    });
})();
