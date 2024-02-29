//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'oobesettings-data', 'legacy/bridge', 'legacy/events', 'legacy/core', 'corejs/knockouthelpers'], (ko, oobeSettingsData, bridge, constants, core, KoHelpers) => {

    class PersonalDataExportViewModel {
        constructor(resources, isInternetAvailable, targetPersonality) {

            this.resources = resources;

            // set up ko observables four our header text
            this.PageTitle = ko.observable(resources.PageTitle);
            this.PageSubtitle = ko.observable(resources.PageSubtitle);

            // set up ko observables for our main paragraph content
            this.Paragraph1 = ko.observable(resources.Paragraph1);
            this.Paragraph2 = ko.observable(resources.Paragraph2);
            this.Paragraph3 = ko.observable(resources.Paragraph3);

            this.PrivacyLinkDisplayText = ko.observable(resources.PrivacyLinkDisplayText);

            // Set up visibility variables for the learn more and privacy page sections
            this.learnMoreVisible = ko.observable(false);
            this.privacyVisible = ko.observable(false);
            this.pageVisible = ko.observable(true);

            this.processingFlag = ko.observable(false);
            this.disableControl = ko.pureComputed(() => {
                return this.processingFlag();
            });

            // set up the Learn More button on the Main page section
            this.learnMoreButton = {
                buttonText: resources.LearnMoreButtonText,
                buttonClickHandler: () => {
                    this.onLearnMoreButtonClick();
                },
                disableControl: this.disableControl
            };

            // set up the click handler for the Learn More button on the Main page section
            this.onLearnMoreButtonClick = () => {
                if (!this.processingFlag()) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "MainPageLearnMoreButtonClicked");
                    this.processingFlag(true);
                    this.learnMoreVisible(true);
                    this.privacyVisible(false);
                    this.pageVisible(false);

                    // fill the Learn More content for render
                    let learnMoreIFrame = document.getElementById("learnMoreIFrame");
                    let doc = learnMoreIFrame.contentWindow.document;
                    oobeSettingsData.showLearnMoreContent(doc, resources.LearnMoreDataTransferUrl, document.documentElement.dir, isInternetAvailable, resources.NavigationError, targetPersonality);
                    this.processingFlag(false);
                    KoHelpers.setFocusOnAutofocusElement();
                }
            };

            // this sets up and is the handler for the main page "Next" button, which exits the page
            this.nextButton = {
                isPrimaryButton: true,
                autoFocus: true,
                buttonText: resources.NextButtonText,
                buttonClickHandler: () => {
                    if (!this.processingFlag()) {
                        this.processingFlag(true);
                        bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                        // if they click the Next button, the response is true.
                        let response = true;

                        // record the response in the registry and send telemetry
                        bridge.invoke("CloudExperienceHost.Telemetry.commitIntentPropertyBOOLAsync", "PersonalDataExport", "PDEShown", response).done(() => {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ReportPDEShownSuccess", response);
                            bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                        }, (error) => {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ReportPDEShownFailure", core.GetJsonFromError(error));
                            bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                        });
                    }
                },
                disableControl: ko.pureComputed(() => {
                    return this.processingFlag();
                })
            };

            this.mainPageFooterButtons = [
                this.learnMoreButton,
                this.nextButton
            ];

            // set up the Continue button on the LearnMore page section
            this.learnMoreContinueButton = {
                buttonText: resources.ContinueButtonText,
                buttonType: "button",
                isPrimaryButton: true,
                autoFocus: false,
                disableControl: this.disableControl,
                buttonClickHandler: () => {
                    this.onLearnMoreContinue();
                }
            };

            // the click handler for the Continue button on the LearnMore page section
            this.onLearnMoreContinue = () => {
                if (!this.processingFlag()) {
                    this.processingFlag(true);
                    bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "LearnMoreContinueButtonClicked");
                    this.learnMoreVisible(false);
                    this.privacyVisible(false);
                    this.pageVisible(true);
                    this.processingFlag(false);
                    KoHelpers.setFocusOnAutofocusElement();
                }
            };

            this.learnMorePageFooterButtons = [
                this.learnMoreContinueButton
            ];

            // the privacy link was clicked, make the privacy content visible and hide the learnmore and PDE content
            this.onPrivacyLinkClick = () => {
                if (!this.processingFlag()) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "MainPagePrivacyLinkClicked");
                    this.processingFlag(true);
                    this.learnMoreVisible(false);
                    this.pageVisible(false);
                    this.privacyVisible(true);

                    // fill the Privacy content for render
                    let privacyIFrame = document.getElementById("privacyIFrame");
                    let doc = privacyIFrame.contentWindow.document;
                    oobeSettingsData.showLearnMoreContent(doc, resources.PrivacyStatementUrl, document.documentElement.dir, isInternetAvailable, resources.NavigationError, targetPersonality);
                    this.processingFlag(false);
					KoHelpers.setFocusOnAutofocusElement();
                }
            };

            // set up the Continue button on the Privacy Statement page section
            this.privacyContinueButton = {
                buttonText: resources.ContinueButtonText,
                buttonType: "button",
                isPrimaryButton: true,
                autoFocus: false,
                disableControl: this.disableControl,
                buttonClickHandler: () => {
                    this.onPrivacyContinue();
                }
            };

            // the privacy continue button was clicked, make the PDE content visible and hide the LearnMore and Privacy content
            this.onPrivacyContinue = () => {
                if (!this.processingFlag()) {
                    this.processingFlag(true);
                    bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "PrivacyContinueButtonClicked");
                    this.learnMoreVisible(false);
                    this.privacyVisible(false);
                    this.pageVisible(true);
                    this.processingFlag(false);
                    KoHelpers.setFocusOnAutofocusElement();
                }
            };

            this.privacyPageFooterButtons = [
                this.privacyContinueButton
            ];
        }
    }
    return PersonalDataExportViewModel;
});
