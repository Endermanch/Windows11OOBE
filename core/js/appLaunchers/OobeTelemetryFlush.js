//
// Copyright (C) Microsoft. All rights reserved.
//

define(['legacy/core'], (core) => {
    class OobeTelemetryFlush {
        launchAsync() {
            try
            {
                // Skip if there is no internet access.
                if (!CloudExperienceHost.Environment.hasInternetAccess()) {
                    return this.setNetworkStateAndReturnAppResultAsync(CloudExperienceHost.AppResult.abort);
                }

                // The external subscription ID is hardcoded here as OOBE runs before any of the other mechanisms we would use to determine
                // what placement id to use for internal vs external. 
                // Please reference onecoreuap\shell\contentdeliverymanager\utils\inc\TargetedContentConfiguration.h
                let self = this;
                return CloudExperienceHostAPI.ContentDeliveryManagerHelpers.flushReportedInteractionsAsync("314567").then(function () {
                    CloudExperienceHost.Telemetry.logEvent("oobeTelemetryFlushSucceeded");
                    return self.setNetworkStateAndReturnAppResultAsync(CloudExperienceHost.AppResult.success);
                }, function (err) {
                    CloudExperienceHost.Telemetry.logEvent("oobeTelemetryFlushAsyncOperationFailure", core.GetJsonFromError(err));
                    return self.setNetworkStateAndReturnAppResultAsync(CloudExperienceHost.AppResult.fail);
                });
            }
            catch (err) {
                CloudExperienceHost.Telemetry.logEvent("oobeTelemetryFlushFailure", core.GetJsonFromError(err));
                return WinJS.Promise.as(CloudExperienceHost.AppResult.fail);
            }
        }

        setNetworkStateAndReturnAppResultAsync(result) {
            let networkState = CloudExperienceHost.Environment.hasInternetAccess() ? 1 : 0;
            let setNetworkStatePromise = CloudExperienceHostAPI.UserIntentRecordCore.setIntentPropertyDWORDAsync("Wireless", "NetworkState", networkState);
            return setNetworkStatePromise.then(function () {
                CloudExperienceHost.Telemetry.logEvent("NetworkStateRecordedSuccess");
                return result;
            }, function (err) {
                CloudExperienceHost.Telemetry.logEvent("NetworkStateRecordedFailure", core.GetJsonFromError(err));
                return result;
            });
        }
    }
    return OobeTelemetryFlush;
});
