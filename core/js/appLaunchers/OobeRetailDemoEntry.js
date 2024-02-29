//
// Copyright (C) Microsoft. All rights reserved.
//
// This launcher has evolved and is now used to decide where to go next based on both Retail Demo and unattend state.
// Ideally, this class would have a different name, but at the time that the launcher had its functionality extended, a
// rename would have been too risky near the end of the product cycle (requires renaming files and touching manifests).
// Moving forward, we should consider a rename as part of any future work here.

define(() => {
    class OOBERetailDemoEntry {
        launchAsync(currentNode) {
            return new WinJS.Promise(function (completeDispatch /*, errorDispatch, progressDispatch */) {
                if (CloudExperienceHost.Storage.SharableData.getValue("retailDemoEnabled")) {
                    CloudExperienceHost.Storage.SharableData.removeValue("retailDemoEnabled");
                    completeDispatch(CloudExperienceHost.AppResult.action1);
                }
                else {
                    // Not a retail demo scenario. We next either go to the Account and Services sections, or skip over
                    // most of those and go straight to the Settings page, depending on unattend.
                    if (CloudExperienceHost.AccountAndServices.shouldSkipAccountAndServices()) {
                        completeDispatch(CloudExperienceHost.AppResult.action2);
                    }
                    else {
                        completeDispatch(CloudExperienceHost.AppResult.success);
                    }
                }
            });
        }
    }
    return OOBERetailDemoEntry;
});
