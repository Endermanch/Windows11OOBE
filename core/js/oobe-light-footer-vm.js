//
// Copyright (C) Microsoft. All rights reserved.
//


define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core', 'legacy/uiHelpers'], (ko, bridge, constants, core, legacy_uiHelpers) => {
    class LightOOBEFooterViewModel {
        constructor(params) {
            this.showEOAButton = ko.observable(false);
            bridge.invoke("CloudExperienceHost.shouldShowEaseOfAccessControl").done((result) => {
                this.showEOAButton(result);
            });

            this.showInputSwitchButton = ko.observable(false);
            this._onInputSwitchIndicatorChange();

            this.showVolumeControlButton = ko.observable(true);
            let devEnum = Windows.Devices.Enumeration;
            devEnum.DeviceInformation.findAllAsync(Windows.Devices.Enumeration.DeviceClass.audioRender).then((result) => {
                if (result.length > 0) {
                    for (let i = 0; i < result.length; i++) {
                        if (result[i].isEnabled == true) {
                            this.showVolumeControlButton(true);
                            return;
                        }
                    }
                }
                this.showVolumeControlButton(false);
            });

            let resourceStrings = window.resourceStrings;
            // Use an empty string so that Narrator reads out individual footer elements without a Container name
            document.title = "";
            this.easeOfAccessAccName = ko.observable(resourceStrings.EaseOfAccessAccName);
            this.inputSwitchAccName = ko.observable(resourceStrings.InputSwitchAccName);
            this.volumeControlAccName = ko.observable(resourceStrings.VolumeControlAccName);

            bridge.addEventListener(constants.Events.languageChange, this._onLanguageChange.bind(this));
            bridge.addEventListener(constants.Events.updateFrameDirection, this._onUpdateFrameDirection.bind(this));
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

        onInputSwitch(data, event) {
            let element = event.target;
            if (element) {
                element.blur();

                bridge.invoke("CloudExperienceHost.getChromeFooterOffset").then((offset) => {
                    let rect = element.getBoundingClientRect();
                    // Place the flyout right-aligned
                    return bridge.invoke("CloudExperienceHost.showInputSwitchFlyout", rect.left + offset.x, rect.top + offset.y, screen.width, screen.height);
                }).done(() => {
                    LightOOBEFooterViewModel.logChromeEvent("showInputSwitchFlyoutSucceeded");
                },
                    function (err) {
                        LightOOBEFooterViewModel.logChromeEvent("showInputSwitchFlyoutFailed", core.GetJsonFromError(err));
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
                    LightOOBEFooterViewModel.logChromeEvent("showVolumeControlFlyoutSucceeded");
                }, (err) => {
                    LightOOBEFooterViewModel.logChromeEvent("showVolumeControlFlyoutFailedAsyncOp", core.GetJsonFromError(err));
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
                    LightOOBEFooterViewModel.logChromeEvent("showEaseOfAccessFlyoutSucceeded");
                }, (err) => {
                    LightOOBEFooterViewModel.logChromeEvent("showEaseOfAccessFlyoutFailed", core.GetJsonFromError(err));
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
                this.volumeControlAccName(resourceStrings.VolumeControlAccName);
            }, function (e) {
                LightOOBEFooterViewModel.logChromeEvent("makeResourceObjectAsyncFailed", core.GetJsonFromError(e));
            });
        }

        _onUpdateFrameDirection() {
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
    return LightOOBEFooterViewModel;
});
