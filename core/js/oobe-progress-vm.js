//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/appViewManager'], (ko, appViewManager) => {
    class OobeProgressViewModel {
        constructor(params) {
            let res = new Windows.ApplicationModel.Resources.ResourceLoader("resources");
            this.progressText = params.progressText ? params.progressText : ko.observable(res.getString("Progress"));
            appViewManager.subscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.Language)
        }

        dispose() {
            appViewManager.unsubscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.Language)
        }

        update(updateType, completeDispatch, errorDispatch, updateTag) {
            switch (updateType) {
                case CloudExperienceHost.FrameViewModelUpdateType.Language:
                    this.languageOverridden(updateTag);
                    completeDispatch();
                    break;
            }
        }

        languageOverridden(updateTag) {
            let result = CloudExperienceHost.StringResources.makeResourceObject("resources", null /* keyList */, updateTag);
            let res = JSON.parse(result);
            this.progressText(res.Progress);
        }
    }
    return OobeProgressViewModel;
});
