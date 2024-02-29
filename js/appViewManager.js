//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    class AppViewManager {
        constructor() {
            this.chromeDimBasedOnFocus = false;
            this.allowChangeDisplayMode = false;
            this.observers = {};
        }
        showView() {
            return this.notifyObserver(CloudExperienceHost.FrameViewModelUpdateType.View);
        }
        showProgress() {
            return this.notifyObserver(CloudExperienceHost.FrameViewModelUpdateType.Progress);
        }
        showGraphicAnimation(fileName) {
            return this.notifyObserver(CloudExperienceHost.FrameViewModelUpdateType.GraphicAnimation, fileName);
        }
        createWebView() {
            if (!this.webViewCtrl) {
                this.webViewCtrl = this.frameViewModel.createWebView();
            }
            else {
                this.frameViewModel.setWebView(this.webViewCtrl);
            }
            return this.webViewCtrl;
        }
        getView() {
            return this.frameViewModel.getView();
        }
        cleanView() {
            WinJS.Utilities.empty(this.getView());
        }
        loadCss() {
            let cssList = CloudExperienceHost.GetCssList(".", CloudExperienceHost.getContext()); // default.html is at root
            for (let i = 0; i < cssList.length; i++) {
                CloudExperienceHost.AddCssToHead(document.head, cssList[i]);
            }
        }
        getBoundingClientRect() {
            return this.frameViewModel.getContentViewBoundingRect();
        }
        getFrameViewBoundingRect() {
            if (this.frameViewModel.getFrameViewBoundingRect) {
                return this.frameViewModel.getFrameViewBoundingRect();
            }
            return null;
        }
        getChromeFooterOffset() {
            return this.frameViewModel.getChromeFooterOffset();
        }
        setChromeDimBasedOnFocus(enable) {
            this.chromeDimBasedOnFocus = enable;
        }
        isChromeDimBasedOnFocus() {
            return this.chromeDimBasedOnFocus;
        }
        dimChrome() {
            return this.notifyObserver(CloudExperienceHost.FrameViewModelUpdateType.Dimmed);
        }
        undimChrome() {
            return this.notifyObserver(CloudExperienceHost.FrameViewModelUpdateType.Undimmed);
        }
        languageOverridden(overrideLanguage) {
            return this.notifyObserversOfUpdateType(CloudExperienceHost.FrameViewModelUpdateType.Language, overrideLanguage);
        }
        updateFrameDirection() {
            return this.notifyObserversOfUpdateType(CloudExperienceHost.FrameViewModelUpdateType.UpdateDirection);
        }
        updateTransitionMessage(message) {
            return this.notifyObserversOfUpdateType(CloudExperienceHost.FrameViewModelUpdateType.UpdateTransitionMessage, message);
        }
        resetFooterFocus() {
            return this.notifyObserversOfUpdateType(CloudExperienceHost.FrameViewModelUpdateType.ResetFooterFocus);
        }
        setShowInputSwitchButton() {
            return this.notifyObserversOfUpdateType(CloudExperienceHost.FrameViewModelUpdateType.InputSwitchButton);
        }
        setAllowChangeDisplayMode(allowChange) {
            this.allowChangeDisplayMode = allowChange;
        }
        setDisplayModeFullScreen() {
            if (this.allowChangeDisplayMode) {
                return this.notifyObserver(CloudExperienceHost.FrameViewModelUpdateType.SetDisplayModeFullScreen);
            }
            else {
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("Requested to change display mode when not allowed");
                return new WinJS.Promise(() => { });
            }
        }
        setBackgroundImage(appDataUri) {
            return this.notifyObserver(CloudExperienceHost.FrameViewModelUpdateType.SetBackgroundImage, appDataUri);
        }
        unSubscrible() {
            this.frameViewModel = null;
        }
        unsubscribeForUpdateType(observer, updateType) {
            if (!this.observers[updateType]) {
                return false;
            }
            let obsIndex = this.observers[updateType].indexOf(observer);
            if (obsIndex == -1) {
                return false;
            }
            else {
                // Observer exists in the Array remove it
                this.observers[updateType].splice(obsIndex, 1);
                return true;
            }
        }
        subscribe(frameViewModel) {
            if (!this.frameViewModel) {
                this.frameViewModel = frameViewModel;
                return true;
            }
            else if (this.frameViewModel == frameViewModel) {
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("Subscribing frame is already subscribed", JSON.stringify(this.frameViewModel));
                return false;
            }
            else {
                this.frameViewModel = frameViewModel;
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("Subscribe a different frame", JSON.stringify(this.frameViewModel), JSON.stringify(frameViewModel));
                return true;
            }
        }
        subscribeForUpdateType(observer, updateType) {
            if (!this.observers[updateType]) {
                this.observers[updateType] = [];
                this.observers[updateType].push(observer);
                return true;
            }
            else if (this.observers[updateType].indexOf(observer) == -1) {
                this.observers[updateType].push(observer);
                return true;
            }
            else {
                // Observer already exists in the Array
                return false;
            }
        }
        notifyObserver(updateType, updateTag) {
            return new WinJS.Promise((completeDispatch, errorDispatch) => {
                this.frameViewModel.update(updateType, completeDispatch, errorDispatch, updateTag);
            });
        }
        notifyObserversOfUpdateType(updateType, updateTag) {
            let updatePromise = new WinJS.Promise((c) => c());
            if (this.observers && this.observers[updateType]) {
                for (let observer of this.observers[updateType]) {
                    updatePromise = WinJS.Promise.join(updatePromise, new WinJS.Promise((completeDispatch, errorDispatch) => {
                        observer.update(updateType, completeDispatch, errorDispatch, updateTag);
                    }));
                }
            }
            return updatePromise;
        }
    }
    CloudExperienceHost.AppViewManager = AppViewManager;
})(CloudExperienceHost || (CloudExperienceHost = {}));
if ((typeof define === "function") && define.amd) {
    define(function () {
        return new CloudExperienceHost.AppViewManager();
    });
}
//# sourceMappingURL=appViewManager.js.map