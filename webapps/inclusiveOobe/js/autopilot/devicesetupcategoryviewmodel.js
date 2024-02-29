//
// Copyright (C) Microsoft. All rights reserved.
//

"use strict";

define([
    'legacy/bridge',
    'legacy/events',
    'autopilot/bootstrapStatusSubcategoryViewModel',
    'autopilot/mdmBootstrapSessionUtilities',
    'autopilot/commercialDiagnosticsUtilities'], (
    bridge,
    constants,
    bootstrapStatusSubcategoryViewModel,
    mdmBootstrapSessionUtilities,
    commercialDiagnosticsUtilities) => {

    class deviceSetupCategoryViewModel {
        constructor(resourceStrings, sessionUtilities) {
            // Constants
            this.rebootRequiredToCommitSettingsSettingName = "ESP.Device.rebootRequiredToCommitSettings";
            this.defaultWaitToInitiateSyncSessionsInMilliseconds = 1000; // 1 second

            // Private member variables
            this.resourceStrings = resourceStrings;
            this.sessionUtilities = sessionUtilities;
            this.mdmBootstrapSessionUtilities = new mdmBootstrapSessionUtilities(
                resourceStrings, 
                this.sessionUtilities.runningInOobe(),
                sessionUtilities);
            this.commercialDiagnosticsUtilities = new commercialDiagnosticsUtilities();
            this.securityPoliciesProvisioningSucceeded = true;
            this.certificatesProvisioningSucceeded = true;
            this.networkProfilesProvisioningSucceeded = true;
            this.appsProvisioningSucceeded = true;

            // The background sync sessions need to be initiated only once for all the MDM-monitored
            // subcategories in this category.  Creating a single promise will ensure that singleton.
            // Syncs are reinitiated after every reboot, and so sync lifetime should match
            // with this category's lifetime.
            this.syncSyncSessionsShouldStart = false;
            this.waitForSyncSessionsInitiationPromise = this.waitForSyncSessionsInitiationAsync();

            this.initializationPromise = this.sessionUtilities.autopilotApis.getDeviceAutopilotModeAsync().then((mode) => {
                this.whiteGloveMode = mode;
            });
        }

        waitForSyncSessionsInitiationAsync() {
            if (this.syncSyncSessionsShouldStart) {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_ESPDeviceSetup_SyncSessionWaitLoop_StartingSyncSessions",
                    "BootstrapStatus: Start background sync sessions for Device Setup.");

                // This is a fire and forget operation because sendResultsToMdmServerAsync sets the IsSyncDone node to actually break out of this wait
                this.mdmBootstrapSessionUtilities.initiateSyncSessionsAsync(ModernDeployment.Autopilot.Core.SyncSessionExitCondition.deviceSetupComplete);

                return WinJS.Promise.as(true);
            } else {
                // Keep polling for the signal to initiate background sync sessions.
                return WinJS.Promise.timeout(this.defaultWaitToInitiateSyncSessionsInMilliseconds).then(() => {
                    return this.waitForSyncSessionsInitiationAsync();
                });
            }
        }

        coalesceRebootsAsync() {
            return this.sessionUtilities.getSettingAsync(this.rebootRequiredToCommitSettingsSettingName).then((isRebootRequired) => {
                // Should only reboot in OOBE.  This makes sure the web app doesn't "Fall off" before pin.
                if (isRebootRequired === "true") {
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "CommercialOOBE_ESPDeviceSetup_RebootCoalescing_Required",
                        "BootstrapStatus: Coalesced reboot required.");

                    // Returning this state will tell the framework to do the actual reboot and resume this subcategory post-reboot.
                    return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                        this.sessionUtilities.SUBCATEGORY_STATE_REBOOT_REQUIRED_AND_TRY_AGAIN,
                        null));
                }

                return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                    this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED,
                    null));
            });
        }

        sendResultsToMdmServerAsync() {
            // Best effort
            try {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_ESPDeviceSetup_SendResultsToMdmServer_Started",
                    "BootstrapStatus: Device setup category sending success results to MDM server.");

                this.sessionUtilities.enrollmentApis.updateServerWithResult(true, this.sessionUtilities.runningInOobe());
            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "CommercialOOBE_ESPDeviceSetup_SendResultsToMdmServer_Failed",
                    "Failed to send results to MDM server, likely due to setting an already-failed provisioning status.",
                    e);
            }

            this.commercialDiagnosticsUtilities.logInfoEvent(
                "CommercialOOBE_ESPDeviceSetup_SendResultsToMdmServer_Succeeded",
                "BootstrapStatus: Device setup category sent success results to MDM server.");

            return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED,
                null));
        }

        saveWhiteGloveSuccessResultAsync() {
            // Since this is the last action in this category, if it gets invoked, that implies all actions succeeded,
            // which itself implies White Glove succeeded.
            if ((this.whiteGloveMode === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveCanonical) ||
                (this.whiteGloveMode === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP)) {
                return bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.sessionUtilities.WHITE_GLOVE_SUCCESS_VALUE_NAME, true).then(() => {
                    return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                        this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED,
                        null));
                });
            }

            return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED,
                null));
        }

        // Category interface methods

        getId() {
            return "DeviceSetupCategory";
        }

        getTitle() {
            return this.resourceStrings["BootstrapPageDeviceSetupCategoryTitle"];
        }

        getIconClass() {
            return "icon-devices";
        }

        getDisposition() {
            return (this.sessionUtilities.runningInOobe() ? this.sessionUtilities.CATEGORY_DISPOSITION_VISIBLE : this.sessionUtilities.CATEGORY_DISPOSITION_IGNORED);
        }

        runsInOobe() {
            return true;
        }

        getInitializationPromise() {
            return this.initializationPromise;
        }

        getSubcategories() {
            return [
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "DeviceSetup.SecurityPoliciesSubcategory",
                    this.resourceStrings["BootstrapPageSecurityPoliciesSubcategoryTitle"],
                    true,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE;
                    },
                    (progressCallbackAsync) => {
                        // Ensure the background sync sessions are initiated first.
                        this.syncSyncSessionsShouldStart = true;

                        return this.waitForSyncSessionsInitiationPromise.then(() => {
                            return this.mdmBootstrapSessionUtilities.monitorPoliciesApplicationAsync(progressCallbackAsync);
                        }).then((actionResult) => {
                            this.securityPoliciesProvisioningSucceeded = this.sessionUtilities.subcategorySucceeded(actionResult.actionResultState);

                            return actionResult;
                        });
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "DeviceSetup.CertificatesSubcategory",
                    this.resourceStrings["BootstrapPageCertificatesSubcategoryTitle"],
                    true,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE;
                    },
                    (progressCallbackAsync) => {
                        // Ensure the background sync sessions are initiated first.
                        this.syncSyncSessionsShouldStart = true;

                        return this.waitForSyncSessionsInitiationPromise.then(() => {
                            return this.mdmBootstrapSessionUtilities.monitorCertsInstallationAsync(progressCallbackAsync);
                        }).then((actionResult) => {
                            this.certificatesProvisioningSucceeded = this.sessionUtilities.subcategorySucceeded(actionResult.actionResultState);

                            return actionResult;
                        });
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "DeviceSetup.NetworkConnectionsSubcategory",
                    this.resourceStrings["BootstrapPageNetworkConnectionsSubcategoryTitle"],
                    true,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE;
                    },
                    (progressCallbackAsync) => {
                        // Ensure the background sync sessions are initiated first.
                        this.syncSyncSessionsShouldStart = true;

                        return this.waitForSyncSessionsInitiationPromise.then(() => {
                            return this.mdmBootstrapSessionUtilities.monitorNetworkProfilesConfigAsync(progressCallbackAsync);
                        }).then((actionResult) => {
                            this.networkProfilesProvisioningSucceeded = this.sessionUtilities.subcategorySucceeded(actionResult.actionResultState);

                            return actionResult;
                        });
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "DeviceSetup.AppsSubcategory",
                    this.resourceStrings["BootstrapPageAppsSubcategoryTitle"],
                    true,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE;
                    },
                    (progressCallbackAsync) => {
                        // Ensure the background sync sessions are initiated first.
                        this.syncSyncSessionsShouldStart = true;

                        return this.waitForSyncSessionsInitiationPromise.then(() => {
                            return this.mdmBootstrapSessionUtilities.monitorAppsInstallAsync(progressCallbackAsync);
                        }).then((actionResult) => {
                            this.appsProvisioningSucceeded = this.sessionUtilities.subcategorySucceeded(actionResult.actionResultState);

                            return actionResult;
                        });
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "DeviceSetup.RebootCoalescing",
                    "DeviceSetup.RebootCoalescing", // Title is mandatory, even for silent subcategories.
                    false,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_SILENT;
                    },
                    (progressCallbackAsync) => {
                        return this.coalesceRebootsAsync();
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "DeviceSetup.SendResultsToMdmServer",
                    "DeviceSetup.SendResultsToMdmServer", // Title is mandatory, even for silent subcategories.
                    false,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_SILENT;
                    },
                    (progressCallbackAsync) => {
                        return this.sendResultsToMdmServerAsync();
                    }
                ),

                // This MUST be last in the list of actions.
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "DeviceSetup.SaveWhiteGloveSuccessResult",
                    "DeviceSetup.SaveWhiteGloveSuccessResult", // Title is mandatory, even for silent subcategories.
                    false,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_SILENT;
                    },
                    (progressCallbackAsync) => {
                        return this.saveWhiteGloveSuccessResultAsync();
                    }
                )];
        }

        getClickHandler() {
            return (handlerParameters) => {
                switch (handlerParameters.clickedItemId) {
                    case this.sessionUtilities.CLICKABLE_ITEM_ID_CONTINUE_ANYWAY_BUTTON:
                        return new WinJS.Promise(
                            // Promise initialization
                            (completeDispatch, errorDispatch, progressDispatch) => {
                                if (!this.securityPoliciesProvisioningSucceeded ||
                                    !this.certificatesProvisioningSucceeded ||
                                    !this.networkProfilesProvisioningSucceeded ||
                                    !this.appsProvisioningSucceeded) {
                                    try {
                                        this.commercialDiagnosticsUtilities.logInfoEvent(
                                            "CommercialOOBE_ESPDeviceSetup_MDMPollingTasks_Started",
                                            "One of the provisioning subcategories failed, so kicking off MDM polling tasks.");
                                        this.sessionUtilities.enrollmentApis.startPollingTask();
                                    } catch (e) {
                                        this.commercialDiagnosticsUtilities.logExceptionEvent(
                                            "CommercialOOBE_ESPDeviceSetup_MDMPollingTasks_Failed",
                                            "Error starting the MDM polling tasks.",
                                            e);
                                    }
                                }

                                // True means that this handler succeeded.
                                completeDispatch(true);
                            },

                            // Cancellation event handler
                            () => {
                            });

                    case this.sessionUtilities.CLICKABLE_ITEM_ID_TRY_AGAIN_BUTTON:
                        return new WinJS.Promise(
                            // Promise initialization
                            (completeDispatch, errorDispatch, progressDispatch) => {
                                // Restart the sync sessions on a retry.  It's OK to start another set of sessions even
                                // if one set is already running, since the underlying session-running API serializes sessions
                                // across all sets. Starting another set on retry also ensures that the retry's sessions
                                // time out on the full timeout period.
                                this.syncSyncSessionsShouldStart = false;
                                this.waitForSyncSessionsInitiationPromise = this.waitForSyncSessionsInitiationAsync();

                                // True means that this handler succeeded.
                                completeDispatch(true);
                            },

                            // Cancellation event handler
                            () => {
                            });

                    default:
                       this.commercialDiagnosticsUtilities.logInfoEvent(
                           "CommercialOOBE_ESPDeviceSetup_ClickHandlerItem_Unhandled",
                           "Unhandled click handler item");
                }

                // True means that this handler succeeded.
                return WinJS.Promise.as(true);
            };
        }
    }

    return deviceSetupCategoryViewModel;
});
