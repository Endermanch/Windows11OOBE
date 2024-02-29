//
// Copyright (C) Microsoft. All rights reserved.
//
require.config(new RequirePathConfig('/webapps/inclusiveOobe'));
define(['lib/knockout', 'legacy/bridge'], (ko, bridge) => {
    const okTag = "Ok";

    class SsprErrorViewModel {
        constructor(resourceStrings, hasInternetAccess, navigationBlocked, navigationBlockedUri) {

            this.resourceStrings = resourceStrings;

            if (navigationBlocked) {
                this.title = resources.NavigationBlockedTitle;
                let navigationBlockedText = resources.NavigationBlockedText;
                navigationBlockedText = navigationBlockedText.replace("{0}", navigationBlockedUri);
                this.subHeaderText = navigationBlockedText;
                this.voiceOver = resources.NavigationBlockedVoiceOver;
            } else if (hasInternetAccess) {
                this.title = resources.Title;
                this.subHeaderText = resources.GenericMsaText;
                this.voiceOver = resources.GenericVoiceOver;
            } else {
                this.title = resources.NoNetworkMsaTitle;
                this.subHeaderText = resources.NoNetworkMsaText;
                this.voiceOver = resources.NoNetworkVoiceOver;
            }

            this.processingFlag = ko.observable(false);
            this.flexEndButtons = [
                {
                    buttonText: resources.Ok,
                    buttonType: "button",
                    isPrimaryButton: true,
                    autoFocus: true,
                    isVisible: true,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: (() => {
                        this.onCancel();
                    }),
                }
            ];
        }

        onCancel() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                // Error page is shown, exit CXH with cancel appresult.
                bridge.invoke("CloudExperienceHost.cancel");
            }   
        }

        startVoiceOver() {
            // Setup voiceover and speech recognition
            try {
                CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
                let constraints = this.createSpeechRecognitionConstraints();
                if (constraints && (constraints.length > 0)) {
                    CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(this.voiceOver, constraints).done((result) => {
                        this.onSpeechRecognitionResult(result);
                    });
                }
            }
            catch (err) {
                require(['legacy/core'], (core) => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeechErrorPageFailure: ", core.GetJsonFromError(err));
                });
            }
        }

        createSpeechRecognitionConstraints() {
            let okConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(new Array(this.resourceStrings.OkConstraint));
            okConstraint.tag = okTag;
            let constraints = [okConstraint];
            return constraints;
        }

        onSpeechRecognitionResult(result) {
            if (result && !this.processingFlag() && result.constraint.tag == okTag) {
                this.onCancel();
            }
        }

    }
    return SsprErrorViewModel;
});
