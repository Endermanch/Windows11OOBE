//
// Copyright (C) Microsoft. All rights reserved.
//
(() => {
    WinJS.UI.Pages.define("/webapps/inclusiveOobe/view/oobeenterpriseprovisioning-main.html", {
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
            let getLocalizedStringsPromise = requireAsync(['legacy/bridge', 'legacy/core']).then((bridge) => {
                return bridge.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.makeAutopilotResourceObject").then((result) => {
                    this.resourceStrings = JSON.parse(result);
                }, (error) => {
                    bridge.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot_OobeEnterpriseProvisioningPage_FailedToLoadResource", bridge.legacy_core.GetJsonFromError(error));
                });
            });

            let getTargetPersonalityPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.getContext");
            }).then((targetContext) => {
                this.targetPersonality = targetContext.personality ? targetContext.personality : CloudExperienceHost.TargetPersonality.InclusiveBlue;
            });

            // Scenario constants
            this.DETECT_RUNNING_ON_HUB_SETTING = "IsRunningOnHub";
            this.SHOW_EXPORT_ON_PROVISIONING_SETTING = "ShowExportOnProvisioning";

            this.showPreprovisioning = true;

            let getShowPreprovisioningOnHubPromise = requireAsync(['legacy/bridge', 'legacy/core']).then((bridge) => {
                return bridge.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.getStringSettingAsync", this.DETECT_RUNNING_ON_HUB_SETTING).then((isHub) => {
                    bridge.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning isHub: ", isHub);
                    if (isHub === "True") {
                        this.showPreprovisioning = false;
                    }
                }, (error) => {
                    bridge.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning suppressing pre-provisioning Hub FAILED. Details: ", bridge.legacy_core.GetJsonFromError(error));
                });
            });

            let getShowPreprovisioningForResealPromise = requireAsync(['legacy/bridge', 'legacy/core']).then((bridge) => {
                return bridge.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.getDeviceAutopilotModeAsync").then((autopilotMode) => {
                    bridge.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning mode: ", autopilotMode);
                    if (autopilotMode == EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveResealed) {
                        this.showPreprovisioning = false;
                    }
                }, (error) => {
                    bridge.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning suppressing pre-provisioning reseal FAILED. Details: ", bridge.legacy_core.GetJsonFromError(error));
                });
            });

            this.showExportLogs = false;
            let getShowExportLogsPromise = requireAsync(['legacy/bridge', 'legacy/core']).then((bridge) => {
                return bridge.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.getStringSettingAsync", this.SHOW_EXPORT_ON_PROVISIONING_SETTING).then((showExport) => {
                    bridge.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning showExport: ", showExport);
                    if (showExport === "True") {
                        this.showExportLogs = true;
                    }
                }, (error) => {
                    bridge.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning showing export FAILED. Details: ", bridge.legacy_core.GetJsonFromError(error));
                });
            });

            return WinJS.Promise.join({
                loadCssPromise: loadCssPromise,
                langAndDirPromise: langAndDirPromise,
                getLocalizedStringsPromise: getLocalizedStringsPromise,
                getTargetPersonalityPromise: getTargetPersonalityPromise,
                getShowPreprovisioningOnHubPromise: getShowPreprovisioningOnHubPromise,
                getShowPreprovisioningForResealPromise: getShowPreprovisioningForResealPromise,
                getShowExportLogsPromise: getShowExportLogsPromise});
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
                'oobeenterpriseprovisioning-vm',
                'lib/knockout-winjs'], (
                ko,
                KoHelpers,
                bridge,
                constants,
                EnterpriseProvisioningViewModel) => {

                // Setup knockout customizations
                koHelpers = new KoHelpers();
                koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                window.KoHelpers = KoHelpers;

                let enterpriseProvisioningViewModel = new EnterpriseProvisioningViewModel(this.resourceStrings, this.targetPersonality, this.showPreprovisioning, this.showExportLogs);

                // Apply bindings and show the page
                ko.applyBindings(enterpriseProvisioningViewModel);
                KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                    WinJS.Utilities.addClass(document.body, "pageLoaded");
                    bridge.fireEvent(constants.Events.visible, true);
                    KoHelpers.setFocusOnAutofocusElement();
                });
            });
        }
    });
})();
