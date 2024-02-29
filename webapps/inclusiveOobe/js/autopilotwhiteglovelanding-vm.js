//
// Copyright (C) Microsoft. All rights reserved.
//
define([
    'lib/knockout',
    'legacy/bridge',
    'legacy/events',
    'autopilot-telemetry',
    'legacy/appObjectFactory',
    'autopilot/commercialDiagnosticsUtilities'], (
    ko,
    bridge,
    constants,
    autopilotTelemetryUtility,
    appObjectFactory,
    commercialDiagnosticsUtilities) => {
    class WhiteGloveViewModel {
        constructor(resourceStrings, isInternetAvailable, targetPersonality) {

            // UI element initialization
            this.resourceStrings = resourceStrings;
            this.organizationName = ko.observable(resourceStrings.WhiteGloveOrganizationNotFound);
            this.profileName = ko.observable(resourceStrings.WhiteGloveProfileNotFound);
            this.assignedUserName = ko.observable(resourceStrings.WhiteGloveUserNotAssigned);

            this.instructionsIntroText = ko.observable(resourceStrings.WhiteGloveInstructionsIntroText);
            this.scanQRCodeWithAppText = ko.observable(resourceStrings.WhiteGloveScanQRCodeWithAppText);
            this.makeAnyNeededChangesText = ko.observable(resourceStrings.WhiteGloveMakeAnyNeededChangesText);
            this.selectText = ko.observable(resourceStrings.WhiteGloveSelectText);
            this.refreshText = ko.observable(resourceStrings.WhiteGloveRefreshButtonText);

            this.isNextButtonDisabled = ko.observable(false);
            this.isRefreshButtonDisabled = ko.observable(true);
            this.provisioningTextStyle = ko.observable("");
            this.title = ko.observable(resourceStrings.WhiteGloveTitle);
            this.subHeaderText = ko.observable(resourceStrings.WhiteGloveLeadingText);
            this.instructionSubtitle = ko.observable(resourceStrings.WhiteGloveLeadingTextLite);
            this.hybridAadjLoadingText = ko.observable(resourceStrings.WhiteGloveDJPPLoading);
            this.organizationText = resourceStrings.WhiteGloveOrganizationTitle;
            this.profileText = resourceStrings.WhiteGloveProfileTitle;
            this.assignedUserText = resourceStrings.WhiteGloveAssignedUserTitle;
            this.IsDJPPLoading = ko.observable(false);

            this.tpmAttestationTimeout = null;
            this.policyProvidersInstalled = false;
            this.tpmAttestationEventName = "tpmevent";

            this.enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
            this.autoPilotSubscriptionManager = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotWnfSubscriptionManager();
            this.tpmNotificationManager = new ModernDeployment.Autopilot.Core.TpmNotification();
            this.autoPilotManager = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();
            this.pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();

            // By default, show the default view
            this.shouldShowDefaultView = ko.observable(true);
            this.shouldShowDesktopLiteView = ko.observable(false);
            this.shouldShowHybridAadjProgress = ko.observable(false);

            // Footer hyperlink visibility enumerations
            this.INCLUSIVE_BLUE_FOOTER = 0;
            this.DESKTOP_LITE_FOOTER = 1;

            this.hyperlinkVisibility = ko.observable(0);

            // All flags gating visibility of regions of the main content must be added to this
            // array.
            this.viewVisibilityFlags = [
                this.shouldShowDefaultView,
                this.shouldShowDesktopLiteView
            ];

            this.commercialDiagnosticsUtilities = new commercialDiagnosticsUtilities();

            this.isLiteWhitePersonality = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite);

            this.showLandingView();

            this.noInternetErrorCode = 0x800C0003;
            this.timeoutErrorCode = 0x800705B4;

            // Sharable Data Values - must be kept in sync with their values in:
            // autopilotwhitegloveresult-vm.js
            // oobeprovisioningprogress-vm.js
            this.whitGloveResultsPageCxid = "AutopilotWhiteGloveLanding";
            this.whiteGloveDJPPIdFailed = "WhiteGloveDJPPFailed";
            this.whiteGloveStartTimeValueName = "AutopilotWhiteGloveStartTime";
            this.whiteGloveDjContinuationValueName = "AutopilotWhiteGloveDomainJoinInProgress";
            this.whiteGloveSuccessValueName = "AutopilotWhiteGloveSuccess";
            this.whiteGloveError = this.resourceStrings.WhiteGloveTimeOutError;
            this.whiteGloveQRCodeText = this.resourceStrings.WhiteGloveQRCode;

            // Sharable Data Values used by otadjUtils.js (in ESTS)
            this.djFlowStateEnumName = "OtaDomainJoinState";
            this.djFlowStatePostRebootEnumValue = 2;            

            this.connectivityTimeoutInMilliseconds = 1500000; // 25 minutes (in ms)

            this.cloudAssignedDomainJoinMethodHybridAAD = 1;

            this.domainControllerNotFoundError = "80070774";

            let flexStartHyperlinksSets = {};
            let flexEndButtonsSets = {};

            // Hyperlink objects
            let cancelHyperlink = {
                handler: () => {
                    this.exitButtonClick();
                },
                hyperlinkText: resourceStrings.WhiteGloveBackButtonText
            };

            let refreshHyperlink = {
                handler: () => {
                    this.runAsync(this.refreshAsyncGen);
                },
                disableControl: ko.pureComputed(() => {
                    return this.isRefreshButtonDisabled();
                }),
                hyperlinkText: resourceStrings.WhiteGloveRefreshButtonText
            };

            let cancelButton = {
                buttonText: this.resourceStrings.WhiteGloveBackButtonText,
                buttonType: "button",
                isPrimaryButton: false,
                buttonClickHandler: () => {
                    this.exitButtonClick();
                }
            };

            let nextButton = {
                buttonText: resourceStrings.WhiteGloveNextButtonText,
                buttonType: "button",
                isPrimaryButton: true,
                disableControl: ko.pureComputed(() => {
                    return this.isNextButtonDisabled();
                }),
                buttonClickHandler: () => {
                    this.isNextButtonDisabled(true);
                    this.runAsync(this.handleButtonClickAsyncGen);
                }
            };

            // Define hyperlink scenarios
            flexStartHyperlinksSets[this.DESKTOP_LITE_FOOTER] = [];
            flexStartHyperlinksSets[this.INCLUSIVE_BLUE_FOOTER] = [
                cancelHyperlink,
                refreshHyperlink
            ];

            // Define Button scenarios
            flexEndButtonsSets[this.DESKTOP_LITE_FOOTER] = [
                cancelButton,
                nextButton
            ];
            flexEndButtonsSets[this.INCLUSIVE_BLUE_FOOTER] = [
                nextButton
            ];

            // Commit the button and hyperlink scenarios to knockout
            this.flexStartHyperLinks = ko.pureComputed(() => {
                return flexStartHyperlinksSets[this.hyperlinkVisibility()];
            });

            this.flexEndButtons = ko.pureComputed(() => {
                return flexEndButtonsSets[this.hyperlinkVisibility()];
            });

            if (isInternetAvailable) {
                this.runAsync(this.checkForDjContinuationAsyncGen);
            } else {
                this.whiteGloveError = this.resourceStrings.WhiteGloveNoInternetText;
                autopilotTelemetryUtility.logger.logError(autopilotTelemetryUtility.whiteGloveError.Network, "No network found");
                bridge.invoke(
                    "CloudExperienceHost.AutoPilot.logHresultEvent",
                    "CommercialOOBE_WhiteGlove_TechnicianFlow_FailedDueToNoNetwork",
                    "Could not retrieve Autopilot profile due to no network connection found.",
                    this.noInternetErrorCode);
                this.runAsync(this.navigateToResultsPageOnFailureAsyncGen);
            }

            this.runAsync(this.checkForAutopilotResetAsyncGen);
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

        onRefreshClickAsync()
        {
            return this.runAsync(this.refreshAsyncGen);
        }

        onRefreshKeyPressAsync(data, event)
        {
            // If the "Enter" key is pressed
            if (event.keyCode == 13) {
                return this.runAsync(this.onRefreshClickAsync);
            }
        }

        exitButtonClick()
        {
            bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", this.whiteGloveStartTimeValueName);
            bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
        }

        *checkForAutopilotResetAsyncGen() {
            try {
                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Checking for Autopilot reset flows.");

                let isAutopilotReset = this.pluginManager.isPostPowerwash();
                if (isAutopilotReset === true) {
                    yield bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.whiteGloveSuccessValueName, this.resourceStrings.WhiteGloveAutopilotResetNotSupported);
                    autopilotTelemetryUtility.logger.logError(autopilotTelemetryUtility.whiteGloveError.AutopilotReset, "Autopilot White Glove is not supported under Autopilot Reset.");
                    yield this.runAsync(this.navigateToResultsPageOnFailureAsyncGen);
                }
            }
            catch (error) {
                // Swallow exception and navigate to results page.
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.AutopilotReset, "failed autopilot reset check", error);
                yield this.runAsync(this.navigateToResultsPageOnFailureAsyncGen);
            }
        }

        *handleButtonClickAsyncGen() {
            try {
                yield bridge.invoke(
                    "CloudExperienceHost.AutoPilot.logInfoEvent",
                    "CommercialOOBE_WhiteGlove_TechnicianFlow_Started",
                    "White glove page starting technician flow.");
                yield this.runAsync(this.initializeWhiteGloveModeAsyncGen);
                bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.whiteGloveStartTimeValueName, Date.now());

                let autopilotMode = yield this.autoPilotManager.getDeviceAutopilotModeAsync();
                if (autopilotMode == EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP) {
                    // If the Autopilot mode is DJ++, do Plug and Forget provisioning and go to OobeDomainJoin node
                    yield this.runAsync(this.launchWhiteGloveDJPPAsyncGen);
                } else {
                    // If the Autopilot mode is Canonical, go to Provisioning Progress node
                    bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                }
            } catch (error) {
                // Swallow exception and navigate to results page.
                yield this.runAsync(this.navigateToResultsPageOnFailureAsyncGen);
            }
        }

        *checkForDjContinuationAsyncGen() {
            try {
                let isDjContinuation = yield bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveDjContinuationValueName);
                if (isDjContinuation === true) {
                    // White Glove DJ++ flow resuming after reboot for domain joining the device.
                    yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: DJ++ is continuing after reboot.");

                    yield this.runAsync(this.refreshUxAsyncGen);

                    // Disable the next button to prevent user from re-initating DJ++ flow
                    this.isNextButtonDisabled(true);

                    // Disable the refresh button to prevent user from refreshing the page during DJ++ flow
                    this.isRefreshButtonDisabled(true);

                    this.showHybridAadjProgressView();

                    yield this.runAsync(this.waitForDomainConnectivityAsyncGen);
                    yield this.runAsync(this.exitDJFlowAsyncGen);

                } else {
                    yield this.runAsync(this.refreshDataAsyncGen);
                    yield this.runAsync(this.refreshUxAsyncGen);
                }
            } catch (error) {
                // Swallow exception and navigate to results page.
                yield this.runAsync(this.navigateToResultsPageOnFailureAsyncGen);
            }
        }

        *initializeWhiteGloveModeAsyncGen() {
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: initializeWhiteGloveMode called");

            try {
                var joinMethod = yield this.autoPilotManager.getDwordPolicyAsync("CloudAssignedDomainJoinMethod");
                if (this.cloudAssignedDomainJoinMethodHybridAAD == joinMethod) {
                    yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: setting DJ++ mode", JSON.stringify({ CloudAssignedDomainJoinMethod: joinMethod }));
                    yield this.autoPilotManager.setDeviceAutopilotModeAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP);
                } else {
                    yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: setting canonical mode", JSON.stringify({ CloudAssignedDomainJoinMethod: joinMethod }));
                    yield this.autoPilotManager.setDeviceAutopilotModeAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveCanonical);
                }
            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Error, "error setting White Glove mode.", error);
                throw error;
            }
        }

        *displayQRCodeAsyncGen() {
            try {
                var qrData = yield this.autoPilotManager.getDeviceBlobForQRCodeAsync();
                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: QR code result", JSON.stringify({ data: qrData }));

                // If ZtdId was retrieved, display the QR code
                if (JSON.parse(qrData).ZtdId != "") {
                    let walletBarcode = new Windows.ApplicationModel.Wallet.WalletBarcode(Windows.ApplicationModel.Wallet.WalletBarcodeSymbology.qr, qrData);

                    var image = yield walletBarcode.getImageAsync();
                    if (image != null) {
                        let qrCode = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite) ? document.getElementById("qrCodeImageLite") : document.getElementById("qrAssignmentCode");
                        qrCode.setAttribute("aria-label", this.whiteGloveQRCodeText);
                        var blob = yield image.openReadAsync();

                        let qrImageStream = MSApp.createStreamFromInputStream("image/bmp", blob);
                        qrCode.src = URL.createObjectURL(qrImageStream);
                    }
                } else {
                    // Else the device is not registered, so display error message and block next button
                    yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Error, "Unable to get device ZtdId");
                    this.whiteGloveError = this.resourceStrings.WhiteGloveNoProfileError;
                    yield this.runAsync(this.navigateToResultsPageOnFailureAsyncGen);
                }
            } catch (error) {
                // If device blob retrieval failed, display error message and block next button
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Error, "QR blob generation error", error);
                throw error;
            }
        }

        *refreshDataAsyncGen() {
            this.isRefreshButtonDisabled(true);

            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: refresh Autopilot policies for device started");

            let startTime = performance.now();

            yield this.autoPilotManager.clearDdsCacheAsync();
            yield this.autoPilotManager.retrieveSettingsAsync();

            let details = { timeElapsed: performance.now() - startTime };
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: refresh Autopilot policies results", JSON.stringify(details));
        }

        *refreshAsyncGen() {
            yield this.runAsync(this.refreshDataAsyncGen);
            yield this.runAsync(this.refreshUxAsyncGen);
        }

        *launchWhiteGloveDJPPAsyncGen() {
            this.showHybridAadjProgressView();

            // Disable the refresh button to prevent user from refreshing the page during DJ++ flow
            this.isRefreshButtonDisabled(true);

            // Clear DDS cache and then refresh to kick of TPM attestation
            let startTime = performance.now();
            yield this.autoPilotManager.clearDdsCacheAsync();

            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: cache cleared.");
            yield this.autoPilotManager.retrieveSettingsAsync();

            let details = { timeElapsed: performance.now() - startTime };
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: policy refresh results", JSON.stringify(details));
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: DJ++ waiting for TPM attestation to complete.");

            // Set a 7 minute timeout for TPM attestation
            this.tpmAttestationTimeout = WinJS.Promise.timeout(420000).then(function () {
                try {
                    this.tpmNotificationManager.removeEventListener(this.tpmAttestationEventName, this.onTpmAttestationCompleteAsync.bind(this));
                } catch (e) {
                    this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Tpm, "tpmAttestationTimeoutAsyncGen: Deregistering TPM event listener failed", e);
                }

                this.runAsync(this.logFailureEventAsyncGen, "TPM attestation timed out");
                this.whiteGloveError = this.resourceStrings.WhiteGloveTpmTimeoutError;
                bridge.invoke(
                    "CloudExperienceHost.AutoPilot.logHresultEvent",
                    "CommercialOOBE_WhiteGlove_TechnicianFlow_FailedDueToTPMAttestationTimedOut",
                    "TPM identity attestation timed out.",
                    this.timeoutErrorCode);
                this.runAsync(this.navigateToResultsPageOnFailureAsyncGen);
            }.bind(this));

            try {
                this.tpmNotificationManager.addEventListener(this.tpmAttestationEventName, this.onTpmAttestationCompleteAsync.bind(this));
            } catch (e) {
                this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Tpm, "tpmAttestationCompleteAsyncGen: Registering TPM event listener failed", e);
            }
        }

        onTpmAttestationCompleteAsync(hresult) {
            // This call chains to the tpmAttestationCompleteAsyncGen event signal caller
            this.runAsync(this.tpmAttestationCompleteAsyncGen, hresult);
        }

        *tpmAttestationCompleteAsyncGen(hresult) {
            try {
                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: TPM Attestation completed");

                // Stop the TPM attestation timeout
                this.tpmAttestationTimeout.cancel();
                this.tpmAttestationTimeout = null;

                if (hresult.target === 0) {
                    // Enroll the device
                    yield this.runAsync(this.performAadDeviceEnrollmentAsyncGen);

                    // Wait for the offline domain-join blob to be applied.
                    yield this.runAsync(this.waitForDomainJoinAsyncGen);

                } else {
                    // If TPM attestation fails and returns an error code, then log it and navigate to failure page
                    let errorHresult = this.formatNumberAsHexString(hresult.target, 8);
                    this.whiteGloveError = this.formatMessage(this.resourceStrings.BootstrapPageDevicePreparationTpmError, errorHresult);
                    this.runAsync(this.navigateToResultsPageOnFailureAsyncGen);
                }
            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Tpm, "tpmAttestationCompleteAsyncGen failed", error);
                // This call chains to the tpmAttestationCompleteAsyncGen event signal caller need to try/catch and handle redirection here instead of handleButtonClickAsyncGen
                yield this.runAsync(this.navigateToResultsPageOnFailureAsyncGen);
            }
        }

        *performAadDeviceEnrollmentAsyncGen() {
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: performing device enrollment.");

            var startTime = yield bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.whiteGloveStartTimeValueName);
            if (null != startTime) {
                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: starting device enrollment");

                try {
                    var enrollmentResult = yield this.autoPilotManager.performDeviceEnrollmentAsync();

                    yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: enrollment completed, processing results...");
    
                    let enrollmentState = enrollmentResult.enrollmentDisposition;
                    let enrollmentSucceeded = (enrollmentState === EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.completed);
        
                    if (enrollmentSucceeded) {
                        yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: device enrollment succeeded.");
                    } else {
                        let errorCode = this.formatNumberAsHexString(enrollmentResult.dispositionResult, 8);

                        let errorMessage = "<status>: <state>, 0x<hresult>"
                            .replace("<status>", this.resourceStrings[this.whiteGloveDJPPIdFailed])
                            .replace("<state>", enrollmentState)
                            .replace("<hresult>", errorCode);

                        switch (enrollmentState) {
                            case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.aadConfigure:
                                this.whiteGloveError = this.formatMessage(this.resourceStrings.WhiteGloveAadConfigureError, errorCode);
                                break;

                            case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.aadJoin:
                                this.whiteGloveError = this.formatMessage(this.resourceStrings.WhiteGloveAadJoinError, errorCode);
                                break;

                            case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.aadDeviceDiscovery:
                                this.whiteGloveError = this.formatMessage(this.resourceStrings.WhiteGloveAadDeviceDiscoveryError, errorCode);
                                break;

                            case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.aadTicket:
                                this.whiteGloveError = this.formatMessage(this.resourceStrings.WhiteGloveAadTicketError, errorCode);
                                break;

                            case EnterpriseDeviceManagement.Service.AutoPilot.EnrollmentDisposition.mdmEnrolling:
                                this.whiteGloveError = this.formatMessage(this.resourceStrings.WhiteGloveMdmEnrollmentError, errorCode);
                                break;

                            default:
                                this.whiteGloveError = this.formatMessage(this.resourceStrings.WhiteGloveGenericEnrollmentError, errorCode);
                        }

                        yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Enrollment, errorMessage);
                        throw enrollmentState;
                    }
                } catch (error) {
                    yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Enrollment, "performDeviceEnrollmentAsync failed ", error);
                    throw error;
                }
            }
        }

        *waitForDomainJoinAsyncGen() {
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: DJ++ starting wait for domain join.");

            try {
                yield bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.whiteGloveDjContinuationValueName, true);
                yield this.runAsync(this.waitForDomainConnectivityAsyncGen);

                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: DJ++ domain connectivity successfully established.");
                yield this.runAsync(this.triggerRebootAsyncGen);                
            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Enrollment, "waitForDomainJoin error", error);
                let errorCode = this.formatNumberAsHexString(error.number, 8);
                if (errorCode === this.domainControllerNotFoundError) {
                    this.whiteGloveError = this.resourceStrings.WhiteGloveAdControllerNotReachedError;
                } else {
                    this.whiteGloveError = this.formatMessage(this.resourceStrings.WhiteGloveAdJoinError, errorCode);
                }
                throw error;
            }
        }

        *waitForDomainConnectivityAsyncGen() {
            yield this.enterpriseManagementWorker.prepForFirstSignin();
            yield this.enterpriseManagementWorker.checkForDomainControllerConnectivity(this.connectivityTimeoutInMilliseconds);
        } 

        *exitDJFlowAsyncGen() {
            // This SharableData variable is used by the DJ++ (otadjUtils in ESTS) code to skip right to the final
            // domain connectivity check post-reboot, so the user flow can skip AAD authentication in OOBE since the ODJ
            // has already been applied in technician flow.
            yield bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.djFlowStateEnumName, this.djFlowStatePostRebootEnumValue);
                        
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: exiting DJ++ flow.");
            bridge.fireEvent(constants.Events.done, CloudExperienceHost.AppResult.action1);
        }

        *triggerRebootAsyncGen() {
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: DJ++ triggering reboot.");

            try {
                // Set the AutopilotWhiteGlove landing as the page to resume post-reboot
                yield bridge.invoke("CloudExperienceHost.setRebootForOOBE", this.whitGloveResultsPageCxid);

                // Navigate to the OobeReboot node to trigger the reboot.
                bridge.fireEvent(constants.Events.done, CloudExperienceHost.AppResult.action2);

            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Error, "setRebootForOOBE failed", error);
                throw error;
            }
        }

        *refreshUxAsyncGen() {
            this.resetUxState();
            yield this.runAsync(this.displayQRCodeAsyncGen);
            
            var organizationName = yield this.autoPilotManager.getStringPolicyAsync("CloudAssignedTenantDomain");
            if (organizationName !== "") {
                this.organizationName(organizationName);
            }

            try {
                var profileName = yield this.autoPilotManager.getStringPolicyAsync("DeploymentProfileName");
                if (profileName === "") {
                    this.isNextButtonDisabled(true);
                } else {
                    this.profileName(profileName);
                }
            } catch (error) {
                yield this.runAsync(this.logFailureEventAsyncGen, autopilotTelemetryUtility.whiteGloveError.Error, "DeploymentProfileName getStringPolicyAsync error", error);
                throw error;
            }

            var userName = yield this.autoPilotManager.getStringPolicyAsync("CloudAssignedTenantUpn");
            if (userName !== "") {
                this.assignedUserName(userName);
            } else {
                this.assignedUserName(this.resourceStrings.WhiteGloveUserNotAssigned);
            }
        }

        resetUxState() {
            this.isNextButtonDisabled(false);
            this.isRefreshButtonDisabled(false);
            this.provisioningTextStyle("");
            this.subHeaderText(this.resourceStrings.WhiteGloveLeadingText);
            this.IsDJPPLoading(false);
            this.showLandingView();
        }

        *navigateToResultsPageOnFailureAsyncGen() {
            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutopilotWhiteGlove: Navigating to results page due to encountered error.");
            yield bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", this.whiteGloveDjContinuationValueName);
            yield bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.whiteGloveSuccessValueName, this.whiteGloveError);

            // Navigate to the results page on failures.
            bridge.fireEvent(constants.Events.done, CloudExperienceHost.AppResult.fail);
        }

        *logFailureEventAsyncGen(area, failureName, e) {
            yield autopilotTelemetryUtility.logger.logError(area, failureName + " " + JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));

            if (typeof e !== "undefined") {
                yield autopilotTelemetryUtility.logger.logErrorCode(area, e.number);
            }
        }     

        formatNumberAsHexString(numberToConvert, maxHexCharacters) {
            let stringToReturn = "";

            for (var i = 0; i < maxHexCharacters; i++) {
                let digitValue = 0xF & (numberToConvert >> (i * 4));
                stringToReturn = digitValue.toString(16) + stringToReturn;
            }

            return "0x" + stringToReturn;
        }

        formatMessage(messageToFormat) {
            var args = Array.prototype.slice.call(arguments, 1);
            return messageToFormat.replace(/{(\d+)}/g, (match, number) => {
                return typeof args[number] !== 'undefined'
                    ? args[number]
                    : match
                    ;
            });
        }

        showLandingView()
        {
            if (this.isLiteWhitePersonality) {
                this.commercialDiagnosticsUtilities.logInfoEventName(
                    "CommercialOOBE_AutopilotWhiteGloveLanding_ShowLandingView_ShowingLiteView");

                this.hyperlinkVisibility(this.DESKTOP_LITE_FOOTER);
                this.toggleSingleViewVisibilityOn(this.shouldShowDesktopLiteView);
                this.isNextButtonDisabled(false);
            } else {
                this.commercialDiagnosticsUtilities.logInfoEventName(
                    "CommercialOOBE_AutopilotWhiteGloveLanding_ShowLandingView_ShowingInclusiveBlueView");

                this.hyperlinkVisibility(this.INCLUSIVE_BLUE_FOOTER);
                this.toggleSingleViewVisibilityOn(this.shouldShowDefaultView);
            }
        }

        showHybridAadjProgressView()
        {
            if (this.isLiteWhitePersonality) {
                this.commercialDiagnosticsUtilities.logInfoEventName(
                    "CommercialOOBE_AutopilotWhiteGloveLanding_ShowHybridAadjProgressView_ShowingLiteView");

                this.toggleSingleViewVisibilityOn(this.shouldShowHybridAadjProgress);
                this.isNextButtonDisabled(true);
            } else {
                this.commercialDiagnosticsUtilities.logInfoEventName(
                    "CommercialOOBE_AutopilotWhiteGloveLanding_ShowHybridAadjProgressView_ShowingInclusiveBlueView");

                this.subHeaderText(this.resourceStrings.WhiteGloveDJPPLoading);
                this.IsDJPPLoading(true);
            }
        }

        toggleSingleViewVisibilityOn(targetView) {
            try {
                // Toggle visibility all view off and only the target view on.
                for (let i = 0; i < this.viewVisibilityFlags.length; i++) {
                    (this.viewVisibilityFlags[i])(false);
                }

                targetView(true);

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_AutopilotWhiteGloveLanding_ToggleSingleViewVisibilityOn_Succeeded",
                    "Invoked ToggleSingleViewVisibilityOn successfully.");

            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "CommercialOOBE_AutopilotWhiteGloveLanding_ToggleSingleViewVisibilityOn_Failed",
                    "ToggleSingleViewVisibilityOn failed.",
                    e);
            }
        }
    }

    return WhiteGloveViewModel;
});
