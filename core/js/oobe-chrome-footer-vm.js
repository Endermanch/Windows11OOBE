//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core', 'legacy/uiHelpers', 'optional!sample/CloudExperienceHostAPI.Speech.SpeechRecognition', 'optional!sample/CloudExperienceHostAPI.Speech.SpeechRecognitionController'], (ko, bridge, constants, core, legacy_uiHelpers) => {
    class OOBEChromeFooterViewModel {
        constructor(params) {
            this.showEOAButton = ko.observable(false);
            bridge.invoke("CloudExperienceHost.shouldShowEaseOfAccessControl").done((result) => {
                this.showEOAButton(result);
            });

            this.showInputSwitchButton = ko.observable(false);
            this._onInputSwitchIndicatorChange();
            let resourceStrings = window.resourceStrings;
            document.title = resourceStrings.ControlBarAccName;
            this.easeOfAccessAccName = ko.observable(resourceStrings.EaseOfAccessAccName);
            this.inputSwitchAccName = ko.observable(resourceStrings.InputSwitchAccName);
            this.micButtonEnabled = ko.observable(true);
            this.micButtonAccNameEnabled = ko.observable(resourceStrings.MicButtonAccNameEnabled);
            this.micButtonAccNameDisabled = ko.observable(resourceStrings.MicButtonAccNameDisabled);
            this.micButtonAccName = ko.pureComputed(() => {
                return this.micButtonEnabled() ? this.micButtonAccNameEnabled() : this.micButtonAccNameDisabled();
            });
            this.micEnabledVoiceOver = ko.observable(resourceStrings.MicEnabledVoiceOver);
            this.cortanaIconAccName = ko.observable(resourceStrings.cortanaIconAccName);
            this.volumeControlAccName = ko.observable(resourceStrings.VolumeControlAccName);
            this.showVolumeControlButton = ko.observable(true);
            this.speechRecognition = AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Speech.SpeechRecognition");
            this.speechController = AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Speech.SpeechRecognitionController");
            this.speechControllerState = CloudExperienceHostAPI.Speech.SpeechControllerState.disabled;
            this.micDisabledExplicitly = false;
            this.micStateTimer = null;
            this.micState = ko.observable("");
            this.micText = ko.observable("");
            this.showMicArea = ko.observable(false);
            this.updateMicButtonTextAndState();
            this.isCortanaMutedString = "isCortanaMuted";
            this.isSpeechAllowedByPolicy = true;

            try {
                this.isSpeechAllowedByPolicy = this.speechController.isSpeechAllowedByPolicy();
            } catch (exception) {
                CloudExperienceHost.Telemetry.logEvent("IsSpeechAllowedByPolicyError", core.GetJsonFromError(exception));
            }

            this.speechController.addEventListener("statechanged", this.onMicStateChanged.bind(this));
            bridge.invoke("CloudExperienceHost.Environment.isSpeechDisabled").done((isSpeechDisabled) => {
                bridge.invoke("CloudExperienceHost.Cortana.isCortanaSupported").done((isCortanaSupported) => {
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", this.isCortanaMutedString).done((isCortanaMuted) => {
                        // Explicitly show mic area as it won't be in the right state if we haven't called enableAsync yet but if isCortanaMuted is 1, we know it's valid
                        if (!isSpeechDisabled && isCortanaSupported && isCortanaMuted) {
                            this.showMicArea(true);
                        }

                        this.speechController.enableAsync(!isSpeechDisabled && isCortanaSupported && !isCortanaMuted && this.isSpeechAllowedByPolicy); // onMicStateChanged callback will show & enable the button if this succeeds
                    }, (err) => {
                        this.speechController.enableAsync(!isSpeechDisabled && isCortanaSupported && this.isSpeechAllowedByPolicy); // onMicStateChanged callback will show & enable the button if this succeeds
                    });
                });
            });

            let devEnum = Windows.Devices.Enumeration;
            devEnum.DeviceInformation.findAllAsync(Windows.Devices.Enumeration.DeviceClass.audioRender).then(function (result) {
                if (result.length > 0) {
                    for (let i = 0; i < result.length; i++) {
                        if (result[i].isEnabled == true) {
                            this.showVolumeControlButton(true);
                            return;
                        }
                    }
                }
                this.showVolumeControlButton(false);
            }.bind(this));

            bridge.addEventListener(constants.Events.languageChange, this._onLanguageChange.bind(this));
            bridge.addEventListener(constants.Events.resetFooterFocus, this._resetKeyboardFocus.bind(this));
            bridge.addEventListener(constants.Events.inputSwitchIndicatorChange, this._onInputSwitchIndicatorChange.bind(this));
        }

        _onInputSwitchIndicatorChange() {
            bridge.invoke("CloudExperienceHost.shouldShowInputSwitchButton").done((result) => {
                this.showInputSwitchButton(result);
            });
        }

        _resetKeyboardFocus() {
            document.activeElement.blur();
        }

        updateMicButtonTextAndState() {
            if (!this.showMicArea() && (this.speechControllerState == CloudExperienceHostAPI.Speech.SpeechControllerState.disabled)) {
                // Microphone area is hidden & speech is still disabled - nothing to do
                return;
            }

            let text = null;
            let stateString = null;
            switch (this.speechControllerState) {
                case CloudExperienceHostAPI.Speech.SpeechControllerState.disabled:
                    // No text
                    stateString = "disabled";
                    break;
                case CloudExperienceHostAPI.Speech.SpeechControllerState.enabled:
                case CloudExperienceHostAPI.Speech.SpeechControllerState.idling:
                case CloudExperienceHostAPI.Speech.SpeechControllerState.speaking_Stop:
                    // No text
                    stateString = "idling";
                    break;
                case CloudExperienceHostAPI.Speech.SpeechControllerState.speaking_Start:
                    text = this.speechControllerCaption;
                    stateString = "speaking";
                    break;
                case CloudExperienceHostAPI.Speech.SpeechControllerState.listening_Start:
                    text = window.resourceStrings.MicStatusListening;
                    stateString = "listening";
                    break;
                case CloudExperienceHostAPI.Speech.SpeechControllerState.listening_Stop:
                    text = this.speechControllerCaption;
                    // this.speechControllerCaption is set to null in onMicStateChanged if nothing was recognized
                    // Treat that case as the 'idling' state
                    stateString = text ? "recognized" : "idling";
                    break;
            }
            this.micText(text);
            this.micState(stateString);
            this.micButtonEnabled(this.speechControllerState != CloudExperienceHostAPI.Speech.SpeechControllerState.disabled);

            // Show the microphone area if it was previously hidden
            this.showMicArea(true);
        }

        onMicButton(data, event) {
            let element = event.target;
            if (element) {
                element.blur();

                OOBEChromeFooterViewModel.logChromeEvent("MicButtonEnabled", this.micButtonEnabled());
                this.micDisabledExplicitly = false;
                bridge.invoke("CloudExperienceHost.Cortana.isCortanaSupported").done((isCortanaSupported) => {
                    let newValue = !this.micButtonEnabled() && isCortanaSupported;
                    this.speechController.enableAsync(newValue).done(function (result) {
                        // Only persist mute state if the user explicitly asked for Cortana to mute (!newValue), and Cortana was actually muted (!result)
                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", this.isCortanaMutedString, (!newValue && !result) ? 1 : 0);
                        if (result) {
                            this.speechRecognition.promptForCommandsAsync(this.micEnabledVoiceOver(), null);
                        }
                        else if (!newValue) {
                            this.micDisabledExplicitly = true;
                        }
                    }.bind(this));
                });
            }
        }

        onMicStateChanged(e) {
            clearTimeout(this.micStateTimer);
            this.speechControllerState = e.target;
            this.speechControllerCaption = (e.detail == "") ? null : e.detail;
            if ((this.speechControllerState == CloudExperienceHostAPI.Speech.SpeechControllerState.idling) ||
                (this.speechControllerState == CloudExperienceHostAPI.Speech.SpeechControllerState.speaking_Stop)) {
                // Wait for a second to avoid changing the text quickly between Speaking->Idle->Listening when Cortana transitions between talking and listening
                // The "idling" text update will be cancelled by the subsequent transition to 'listening'
                this.micStateTimer = setTimeout(function () {
                    this.updateMicButtonTextAndState()
                }.bind(this), 1000);
            }
            else {
                this.updateMicButtonTextAndState()
            }
        }

        onInputSwitch(data, event) {
            let element = event.target;
            if (element) {
                element.blur();

                bridge.invoke("CloudExperienceHost.getChromeFooterOffset").then((offset) => {
                    let rect = element.getBoundingClientRect();
                    // Place the flyout right-aligned
                    return bridge.invoke("CloudExperienceHost.showInputSwitchFlyout", rect.left + offset.x, rect.top + offset.y, screen.width, screen.height);
                }).done(() => {
                    OOBEChromeFooterViewModel.logChromeEvent("showInputSwitchFlyoutSucceeded");
                },
                function (err) {
                    OOBEChromeFooterViewModel.logChromeEvent("showInputSwitchFlyoutFailed", core.GetJsonFromError(err));
                });
            }
        }

        onVolumeControl(data, event) {
            let element = event.target;
            if (element) {
                element.blur();

                bridge.invoke("CloudExperienceHost.getChromeFooterOffset").then((offset) => {
                    let rect = element.getBoundingClientRect();
                    // Place the flyout right-aligned
                    return bridge.invoke("CloudExperienceHost.showVolumeControlFlyout", rect.left + offset.x, rect.top + offset.y, screen.width, screen.height);
                }).done(() => {
                    OOBEChromeFooterViewModel.logChromeEvent("showVolumeControlFlyoutSucceeded");
                },
                function (err) {
                    OOBEChromeFooterViewModel.logChromeEvent("showVolumeControlFlyoutFailedAsyncOp", core.GetJsonFromError(err));
                });
            }
        }

        onEOAButton(data, event) {
            let element = event.target;
            if (element) {
                element.blur();

                bridge.invoke("CloudExperienceHost.getChromeFooterOffset").then((offset) => {
                    let clientRect = element.getBoundingClientRect();
                    let realRect = {
                        left: clientRect.left + offset.x,
                        right: clientRect.right + offset.x,
                        top: clientRect.top + offset.y,
                        bottom: clientRect.bottom + offset.y
                    };
                    return bridge.invoke("CloudExperienceHost.showEaseOfAccessFlyout", new CloudExperienceHost.ShowEaseOfAccessArgs(realRect));
                }).done(() => {
                    OOBEChromeFooterViewModel.logChromeEvent("showEaseOfAccessFlyoutSucceeded");
                },
                function (err) {
                    OOBEChromeFooterViewModel.logChromeEvent("showEaseOfAccessFlyoutFailed", core.GetJsonFromError(err));
                });
            }
        }

        _onLanguageChange(updateTag) {
            bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeCommon", null /* keyList */, updateTag).done((result) => {
                window.resourceStrings = JSON.parse(result);
                let resourceStrings = window.resourceStrings;

                document.title = resourceStrings.ControlBarAccName;
                this.easeOfAccessAccName(resourceStrings.EaseOfAccessAccName);
                this.inputSwitchAccName(resourceStrings.InputSwitchAccName);
                this.micButtonAccNameEnabled(resourceStrings.MicButtonAccNameEnabled);
                this.micButtonAccNameDisabled(resourceStrings.MicButtonAccNameDisabled);
                this.micEnabledVoiceOver(resourceStrings.MicEnabledVoiceOver);
                this.updateMicButtonTextAndState();
                this.cortanaIconAccName(resourceStrings.cortanaIconAccName);
                this.volumeControlAccName(resourceStrings.VolumeControlAccName);
                if (!this.micDisabledExplicitly) {
                    // re-evaluate button state on language change as long no explicit disable of cortana
                    bridge.invoke("CloudExperienceHost.Cortana.isCortanaSupported").done((result) => {
                        this.speechController.enableAsync(result);
                    });
                }
            }, function (e) {
                OOBEChromeFooterViewModel.logChromeEvent("makeResourceObjectAsyncFailed", core.GetJsonFromError(e));
            });

            legacy_uiHelpers.LangAndDirPromise(document.documentElement, bridge);
        }

        static logChromeEvent(event, params) {
            if (params === undefined) {
                bridge.invoke("CloudExperienceHost.Telemetry.AppTelemetry.logChromeEvent", event);
            }
            else {
                bridge.invoke("CloudExperienceHost.Telemetry.AppTelemetry.logChromeEvent", event, params);
            }
        }
    }
    return OOBEChromeFooterViewModel;
});
