//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'oobeeula-data', 'legacy/bridge', 'legacy/events', 'legacy/core'], (ko, oobeEulaData, bridge, constants, core) => {
    const tagAccept = "accept";

    class EulaViewModel {
        constructor(resources, titleResourceId, frameStyleSheetPath, eulaData, gestureManager, targetPersonality) {
            this.resources = resources;
            this.title = resources[titleResourceId];
            this.msEulaFileContent = eulaData.msEulaString;
            this.oemEulaFileContent = eulaData.oemEulaString;
            this.showOEMEula = eulaData.hasOEMEula;
            this.msEulaAriaLabel = resources.MSIFrameLabel;
            this.oemEulaAriaLabel = resources.OEMIFrameLabel;
            this.gestureManager = gestureManager;
            this.supportClickableTitle = true;
            this.optinHotKey = true;
            this.isLiteWhitePersonality = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite);

            this.frameStyleSheetPath = frameStyleSheetPath;
            if (this.isLiteWhitePersonality) {
                this.frameStyleSheetPath = "/webapps/inclusiveOobe/css/light-iframe-eula.css";
            }

            this.processingFlag = ko.observable(false);
            this.flexStartButtons = [
                {
                    buttonText: resources.BackButtonText,
                    buttonType: "button",
                    isPrimaryButton: false,
                    disableControl: true,
                    buttonClickHandler: (() => {
                        // No-op. Always disabled.
                    }),
                }
            ];
            this.flexEndButtons = [
                {
                    buttonText: resources.YesButtonText,
                    buttonType: "button",
                    automationId: "OobeEulaYesButton",
                    isPrimaryButton: true,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: (() => {
                        this.onAccept();
                    }),
                }
            ];

            this.pageDefaultAction = () => {
                this.onAccept();
            }
        }

        startVoiceOver() {
            try {
                this.speakThenListen().done(() => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeakThenListenSuccess");
                }, (err) => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeakThenListenAsyncWorkerFailure", core.GetJsonFromError(err));
                });
            }
            catch (err) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeakThenListenFailure", core.GetJsonFromError(err));
            }
        }

        onAccept() {
            if (!this.processingFlag()) {
                this.processingFlag(true);

                uiHelpers.PortableDeviceHelpers.unsubscribeToDeviceInsertion(this.gestureManager, bridge, core);

                // Call the api to commit accept and go to the next page.
                try {
                    // Show the progress ring while committing async.
                    bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                    CloudExperienceHostAPI.OobeEulaManagerStaticsCore.acceptEulaAsync().done(() => {
                        bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                    }, (err) => {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AcceptEULAAsyncWorkerFailure", core.GetJsonFromError(err));
                        bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                    });
                }
                catch (err) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "AcceptEULAFailure", core.GetJsonFromError(err));
                    bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                }
            }
        }

        onScrollDown() {
            try {
                var iframes = document.querySelectorAll(".eula-iframe");
                iframes.forEach((iframe) => {
                    var scrollTop = iframe.contentDocument.body.scrollTop;
                    var iframeHeight = iframe.clientHeight;
                    var scrollAmount = (iframeHeight / 4);
                    iframe.contentDocument.body.scrollTop = scrollTop + scrollAmount;
                });
            } catch (err) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "onScrollDownFailure", core.GetJsonFromError(err));
            }
        }

        onScrollUp() {
            try {
                var iframes = document.querySelectorAll(".eula-iframe");
                iframes.forEach((iframe) => {
                    var scrollTop = iframe.contentDocument.body.scrollTop;
                    var iframeHeight = iframe.clientHeight;
                    var scrollAmount = (iframeHeight / 4);
                    iframe.contentDocument.body.scrollTop = scrollTop - scrollAmount;
                });
            } catch (err) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "onScrollUpFailure", core.GetJsonFromError(err));
            }
        }

        speakThenListen() {
            CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
            return CloudExperienceHostAPI.Speech.SpeechSynthesis.speakAsync(this.resources.PageVoiceOver).then(() => {
            }, (err) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeakAsyncFailure", core.GetJsonFromError(err));
            });
        }

        subscribeToDeviceInsertion(gestureManager) {
            uiHelpers.PortableDeviceHelpers.subscribeToDeviceInsertion(gestureManager, bridge, core);
        }
    }
    return EulaViewModel;
});
