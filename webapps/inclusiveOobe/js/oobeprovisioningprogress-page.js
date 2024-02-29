//
// Copyright (C) Microsoft. All rights reserved.
//
(() => {
    WinJS.UI.Pages.define("/webapps/inclusiveOobe/view/oobeprovisioningprogress-main.html", {
        init: (element, options) => {
            require.config(new RequirePathConfig('/webapps/inclusiveOobe'));

            // Load css per scenario
            let loadCssPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.EnrollmentStatusPage.forceInclusiveCSS", "");
            }).then ((cssList) => {
                for (var i = 0; i < cssList.length; i++) {
                    var fileRef = document.head.ownerDocument.createElement("link");
                    fileRef.setAttribute("rel", "stylesheet");
                    fileRef.setAttribute("type", "text/css");
                    fileRef.setAttribute("href", cssList[i]);
                    document.head.appendChild(fileRef);
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
                    result.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot_OobeProvisioningProgressPage_FailedToLoadResource", result.legacy_core.GetJsonFromError(error));
                });
            });

            let getContextPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.getContext");
            }).then((result) => {
                var host = result.host.toLowerCase();
                if (host === "nthaadormdm" || host === "nthentormdm" || host === "mosetmdmconnecttoworkprovisioningprogress") {
                    this.isOOBE = false;
                } else {
                    this.isOOBE = true;
                }
            });

            let skipPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.EnrollmentStatusPage.showMdmSyncStatusPageAsync");
            }).then((result) => {
                if (result !== 1) {
                    return require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OobeProvisioningProgressPage_SkipPromise", "");
                        return bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                    });
                }
            }, function (e) {
                return require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OobeProvisioningProgressPage_SkipPromise_ErrorInfo", JSON.stringify({ error: e }));
                    return bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                });
            });

            let runProvisioningPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.EnrollmentStatusPage.runProvisioningInStatusPageAsync");
            }).then((result) => {
                if (result === 1) {
                    this.runProvisioning = true;
                } else {
                    this.runProvisioning = false;
                }
            });

            let restoreMDMTasksPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.EnrollmentStatusPage.restoreMDMSyncTasks");
            }).then((result) => {
                if (result === 1) {
                    this.restoreMDMTasks = true;
                } else {
                    this.restoreMDMTasks = false;
            }
            });

            return WinJS.Promise.join({
                loadCssPromise: loadCssPromise,
                langAndDirPromise: langAndDirPromise,
                getLocalizedStringsPromise: getLocalizedStringsPromise,
                skipPromise: skipPromise,
                getContextPromise: getContextPromise,
                runProvisioningPromise: runProvisioningPromise,
                restoreMDMTasksPromise: restoreMDMTasksPromise});
        },
        error: (e) => {
            require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        },
        ready: (element, options) => {
            require(['lib/knockout', 'corejs/knockouthelpers', 'legacy/bridge', 'legacy/events', 'oobeprovisioningprogress-vm', 'lib/knockout-winjs'], (ko, KoHelpers, bridge, constants, provisioningProgressViewModel) => {
                // Setup knockout customizations
                koHelpers = new KoHelpers();
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                window.KoHelpers = KoHelpers;

                // Apply bindings and show the page
                let vm = new provisioningProgressViewModel(this.resourceStrings, this.isOOBE, this.runProvisioning, this.restoreMDMTasks);
                ko.applyBindings(vm);
                KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                    WinJS.Utilities.addClass(document.body, "pageLoaded");
                    bridge.fireEvent(constants.Events.visible, true);
                    KoHelpers.setFocusOnAutofocusElement();
                });
            });
        }
    });
})();
