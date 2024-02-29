//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core', 'corejs/knockouthelpers'], (ko, bridge, constants, core, KoHelpers) => {

    class UpdateSettingsViewModel {
        constructor(resources, targetPersonality) {
            this.resources = resources;
            let oobeUpdateSettingsToggles = this.getUpdateSettingsToggles();
            this.contentSettings = oobeUpdateSettingsToggles.updateSettingsData;
            this.updateSettingsObjects = oobeUpdateSettingsToggles.updateSettingsObjects;
            this.updateSettingsImage = "/webapps/inclusiveOobe/media/oobe-update-settings.svg";

            // Log telemetry for Default Settings
            for (let setting of this.updateSettingsObjects) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "DefaultUpdateSetting_" + setting.id, setting.value);
            }

            // observable to monitor page view change
            this.viewName = ko.observable("customize");

            let mainTitleTextStrings = {};
            let mainSubHeaderTextStrings = {};
            mainTitleTextStrings["customize"] = resources.UpdateSettingsTitle;
            mainSubHeaderTextStrings["customize"] = resources.UpdateSettingsSubtitle;
            mainTitleTextStrings["learnmore"] = resources.LearnMoreTitle;

            this.title = ko.pureComputed(() => {
                return mainTitleTextStrings[this.viewName()];
            });
            this.subHeaderText = ko.pureComputed(() => {
                return mainSubHeaderTextStrings[this.viewName()];
            });

            this.voiceOverContent = {};
            this.voiceOverContent["customize"] = resources.CustomizeVoiceOver;

            this.processingFlag = ko.observable(false);
            let flexEndButtonSet = {};
            flexEndButtonSet["customize"] = [
                {
                    buttonText: resources.LearnMoreButtonText,
                    buttonType: "button",
                    isPrimaryButton: false,
                    autoFocus: false,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: () => {
                        this.onLearnMore();
                    }
                },
                {
                    buttonText: resources.NextButtonText,
                    buttonType: "button",
                    automationId: "OOBEUpdateSettingsAcceptButton",
                    isPrimaryButton: true,
                    autoFocus: true,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: () => {
                        this.onSave();
                    }
                }
            ];
            flexEndButtonSet["learnmore"] = [
                {
                    buttonText: resources.ContinueButtonText,
                    buttonType: "button",
                    isPrimaryButton: true,
                    autoFocus: false,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: () => {
                        this.onLearnMoreContinue();
                    }
                }
            ];

            this.flexEndButtons = ko.pureComputed(() => {
                return flexEndButtonSet[this.viewName()];
            });

            this.customizeVisible = ko.pureComputed(() => {
                return (this.viewName() == "customize");
            });
            this.learnMoreVisible = ko.pureComputed(() => {
                return (this.viewName() == "learnmore");
            });

            this.pageDefaultAction = () => {
                if (this.customizeVisible()) {
                    this.onSave();
                }
                else if (this.learnMoreVisible()) {
                    this.onLearnMoreContinue();
                }
            };

            this.viewName.subscribe((newViewName) => {
                this.processingFlag(false);
            });

            let footerDescriptionTextSet = {};
            footerDescriptionTextSet["customize"] = resources.LearnMoreDescription;
            this.footerDescriptionText = ko.pureComputed(() => {
                return footerDescriptionTextSet[this.viewName()];
            });

            this.isLiteWhitePersonality = ko.pureComputed(() => {
                return targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite;
            });
        }

        startVoiceOver() {
            this.speak(this.viewName());
        }

        speak(viewName) {
            if (viewName in this.voiceOverContent) {
                CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
                CloudExperienceHostAPI.Speech.SpeechSynthesis.speakAsync(this.voiceOverContent[viewName]);
            }
        }

        onLearnMore() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UpdateSettings", "LearnMoreLink");
                this.viewName("learnmore");
                KoHelpers.setFocusOnAutofocusElement();
            }
        }

        onSave() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                try {
                    // Show the progress ring while committing async.
                    bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);
                    let settings = this.updateSettingsObjects;
                    CloudExperienceHostAPI.OobeUpdateSettingsManagerStaticsCore.commitUpdateSettingsAsync(settings).done(function () {
                        for (let setting of settings) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommittedUpdateSetting_" + setting.id, setting.value);
                        }
                        bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                    },
                        function (err) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommitUpdateSettingsAsyncWorkerFailure", core.GetJsonFromError(err));
                            bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                        });
                }
                catch (err) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommitUpdateSettingsFailure", core.GetJsonFromError(err));
                    bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                }
            }
        }

        onLearnMoreContinue() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                this.viewName("customize");
                KoHelpers.setFocusOnAutofocusElement();
            }
        }

        getUpdateSettingsToggles() {
            //initialize the settingsData object
            let updateSettingsData  = [];
            let updateSettingsObjects = [];
            let oobeUpdateSettings = CloudExperienceHostAPI.OobeUpdateSettingsManagerStaticsCore.getSettings();
            let toggles = [];
            for (let setting of oobeUpdateSettings) {
                updateSettingsObjects.push(setting);
                let toggle = {
                    labelOffText: setting.valueOffLabel,
                    labelOnText: setting.valueOnLabel,
                    checkedValue: ko.observable(setting.value),
                    name: setting.name,
                    descriptionOn: setting.description,
                    descriptionOff: setting.description,
                    titleText: setting.description,
                    canonicalName: setting.name
                };
                toggle.checkedValue.subscribe(function (newValue) {
                    setting.value = newValue;
                });
                toggles.push(toggle);
            }
            let updateSettingsModel = {};
            updateSettingsModel.toggleContent = toggles;
            updateSettingsData.push(updateSettingsModel);
            return {
                updateSettingsData: updateSettingsData,
                updateSettingsObjects: updateSettingsObjects
            };
        }
    }
    return UpdateSettingsViewModel;
});
