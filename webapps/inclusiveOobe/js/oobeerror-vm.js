//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/events', "legacy/core"], (ko, bridge, constants, core) => {
    const tagRetry = "retry";
    const tagSkip = "skip";

    class ErrorViewModel {
        constructor(resourceStrings, errorNode) {
            this.resourceStrings = resourceStrings;
            this.title = resourceStrings.ErrorTitle;
            this.skipButtonVisible = errorNode.failID ? true : false;
            this.subHeaderText = (this.skipButtonVisible) ? resourceStrings.ErrorRetryAndSkipText : resourceStrings.ErrorRetryOnlyText;
            this.cxidText = errorNode.cxid.toUpperCase();
            this.skipString = resourceStrings.ErrorButtonSkipText;

            this.processingFlag = ko.observable(false);
            this.flexEndButtons = [
                {
                    buttonText: this.skipString,
                    buttonType: "button",
                    isPrimaryButton: false,
                    isVisible: this.skipButtonVisible,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: (() => {
                        this.onSkip();
                    }),
                },
                {
                    buttonText: resourceStrings.ErrorButtonRetryText,
                    buttonType: "button",
                    isPrimaryButton: true,
                    autoFocus: true,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: (() => {
                        this.onRetry();
                    }),
                },
            ];
        }

        startVoiceOver() {
            // Setup voiceover and speech recognition
            try {
                CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
                let constraints = this.createSpeechRecognitionConstraints();
                if (constraints && (constraints.length > 0)) {
                    CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.skipButtonVisible ? this.resourceStrings.ErrorVoiceOver : this.resourceStrings.ErrorRetryOnlyVoiceOver, constraints).done((result) => {
                        this.onSpeechRecognitionResult(result);
                    });
                }
            }
            catch (err) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeechErrorPageFailure: ", core.GetJsonFromError(err));
            }
        }

        onRetry() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                bridge.fireEvent(constants.Events.retryApp, null);
            }
        }

        onSkip() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                bridge.fireEvent(constants.Events.skipApp, null);
            }
        }

        createSpeechRecognitionConstraints() {
            let retryConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(new Array(this.resourceStrings.RetryConstraint));
            retryConstraint.tag = tagRetry;
            let constraints = [ retryConstraint ];

            if (this.skipButtonVisible) {
                let skipConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(new Array(this.resourceStrings.SkipConstraint));
                skipConstraint.tag = tagSkip;
                constraints.push(skipConstraint);
            }
            return constraints;
        }

        onSpeechRecognitionResult(result) {
            if (result && !this.processingFlag()) {
                if (result.constraint.tag == tagRetry) {
                    this.onRetry();
                }
                else if (result.constraint.tag == tagSkip) {
                    this.onSkip();
                }
            }
        }
    }
    return ErrorViewModel;
});