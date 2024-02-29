// Copyright (C) Microsoft. All rights reserved.
define(() => {
    class OobeCleanupEnduserSession {
        launchAsync() {
            return new WinJS.Promise(function (completeDispatch /*, errorDispatch, progressDispatch */) {
                CloudExperienceHostAPI.UtilStaticsCore.cleanupEnduserSessionAsync().then(() => {
                    CloudExperienceHost.Telemetry.logEvent("CleanupEnduserSessionSucceeded");
                    completeDispatch(CloudExperienceHost.AppResult.success);
                }, (err) => {
                    CloudExperienceHost.Telemetry.logEvent("CleanupEnduserSessionFailed", CloudExperienceHost.GetJsonFromError(err));
                    completeDispatch(CloudExperienceHost.AppResult.fail);
                });
            });
        }
    }
    return OobeCleanupEnduserSession;
});