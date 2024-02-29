//
// Copyright (C) Microsoft. All rights reserved.
//

(() => {
    WinJS.UI.Pages.define("/webapps/inclusiveoobe/view/oobeautopilotactivation-main.html", {
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
                    result.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot_OobeAutopilotActivationPage_FailedToLoadResource", result.legacy_core.GetJsonFromError(error));
                });
            });

            let getTargetPersonalityPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.getContext");
            }).then((targetContext) => {
                this.targetPersonality = targetContext.personality ? targetContext.personality : CloudExperienceHost.TargetPersonality.InclusiveBlue;
            });

            return WinJS.Promise.join({
                loadCssPromise: loadCssPromise,
                langAndDirPromise: langAndDirPromise,
                getLocalizedStringsPromise: getLocalizedStringsPromise,
                getTargetPersonalityPromise: getTargetPersonalityPromise });
        },
        error: (e) => {
            require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        },
        ready: (element, options) => {
            require(['lib/knockout', 'corejs/knockouthelpers', 'legacy/bridge', 'legacy/events', 'oobeautopilotactivation-vm', 'lib/knockout-winjs'], (ko, KoHelpers, bridge, constants, AutopilotActivationViewModel) => {
                // Setup knockout customizations
                koHelpers = new KoHelpers();
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.LightProgress, true /*holdForAdditionalRegistration*/);
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                window.KoHelpers = KoHelpers;

                // Apply bindings and show the page
                let vm = new AutopilotActivationViewModel(this.resourceStrings, this.targetPersonality);
                ko.applyBindings(vm);
                KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                    WinJS.Utilities.addClass(document.body, "pageLoaded");
                    bridge.fireEvent(constants.Events.visible, true);

                    // Call back into the view model to indicate that the page is visible, so that post-visibility finalization
                    // can be done.
                    vm.setIsPageVisibleAsync(true);

                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot_ActivationPage_FinishedSettingIsPageVisible");
                    KoHelpers.setFocusOnAutofocusElement();
                });
            });
        }
    });
})();
