//
// Copyright (C) Microsoft. All rights reserved.
//
define([
    'lib/knockout',
    'legacy/bridge',
    'legacy/events',
    'autopilot/commercialDiagnosticsUtilities'], (
    ko,
    bridge,
    constants,
    commercialDiagnosticsUtilities) => {
    class EnterpriseProvisioningViewModel {
        constructor(resourceStrings, targetPersonality, showPreprovisioning, showExportLogs) {

            this.pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
            this.autoPilotManager = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();
            this.commercialDiagnosticsUtilities = new commercialDiagnosticsUtilities();

            // UI element initialization
            this.resourceStrings = resourceStrings;
            this.title = resourceStrings.ProvisioningConfirmationTitle;
            this.isNextButtonDisabled = ko.observable(false);
            this.provisioningIcon = { title: "", description: "", glyph: "\uE896" };
            this.whiteGloveIcon = { title: "", description: "", glyph: "\uE713" };
            this.diagnosticsIcon = { title: "", description: "", glyph: "\uE713" };
            this.resetIcon = { title: "", description: "", glyph: "\uE777" };

            // Scenario constants
            this.PAGE_TRANSITION_EXPORT_DIAGNOSTICS_PAGE = "OobeExportDiagnostics"; // Must keep in sync with the CXID in Navigation*.json
            this.EXPORTLOGS_PREVIOUS_CXID_NAME = "ExportLogsPreviousCXID";

            this.items = [
                {
                    valueText: resourceStrings.ProvisioningLabel,
                    icon: this.provisioningIcon.glyph,
                    descriptionText: resourceStrings.ProvisioningLabelContent
                },
                {
                    valueText: resourceStrings.WhiteGloveLabel,
                    icon: this.whiteGloveIcon.glyph,
                    descriptionText: resourceStrings.WhiteGloveLabelContent
                },
                {
                    valueText: resourceStrings.ProvisioningExportLogsLabel,
                    icon: this.diagnosticsIcon.glyph,
                    descriptionText: resourceStrings.ProvisioningExportLogsLabelContent
                },
                {
                    valueText: resourceStrings.ResetLabel,
                    icon: this.resetIcon.glyph,
                    descriptionText: resourceStrings.ResetLabelContent
                }
            ];

            if (!showPreprovisioning) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning dynamically removing preprovisioning");
                let preProvisioningIndex = this.items.findIndex((element) => (element.valueText == resourceStrings.WhiteGloveLabel));
                if (preProvisioningIndex > -1) {
                    this.items.splice(preProvisioningIndex, 1);
                }
            }

            if (!showExportLogs) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning dynamically removing Export");
                let exportIndex = this.items.findIndex((element) => (element.valueText == resourceStrings.ProvisioningExportLogsLabel));
                if (exportIndex > -1) {
                    this.items.splice(exportIndex, 1);
                }
            }

            // By default, show the default view
            this.shouldShowDefaultView = ko.observable(true);
            this.shouldShowDesktopLiteView = ko.observable(false);
            this.selectedItem = ko.observable();

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

            // Decide which view to toggle on based on the current context's personality.
            if (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite) {
                this.hyperlinkVisibility(this.DESKTOP_LITE_FOOTER);
                this.toggleSingleViewVisibilityOn(this.shouldShowDesktopLiteView);
            } else {
                this.selectedItem(this.items[0]);
                this.hyperlinkVisibility(this.INCLUSIVE_BLUE_FOOTER);
                this.toggleSingleViewVisibilityOn(this.shouldShowDefaultView);
            }

            let flexStartHyperlinksSets = {};
            let flexEndButtonsSets = {};

            // Button and hyperlink objects
            let nextButtonObject = {
                buttonText: this.resourceStrings.ProvisioningConfirmationAcceptButton,
                buttonType: "button",
                isPrimaryButton: true,
                disableControl: ko.pureComputed(() => {
                    return this.isNextButtonDisabled() || (this.selectedItem() === undefined);
                }),
                buttonClickHandler: () => {
                    this.optionHandler();
                }
            };

            let exitHyperlink = {
                hyperlinkText: this.resourceStrings.ProvisioningConfirmationCancelButton,
                disableControl: ko.pureComputed(() => {
                    return this.isNextButtonDisabled();
                }),
                handler: () => {
                    this.exitButtonClick();
                }
            };

            let exitButton = {
                buttonText: this.resourceStrings.ProvisioningConfirmationCancelButton,
                buttonType: "button",
                isPrimaryButton: false,
                isVisible: true,
                buttonClickHandler: () => {
                    this.exitButtonClick();
                }
            };

            // Define hyperlink scenarios
            flexStartHyperlinksSets[this.DESKTOP_LITE_FOOTER] = [];
            flexStartHyperlinksSets[this.INCLUSIVE_BLUE_FOOTER] = [
                exitHyperlink
            ];

            // Define button scenarios
            flexEndButtonsSets[this.DESKTOP_LITE_FOOTER] = [
                exitButton,
                nextButtonObject
            ];

            flexEndButtonsSets[this.INCLUSIVE_BLUE_FOOTER] = [
                nextButtonObject
            ];

            // Commit the hyperlink and button scenarios to knockout
            this.flexStartHyperLinks = ko.pureComputed(() => {
                return flexStartHyperlinksSets[this.hyperlinkVisibility()];
            });

            this.flexEndButtons = ko.pureComputed(() => {
                return flexEndButtonsSets[this.hyperlinkVisibility()];
            });
        }

        exitButtonClick() {
            bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ProvisioningFallbackPage").then(function (aadLoginPageCXID) {
                // The AADProvisioningPage value does not get set until just before the AAD login page. If the value is non-existent,
                // it can be assumed that the AAD service did not execute the navigation logic correctly so fall back on the Cancel property.
                if (aadLoginPageCXID) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Provisioning page was entered from the AAD login page, returning to that CXID.");
                    bridge.fireEvent(constants.Events.done, aadLoginPageCXID);
                } else {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AAD service did not update the Provisioning page eSTS service contract, returning to the beginning of OOBE.");
                    bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
                }
            }, function (e) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Error occurred while attempting to consume the Provisioning page eSTS service contract, returning to the beginning of OOBE.");
                bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
            });
        }

        optionHandler() {
            let setupOption = this.selectedItem().valueText;
            if (setupOption === resourceStrings.ProvisioningLabel) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning provisioning flow chosen");
                bridge.fireEvent(constants.Events.done, CloudExperienceHost.AppResult.action1);
            } else if (setupOption === resourceStrings.WhiteGloveLabel) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning White Glove flow chosen");
                bridge.fireEvent(constants.Events.done, CloudExperienceHost.AppResult.action2);
            } else if (setupOption === resourceStrings.ProvisioningExportLogsLabel) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning Export Diagnostics flow chosen")
                .then(() => {
                    // Save current CXID
                    return bridge.invoke("CloudExperienceHost.AutoPilot.AutopilotWrapper.GetCurrentNode").then((currentNode) => {
                        return bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.EXPORTLOGS_PREVIOUS_CXID_NAME, currentNode.cxid);
                    })
                }).then(() => {
                    // Navigate to export logs page
                    bridge.fireEvent(constants.Events.done, this.PAGE_TRANSITION_EXPORT_DIAGNOSTICS_PAGE);
                }, (e) => {
                    this.commercialDiagnosticsUtilities.logExceptionEvent(
                        "CommercialOOBE_EnterpriseProvisioning_ExportLogs_Failed",
                        " failed.",
                        e);
                });
            } else if (setupOption === resourceStrings.ResetLabel) {
                this.onResetAsync();
            }
        }

        onResetAsync() {
            return this.runAsync(this.resetAsyncGen);
        }

        *resetAsyncGen() {
            this.isNextButtonDisabled(true);

            yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning system reset chosen");

            try {
                yield this.pluginManager.initiateSystemResetAsync();
                yield bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "EnterpriseProvisioning system reset successful");
            } catch (error) {
                this.logFailureEvent("UnifiedEnrollment_EnterpriseProvisioningPage_initiateSystemResetAsync: EnterpriseProvisioning system reset failed", error);
                this.isNextButtonDisabled(false);
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

        logFailureEvent(failureName, e) {
            try {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                    JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
            } catch (e) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName);
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
                    "CommercialOOBE_OobeEnterpriseProvisioning_ToggleSingleViewVisibilityOn_Succeeded",
                    "Invoked ToggleSingleViewVisibilityOn successfully.");

            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "CommercialOOBE_OobeEnterpriseProvisioning_ToggleSingleViewVisibilityOn_Failed",
                    "ToggleSingleViewVisibilityOn failed.",
                    e);
            }
        }
    }
    return EnterpriseProvisioningViewModel;
});
