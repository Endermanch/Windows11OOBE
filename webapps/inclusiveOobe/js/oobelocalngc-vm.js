//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core', 'corejs/knockouthelpers'], (ko, bridge, constants, core, KoHelpers) => {
    class LocalNGCViewModel {
        constructor(resourceStrings, targetPersonality) {
            this.resourceStrings = resourceStrings;
            this.processingFlag = ko.observable(false);
            this.contentContainerVisibility = ko.observable(true);
            this.title = resourceStrings.LocalNGCTitle;
            this.leadText = resourceStrings.LocalNGCLeadText;
            this.ariaLabel = resourceStrings.LocalNGCIconAriaLabel;
            this.isLiteWhitePersonality = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite);
            this.transparencySetOnCoordinator = false;

            this.flexEndButtons = [
                {
                    buttonText: resourceStrings.LocalNGCButtonText,
                    buttonType: "button",
                    isPrimaryButton: true,
                    autoFocus: true,
                    buttonClickHandler: (() => {
                        this._createLocalPin();
                    }),
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    })
                }
            ];

            // Setup simple voiceover and speech recognition using the resource strings
            try {
                CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
                let localNGCConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint([this.resourceStrings.LocalNGC1SpeechConstraint, this.resourceStrings.LocalNGC2SpeechConstraint]);
                localNGCConstraint.tag = "localNGC";
                let constraints = [CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.next, localNGCConstraint];
                if (constraints && (constraints.length > 0)) {
                    CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.resourceStrings.LocalNGCVoiceOver, constraints).done((result) => {
                        if (result && !this.processingFlag()) {
                            if ((result.constraint.tag == CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.next.tag) || (result.constraint.tag == "localNGC")) {
                                this._createLocalPin();
                            }
                        }
                    });
                }
            }
            catch (err) {
            }
        }

        _createLocalPin() {
            if (!this.processingFlag()) {
                this.processingFlag(true);

                // Hide content while CredUI is up
                this.contentContainerVisibility(false);
                bridge.invoke("CloudExperienceHost.dimChrome");

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalNgcNextButtonClick");

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalNgcEnrollStart");

                if (this.isLiteWhitePersonality) {
                    bridge.invoke("CloudExperienceHost.CredUI.setTransparencyOptionOnCredUICoordinator").done((wasSet) => {
                        this.transparencySetOnCoordinator = wasSet;
                        this._createLocalPinInternal();
                    }, (e) => {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SetTransparencyOnCredUICoordinatorFailed", core.GetJsonFromError(e));
                        // Failure of the above API is not fatal. Continue with enrollment.
                        this._createLocalPinInternal();
                    });
                }
                else {
                    this._createLocalPinInternal();
                }
            }
        }

        _createLocalPinInternal() {
            bridge.invoke("CloudExperienceHost.LocalNgc.createLocalPinAsync").done(() => {
                if (this.transparencySetOnCoordinator) {
                    bridge.invoke("CloudExperienceHost.CredUI.removeTransparencyOptionOnCredUICoordinator");
                }

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalNgcEnrolled");
                bridge.fireEvent(constants.Events.done, constants.AppResult.success);
            }, (e) => {
                if (this.transparencySetOnCoordinator) {
                    bridge.invoke("CloudExperienceHost.CredUI.removeTransparencyOptionOnCredUICoordinator");
                }

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalNgcFailure", core.GetJsonFromError(e));

                this.processingFlag(false);
                bridge.invoke("CloudExperienceHost.undimChrome");
                this.contentContainerVisibility(true);
                // Fire event to hide progress ring on failure
                bridge.fireEvent(constants.Events.visible, true);

                // Restore focus to the default focusable element as the flow is returning to this page
                KoHelpers.setFocusOnAutofocusElement();
            });
        }
    }
    return LocalNGCViewModel;
});
