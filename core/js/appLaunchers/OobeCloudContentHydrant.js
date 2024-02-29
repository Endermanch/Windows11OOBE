//
// Copyright (C) Microsoft. All rights reserved.
//

define(['legacy/core'], (core) => {

    class OobeCloudContentHydrant {

        refreshFeatureConfigurations() {
            // If network is unavailable, then skip this work.
            if (!CloudExperienceHost.Environment.hasInternetAccess()) {
                return WinJS.Promise.as(CloudExperienceHost.AppResult.abort);
            }

            CloudExperienceHost.Telemetry.logEvent("flightDataRefreshStarted");
            return CloudExperienceHostAPI.UtilStaticsCore.tryRefreshWindowsFlightDataAsync().then((completed) => {
                CloudExperienceHost.Telemetry.logEvent("flightDataRefresh" + (completed ? "Completed" : "Timeout"));
                return CloudExperienceHost.getWindowsFlightDataAsync();
            }).then(() => {
                CloudExperienceHost.Telemetry.logEvent("flightDataRefreshDataRetrieved");
                return CloudExperienceHost.AppResult.success;
            }, (err) => {
                CloudExperienceHost.Telemetry.logEvent("flightDataRefreshFailed", core.GetJsonFromError(err));
                return CloudExperienceHost.AppResult.fail;
            });
        }

        notifyAutopilotProfile() {
            // This will publish a notification from the Autopilot service to let components like Bitlocker know
            // when OOBE has proceeded far enough to make decisions based on expected policy synchronization from AAD or MDM.
            // This must happen before any user credentials are stored on the device if Bitlocker is not deferring encryption
            // due to expected future policies that will override the defaults.
            CloudExperienceHost.Telemetry.logEvent("Autopilot_CloudContentHydrant_notifyAutopilotProfile_start");
            return EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.setAutopilotDeviceNotManagedAsync(0);
        }

        launchAsync() {
            return WinJS.Promise.join({ featureConfigResult: this.refreshFeatureConfigurations(), autopilotNotifyResult: this.notifyAutopilotProfile() }).then((results) => {
                return results.featureConfigResult;
            });
        }

    }

    return OobeCloudContentHydrant;
});