//
// Copyright (C) Microsoft. All rights reserved.
//

"use strict";

(() => {
    var pages = [
        "/webapps/inclusiveOobe/view/autopilot/troubleshootingdiagnostics-main.html",
        "/webapps/inclusiveOobe/view/autopilot/troubleshootingdiagnostics-lite-main.html"
    ];
    pages.forEach((pageuri) => {
        WinJS.UI.Pages.define(pageuri, {
            init: (element, options) => {
                require.config(new RequirePathConfig('/webapps/inclusiveOobe'));

                // Get the scenario context, then load the css for the scenario
                let loadCssPromise = requireAsync(['legacy/bridge']).then((result) => {
                    return result.legacy_bridge.invoke("CloudExperienceHost.getContext");
                }).then((targetContext) => {
                    let host = targetContext.host.toLowerCase();

                    switch (host) {
                        case "nthaadormdm":
                        case "nthentormdm":
                        case "mosetmdmconnecttoworkprovisioningprogress":
                            this.isInOobe = false;
                            break;

                        default:
                            this.isInOobe = true;
                    }

                    this.targetPersonality = targetContext.personality ? targetContext.personality : CloudExperienceHost.TargetPersonality.InclusiveBlue;
                }).then(() => {
                    return requireAsync(['legacy/uiHelpers', 'legacy/bridge', 'legacy/core']);
                }).then((result) => {
                    if (this.isInOobe) {
                        // If in OOBE context
                        return result.legacy_uiHelpers.LoadCssPromise(document.head, "", result.legacy_bridge);
                    } else {
                        // Enforcing style during user ESP is a different mechanism than during device
                        // ESP as we need to use the same stylesheet as device ESP, i.e., the
                        // FRXINCLUSIVE (OOBE) stylesheet.
                        return result.legacy_uiHelpers.LoadPersonalityCssPromise(document.head, "", this.targetPersonality, result.legacy_bridge);
                    }
                });

                let langAndDirPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                    return result.legacy_uiHelpers.LangAndDirPromise(document.documentElement, result.legacy_bridge);
                });

                // Load resource strings
                let getLocalizedStringsPromise = requireAsync(['legacy/bridge', 'legacy/core']).then((result) => {
                    return result.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.makeAutopilotResourceObject").then((resultString) => {
                        this.resourceStrings = JSON.parse(resultString);
                    }, (error) => {
                        result.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot_TroubleshootingDiagnosticsPage_FailedToLoadResource", result.legacy_core.GetJsonFromError(error));
                    });
                });

                return WinJS.Promise.join({ loadCssPromise: loadCssPromise, langAndDirPromise: langAndDirPromise, getLocalizedStringsPromise: getLocalizedStringsPromise });
            },

            ready: (element, options) => {
                require([
                    'lib/knockout',
                    'corejs/knockouthelpers',
                    'legacy/bridge',
                    'legacy/events',
                    'autopilot/troubleshootingDiagnostics-vm',
                    'lib/knockout-winjs'], (
                    ko,
                    koHelpers,
                    bridge,
                    constants,
                    troubleshootingDiagnosticsViewModel) => {

                    // Setup knockout customizations
                    let knockoutHelpers = new koHelpers();
                    knockoutHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.LightProgress, true /*holdForAdditionalRegistration*/);
                    knockoutHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                    window.KoHelpers = koHelpers;

                    let diagnosticsViewModel = new troubleshootingDiagnosticsViewModel(this.resourceStrings, this.targetPersonality);

                    // Apply bindings and show the page
                    ko.applyBindings(diagnosticsViewModel);
                    koHelpers.waitForInitialComponentLoadAsync().then(() => {
                        WinJS.Utilities.addClass(document.body, "pageLoaded");
                        bridge.fireEvent(constants.Events.visible, true);
                        koHelpers.setFocusOnAutofocusElement();
                    });
                });
            },

            error: (e) => {
                require([
                    'legacy/bridge',
                    'legacy/events'], (
                    bridge,
                    constants) => {
                    bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                });
            }
        });
    });
})();
