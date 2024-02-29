//
// Copyright (C) Microsoft. All rights reserved.
//

"use strict";

(() => {
    WinJS.UI.Pages.define("/webapps/inclusiveOobe/view/autopilot/autopilotespprogress-main.html", {
        init: (element, options) => {
            require.config(new RequirePathConfig('/webapps/inclusiveOobe'));

            // Get the scenario context, then load the css for the scenario
            let getContextAndLoadCssPromise = requireAsync(['legacy/bridge']).then((result) => {
                result.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "BootstrapStatus: Loading page context");

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
                    // Device ESP
                    return result.legacy_uiHelpers.LoadCssPromise(document.head, "", result.legacy_bridge);
                } else {
                    // User ESP should also use the FRXINCLUSIVE (OOBE) stylesheet
                    return result.legacy_uiHelpers.LoadPersonalityCssPromise(document.head, "", this.targetPersonality, result.legacy_bridge);
                }
            }).then(() => {
                if (!this.isInOobe && this.targetPersonality === CloudExperienceHost.TargetPersonality.InclusiveBlue) {
                    // Set the background as the same color as the inner webapp to match the other webapps in the scenario
                    document.getElementById('_htmlRoot').style.background = '#004275';
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
                    result.legacy_bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot_AutopilotEspProgressPage_FailedToLoadResource", result.legacy_core.GetJsonFromError(error));
                });
            });

            // Load flag indicating whether PPKG processing should occur.
            this.runProvisioning = false;

            let runProvisioningPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.EnrollmentStatusPage.runProvisioningInStatusPageAsync");
            }).then((result) => {
                this.runProvisioning = (result === 1);
            });

            // Load flag indicating whether MDM session tasks need to be restored.
            this.restoreMdmTasks = false;

            let restoreMdmTasksPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.AutoPilot.EnrollmentStatusPage.restoreMDMSyncTasks");
            }).then((result) => {
                this.restoreMdmTasks = (result === 1);
            });

            return WinJS.Promise.join({
                getContextAndLoadCssPromise: getContextAndLoadCssPromise,
                getLocalizedStringsPromise: getLocalizedStringsPromise,
                langAndDirPromise: langAndDirPromise,
                restoreMdmTasksPromise: restoreMdmTasksPromise,
                runProvisioningPromise: runProvisioningPromise
            });
        },

        error: (e) => {
            require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot enrollment status page failed to load", JSON.stringify({ error: e }));
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        },

        ready: (element, options) => {
            require(
                [
                    'lib/knockout', 
                    'corejs/knockouthelpers', 
                    'legacy/bridge',
                    'legacy/events',
                    'autopilot/autopilotespprogress-vm',
                    'autopilot/bootstrapSessionGeneralUtilities',
                    this.targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite ? 'autopilot/bootstrapStatusCategoryView-lite' : 'autopilot/bootstrapStatusCategoryView',
                    'autopilot/devicePreparationCategoryViewModel',
                    'autopilot/deviceSetupCategoryViewModel',
                    'autopilot/accountSetupCategoryViewModel'
                ],
                (
                    ko,
                    koHelpers,
                    bridge,
                    constants,
                    autopilotEspProgressViewModel,
                    bootstrapSessionGeneralUtilities,
                    bootstrapStatusCategoryView,
                    devicePreparationCategoryViewModel,
                    deviceSetupCategoryViewModel,
                    accountSetupCategoryViewModel) => {

                    // Create the global session utilities object used by all classes.
                    // Having a single global object lets classes communication with each other 
                    // (e.g., pass data) more easily.
                    this.sessionUtilities = new bootstrapSessionGeneralUtilities(this.isInOobe);

                    // Store state used by other classes.
                    this.sessionUtilities.storeSettingAsync(
                        this.sessionUtilities.STATE_NAME_GLOBAL_RUN_PROVISIONING,
                        this.runProvisioning ? "true" : "false");

                    this.sessionUtilities.storeSettingAsync(
                        this.sessionUtilities.STATE_NAME_GLOBAL_RESTORE_MDM_TASKS,
                        this.restoreMdmTasks ? "true" : "false");

                    this.sessionUtilities.storeSettingAsync(
                        this.sessionUtilities.STATE_NAME_GLOBAL_MDM_ENROLLMENT_STATUS,
                        this.sessionUtilities.MDM_ENROLLMENT_DISPOSITION[EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.unknown]);

                    // Register categories to display here.  Categories are displayed in the same order
                    // on the page as listed here.
                    let categoryRegistrations = [
                        devicePreparationCategoryViewModel,
                        deviceSetupCategoryViewModel,
                        accountSetupCategoryViewModel
                    ];
                        
                    // Setup knockout customizations
                    let koPageHelpers = new koHelpers();
                    koPageHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.LightProgress, true /*holdForAdditionalRegistration*/);
                    koPageHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                    window.KoHelpers = koHelpers;

                    // Instantiate status categories.  Each category dynamically creates the HTML for the category
                    // and appends the HTML to this categoriesTable.
                    let categoriesTable = element.querySelector((this.targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite) ? "#categoriesTableLite" : "#categoriesTable");

                    // Only needs to be done in Lite White personality.
                    if (this.targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite)
                    {
                        // Set main body width to page and center
                        categoriesTable.setAttribute("width", "100%");
                        categoriesTable.setAttribute("display", "flex");
                        categoriesTable.setAttribute("justify-content", "center");
                    }

                    let categoryViews = [];
                    let categoryViewInitializationPromises = [];

                    for (let i = 0; i < categoryRegistrations.length; i++) {
                        categoryViews.push(new bootstrapStatusCategoryView(
                            this.resourceStrings,
                            this.sessionUtilities,
                            categoriesTable,
                            new categoryRegistrations[i](
                                this.resourceStrings,
                                this.sessionUtilities)));

                        // Save off the current category's promise that performs category-specific initialization.
                        let currentInitializationPromise = categoryViews[i].getInitializationPromise();
                        if (currentInitializationPromise !== null) {
                            categoryViewInitializationPromises.push(currentInitializationPromise);
                        }

                        // Only needs to be done in Lite White personality.
                        if (this.targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite)
                        {
                            categoriesTable.appendChild(categoryViews[i].getCategoryBody());
                        }
                    }

                    // Apply bindings and show the page
                    let vm = new autopilotEspProgressViewModel(
                        this.resourceStrings,
                        this.targetPersonality,
                        this.sessionUtilities,
                        categoryViews,
                        categoryViewInitializationPromises);

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
