define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core', 'legacy/appObjectFactory', 'legacy/uiHelpers', 'optional!sample/Sample.CloudExperienceHostAPI.OobeKeyboardManagerStaticsCore'], (ko, bridge, constants, core, appObjectFactory, legacy_uiHelpers) => {
    const tagSkip = "skip";
    const tagAddLayout = "Add layout";

    class KeyboardViewModel {
        constructor(resourceStrings, gestureManager, targetPersonality) {
            this.resourceStrings = resourceStrings;
            this.gestureManager = gestureManager;
            this.supportClickableTitle = true;
            this.optinHotKey = true;

            this.currentPanelIndex = ko.observable(0);

            this.processingFlag = ko.observable(false);
            this.disableControl = ko.pureComputed(() => {
                return this.processingFlag();
            });

            bridge.addEventListener(constants.Events.backButtonClicked, this.handleBackNavigation.bind(this));

            this.getPanelElement = (panelIndex) => {
                return document.querySelector(".oobe-panel[data-panel-index='" + panelIndex + "']");
            }

            this.currentPanelElement = ko.pureComputed(() => {
                return this.getPanelElement(this.currentPanelIndex());
            });

            this.keyboardsForDefaultInputLanguage = CloudExperienceHostAPI.OobeKeyboardStaticsCore.getKeyboardsForDefaultInputLanguage();
            this.keyboardsForDefaultInputLanguageConstraints = () => {
                let keyboardConstraints = [];
                for (let keyboard of this.keyboardsForDefaultInputLanguage) {
                    let keyboardSpeechConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint([legacy_uiHelpers.ReplaceHalfWidthCharsWithSpaces(keyboard.name)], keyboard.kbid);
                    keyboardConstraints.push(keyboardSpeechConstraint);
                }
                return keyboardConstraints;
            }

            this.currentSelectedDefaultInputLanguageKeyboardIndex = 0;
            this.selectedKeyboardForDefaultInputLanguage = ko.observable(this.keyboardsForDefaultInputLanguage[this.currentSelectedDefaultInputLanguageKeyboardIndex]);

            this.keyboardSelectionTitle = ko.pureComputed(() => {
                return this.resourceStrings.keyboardSelectionTitle.replace("%1", this.selectedKeyboardForDefaultInputLanguage().name);
            });

            let inputLanguagesVector = CloudExperienceHostAPI.OobeKeyboardStaticsCore.getInputLanguages();
            this.inputLanguages = [];

            for (let inputLanguage of inputLanguagesVector) {
                this.inputLanguages.push(inputLanguage);
            }

            this.inputLanguages = this.inputLanguages.sort((a, b) => {
                let aName = a.name.toLocaleUpperCase();
                let bName = b.name.toLocaleUpperCase();
                return aName.localeCompare(bName);
            });

            this.inputLanguagesConstraints = () => {
                let languageConstraints = [];
                for (let inputLanguage of this.inputLanguages) {
                    let inputLanguageConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint([legacy_uiHelpers.ReplaceHalfWidthCharsWithSpaces(inputLanguage.name)], inputLanguage.localeName);
                    languageConstraints.push(inputLanguageConstraint);
                }
                return languageConstraints;
            }

            this.currentSelectedInputLanguageIndex = 0;
            this.selectedInputLanguage = ko.observable(this.inputLanguages[this.currentSelectedInputLanguageIndex]);

            this.keyboardsForInputLanguage = ko.pureComputed(() => {
                return CloudExperienceHostAPI.OobeKeyboardStaticsCore.getKeyboardsForInputLanguage(this.selectedInputLanguage());
            });

            this.keyboardsForInputLanguageConstraints = ko.pureComputed(() => {
                let constraints = [];
                for (let keyboard of this.keyboardsForInputLanguage()) {
                    let keyboardConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint([legacy_uiHelpers.ReplaceHalfWidthCharsWithSpaces(keyboard.name)], keyboard.kbid);
                    constraints.push(keyboardConstraint);
                }
                return constraints;
            });

            this.currentSelectedKeyboardForLanguageIndex = 0;
            this.selectedKeyboardForInputLanguage = ko.observable(this.keyboardsForInputLanguage()[this.currentSelectedKeyboardForLanguageIndex]);

            this.keyboardSelectionInit = () => {
                // First panel, no panel to navigate before this
                bridge.invoke("CloudExperienceHost.setShowBackButton", false);
            }

            this.extraKeyboardChoiceInit = () => {
                // This is the second panel, enable back navigation for this and subsequent pages
                bridge.invoke("CloudExperienceHost.setShowBackButton", true);
            }

            this.currentPanelIndex.subscribe((newStepIndex) => {
                this.processingFlag(false);

                let newStepPanel = document.querySelector(".oobe-panel[data-panel-index='" + newStepIndex + "']");
                if (!newStepPanel) {
                    //flow has gone all the way through the panels, user has added an extra keyboard
                    this.completeKeyboardFlow(true);
                } else {
                    let item = ko.dataFor(this.currentPanelElement());

                    if (item.onInit) {
                        item.onInit();
                    }

                    if (item.voiceConversationHandler) {
                        item.voiceConversationHandler();
                    }

                    if (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite) {
                        let keyboardGlyphEle = document.querySelector('#keyboardGlyph');
                        if (keyboardGlyphEle) {
                            keyboardGlyphEle.setAttribute("aria-hidden", "true");
                        }
                    }

                    let skipBtnEle = document.querySelector('#OOBEKeyboardSkipButton');
                    if (skipBtnEle) {
                        skipBtnEle.setAttribute("aria-label", this.resourceStrings.skipButtonAccLabel);
                    }
                }
            });

            // One of the component redirections loses the object context for invoking this. For now use an arrow function to work around this.
            this.nextStep = () => {
                if (!this.processingFlag()) {
                    this.processingFlag(true);
                    this.currentPanelIndex(this.currentPanelIndex() + 1);
                }
            }

            this.firstPanelRender = () => {
                let item = ko.dataFor(this.currentPanelElement());
                if (item.voiceConversationHandler) {
                    item.voiceConversationHandler();
                }
            }

            this.defaultConstraints = () => {
                return [CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes, CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no];
            }

            this.addLayoutConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(new Array(this.resourceStrings.addLayoutButtonText));
            this.addLayoutConstraint.tag = tagAddLayout;
            this.skipConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(new Array(this.resourceStrings.skipButtonText));
            this.skipConstraint.tag = tagSkip;
            this.extraKeyboardConstraints = () => {
                let constraintRes = this.defaultConstraints();
                constraintRes.push(this.skipConstraint);
                constraintRes.push(this.addLayoutConstraint);
                return constraintRes;
            }

            this.speechOutputErrorString = "Speech was Unsuccessful";
            this.speechInputErrorString = "Voice Recognition was Unsuccessful";

            this.keyboardsForDefaultInputLanguageVoiceConversation = () => {
                let keyboardSelectionVoiceOverString = this.resourceStrings['keyboardSelectionVoiceOver'].replace("%1", this.selectedKeyboardForDefaultInputLanguage().name);

                CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(keyboardSelectionVoiceOverString, this.defaultConstraints()).then((result) => {
                    if (!this.processingFlag() && result && result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag) {
                        this.nextStep();
                        return WinJS.Promise.wrapError(null);
                    } else if (!this.processingFlag() && result && result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no.tag) {
                        // this should speak the "say the one you want" Cortana line
                        CloudExperienceHostAPI.Speech.SpeechSynthesis.stop();
                        return CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.resourceStrings['keyboardSelectionWrongVoiceOver'], this.keyboardsForDefaultInputLanguageConstraints());
                    } else {
                        return WinJS.Promise.wrapError(this.speechInputErrorString);
                    }
                }).then((result) => {
                    CloudExperienceHostAPI.Speech.SpeechSynthesis.stop();
                    if (!this.processingFlag() && result && result.constraint.tag) {
                        this.selectedKeyboardForDefaultInputLanguage(this.keyboardsForDefaultInputLanguage.find((keyboard) => keyboard.kbid === result.constraint.tag));
                        let keyboardSelectionConfirmation = this.resourceStrings['keyboardSelectionConfirmationVoiceOver'].replace("%1", this.selectedKeyboardForDefaultInputLanguage().name);
                        return CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(keyboardSelectionConfirmation, this.defaultConstraints());
                    } else {
                        CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.resourceStrings['failedVoiceSelectionVoiceOver'], null);
                        return WinJS.Promise.wrapError(this.speechInputErrorString);
                    }
                }).then((result) => {
                    if (!this.processingFlag() && result && result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag) {
                        this.nextStep();
                        return WinJS.Promise.wrapError(null);
                    } else if (!this.processingFlag() && result && result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no.tag) {
                        CloudExperienceHostAPI.Speech.SpeechSynthesis.stop();
                        return CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.resourceStrings['failedVoiceSelectionVoiceOver'], null);
                    } else {
                        return WinJS.Promise.wrapError(this.speechInputErrorString);
                    }
                }).done(null, (error) => {
                    if (error && !(error === this.speechOutputErrorString || error === this.speechInputErrorString)) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeechError", core.GetJsonFromError(error));
                    }
                });
            }

            this.extraKeyboardVoiceConversation = () => {
                this.hasCommitted = false;
                CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.resourceStrings['extraKeyboardChoiceVoiceOver'], this.extraKeyboardConstraints()).then((result) => {
                    if (!this.processingFlag() && result && ((result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag) || (result.constraint.tag === tagAddLayout))) {
                        this.nextStep();
                        return WinJS.Promise.wrapError(null);
                    } else if (!this.processingFlag() && result && ((result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no.tag) || (result.constraint.tag === tagSkip))) {
                        //complete the flow without adding a second keyboard
                        this.completeKeyboardFlow(false);
                        return WinJS.Promise.wrapError(null);
                    } else {
                        return WinJS.Promise.wrapError(this.speechInputErrorString);
                    }
                }).done(null, (error) => {
                    if (error && !(error === this.speechOutputErrorString || error === this.speechInputErrorString)) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeechError", core.GetJsonFromError(error));
                    }
                });
            }

            this.inputLanguageVoiceConversation = () => {
                CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.resourceStrings['extraKeyboardLangSelectVoiceOver'], this.inputLanguagesConstraints()).then((result) => {
                    if (result && result.constraint.tag) {
                        this.selectedInputLanguage(this.inputLanguages.find((inputLanguage) => inputLanguage.localeName === result.constraint.tag));
                        let extraKeyboardLangSelectConfirmation = this.resourceStrings["extraKeyboardLangSelectConfirmationVoiceOver"].replace("%1", this.selectedInputLanguage().name);
                        return CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(extraKeyboardLangSelectConfirmation, this.defaultConstraints());
                    } else {
                        return WinJS.Promise.wrapError(this.speechInputErrorString);
                    }
                }).then((result) => {
                    if (!this.processingFlag() && result && (result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag)) {
                        this.nextStep();
                        return WinJS.Promise.wrapError(null);
                    } else if (!this.processingFlag() && result && result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no.tag) {
                        CloudExperienceHostAPI.Speech.SpeechSynthesis.stop();
                        return CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.resourceStrings['failedVoiceSelectionVoiceOver'], null);
                    } else {
                        return WinJS.Promise.wrapError(this.speechInputErrorString);
                    }
                }).done(null, (error) => {
                    if (error && !(error === this.speechOutputErrorString || error === this.speechInputErrorString)) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeechError", core.GetJsonFromError(error));
                    }
                });
            }

            this.keyboardsForInputLanguageVoiceConversation = () => {
                CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.resourceStrings['extraKeyboardSelectionVoiceOver'], this.keyboardsForInputLanguageConstraints()).then((result) => {
                    if (!this.processingFlag() && result && result.constraint.tag) {
                        this.selectedKeyboardForInputLanguage(this.keyboardsForInputLanguage().find((keyboard) => keyboard.kbid === result.constraint.tag));
                        let extraKeyboardSelectionConfirmation = this.resourceStrings["extraKeyboardSelectionConfirmationVoiceOver"].replace("%1", this.selectedKeyboardForInputLanguage().name);
                        return CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(extraKeyboardSelectionConfirmation, this.defaultConstraints());
                    } else {
                        return WinJS.Promise.wrapError(this.speechInputErrorString);
                    }
                }).then((result) => {
                    if (!this.processingFlag() && result && (result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag)) {
                        this.nextStep();
                        return WinJS.Promise.wrapError(null);
                    } else if (!this.processingFlag() && result && result.constraint.tag === CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no.tag) {
                        CloudExperienceHostAPI.Speech.SpeechSynthesis.stop();
                        return CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.resourceStrings['failedVoiceSelectionVoiceOver'], null);
                    } else {
                        return WinJS.Promise.wrapError(this.speechInputErrorString);
                    }
                }).done(null, (error) => {
                    if (error && !(error === this.speechOutputErrorString || error === this.speechInputErrorString)) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeechError", core.GetJsonFromError(error));
                    }
                });
            }
            this.completeKeyboardFlow = (secondKeyboard) => {
                if (!this.processingFlag()) {
                    this.processingFlag(true);

                    uiHelpers.PortableDeviceHelpers.unsubscribeToDeviceInsertion(this.gestureManager, bridge, core);

                    let keyboards = [this.selectedKeyboardForDefaultInputLanguage()];
                    if (typeof (secondKeyboard) === "boolean" && secondKeyboard) {
                        keyboards.push(this.selectedKeyboardForInputLanguage());
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SecondKeyboardAdded");
                    }
                    try {
                        // Show the progress ring while committing async.
                        bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                        appObjectFactory.getObjectFromString("CloudExperienceHostAPI.OobeKeyboardManagerStaticsCore").commitKeyboardsAsync(keyboards).done(() => {
                            // Notify the chrome footer to update the input switch button
                            bridge.invoke("CloudExperienceHost.setShowInputSwitchButton");

                            bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                        }, (error) => {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent",
                                          "KeyboardCommitAsyncWorkerError",
                                          core.GetJsonFromError(error));
                            bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                        });
                    } catch (error) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent",
                                      "KeyboardCommitError",
                                      core.GetJsonFromError(error));
                        bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                    }
                }
            }

            this.pageDefaultAction = () => {
                let item = ko.dataFor(this.currentPanelElement());
                for (let i = 0; i < item.footerButtons.length; i++) {
                    if ((item.footerButtons[i].autoFocus == true) && item.footerButtons[i].buttonClickHandler) {
                        item.footerButtons[i].buttonClickHandler();
                        return;
                    }
                    else if ((i == item.footerButtons.length - 1) && item.footerButtons[i].buttonClickHandler) {
                        item.footerButtons[i].buttonClickHandler();
                        return;
                    }
                }
            }
        }

        handleBackNavigation() {
            // Since the back button in Frame is removed asynchronously, multiple back navigations may arrive
            // during transitions within the webapp panes.
            // Therefore also cap the panel index decrement at zero.
            if (!this.processingFlag() && (this.currentPanelIndex() > 0)) {
                this.processingFlag(true);
                this.currentPanelIndex(this.currentPanelIndex() - 1);
            }
        }

        subscribeToDeviceInsertion(gestureManager) {
            uiHelpers.PortableDeviceHelpers.subscribeToDeviceInsertion(gestureManager, bridge, core);
        }
    }
    return KeyboardViewModel;
});
