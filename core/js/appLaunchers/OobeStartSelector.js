//
// Copyright (C) Microsoft. All rights reserved.
//

define(() => {
    class OOBEStartSelector {
        launchAsync() {
            CloudExperienceHost.Storage.SharableData.addValue("hasProvisionedThisSession", false);
            return new WinJS.Promise(function (completeDispatch /*, errorDispatch, progressDispatch */) {
                let result = CloudExperienceHost.AppResult.success;
                let oobeResumeEnabled = CloudExperienceHost.Storage.SharableData.getValue("OOBEResumeEnabled");
                let checkpointsEnabled  = CloudExperienceHost.getNavMesh().checkpointsEnabled();
                if (oobeResumeEnabled || checkpointsEnabled) {
                    let resumeCXHId = CloudExperienceHost.Storage.SharableData.getValue("resumeCXHId");
                    if (resumeCXHId) {
                        result = resumeCXHId;
                        if (!checkpointsEnabled)
                        {
                            // Only delete the resumeCXHId if checkpoints are disabled
                            CloudExperienceHost.Storage.SharableData.removeValue("resumeCXHId");
                        }
                    }
                }
                completeDispatch(result);
            });
        }
    }
    return OOBEStartSelector;
});