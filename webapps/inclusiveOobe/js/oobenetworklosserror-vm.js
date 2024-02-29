//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/events', "legacy/core"], (ko, bridge, constants, core) => {
    class NetworkLossErrorViewModel {
        constructor(resourceStrings) {
            this.resourceStrings = resourceStrings;
            this.title = resourceStrings.NetworkLossErrorTitle;
            this.subHeaderText = resourceStrings.NetworkLossErrorText;

            this.processingFlag = ko.observable(false);
            this.flexEndButtons = [
                {
                    buttonText: resourceStrings.NetworkLossErrorButtonRetryText,
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

        onRetry() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "RetryButtonClicked");
                bridge.fireEvent(constants.Events.done, constants.AppResult.success);
            }
        }
    }
    return NetworkLossErrorViewModel;
});