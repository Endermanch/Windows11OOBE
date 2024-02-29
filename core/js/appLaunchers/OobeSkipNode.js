//
// Copyright (C) Microsoft. All rights reserved.
//

define(() => {
    class OobeSkipNode {
        launchAsync() {
            return WinJS.Promise.as(CloudExperienceHost.AppResult.success);
        }
    }
    return OobeSkipNode;
});