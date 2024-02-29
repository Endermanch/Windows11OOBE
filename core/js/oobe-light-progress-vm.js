//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/navigationManager', 'legacy/appViewManager'], (ko, navManager, appViewManager) => {
    class OobeLightProgressViewModel {
        constructor(params) {
            let res = new Windows.ApplicationModel.Resources.ResourceLoader("resources");

            this.progressText = params.progressText ? params.progressText : ko.observable(res.getString("Progress"));
            this.progressSubtext = params.progressSubtext ? params.progressSubtext : ko.observable("");

            appViewManager.subscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.Language);
            appViewManager.subscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.UpdateTransitionMessage);
            navManager.subscribeForNavigationEvent(this, CloudExperienceHost.NavigationEvent.LastWebAppFinished);

            let progressTextEle = document.getElementById("_progressText");
            if (progressTextEle && !params.progressText) {
                progressTextEle.style.opacity = 0;
            }

            let progressSubtextEle = document.getElementById("_progressSubtext");
            if (progressSubtextEle && !params.progressSubtext) {
                progressSubtextEle.style.opacity = 0;
            }
        }

        dispose() {
            appViewManager.unsubscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.Language);
        }

        update(updateType, completeDispatch, errorDispatch, updateTag) {
            switch (updateType) {
                case CloudExperienceHost.FrameViewModelUpdateType.Language:
                    this.languageOverridden(updateTag);
                    completeDispatch();
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.UpdateTransitionMessage:
                    this.updateTransitionMessage(updateTag);
                    completeDispatch();
                    break;
            }
        }

        languageOverridden(updateTag) {
            let result = CloudExperienceHost.StringResources.makeResourceObject("resources", null /* keyList */, updateTag);
            let res = JSON.parse(result);
            this.progressText(res.Progress);
        }

        updateTransitionMessage(updateTag) {
            let progressTextEle = document.getElementById("_progressText");
            progressTextEle.style.opacity = 1;
            progressTextEle.innerHTML = updateTag;
        }

        onNavigationEvent(event, payload) {
            if (event === CloudExperienceHost.NavigationEvent.LastWebAppFinished) {
                let progressTextEle = document.getElementById("_progressText");
                progressTextEle.style.opacity = 0;

                // Change progress ring context and wait for a navmesh supplied amount of time (default 15 seconds) before ending EndUserSession OOBE and dropping to desktop
                if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeInEnduserSession")) {
                    let progressTextTimeout = 15000;
                    let timeoutCurr = CloudExperienceHost.getNavMesh().getShowProgressTextAtEndTimeout();
                    if (timeoutCurr != null) {
                        progressTextTimeout = timeoutCurr;
                    }
                    WinJS.Promise.timeout(progressTextTimeout).then(function () {
                        let res = new Windows.ApplicationModel.Resources.ResourceLoader("resources");
                        progressTextEle.style.opacity = 1;
                        progressTextEle.innerHTML = res.getString("EndOfWebappsProgress");
                    });
                }
                else {
                    // Change Progress ring context after 15 seconds
                    WinJS.Promise.timeout(15000).then(function () {
                        let res = new Windows.ApplicationModel.Resources.ResourceLoader("resources");
                        progressTextEle.style.opacity = 1;
                        progressTextEle.innerHTML = res.getString("EndOfWebappsProgress");
                    });
                }
            }
        }
    }
    return OobeLightProgressViewModel;
});
