//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout',
        'legacy/bridge',
        'legacy/events',
        'legacy/core',
        'legacy/appObjectFactory',
        'legacy/uiHelpers',
        'optional!sample/SampleImplementationCollection'],
        (ko, bridge, constants, core, appObjectFactory, legacy_uiHelpers, sampleCollection) => {
    class RegionViewModel {
        constructor(resourceStrings, regions, defaultregion, gestureManager) {
            this.gestureManager = gestureManager;
            this.items = regions;

            // Check if oobe xml has a default region code, if not fall back to the default region for the app
            let defaultRegionCode = defaultregion;
            let dataLayerDefaultRegion = CloudExperienceHostAPI.OobeRegionManagerStaticsCore.tryGetDefaultRegionIso2LetterCode();
            if (dataLayerDefaultRegion.succeeded) {
                defaultRegionCode = dataLayerDefaultRegion.value;
            }

            // Move the default region to the top of the list and select it
            let defaultRegionIndex = this.items.findIndex((region) => (region.codeTwoLetter == defaultRegionCode));
            let defaultRegionObject = null;
            if (defaultRegionIndex > -1) {
                defaultRegionObject = this.items[defaultRegionIndex];
                this.items.splice(defaultRegionIndex, 1);
                this.items.unshift(defaultRegionObject);
            }
            this.selectedItem = ko.observable(defaultRegionObject);
            
            this.resourceStrings = resourceStrings;
            this.supportClickableTitle = true;

            this.questionType = {
                YESNOINITIAL: 0,                  // Initial speech with default region state
                YESNOCONFIRMREGION: 1,            // Confirmation of region state after the user has spoken the region
                OTHERCONSTRAINTS: 2,              // State in which user is expected to speak the region name
                FINAL: 3                          // State reached if Cortana is unable to select the region for the user and asks the user manually to select a region
            }

            this.title = ko.pureComputed(() => {
                return resourceStrings.RegionTitle.replace("%1", this.selectedItem().displayName);
            });

            this.listAccessibleName = resourceStrings.ListAccessibleName;
            this.stringWithRegionVoiceOver = resourceStrings.StringWithRegionVoiceOver.replace("%1", this.selectedItem().displayName);
            this.subtitle = resourceStrings.RegionLeadText;

            this.optinHotKey = true;

            this.pageDefaultAction = () => {
                this.onYesClick();
            }

            this.processingFlag = ko.observable(false);
            this.flexEndButtons = [
                {
                    buttonText: resourceStrings.YesButtonText,
                    buttonType: "button",
                    automationId: "OOBERegionYesButton",
                    isPrimaryButton: true,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: () => {
                        this.onYesClick();
                    }
                }
            ];

            // Building region constraints
            this.regionConstraints = [];
            for (let i = 0; i < regions.length; i++) {
                let regionConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint([legacy_uiHelpers.ReplaceHalfWidthCharsWithSpaces(regions[i].displayName)]);
                regionConstraint.tag = '#' + regions[i].codeTwoLetter;
                this.regionConstraints[i] = regionConstraint;
            }

            // Building yes/no constraints
            this.yesNoConstraints = new Array(CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes, CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no);
        }

        // Specs: https://microsoft.sharepoint.com/teams/osg_threshold_specs/_layouts/15/WopiFrame2.aspx?sourcedoc=%7Bba4dd761-9345-443d-a4e2-bd1d55b273fa%7D&action=edit&wd=target%28%2F%2FRS2%2F1610%20Specs%2FInclusive%20OOBE%20Region%20and%20Keyboard%20Selection.one%7C1a2ed8e4-c5a3-4551-bc4a-fed33e5a501e%2FSpeech%20Input%20on%20list%20selection%20Pages%7C8b8d3428-c3b5-4f1f-9692-92687d7668a6%2F%29
        speak(stringToSpeak, question) {
            let constraint = null;
            switch (question) {
                case this.questionType.YESNOINITIAL:
                case this.questionType.YESNOCONFIRMREGION:
                    constraint = this.yesNoConstraints;
                    break;
                case this.questionType.OTHERCONSTRAINTS:
                    constraint = this.regionConstraints;
                    break;
            };
            CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(stringToSpeak, constraint).done((result) => {
                if (result == null) {
                    if ((constraint != null) && !this.processingFlag()) {
                        // result can be null either if there is no input from user or the user speaks unknown voice commands until the timeout
                        this.speak(this.resourceStrings.FinalRegionVoiceOver, this.questionType.FINAL);
                    }
                }
                else if (!this.processingFlag()) {
                    switch (question) {
                        case this.questionType.YESNOINITIAL:
                        case this.questionType.YESNOCONFIRMREGION:
                            // All responses requiring yes/no flow through this block, it can be either initial state where we try to confirm from the default region OR the confirm region state
                            // where we try to confirm the region based on user i/p
                            if (result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag) {
                                this.onYesClick();
                            }
                            else if (result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no.tag) {
                                if (question === this.questionType.YESNOINITIAL) {
                                    // If initial response was no, then we ask the user to speak the region.
                                    this.speak(this.resourceStrings.RegionToUseVoiceOver, this.questionType.OTHERCONSTRAINTS);
                                }
                                else {
                                    // If this is not the initial response, then Cortana can't select the region for the user and asks the user to enter manually
                                    this.speak(this.resourceStrings.FinalRegionVoiceOver, this.questionType.FINAL);
                                }
                            }
                            break;
                        case this.questionType.OTHERCONSTRAINTS:
                            let itemToSelect = this.items.find((region) => '#' + region.codeTwoLetter == result.constraint.tag);
                            if (itemToSelect) {
                                this.selectedItem(itemToSelect);
                                this.speak(this.resourceStrings.ConfirmRegionVoiceOver.replace("%1", this.selectedItem().displayName), this.questionType.YESNOCONFIRMREGION);
                            }
                            else {
                                this.speak(this.resourceStrings.FinalRegionVoiceOver, this.questionType.FINAL);
                            }
                            break;
                    }
                }
            });
        }

        onYesClick() {
            if (!this.processingFlag()) {
                this.processingFlag(true);

                uiHelpers.PortableDeviceHelpers.unsubscribeToDeviceInsertion(this.gestureManager, bridge, core);

                try {
                    // Show the progress ring while committing async.
                    bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                    let regionManager = appObjectFactory.getObjectFromString("CloudExperienceHostAPI.OobeRegionManagerStaticsCore");
                    let commitRegion = regionManager.commitRegionAsync(this.selectedItem().codeTwoLetter);
                    commitRegion.action.done(() => {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommitRegionSucceeded");
                        if (commitRegion.effects.rebootRequired) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommitRegionRebootRequired");
                            bridge.invoke("CloudExperienceHost.setRebootForOOBE");
                        }
                        bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                    }, (err) => {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommitRegionAsyncWorkFailure",
                            core.GetJsonFromError(err));
                        bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                    });
                }
                catch (err) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommitRegionFailure",
                       core.GetJsonFromError(err));
                    bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                }
            }
        }

        startVoiceOver() {
            this.speak(this.stringWithRegionVoiceOver, this.questionType.YESNOINITIAL);
        }

        subscribeToDeviceInsertion(gestureManager) {
            uiHelpers.PortableDeviceHelpers.subscribeToDeviceInsertion(gestureManager, bridge, core);
        }
    }
    return RegionViewModel;
});
