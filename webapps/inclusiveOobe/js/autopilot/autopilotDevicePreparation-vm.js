//
// Copyright (C) Microsoft. All rights reserved.
//

"use strict";

define([
    'lib/knockout',
    'legacy/bridge',
    'legacy/events',
    'legacy/appObjectFactory', // necessary for OOBE framework, even though not directly used here
    'autopilot/commercialDiagnosticsUtilities'], (
        ko,
        bridge,
        constants,
        appObjectFactory, // necessary for OOBE framework, even though not directly used here
        commercialDiagnosticsUtilities) => {
    class autopilotDevicePreparationViewModel {
        constructor(
            resourceStrings,
            targetPersonality,
            sessionUtilities) {

            // Constants
            this.sessionId = "02370B0D-6080-4DA9-B51C-816CE125F020";

            // Autopilot orchestrator timeout to register the IAutopilotDevicePreparationOrchestrator related instances. (5 min)
            this.AUTOPILOT_ORCHESTRATOR_TIMEOUT_IN_MS = 5 * 60 * 1000;

            // Button visibility bitmasks
            this.BUTTON_ID_NONE = 0;
            this.BUTTON_ID_NEXT = 1;
            this.BUTTON_ID_SKIP = 2;
            this.BUTTON_ID_RESET = 4;

            this.DEFAULT_BUTTON_ID_SET = this.BUTTON_ID_NEXT;

            // Hyperlink visibility bitmasks
            this.HYPERLINK_ID_NONE = 0;

            // Virtual page IDs
            this.VIRTUAL_PAGE_NONE = "None";
            this.VIRTUAL_PAGE_IN_PROGRESS = "InProgressVirtualPage";
            this.VIRTUAL_PAGE_SUCCESS = "SuccessVirtualPage";
            this.VIRTUAL_PAGE_UNRECOVERABLE_ERROR = "UnrecoverableError";

            // Page transition IDs
            this.PAGE_TRANSITION_POST_DPP_SUCCESS_PAGE = CloudExperienceHost.AppResult.success;

            // DPP commands constants
            this.DPP_PHASE_ID_ON_SUCCESSFUL_DPP_PAGE_EXIT = "onSuccessfulDppPageExit";
            this.DPP_PHASE_ID_ON_AGENT_DOWNLOAD = "onAgentDownload";
            this.DPP_PHASE_ID_ON_AGENT_PROVISIONING = "onAgentProvisioning";
            this.DPP_PHASE_ID_ON_DEVICE_REBOOT = "onDeviceReboot";

            // Lottie animations
            this.LOTTIE_FILE_SUCCESS = "autopilotLottie.json";
            this.LOTTIE_FILE_ERROR = "errorLottie.json";

            // Logs export constants
            this.DIAGNOSTICS_LOGS_EXPORT_AREA_DEFAULT = "Autopilot;TPM";
            this.DIAGNOSTICS_LOGS_EXPORT_FILE_NAME = "MDMDiagReport.zip";
            this.DIAGNOSTICS_LOGS_EXPORT_MAX_DURATION_IN_MILLISECONDS = 3 * 60 * 1000; // 3 minutes;

            // Event listener ID
            this.EVENT_LISTENER_ID_AGENT_READY = "agentreadyevent";
            this.EVENT_LISTENER_ID_PROGRESS_UPDATE = "progressupdated";
            this.EVENT_LISTENER_ID_SESSION_CONNECTION_CHANGED = "sessionconnectionchanged";

            // Persistent state names
            this.AUTOPILOT_ORCHESTRATOR_PROGRESS_MS = "DevicePrep.Global.AutopilotOrchestratorProgressInMiliseconds";
            this.AUTOPILOT_ORCHESTRATOR_PROGRESS_PERCENT = "DevicePrep.Global.AutopilotOrchestratorProgressPercentage";
            this.AUTOPILOT_ORCHESTRATOR_AGENT_INSTALLED = "DevicePrep.Global.AutopilotOrchestratorAgentInstalled";

            // Persistent flag indicating that the device was last rebooted by this page.
            this.LAST_REBOOTER_VALUE_NAME = "DevicePrep.Global.LastRebooter";
            this.LAST_REBOOTER_VALUE_DEVICE_PREP_PAGE = "DevicePrepPage";

            // Default wait time to show final completion percentage before transitioning to next page (3 seconds)
            this.HOLD_COMPLETION_PERCENTAGE_IN_MILLISECONDS = 3 * 1000;

            // Default wait time to show final completion percentage before transitioning to next page (3 seconds)
            this.HOLD_REBOOT_REQUIRED_MESSAGE_IN_MILLISECONDS = 3 * 1000;

            // Default wait time for a device reboot (3 minutes)
            this.MAX_WAIT_FOR_REBOOT_IN_MILLISECONDS = 3 * 60 * 1000;

            // Event for the page in navigation.json indicating a reboot.
            this.PAGE_EVENT_REBOOT = constants.AppResult.action1;

            // Default wait time for the MDM Alert sync session (2 minutes)
            this.MAX_WAIT_FOR_ALERT_SESSION_IN_MILLISECONDS = 2 * 60 * 1000;

            // HRESULTs
            this.HRESULT_SUCCESS = 0x00000000;
            this.HRESULT_TIME_OUT = 0x800705B4;
            this.HRESULT_INVALIDARG = 0x80070057;
            this.HRESULT_E_UNEXPECTED = 0x8000FFFF;
            this.HRESULT_E_FAIL = 0x80004005;

            // MDM results parameters
            this.FEATURE_NAME = "DevicePreparation";
            this.MDM_ALERT_TYPE = "com.microsoft.mdm.deviceprepresult";

            // Phases
            this.PHASE_UNKNOWN = "0";
            this.PHASE_PRESTART = "1";
            this.PHASE_AGENT_DOWNLOAD = "2";
            this.PHASE_AGENT_INITIALIZATION = "3";
            this.PHASE_AGENT_PROVISIONING = "4";
            this.PHASE_AGENT_REBOOT = "5";
            this.PHASE_CLEANUP = "6";

            // Names of variables to store
            this.PAGE_ERROR_PHASE = "DevicePreparation/PageErrorPhase";
            this.PAGE_ERROR_CODE = "DevicePreparation/PageErrorCode";
            this.PAGE_ERROR_DETAILS = "DevicePreparation/PageErrorDetails";

            // Troubleshooting model metadata
            this.TSM_PROCESS_NAME = "DevicePrepPage";
            this.TSM_STATE_PAGE_START = this.namespaceTsmState("PageStart");  // Namespace the state names
            this.TSM_STATE_PAGE_EXIT_WITH_SUCCESS = this.namespaceTsmState("PageExitWithSuccess");
            this.TSM_STATE_PAGE_EXIT_CONTINUE_ON_FAILURE = this.namespaceTsmState("PageExitContinueOnFailure");
            this.TSM_STATE_PAGE_TERMINAL_BLOCKING_FAILURE = this.namespaceTsmState("PageTerminalBlockingFailure");
            this.TSM_STATE_PAGE_INITIALIZATION_START = this.namespaceTsmState("PageInitializationStart");
            this.TSM_STATE_PAGE_INITIALIZATION_END_WITH_SUCCESS = this.namespaceTsmState("PageInitializationEndWithSuccess");
            this.TSM_STATE_PAGE_INITIALIZATION_END_WITH_ERROR = this.namespaceTsmState("PageInitializationEndWithError");
            this.TSM_STATE_PROGRESS_DISPLAY_INITIATION_START = this.namespaceTsmState("ProgressDisplayInitiationStart");
            this.TSM_STATE_PROGRESS_DISPLAY_INITIATION_END_WITH_SUCCESS = this.namespaceTsmState("ProgressDisplayInitiationEndWithSuccess");
            this.TSM_STATE_PROGRESS_DISPLAY_INITIATION_END_WITH_ERROR = this.namespaceTsmState("ProgressDisplayInitiationEndWithError");
            this.TSM_STATE_PROGRESS_TIMED_OUT_WITH_ERROR = this.namespaceTsmState("ProgressTimedOutWithError");
            this.TSM_STATE_PROGRESS_END_WITH_ERROR = this.namespaceTsmState("ProgressEndWithError");
            this.TSM_STATE_BACKGROUND_SYNC_SESSIONS_INITIATION_START = this.namespaceTsmState("BackgroundSyncSessionsInitiationStart");
            this.TSM_STATE_BACKGROUND_SYNC_SESSIONS_INITIATION_END_WITH_SUCCESS = this.namespaceTsmState("BackgroundSyncSessionsInitiationEndWithSuccess");
            this.TSM_STATE_BACKGROUND_SYNC_SESSIONS_INITIATION_END_WITH_ERROR = this.namespaceTsmState("BackgroundSyncSessionsInitiationEndWithError");
            this.TSM_STATE_AGENT_DOWNLOAD_INSTALL_START = this.namespaceTsmState("AgentDownloadInstallStart");
            this.TSM_STATE_AGENT_DOWNLOAD_INSTALL_END_WITH_SUCCESS = this.namespaceTsmState("AgentDownloadInstallEndWithSuccess");
            this.TSM_STATE_AGENT_DOWNLOAD_INSTALL_END_WITH_ERROR = this.namespaceTsmState("AgentDownloadInstallEndWithError");
            this.TSM_STATE_AGENT_INITIALIZATION_START = this.namespaceTsmState("AgentInitializationStart");
            this.TSM_STATE_AGENT_INITIALIZATION_END_WITH_SUCCESS = this.namespaceTsmState("AgentInitializationEndWithSuccess");
            this.TSM_STATE_AGENT_INITIALIZATION_END_WITH_ERROR = this.namespaceTsmState("AgentInitializationEndWithError");
            this.TSM_STATE_AGENT_PROVISIONING_START = this.namespaceTsmState("AgentProvisioningStart");
            this.TSM_STATE_AGENT_PROVISIONING_END_WITH_SUCCESS = this.namespaceTsmState("AgentProvisioningEndWithSuccess");
            this.TSM_STATE_AGENT_PROVISIONING_END_WITH_ERROR = this.namespaceTsmState("AgentProvisioningEndWithError");
            this.TSM_STATE_DEVICE_REBOOT_START = this.namespaceTsmState("DeviceRebootStart");
            this.TSM_STATE_DEVICE_REBOOT_END_WITH_SUCCESS = this.namespaceTsmState("DeviceRebootEndWithSuccess");
            this.TSM_STATE_DEVICE_REBOOT_END_WITH_ERROR = this.namespaceTsmState("DeviceRebootEndWithError");
            this.TSM_STATE_PAGE_CLEANUP_START = this.namespaceTsmState("PageCleanupStart");
            this.TSM_STATE_PAGE_CLEANUP_END_WITH_SUCCESS = this.namespaceTsmState("PageCleanupEndWithSuccess");
            this.TSM_STATE_PAGE_CLEANUP_END_WITH_ERROR = this.namespaceTsmState("PageCleanupEndWithError");
            this.TSM_STATE_PAGE_RESULTS_UX_RENDERING_START = this.namespaceTsmState("PageResultsUxRenderingStart");
            this.TSM_STATE_PAGE_RESULTS_UX_RENDERING_END_WITH_SUCCESS = this.namespaceTsmState("PageResultsUxRenderingEndWithSuccess");
            this.TSM_STATE_PAGE_RESULTS_UX_RENDERING_END_WITH_ERROR = this.namespaceTsmState("PageResultsUxRenderingEndWithError");
            this.TSM_STATE_PAGE_RESULTS_TRANSMISSION_TO_MDM_SERVER_START = this.namespaceTsmState("PageResultsTransmissionToMdmServerStart");
            this.TSM_STATE_PAGE_RESULTS_TRANSMISSION_TO_MDM_SERVER_END_WITH_SUCCESS = this.namespaceTsmState("PageResultsTransmissionToMdmServerEndWithSuccess");
            this.TSM_STATE_PAGE_RESULTS_TRANSMISSION_TO_MDM_SERVER_END_WITH_ERROR = this.namespaceTsmState("PageResultsTransmissionToMdmServerEndWithError");

            // Private member variables
            this.resourceStrings = resourceStrings;
            this.sessionUtilities = sessionUtilities;
            this.commercialDiagnosticsUtilities = new commercialDiagnosticsUtilities(this.sessionUtilities);
            this.autopilotLogger = new ModernDeployment.Autopilot.Core.AutopilotLogging();
            this.deviceManagementUtilities = new ModernDeployment.Autopilot.Core.DeviceManagementUtilities();
            this.autopilotDevicePreparationUtilities = new ModernDeployment.Autopilot.Core.AutopilotDevicePreparationUtilities();
            this.progressCounterMilliseconds = 0;
            this.completionPercentage = 0;
            this.agentReadyListenerRegistered = false;
            this.agentProgressListenerRegistered = false;
            this.isProvisoningComplete = false;
            this.provisioningTimedOut = false;
            this.pageProgressUpdateIntervalId = 0;
            this.currentPhase = this.PHASE_UNKNOWN;
            this.currentResultCode = "";
            this.currentDetails = "";
            this.terminalVirtualPageAlreadyDisplayed = false;

            // Resource strings (must come after private member variables section above)
            this.COMPLETION_PERCENTAGE_FORMAT_TEMPLATE = this.resourceStrings["DevicePrepCompletionPercentage"];

            // Initialize data-bound web controls' values.
            this.isLiteWhitePersonality = ko.observable(targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite);
            this.showProgress = ko.observable(true);
            this.commercialDiagnosticsUtilities.logInfoEventName(this.isLiteWhitePersonality() ? "DevicePrepPage_LiteWhitePersonalityDetected_True" : "DevicePrepPage_LiteWhitePersonalityDetected_False");

            this.pageTitle = ko.observable(this.resourceStrings["DevicePrepPageTitleInProgress"]);
            this.pageLeadText = ko.observable("");
            this.subheaderText = ko.observable(this.resourceStrings["DevicePrepPageSubheaderInProgress"]);
            this.progressStatusText = ko.observable(this.commercialDiagnosticsUtilities.formatMessage(
                this.COMPLETION_PERCENTAGE_FORMAT_TEMPLATE,
                this.completionPercentage));
            this.progressStatusSubtext = ko.observable(this.resourceStrings["DevicePrepDefaultStatusSubtextAgentInstalling"]);
            this.errorOccurred = ko.observable(false);
            this.isResetButtonClicked = ko.observable(true);
            this.currentButtonIdSet = ko.observable(this.DEFAULT_BUTTON_ID_SET);
            this.skipButtonDescription = ko.observable(this.resourceStrings["DevicePrepSkipButtonDescription"]);
            this.skipButtonDisplayed = ko.observable(false);
            this.resetButtonDescription = ko.observable(this.resourceStrings["DevicePrepResetButtonDescription"]);
            this.resetButtonDisplayed = ko.observable(false);
            this.exportLogsLinkDisplayed = ko.observable(false);
            this.exportLogsLinkEnabled = ko.observable(true);
            this.exportLogsLinkText = ko.observable(this.resourceStrings["DevicePrepExportLogsLink"]);

            // Initialize button sets
            this.buttons = {};
            this.buttons[this.BUTTON_ID_NEXT] = {
                automationId: "idNextButton",
                buttonText: this.resourceStrings["DevicePrepNextButton"],
                buttonType: "button",
                isPrimaryButton: true,
                autoFocus: false,
                isVisible: true,
                disableControl: false,
                buttonClickHandler: () => {
                    this.onNextButtonClickAsync();
                }
            };

            this.buttons[this.BUTTON_ID_SKIP] = {
                automationId: "idSkipButton",
                buttonText: this.resourceStrings["DevicePrepSkipButton"],
                buttonType: "button",
                isPrimaryButton: false,
                autoFocus: false,
                isVisible: true,
                disableControl: ko.pureComputed(() => {
                    return !this.isResetButtonClicked();
                }),
                buttonClickHandler: () => {
                    this.onSkipButtonClickAsync();
                }
            };

            this.buttons[this.BUTTON_ID_RESET] = {
                automationId: "idResetButton",
                buttonText: this.resourceStrings["DevicePrepResetButton"],
                buttonType: "button",
                isPrimaryButton: false,
                autoFocus: false,
                isVisible: true,
                disableControl: ko.pureComputed(() => {
                    return !this.isResetButtonClicked();
                }),
                buttonClickHandler: () => {
                    this.onResetButtonClickAsync();
                }
            };

            // Set up the button groupings.
            const flexEndButtonSets = {};
            flexEndButtonSets[this.BUTTON_ID_NONE] = [];
            flexEndButtonSets[this.BUTTON_ID_NEXT] = [this.BUTTON_ID_NEXT];
            flexEndButtonSets[this.BUTTON_ID_RESET | this.BUTTON_ID_SKIP] = [this.BUTTON_ID_RESET, this.BUTTON_ID_SKIP];
            flexEndButtonSets[this.BUTTON_ID_RESET] = [this.BUTTON_ID_RESET];

            this.flexEndButtons = ko.pureComputed(() => {
                if (flexEndButtonSets[this.currentButtonIdSet()] === undefined) {
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_ButtonSetting_Failed",
                        "DevicePrepPage: No button combo for visibility flag set " +
                        this.commercialDiagnosticsUtilities.formatNumberAsHexString(this.currentButtonIdSet(), 8));

                    // Return the default button.
                    return this.getButtonSetToDisplay(flexEndButtonSets[this.DEFAULT_BUTTON_ID_SET]);
                }

                return this.getButtonSetToDisplay(flexEndButtonSets[this.currentButtonIdSet()]);
            });

            // Set up the hyperlink groupings.
            const flexStartHyperlinksSets = {};
            flexStartHyperlinksSets[this.HYPERLINK_ID_NONE] = [];

            this.flexStartHyperLinks = ko.pureComputed(() => {
                // Lite personality doesn't have the same support for hyperlinks as Inclusive Blue
                return flexStartHyperlinksSets[this.HYPERLINK_ID_NONE];
            });

            // Initialize the virtual pages map.
            this.virtualPages = [];

            this.virtualPages[this.VIRTUAL_PAGE_IN_PROGRESS] = {
                pageTitle: this.resourceStrings["DevicePrepPageTitleInProgress"],
                subheaderText: this.resourceStrings["DevicePrepPageSubheaderInProgress"],
                showProgress: true
            };

            this.virtualPages[this.VIRTUAL_PAGE_SUCCESS] = {
                pageTitle: this.resourceStrings["DevicePrepPageTitleSuccess"],
                subheaderText: this.resourceStrings["DevicePrepPageSubheaderSuccess"],
                showProgress: false,
                showExportLogsLink: false, // Don't show the export logs link on the success page.
                stopPageProgressUpdateInterval: true,
                currentButtonIdSet: this.BUTTON_ID_NEXT,
                lottieAnimation: this.LOTTIE_FILE_SUCCESS
            };

            this.subheaderErrorText = this.resourceStrings["DevicePrepPageSubheaderError"];
            if (this.autopilotDevicePreparationUtilities.errorMessage !== undefined) {
                this.subheaderErrorText = this.autopilotDevicePreparationUtilities.errorMessage;
            }

            this.virtualPages[this.VIRTUAL_PAGE_UNRECOVERABLE_ERROR] = {
                pageTitle: this.resourceStrings["DevicePrepPageTitleError"],
                subheaderText: this.subheaderErrorText,
                colorSubheaderTextWithError: true,
                showProgress: false,
                showExportLogsLink: this.autopilotDevicePreparationUtilities.showDiagnosticsLink,
                stopPageProgressUpdateInterval: true,
                currentButtonIdSet: (this.BUTTON_ID_RESET | this.BUTTON_ID_SKIP),
                lottieAnimation: this.LOTTIE_FILE_ERROR
            };

            // By default, display the in progress virtual page.  No await since the constructor is not async.
            this.displayVirtualPageAsync(this.VIRTUAL_PAGE_IN_PROGRESS);

            // Signal to OOBE to finally display the page.
            bridge.fireEvent(CloudExperienceHost.Events.visible, true);

            // Put things critical for page visibility before the fireEvent call above.

            // Start main processing only after all the UI containers are initialized.
            let initializationPromise = this.waitForDebuggerAttachmentAsync().then(() => {
                // TSM logging
                return this.logTsmProcessStartAsync(this.TSM_STATE_PAGE_START, "").then(() => {
                    return this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_INITIALIZATION_START, "");
                })
            }).then(() => {
                // Set OOBE to resume to this page on any reboot.
                return this.setResumeToCurrentPageAsync();
            }).then(() => {
                return this.logIfDeviceRebootedByPageAsync();
            }).then(() => {
                // Set the progress counter to the last known value.
                return this.loadPersistedPageInfoAsync();
            }).then(() => {
                // This must always be right before the next big, main logic block.
                return this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_INITIALIZATION_END_WITH_SUCCESS, "").then(() => {
                    this.currentPhase = this.PHASE_PRESTART;

                    return this.logTsmProcessInfoAsync(this.TSM_STATE_PROGRESS_DISPLAY_INITIATION_START, "");
                });
            }).then(() => {

                this.isProvisoningComplete = false;

                // Increment the completion percentage 1 percent at each interval, up to 100.
                // By default, show 1 % completion at the start, so omit it from here; hence, 99.
                let intervalInMilliseconds = (this.autopilotDevicePreparationUtilities.pageTimeoutSeconds * 1000) / 99;

                // Set the completion percentage to 1% at the start for first run only.
                if (this.completionPercentage === 0) {
                    this.completionPercentage = 1;
                }

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_ProgressPercentage_CounterStarted",
                    `DevicePrepPage: Starting page progress counter at ${this.completionPercentage} percent with ${this.progressCounterMilliseconds} ms completed using interval ${intervalInMilliseconds} ms.`);

                this.progressStatusText(this.commercialDiagnosticsUtilities.formatMessage(
                    this.COMPLETION_PERCENTAGE_FORMAT_TEMPLATE,
                    this.completionPercentage));

                // On a steady interval, depending on what the page timeout is, increase the percentage by 1 so the progress
                // wheel increases over time.
                this.pageProgressUpdateIntervalId = setInterval(
                    async () => {
                        try {
                            if ((this.completionPercentage >= 100) || this.isProvisoningComplete) {
                                // Set to 100%.
                                this.commercialDiagnosticsUtilities.logInfoEvent(
                                    "DevicePrepPage_ProgressPercentage_Success",
                                    "DevicePrepPage: Provisioning completed. Setting page progress percentage to 100%.");

                                this.completionPercentage = 100;
                                this.progressStatusText(this.commercialDiagnosticsUtilities.formatMessage(
                                    this.COMPLETION_PERCENTAGE_FORMAT_TEMPLATE,
                                    this.completionPercentage));

                                // Stop the page progress update interval.
                                if (this.pageProgressUpdateIntervalId != 0) {
                                    clearInterval(this.pageProgressUpdateIntervalId);
                                    this.pageProgressUpdateIntervalId = 0;

                                    this.commercialDiagnosticsUtilities.logInfoEvent(
                                        "DevicePrepPage_ProgressPercentage_Success",
                                        "DevicePrepPage: Stopped page progress percentage updates due to reaching 100%.");
                                }
                            } else {
                                this.completionPercentage++;
                                this.progressCounterMilliseconds += intervalInMilliseconds;

                                // Update the persistent state with the latest progress.
                                await bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.AUTOPILOT_ORCHESTRATOR_PROGRESS_MS, this.progressCounterMilliseconds);
                                await bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.AUTOPILOT_ORCHESTRATOR_PROGRESS_PERCENT, this.completionPercentage);

                                if (this.completionPercentage === 100) {
                                    this.provisioningTimedOut = true;

                                    this.commercialDiagnosticsUtilities.logErrorEvent(
                                        "DevicePrepPage_ProgressPercentage_ErrorTimedOut",
                                        "DevicePrepPage: Timed out waiting on background processes.",
                                        this.HRESULT_TIME_OUT);

                                    await this.logTsmProcessInfoAsync(this.TSM_STATE_PROGRESS_TIMED_OUT_WITH_ERROR, "");

                                    await this.displayVirtualPageAsync(
                                        this.VIRTUAL_PAGE_UNRECOVERABLE_ERROR,
                                        {
                                            phase: this.currentPhase,
                                            resultCode: this.commercialDiagnosticsUtilities.formatNumberAsHexString(this.HRESULT_TIME_OUT, 8),
                                            details: "DevicePrepPage: Timed out waiting on background processes."
                                        });

                                } else {
                                    this.progressStatusText(this.commercialDiagnosticsUtilities.formatMessage(
                                        this.COMPLETION_PERCENTAGE_FORMAT_TEMPLATE,
                                        this.completionPercentage));

                                    this.commercialDiagnosticsUtilities.logInfoEvent(
                                        "DevicePrepPage_ProgressPercentage_Success",
                                        `DevicePrepPage: Page progress percentage incremented to: ${this.completionPercentage}`);
                                }
                            }
                        } catch (e) {
                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "DevicePrepPage_ProgressPercentage_FailedUnexpectedly",
                                "DevicePrepPage: Page progress handler caught an exception",
                                e);

                            await this.logTsmProcessInfoAsync(this.TSM_STATE_PROGRESS_END_WITH_ERROR, this.serializeErrorObject(e));

                            await this.displayVirtualPageAsync(
                                this.VIRTUAL_PAGE_UNRECOVERABLE_ERROR,
                                {
                                    phase: this.currentPhase,
                                    resultCode: this.commercialDiagnosticsUtilities.formatNumberAsHexString(this.HRESULT_E_UNEXPECTED, 8),
                                    details: "DevicePrepPage: Page progress handler caught an exception. " + this.serializeErrorObject(e)
                                });
                        }
                    },
                    intervalInMilliseconds);

                // Start the main processing of the page  i.e., not returning anything.
                return this.logTsmProcessInfoAsync(this.TSM_STATE_PROGRESS_DISPLAY_INITIATION_END_WITH_SUCCESS, "").then(() => {
                    return this.runMainProcessingAsync();
                });

            }).done(
                () => {
                },

                (e) => {
                    this.commercialDiagnosticsUtilities.logExceptionEvent(
                        "DevicePrepPage_Initialization_Failed",
                        "DevicePrepPage: Failed page view model initialization",
                        e);

                    let stateName = "";

                    switch (this.currentPhase) {
                        case this.PHASE_UNKNOWN:
                            stateName = this.TSM_STATE_PAGE_INITIALIZATION_END_WITH_ERROR;
                            break;

                        case this.PHASE_PRESTART:
                            stateName = this.TSM_STATE_PROGRESS_DISPLAY_INITIATION_END_WITH_ERROR;
                            break;

                        default:
                            // All other phases should handle their own TSM logging in their respective functions.
                            break;
                    }

                    return this.logTsmProcessInfoAsync(stateName, this.serializeErrorObject(e)).then(() => {
                        return this.displayVirtualPageAsync(
                            this.VIRTUAL_PAGE_UNRECOVERABLE_ERROR,
                            {
                                phase: this.currentPhase,
                                resultCode: this.currentResultCode,
                                details: this.serializeErrorObject(e)
                            });
                    });

                });

            return initializationPromise;
        }

        namespaceTsmState(stateName) {
            return this.TSM_PROCESS_NAME + "." + stateName;
        }

        serializeErrorObject(error) {
            return "[" + error.stack + "]";
        }

        async logTsmProcessStartAsync(stateName, eventMessage) {
            await this.commercialDiagnosticsUtilities.logTroubleshootingModelProcessStartEventAsync(
                this.TSM_PROCESS_NAME,
                stateName,
                eventMessage
            );
        }

        async logTsmProcessEndAsync(stateName, eventMessage) {
            await this.commercialDiagnosticsUtilities.logTroubleshootingModelProcessEndEventAsync(
                this.TSM_PROCESS_NAME,
                stateName,
                eventMessage
            );
        }

        async logTsmProcessInfoAsync(stateName, eventMessage) {
            await this.commercialDiagnosticsUtilities.logTroubleshootingModelProcessInfoEventAsync(
                this.TSM_PROCESS_NAME,
                stateName,
                eventMessage
            );
        }

        async setResumeToCurrentPageAsync() {
            // Enable resuming to the DPP after a reboot.
            this.commercialDiagnosticsUtilities.logInfoEventName("DevicePrepPage_RebootResumption_Set");

            await bridge.invoke("CloudExperienceHost.AutoPilot.DevicePreparationPage.setResumeToCurrentPageAsync");
        }

        async logIfDeviceRebootedByPageAsync() {
            let lastRebooter = await this.sessionUtilities.getSettingAsync(this.LAST_REBOOTER_VALUE_NAME);

            if ((lastRebooter !== undefined) &&
                (lastRebooter !== null) &&
                (lastRebooter == this.LAST_REBOOTER_VALUE_DEVICE_PREP_PAGE)) {
                // This page is resuming from an intentional reboot by this page.  Clear this flag.
                await this.logTsmProcessInfoAsync(this.TSM_STATE_DEVICE_REBOOT_END_WITH_SUCCESS, "");

                await this.sessionUtilities.storeSettingAsync(this.LAST_REBOOTER_VALUE_NAME, "");
            }
        }

        async loadPersistedPageInfoAsync() {
            let progressValueMs = await bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.AUTOPILOT_ORCHESTRATOR_PROGRESS_MS);
            let progressValuePercent = await bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.AUTOPILOT_ORCHESTRATOR_PROGRESS_PERCENT);
            let agentAlreadyInstalled = await bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.AUTOPILOT_ORCHESTRATOR_AGENT_INSTALLED);

            if ((progressValueMs !== null) && (progressValueMs !== undefined) && (progressValueMs >= 1)) {
                this.progressCounterMilliseconds = progressValueMs;
            }

            if ((progressValuePercent !== null) && (progressValuePercent !== undefined) && (progressValuePercent >= 1)) {
                this.completionPercentage = progressValuePercent;
            }

            if (agentAlreadyInstalled === true) {
                // Set the correct subtext for the page.
                this.progressStatusSubtext(this.resourceStrings["DevicePrepDefaultStatusSubtextProvisioning"]);
            }

            this.commercialDiagnosticsUtilities.logInfoEvent(
                "DevicePrepPage_Initialization_PersistedPageInfoLoadComplete",
                `DevicePrepPage: Finished loading page info; completion percentage = ${this.completionPercentage} percent; progress duration = ${this.progressCounterMilliseconds} ms; agent already installed = ${agentAlreadyInstalled}.`);
        }

        unsetResumeToCurrentPageAsync() {
            // Disable resuming to the DPP after a reboot.
            this.commercialDiagnosticsUtilities.logInfoEventName("DevicePrepPage_RebootResumption_Unset");

            return bridge.invoke("CloudExperienceHost.AutoPilot.DevicePreparationPage.unsetResumeToCurrentPageAsync");
        }

        waitForDebuggerAttachmentAsync() {
            return this.sessionUtilities.getSettingAsync(this.sessionUtilities.STATE_NAME_GLOBAL_SHOULD_WAIT_FOR_DEBUGGER_ATTACH).then((debuggerFlagValue) => {
                if ((null === debuggerFlagValue) || (debuggerFlagValue.length === 0)) {
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_DebuggerAttachment_Success",
                        `DevicePrepPage: Done waiting for debugger to attach (value == ${debuggerFlagValue}).`);

                    return WinJS.Promise.as(true);
                }

                this.commercialDiagnosticsUtilities.logInfoEvent("DevicePrepPage_DebuggerAttachment_Waiting", "DevicePrepPage: Waiting 5 seconds for debugger to attach.");

                // Loop every 5 seconds waiting for debugger attachment.
                return WinJS.Promise.timeout(5000).then(() => {
                    return this.waitForDebuggerAttachment();
                });
            });
        }

        getButtonSetToDisplay(currentButtonIdSet) {
            let buttonSet = [];
            let lastButton = null;

            // These flags govern whether to display descriptions of the corresponding buttons.
            // Set these flags to true only if the buttons being retrieved match.
            this.skipButtonDisplayed(false);
            this.resetButtonDisplayed(false);

            for (let i = 0; i < currentButtonIdSet.length; i++) {
                let button = this.buttons[currentButtonIdSet[i]];
                let appendButton = true;

                // Set appropriate button description visibility.  These are the only two button descriptions.
                if (currentButtonIdSet[i] === this.BUTTON_ID_SKIP) {
                    if (this.autopilotDevicePreparationUtilities.allowSkipOnError) {
                        this.skipButtonDisplayed(true);
                    } else {
                        this.commercialDiagnosticsUtilities.logInfoEvent(
                            "DevicePrepPage_GetButtonSetToDisplay_HidingSkipButtonByPolicy",
                            "DevicePrepPage: Skip button hidden due to policy.");

                        appendButton = false;
                    }
                }

                if (currentButtonIdSet[i] === this.BUTTON_ID_RESET) {
                    this.resetButtonDisplayed(true);
                }

                if (appendButton) {
                    lastButton = button;
                    buttonSet.push(button);
                }
            }

            if ((lastButton != undefined) && (lastButton != null)) {
                // If this is the last button, make it primary.
                lastButton.isPrimaryButton = true;
            }

            if (!this.autopilotDevicePreparationUtilities.showDiagnosticsLink) {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_GetButtonSetToDisplay_HidingExportLogsLinkByPolicy",
                    "DevicePrepPage: Export logs link hidden due to policy.");
            }

            return buttonSet;
        }

        onNextButtonClickAsync() {
            this.commercialDiagnosticsUtilities.logInfoEvent(
                "DevicePrepPage_NextButtonClicked_Started",
                "DevicePrepPage: Next button selected");

            return this.exitPageAsync(ModernDeployment.Autopilot.Core.DevicePreparationPageStatus.exitedOnSuccess);
        }

        onSkipButtonClickAsync() {
            this.commercialDiagnosticsUtilities.logInfoEvent(
                "DevicePrepPage_SkipButtonClicked_Started",
                "DevicePrepPage: Skip button selected");

            return this.exitPageAsync(ModernDeployment.Autopilot.Core.DevicePreparationPageStatus.continuedToExitOnFailure);
        }

        onResetButtonClickAsync() {
            this.commercialDiagnosticsUtilities.logInfoEvent(
                "DevicePrepPage_ResetButtonClicked_Started",
                "DevicePrepPage: Reset button selected");

            // Disable the button so the user can't press it multiple times in a row.
            this.isResetButtonClicked(false);

            let pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
            return pluginManager.initiateSystemResetAsync().then(
                () => {
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_DeviceResetInitiation_Succeeded",
                        "DevicePrepPage: Device reset was initiated successfully.");
                },
                (e) => {
                    // Error happened, re-enable the button
                    this.isResetButtonClicked(true);
                    this.commercialDiagnosticsUtilities.logExceptionEvent(
                        "DevicePrepPage_DeviceResetInitiation_Failed",
                        "DevicePrepPage: Device reset initiation failed.",
                        e);
                });
        }

        onExportLogsLinkClickAsync() {
            if (!this.exportLogsLinkEnabled()) {
                this.commercialDiagnosticsUtilities.logInfoEventName("DevicePrepPage_ExportLogs_AlreadyRunning");
                return;
            }

            // Disable the link so the user can't click this many times in parallel.
            this.exportLogsLinkEnabled(false);

            this.commercialDiagnosticsUtilities.logInfoEventName("DevicePrepPage_ExportLogs_Started");

            return bridge.invoke("CloudExperienceHost.showFolderPicker").then(
                (folderPath) => {
                    let hasTimedOut = false;

                    this.commercialDiagnosticsUtilities.logInfoEventName("DevicePrepPage_ExportLogs_FolderPicked");

                    return WinJS.Promise.timeout(
                        this.DIAGNOSTICS_LOGS_EXPORT_MAX_DURATION_IN_MILLISECONDS,
                        this.sessionUtilities.enrollmentApis.collectLogsEx(this.DIAGNOSTICS_LOGS_EXPORT_AREA_DEFAULT, folderPath + "\\" + this.DIAGNOSTICS_LOGS_EXPORT_FILE_NAME)).then(
                            // Case: Promise completion before time out
                            () => {
                                if (hasTimedOut) {
                                    // Operation timed out already.  No need to do anything else.
                                    return;
                                }

                                this.commercialDiagnosticsUtilities.logInfoEventName("DevicePrepPage_ExportLogs_Succeeded");

                                // Success
                                this.exportLogsLinkEnabled(true);
                            },

                            // Case: Timed out
                            (e) => {
                                this.commercialDiagnosticsUtilities.logExceptionEvent(
                                    "DevicePrepPage_ExportLogs_Failed",
                                    "DevicePrepPage: Logs export timed out.",
                                    e);

                                hasTimedOut = true;
                                this.exportLogsLinkEnabled(true);
                            });
                },
                (e) => {
                    this.commercialDiagnosticsUtilities.logExceptionEvent(
                        "DevicePrepPage_ExportLogs_Failed",
                        "DevicePrepPage: Folder picker failed, usually because the user clicked Cancel.",
                        e);
                    this.exportLogsLinkEnabled(true);
                });
        }

        async sendResultsToMdmServerAsync(result) {
            try {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_SendResultsToMdmServer_Started",
                    "DevicePrepPage: Sending page results to the MDM server.");

                await this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_RESULTS_TRANSMISSION_TO_MDM_SERVER_START, "Results = " + result);

                // No await because this is best effort.
                this.deviceManagementUtilities.sendMdmAlertMessageAsync(
                    this.FEATURE_NAME,
                    this.MDM_ALERT_TYPE,
                    result,
                    this.MAX_WAIT_FOR_ALERT_SESSION_IN_MILLISECONDS);

                await this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_RESULTS_TRANSMISSION_TO_MDM_SERVER_END_WITH_SUCCESS, "Results = " + result);

            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "DevicePrepPage_SendResultsToMdmServer_Failed",
                    "DevicePrepPage: Failed to send page results to the MDM server.",
                    e);

                await this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_RESULTS_TRANSMISSION_TO_MDM_SERVER_END_WITH_ERROR, this.serializeErrorObject(e));
            }
        }

        async runCommonPageExitAsync() {
            // This method is run on exit, success or error.
            await this.unsetResumeToCurrentPageAsync();
        }

        isTerminalVirtualPageId(virtualPageId) {
            return (virtualPageId == this.VIRTUAL_PAGE_SUCCESS) || (virtualPageId == this.VIRTUAL_PAGE_UNRECOVERABLE_ERROR);
        }

        async displayVirtualPageAsync(virtualPageId, resultsToSendToMdmServer) {
            try {
                if (this.terminalVirtualPageAlreadyDisplayed) {
                    // If a terminal virtual page is already displayed, don't override it.
                    // This can happen if the progress reaches 100% before the other background processes
                    // (e.g., agent download or provisioning) completes, despite our best efforts
                    // to bypass those background processes.
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_DisplayVirtualPage_BypassingVirtualPageTransitioning",
                        "DevicePrepPage: Bypass transitioning virtual page since the page reached a terminal state already.");

                    return;
                }

                if (this.isTerminalVirtualPageId(virtualPageId)) {
                    await this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_RESULTS_UX_RENDERING_START, "Virtual page ID = " + virtualPageId);

                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_DisplayVirtualPage_TransitioningToTerminalVirtualPage",
                        "DevicePrepPage: Transition to terminal virtual page.");

                    this.terminalVirtualPageAlreadyDisplayed = true;
                }

                let virtualPage = this.virtualPages[virtualPageId];

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_DisplayVirtualPage_TransitioningVirtualPage",
                    "DevicePrepPage: Display virtual page " + virtualPageId + ".");

                // Unhideable page elements
                if (virtualPage.pageTitle !== undefined) {
                    this.pageTitle(virtualPage.pageTitle)
                }

                if (virtualPage.subheaderText !== undefined) {
                    this.subheaderText(virtualPage.subheaderText)
                }

                // Hideable page elements. If a virtual page property is missing, hide its corresponding page element.
                if (virtualPage.colorSubheaderTextWithError === undefined) {
                    this.errorOccurred(false);
                } else {
                    this.errorOccurred(virtualPage.colorSubheaderTextWithError);
                }

                if (virtualPage.showProgress === undefined) {
                    this.showProgress(false);
                } else {
                    this.showProgress(virtualPage.showProgress);
                }

                if (virtualPage.showExportLogsLink === undefined) {
                    this.exportLogsLinkDisplayed(false);
                } else {
                    this.exportLogsLinkDisplayed(virtualPage.showExportLogsLink);
                }

                if (virtualPage.currentButtonIdSet === undefined) {
                    this.currentButtonIdSet(this.BUTTON_ID_NONE);
                } else {
                    this.currentButtonIdSet(virtualPage.currentButtonIdSet);
                }

                // Stop the page progress update interval.
                if ((virtualPage.stopPageProgressUpdateInterval !== undefined) &&
                    virtualPage.stopPageProgressUpdateInterval &&
                    (this.pageProgressUpdateIntervalId != 0)) {

                    clearInterval(this.pageProgressUpdateIntervalId);
                    this.pageProgressUpdateIntervalId = 0;

                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_ProgressPercentage_Success",
                        "DevicePrepPage: Stopped page progress percentage updates due to page transition.");
                }

                // Lottie animation is an exception.  It never gets hidden.
                if (virtualPage.lottieAnimation !== undefined) {
                    bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", virtualPage.lottieAnimation);
                }

                if (resultsToSendToMdmServer !== undefined) {
                    await this.sendResultsToMdmServerAsync(this.storePageResultsAndBuildResultsString(resultsToSendToMdmServer));
                }

                if (this.isTerminalVirtualPageId(virtualPageId)) {
                    await this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_RESULTS_UX_RENDERING_END_WITH_SUCCESS, "Virtual page ID = " + virtualPageId);

                    if (0 == (this.currentButtonIdSet() & (this.BUTTON_ID_NEXT | this.BUTTON_ID_SKIP))) {
                        // If this is a terminal virtual page (i.e., user cannot go past), then log it as an end state for the page.
                        await this.logTsmProcessEndAsync(this.TSM_STATE_PAGE_TERMINAL_BLOCKING_FAILURE, "");
                    }
                }

            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "DevicePrepPage_DisplayVirtualPage_FailedWithError",
                    "DevicePrepPage: Displaying virtual page failed with error.",
                    e);

                if (this.isTerminalVirtualPageId(virtualPageId)) {
                    await this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_RESULTS_UX_RENDERING_END_WITH_ERROR, this.serializeErrorObject(e));
                }
            }
        }

        transitionToSuccessPageAsync(
            resultId,
            idOfPageToTransitionTo) {

            // Exiting the page on success is considered a "virtual subcategory", for purposes of executing DPP commands.
            return this.sessionUtilities.startPhaseStateMachineAsync(
                this.DPP_COMMANDS_PHASE_ID_ON_SUCCESSFUL_DPP_PAGE_EXIT,
                this.sessionUtilities.AUTOMATION_COMMAND_PHASE_NAME_PREACTION,
                () => {
                    // Next, run the action phase. i.e., DPP command indicates page can exit.
                    return bridge.fireEvent(resultId, idOfPageToTransitionTo);
                },
                (actionResultToUse) => {
                    // Nothing to do since the page is already exiting on success.
                    return WinJS.Promise.as(true);
                }
            )
        }

        // This method is invoked only when the DPP is fully exiting (as opposed to going to the diagnostics page transiently).
        async exitPageAsync(devicePrepPageStatus) {
            try {
                await this.runCommonPageExitAsync();

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_ExitPageAsync",
                    `DevicePrepPage: Calling setPageStatusAsync with ${devicePrepPageStatus}`);

                await this.autopilotDevicePreparationUtilities.setPageStatusAsync(devicePrepPageStatus);

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_ExitPageAsync",
                    "DevicePrepPage: Calling exitDevicePreparationAsync");

                await this.autopilotDevicePreparationUtilities.exitDevicePreparationAsync;

                switch (devicePrepPageStatus) {
                    case ModernDeployment.Autopilot.Core.DevicePreparationPageStatus.exitedOnSuccess:
                        this.commercialDiagnosticsUtilities.logInfoEvent(
                            "DevicePrepPage_ExitPageAsync",
                            "DevicePrepPage: Calling transitionToSuccessPageAsync from success");

                        await this.logTsmProcessEndAsync(this.TSM_STATE_PAGE_EXIT_WITH_SUCCESS, "");
                        break;

                    case ModernDeployment.Autopilot.Core.DevicePreparationPageStatus.continuedToExitOnFailure:
                        this.commercialDiagnosticsUtilities.logInfoEvent(
                            "DevicePrepPage_ExitPageAsync",
                            "DevicePrepPage: Calling transitionToSuccessPageAsync from continue-on-error");

                        await this.logTsmProcessEndAsync(this.TSM_STATE_PAGE_EXIT_CONTINUE_ON_FAILURE, "");
                        break;
                };

                await this.transitionToSuccessPageAsync(CloudExperienceHost.Events.done, this.PAGE_TRANSITION_POST_DPP_SUCCESS_PAGE);

            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "DevicePrepPage_ExitPageAsync_FailedWithError",
                    "DevicePrepPage: Exiting failed with error.",
                    e);
            }
        }

        storePageResultsAndBuildResultsString(resultsToSendToMdmServer) {
            if (resultsToSendToMdmServer.phase !== undefined) {
                this.sessionUtilities.storeSettingAsync(this.PAGE_ERROR_PHASE, resultsToSendToMdmServer.phase);
            }

            if (resultsToSendToMdmServer.resultCode !== undefined) {
                this.sessionUtilities.storeSettingAsync(this.PAGE_ERROR_CODE, resultsToSendToMdmServer.resultCode);
            }

            if (resultsToSendToMdmServer.details !== undefined) {
                this.sessionUtilities.storeSettingAsync(this.PAGE_ERROR_DETAILS, resultsToSendToMdmServer.details);
            }

            let returnString = JSON.stringify({
                phase: resultsToSendToMdmServer.phase,
                resultCode: resultsToSendToMdmServer.resultCode,
                details: resultsToSendToMdmServer.details
            });

            return returnString;
        }

        // Returns object with following properties:
        // {
        //     downloadResultCode: this.HRESULT_* (number, not string), // mandatory property
        //     downloadDetails: "" // mandatory property
        // }
        downloadAgentAsync(maxAgentInstallationDurationInMilliseconds) {
            return this.sessionUtilities.startPhaseStateMachineAsync(
                this.DPP_PHASE_ID_ON_AGENT_DOWNLOAD,
                this.sessionUtilities.AUTOMATION_COMMAND_PHASE_NAME_PREACTION,
                // Normal case
                () => {
                    return this.downloadAgentForRealAsync(maxAgentInstallationDurationInMilliseconds).then((downloadResult) => {
                        return this.sessionUtilities.startPhaseStateMachineAsync(
                            this.DPP_PHASE_ID_ON_AGENT_DOWNLOAD,
                            this.sessionUtilities.AUTOMATION_COMMAND_PHASE_NAME_POSTACTION,
                            // Normal case
                            () => {
                                return downloadResult;
                            },
                            // Automation-overriden case
                            (actionResultToUse) => {
                                return actionResultToUse;
                            }
                        );
                    });
                },
                // Automation-overriden case
                (actionResultToUse) => {
                    return actionResultToUse;
                }
            );
        }

        // Returns object with following properties:
        // {
        //     downloadResultCode: this.HRESULT_* (number, not string), // mandatory property
        //     downloadDetails: "" // mandatory property
        // }
        downloadAgentForRealAsync(maxAgentInstallationDurationInMilliseconds) {
            // TODO:  Do we want to send MDM Alerts for each phase start/end?
            if (this.terminalVirtualPageAlreadyDisplayed) {
                // This page already reached a terminal state, and so exit early.
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_AgentDownloadAndInstall_BypassingAgentDownloadAndInstall",
                    "DevicePrepPage: Bypass download and install of agent since the page reached a terminal state already.");

                return WinJS.Promise.as(this.HRESULT_E_UNEXPECTED);
            }

            this.commercialDiagnosticsUtilities.logInfoEvent(
                "DevicePrepPage_AgentDownloadAndInstall_Starting",
                `DevicePrepPage: Starting to download and install the provisioning agent, with max timeout of ${maxAgentInstallationDurationInMilliseconds} ms.`);

            this.autopilotDevicePreparationAgentDownloader = new ModernDeployment.Autopilot.Core.AutopilotDevicePreparationAgentDownloader();

            let agentInstallationPromise = this.autopilotDevicePreparationAgentDownloader.triggerDownloadAsync().then(() => {
                return new WinJS.Promise(
                    // Promise initialization handler
                    (completeDispatch, errorDispatch, progressDispatch) => {
                        // Create event handler.
                        this.agentReadyListener = (hresult) => {
                            let details = "";

                            if (0 == hresult) {
                                details = "DevicePrepPage: Provisioning agent download and installation succeeded.";

                                this.commercialDiagnosticsUtilities.logInfoEvent(
                                    "DevicePrepPage_AgentDownloadAndInstall_Succeeded",
                                    details);
                            } else {
                                let agentInstallErrorHresultString = this.commercialDiagnosticsUtilities.formatNumberAsHexString(hresult, 8);
                                details = `DevicePrepPage: Provisioning agent download or installation failed. Error: ${agentInstallErrorHresultString}.`;

                                this.commercialDiagnosticsUtilities.logHresultEvent(
                                    "DevicePrepPage_AgentDownloadAndInstall_Failed",
                                    details,
                                    hresult);
                            }

                            // Signal promise chain to continue.
                            completeDispatch({
                                downloadResultCode: hresult,
                                downloadDetails: details
                            });
                        };

                        // Register event handler.
                        try {
                            this.agentReadyListenerRegistered = true;

                            this.autopilotDevicePreparationAgentDownloader.addEventListener(
                                this.EVENT_LISTENER_ID_AGENT_READY,
                                this.agentReadyListener.bind(this));

                        } catch (e) {
                            let details = "DevicePrepPage: Registering agent ready event listener failed.";

                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "DevicePrepPage_AgentDownloadAndInstall_ListenerRegistrationFailed",
                                details,
                                e);

                            this.agentReadyListenerRegistered = false;

                            completeDispatch({
                                downloadResultCode: this.HRESULT_E_UNEXPECTED,
                                downloadDetails: details + " " + this.serializeErrorObject(e)
                            });
                        }
                    },

                    // Promise cancellation event handler
                    () => {
                        // No need to return any error from this, since HRESULT_TIME_OUT is returned by the caller.
                        this.commercialDiagnosticsUtilities.logInfoEvent(
                            "DevicePrepPage_AgentDownloadAndInstall_Canceled",
                            "DevicePrepPage: Provisioning agent download and installation are canceled, likely due to timeout.");
                    });
            });

            return WinJS.Promise.timeout(maxAgentInstallationDurationInMilliseconds, agentInstallationPromise).then(
                // Case: Promise completion before time out
                (downloadResult) => {
                    // Remove event listener.
                    if (this.agentReadyListenerRegistered) {
                        try {
                            this.autopilotDevicePreparationAgentDownloader.removeEventListener(
                                this.EVENT_LISTENER_ID_AGENT_READY,
                                this.agentReadyListener.bind(this));
                        } catch (e) {
                            // Swallow the exception, since it's not critical.
                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "DevicePrepPage_AgentDownloadAndInstall_ListenerDeregistrationFailed",
                                "DevicePrepPage: Deregistering agent ready event listener failed.",
                                e);
                        }

                        this.agentReadyListenerRegistered = false;
                    }

                    // Agent installation succeeded or failed within the time limit.
                    return downloadResult;
                },

                // Case: Timed out
                (error) => {
                    // Remove event listener.
                    if (this.agentReadyListenerRegistered) {
                        try {
                            this.autopilotDevicePreparationAgentDownloader.removeEventListener(
                                this.EVENT_LISTENER_ID_AGENT_READY,
                                this.agentReadyListener.bind(this));
                        } catch (e) {
                            // Swallow the exception, since it's not critical.
                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "DevicePrepPage_AgentDownloadAndInstall_ListenerDeregistrationFailed",
                                "DevicePrepPage: Deregistering agent ready event listener failed.",
                                e);
                        }

                        this.agentReadyListenerRegistered = false;
                    }

                    let details = `DevicePrepPage: Provisioning agent download and installation timed out after ${maxAgentInstallationDurationInMilliseconds} ms, and is returning HRESULT of ${this.HRESULT_TIME_OUT}.`;

                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_AgentDownloadAndInstall_ExitingAfterTimeout",
                        details);

                    return {
                        downloadResultCode: this.HRESULT_TIME_OUT,
                        downloadDetails: details
                    };
                });
        }

        // Returns object with following properties:
        // {
        //     provisioningResultState: this.AGENT_PROGRESS_*, // mandatory property
        //     provisioningResultCode: this.HRESULT_*, // optional property, but mandatory if provisioningResultState == AGENT_PROGRESS_STATE_ERROR
        //     provisioningResultDetails: "" // optional property
        // }
        waitOnAgentProgressAsync(maxAgentProgressDurationInMilliseconds) {
            return this.sessionUtilities.startPhaseStateMachineAsync(
                this.DPP_PHASE_ID_ON_AGENT_PROVISIONING,
                this.sessionUtilities.AUTOMATION_COMMAND_PHASE_NAME_PREACTION,
                // Normal case
                () => {
                    return this.waitOnAgentProgressForRealAsync(maxAgentProgressDurationInMilliseconds).then((provisioningResult) => {
                        return this.sessionUtilities.startPhaseStateMachineAsync(
                            this.DPP_PHASE_ID_ON_AGENT_PROVISIONING,
                            this.sessionUtilities.AUTOMATION_COMMAND_PHASE_NAME_POSTACTION,
                            // Normal case
                            () => {
                                return provisioningResult;
                            },
                            // Automation-overriden case
                            (actionResultToUse) => {
                                return actionResultToUse;
                            }
                        );
                    });
                },
                // Automation-overriden case
                (actionResultToUse) => {
                    return actionResultToUse;
                }
            );
        }

        // Returns object with following properties:
        // {
        //     provisioningResultState: this.AGENT_PROGRESS_*, // mandatory property
        //     provisioningResultCode: this.HRESULT_*, // optional property, but mandatory if provisioningResultState == AGENT_PROGRESS_STATE_ERROR
        //     provisioningResultDetails: "" // optional property
        // }
        waitOnAgentProgressForRealAsync(maxAgentProgressDurationInMilliseconds) {
            if (this.terminalVirtualPageAlreadyDisplayed) {
                // This page already reached a terminal state, and so exit early.
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_AgentProvisioningProgress_BypassingWaitingOnAgentProvisioning",
                    "DevicePrepPage: Bypass waiting on agent since the page reached a terminal state already.");

                return WinJS.Promise.as({
                    provisioningResultState: Windows.Management.Setup.DeploymentAgentProgressState.completed,
                    provisioningResultCode: this.HRESULT_SUCCESS
                });
            }

            this.commercialDiagnosticsUtilities.logInfoEvent(
                "DevicePrepPage_AgentProvisioningProgress_Starting",
                "DevicePrepPage: Starting to wait on agent provisioning progress.");

            this.progressStatusSubtext(this.resourceStrings["DevicePrepDefaultStatusSubtextProvisioning"]);
            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.AUTOPILOT_ORCHESTRATOR_AGENT_INSTALLED, true);

            // Wait on progress updates from the provisioning agent.
            let progressUpdateWaitPromise = new WinJS.Promise(

                // Promise initialization handler
                (completeDispatch, errorDispatch, progressDispatch) => {

                    // Create progress update event handler.  All operations in this handler should strive
                    // to complete the promise, and let subsequent code virtual page transitions.
                    this.progressUpdateListener = (agentProvisioningProgressReport) => {

                        switch (agentProvisioningProgressReport.state) {

                            case Windows.Management.Setup.DeploymentAgentProgressState.initializing:
                                // this.completionPercentage = agentProvisioningProgressReport.progressPercentage;
                                this.progressStatusText(this.commercialDiagnosticsUtilities.formatMessage(
                                    this.COMPLETION_PERCENTAGE_FORMAT_TEMPLATE,
                                    this.completionPercentage));
                                break;

                            case Windows.Management.Setup.DeploymentAgentProgressState.inProgress:
                                // this.completionPercentage = agentProvisioningProgressReport.progressPercentage;
                                this.progressStatusText(this.commercialDiagnosticsUtilities.formatMessage(
                                    this.COMPLETION_PERCENTAGE_FORMAT_TEMPLATE,
                                    this.completionPercentage));
                                break;

                            case Windows.Management.Setup.DeploymentAgentProgressState.completed:
                                this.isProvisoningComplete = true;
                                this.completionPercentage = 100;

                                this.progressStatusText(this.commercialDiagnosticsUtilities.formatMessage(
                                    this.COMPLETION_PERCENTAGE_FORMAT_TEMPLATE,
                                    this.completionPercentage));

                                this.commercialDiagnosticsUtilities.logInfoEvent(
                                    "DevicePrepPage_AgentProvisioningProgress_ProvisioningComplete",
                                    "DevicePrepPage: Updated completion percentage to 100%.");

                                // Show the 100% progress for a little bit so the user could see.
                                setTimeout(
                                    () => {
                                        this.commercialDiagnosticsUtilities.logInfoEvent(
                                            "DevicePrepPage_AgentProvisioningProgress_ProvisioningComplete",
                                            "DevicePrepPage: Provisioning has completed.");

                                        completeDispatch({
                                            provisioningResultState: Windows.Management.Setup.DeploymentAgentProgressState.completed,
                                            provisioningResultCode: this.HRESULT_SUCCESS
                                        });
                                    },
                                    this.HOLD_COMPLETION_PERCENTAGE_IN_MILLISECONDS);
                                break;

                            case Windows.Management.Setup.DeploymentAgentProgressState.errorOccurred:
                                // TODO: This should be the HRESULT returned from the agent itself.
                                this.commercialDiagnosticsUtilities.logErrorEvent(
                                    "DevicePrepPage_AgentProvisioningProgress_Error",
                                    "DevicePrepPage: Provisioning by agent returned with error.",
                                    this.HRESULT_E_FAIL);

                                completeDispatch({
                                    provisioningResultState: Windows.Management.Setup.DeploymentAgentProgressState.errorOccurred,
                                    provisioningResultCode: this.HRESULT_E_FAIL,
                                    provisioningResultDetails: "DevicePrepPage: Provisioning by agent returned with error."
                                });
                                break;

                            case Windows.Management.Setup.DeploymentAgentProgressState.rebootRequired:
                                this.commercialDiagnosticsUtilities.logInfoEvent(
                                    "DevicePrepPage_AgentProvisioningProgress_RebootRequired",
                                    "DevicePrepPage: The provisioning agent specified a reboot is required.");

                                // Tell the user a reboot is required.
                                this.progressStatusText(this.resourceStrings["DevicePrepRebootRequired"]);

                                // Show the "reboot required" message for a little bit so the user could see.
                                setTimeout(
                                    () => {
                                        this.commercialDiagnosticsUtilities.logInfoEvent(
                                            "DevicePrepPage_AgentProvisioningProgress_AboutToInitiateReboot",
                                            "DevicePrepPage: Done showing reboot required message to user.");

                                        completeDispatch({
                                            provisioningResultState: Windows.Management.Setup.DeploymentAgentProgressState.rebootRequired,
                                            provisioningResultCode: this.HRESULT_SUCCESS
                                        });
                                    },
                                    this.HOLD_REBOOT_REQUIRED_MESSAGE_IN_MILLISECONDS);
                                break;
                        };
                    };

                    // Create connection changed event handler. These are primarily for logging now but
                    // could be used to display UX text in the future.
                    this.connectionChangedListener = (connectionChangedEventArgs) => {
                        switch (connectionChangedEventArgs.change)
                        {
                            case Windows.Management.Setup.DeploymentSessionConnectionChange.agentConnectionLost:
                                // ToDo: add a timer then display UX text about agent being restarted
                                this.commercialDiagnosticsUtilities.logInfoEvent(
                                    "DevicePrepPage_AgentProgress_ConnectionChanged_AgentConnectionLost",
                                    "DevicePrepPage: Agent connection lost.");
                                break;
                            case Windows.Management.Setup.DeploymentSessionConnectionChange.agentConnectionRestored:
                                // ToDo: clear the timer and hide UX text about agent being restarted
                                this.commercialDiagnosticsUtilities.logInfoEvent(
                                    "DevicePrepPage_AgentProgress_ConnectionChanged_AgentConnectionRestored",
                                    "DevicePrepPage: Agent connection restored.");
                                break;
                            case Windows.Management.Setup.DeploymentSessionConnectionChange.internetConnectionLost:
                                // ToDo: add a timer then display UX text about dropped connection
                                this.commercialDiagnosticsUtilities.logInfoEvent(
                                    "DevicePrepPage_AgentProgress_ConnectionChanged_InternetConnectionLost",
                                    "DevicePrepPage: Internet connection lost.");
                                break;
                            case Windows.Management.Setup.DeploymentSessionConnectionChange.internetConnectionRestored:
                                // ToDo: clear the timer and hide UX text about dropped connection
                                this.commercialDiagnosticsUtilities.logInfoEvent(
                                    "DevicePrepPage_AgentProgress_ConnectionChanged_InternetConnectionRestored",
                                    "DevicePrepPage: Internet connection restored.");
                                break;
                        };
                    };

                    // Register progress update event handler.
                    try {
                        this.agentProgressListenerRegistered = true;

                        this.autopilotOrchestrator.addEventListener(
                            this.EVENT_LISTENER_ID_PROGRESS_UPDATE,
                            this.progressUpdateListener.bind(this));
                    } catch (e) {
                        this.agentProgressListenerRegistered = false;

                        this.commercialDiagnosticsUtilities.logExceptionEvent(
                            "DevicePrepPage_AgentProvisioningProgress_ListenerRegistrationFailed",
                            "DevicePrepPage: Registering progress update event listener failed.",
                            e);

                        completeDispatch({
                            provisioningResultState: Windows.Management.Setup.DeploymentAgentProgressState.errorOccurred,
                            provisioningResultCode: this.HRESULT_E_UNEXPECTED,
                            provisioningResultDetails: "DevicePrepPage: Registering progress update event listener failed with exception. " + this.serializeErrorObject(e)
                        });
                    }

                    // Register connection changed event handler
                    try {
                        this.connectionChangedListenerRegistered = true;

                        this.autopilotOrchestrator.addEventListener(
                            this.EVENT_LISTENER_ID_SESSION_CONNECTION_CHANGED,
                            this.connectionChangedListener.bind(this));
                    } catch (e) {
                        this.commercialDiagnosticsUtilities.logExceptionEvent(
                            "DevicePrepPage_AgentProgress_ConnectionChangedListenerRegistrationFailed",
                            "DevicePrepPage: Registering connection changed event listener failed.",
                            e);

                        this.connectionChangedListenerRegistered = false;

                        completeDispatch({
                            provisioningResultState: Windows.Management.Setup.DeploymentAgentProgressState.errorOccurred,
                            provisioningResultCode: this.HRESULT_E_UNEXPECTED,
                            provisioningResultDetails: "DevicePrepPage: Registering connection changed event listener failed with exception. " + this.serializeErrorObject(e)
                        });
                    }
                },

                // Promise cancellation event handler
                () => {
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_AgentProvisioningProgress_ListenerCanceled",
                        "DevicePrepPage: ProgressUpdate listener is canceled, likely due to agent processing time out.");
                });

            return WinJS.Promise.timeout(maxAgentProgressDurationInMilliseconds, progressUpdateWaitPromise).then(
                // Case: Promise completion before time out
                (agentProgressState) => {
                    // Remove event listener.
                    if (this.agentProgressListenerRegistered) {
                        this.agentProgressListenerRegistered = false;

                        try {
                            this.autopilotOrchestrator.removeEventListener(
                                this.EVENT_LISTENER_ID_PROGRESS_UPDATE,
                                this.progressUpdateListener.bind(this));
                        } catch (e) {
                            // Swallow this exception, since it's not critical.
                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "DevicePrepPage_AgentProvisioningProgress_ListenerDeregistrationFailed",
                                "DevicePrepPage: Deregistering progress update event listener failed.",
                                e);
                        }
                        this.progressUpdateListener = null;
                    }

                    if (this.connectionChangedListenerRegistered) {
                        this.connectionChangedListenerRegistered = false;

                        try {
                            this.autopilotOrchestrator.removeEventListener(
                                this.EVENT_LISTENER_ID_SESSION_CONNECTION_CHANGED,
                                this.connectionChangedListener.bind(this));
                        } catch (e) {
                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "DevicePrepPage_AgentProgress_ConnectionChangedListenerDeregistrationFailed",
                                "DevicePrepPage: Deregistering connection changed event listener failed.",
                                e);
                        }
                        this.connectionChangedListener = null;
                    }

                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_AgentProvisioningProgress_ExitingWithinTimeout",
                        `DevicePrepPage: Agent completed with AgentProgressState of ${agentProgressState.provisioningResultState}.`);

                    // Agent installation succeeded or failed within the time limit.
                    return agentProgressState;
                },

                // Case: Timed out
                (error) => {
                    // Remove event listener.
                    if (this.agentProgressListenerRegistered) {
                        this.agentProgressListenerRegistered = false;

                        try {
                            this.autopilotOrchestrator.removeEventListener(
                                this.EVENT_LISTENER_ID_PROGRESS_UPDATE,
                                this.progressUpdateListener.bind(this));
                        } catch (e) {
                            // Swallow this exception, since it's not critical.
                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "DevicePrepPage_AgentProvisioningProgress_ListenerDeregistrationFailed",
                                "DevicePrepPage: Deregistering progress update event listener failed.",
                                e);
                        }
                        this.progressUpdateListener = null;
                    }

                    if (this.connectionChangedListenerRegistered) {
                        this.connectionChangedListenerRegistered = false;

                        try {
                            this.autopilotOrchestrator.removeEventListener(
                                this.EVENT_LISTENER_ID_SESSION_CONNECTION_CHANGED,
                                this.connectionChangedListener.bind(this));
                        } catch (e) {
                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "DevicePrepPage_AgentProgress_ConnectionChangedListenerDeregistrationFailed",
                                "DevicePrepPage: Deregistering connection changed event listener failed.",
                                e);
                        }
                        this.connectionChangedListener = null;
                    }

                    this.commercialDiagnosticsUtilities.logErrorEvent(
                        "DevicePrepPage_AgentProvisioningProgress_ExitingAfterTimeout",
                        `DevicePrepPage: Agent progress timed out after ${maxAgentProgressDurationInMilliseconds} ms, and is returning AgentProgressState of ${Windows.Management.Setup.DeploymentAgentProgressState.errorOccurred}.`,
                        this.HRESULT_TIME_OUT);

                    return {
                        provisioningResultState: Windows.Management.Setup.DeploymentAgentProgressState.errorOccurred,
                        provisioningResultCode: this.HRESULT_TIME_OUT,
                        provisioningResultDetails: `Agent progress timed out after ${maxAgentProgressDurationInMilliseconds} ms.`
                    };
                });
        }

        // Returns object with following properties:
        // {
        //     resultCode: this.HRESULT_*, // mandatory property
        //     details: "" // mandatory property
        // }
        rebootDeviceAsync(maxWaitForRebootInMilliseconds) {
            return this.sessionUtilities.startPhaseStateMachineAsync(
                this.DPP_PHASE_ID_ON_DEVICE_REBOOT,
                this.sessionUtilities.AUTOMATION_COMMAND_PHASE_NAME_PREACTION,
                // Normal case
                () => {
                    return this.rebootDeviceForRealAsync(maxWaitForRebootInMilliseconds).then((result) => {
                        return this.sessionUtilities.startPhaseStateMachineAsync(
                            this.DPP_PHASE_ID_ON_DEVICE_REBOOT,
                            this.sessionUtilities.AUTOMATION_COMMAND_PHASE_NAME_POSTACTION,
                            // Normal case
                            () => {
                                return result;
                            },
                            // Automation-overriden case
                            (actionResultToUse) => {
                                return actionResultToUse;
                            }
                        );
                    });
                },
                // Automation-overriden case
                (actionResultToUse) => {
                    return actionResultToUse;
                }
            );
        }

        // Returns object with following properties:
        // {
        //     resultCode: this.HRESULT_*, // mandatory property
        //     details: "" // mandatory property
        // }
        async rebootDeviceForRealAsync(maxWaitForRebootInMilliseconds) {
            if (this.terminalVirtualPageAlreadyDisplayed) {
                // This page already reached a terminal state, and so exit early.
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_AgentProvisioningProgress_BypassingWaitingOnAgentProvisioning",
                    "DevicePrepPage: Bypass waiting on agent since the page reached a terminal state already.");

                return {
                    resultCode: this.HRESULT_TIME_OUT,
                    details: "DevicePrepPage: Bypass waiting on agent since the page reached a terminal state already."
                };
            }

            // The constructor of this page should have automatically initialized OOBE to resume to this page,
            // but we'll do it again here just in case.
            await this.setResumeToCurrentPageAsync();

            try {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_RebootDevice_InitiatingRebootTransition",
                    `DevicePrepPage: About to initiate transition to reboot and then waiting ${maxWaitForRebootInMilliseconds} ms for device to reboot.`);

                await bridge.fireEvent(constants.Events.done, this.PAGE_EVENT_REBOOT);

                await WinJS.Promise.timeout(maxWaitForRebootInMilliseconds);

                // If the device reboots, this should never execute.  If this point is reached, then something about the reboot failed.
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "DevicePrepPage_RebootDevice_TimedOut",
                    "DevicePrepPage: Navigation to reboot timed out.",
                    this.HRESULT_TIME_OUT);

                return {
                    resultCode: this.HRESULT_TIME_OUT,
                    details: "DevicePrepPage: Navigation to reboot timed out."
                };

            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "DevicePrepPage_RebootDevice_NavigationFailed",
                    "DevicePrepPage: Navigation to reboot failed.",
                    e);

                return {
                    resultCode: this.HRESULT_E_UNEXPECTED,
                    details: "DevicePrepPage: Navigation to reboot failed. " + this.serializeErrorObject(e)
                };
            }
        }

        async initiateSyncSessionsAsync() {
            try {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_RunMainProcessing_SyncSessions_Started",
                    "DevicePrepPage: Running sync sessions");

                await this.logTsmProcessInfoAsync(this.TSM_STATE_BACKGROUND_SYNC_SESSIONS_INITIATION_START, "");

                this.sessionUtilities.deviceManagementUtilities.runSyncSessionsAsync(ModernDeployment.Autopilot.Core.SyncSessionExitCondition.autopilotDevicePreparationProvisioningComplete);

                await this.logTsmProcessInfoAsync(this.TSM_STATE_BACKGROUND_SYNC_SESSIONS_INITIATION_END_WITH_SUCCESS, "");

            } catch (e) {
                await this.logTsmProcessInfoAsync(this.TSM_STATE_BACKGROUND_SYNC_SESSIONS_INITIATION_END_ON_ERROR, this.serializeErrorObject(e));

                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "DevicePrepPage_RunMainProcessing_SyncSessions_Failed",
                    "DevicePrepPage: Failed to run sync sessions.",
                    e);

                throw e;
            }
        }

        async runMainProcessingAsync() {
            // Uber execution try/catch.
            try {
                /////////////
                // Start to download and install the provisioning agent.

                // This should be the first line in this method, so that the catch section's switch statement works.
                // NOTE: Each new  phase should be immediately followed by an TSM event indicating its start.
                this.currentPhase = this.PHASE_AGENT_DOWNLOAD;

                await this.logTsmProcessInfoAsync(this.TSM_STATE_AGENT_DOWNLOAD_INSTALL_START, "");

                // This is a best-effort, fire-and-forget operation.  It will stop itself once the page exits.
                this.initiateSyncSessionsAsync();

                // Update the page status to "in progress".
                await this.autopilotDevicePreparationUtilities.setPageStatusAsync(ModernDeployment.Autopilot.Core.DevicePreparationPageStatus.inProgress);

                let downloadResult = await this.downloadAgentAsync(this.autopilotDevicePreparationUtilities.agentDownloadTimeoutSeconds * 1000);

                if (this.terminalVirtualPageAlreadyDisplayed) {
                    // This page already reached a terminal state, and so exit early.
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_RunMainProcessing_BypassingAfterAgentDownload",
                        "DevicePrepPage: Terminate main processing early (after agent download and installation) since the page reached a terminal state already.");
                    return;
                }

                if (downloadResult.downloadResultCode != 0) {
                    this.currentResultCode = this.commercialDiagnosticsUtilities.formatNumberAsHexString(downloadResult.downloadResultCode, 8);
                    this.currentDetails = downloadResult.downloadDetails;

                    // Let the ultimate error handler handle all errors.
                    throw new Error(this.currentDetails);
                }

                await this.logTsmProcessInfoAsync(this.TSM_STATE_AGENT_DOWNLOAD_INSTALL_END_WITH_SUCCESS, "");

                /////////////
                // Initialize the downloaded agent.
                this.currentPhase = this.PHASE_AGENT_INITIALIZATION;

                await this.logTsmProcessInfoAsync(this.TSM_STATE_AGENT_INITIALIZATION_START, "");

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_RunMainProcessing_InitializeProvisioningAgent",
                    "DevicePrepPage: Initialize provisioning agent.");

                if (this.terminalVirtualPageAlreadyDisplayed) {
                    // This page already reached a terminal state, and so exit early.
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_RunMainProcessing_BypassingAgentInitialization",
                        "DevicePrepPage: Terminate main processing early (before agent initialization) since the page reached a terminal state already.");
                    return;
                }

                this.autopilotOrchestrator = new ModernDeployment.Autopilot.Core.AutopilotDevicePreparationOrchestrator();

                //this.sessionId = this.sessionUtilities.generateUUID();

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_RunMainProcessing_InitializeProvisioningAgent_SessionId",
                    `DevicePrepPage: New session Id created: ${this.sessionId}`);

                await this.autopilotOrchestrator.initializeAsync(
                    this.sessionId,
                    this.AUTOPILOT_ORCHESTRATOR_TIMEOUT_IN_MS,
                    function (event) { // this is a local function that is passed as a delegate to the orchestrator, of type Windows.Management.Setup.DeploymentSessionHeartbeatRequested
                        //let target = event.target; // Extract the event, which is of type Windows.Management.Setup.deploymentSessionHeartbeatRequestedEventArgs
                        event.handled = true; // Set the handled property to true to indicate that the event has been handled
                    });

                if (this.terminalVirtualPageAlreadyDisplayed) {
                    // This page already reached a terminal state, and so exit early.
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_RunMainProcessing_BypassingAfterAgentInitialization",
                        "DevicePrepPage: Terminate main processing early (after agent initialization) since the page reached a terminal state already.");
                    return;
                }

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "DevicePrepPage_RunMainProcessing_ProvisioningAgentInitializationSuceeded",
                    "DevicePrepPage: Provisioning agent initialization succeeded.");

                await this.logTsmProcessInfoAsync(this.TSM_STATE_AGENT_INITIALIZATION_END_WITH_SUCCESS, "");

                /////////////
                // Begin provisioning and waiting for provisioning.
                this.currentPhase = this.PHASE_AGENT_PROVISIONING;

                await this.logTsmProcessInfoAsync(this.TSM_STATE_AGENT_PROVISIONING_START, "");

                let timeoutValueInMs = this.autopilotDevicePreparationUtilities.pageTimeoutSeconds * 1000;
                let remainingTimeoutInMilliseconds = (this.progressCounterMilliseconds < timeoutValueInMs) ?
                    timeoutValueInMs - this.progressCounterMilliseconds :
                    0;

                let agentProgressResult = await this.waitOnAgentProgressAsync(remainingTimeoutInMilliseconds);

                // Release the orchestrator as it is no longer needed
                this.autopilotOrchestrator = null;

                if (this.terminalVirtualPageAlreadyDisplayed) {
                    // This page already reached a terminal state, and so exit early.
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_RunMainProcessing_BypassingAfterAgentProvisioning",
                        "DevicePrepPage: Terminate main processing early (after agent provisioning) since the page reached a terminal state already.");
                    return;
                }

                /////////////
                // Evaluate the agent provisioning results.

                if ((agentProgressResult === undefined) || (agentProgressResult.provisioningResultCode === undefined)) {
                    this.currentResultCode = this.commercialDiagnosticsUtilities.formatNumberAsHexString(this.HRESULT_E_UNEXPECTED, 8);
                    this.currentDetails = "DevicePrepPage: Agent provisioning result is undefined.";

                    // Let the ultimate error handler handle all errors.
                    throw new Error(this.currentDetails);
                }

                switch (agentProgressResult.provisioningResultState) {
                    case Windows.Management.Setup.DeploymentAgentProgressState.completed:
                        // Success!  Let the ultimate completion handler handle everything.
                        this.currentResultCode = this.commercialDiagnosticsUtilities.formatNumberAsHexString(agentProgressResult.provisioningResultCode, 8);
                        this.currentDetails = "DevicePrepPage: Agent provisioning completed successfully";
                        break;

                    case Windows.Management.Setup.DeploymentAgentProgressState.errorOccurred:
                        // Failed
                        this.currentResultCode = this.commercialDiagnosticsUtilities.formatNumberAsHexString(agentProgressResult.provisioningResultCode, 8);
                        this.currentDetails = "DevicePrepPage: Agent provisioning failed.";

                        if (agentProgressResult.provisioningResultDetails !== undefined) {
                            this.currentDetails += " Details: " + agentProgressResult.provisioningResultDetails
                        }

                        // Let the ultimate error handler handle all errors.
                        throw new Error(this.currentDetails);
                        break;

                    case Windows.Management.Setup.DeploymentAgentProgressState.rebootRequired:
                        // Reboot is needed to continue processing.
                        this.currentPhase = this.PHASE_AGENT_REBOOT;

                        await this.logTsmProcessInfoAsync(this.TSM_STATE_DEVICE_REBOOT_START, "");

                        // Set the flag that this page was the last rebooter, as a clue to this page's constructor that it's resuming
                        // from a planned reboot.
                        await this.sessionUtilities.storeSettingAsync(this.LAST_REBOOTER_VALUE_NAME, this.LAST_REBOOTER_VALUE_DEVICE_PREP_PAGE);

                        return this.rebootDeviceAsync(this.MAX_WAIT_FOR_REBOOT_IN_MILLISECONDS).then((rebootFailureDetails) => {
                            // Reboot either failed or timed out.
                            // TODO: Should we tell the end user to manually reboot to recover?
                            this.currentResultCode = this.commercialDiagnosticsUtilities.formatNumberAsHexString(rebootFailureDetails.resultCode, 8);
                            this.currentDetails = rebootFailureDetails.details;

                            // Let the ultimate error handler handle all errors.
                            throw new Error(this.currentDetails);
                        });
                        break;

                    default:
                        this.currentResultCode = this.commercialDiagnosticsUtilities.formatNumberAsHexString(this.HRESULT_INVALIDARG, 8);
                        this.currentDetails = `DevicePrepPage: Unknown agent progress state value: ${agentProgressResult.provisioningResultState}`;

                        // Let the ultimate error handler handle all errors.
                        throw new Error(this.currentDetails);
                        break;
                };

                await this.logTsmProcessInfoAsync(this.TSM_STATE_AGENT_PROVISIONING_END_WITH_SUCCESS, "");

                /////////////
                // Ultimate completion handler.

                // Processing is done. Transition to the next phase.
                this.currentPhase = this.PHASE_CLEANUP;

                await this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_CLEANUP_START, "");

                await this.displayVirtualPageAsync(
                    this.VIRTUAL_PAGE_SUCCESS,
                    {
                        phase: this.currentPhase,
                        resultCode: this.currentResultCode,
                        details: this.currentDetails
                    });

                await this.logTsmProcessInfoAsync(this.TSM_STATE_PAGE_CLEANUP_END_WITH_SUCCESS, "");

            } catch (e) {
                if (this.terminalVirtualPageAlreadyDisplayed) {
                    // This page already reached a terminal state, and so exit early.
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        "DevicePrepPage_RunMainProcessing_BypassingCatchAllExceptionHandler",
                        "DevicePrepPage: Terminate main processing early (before the catch-all exception handler) since the page reached a terminal state already.");
                    return;

                } else {
                    /////////////
                    // Ultimate error handler.
                    this.commercialDiagnosticsUtilities.logExceptionEvent(
                        "DevicePrepPage_RunMainProcessing_FailedWithException",
                        "DevicePrepPage: Processing failed with an exception.",
                        e);

                    let details = "";
                    if ((this.currentDetails !== undefined) &&
                        (this.currentDetails !== null) &&
                        (this.currentDetails.length > 0)) {
                        // The details message is curated, and so use it.
                        details = this.currentDetails;
                    } else {
                        // This is likely unexpected exception.  Create the details message.
                        details = "DevicePrepPage: Processing failed with an unexpected exception. " + this.serializeErrorObject(e);
                    }

                    let stateName = "";

                    switch (this.currentPhase) {
                        case this.PHASE_PRESTART:
                            // Should never reach here, since the currentPhase is set at the beginning of this method.
                            this.commercialDiagnosticsUtilities.logHresultEvent(
                                "DevicePrepPage_RunMainProcessing_UnexpectedPrestartPhase",
                                "DevicePrepPage: Processing failed with an exception during the " + this.PHASE_PRESTART + " phase, which is not expected.",
                                this.HRESULT_E_UNEXPECTED);
                            break;

                        case this.PHASE_AGENT_DOWNLOAD:
                            stateName = this.TSM_STATE_AGENT_DOWNLOAD_INSTALL_END_WITH_ERROR;
                            break;

                        case this.PHASE_AGENT_INITIALIZATION:
                            stateName = this.TSM_STATE_AGENT_INITIALIZATION_END_WITH_ERROR;
                            break;

                        case this.PHASE_AGENT_PROVISIONING:
                            stateName = this.TSM_STATE_AGENT_PROVISIONING_END_WITH_ERROR;
                            break;

                        case this.PHASE_AGENT_REBOOT:
                            stateName = this.TSM_STATE_DEVICE_REBOOT_END_WITH_ERROR;
                            break;

                        case this.PHASE_CLEANUP:
                            stateName = this.TSM_STATE_PAGE_CLEANUP_END_WITH_ERROR;
                            break;
                    };

                    await this.logTsmProcessInfoAsync(stateName, this.serializeErrorObject(e));

                    await this.displayVirtualPageAsync(
                        this.VIRTUAL_PAGE_UNRECOVERABLE_ERROR,
                        {
                            phase: this.currentPhase,
                            resultCode: this.currentResultCode,
                            details: details
                        });
                }

                // Set this to the last phase since processing is done.
                this.currentPhase = this.PHASE_CLEANUP;
            }
        }
    }

    return autopilotDevicePreparationViewModel;
});
