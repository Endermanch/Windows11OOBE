//
// Copyright (C) Microsoft. All rights reserved.
//

define(() => {
    class OOBEReboot {
        launchAsync(currentNode) {
            return new WinJS.Promise(function (completeDispatch /*, errorDispatch, progressDispatch */) {
                // The reboot node must have a successID. If it doesn't, return error right away to show the error page
                if (!currentNode.successID) {
                    CloudExperienceHost.Telemetry.logEvent("SuccessIdNotFound");
                    completeDispatch(CloudExperienceHost.AppResult.error);
                    return;
                }

                let shouldReboot = CloudExperienceHost.Storage.SharableData.getValue("shouldRebootForOOBE");
                if (shouldReboot) {
                    CloudExperienceHost.Storage.SharableData.addValue("OOBEResumeEnabled", true);
                    let resumeCXHId = CloudExperienceHost.Storage.SharableData.getValue("resumeCXHId");
                    // Default to resume from the next node of the reboot node
                    if (!resumeCXHId) {
                        CloudExperienceHost.Storage.SharableData.addValue("resumeCXHId", currentNode.successID);
                    }

                    // Clear any "connected" credentials from the autologon stash as they will be invalidated after the reboot.
                    CloudExperienceHostAPI.UtilStaticsCore.clearAutoLogonCredentialsAsync(true /* onlyClearConnectedCredentials */).then(() => {
                        CloudExperienceHost.Telemetry.logEvent("clearAutoLogonCredentialsAsyncSucceeded");
                    }, (err) => {
                        CloudExperienceHost.Telemetry.logEvent("clearAutoLogonCredentialsAsyncFailed", CloudExperienceHost.GetJsonFromError(err));
                    }).then(() => {
                        // Clearing the credentials is best-effort. Always try to restart the device.
                        CloudExperienceHost.Telemetry.oobeHealthEvent(CloudExperienceHostAPI.HealthEvent.expectedMachineNoErrorReboot, 0 /* Unused Result Parameter */);
                        CloudExperienceHost.Telemetry.AppTelemetry.getInstance().expectedReboot();
                        CloudExperienceHostAPI.UtilStaticsCore.restartAsync().done(function () { }, function (err) { completeDispatch(CloudExperienceHost.AppResult.fail); });
                    });
                }
                else {
                    completeDispatch(CloudExperienceHost.AppResult.success);
                }
            });
        }
    }
    return OOBEReboot;
});
