//
// Copyright (C) Microsoft. All rights reserved.
//

define(() => {
    class OobePrepEndUserSession {
        launchAsync() {
            return new WinJS.Promise(function (completeDispatch /*, errorDispatch, progressDispatch */) {
                CloudExperienceHostAPI.UtilStaticsCore.prepEnduserSessionAsync().then(() => {
                    CloudExperienceHost.Telemetry.logEvent("StartEnduserOobeSessionTransition");
                    completeDispatch(CloudExperienceHost.AppResult.success);
                }, (err) => {
                    CloudExperienceHost.Telemetry.logEvent("StartEnduserOobeSessionTransitionFailed", CloudExperienceHost.GetJsonFromError(err));
                    completeDispatch(CloudExperienceHost.AppResult.fail);
                });
            });
        }
    }
    return OobePrepEndUserSession;
});
