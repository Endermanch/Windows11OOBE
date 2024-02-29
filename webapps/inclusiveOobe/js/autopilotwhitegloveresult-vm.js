//
// Copyright (C) Microsoft. All rights reserved.
//
define([
    'lib/knockout',
    'legacy/bridge',
    'legacy/events',
    'legacy/core',
    'autopilot-telemetry',
    'autopilot/commercialDiagnosticsUtilities'], (
    ko,
    bridge,
    constants,
    core,
    autopilotTelemetryUtility,
    commercialDiagnosticsUtilities) => {
    class WhiteGloveResultViewModel {
        constructor(resourceStrings) {
            this.enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
            this.pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
            this.autoPilotManager = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();
            this.deviceManagementUtilities = new ModernDeployment.Autopilot.Core.DeviceManagementUtilities();
            this.autopilotLogger = new ModernDeployment.Autopilot.Core.AutopilotLogging();

            // UI element initialization
            this.resourceStrings = resourceStrings;

            this.organizationName = ko.observable(resourceStrings.WhiteGloveOrganizationNotFound);
            this.profileName = ko.observable(resourceStrings.WhiteGloveProfileNotFound);
            this.assignedUserName = ko.observable(resourceStrings.WhiteGloveUserNotAssigned);
            this.elapsedHoursText = resourceStrings.WhiteGloveHoursText;
            this.elapsedMinutesText = resourceStrings.WhiteGloveMinutesText;
            this.elapsedTimeNumber = ko.observable(resourceStrings.WhiteGloveTimeText);

            this.title = ko.observable("");
            this.errorMessage = ko.observable("");
            this.resultInstructionsText = ko.observable("");
            this.subHeaderText = ko.observable("");
            this.subHeaderErrorText = ko.observable("");
            this.organizationText = resourceStrings.WhiteGloveOrganizationTitle;
            this.profileText = resourceStrings.WhiteGloveProfileTitle;
            this.assignedUserText = resourceStrings.WhiteGloveAssignedUserTitle;
            this.elapsedTimeText = resourceStrings.WhiteGloveElapsedTimeTitle;
            this.whiteGloveQRCodeText = resourceStrings.WhiteGloveQRCode;
            this.viewDiagnosticsText = resourceStrings.WhiteGloveFailureForMoreDetails;
            this.viewDiagnosticsHyperlinkText = resourceStrings.WhiteGloveDiagnosticsHyperlinkText;
            this.qrCodeMessageText = resourceStrings.WhiteGloveQRCodeMessageBlob;

            this.provisioningTextStyle = ko.observable("");
            this.resultBackground = ko.observable("");
            this.showResultFooter = ko.observable("");
            this.isResetButtonDisabled = ko.observable(false);
            this.isRetryButtonDisabled = ko.observable(true);
            this.isDiagnosticsDisabled = ko.observable(false);
            this.showDiagnosticsHyperlinkEnabled = ko.observable(false);
            this.isLoading = ko.observable(false);
            this.isFailure = ko.observable(false);
            this.successLottieFile = "autopilotLottie.json";
            this.failureLottieFile = "errorLottie.json";
            this.showUIElements = ko.observable(false);

            let flexStartHyperlinksSets = {};
            let flexEndButtonsSets = {};
            this.hyperlinkVisibility = ko.observable(0);
            this.buttonVisibility = ko.observable(0);

            // By default, show the default view
            this.shouldShowDefaultView = ko.observable(true);
            this.shouldShowDesktopLiteView = ko.observable(false);

            // All flags gating visibility of regions of the main content must be added to this
            // array.
            this.viewVisibilityFlags = [
                this.shouldShowDefaultView,
                this.shouldShowDesktopLiteView
            ];

            this.commercialDiagnosticsUtilities = new commercialDiagnosticsUtilities();

            // Decide which view to toggle on based on the current context's personality.
            if (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite) {
                this.toggleSingleViewVisibilityOn(this.shouldShowDesktopLiteView);
            } else {
                this.toggleSingleViewVisibilityOn(this.shouldShowDefaultView);
            }

            // Sharable Data Values - must be kept in sync with their values in:
            // autopilotwhiteglovelanding-vm.js
            // oobeprovisioningprogress-vm.js
            this.whiteGloveStartTimeValueName = "AutopilotWhiteGloveStartTime";
            this.whiteGloveEndTimeValueName = "AutopilotWhiteGloveEndTime";
            this.whiteGloveSuccessValueName = "AutopilotWhiteGloveSuccess";
            this.whiteGloveDomainJoinStateValueName = "AutopilotWhiteGloveDomainJoinInProgress";

            // Time Constants
            this.msPerHour = 3600000;
            this.msPerMinute = 60000;

            // Footer Button Visibility Enumerations
            this.BUTTON_WHITE_GLOVE_SUCCESS = 0;
            this.BUTTON_WHITE_GLOVE_FAILURE = 1;

            // Footer Hyperlink Visibility Enumerations
            this.HYPERLINK_WHITE_GLOVE_NONE = 0;
            this.HYPERLINK_WHITE_GLOVE_DIAGNOSTICS_ENABLED = 1;

            // Diagnostics Enumerations
            this.whiteGloveLogName = "\\AutopilotWhiteGloveLogs.zip";
            this.diagnosticsPreviousCXID = "DiagnosticsPreviousCXID";
            this.diagnosticsLogsExportAreaName = "DiagnosticsLogsExportArea";
            this.diagnosticsLogsExportAreaValue = "Autopilot;TPM";

            // This value has to be kept in sync with the CXID in Navigation.json
            this.PAGE_TRANSITION_DIAGNOSTICS_PAGE = "OobeDiagnostics";

            this.E_DIAGNOSTIC_ANALYSIS_FRAMEWORK_GENERIC_ERROR = 0x81039025; // defined in AutopilotErrors.mc

            flexStartHyperlinksSets[this.HYPERLINK_WHITE_GLOVE_NONE] = [];
            flexStartHyperlinksSets[this.HYPERLINK_WHITE_GLOVE_DIAGNOSTICS_ENABLED] = [
                {
                    handler: () => {
                        this.onDiagnosticsClickAsync(this.diagnosticsLogsExportAreaValue, this.whiteGloveLogName);
                    },
                    disableControl: ko.pureComputed(() => {
                        return this.isDiagnosticsDisabled();
                    }),
                    hyperlinkText: resourceStrings.WhiteGloveDiagnosticsButtonText
                }
            ];

            this.flexStartHyperLinks = ko.pureComputed(() => {
                return flexStartHyperlinksSets[this.hyperlinkVisibility()];
            });

            flexEndButtonsSets[this.BUTTON_WHITE_GLOVE_SUCCESS] = [
                {
                    buttonText: resourceStrings.WhiteGloveResealButtonText,
                    buttonType: "button",
                    isPrimaryButton: true,
                    buttonClickHandler: () => {
                        this.onResealAsync();
                    }
                }
            ];

            flexEndButtonsSets[this.BUTTON_WHITE_GLOVE_FAILURE] = [
                {
                    buttonText: resourceStrings.WhiteGloveRetryButtonText,
                    buttonType: "button",
                    isPrimaryButton: true,
                    disableControl: ko.pureComputed(() => {
                        return this.isRetryButtonDisabled();
                    }),
                    buttonClickHandler: () => {
                        bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", this.whiteGloveSuccessValueName);
                        bridge.fireEvent(constants.Events.done, constants.AppResult.action1);
                    }
                },
                {
                    buttonText: resourceStrings.WhiteGloveResetButtonText,
                    buttonType: "button",
                    isPrimaryButton: true,
                    disableControl: ko.pureComputed(() => {
                        return this.isResetButtonDisabled();
                    }),
                    buttonClickHandler: () => {
                        this.onResetAsync();
                    }
                }
            ];

            this.flexEndButtons = ko.pureComputed(() => {
                return flexEndButtonsSets[this.buttonVisibility()];
            });

            this.runAsync(this.displayResultsAsyncGen);
        }      

        *isShowDiagnosticsEnabledAsyncGen() {
            try {
                let isViewDiagnosticsEnabled = yield this.enterpriseManagementWorker.shouldShowCollectLogsAsync(true);
                this.showDiagnosticsHyperlinkEnabled(isViewDiagnosticsEnabled);

                yield bridge.invoke(
                    "CloudExperienceHost.AutoPilot.logInfoEvent",
                    "CommercialOOBE_WhiteGlove_ShowDiagnosticsHyperlinkPolicy_Succeeded",
                    `Show diagnostics policy enabled = ${this.showDiagnosticsHyperlinkEnabled()}`);
            } catch (error) {
                yield bridge.invoke("CloudExperienceHost.AutoPilot.logHresultEvent",
                    "CommercialOOBE_WhiteGlove_ShowDiagnosticsHyperlinkPolicy_Failed",
                    "Show diagnostics policy retrieval failed.", 
                    error.number);
            }
        }

        onResetAsync() {
            return this.runAsync(this.resetAsyncGen);
        }

        *resetAsyncGen() {
            this.isResetButtonDisabled(true);
            this.isDiagnosticsDisabled(true);

            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "White glove failure page system reset chosen");

            yield bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", this.whiteGloveStartTimeValueName);
            yield bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", this.whiteGloveDomainJoinStateValueName);
            yield bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", this.whiteGloveSuccessValueName);

            try {
                yield this.pluginManager.initiateSystemResetAsync();
                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "White glove failure page system reset successful");
            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Reset, "system reset error", error);
                this.displayError();
            }
        }

        onDiagnosticsClickAsync(area, file) {
            if (CloudExperienceHostAPI.FeatureStaging.isOobeFeatureEnabled("WindowsAutopilotDiagnostics")) {
                return this.runAsync(this.viewDiagnosticsClickHandlerAsyncGen);
            }
            return this.runAsync(this.collectLogsClickHandlerAsyncGen, area, file);
        }

        onDiagnosticsKeyPressAsync(data, event) {
            // If the "Enter" key is pressed
            if (event.keyCode == 13) {
                return this.runAsync(this.onDiagnosticsClickAsync, this.diagnosticsLogsExportAreaValue, this.whiteGloveLogName);
            }
        }

        *viewDiagnosticsClickHandlerAsyncGen() {
            try {
                // Save current CXID and navigate to troubleshooting page
                let currentNode = yield bridge.invoke("CloudExperienceHost.AutoPilot.AutopilotWrapper.GetCurrentNode");
                yield bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.diagnosticsPreviousCXID, currentNode.cxid);
                yield bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.diagnosticsLogsExportAreaName, this.diagnosticsLogsExportAreaValue);
                yield this.autopilotLogger.logAutopilotTelemetryAsync(
                    "DiagnosticAnalysisFramework",
                    "AutopilotWhiteGloveResultPage",
                    "PageLaunchedByButton",
                    "Success",
                    0);
                bridge.fireEvent(CloudExperienceHost.Events.done, this.PAGE_TRANSITION_DIAGNOSTICS_PAGE);
            } catch (error) {
                let errorCode = error.number ? error.number : this.E_DIAGNOSTIC_ANALYSIS_FRAMEWORK_GENERIC_ERROR;

                yield this.autopilotLogger.logAutopilotTelemetryAsync(
                    "DiagnosticAnalysisFramework",
                    "AutopilotWhiteGloveResultPage",
                    "PageLaunchedByButton",
                    "Failure",
                    errorCode);
                yield this.runAsync(this.logFailureEventAsyncGen, "view diagnostics error", error);
                this.displayError();
            }
        }

        *collectLogsClickHandlerAsyncGen(area, file) {
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "White glove failure page collect logs chosen");
            let formerSubheaderText = this.subHeaderText._latestValue ? this.subHeaderText._latestValue : this.errorMessage._latestValue;
            let formerIsRetryButtonDisabledState = this.isRetryButtonDisabled._latestValue;

            try {
                let folderPath = yield bridge.invoke("CloudExperienceHost.showFolderPicker");

                this.isResetButtonDisabled(true);
                this.isDiagnosticsDisabled(true);
                this.isRetryButtonDisabled(true);
                this.isLoading(true);

                this.subHeaderText(this.resourceStrings.CollectingLogsSpinnerText);
                this.errorMessage(this.resourceStrings.CollectingLogsSpinnerText);

                yield this.enterpriseManagementWorker.collectLogsEx(area, folderPath + file);

                this.isResetButtonDisabled(false);
                this.isDiagnosticsDisabled(false);
                this.isLoading(false);
                this.isRetryButtonDisabled(formerIsRetryButtonDisabledState);
                this.subHeaderText(formerSubheaderText);
                this.errorMessage(formerSubheaderText);

                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "White glove failure page collect logs failure");
            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, "log collection error", error);

                this.isResetButtonDisabled(false);
                this.isDiagnosticsDisabled(false);
                this.isLoading(false);
                this.isRetryButtonDisabled(formerIsRetryButtonDisabledState);
                this.subHeaderText(formerSubheaderText);
                this.errorMessage(formerSubheaderText);

                this.displayError();
            }
        }

        onResealAsync() {
            return this.runAsync(this.resealAsyncGen);
        }

        *resealAsyncGen() {
            try {
                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "White glove reseal started");

                // Clears new sharable data
                yield bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", this.whiteGloveStartTimeValueName);
                yield bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", this.whiteGloveSuccessValueName);
                yield bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", this.whiteGloveDomainJoinStateValueName);

                // Update the white glove mode indicating that technician flow has completed and the device has been resealed.
                yield this.autoPilotManager.setDeviceAutopilotModeAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveResealed);

                // Clears value so first page of OOBE will show on start up
                yield bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", "resumeCXHId");

                // Disables resuming OOBE at a certain node
                yield bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", "OOBEResumeEnabled");

                // Deletes the following so that the Device ESP is displayed during the user flow after reseal:
                // 1. The IsSyncDone registry value
                // 2. The ServerHasFinishedProvisioning registry value
                // 3. The DMClient CSP tracking files
                // 4. The Sidecar tracking policies
                yield this.deviceManagementUtilities.prepareForResealAsync();

                // Powers down the device
                yield CloudExperienceHostAPI.UtilStaticsCore.shutdownAsync();
                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "White glove shut down initiated");
                yield bridge.invoke("CloudExperienceHost.Telemetry.oobeHealthEvent", CloudExperienceHostAPI.HealthEvent.machineReseal, 0 /* Unused Result Parameter */);
            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Shutdown, "shutdown error", error);
                this.displayError();
            }          
        }

        *displayResultsAsyncGen()
        {
            this.showUIElements(false);

            try {
                yield this.runAsync(this.isShowDiagnosticsEnabledAsyncGen);

                // Check for success value written by ESP when it successfully completes.
                let result = yield bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveSuccessValueName);

                if (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite) {
                    this.displayDesktopLiteResult(result);
                } else {
                    this.displayInclusiveBlueResult(result);
                }

                yield this.runAsync(this.displayCategoriesAsyncGen);
                yield this.runAsync(this.displayProvisioningTimeAsyncGen);
                yield this.runAsync(this.displayQRCodeAsyncGen);
            } catch (error) {
                // Swallow exception and show error on page.
                this.displayError();
            }

            this.showUIElements(true);
        }

        *displayCategoriesAsyncGen() {
            try {
                let organizationName = yield this.autoPilotManager.getStringPolicyAsync("CloudAssignedTenantDomain");
                if (organizationName !== "") {
                    this.organizationName(organizationName);
                }
    
                let profileName = yield this.autoPilotManager.getStringPolicyAsync("DeploymentProfileName");
                if (profileName !== "") {
                    this.profileName(profileName);
                } 
    
                let userName = yield this.autoPilotManager.getStringPolicyAsync("CloudAssignedTenantUpn");
                if (userName !== "") {
                    this.assignedUserName(userName);
                }
            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Error, "error retrieving Autopilot policies.", error);
                throw error;
            }            
        }

        *displayQRCodeAsyncGen() {
            try {
                let result = yield bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveSuccessValueName);
                let startTime = yield bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveStartTimeValueName);
                let endTime = yield bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveEndTimeValueName);
                let elapsedTimeMilliseconds = endTime - startTime;

                let qrData = yield this.autoPilotManager.getDeviceBlobForQRCodeAsync();
                let qrDataJson = JSON.parse(qrData);

                // Add result and elapsed time to QR code
                if (result === "Success") {
                    qrDataJson.Result = "Success";
                }
                else {
                    qrDataJson.Result = "Failure";
                }

                qrDataJson.ElapsedTimeMilliseconds = elapsedTimeMilliseconds;
                let qrDataString = JSON.stringify(qrDataJson);

                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: QR code result", qrDataString);

                // If ZtdId was retrieved, display the QR code
                if (qrDataJson.ZtdId != "") {
                    let walletBarcode = new Windows.ApplicationModel.Wallet.WalletBarcode(Windows.ApplicationModel.Wallet.WalletBarcodeSymbology.qr, qrDataString);

                    let image = yield walletBarcode.getImageAsync();
                    if (image != null) {
                        let qrCode = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite) ? document.getElementById("qrCodeImageLite") : document.getElementById("qrAssignmentCode");
                        qrCode.setAttribute("aria-label", this.whiteGloveQRCodeText);
                        let blob = yield image.openReadAsync();

                        let qrImageStream = MSApp.createStreamFromInputStream("image/bmp", blob);
                        qrCode.src = URL.createObjectURL(qrImageStream);
                    }
                } else {
                    // Else the device is not registered, so display error message and block next button
                    yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Error, "Unable to get device ZtdId");
                }
            } catch (error) {
                // If device blob retrieval failed, display error message and block next button
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Error, "QR blob generation error", error);
                throw error;
            }
        }

        *displayProvisioningTimeAsyncGen() {
            try {
                let startTime = yield bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveStartTimeValueName);
                let endTime = yield bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveEndTimeValueName);
                let milliseconds = endTime - startTime;
                let hours = Math.floor(milliseconds / this.msPerHour);
                let minutes = Math.floor((milliseconds - (hours * this.msPerHour)) / this.msPerMinute);

                this.elapsedTimeNumber(resourceStrings.WhiteGloveTimeText
                    .replace("{0}", hours)
                    .replace("{1}", minutes));
            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Error, "error retrieving start time", error);
                throw error;
            }
        }
        
        displayError() {
            // Only affects default Inclusive Blue view
            this.provisioningTextStyle("error");
            this.subHeaderText(this.resourceStrings.WhiteGloveQRCodeError);

            // Only affects default Desktop Lite view
            this.errorMessage(this.resourceStrings.WhiteGloveQRCodeError);
        }

        displayInclusiveBlueResult(result) {
            this.title(resourceStrings.WhiteGloveTitle);

            if (result === "Success") {
                this.resultBackground("success-background");
                this.showResultFooter("success-footer");
                this.subHeaderText(this.resourceStrings.WhiteGloveCompletedText);
                this.hyperlinkVisibility(this.HYPERLINK_WHITE_GLOVE_NONE);
                this.buttonVisibility(this.BUTTON_WHITE_GLOVE_SUCCESS);

                autopilotTelemetryUtility.logger.logError(
                    autopilotTelemetryUtility.whiteGloveInformational.Success,
                    "AutopilotWhiteGlove: showing success page because AutopilotWhiteGloveSuccess was marked as success.");
                bridge.invoke(
                    "CloudExperienceHost.AutoPilot.logInfoEvent",
                    "CommercialOOBE_WhiteGlove_TechnicianFlow_Succeeded",
                    "White glove technician flow succeeded.");
            } else {
                this.resultBackground("failure-background");
                this.showResultFooter("failure-footer");

                if (this.showDiagnosticsHyperlinkEnabled()) {
                    this.hyperlinkVisibility(this.HYPERLINK_WHITE_GLOVE_DIAGNOSTICS_ENABLED);
                    this.subHeaderText(this.resourceStrings.WhiteGloveFailureText);
                } else {
                    this.hyperlinkVisibility(this.HYPERLINK_WHITE_GLOVE_NONE);
                    this.subHeaderText(this.resourceStrings.WhiteGloveFailureDiagnosticsDisabledText);
                }

                this.buttonVisibility(this.BUTTON_WHITE_GLOVE_FAILURE);
                this.isRetryButtonDisabled(!this.isRetriableError(result));
                if (result !== null) {
                    this.subHeaderErrorText(result);
                    autopilotTelemetryUtility.logger.logError(autopilotTelemetryUtility.whiteGloveError.Error, "AutopilotWhiteGLove: showing failure page because AutopilotWhiteGloveSuccess was marked as an error.");
                }
            }
        }

        resetStrings()
        {
            // Inclusive Blue strings
            this.subHeaderText("");

            // Desktop Lite strings
            this.errorMessage("");
            this.resultInstructionsText("");
        }

        displayDesktopLiteResult(result)
        {
            this.resetStrings();

            if (result === "Success") {
                bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", this.successLottieFile);

                this.isFailure(false);
                this.title(resourceStrings.WhiteGloveResultSuccessTitle);

                this.hyperlinkVisibility(this.HYPERLINK_WHITE_GLOVE_NONE);
                this.buttonVisibility(this.BUTTON_WHITE_GLOVE_SUCCESS);
                this.resultInstructionsText(this.resourceStrings.WhiteGloveCompletedText);

                autopilotTelemetryUtility.logger.logError(
                    autopilotTelemetryUtility.whiteGloveInformational.Success,
                    "AutopilotWhiteGlove: Showing success page because AutopilotWhiteGloveSuccess was marked as success.");
                bridge.invoke(
                    "CloudExperienceHost.AutoPilot.logInfoEvent",
                    "CommercialOOBE_WhiteGlove_TechnicianFlow_Succeeded",
                    "White glove technician flow succeeded.");
            } else {
                bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", this.failureLottieFile);

                this.isFailure(true);
                this.title(resourceStrings.WhiteGloveResultFailureTitle);

                this.hyperlinkVisibility(this.HYPERLINK_WHITE_GLOVE_NONE);
                this.buttonVisibility(this.BUTTON_WHITE_GLOVE_FAILURE);
                this.resultInstructionsText(this.resourceStrings.WhiteGloveFailureDiagnosticsDisabledText);

                this.isRetryButtonDisabled(!this.isRetriableError(result));

                if (result !== null && result !== undefined) {
                    this.errorMessage(result);
                } else {
                    this.errorMessage(this.resourceStrings.WhiteGloveTimeOutError);
                }

                autopilotTelemetryUtility.logger.logError(
                    autopilotTelemetryUtility.whiteGloveError.Error,
                    "AutopilotWhiteGLove: Showing failure page because AutopilotWhiteGloveSuccess was marked as an error.");
            }
        }

        // By default assume all errors are re-triable 
        isRetriableError(result) {
            return true;
        }

        *logFailureEventAsyncGen(area, failureName, e) {
            yield autopilotTelemetryUtility.logger.logError(area, failureName + " " + JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));

            if (typeof e !== "undefined") {
                yield autopilotTelemetryUtility.logger.logErrorCode(area, e.number);
            }
        }        
        
        runAsync(makeGenerator) {
            let generatorArgs = [].slice.call(arguments, 1);
            return function () {
                let generator = makeGenerator.apply(this, arguments);

                function iterateGenerator(result) {
                    // every yield returns: result => { done: [Boolean], value: [Object] }
                    if (result.done) {
                        return Promise.resolve(result.value);
                    }

                    return Promise.resolve(result.value).then(function (result) {
                        return iterateGenerator(generator.next(result));
                    }, function (error) {
                        return iterateGenerator(generator.throw(error));
                    });
                }

                try {
                    return iterateGenerator(generator.next());
                } catch (error) {
                    return Promise.reject(error);
                }
            }.apply(this, generatorArgs);
        }

        toggleSingleViewVisibilityOn(targetView) {
            try {
                // Toggle visibility all view off and only the target view on.
                for (let i = 0; i < this.viewVisibilityFlags.length; i++) {
                    (this.viewVisibilityFlags[i])(false);
                }

                targetView(true);

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_AutopilotWhiteGloveResult_ToggleSingleViewVisibilityOn_Succeeded",
                    "Invoked ToggleSingleViewVisibilityOn successfully.");

            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "CommercialOOBE_AutopilotWhiteGloveResult_ToggleSingleViewVisibilityOn_Failed",
                    "ToggleSingleViewVisibilityOn failed.",
                    e);
            }
        }
    }
    return WhiteGloveResultViewModel;
});
