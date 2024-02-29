//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core'], (ko, bridge, constants, core) => {
    class ProvisioningEntryViewModel {
        constructor(resourceStrings, oobeProvisioningData) {
            // Variables definitions
            this.packageItems = ko.observableArray();
            this.selectedPackage = ko.observable();
            this.processingFlag = ko.observable(false);
            this.removableMediaStatusText = ko.observable(resourceStrings.ProvisioningUnsafeToEject);
            this.pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
            this.componentName = ko.observable();
            this.provisioningText = resourceStrings.ProvisioningApplyingText;
            let titleStrings = {};
            let subHeaderTitleStrings = {};
            let flexEndButtonsSets = {};

            ko.utils.arrayForEach(oobeProvisioningData.packages, (packagePath) => {
                this.packageItems.push(packagePath);
            });

            // Default select first package
            this.selectedPackage(ko.utils.arrayFirst(this.packageItems(), (item) => {
                return true;
            }));

            // UI element initialization
            this.resourceStrings = resourceStrings;

            titleStrings["main"] = resourceStrings.ProvisioningEntryTitle;
            titleStrings["no_packages"] = resourceStrings.ProvisioningNoPackageTitle;
            titleStrings["single_package"] = resourceStrings.ProvisioningEntryTitleAlreadyStarted;

            subHeaderTitleStrings["main"] = resourceStrings.ProvisioningEntryLeadText;
            subHeaderTitleStrings["no_packages"] = resourceStrings.ProvisioningNoPackageLeadingText;
            subHeaderTitleStrings["single_package"] = "";

            flexEndButtonsSets["main"] = [
                    {
                        buttonText: resourceStrings.ProvisioningEntryBackButtonText,
                        buttonType: "button",
                        isPrimaryButton: false,
                        buttonClickHandler: () => {
                            this.onCancel();
                        },
                        disableControl: ko.computed(() => {
                            return this.processingFlag();
                        })
                    },
                    {
                        buttonText: resourceStrings.ProvisioningEntryNextButtonText,
                        buttonType: "button",
                        isPrimaryButton: true,
                        buttonClickHandler: () => {
                            this.onNext();
                        },
                        disableControl: ko.computed(() => {
                            return !this.selectedPackage() || this.processingFlag();
                        })
                    }
            ];

            flexEndButtonsSets["no_packages"] = [
                    {
                        buttonText: resourceStrings.ProvisioningEntryBackButtonText,
                        buttonType: "button",
                        isPrimaryButton: true,
                        buttonClickHandler: () => {
                            this.onCancel();
                        }
                    }
            ];

            flexEndButtonsSets["single_package"] = [];

            this.title = ko.computed(() => {
                return titleStrings[this.componentName()];
            });

            this.subHeaderText = ko.computed(() => {
                return subHeaderTitleStrings[this.componentName()];
            });

            this.flexEndButtons = ko.computed(() => {
                return flexEndButtonsSets[this.componentName()];
            });

            this.componentName.subscribe((newValue) => {
                this.setupVoiceOverAndSpeechRecognition(newValue);
            });

            if (oobeProvisioningData.packages.length == 0) {
                this.componentName("no_packages");
            } else if (oobeProvisioningData.packages.length == 1) {
                this.componentName("single_package");
            } else {
                this.componentName("main");
            }
        }

        setupVoiceOverAndSpeechRecognition(componentName) {
            // Setup simple voiceover and speech recognition using the resource strings
            try {
                CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
                let cancelConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(new Array(this.resourceStrings.ProvisioningEntryBackButtonText));
                cancelConstraint.tag = "cancel";
                let constraintsSets = {};
                let voiceOverSets = {};

                voiceOverSets["main"] = this.resourceStrings.ProvisioningEntryVoiceOver;
                voiceOverSets["no_packages"] = this.resourceStrings.ProvisioningNoPackageVoiceOver;
                voiceOverSets["single_package"] = this.resourceStrings.ProvisioningSinglePackageVoiceOver;

                constraintsSets["main"] = [CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes, cancelConstraint];
                constraintsSets["no_packages"] = [cancelConstraint];
                constraintsSets["single_package"] = [];

                if (componentName in voiceOverSets)
                {
                    CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(voiceOverSets[componentName], constraintsSets[componentName]).done((result) => {
                        if (result) {
                            if (result.constraint.tag == CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag) {
                                this.onNext();
                            } else if (result.constraint.tag == cancelConstraint.tag) {
                                this.onCancel();
                            }
                        }
                    });
                }
            }
            catch (error) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeechRecognitionSetupError",
                    core.GetJsonFromError(error));
            }
        }

        onCancel() {
            if (this.processingFlag()) { // Prevent from exiting when applying a package.
                return;
            }
            bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
        }

        onNext() {
            if (this.processingFlag()) { // Prevent from re-entering.
                return;
            }

            this.processingFlag(true);

            this.pluginManager.stageProvisioningPackageAsync(this.selectedPackage()).then(() => {
                bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", "OobeProvisioningSourceOverride");
                bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", "OobeProvisioningResumeContinuation");
                bridge.fireEvent(constants.Events.done, constants.AppResult.success);
            })
            .then(null, (error) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "StageProvisioningPackageError", core.GetJsonFromError(error));
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        }

        ready() {
            // If we only have one package, skip to applying it
            if (this.componentName() == "single_package") {
                // Automatically enroll the provisioning package for users.
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AutomaticallyApplyAcquiredPackage");
                this.onNext();
            }
        }
    }
    return ProvisioningEntryViewModel;
});
