//
// Copyright (C) Microsoft. All rights reserved.
//
(() => {
    WinJS.UI.Pages.define("/webapps/inclusiveOobe/view/autopilotwhitegloveresult-main.html", {
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
            let getLocalizedStringsPromise = requireAsync(['legacy/bridge', 'legacy/core']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.makeAutopilotResourceObject").then((resultString) => {
                    this.resourceStrings = JSON.parse(resultString);
                }, (error) => {
                    result.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot_AutopilotWhiteGloveResultPage_FailedToLoadResource", result.legacy_core.GetJsonFromError(error));
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
            require([
                'legacy/bridge',
                'legacy/events'], (
                    bridge,
                    constants) => {
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        },
        ready: (element, options) => {
            require([
                'lib/knockout',
                'corejs/knockouthelpers',
                'legacy/bridge',
                'legacy/events',
                'autopilotwhitegloveresult-vm',
                'lib/knockout-winjs'], (
                ko,
                KoHelpers,
                bridge,
                constants,
                WhiteGloveResultViewModel) => {

                // Setup knockout customizations
                koHelpers = new KoHelpers();
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                window.KoHelpers = KoHelpers;

                let whiteGloveResultViewModel = new WhiteGloveResultViewModel(this.resourceStrings, this.targetPersonality);

                // Apply bindings and show the page
                ko.applyBindings(whiteGloveResultViewModel);
                KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                    WinJS.Utilities.addClass(document.body, "pageLoaded");
                    bridge.fireEvent(constants.Events.visible, true);
                    KoHelpers.setFocusOnAutofocusElement();
                });
            });
        }
    });
})();
