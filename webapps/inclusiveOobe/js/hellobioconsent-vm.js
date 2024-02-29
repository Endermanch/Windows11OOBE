//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'oobesettings-data', 'legacy/bridge', 'legacy/events', 'legacy/core', 'corejs/knockouthelpers'], (ko, oobeSettingsData, bridge, constants, core, KoHelpers) => {

    class HelloBioConsentViewModel {
        constructor(resources, isInternetAvailable, targetPersonality) {
            this.resources = resources;

            this.items = [
                {
                    value: true,
                    icon: "\uEB68",
                    title: resources.KeepBioDataTitle,
                    descriptionText: resources.KeepBioDataSubtitle
                },
                {
                    value: false,
                    icon: "\uE74D",
                    title: resources.GoToSettingsBioDataTitle,
                    descriptionText: resources.GoToSettingsBioDataSubtitle
                }
            ];
            this.selectedItem = ko.observable();

            // Set up member variables for the learn more page
            this.learnMoreContent = oobeSettingsData.getLearnMoreContent();
            this.learnMoreVisible = ko.observable(false);
            this.bioConsentVisible = ko.pureComputed(() => {
                return !this.learnMoreVisible();
            });

            this.processingFlag = ko.observable(false);
            this.disableControl = ko.pureComputed(() => {
                return this.processingFlag();
            });

            this.learnMoreContinueButton = {
                buttonText: resources.HelloContinueButtonText,
                buttonType: "button",
                isPrimaryButton: true,
                autoFocus: false,
                disableControl: this.disableControl,
                buttonClickHandler: () => {
                    this.onLearnMoreContinue();
                }
            }

            this.onLearnMoreContinue = () => {
                if (!this.processingFlag()) {
                    this.processingFlag(true);
                    bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "LearnMoreContinueButtonClicked");
                    this.learnMoreVisible(false);
                    KoHelpers.setFocusOnAutofocusElement();
                    this.processingFlag(false);
                }
            };

            this.learnMoreButton = {
                buttonText: resources.LearnMoreButtonText,
                buttonClickHandler: () => {
                    this.onLearnMoreButtonClick();
                },
                disableControl: this.disableControl
            }

            this.nextButton = {
                buttonText: resources.NextButtonText,
                buttonClickHandler: () => {
                    if (!this.processingFlag()) {
                        this.processingFlag(true);
                        bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                        let response = this.selectedItem().value;
                        bridge.invoke("CloudExperienceHost.Hello.reportBioDataStorageConsentResponse", response).done(() => {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ReportBioConsentSuccess", response);
                            bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                        }, (error) => {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ReportBioConsentFailure", core.GetJsonFromError(error));
                            bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                        });
                    }
                },
                disableControl: ko.pureComputed(() => {
                    return ((this.selectedItem() === undefined) || (this.selectedItem().value === undefined) || this.processingFlag());
                }),
            }

            this.onLearnMoreButtonClick = () => {
                if (!this.processingFlag()) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "LearnMoreButtonClicked");
                    this.processingFlag(true);
                    this.learnMoreVisible(true);

                    let learnMoreIFrame = document.getElementById("learnMoreIFrame");
                    let doc = learnMoreIFrame.contentWindow.document;
                    oobeSettingsData.updateLearnMoreContentForRender(doc, document.documentElement.dir, isInternetAvailable, resources.HelloLearnMoreNavigationError, targetPersonality, "WindowsHello");
                    this.processingFlag(false);
                }
            };

        }
    }
    return HelloBioConsentViewModel;
});
