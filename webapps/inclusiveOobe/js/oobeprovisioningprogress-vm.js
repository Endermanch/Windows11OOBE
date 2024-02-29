//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core'], (ko, bridge, constants, core) => {
    class provisioningProgressViewModel {
        constructor(resourceStrings, isOOBE, runProvisioning, restoreMDMTasks) {
            const NUM_SECURITY_ANSWERS = 3;

            this.resourceStrings = resourceStrings;
            this.enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
            this.autoPilotSubscriptionManager = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotWnfSubscriptionManager();
            this.tpmNotificationManager = new ModernDeployment.Autopilot.Core.TpmNotification();
            this.autoPilotManager = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();
            this.espTrackingUtility = new EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentStatusTrackingUtil();
            this.deviceManagementUtilities = new ModernDeployment.Autopilot.Core.DeviceManagementUtilities();

            this.tpmAttestationTimeout = null;
            this.aadjTimeout = null;
            this.deviceRegistrationTaskScheduler = null;
            this.isOOBE = isOOBE;
            this.runProvisioning = runProvisioning;
            this.restoreMDMTasks = restoreMDMTasks;
            this.policyProvidersInstalled = false;
            this.EnrollmentFinishedTitle = this.resourceStrings["BootstrapPageTitle"];
            this.EnrollmentFinishedLeadText = this.resourceStrings["LegacyBootstrapPageRebootWarning"];
            this.DevicePreparationText = this.resourceStrings["BootstrapPageDevicePrepTitle"];
            this.DevicePreparationStatus = ko.observable(this.resourceStrings["BootstrapPageWorking"]);
            this.EnrollmentProgressDeviceSetupText = this.resourceStrings["BootstrapPageDeviceSetupTitle"];
            this.EnrollmentProgressDeviceSetupStatus = ko.observable(this.resourceStrings["BootstrapPageWaitingForPrevious"]);
            this.EnrollmentProgressAccountSetupText = this.resourceStrings["BootstrapPageAccountSetupTitle"];
            this.EnrollmentProgressAccountSetupStatus = ko.observable(this.resourceStrings["BootstrapPageWaitingForPrevious"]);
            this.ErrorText = ko.observable(this.resourceStrings["BootstrapPageDefualtError"]);
            this.DevicePreparationErrorCodeText = ko.observable(this.resourceStrings["DevicePreparationErrorCode"]);

            // Category visibility
            this.DevicePreparationDetails = ko.observable(false);
            this.DeviceSetupDetails = ko.observable(false);
            this.AccountSetupDetails = ko.observable(false);

            // Device preparation details
            this.DevicePreparationStatusError = ko.observable("");
            this.DevicePreparationStatusOpacity = ko.observable("");
            this.IsDevicePreparationStatusBadgeVisible = ko.observable(false);
            this.DevicePreparationStatusBadgeFill = ko.observable("success");
            this.DevicePreparationStatusBadgeIcon = ko.observable("icon-completed");
            this.DevicePreparationShowDetailsText = ko.observable(this.resourceStrings["BootstrapPageShowDetailButton"]);
            this.IsDevicePreparationDetailsVisible = ko.observable(true);
            this.DevicePreparationProgressVisibility = ko.observable("visible");
            this.DevicePreparationTPM = ko.observable(this.resourceStrings["BootstrapPageTPM"]);
            this.DevicePreparationJoiningNetwork = ko.observable(this.resourceStrings["BootstrapPageAADJ"]);
            this.DevicePreparationRegisteringForMDM = ko.observable(this.resourceStrings["BootstrapPageMDM"]);
            this.DevicePreparationPreparingForMDM = ko.observable(this.resourceStrings["BootstrapPagePrepareMDM"]);

            // Device setup details
            this.DeviceSetupStatusError = ko.observable("");
            this.DeviceSetupStatusOpacity = ko.observable("");
            this.IsDeviceSetupStatusBadgeVisible = ko.observable(false);
            this.DeviceSetupStatusBadgeFill = ko.observable("success");
            this.DeviceSetupStatusBadgeIcon = ko.observable("icon-completed");
            this.DeviceSetupShowDetailsText = ko.observable(this.resourceStrings["BootstrapPageShowDetailButton"]);
            this.IsDeviceSetupDetailsVisible = ko.observable(false);
            this.DeviceSetupProgressVisibility = ko.observable("visible");
            this.EnrollmentProgressDeviceSetupPolicies = ko.observable(this.resourceStrings["BootstrapPageSecurityPolicies"]);
            this.EnrollmentProgressDeviceSetupCertificates = ko.observable(this.resourceStrings["BootstrapPageCertificates"]);
            this.EnrollmentProgressDeviceSetupNetwork = ko.observable(this.resourceStrings["BootstrapPageNetwork"]);
            this.EnrollmentProgressDeviceSetupApplication = ko.observable(this.resourceStrings["BootstrapPageApps"]);
            this.EnrollmentProgressDeviceSetupSubscription = ko.observable(this.resourceStrings["BootstrapPageSubscription"]);

            // Account setup details
            this.AccountSetupStatusError = ko.observable("");
            this.AccountSetupStatusOpacity = ko.observable("");
            this.IsAccountSetupStatusBadgeVisible = ko.observable(false);
            this.AccountSetupStatusBadgeFill = ko.observable("success");
            this.AccountSetupStatusBadgeIcon = ko.observable("icon-completed");
            this.AccountSetupShowDetailsText = ko.observable(this.resourceStrings["BootstrapPageShowDetailButton"]);
            this.IsAccountSetupDetailsVisible = ko.observable(false);
            this.AccountSetupProgressVisibility = ko.observable("visible");
            this.EnrollmentProgressAccountAuthentication = ko.observable(this.resourceStrings["BootstrapPageAADJ"]);
            this.EnrollmentProgressAccountSetupPolicies = ko.observable(this.resourceStrings["BootstrapPageSecurityPolicies"]);
            this.EnrollmentProgressAccountSetupCertificates = ko.observable(this.resourceStrings["BootstrapPageCertificates"]);
            this.EnrollmentProgressAccountSetupNetwork = ko.observable(this.resourceStrings["BootstrapPageNetwork"]);
            this.EnrollmentProgressAccountSetupApplication = ko.observable(this.resourceStrings["BootstrapPageApps"]);

            this.EnrollmentProgressNotifyOfNotificationText = ko.observable(this.resourceStrings[""]);
            this.infoMessage = ko.observable(this.resourceStrings[""]);

            this.isFinishedButtonVisible = ko.observable(false);
            this.isTryAgainButtonVisible = ko.observable(false);
            this.isSignOutButtonVisible = ko.observable(false);
            this.isResetDeviceButtonVisible = ko.observable(false);
            this.isResetButtonDisabled = ko.observable(false);
            this.isSignOutButtonDisabled = ko.observable(false);
            this.hyperlinkVisibility = ko.observable(0);
            this.isCollectLogsButtonVisible = ko.observable(false);
            this.isContinueAnywayButtonVisible = ko.observable(false);
            this.policyCurrentProgress = 0;
            this.policyExpectedEndValue = 0;
            this.profilesCurrentProgress = 0;
            this.profilesExpectedEndValue = 0;
            this.appsCurrentProgress = 0;
            this.appsExpectedEndValue = 0;
            this.appsBlockedByReboot = false;
            this.certificatesCurrentProgress = 0;
            this.certificatesExpectedEndValue = 0;
            this.progressIsDone = false;

            // Provisioning progress enumerations
            this.PROV_RUNNING = 0;
            this.PROV_SUCCEEDED = 1;
            this.PROV_FAILED = 2;

            // Hyperlink Visibility Enumerations
            this.NO_HYPERLINK = 0;
            this.SHOW_CONTINUE_ANYWAY = 1;
            this.SHOW_COLLECT_LOGS = 2;
            this.SHOW_SIGN_OUT = 4;

            this.stopPollingResults = false;
            this.minProgressTextTime = 5000;   // in ms
            this.pollingInterval = 500; // in ms

            // MDM progress mode enumerations
            this.TARGET_DEVICE = 0;
            this.TARGET_USER = 1;
            this.TARGET_DEVICE_AND_USER = 2;

            // Policy provider installation result enumerations
            this.INSTALL_SUCCESS = 1;
            this.INSTALL_TIMEOUT = 2;
            this.INSTALL_FAILURE = 3;

            // Sharable Data Value - must be kept in sync with value in:
            // autopilotwhiteglovelanding-vm.js
            // autopilotwhitegloveresult-vm.js
            this.whiteGloveStartTimeValueName = "AutopilotWhiteGloveStartTime";
            this.whiteGloveEndTimeValueName = "AutopilotWhiteGloveEndTime";
            this.whiteGloveSuccessValueName = "AutopilotWhiteGloveSuccess";
            this.whiteGloveSucceeded = "Success";
            this.whiteGloveError = this.resourceStrings.WhiteGloveTimeOutError;

            this.espDevicePrepCompleted = "EspDevicePrepSuccess";

            this.tpmAttestationEventName = "tpmevent";
            this.aadjEventName = "aadjcompleted";

            this.eventTimeout = 5000;

            this.targetContext = this.TARGET_DEVICE_AND_USER;
            this.blockingValue = 0;
            this.showCollectLogs = 0;
            let flexStartHyperlinksSets = {};

            this.flexEndButtons = [
                {
                    buttonText: this.resourceStrings["BootstrapPageContinue"],
                    buttonType: "button",
                    isPrimaryButton: true,
                    autoFocus: true,
                    isVisible: this.isFinishedButtonVisible,
                    buttonClickHandler: (() => {
                        this.finishedButtonClick();
                    }),
                },
                {
                    buttonText: this.resourceStrings["BootstrapPageResetDevice"],
                    buttonType: "button",
                    isPrimaryButton: false,
                    autoFocus: false,
                    isVisible: this.isResetDeviceButtonVisible,
                    disableControl: ko.pureComputed(() => {
                        return this.isResetButtonDisabled();
                    }),
                    buttonClickHandler: (() => {
                        this.resetDeviceButtonClick();
                    }),
                },
                {
                    buttonText: this.resourceStrings["BootstrapPageSignOut"],
                    buttonType: "button",
                    isPrimaryButton: true,
                    autoFocus: true,
                    isVisible: this.isSignOutButtonVisible,
                    disableControl: ko.pureComputed(() => {
                        return this.isSignOutButtonDisabled();
                    }),
                    buttonClickHandler: () => {
                        this.signOutButtonClick();
                    }
                },
                {
                    buttonText: this.resourceStrings["BootstrapPageTryAgain"],
                    buttonType: "button",
                    isPrimaryButton: true,
                    autoFocus: true,
                    isVisible: this.isTryAgainButtonVisible,
                    buttonClickHandler: (() => {
                        this.tryAgainButtonClick();
                    }),
                }
            ];

            flexStartHyperlinksSets[this.NO_HYPERLINK] = [];
            flexStartHyperlinksSets[this.SHOW_CONTINUE_ANYWAY] = [
                {
                    hyperlinkText: this.resourceStrings["BootstrapPageContinue"],
                    handler: (() => {
                        this.continueAnywayButtonClick();
                    }),
                }
            ];

            flexStartHyperlinksSets[this.SHOW_COLLECT_LOGS] = [
                {
                    hyperlinkText: this.resourceStrings["BootstrapPageCollectLogs"],
                    handler: (() => {
                        this.collectLogsButtonClick();
                    }),
                }
            ];

            flexStartHyperlinksSets[this.SHOW_SIGN_OUT] = [
                {
                    hyperlinkText: this.resourceStrings["BootstrapPageSignOut"],
                    handler: (() => {
                        this.signOutButtonClick();
                    }),
                }
            ];

            flexStartHyperlinksSets[this.SHOW_CONTINUE_ANYWAY | this.SHOW_COLLECT_LOGS] = [
                {
                    hyperlinkText: this.resourceStrings["BootstrapPageContinue"],
                    handler: (() => {
                        this.continueAnywayButtonClick();
                    }),
                },
                {
                    hyperlinkText: this.resourceStrings["BootstrapPageCollectLogs"],
                    handler: (() => {
                        this.collectLogsButtonClick();
                    }),
                }
            ];

            flexStartHyperlinksSets[this.SHOW_SIGN_OUT | this.SHOW_COLLECT_LOGS] = [
                {
                    hyperlinkText: this.resourceStrings["BootstrapPageSignOut"],
                    handler: (() => {
                        this.signOutButtonClick();
                    }),
                },
                {
                    hyperlinkText: this.resourceStrings["BootstrapPageCollectLogs"],
                    handler: (() => {
                        this.collectLogsButtonClick();
                    }),
                }
            ];

            this.flexStartHyperLinks = ko.pureComputed(() => {
                return flexStartHyperlinksSets[this.hyperlinkVisibility()];
            });

            bridge.invoke("CloudExperienceHost.AutoPilot.EnrollmentStatusPage.setStatusPageReboot");

            this.subcategoryTpmTitleId = "BootstrapPageTPM";
            this.subcategoryJoinNetworksTitleId = "BootstrapPageAADJ";
            this.subcategoryRegisterMdmTitleId = "BootstrapPageMDM";
            this.subcategoryPrepareMdmTitleId = "BootstrapPagePrepareMDM";
            this.bootstrapStatusIdWaitingForPrevious = "BootstrapPageWaitingForPrevious";
            this.bootstrapStatusIdWorking = "BootstrapPageWorking";
            this.bootstrapStatusIdCompleted = "BootstrapPageComplete";
            this.bootstrapStatusIdFailed = "BootstrapPageFailed";
            this.bootstrapStatusIdPreviousFailed = "BootstrapPagePrevStepFailed";
            this.defaultErrorMessageId = "BootstrapPageDefualtError";

            // The ordering of the following subcategories is required for the code to work.
            this.devicePreparationSubcategories = [];
            this.devicePreparationSubcategories.push({ textControl: this.DevicePreparationTPM, titleId: this.subcategoryTpmTitleId });
            this.devicePreparationSubcategories.push({ textControl: this.DevicePreparationJoiningNetwork, titleId: this.subcategoryJoinNetworksTitleId });
            this.devicePreparationSubcategories.push({ textControl: this.DevicePreparationRegisteringForMDM, titleId: this.subcategoryRegisterMdmTitleId });
            this.devicePreparationSubcategories.push({ textControl: this.DevicePreparationPreparingForMDM, titleId: this.subcategoryPrepareMdmTitleId });

            this.aadAuthUsingDeviceTicket = false;

            if (this.isOOBE) {
                try {
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.espDevicePrepCompleted).then(function (devicePrepCompleted) {
                        if (devicePrepCompleted === true) {
                            // Device preparation already completed, no need to run it again.
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_Skipping_DevicePrep_Phase");
                            this.setDevicePrepartionComplete();
                            this.checkMDMTrackingInfo();
                        } else {
                            // This is being run in OOBE, so run the steps in the device preparation category.
                            this.autoPilotManager.getOobeSettingsOverrideAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotOobeSetting.aadAuthUsingDeviceTicket).then(function (isUsingDeviceTicket) {
                                // Initialize the first category's subcategories' statuses.
                                this.displayProgress(this.DevicePreparationStatus, this.bootstrapStatusIdWorking);

                                for (var i = 0; i < this.devicePreparationSubcategories.length; i++) {
                                    var subcategory = this.devicePreparationSubcategories[i];

                                    this.displayProgress(subcategory.textControl, subcategory.titleId, this.bootstrapStatusIdWaitingForPrevious);
                                }

                                this.displayProgress(this.DevicePreparationTPM, this.subcategoryTpmTitleId, this.bootstrapStatusIdWorking);

                                bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveStartTimeValueName).then(function (result) {
                                    if (isUsingDeviceTicket || (null != result)) {
                                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OOBEProvisioningProgress AutopilotWhiteGloveFlow");
                                        this.setupTPMAttestationTimeout();
                                    } else {
                                        this.displayProgress(this.DevicePreparationTPM, this.subcategoryTpmTitleId, this.bootstrapStatusIdCompleted);
                                        this.launchProvisioning();
                                    }
                                }.bind(this), function (e) {
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Unable to find AutopilotWhiteGloveStartTime value");
                                    if (isUsingDeviceTicket) {
                                        this.setupTPMAttestationTimeout();
                                    } else {
                                        this.displayProgress(this.DevicePreparationTPM, this.subcategoryTpmTitleId, this.bootstrapStatusIdCompleted);
                                        this.launchProvisioning();
                                    }
                                }.bind(this));
                            }.bind(this));
                        }
                    }.bind(this));
                } catch (error) {
                    this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_getOobeSettingsOverrideAsync: Error occured while retrieving OOBE settings", error);
                    throw error;
                }
            } else {
                // This is being run post-OOBE, so the steps in the device preparation category must have completed successfully.
                this.setDevicePrepartionComplete();

                // Wait for signal that AADJ has completed, then track MDM user policies.
                bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                    let host = result.host.toLowerCase();
                    if (host === "mosetmdmconnecttoworkprovisioningprogress") {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Skipping the wait for AAD registration since this is workplace join.");
                        this.displayProgress(this.EnrollmentProgressAccountAuthentication, "BootstrapPageAADJ", "BootstrapPageComplete");
                        this.checkMDMTrackingInfo();
                    } else {
                        this.waitForAadjToComplete();
                    }
                }.bind(this), function (e) {
                    this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_GetContextHandler_Failed", e);
                }.bind(this));
            }
        }

        setDevicePrepartionComplete() {
            this.displayProgress(this.DevicePreparationTPM, this.subcategoryTpmTitleId, this.bootstrapStatusIdCompleted);
            this.displayProgress(this.DevicePreparationJoiningNetwork, this.subcategoryJoinNetworksTitleId, this.bootstrapStatusIdCompleted);
            this.displayProgress(this.DevicePreparationRegisteringForMDM, this.subcategoryRegisterMdmTitleId, this.bootstrapStatusIdCompleted);
            this.displayProgress(this.DevicePreparationPreparingForMDM, this.subcategoryPrepareMdmTitleId, this.bootstrapStatusIdCompleted);
            this.setCategoryStatusVisuals(
                true,
                this.DevicePreparationStatusBadgeFill,
                this.DevicePreparationStatusBadgeIcon,
                this.DevicePreparationStatusError,
                this.DevicePreparationStatusOpacity,
                this.DevicePreparationStatus,
                this.DevicePreparationProgressVisibility,
                this.IsDevicePreparationStatusBadgeVisible);
        }

        setupTPMAttestationTimeout() {
            this.aadAuthUsingDeviceTicket = true;

            // Set a 7 minute timeout for TPM attestation
            this.tpmAttestationTimeout = WinJS.Promise.timeout(420000).then(function () {
                try {
                    this.tpmNotificationManager.removeEventListener(this.tpmAttestationEventName, this.onTPMAttestationComplete.bind(this));
                } catch (e) {
                    this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_setupTPMAttestationTimeout_removeTpmEvent_Failed", e);
                }

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "TPM attestation timed out");

                let errorMessage = "<status>: 0x<hresult>"
                    .replace("<status>", resourceStrings[this.bootstrapStatusIdFailed])
                    .replace("<hresult>", this.formatNumberAsHexString(0x800705B4, 8));

                this.whiteGloveError = this.resourceStrings.WhiteGloveTpmTimeoutError;

                this.setDevicePreparationStatus(false, this.DevicePreparationTPM, errorMessage);
            }.bind(this));

            try {
                this.tpmNotificationManager.addEventListener(this.tpmAttestationEventName, this.onTPMAttestationComplete.bind(this));
            } catch (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_setupTPMAttestationTimeout_addTpmEvent_Failed", e);
            }
        }

        toggleDevicePreparationDetails() {
            if (this.DevicePreparationShowDetailsText() == this.resourceStrings["BootstrapPageShowDetailButton"]) {
                this.DevicePreparationShowDetailsText(this.resourceStrings["BootstrapPageHideDetailsButton"]);
            } else {
                this.DevicePreparationShowDetailsText(this.resourceStrings["BootstrapPageShowDetailButton"]);
            }

            this.DevicePreparationDetails(!this.DevicePreparationDetails());
        }

        toggleDeviceSetupDetails() {
            if (this.DeviceSetupShowDetailsText() == this.resourceStrings["BootstrapPageShowDetailButton"]) {
                this.DeviceSetupShowDetailsText(this.resourceStrings["BootstrapPageHideDetailsButton"]);
            } else {
                this.DeviceSetupShowDetailsText(this.resourceStrings["BootstrapPageShowDetailButton"]);
            }

            this.DeviceSetupDetails(!this.DeviceSetupDetails());
        }

        toggleAccountSetupDetails() {
            if (this.AccountSetupShowDetailsText() == this.resourceStrings["BootstrapPageShowDetailButton"]) {
                this.AccountSetupShowDetailsText(this.resourceStrings["BootstrapPageHideDetailsButton"]);
            } else {
                this.AccountSetupShowDetailsText(this.resourceStrings["BootstrapPageShowDetailButton"]);
            }

            this.AccountSetupDetails(!this.AccountSetupDetails());
        }

        finishedButtonClick() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_FinishedButton_Chosen");
            if (!this.progressIsDone) {
                try {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_finishedButtonClick: One of the provisioning subcategories failed, so kicking off MDM polling tasks.");
                    this.enterpriseManagementWorker.startPollingTask();
                } catch (error) {
                    this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_finishedButtonClick: Error starting the MDM polling tasks", error);
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action3);
                }
            }
            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action3);
        }

        tryAgainButtonClick() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_TryAgain_Chosen");
            try {
                this.enterpriseManagementWorker.resetProgressTimeout(this.targetContext);
                this.isTryAgainButtonVisible(false);
                this.isResetDeviceButtonVisible(false);
                this.isSignOutButtonVisible(false);
                this.hyperlinkVisibility(0);
                this.EnrollmentProgressNotifyOfNotificationText("");
                this.infoMessage("");
                this.trackMDMSyncProgress();
            } catch (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_ResetProgressTimeout_Failed", e);
            }
        }

        resetDeviceButtonClick() {
            // Disable button so it can't be pressed repeatedly
            this.isResetButtonDisabled(true);
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OobeProvisioningProgressPage_resetDeviceButtonClick", "Reset device button chosen.");
            var pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
            pluginManager.initiateSystemResetAsync().then(function (results) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OobeProvisioningProgressPage_resetDeviceButtonClick_initiateSystemReset_Succeeded", "Successfully initiated system reset.");
            }.bind(this), function (e) {
                // error happened, reenable the button
                this.isResetButtonDisabled(false);
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OobeProvisioningProgressPage_resetDeviceButtonClick_initiateSystemReset_ErrorInfo_Failed", JSON.stringify({ error: e }));
            }.bind(this));
        }

        collectLogsButtonClick() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_CollectLogs_Chosen");
            bridge.invoke("CloudExperienceHost.showFolderPicker").then(function (folderPath) {
                this.enterpriseManagementWorker.collectLogs(folderPath).then(function () {
                }, function (e) {
                    this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_CollectLogs_Failed", e);
                });
            }.bind(this), function (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_FolderPicker_Failed", e);
            }.bind(this));
        }

        continueAnywayButtonClick() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ContinueAnyway_Chosen");
            try {
                this.enterpriseManagementWorker.setWasContinuedAnyway(this.isOOBE);
            } catch (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_ContinueAnywaySet_Failed", e);
            }
            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action3);
        }

        // Sign out is required for scenarios where user is expected to be admin, but due to a race condition
        // at initial login adding user to the administrators group, the user must log out and log back in for
        // admin group membership to take affect.
        signOutButtonClick() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_SignOutButton_Clicked");

            // Disable button so it can't be pressed repeatedly
            this.isSignOutButtonDisabled(true);

            try {
                if (!this.progressIsDone) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_SettingContinueAnywayOnSignOut");
                    this.enterpriseManagementWorker.setWasContinuedAnyway(this.isOOBE);
                }
            } catch (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_ContinueAnywaySet_Failed", e);
            }

            const windowsSessionHelper = new ModernDeployment.Autopilot.Core.AutopilotWindowsSessionHelpers();
            windowsSessionHelper.logoffInteractiveUserAsync().then(() => {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action3);
            }, (e) => {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_SignOutButton_Failed", e);

                // If the sign out button fails for any reason, exit the ESP so the user isn't blocked/stuck.
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action3);
            });
        }

        onTPMAttestationComplete(hresult) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "TPM Attestation completed");

            // Stop the TPM attestation timeout
            this.tpmAttestationTimeout.cancel();
            this.tpmAttestationTimeout = null;

            if (hresult.target === 0) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "TPM Attestation succeeded.");
                this.displayProgress(this.DevicePreparationTPM, this.subcategoryTpmTitleId, this.bootstrapStatusIdCompleted);
                this.launchProvisioning();
            } else {
                let hresultString = this.formatNumberAsHexString(hresult.target, 8);

                let errorMessage = "<status>: <hresult>"
                    .replace("<status>", resourceStrings[this.bootstrapStatusIdFailed])
                    .replace("<hresult>", hresultString);

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "TPM Attestation failed: ", hresultString);
                this.whiteGloveError = this.resourceStrings.BootstrapPageDevicePreparationTpmError.replace("{0}", hresultString);
                this.setDevicePreparationStatus(false, this.DevicePreparationTPM, errorMessage);
            }
        }

        async shouldShowSignOutButtonAsync() {
            try {
                if (!this.isOOBE) {
                    const shouldBeStandardUser = await this.autoPilotManager.getOobeSettingsOverrideAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotOobeSetting.disallowUserAsLocalAdmin);
                    if (!shouldBeStandardUser) {
                        const pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
                        const isAutopilotReset = pluginManager.isPostPowerwash();
                        const isHybrid = (await this.autoPilotManager.getDwordPolicyAsync("CloudAssignedDomainJoinMethod") === 1);

                        if (isAutopilotReset || isHybrid) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ShouldShowSignOutButton");
                            return true;
                        }
                    } else {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_SkipSignOutButtonForStandardUser");
                    }
                }
            } catch (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_ShouldShowSignOutButtonAsync_Failed", e);
            }

            return false;
        }

        launchProvisioning() {
            this.displayProgress(this.DevicePreparationJoiningNetwork, this.subcategoryJoinNetworksTitleId, this.bootstrapStatusIdWorking);
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "launchProvisioning invoked");
            if (this.restoreMDMTasks) {
                try {
                    this.enterpriseManagementWorker.rebuildSchedulesAndSyncWithServerAsync();
                } catch (e) {
                    this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_RestoreMDMTask_Failed", e);
                }
            }

            if (!this.runProvisioning) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ProvisioningSkipped");
                this.displayProgress(this.DevicePreparationJoiningNetwork, this.subcategoryJoinNetworksTitleId, this.bootstrapStatusIdCompleted);
                this.performDeviceEnrollment();
            } else {
                // Only instantiate this object if launchProvisioning is required. This will fail on WCOS devices as provisioning is only available on desktop
                this.provisioningPluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();

                let provisioningPromises = {
                    promiseProvision: this.provisioningPluginManager.applyAfterConnectivityPackagesAsync(),
                    promiseMinimumTime: WinJS.Promise.timeout(this.minProgressTextTime)
                };

                WinJS.Promise.join(provisioningPromises).then(() => {
                    this.promisePolling = this.pollProvisioningResults();
                });
            }
        }

        pollProvisioningResults() {
            // Break the polling when complete.
            if (this.stopPollingResults) {
                return WinJS.Promise.as(true);
            }

            // Get the real-time updates.
            return this.provisioningPluginManager.getProvisioningSucceededAsync().then((result) => {
                if (this.provisioningPluginManager.isRebootRequired()) {
                    this.stopPollingResults = true;
                    bridge.fireEvent(constants.Events.done, constants.AppResult.action1);
                } else if (this.PROV_SUCCEEDED === result) {
                    this.stopPollingResults = true;
                    this.setDevicePreparationStatus(true, this.DevicePreparationJoiningNetwork);
                    this.performDeviceEnrollment();
                }
                else if (this.PROV_FAILED === result) {
                    this.stopPollingResults = true;
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ProvisioningFailure");

                    this.setDevicePreparationStatus(false, this.DevicePreparationJoiningNetwork, "Error_ProvisioningFailed");
                }
            })
                .then(() => {
                    return WinJS.Promise.timeout(this.pollingInterval);
                })
                .then(() => {
                    return this.pollProvisioningResults();
                })
                // Regardless of the errors, we continue the polling.
                .then(null, (error) => {
                    return WinJS.Promise.timeout(this.pollingInterval);
                })
                .then(() => {
                    return this.pollProvisioningResults();
                });
        }

        performAadDeviceEnrollmentInternal() {
            // N.B, we need to 'bind' the class object not because it is UX but because the lambda internally needs the object.
            // Failing to bind results in access to 'this' failing and throwing an exception.
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Starting AutoPilot device enrollment");
            return this.autoPilotManager.performDeviceEnrollmentAsync().then(function (result) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Device enrollment call completed. Processing results...");
                let enrollmentState = result.enrollmentDisposition;

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Result data extracted.");

                if (enrollmentState === EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.completed) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Enrollment disposition marked as completed.");
                    let resultMessage = "<state>, 0x<hresult>"
                        .replace("<state>", enrollmentState)
                        .replace("<hresult>", this.formatNumberAsHexString(result.dispositionResult, 8));
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Device enrollment results: ", resultMessage);

                    this.setDevicePreparationStatus(true, this.DevicePreparationRegisteringForMDM);

                    this.waitForEspPolicyProviders().then(function () {
                        if (this.policyProvidersInstalled === true) {
                            this.doneProvisioning();
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "doneProvisioning returned");
                        }
                    }.bind(this));
                } else {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Enrollment disposition marked as not completed.");
                    let errorMessage = "<status>: <state>, 0x<hresult>"
                        .replace("<status>", resourceStrings[this.bootstrapStatusIdFailed])
                        .replace("<state>", enrollmentState)
                        .replace("<hresult>", this.formatNumberAsHexString(result.dispositionResult, 8));

                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Device enrollment results: ", errorMessage);

                    switch (enrollmentState) {
                        case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.aadConfigure:
                            this.whiteGloveError = this.resourceStrings.HexWhiteGloveAadConfigureError.replace("{0}", this.formatNumberAsHexString(result.dispositionResult, 8));
                            break;

                        case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.aadJoin:
                            this.whiteGloveError = this.resourceStrings.HexWhiteGloveAadJoinError.replace("{0}", this.formatNumberAsHexString(result.dispositionResult, 8));
                            break;

                        case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.aadDeviceDiscovery:
                            this.whiteGloveError = this.resourceStrings.HexWhiteGloveAadDeviceDiscoveryError.replace("{0}", this.formatNumberAsHexString(result.dispositionResult, 8));
                            break;

                        case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.aadTicket:
                            this.whiteGloveError = this.resourceStrings.HexWhiteGloveAadTicketError.replace("{0}", this.formatNumberAsHexString(result.dispositionResult, 8));
                            break;

                        case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.mdmEnrolling:
                            this.whiteGloveError = this.resourceStrings.HexWhiteGloveMdmEnrollmentError.replace("{0}", this.formatNumberAsHexString(result.dispositionResult, 8));
                            break;

                        default:
                            this.whiteGloveError = this.resourceStrings.HexWhiteGloveGenericEnrollmentError.replace("{0}", this.formatNumberAsHexString(result.dispositionResult, 8));
                    }

                    this.setDevicePreparationStatus(false, this.DevicePreparationRegisteringForMDM, errorMessage);
                }
            }.bind(this), function (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_performAadDeviceEnrollment_Failed", e);
            }.bind(this));
        }

        performAadDeviceEnrollment() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Perform AAD Device enrollment invoked");

            return bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveStartTimeValueName).then(function (result) {
                if (null != result) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "White glove performAadDeviceEnrollment");
                    return this.autoPilotManager.setDeviceAutopilotModeAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveCanonical).then(function () {
                        return this.performAadDeviceEnrollmentInternal();
                    }.bind(this), function (e) {
                        this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_performDeviceEnrollmentInternal: Error occured while performing White Glove device enrollment", e);
                    }.bind(this), function (e) {
                        this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_setDeviceAutopilotModeAsync: Error occured while setting Autopilot mode to White Glove Canonical", e);
                    }.bind(this));
                }

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_PerformAadDeviceEnrollment");
                return this.performAadDeviceEnrollmentInternal();
            }.bind(this));
        }

        performDeviceEnrollment() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "performDevicecEnrollment invoked");
            this.displayProgress(this.DevicePreparationRegisteringForMDM, this.subcategoryRegisterMdmTitleId, this.bootstrapStatusIdWorking);

            this.autoPilotManager.getDeviceAutopilotModeAsync().then(function (mode) {
                if (this.aadAuthUsingDeviceTicket && (mode !== EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP)) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "performDeviceEnrollment calling performAadDeviceEnrollment");
                    return this.performAadDeviceEnrollment();
                } else {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "performDevicecEnrollment skipping performAadDeviceEnrollment");
                    this.setDevicePreparationStatus(true, this.DevicePreparationRegisteringForMDM);
    
                    this.waitForEspPolicyProviders().then(function () {
                        if (this.policyProvidersInstalled === true) {
                            if (this.runProvisioning) {
                                // This page follows a Powerwash.
                                this.doneProvisioning();
                            } else {
                                // This page does not follow a Powerwash, but follows a user enrollment.
                                this.checkMDMTrackingInfo();
                            }
                        }
                    }.bind(this), function (e) {
                        this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_waitForEspPolicyProviders_Failed", e);
                    }.bind(this));
                }
            }.bind(this));
        }

        waitForEspPolicyProviders() {
            this.policyProvidersInstalled = false;

            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Start wait for ESP policy providers");
            this.displayProgress(this.DevicePreparationPreparingForMDM, this.subcategoryPrepareMdmTitleId, this.bootstrapStatusIdWorking);

            // Fire and forget
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_Starting_Sync_Sessions_For_PolicyProviders");
            this.deviceManagementUtilities.runSyncSessionsAsync(ModernDeployment.Autopilot.Core.SyncSessionExitCondition.policyProvidersComplete).then(function() {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_Sync_Sessions_Completed");
            }.bind(this), function (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_Sync_Sessions_Failed", e);
            }.bind(this));            

            return this.espTrackingUtility.waitForPolicyProviderInstallationToCompleteAsync().then(function (result) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "waitForPolicyProviderInstallationToComplete returned, processing results...");

                if (result.installationResult === this.INSTALL_SUCCESS) {
                    // Completed successfully
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "waitForPolicyProviderInstallationToComplete returned success result");
                    this.setDevicePreparationStatus(true, this.DevicePreparationPreparingForMDM);
                    this.policyProvidersInstalled = true;
                } else {
                    let logMessage = "Policy provider failure: ";
                    let errorCode = 0;

                    if (result.installationResult === this.INSTALL_TIMEOUT) {
                        // Provider timeout
                        errorCode = result.errorCode;
                        logMessage = logMessage + "installation timed out.";
                    }
                    else if (result.installationResult === this.INSTALL_FAILURE) {
                        // Provider reported error
                        logMessage = logMessage + "installation failed with error 0x" + this.formatNumberAsHexString(result.errorCode, 8);
                        errorCode = result.errorCode;
                    } else {
                        logMessage = logMessage + "unexpected installationResult encountered: " + result.installationResult;
                        errorCode = 0x8000FFFF; // E_UNEXPECTED
                    }

                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", logMessage);

                    let errorMessage = "<status>: 0x<hresult>"
                        .replace("<status>", resourceStrings[this.bootstrapStatusIdFailed])
                        .replace("<hresult>", this.formatNumberAsHexString(errorCode, 8));

                    this.whiteGloveError = this.resourceStrings.HexWhiteGloveEspProviderError.replace("{0}", this.formatNumberAsHexString(result.errorCode, 8));

                    this.setDevicePreparationStatus(false, this.DevicePreparationPreparingForMDM, errorMessage);
                }
            }.bind(this), function (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_waitForPolicyProviderInstallationToComplete: Error occured while waiting for policy provider installation to complete", e);
            }.bind(this));
        }

        acquireSubscription() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_AquiringSubscription");
            let resourceAccountManager = new Microsoft.ResourceAccountManager.ResourceAccountLicense();
            let hubSubscriptionContentId = "4a6817e0-189b-4124-6aad-3f1d181547a2";  // Note: ContentId and Policy name will always be the same for Surface Hub
            let hubSubscriptionPolicyName = "HubOS-Activated";
            this.displayProgress(this.EnrollmentProgressDeviceSetupSubscription, "BootstrapPageSubscription", "BootstrapPageSubscriptionActivation");

            WinJS.Promise.timeout(5000 /*5 second timeout*/).then(() => {
                resourceAccountManager.activateLicenseAsync(hubSubscriptionContentId, hubSubscriptionPolicyName).done((subscriptionAcquired) => {
                    if (subscriptionAcquired) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Successfully auto-claimed a subscription.");

                        // Set success visuals
                        this.displayProgress(this.EnrollmentProgressDeviceSetupSubscription, "BootstrapPageSubscription", "BootstrapPageComplete");
                        this.exitPage();
                    } else {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Failed to auto-claim a subscription.");

                        // Set failure visuals
                        this.displayProgress(this.EnrollmentProgressDeviceSetupSubscription, "BootstrapPageSubscription", "BootstrapPageFailed");
                        this.setAccountSetupStatus(false);

                        // Navigate to device subscription page. No need to show the error buttons since the page is auto-navigating to the subscription page.
                        WinJS.Promise.timeout(3000 /*3 second timeout*/).then(() => {
                            bridge.fireEvent(constants.Events.done, constants.AppResult.action1);
                        });
                    }
                }, (error) => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "License activation error", CloudExperienceHost.GetJsonFromError(error));
                    this.displayProgress(this.EnrollmentProgressDeviceSetupSubscription, "BootstrapPageSubscription", "BootstrapPageFailed");
                    this.setAccountSetupStatus(false);
                    this.displayError();
                });
            });
        }

        formatNumberAsHexString(numberToConvert, maxHexCharacters) {
            let stringToReturn = "";

            for (var i = 0; i < maxHexCharacters; i++) {
                let digitValue = 0xF & (numberToConvert >> (i * 4));
                stringToReturn = digitValue.toString(16) + stringToReturn;
            }

            return stringToReturn;
        }

        doneProvisioning() {
            this.enterpriseManagementWorker.showMdmSyncStatusPageAsync(true).then(function (result) {
                if (1 === result) {
                    this.checkMDMTrackingInfo();
                } else {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_Exit_MDMProgressSkip");
                    this.exitPage();
                }
            }.bind(this), function (e) {
                this.logFailureEvent("UnifiedEnrollment_ProgressPage_ShowStatusPageAsync_Failed", e);
                this.exitPage();
            }.bind(this));
        }

        checkMDMTrackingInfo() {
            let checkProgressModePromise = this.enterpriseManagementWorker.checkMDMProgressModeAsync().then(function (result) {
                if (!this.isOOBE) {
                    this.targetContext = result;
                } else {
                    this.targetContext = this.TARGET_DEVICE;

                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_Setting_DevicePrep_Complete");
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.espDevicePrepCompleted, true);
                }
            }.bind(this));

            let checkBlockingValuePromise = this.enterpriseManagementWorker.checkBlockingValueAsync().then(function (result) {
                this.blockingValue = result;
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_BlockingValue", result);
                if (this.blockingValue == 0) {
                    // In Autopilot White Glove, clicking the Continue Anyway button before AADJ is completed can put the device in a userless state, so it is blocked no matter what.
                    this.autoPilotManager.getDeviceAutopilotModeAsync().then(function (result) {
                        if ((result !== EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveCanonical) &&
                            (result !== EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP)) {
                            this.shouldShowSignOutButtonAsync().then(function (result) {
                                if (result) {
                                    this.isSignOutButtonVisible(true);
                                } else {
                                    this.isFinishedButtonVisible(true);
                                }
                            }.bind(this));
                        }
                    }.bind(this));
                }
            }.bind(this));

            let shouldShowCollectLogsPromise = this.enterpriseManagementWorker.shouldShowCollectLogsAsync(this.isOOBE).then(function (result) {
                this.showCollectLogs = result;
            }.bind(this));

            WinJS.Promise.join({ checkProgressMode: checkProgressModePromise, checkBlockingValue: checkBlockingValuePromise, shouldShowCollectLogs: shouldShowCollectLogsPromise }).then(function (results) {
                bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                this.trackMDMSyncProgress();
            }.bind(this), function (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_Exit_CheckBlockingValues_Failed", e);
                // Something critical failed, skip the page.
                this.exitPage();
            }.bind(this));
        }

        onAadjCompleted(result) {
            bridge.invoke("CloudExperienceHost.UserManager.setSignInIdentityProvider", CloudExperienceHostAPI.SignInIdentityProviders.aad);
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_AADJ_Successfully_Completed");

            // Stop the AADJ event timeout
            this.aadjTimeout.cancel();
            this.aadjTimeout = null;

            // Device is now domain joined, stop trying to run the background task
            clearInterval(this.deviceRegistrationTaskScheduler);
            this.deviceRegistrationTaskScheduler = null;

            // Re-create the OMADM sync tasks to force user policy sync upon AADJ completing.
            this.enterpriseManagementWorker.recreateEnrollmentTasksAsync().then(function () {
                this.displayProgress(this.EnrollmentProgressAccountAuthentication, "BootstrapPageAADJ", "BootstrapPageComplete");
                this.checkMDMTrackingInfo();
            }.bind(this), function (e) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_RecreateOmaDmTask_Failed", e);
                this.displayProgress(this.EnrollmentProgressAccountAuthentication, "BootstrapPageAADJ", "BootstrapPageFailed");
                this.setAccountSetupStatus(false);
                this.displayError();
            }.bind(this));
        }

        waitForAadjToComplete() {
            this.IsAccountSetupDetailsVisible(true);
            this.setDeviceSetupStatus(true);

            // Set the initial status values for each of the the subcategories
            this.EnrollmentProgressAccountSetupStatus(resourceStrings["BootstrapPageWorking"]);
            this.displayProgress(this.EnrollmentProgressAccountAuthentication, "BootstrapPageAADJ", "BootstrapPageWorking");
            this.displayProgress(this.EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageWaitingForPrevious");
            this.displayProgress(this.EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageWaitingForPrevious");
            this.displayProgress(this.EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageWaitingForPrevious");
            this.displayProgress(this.EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageWaitingForPrevious");

            // Create a 5 minute periodic timer for kicking off the scheduled task to register the device with AAD
            this.deviceRegistrationTaskScheduler = setInterval(function () {
                this.enterpriseManagementWorker.forceRunDeviceRegistrationScheduledTaskAsync().then(function () {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_Start_DJTask_Succeeded");
                }.bind(this), function (e) {
                    this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_Start_DJTask_Nonfatal_Error", e);
                }.bind(this));
            }.bind(this), 300000);

            // Create a 1 hour timeout for AADJ to occur - the reason for this timeout is AD connect happens in the
            // background approximately every 30 minutes, and once this occurs, the device registration task (forced 
            // to run every five minutes by deviceRegistrationTaskScheduler) will finally succeed, at which point
            // the device is AADJ'd
            this.aadjTimeout = WinJS.Promise.timeout(3600000).then(function () {
                this.autoPilotSubscriptionManager.removeEventListener(this.aadjEventName, this.onAadjCompleted.bind(this));

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_AADJ_Timeout_Failure");

                this.displayProgress(this.EnrollmentProgressAccountAuthentication, "BootstrapPageAADJ", "BootstrapPageFailed");
                this.setAccountSetupStatus(false);
                this.displayError();

                clearInterval(this.deviceRegistrationTaskScheduler);
                this.deviceRegistrationTaskScheduler = null;
            }.bind(this));

            this.autoPilotSubscriptionManager.addEventListener(this.aadjEventName, this.onAadjCompleted.bind(this));
        }

        trackMDMSyncProgress() {
            if (this.targetContext === 0) {
                // Reset Device setup visuals
                this.IsDeviceSetupDetailsVisible(true);
                this.DeviceSetupProgressVisibility("visible");
                this.IsDeviceSetupStatusBadgeVisible(false);
                this.EnrollmentProgressDeviceSetupStatus(resourceStrings["BootstrapPageIdentifying"]);
            } else {
                // Reset Account Setup visuals
                this.IsAccountSetupDetailsVisible(true);
                this.AccountSetupProgressVisibility("visible");
                this.IsAccountSetupStatusBadgeVisible(false);
                this.setDeviceSetupStatus(true);
                this.EnrollmentProgressAccountSetupStatus(resourceStrings["BootstrapPageIdentifying"]);

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPageSetdAADWorkplaceJoinOverride");
                let requestToken = this.autoPilotManager.setAADWorkplaceJoinOverrideAsync().then(function () {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_SetdAADWorkplaceJoinOverride_Succeeded");
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_RequestAADUserToken");
                    CloudExperienceHostAPI.UtilStaticsCore.requestAADUserTokenAsync().then(function () {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_RequestAADUserTokenSucceeded");
                        this.autoPilotManager.removeAADWorkplaceJoinOverrideAsync();
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_RemovedAADWorkplaceJoinOverride");
                    }.bind(this), function (error) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_RequestAADUserTokenFailed");
                        this.autoPilotManager.removeAADWorkplaceJoinOverrideAsync();
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_RemovedAADWorkplaceJoinOverride");
                    }.bind(this));
                }.bind(this), function (e) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_SetdAADWorkplaceJoinOverride_Failed");
                }.bind(this));
            }

            var policyPromise = this.enterpriseManagementWorker.pollForExpectedPoliciesAndResources(0, true, this.targetContext).then(function (result) {
                this.policyCurrentProgress = result.currentProgress;
                this.policyExpectedEndValue = result.expectedEndValue;
                if (result.expectedEndValue === -1 || result.expectedEndValue != result.currentProgress) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_PoliciesFailed");
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                    }
                } else if (result.expectedEndValue === 0) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    }
                } else {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                    }
                }
            }.bind(this), function (e) {
                this.policyCurrentProgress = 0;
                this.policyExpectedEndValue = -1;
                if (this.targetContext === 0) {
                    this.displayProgress(this.EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageFailed", this.policyCurrentProgress, this.policyExpectedEndValue);
                } else {
                    this.displayProgress(this.EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageFailed", this.policyCurrentProgress, this.policyExpectedEndValue);
                }
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_PolicyPromise_Failed", e);
            }.bind(this), function (result) {
                if (result.expectedEndValue === -1) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                    }
                } else if (result.expectedEndValue === 0) {
                    if (this.targetContext === 0) {
                        this.EnrollmentProgressDeviceSetupStatus(resourceStrings["BootstrapPageWorking"]);
                        this.displayProgress(this.EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.EnrollmentProgressAccountSetupStatus(resourceStrings["BootstrapPageWorking"]);
                        this.displayProgress(this.EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    }
                } else {
                    if (this.targetContext === 0) {
                        this.EnrollmentProgressDeviceSetupStatus(resourceStrings["BootstrapPageWorking"]);
                        this.displayProgress(this.EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.EnrollmentProgressAccountSetupStatus(resourceStrings["BootstrapPageWorking"]);
                        this.displayProgress(this.EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                    }
                }
            }.bind(this));

            var certificatesPromise = this.enterpriseManagementWorker.pollForExpectedPoliciesAndResources(3, true, this.targetContext).then(function (result) {
                this.certificatesCurrentProgress = result.currentProgress;
                this.certificatesExpectedEndValue = result.expectedEndValue;
                if (result.expectedEndValue === -1 || result.expectedEndValue != result.currentProgress) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_CertificatesFailed");
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                    }
                } else if (result.expectedEndValue === 0) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    }
                } else {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                    }
                }
            }.bind(this), function (e) {
                this.certificatesCurrentProgress = 0;
                this.certificatesExpectedEndValue = -1;
                if (this.targetContext === 0) {
                    this.displayProgress(this.EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPageFailed", this.certificatesCurrentProgress, this.certificatesExpectedEndValue);
                } else {
                    this.displayProgress(this.EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageFailed", this.certificatesCurrentProgress, this.certificatesExpectedEndValue);
                }
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_ProfilesPromise_Failed", e);
            }.bind(this), function (result) {
                if (result.expectedEndValue === -1) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                    }
                } else if (result.expectedEndValue === 0) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    }
                } else {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                    }
                }
            }.bind(this));

            var profilesPromise = this.enterpriseManagementWorker.pollForExpectedPoliciesAndResources(1, true, this.targetContext).then(function (result) {
                this.profilesCurrentProgress = result.currentProgress;
                this.profilesExpectedEndValue = result.expectedEndValue;
                if (result.expectedEndValue === -1 || result.expectedEndValue != result.currentProgress) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_NetworkFailed");
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                    }
                } else if (result.expectedEndValue === 0) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    }
                } else {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNetworkTrack", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNetworkTrack", result.currentProgress, result.expectedEndValue);
                    }
                }
            }.bind(this), function (e) {
                this.profilesCurrentProgress = 0;
                this.profilesExpectedEndValue = -1;
                if (this.targetContext === 0) {
                    this.displayProgress(this.EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageFailed", this.profilesCurrentProgress, this.profilesExpectedEndValue);
                } else {
                    this.displayProgress(this.EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageFailed", this.profilesCurrentProgress, this.profilesExpectedEndValue);
                }
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_ApplicationsPromise_Failed", e);
            }.bind(this), function (result) {
                if (result.expectedEndValue === -1) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                    }
                } else if (result.expectedEndValue === 0) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    }
                } else {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNetworkTrack", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNetworkTrack", result.currentProgress, result.expectedEndValue);
                    }
                }
            }.bind(this));

            var appsPromise = this.enterpriseManagementWorker.pollForExpectedPoliciesAndResources(2, true, this.targetContext).then(function (result) {
                this.appsCurrentProgress = result.currentProgress;
                this.appsExpectedEndValue = result.expectedEndValue;
                this.appsBlockedByReboot = result.blockedByRequiredReboot;
                if (result.expectedEndValue === -1 || ((result.expectedEndValue != result.currentProgress) && (result.blockedByRequiredReboot === false))) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ApplicationsFailed");
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                    }
                } else if (result.expectedEndValue === 0) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    }
                } else {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageAppTrack", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageAppTrack", result.currentProgress, result.expectedEndValue);
                    }
                }
            }.bind(this), function (e) {
                this.appsCurrentProgress = 0;
                this.appsExpectedEndValue = -1;
                this.appsBlockedByReboot = false;
                if (this.targetContext === 0) {
                    this.displayProgress(this.EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageFailed", this.appsCurrentProgress, this.appsExpectedEndValue);
                } else {
                    this.displayProgress(this.EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageFailed", this.appsCurrentProgress, this.appsExpectedEndValue);
                }
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_CertificatesPromise_Failed", e);
            }.bind(this), function (result) {
                if (result.expectedEndValue === -1) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                    }
                } else if (result.expectedEndValue === 0) {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                    }
                } else {
                    if (this.targetContext === 0) {
                        this.displayProgress(this.EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageAppTrack", result.currentProgress, result.expectedEndValue);
                    } else {
                        this.displayProgress(this.EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageAppTrack", result.currentProgress, result.expectedEndValue);
                    }
                }
            }.bind(this));

            // This is a fire and forget operation because sendResultsToMdmServerAsync sets the IsSyncDone node to actually break out of this wait, so we can't put this in the promise join.
            let espPhase = this.isOOBE ? "DeviceSetup" : "AccountSetup";
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", `UnifiedEnrollment_ProvisioningProgressPage_Starting_Sync_Sessions_For_${espPhase}`);
            const exitCondition = this.isOOBE ? ModernDeployment.Autopilot.Core.SyncSessionExitCondition.deviceSetupComplete : ModernDeployment.Autopilot.Core.SyncSessionExitCondition.accountSetupComplete;
            this.deviceManagementUtilities.runSyncSessionsAsync(exitCondition).then(function() {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", `UnifiedEnrollment_ProvisioningProgressPage_Sync_Sessions_Completed_For_${espPhase}`);
            }.bind(this), function (e) {
                this.logFailureEvent(`UnifiedEnrollment_ProvisioningProgressPage_Sync_Sessions_Failed_For_${espPhase}`, e);
            }.bind(this));

            this.displayProgress(this.EnrollmentProgressDeviceSetupSubscription, "BootstrapPageSubscription", "BootstrapPageIdentifying");

            return WinJS.Promise.join({ policies: policyPromise, profiles: profilesPromise, apps: appsPromise, certs: certificatesPromise}).then(function (results) {
                if (this.policyCurrentProgress === this.policyExpectedEndValue && this.profilesCurrentProgress === this.profilesExpectedEndValue &&
                    this.certificatesCurrentProgress === this.certificatesExpectedEndValue && ((this.appsCurrentProgress === this.appsExpectedEndValue) || this.appsBlockedByReboot)) {
                    this.progressIsDone = true;

                    // Reboot the device if required due to policies/settings being set that require reboot.
                    this.enterpriseManagementWorker.checkRebootRequiredAsync().then(function (isRebootRequired) {
                        // Should only reboot in OOBE.  This makes sure the web app doesn't "Fall off" before pin.
                        if (this.isOOBE && isRebootRequired) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_CoalescedRebootRequired");
                            bridge.invoke("CloudExperienceHost.setRebootForOOBE");
                            bridge.fireEvent(constants.Events.done, constants.AppResult.action1);
                        } else {
                            try {
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_CoalescedRebootNotRequired");
                                this.enterpriseManagementWorker.updateServerWithResult(true, this.isOOBE);
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_SuccessfullySetResultForServer");

                                if (this.targetContext === 0) {
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_HubOSOobeSubscriptionPage_FeatureDisabled");
                                    this.displayProgress(this.EnrollmentProgressDeviceSetupSubscription, "BootstrapPageSubscription", "BootstrapPageNotSetUp");
                                    this.setDeviceSetupStatus(true);
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_Exit_DeviceConfigurationComplete");
                                    this.exitPage();
                                } else {
                                    this.setAccountSetupStatus(true);
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_Exit_UserConfigurationComplete");
                                    this.exitPage();
                                }
                            } catch (e) {
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ServerForcedFailed");
                                if (this.targetContext === 0) {
                                    this.setDeviceSetupStatus(false);
                                } else {
                                    this.setAccountSetupStatus(false);
                                }
                                this.displayError();
                            }
                        }
                    }.bind(this), function (e) {
                        // Failure happened, but don't error out page because of it.
                        this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_RebootApi_Failed", e);
                        try {
                            this.enterpriseManagementWorker.updateServerWithResult(true, this.isOOBE);
                            if (this.targetContext === 0) {
                                this.setDeviceSetupStatus(true);
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_Exit_DeviceConfigurationComplete");
                            } else {
                                this.setAccountSetupStatus(true);
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_Exit_UserConfigurationComplete");
                            }
                            this.exitPage();
                        } catch (e) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ServerForcedFailure");
                            if (this.targetContext === 0) {
                                this.setDeviceSetupStatus(false);
                            } else {
                                this.setAccountSetupStatus(false);
                            }
                            this.displayError();
                        }
                    }.bind(this));
                } else {
                    try {
                        this.enterpriseManagementWorker.updateServerWithResult(false, this.isOOBE);
                    } catch (e) {
                        this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_Exit_UpdateServerWithResult_Failed", e);
                    }

                    if (this.targetContext === 0) {
                        this.setDeviceSetupStatus(false);
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_DeviceConfigurationTimeOut");
                    } else {
                        this.setAccountSetupStatus(false);
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_UserConfigurationTimeOut");
                    }
                    this.displayError();
                }
            }.bind(this), function (e) {
               this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_TrackingApiPromise_Failed", e);
                try {
                    this.enterpriseManagementWorker.updateServerWithResult(false, this.isOOBE);
                } catch (e) {
                    this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_Exit_UpdateServerWithResult_Failed", e);
                }

                if (this.targetContext === 0) {
                    this.setDeviceSetupStatus(false);
                } else {
                    this.setAccountSetupStatus(false);
                }
                this.displayError();
            }.bind(this));
        }

        displayProgress(htmlElement, textString1, textString2, value1, value2) {
            let finalProgressText = resourceStrings[textString1];

            if (textString2 != null) {
                if (resourceStrings[textString2]) {
                    // If defined, use a string in the resource array
                    finalProgressText = finalProgressText.replace("{0}", resourceStrings[textString2]);
                } else {
                    // Otherwise, use the passed-in string
                    finalProgressText = finalProgressText.replace("{0}", textString2);
                }
            }

            if (value2 === -1 || value2 === 0) {
                htmlElement(finalProgressText);
            } else {
                finalProgressText = finalProgressText.replace("{0}", value1);
                htmlElement(finalProgressText.replace("{1}", value2));
            }
        }

        displayError() {
            this.enterpriseManagementWorker.retrieveCustomErrorText(this.isOOBE).then(function (results) {
                this.displayErrorButtons();
                this.EnrollmentProgressNotifyOfNotificationText(results);
                if (this.targetContext === 0) {
                    this.EnrollmentProgressDeviceSetupStatus(resourceStrings["BootstrapPageFailed"]);
                } else {
                    this.EnrollmentProgressAccountSetupStatus(resourceStrings["BootstrapPageFailed"]);
                }
            }.bind(this), function (e) {
                this.displayErrorButtons();
                this.EnrollmentProgressNotifyOfNotificationText(resourceStrings["BootstrapPageDefualtError"]);
                if (this.targetContext === 0) {
                    this.EnrollmentProgressDeviceSetupStatus(resourceStrings["BootstrapPageFailed"]);
                } else {
                    this.EnrollmentProgressAccountSetupStatus(resourceStrings["BootstrapPageFailed"]);
                }
            }.bind(this));
        }

        setCategoryStatusVisuals(
            isSuccessful,
            statusbadgeFill,
            statusbadgeIcon,
            statusError,
            statusOpacity,
            statusErrorMessageControl,
            progressVisibility,
            badgeIsVisible) {

            if (isSuccessful) {
                statusErrorMessageControl(resourceStrings[this.bootstrapStatusIdCompleted]);
            } else {
                // Icons had been initialized to success.
                statusbadgeFill("failure");
                statusbadgeIcon("icon-failed");
                statusError("error");
                statusOpacity(1);
                statusErrorMessageControl(resourceStrings[this.bootstrapStatusIdFailed]);
            }

            progressVisibility("hidden");
            badgeIsVisible(true);
        }

        setDevicePreparationStatus(isSuccessful, applicableSubcategory, subcategoryErrorMessageId) {
            // Set subsequent categories' status text appropriately on failure.  Also, show default error message.
            if (!isSuccessful) {
                this.displayProgress(this.EnrollmentProgressDeviceSetupStatus, this.bootstrapStatusIdPreviousFailed);
                this.displayProgress(this.EnrollmentProgressAccountSetupStatus, this.bootstrapStatusIdPreviousFailed);
                this.EnrollmentProgressNotifyOfNotificationText(resourceStrings[this.defaultErrorMessageId]);
            }

            // Set appropriate status text for subcategories.
            let foundSubcategoryIndex = 0;
            for (; foundSubcategoryIndex < this.devicePreparationSubcategories.length; foundSubcategoryIndex++) {
                if (applicableSubcategory == this.devicePreparationSubcategories[foundSubcategoryIndex].textControl) {
                    break;
                }
            }

            if (isSuccessful) {
                this.displayProgress(
                    this.devicePreparationSubcategories[foundSubcategoryIndex].textControl,
                    this.devicePreparationSubcategories[foundSubcategoryIndex].titleId,
                    this.bootstrapStatusIdCompleted);

                // If the last subcategory is successful, set the whole category visuals to success.
                if (foundSubcategoryIndex === this.devicePreparationSubcategories.length - 1) {
                    this.setCategoryStatusVisuals(
                        true,
                        this.DevicePreparationStatusBadgeFill,
                        this.DevicePreparationStatusBadgeIcon,
                        this.DevicePreparationStatusError,
                        this.DevicePreparationStatusOpacity,
                        this.DevicePreparationStatus,
                        this.DevicePreparationProgressVisibility,
                        this.IsDevicePreparationStatusBadgeVisible);
                }
            } else {
                this.displayProgress(
                    this.devicePreparationSubcategories[foundSubcategoryIndex].textControl,
                    this.devicePreparationSubcategories[foundSubcategoryIndex].titleId,
                    (subcategoryErrorMessageId == null) ? this.bootstrapStatusIdFailed : subcategoryErrorMessageId);

                // Set "previous failed" message on subsequent subcategories under the same category.
                for (var i = foundSubcategoryIndex + 1; i < this.devicePreparationSubcategories.length; i++) {
                    this.displayProgress(
                        this.devicePreparationSubcategories[i].textControl,
                        this.devicePreparationSubcategories[i].titleId,
                        this.bootstrapStatusIdPreviousFailed);
                }

                // If any subcategory fails, set the whole category visuals to fail.
                this.setCategoryStatusVisuals(
                    false,
                    this.DevicePreparationStatusBadgeFill,
                    this.DevicePreparationStatusBadgeIcon,
                    this.DevicePreparationStatusError,
                    this.DevicePreparationStatusOpacity,
                    this.DevicePreparationStatus,
                    this.DevicePreparationProgressVisibility,
                    this.IsDevicePreparationStatusBadgeVisible);
            }

            if (!isSuccessful) {
                // Show appropriate buttons.
                this.blockingValue = 1;
                this.showCollectLogs = true;
                this.displayErrorButtons();
            }
        }

        setDeviceSetupStatus(isSuccessful, errorMessage) {
            this.setCategoryStatusVisuals(
                isSuccessful,
                this.DeviceSetupStatusBadgeFill,
                this.DeviceSetupStatusBadgeIcon,
                this.DeviceSetupStatusError,
                this.DeviceSetupStatusOpacity,
                this.EnrollmentProgressDeviceSetupStatus,
                this.DeviceSetupProgressVisibility,
                this.IsDeviceSetupStatusBadgeVisible);
        }

        setAccountSetupStatus(isSuccessful, errorMessage) {
            this.setCategoryStatusVisuals(
                isSuccessful,
                this.AccountSetupStatusBadgeFill,
                this.AccountSetupStatusBadgeIcon,
                this.AccountSetupStatusError,
                this.AccountSetupStatusOpacity,
                this.EnrollmentProgressAccountSetupStatus,
                this.AccountSetupProgressVisibility,
                this.IsAccountSetupStatusBadgeVisible);
        }

        exitPage() {
            try {
                this.shouldShowSignOutButtonAsync().then(function (showSignOut) {
                    this.autoPilotManager.getDeviceAutopilotModeAsync().then(function (result) {
                        if ((result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveCanonical) ||
                            (result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP)) {
                            return bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.whiteGloveSuccessValueName, this.whiteGloveSucceeded).then(function () {
                                return bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.whiteGloveEndTimeValueName, Date.now()).then(function () {
                                    setTimeout(() => {
                                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action2);
                                    }, this.eventTimeout);
                                }.bind(this));
                            }.bind(this));
                        } else {
                            setTimeout(() => {
                                if (showSignOut) {
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ShowSignoutInsteadOfContinueAnyway");
                                    this.infoMessage(this.resourceStrings["BootstrapPageAutopilotResetSignOut"]);
                                    this.isSignOutButtonVisible(true);
                                } else {
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action3);
                                }
                            }, 5000);
                        }
                    }.bind(this));
                }.bind(this));
            } catch (error) {
                this.logFailureEvent("UnifiedEnrollment_ProvisioningProgressPage_shouldShowSignOutButtonAsync: Error occured while deciding whether or not to show the Sign Out button", error);
            }
        }

        displayErrorButtons() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_DisplayErrorButtons ", this.blockingValue);

            this.autoPilotManager.getDeviceAutopilotModeAsync().then(function (result) {
                if ((result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveCanonical) ||
                    (result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP)) {
                    return bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.whiteGloveSuccessValueName, this.whiteGloveError).then(function () {
                        return bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.whiteGloveEndTimeValueName, Date.now()).then(function () {
                            setTimeout(() => {
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action2);
                            }, this.eventTimeout);
                        }.bind(this));
                    }.bind(this));
                }
            }.bind(this));

            var hyperlinkValue = 0;
            if (this.blockingValue & 1) {
                this.isResetDeviceButtonVisible(true);
            }

            if (this.blockingValue & 2) {
                this.isTryAgainButtonVisible(true);
            }

            if (this.blockingValue & 4) {
                this.shouldShowSignOutButtonAsync().then(function (result) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_DisplayErrorButtons_ShouldShowSignoutInstead ", result);
                    if (result) {
                        hyperlinkValue |= this.SHOW_SIGN_OUT;
                    } else {
                        hyperlinkValue |= this.SHOW_CONTINUE_ANYWAY;
                    }

                    if (this.showCollectLogs) {
                        hyperlinkValue |= this.SHOW_COLLECT_LOGS;
                    }

                    this.hyperlinkVisibility(hyperlinkValue);
                }.bind(this));
            }
        }

        logFailureEvent(failureName, e) {
            try {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                    JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
            } catch (e) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName);
            }
        }
    }
    return provisioningProgressViewModel;
});
