//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'oobesettings-data', 'legacy/bridge', 'legacy/events', 'legacy/core', 'corejs/knockouthelpers'], (ko, oobeSettingsData, bridge, constants, core, KoHelpers) => {
    class HelloViewModel {
        constructor(resourceStrings, enrollmentKinds, targetPersonality, isInternetAvailable) {
            const cxhSpeech = CloudExperienceHostAPI.Speech;
            const winSpeech = Windows.Media.SpeechRecognition;
            this.isLiteWhitePersonality = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite);

            this.resourceStrings = resourceStrings;
            this.enrollmentKinds = enrollmentKinds;
            this.processingFlag = ko.observable(false);
            this.contentContainerVisibility = ko.observable(true);
            this.flexStartHyperLinks = [];
            this.title = ko.observable("");
            this.leadText = ko.observable("");
            this.flexEndButtons = ko.observableArray([]);
            this.subtitle = ko.observable("");

            this.isMultiChoice = (this.enrollmentKinds.face && this.enrollmentKinds.fingerprint);
            this.isFaceSelected = true;
            this.hideContentWhileBioAppIsLaunched = !this.isLiteWhitePersonality;
            this.showConfirmationPage = this.isLiteWhitePersonality;
            this.skipOnIncompleteEnrollment = this.isLiteWhitePersonality;
            this.switchEnrollmentKindText = ko.observable(resourceStrings.HelloSwitchFaceToFingerprint);
            this.isConfirmationPageVisible = ko.observable(false);
            this.isInternetAvailable = isInternetAvailable;
            this.learnMoreContent = oobeSettingsData.getLearnMoreContent();

            this.learnMoreVisible = ko.observable(false);
            this.learnMoreVisible.subscribe((newValue) => {
                if (newValue === false) {
                    // Reenable button interaction if we're not showing Learn More. On the Learn More page,
                    // buttons will be enabled after the iframe is shown after oobeSettingsData.showLearnMoreContent()
                    this.processingFlag(false);
                }
            });
            this.flexEndButtonsLearnMore = [{
                buttonText: resourceStrings.HelloContinueButtonText,
                buttonType: "button",
                isPrimaryButton: true,
                autoFocus: true,
                buttonClickHandler: (() => {
                    this.onLearnMoreContinue();
                }),
                disableControl: ko.pureComputed(() => {
                    return this.processingFlag();
                })
            }];

            if (this.isMultiChoice) {
                if (!this.isLiteWhitePersonality) {
                    this.title(resourceStrings.HelloTitleMulti);
                    this.items = [
                        {
                            face: true,
                            fingerprint: false,
                            ariaLabel: resourceStrings.HelloFaceIconAriaLabel,
                            title: resourceStrings.HelloOptionTitleFace,
                            description: resourceStrings.HelloLeadTextFace
                        },
                        {
                            face: false,
                            fingerprint: true,
                            ariaLabel: resourceStrings.HelloFingerprintIconAriaLabel,
                            title: resourceStrings.HelloOptionTitleFingerprint,
                            description: resourceStrings.HelloOptionBodyFingerprint
                        }
                    ];

                    this.selectedItem = ko.observable(this.items[0]);
                    this.selectedItem.subscribe((newSelectedItem) => {
                        if (this.selectedItem().title != newSelectedItem.title) {
                            if (newSelectedItem.face) {
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentDisambiguationFaceSelected");
                            } else if (newSelectedItem.fingerprint) {
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentDisambiguationFingerprintSelected");
                            }
                        }
                    });
                } else {
                    // isMultiChoice && isLiteWhitePersonality
                    // By default, render Hello Face as the selected one
                    this.renderFace();
                }
            } else {
                // !isMultiChoice
                // Only one among Face or Fingerprint is available
                if (this.enrollmentKinds.face) {
                    this.renderFace();
                } else if (this.enrollmentKinds.fingerprint) {
                    this.isFaceSelected = false;
                    this.renderFingerprint();
                }
            }

            this.flexEndButtons([
                {
                    buttonText: resourceStrings.HelloButtonText,
                    buttonType: "button",
                    isPrimaryButton: true,
                    autoFocus: (this.isLiteWhitePersonality || !this.isMultiChoice),
                    buttonClickHandler: (() => {
                        let faceInEffect = false;
                        let fingerprintInEffect = false;

                        if (this.isLiteWhitePersonality) {
                            faceInEffect = this.isMultiChoice ? this.isFaceSelected : this.enrollmentKinds.face;
                            fingerprintInEffect = this.isMultiChoice ? !this.isFaceSelected : this.enrollmentKinds.fingerprint;
                        } else {
                            faceInEffect = ((this.isMultiChoice && this.selectedItem().face) || (!this.isMultiChoice && this.enrollmentKinds.face));
                            fingerprintInEffect = ((this.isMultiChoice && this.selectedItem().fingerprint) || (!this.isMultiChoice && this.enrollmentKinds.fingerprint));
                        }

                        const enrollmentKind = {
                            face: faceInEffect,
                            fingerprint: fingerprintInEffect
                        };
                        this.onSetUpClick(enrollmentKind);
                    }),
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    })
                }
            ]);

            // LiteWhite personality uses css to style a secondary button (isPrimaryButton property == false) as a hyperlink.
            // Add "Skip for now" option to the flexEndButton array if this personality is set.
            // Otherwise, add to the flexStartHyperLinks array.
            if (this.isLiteWhitePersonality) {
                this.flexEndButtons.unshift({
                    buttonText: resourceStrings.HelloSkipLink,
                    buttonClickHandler: (() => {
                        this.onSkipClick();
                    })
                });
            }
            else {
                this.flexStartHyperLinks = [
                    {
                        hyperlinkText: resourceStrings.HelloSkipLink,
                        handler: () => {
                            this.onSkipClick();
                        }
                    }
                ];
            }

            this.pageDefaultAction = () => {
                if (this.isMultiChoice) {
                    this.flexEndButtons()[0].buttonClickHandler();
                }
            }

            // Setup simple voiceover and speech recognition using the resource strings
            try {
                cxhSpeech.SpeechRecognition.stop();
                let constraints = [];
                const constraintsTags = {
                    setUp: "setUp", // Enroll with current selection (applicable to single and multi sensor cases)
                    multiFace: "multiFace", // Enroll with face in a multi sensor case
                    multiFingerprint: "multiFingerprint", // Enroll with fingerprint in a multi sensor case
                    skip: "skip" // Skip Windows Hello enrollment
                };

                if (this.isMultiChoice) {
                    let multiFaceConstraint = new winSpeech.SpeechRecognitionListConstraint([this.resourceStrings.HelloMultiFace1SpeechConstraint, this.resourceStrings.HelloMultiFace2SpeechConstraint, this.resourceStrings.HelloMultiFace3SpeechConstraint, this.resourceStrings.HelloMultiFace4SpeechConstraint, this.resourceStrings.HelloMultiFace5SpeechConstraint, this.resourceStrings.HelloMultiFace6SpeechConstraint]);
                    multiFaceConstraint.tag = constraintsTags.multiFace;
                    let multiFingerprintConstraint = new winSpeech.SpeechRecognitionListConstraint([this.resourceStrings.HelloMultiFingerprint1SpeechConstraint, this.resourceStrings.HelloMultiFingerprint2SpeechConstraint, this.resourceStrings.HelloMultiFingerprint3SpeechConstraint, this.resourceStrings.HelloMultiFingerprint4SpeechConstraint, this.resourceStrings.HelloMultiFingerprint5SpeechConstraint, this.resourceStrings.HelloMultiFingerprint6SpeechConstraint, this.resourceStrings.HelloMultiFingerprint7SpeechConstraint]);
                    multiFingerprintConstraint.tag = constraintsTags.multiFingerprint;
                    constraints.push(multiFaceConstraint, multiFingerprintConstraint);
                } else {
                    // Yes and no variations only apply for single sensor case
                    constraints.push(cxhSpeech.SpeechRecognitionKnownCommands.yes, cxhSpeech.SpeechRecognitionKnownCommands.no);
                }

                let setUpConstraint = new winSpeech.SpeechRecognitionListConstraint([this.resourceStrings.HelloSetUpSpeechConstraint]);
                setUpConstraint.tag = constraintsTags.setUp;

                let skipConstraint = new winSpeech.SpeechRecognitionListConstraint([this.resourceStrings.HelloSkip1SpeechConstraint, this.resourceStrings.HelloSkip2SpeechConstraint]);
                skipConstraint.tag = constraintsTags.skip;

                constraints.push(cxhSpeech.SpeechRecognitionKnownCommands.next, setUpConstraint, skipConstraint);
                if (constraints && (constraints.length > 0)) {
                    let helloVoiceOver = null;
                    if (this.isMultiChoice) {
                        helloVoiceOver = this.resourceStrings.HelloMultiVoiceOver;
                    } else {
                        if (this.enrollmentKinds.face) {
                            helloVoiceOver = this.resourceStrings.HelloFaceVoiceOver;
                        } else if (this.enrollmentKinds.fingerprint) {
                            helloVoiceOver = this.resourceStrings.HelloFingerprintVoiceOver;
                        }
                    }

                    cxhSpeech.SpeechRecognition.promptForCommandsAsync(helloVoiceOver, constraints).done((result) => {
                        if (result && !this.processingFlag()) {
                            if ((result.constraint.tag == constraintsTags.skip) || (result.constraint.tag == cxhSpeech.SpeechRecognitionKnownCommands.no.tag)) {
                                this.onSkipClick();
                            } else {
                                let enrollmentKind = null;
                                if ((result.constraint.tag == constraintsTags.setUp) || (result.constraint.tag == cxhSpeech.SpeechRecognitionKnownCommands.yes.tag) || (result.constraint.tag == cxhSpeech.SpeechRecognitionKnownCommands.next.tag)) {
                                    enrollmentKind = {
                                        face: ((this.isMultiChoice && this.selectedItem().face) || (!this.isMultiChoice && this.enrollmentKinds.face)),
                                        fingerprint: ((this.isMultiChoice && this.selectedItem().fingerprint) || (!this.isMultiChoice && this.enrollmentKinds.fingerprint))
                                    };
                                } else if ((result.constraint.tag == constraintsTags.multiFace) || (result.constraint.tag == constraintsTags.multiFingerprint)) {
                                    enrollmentKind = {
                                        face: (result.constraint.tag == constraintsTags.multiFace),
                                        fingerprint: (result.constraint.tag == constraintsTags.multiFingerprint)
                                    };
                                }
                                if (enrollmentKind) {
                                    this.onSetUpClick(enrollmentKind);
                                }
                            }
                        }
                    });
                }
            }
            catch (err) {
            }
        }

        renderFace() {
            // If not LiteWhite personality (likely InclusiveBlue) , show gif instead of Lottie for face animation
            if (!this.isLiteWhitePersonality) {
                this.ariaLabel = resourceStrings.HelloFaceAnimationAltText;
                const faceAnimation = document.getElementById("helloFaceAnimation");
                faceAnimation.src = "/media/HelloFaceAnimation.gif";
                this.leadText(resourceStrings.HelloLeadTextFace);
            } else {
                this.subtitle(resourceStrings.HelloLeadTextFace);
                this.switchEnrollmentKindText(resourceStrings.HelloSwitchFaceToFingerprint);
                bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", "winhellofaceLottie.json");
            }
            this.title(resourceStrings.HelloTitleFace);
        }

        renderFingerprint() {
            // For fingerprint, only set values for animation control when showing the UI
            if (!this.isLiteWhitePersonality) {
                this.ariaLabel = resourceStrings.HelloFingerprintIconAriaLabel;
                this.leadText(resourceStrings.HelloLeadTextFingerprint);
            } else {
                this.subtitle(resourceStrings.HelloLeadTextFingerprint);
                this.switchEnrollmentKindText(resourceStrings.HelloSwitchFingerprintToFace);
                bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", "winhellofingerprintLottie.json");
            }
            this.title(resourceStrings.HelloTitleFingerprint);
        }

        // This callback only applies in isMultiOption and isLiteWhitePersonality scenario
        onSwitchEnrollmentKindClick() {
            this.isFaceSelected = !this.isFaceSelected;

            if (this.isFaceSelected) {
                this.renderFace();
            } else {
                this.renderFingerprint();
            }

            return false;
        }

        onSetUpClick(enrollmentKind) {
            if (!this.processingFlag()) {
                this.processingFlag(true);

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentShowingEnrollmentApp");

                try {
                    const cxhSpeech = CloudExperienceHostAPI.Speech;
                    cxhSpeech.SpeechRecognition.stop();

                    let helloVoiceOver = null;
                    if (enrollmentKind.face) {
                        helloVoiceOver = this.resourceStrings.HelloFaceEnrollmentVoiceOver;
                    } else if (enrollmentKind.fingerprint) {
                        helloVoiceOver = this.resourceStrings.HelloFingerprintEnrollmentVoiceOver;
                    }

                    cxhSpeech.SpeechRecognition.promptForCommandsAsync(helloVoiceOver, null);
                }
                catch (err) {
                }

                bridge.invoke(this.isLiteWhitePersonality ? "CloudExperienceHost.getFrameViewBoundingRect" : "CloudExperienceHost.getBoundingClientRect").done((result) => {
                    const rect = {
                        height: result.height,
                        width: result.width,
                        x: result.x * window.devicePixelRatio,
                        y: result.y * window.devicePixelRatio
                    };

                    if (this.hideContentWhileBioAppIsLaunched) {
                        // Hide the content of this page to avoid undesired flashing after bio enrollment app
                        // finishes and this page shows up a split second before navigating to next page
                        this.contentContainerVisibility(false);
                    }
                    else {
                        // Hide all interactable button items from view, but maintain webapp view while bio enrollment app is showing
                        document.getElementById("helloFlexEndButtons").style.visibility = "hidden";
                    }

                    let enrollmentPersonality = this.getEnrollmentPersonality();

                    bridge.invoke("CloudExperienceHost.Hello.startHelloEnrollment", enrollmentKind, rect, enrollmentPersonality).done((enrollResult) => {
                        this.contentContainerVisibility(false);
                        window.removeEventListener("resize", HelloViewModel._onResize);

                          let enrollmentResult = JSON.parse(enrollResult);
                          if (enrollmentResult.completedWithError) {
                              bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentFailed");
                              bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
                          }
                          else if (enrollmentResult.completed) {
                              if (this.showConfirmationPage) {
                                this.updateToConfirmationPage();
                              }
                              else {
                                  bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentSuccess");
                                  bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                              }
                          }
                          else if (this.skipOnIncompleteEnrollment) {
                              bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentCanceled");
                              bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
                          }
                          else {
                              bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentCanceled");
                              bridge.invoke("CloudExperienceHost.undimChrome");
                              if (!this.hideContentWhileBioAppIsLaunched)
                              {
                                    document.getElementById("helloFlexEndButtons").style.visibility = "visible";
                              }

                              this.processingFlag(false);
                              // Show the content of this page if enrollment app cancels
                              this.contentContainerVisibility(true);
                              // Restore focus to the default focusable element as the flow is returning to this page
                              KoHelpers.setFocusOnAutofocusElement();
                          }
                    }, (error) => {
                        window.removeEventListener("resize", HelloViewModel._onResize);
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentFailed", core.GetJsonFromError(error));
                        bridge.fireEvent(constants.Events.done, constants.AppResult.fail);
                    });

                    window.addEventListener("resize", HelloViewModel._onResize);
                    bridge.invoke("CloudExperienceHost.dimChrome");
                }, (error) => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentSizingFailed", core.GetJsonFromError(error));
                    bridge.fireEvent(constants.Events.done, constants.AppResult.fail);
                });
            }
        }

        onSkipClick() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentCanceled");
                bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
            }
        }

        onLearnMoreClick() {
            if (!this.processingFlag()) {
                bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "LearnMoreButtonClicked");
                this.processingFlag(true);
                this.learnMoreVisible(true);

                let learnMoreIFrame = document.getElementById("hello-learnmore-iframe");
                let doc = learnMoreIFrame.contentWindow.document;
                oobeSettingsData.updateLearnMoreContentForRender(doc, document.documentElement.dir, this.isInternetAvailable, resourceStrings.HelloLearnMoreNavigationError, targetPersonality, "WindowsHello");
                this.processingFlag(false);
            }
        }

        onLearnMoreContinue() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "LearnMoreContinueButtonClicked");
                this.learnMoreVisible(false);
                KoHelpers.setFocusOnAutofocusElement();
            }
        }

        updateToConfirmationPage() {
            this.isConfirmationPageVisible(true);
            this.title(resourceStrings.AllSetText);
            this.subtitle("");
            this.flexEndButtons([{
                buttonText: resourceStrings.NextButtonText,
                buttonType: "button",
                isPrimaryButton: true,
                autoFocus: true,
                buttonClickHandler: (() => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentSuccess");
                    bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                })
            }]);
            document.getElementById("helloFlexEndButtons").style.visibility = "visible";

            document.getElementById("oobeHeader").classList.add("error-light");

            this.processingFlag(false);
            this.contentContainerVisibility(true);
        }

        getEnrollmentPersonality() {
            let personality = CloudExperienceHostBroker.Hello.EnrollmentPersonality.notSpecified;
            switch(targetPersonality)
            {
                case CloudExperienceHost.TargetPersonality.InclusiveBlue:
                    personality = CloudExperienceHostBroker.Hello.EnrollmentPersonality.inclusiveBlue;
                    break;
                case CloudExperienceHost.TargetPersonality.LiteWhite:
                    personality = CloudExperienceHostBroker.Hello.EnrollmentPersonality.liteWhite;
                    break;
                default:
                    break;
            }
            return personality;
        }

        static _onResize(param) {
            bridge.invoke("CloudExperienceHost.getBoundingClientRect").done((result) => {
                try {
                    const rect = {
                        height: result.height,
                        width: result.width,
                        x: result.x * window.devicePixelRatio,
                        y: result.y * window.devicePixelRatio
                    };

                    bridge.invoke("CloudExperienceHost.Hello.updateWindowLocation", rect);
                }
                catch (error) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentResizingFailed", core.GetJsonFromError(error));
                }
            });
        }
    }

    return HelloViewModel;
});
