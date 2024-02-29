//
// Copyright (C) Microsoft. All rights reserved.
//

"use strict";

define([
    'autopilot/bootstrapStatusSubcategoryViewModel',
    'autopilot/mdmBootstrapSessionUtilities',
    'autopilot/commercialDiagnosticsUtilities'], (
    bootstrapStatusSubcategoryViewModel,
    mdmBootstrapSessionUtilities,
    commercialDiagnosticsUtilities) => {

    class accountSetupCategoryViewModel {
        constructor(resourceStrings, sessionUtilities) {
            // Constants
            this.DEVICE_REGISTRATION_INTERVAL_WAIT_TIME_IN_MILLISECONDS = 240000;

            // Private member variables
            this.resourceStrings = resourceStrings;
            this.sessionUtilities = sessionUtilities;
            this.mdmBootstrapSessionUtilities = new mdmBootstrapSessionUtilities(
                resourceStrings,
                this.sessionUtilities.runningInOobe(),
                sessionUtilities);
            this.commercialDiagnosticsUtilities = new commercialDiagnosticsUtilities();
            this.aadRegistered = false;
            this.aadjEventName = "aadjcompleted";

            // The background sync sessions need to be initiated only once for all the MDM-monitored
            // subcategories in this category.  Creating a single promise will ensure that singleton.
            // Syncs are reinitiated after every reboot, and so sync lifetime should match
            // with this category's lifetime.
            this.syncSyncSessionsShouldStart = false;
            this.waitForSyncSessionsInitiationPromise = this.waitForSyncSessionsInitiationAsync();
        }

        waitForSyncSessionsInitiationAsync() {
            if (this.syncSyncSessionsShouldStart) {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_ESPAccountSetup_SyncSessionWaitLoop_StartingSyncSessions",
                    "BootstrapStatus: Start background sync sessions for Account Setup.");

                // This is a fire and forget operation because sendResultsToMdmServerAsync sets the IsSyncDone node to actually break out of this wait
                this.mdmBootstrapSessionUtilities.initiateSyncSessionsAsync(ModernDeployment.Autopilot.Core.SyncSessionExitCondition.accountSetupComplete);

                return WinJS.Promise.as(true);
            } else {
                // Keep polling for the signal to initiate background sync sessions.
                return WinJS.Promise.timeout(this.defaultWaitToInitiateSyncSessionsInMilliseconds).then(() => {
                    return this.waitForSyncSessionsInitiationAsync();
                });
            }
        }

        async waitForAadRegistrationAsync() {
            const aadRegistrationWaitTimeInMilliseconds = await this.sessionUtilities.hybridUtilities.getMaxAadRegistrationWaitDurationAsync();

            this.commercialDiagnosticsUtilities.logInfoEvent(
                "CommercialOOBE_ESPAccountSetup_AadRegistration_Wait",
                `BootstrapStatus: AAD registration timeout set to ${aadRegistrationWaitTimeInMilliseconds}`);

            // Create a 4 minute periodic timer for kicking off the scheduled task to register the device with AAD.
            this.deviceRegistrationTaskScheduler = setInterval(
                () => {
                    this.sessionUtilities.enrollmentApis.forceRunDeviceRegistrationScheduledTaskAsync().then(
                        () => {
                            this.commercialDiagnosticsUtilities.logInfoEvent(
                                "CommercialOOBE_ESPAccountSetup_StartAadRegistration_Success",
                                "BootstrapStatus: Starting AAD device registration task succeeded");
                        },

                        (e) => {
                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "CommercialOOBE_ESPAccountSetup_StartAadRegistration_Failed",
                                "BootstrapStatus: Starting AAD device registration task failed (non-fatal)",
                                e);
                        });
                },
                this.DEVICE_REGISTRATION_INTERVAL_WAIT_TIME_IN_MILLISECONDS);

            let aadRegistrationWaitPromise = new WinJS.Promise(
                // Promise initialization handler
                (completeDispatch, errorDispatch, progressDispatch) => {
                    // Create event handler.
                    this.aadRegistrationListener = (hresult) => {
                        this.commercialDiagnosticsUtilities.logHresultEvent(
                            "CommercialOOBE_ESPAccountSetup_AadRegistrationTask_Complete",
                            `BootstrapStatus: AAD device registration task completed with hresult ${hresult.target}`,
                            hresult.target);

                        this.aadRegistered = (0 === hresult.target);
                        this.aadRegistrationHresult = hresult;
                        completeDispatch(true);
                    };

                    // Register event handler.
                    this.sessionUtilities.autopilotSubscriptionManager.addEventListener(this.aadjEventName, this.aadRegistrationListener.bind(this));
                },

                // Promise cancellation event handler
                () => {
                });

            // Set a max timeout for device registration.  The reason for this timeout is AD connect happens in the
            // background approximately every 30 minutes, and once this occurs, the device registration task (forced 
            // to run every five minutes by deviceRegistrationTaskScheduler) will finally succeed, at which point
            // the device is AAD-registered.
            let aadRegistrationTimeoutPromise = WinJS.Promise.timeout(aadRegistrationWaitTimeInMilliseconds).then(() => {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_ESPAccountSetup_AadRegistration_TimedOut",
                    "BootstrapStatus: AAD registration timed out");
            });

            let aadRegistrationPromises = [
                aadRegistrationTimeoutPromise,
                aadRegistrationWaitPromise
            ];

            // Wait for either the TPM attested state or the timeout.
            return WinJS.Promise.any(aadRegistrationPromises).then(() => {
                if (this.aadRegistrationListener !== null) {
                    this.sessionUtilities.autopilotSubscriptionManager.removeEventListener(this.aadjEventName, this.aadRegistrationListener.bind(this));
                }

                aadRegistrationTimeoutPromise.cancel();
                aadRegistrationTimeoutPromise = null;

                // Device is now AAD-registered or timed out trying, and so stop trying to run the background task
                // to AADJ register the device.
                clearInterval(this.deviceRegistrationTaskScheduler);
                this.deviceRegistrationTaskScheduler = null;

                if (!this.aadRegistered) {
                    if ((null === this.aadRegistrationHresult) || (undefined === this.aadRegistrationHresult)) {
                        // No registration failure, but still not registered.  Default to displaying timeout error ERROR_TIMEOUT.
                        this.aadRegistrationErrorString = this.commercialDiagnosticsUtilities.formatNumberAsHexString(this.sessionUtilities.HRESULT_TIMEOUT, 8);
                    } else {
                        this.aadRegistrationErrorString = this.commercialDiagnosticsUtilities.formatNumberAsHexString(this.aadRegistrationHresult.target, 8);
                    }
                }

                return;
            }).then(() => {
                return this.sessionUtilities.createActionResult(
                    this.aadRegistered ? this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED : this.sessionUtilities.SUBCATEGORY_STATE_FAILED,
                    this.aadRegistrationErrorString);
            });
        }

        sendResultsToMdmServerAsync() {
            // Best effort
            try {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_ESPAccountSetup_SendResultsToMdmServer_Started",
                    "BootstrapStatus: Account setup category sending success results to MDM server.");

                this.sessionUtilities.enrollmentApis.updateServerWithResult(true, this.sessionUtilities.runningInOobe());
            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "CommercialOOBE_ESPAccountSetup_SendResultsToMdmServer_Failed",
                    "Failed to send results to MDM server, likely due to setting an already-failed provisioning status.",
                    e);
            }

            this.commercialDiagnosticsUtilities.logInfoEvent(
                "CommercialOOBE_ESPAccountSetup_SendResultsToMdmServer_Succeeded",
                "BootstrapStatus: Account setup category sent success results to MDM server.");

            return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED,
                null));
        }

        prepareMultifactorAuthAsync() {
            this.commercialDiagnosticsUtilities.logInfoEvent(
                "CommercialOOBE_ESPAccountSetup_MultifactorAuth_Preparation",
                "BootstrapStatus: Requesting AAD user token");

            return CloudExperienceHostAPI.UtilStaticsCore.requestAADUserTokenAsync().then((result) => {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_ESPAccountSetup_AadTokenRequest_Success",
                    "BootstrapStatus: AAD user token successfully requested");

                return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                    this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED,
                    null));
            },
            (e) => {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "CommercialOOBE_ESPAccountSetup_AadTokenRequest_Failed",
                    "BootstrapStatus: AAD user token request failed",
                    e);

                return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                    this.sessionUtilities.SUBCATEGORY_STATE_FAILED,
                    null));
            });
        }

        // Category interface methods

        getId() {
            return "AccountSetupCategory";
        }

        getTitle() {
            return this.resourceStrings["BootstrapPageAccountSetupCategoryTitle"];
        }

        getIconClass() {
            return "icon-users";
        }

        getDisposition() {
            return (!this.sessionUtilities.runningInOobe() ? this.sessionUtilities.CATEGORY_DISPOSITION_VISIBLE : this.sessionUtilities.CATEGORY_DISPOSITION_IGNORED);
        }

        runsInOobe() {
            return false;
        }

        getInitializationPromise() {
            return WinJS.Promise.as(true);
        }

        getSubcategories() {
            return [
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "AccountSetup.WaitingForAadRegistrationSubcategory",
                    this.resourceStrings["BootstrapPageAccountSetupWaitingForAadRegistrationSubcategoryTitle"],
                    false,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE;
                    },
                    (progressCallbackAsync) => {
                        return this.waitForAadRegistrationAsync();
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "AccountSetup.PrepareMultifactorAuth",
                    "AccountSetup.PrepareMultifactorAuth",
                    false,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_SILENT;
                    },
                    (progressCallbackAsync) => {
                        return this.prepareMultifactorAuthAsync();
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "AccountSetup.SecurityPoliciesSubcategory",
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
                            this.certificatesProvisioningSucceeded = this.sessionUtilities.subcategorySucceeded(actionResult.actionResultState);

                            return actionResult;
                        });
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "AccountSetup.CertificatesSubcategory",
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
                    "AccountSetup.NetworkConnectionsSubcategory",
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
                            this.certificatesProvisioningSucceeded = this.sessionUtilities.subcategorySucceeded(actionResult.actionResultState);

                            return actionResult;
                        });
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "AccountSetup.AppsSubcategory",
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
                            this.certificatesProvisioningSucceeded = this.sessionUtilities.subcategorySucceeded(actionResult.actionResultState);

                            return actionResult;
                        });
                    }
                ),
                new bootstrapStatusSubcategoryViewModel(
                    this.resourceStrings,
                    this.sessionUtilities,
                    "AccountSetup.SendResultsToMdmServer",
                    "AccountSetup.SendResultsToMdmServer", // Title is mandatory, even for silent subcategories.
                    false,
                    () => {
                        return this.sessionUtilities.SUBCATEGORY_DISPOSITION_SILENT;
                    },
                    (progressCallbackAsync) => {
                        return this.sendResultsToMdmServerAsync();
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
                                            "CommercialOOBE_ESPAccountSetup_MdmPolling_Started",
                                            "One of the provisioning subcategories failed, so kicking off MDM polling tasks.");
                                        this.sessionUtilities.enrollmentApis.startPollingTask();
                                    } catch (e) {
                                        this.commercialDiagnosticsUtilities.logExceptionEvent(
                                            "CommercialOOBE_ESPAccountSetup_MdmPolling_Failed",
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
                            "CommercialOOBE_ESPAccountSetup_ClickHandlerItem_Unhandled",
                            "Unhandled click handler item");
                }

                // True means that this handler succeeded.
                return WinJS.Promise.as(true);
            };
        }
    }

    return accountSetupCategoryViewModel;
});
