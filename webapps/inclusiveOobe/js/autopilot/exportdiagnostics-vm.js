//
// Copyright (C) Microsoft. All rights reserved.
//

"use strict";

define([
    'lib/knockout',
    'legacy/bridge',
    'legacy/appObjectFactory',
    'autopilot/commercialDiagnosticsUtilities',
    'autopilot/bootstrapSessionGeneralUtilities'], (
    ko,
    bridge,
    appObjectFactory,
    commercialDiagnosticsUtilities,
    bootstrapSessionGeneralUtilities) => {
    class ExportDiagnosticsViewModel {
        constructor(resourceStrings, targetPersonality) {

            this.resourceStrings = resourceStrings;

            // Constants

            // Initialize data-bound static values
            this.DIAGNOSTICS_PAGE_LOGS_EXPORT_PROGRESS_TEXT = this.resourceStrings["ExportDiagnosticsPageLogsExportInProgressText"];
            this.DETAILS = this.resourceStrings["ExportDiagnosticsPageDetailsHeading"];
            this.LOG_EXPORT_SUCCEEDED = this.resourceStrings["ExportDiagnosticsPageLogsExportSuccessText"];
            this.ERROR_ADDITIONAL_INFO_HEADING = this.resourceStrings["DiagnosticsPageErrorAdditionalInfoHeading"];

            // Comment these are status strings to use in composing aria labels for screen readers, note these 
            // strings are being re-used from existing localized strings.
            this.STATUS_SUCCESS = this.resourceStrings["BootstrapPageComplete"]; // Complete
            this.STATUS_FAILURE = this.resourceStrings["BootstrapPageStatusFailed"]; // Error
            this.STATUS_IN_PROGRESS = this.resourceStrings["BootstrapPageStillWorking"]; // Still working on it
            this.STATUS_WARNING = this.resourceStrings["EnrollmentErrorFinishedTitle"]; // There was a problem

            // Scenario constants
            this.EXPORTLOGS_PREVIOUS_CXID_NAME = "ExportLogsPreviousCXID";
            this.DIAGNOSTICS_LOGS_EXPORT_AREA_NAME = "DiagnosticsLogsExportArea";
            this.DIAGNOSTICS_LOGS_EXPORT_AREA_DEFAULT = "Autopilot;TPM";
            this.DIAGNOSTICS_LOGS_EXPORT_FILE_NAME = "MDMDiagReport.zip";
            this.E_DIAGNOSTIC_ANALYSIS_FRAMEWORK_GENERIC_ERROR = 0x81039025; // defined in AutopilotErrors.mc
            this.PAGE_UNIVERSAL_TIMEOUT_MILLISECONDS = 2 * 60 * 1000; // 2 minutes

            // Button states
            this.BUTTON_SET_NONE = 0;
            this.BUTTON_SET_DEFAULT = 1;
            this.BUTTON_SET_LOGS_EXPORT = 2;
            this.BUTTON_SET_LOGS_EXPORT_FAILURE = 3;

            // Variable data bound values 
            this.pageTitle = ko.observable(this.resourceStrings["ExportDiagnosticsPageTitle"]);
            this.errorCode = ko.observable("");
            this.errorDescription = ko.observable("");
            this.errorSubHeader = ko.observable("");
            this.logExportErrorSubheader = ko.observable("");

            this.isLiteWhitePersonality = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite);

            // Member variables
            this.commercialDiagnosticsUtilities = new commercialDiagnosticsUtilities();
            this.sessionUtilities = new bootstrapSessionGeneralUtilities(true); // Argument doesn't matter since it's not used here.

            // By default, show the data rendering progress (i.e., marching ants) and hide all other
            // sections of the page.
            this.shouldShowError = ko.observable(false);
            this.shouldShowLogsExportProgress = ko.observable(false);
            this.shouldShowLogsExportSpinner = ko.observable(false);
            this.shouldShowLogsExportError = ko.observable(false);
            this.logExportSucceeded = ko.observable(false);

            // All flags gating visibility of regions of the main content must be added to this
            // array.
            this.regionVisibilityFlags = [
                this.shouldShowLogsExportProgress,
                this.shouldShowError
            ];

            this.defaultLottieFile = "autopilotLottie.json";
            this.failureLottieFile = "errorLottie.json";

            // Initialize end buttons.

            // Initialize button visibility.
            this.buttonVisibility = ko.observable(this.BUTTON_SET_DEFAULT);

            // Define buttons
            this.closeLogsExportSuccessButton = {
                buttonText: this.resourceStrings["ExportDiagnosticsPageCloseButton"],
                buttonType: "button",
                isPrimaryButton: true,
                isVisible: true,
                buttonClickHandler: () => {
                    this.closeLogsExportButtonClick();
                }
            };

            this.closeLogsExportFailureButton = this.closeLogsExportSuccessButton;
            this.closeLogsExportFailureButton.isPrimaryButton = false;

            this.exportLogsButton = {
                buttonText: this.resourceStrings["ExportDiagnosticsPageExportLogsButton"],
                buttonType: "button",
                isPrimaryButton: true,
                isVisible: true,
                buttonClickHandler: () => {
                    this.exportLogsButtonClick();
                }
            };

            // This button is just retrying the export logs action.
            this.tryExportLogsAgainButton = {
                buttonText: this.resourceStrings["ExportDiagnosticsPageTryAgainButton"],
                buttonType: "button",
                isPrimaryButton: true,
                isVisible: true,
                buttonClickHandler: () => {
                    this.exportLogsButtonClick();
                }
            }

            // Map button states to button lists.
            const flexEndButtonSets = {};

            flexEndButtonSets[this.BUTTON_SET_NONE] = [];

            flexEndButtonSets[this.BUTTON_SET_DEFAULT] = [
                this.exportLogsButton
            ];

            flexEndButtonSets[this.BUTTON_SET_LOGS_EXPORT] = [
                this.closeLogsExportSuccessButton
            ];

            flexEndButtonSets[this.BUTTON_SET_LOGS_EXPORT_FAILURE] = [
                this.closeLogsExportFailureButton,
                this.tryExportLogsAgainButton
            ];

            // Determine which button set to display, based on which region is being shown on the main content.
            this.flexEndButtons = ko.pureComputed(() => {
                return flexEndButtonSets[this.buttonVisibility()];
            });

            // Start the log collection on page load
            this.exportLogsButtonClick();
        }

        closeButtonClick() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CloudExperienceHost.ExportDiagnostics.CloseButton clicked");

            // Treat Close as if the user hit Back to use the backstack
            bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
        }

        setLogsCollectionError(subheader, code) {
            bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", this.failureLottieFile);

            if (!this.isLiteWhitePersonality) {
                // Update the error subheader.
                let errorSubheader = this.commercialDiagnosticsUtilities.formatMessage(
                    subheader, 
                    this.commercialDiagnosticsUtilities.formatNumberAsHexString(code, 8));
                this.logExportErrorSubheader(errorSubheader);
            }

            // Toggle visibility of buttons.
            this.buttonVisibility(this.BUTTON_SET_LOGS_EXPORT_FAILURE);
            
            // Toggle visibility of regions.
            this.shouldShowLogsExportSpinner(false);
            this.shouldShowLogsExportError(true);
        }

        exportLogsButtonClick() {
            this.commercialDiagnosticsUtilities.logInfoEventName("CommercialOOBE_ExportDiagnostics_LogsExport_Started");

            // Reset visibility of buttons.
            this.buttonVisibility(this.BUTTON_SET_NONE);

            // Reset visibility of regions.
            this.showOnlySpecificRegion(this.shouldShowLogsExportProgress);
            this.shouldShowLogsExportSpinner(true);
            this.shouldShowLogsExportError(false);

            return bridge.invoke("CloudExperienceHost.showFolderPicker").then((folderPath) => {
                return bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.DIAGNOSTICS_LOGS_EXPORT_AREA_NAME).then(
                    (logsAreaValue) => {
                        // If the value wasn't found fall back to the default area.
                        if (logsAreaValue === null || logsAreaValue === undefined) {
                            logsAreaValue = this.DIAGNOSTICS_LOGS_EXPORT_AREA_DEFAULT;
                        }

                        let hasTimedOut = false;

                        let timerId = setTimeout(() => {
                            // If function does not finish by the specified timeout, log and display error.
                            hasTimedOut = true;

                            this.commercialDiagnosticsUtilities.logHresultEvent(
                                "CommercialOOBE_ExportDiagnostics_CollectLogs_TimedOut",
                                "Collecting logs took longer than the specified timeout",
                                this.commercialDiagnosticsUtilities.timeoutErrorCode);

                            this.setLogsCollectionError(
                                this.resourceStrings["ExportDiagnosticsPageLogsExportTimeoutMessage"],
                                this.commercialDiagnosticsUtilities.timeoutErrorCode);

                            this.displayError(
                                this.BUTTON_SET_LOGS_EXPORT_FAILURE,
                                this.commercialDiagnosticsUtilities.timeoutErrorCode,
                                this.resourceStrings["ExportDiagnosticsPageLogsExportTimeoutMessageNoErrorCode"],
                                this.resourceStrings["ExportDiagnosticsPageLogsExportFailureSubheader"]);

                            return;
                        }, this.PAGE_UNIVERSAL_TIMEOUT_MILLISECONDS);

                        return this.sessionUtilities.enrollmentApis.collectLogsEx(logsAreaValue, folderPath + "\\" + this.DIAGNOSTICS_LOGS_EXPORT_FILE_NAME).then(() => {
                            if (hasTimedOut) {
                                return;
                            }

                            // Success
                            clearTimeout(timerId);

                            // Toggle visibility of buttons.
                            this.buttonVisibility(this.BUTTON_SET_LOGS_EXPORT);

                            // Toggle visibility of regions.
                            this.shouldShowLogsExportSpinner(false);

                            this.commercialDiagnosticsUtilities.logInfoEventName("CommercialOOBE_ExportDiagnostics_LogsExport_Succeeded");

                            if (this.isLiteWhitePersonality) {
                                this.logExportSucceeded(true);
                            } else {
                                this.pageTitle(this.resourceStrings["ExportDiagnosticsPageLogsExportSuccessText"]);
                            }
                        }, (e) => {
                            this.commercialDiagnosticsUtilities.logExceptionEvent(
                                "CommercialOOBE_ExportDiagnostics_LogsExport_Failed",
                                "Diagnostics page collectLogsEx failed.",
                                e);
                            
                            if (hasTimedOut) {
                                return;
                            }
                            clearTimeout(timerId);

                            let code = e.number ? e.number : this.E_DIAGNOSTIC_ANALYSIS_FRAMEWORK_GENERIC_ERROR;

                            this.setLogsCollectionError(
                                this.resourceStrings["ExportDiagnosticsPageLogsExportFailureMessage"],
                                code);

                            this.displayError(
                                this.BUTTON_SET_LOGS_EXPORT_FAILURE,
                                code,
                                this.resourceStrings["ExportDiagnosticsPageLogsExportFailureMessageNoErrorCode"],
                                this.resourceStrings["ExportDiagnosticsPageLogsExportFailureSubheader"]);
                        });
                    });
            }, (e) => {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "CommercialOOBE_ExportDiagnostics_LogsExport_Failed",
                    "Folder picker failed.",
                    e);

                let code = e.number ? e.number : this.E_DIAGNOSTIC_ANALYSIS_FRAMEWORK_GENERIC_ERROR;

                this.setLogsCollectionError(
                    this.resourceStrings["ExportDiagnosticsPageLogsExportFailureMessage"],
                    code);

                this.displayError(
                    this.BUTTON_SET_LOGS_EXPORT_FAILURE,
                    code,
                    this.resourceStrings["ExportDiagnosticsPageLogsExportFailureMessageNoErrorCode"],
                    this.resourceStrings["ExportDiagnosticsPageLogsExportFailureSubheader"]);
            });
        }

        closeLogsExportButtonClick() {
            this.commercialDiagnosticsUtilities.logInfoEventName("CommercialOOBE_ExportDiagnostics_LogsExport_CloseButtonPressed");

            this.logExportSucceeded(false);

            bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.EXPORTLOGS_PREVIOUS_CXID_NAME).then(
                (previousNodeCxid) => {
                    try {
                        this.commercialDiagnosticsUtilities.logInfoEvent(
                            "CommercialOOBE_ExportDiagnostics_LogsExport_CloseButtonPressed",
                            this.commercialDiagnosticsUtilities.formatMessage("Navigating to CXID '{0}'...", previousNodeCxid));

                        return bridge.fireEvent(CloudExperienceHost.Events.done, previousNodeCxid);
                    } catch (e) {
                        this.commercialDiagnosticsUtilities.logExceptionEvent(
                            "CommercialOOBE_ExportDiagnostics_LogsExport_CloseButtonPressed_Failed",
                            this.commercialDiagnosticsUtilities.formatMessage(
                                "Navigating to CXID: {0} in closeButtonClick failed.",
                                this.DIAGNOSTICS_PREVIOUS_CXID_NAME),
                            e);
                    }
                }, (e) => {
                    this.commercialDiagnosticsUtilities.logExceptionEvent(
                        "CommercialOOBE_ExportDiagnostics_LogsExport_CloseButtonPressed_PreviousCxidRetrievalFailed",
                        this.commercialDiagnosticsUtilities.formatMessage(
                            "CloudExperienceHost.Storage.SharableData.getValue for CXID: {0} in closeButtonClick failed.",
                            this.DIAGNOSTICS_PREVIOUS_CXID_NAME),
                        e);
                });
        }

        showOnlySpecificRegion(region) {
            // Reset page title.
            this.pageTitle(this.resourceStrings["ExportDiagnosticsPageTitle"]);

            try {
                // Display the correct lottie animation depending on the view.
                if (region !== this.shouldShowError) {
                    bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", this.defaultLottieFile);
                } else {
                    bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", this.failureLottieFile);
                }

                for (let i = 0; i < this.regionVisibilityFlags.length; i++) {
                    (this.regionVisibilityFlags[i])(false);
                }
                region(true);

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_ExportDiagnostics_ShowOnlySpecificRegion_Succeeded",
                    "Invoked showOnlySpecificRegion successfully.");

            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "CommercialOOBE_ExportDiagnostics_ShowOnlySpecificRegion_Failed",
                    "showOnlySpecificRegion failed.",
                    e);
            }
        }

        displayError(buttonVisibility, code, description, subheaderOverride) {
            // Change the button visibility to match what the caller intends.
            this.buttonVisibility(buttonVisibility);

            // If no override is defined, use the default.
            this.errorSubHeader((subheaderOverride === undefined || subheaderOverride === null) ? this.resourceStrings["ExportDiagnosticsPageTryAgainFailureMessage"] : subheaderOverride);

            let errorCode = this.commercialDiagnosticsUtilities.formatMessage(
                this.resourceStrings["ExportDiagnosticsPageErrorCode"], 
                this.commercialDiagnosticsUtilities.formatNumberAsHexString(code, 8));
            this.errorCode(errorCode);

            let errorDescription = this.commercialDiagnosticsUtilities.formatMessage(this.resourceStrings["ExportDiagnosticsPageErrorDescription"], description);
            this.errorDescription(errorDescription);

            this.showOnlySpecificRegion(this.shouldShowError);
        }
    }

    return ExportDiagnosticsViewModel;
});
