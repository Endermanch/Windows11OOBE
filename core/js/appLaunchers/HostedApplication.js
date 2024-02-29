//
// Copyright (C) Microsoft. All rights reserved.
//

define(['legacy/appViewManager', 'legacy/core'], (appViewManager, core) => {
    class HostedApplication {
        static _scaleRectCoordinates(rect) {
            let scaleFactor = 1;
            try {
                scaleFactor = Windows.Graphics.Display.DisplayInformation.getForCurrentView().rawPixelsPerViewPixel;   // System scale
            }
            catch (error) {
                scaleFactor = 1;
                CloudExperienceHost.Telemetry.logEvent("getSystemScaleFailure", core.GetJsonFromError(error));
            }

            let zoomFactor = window.devicePixelRatio / scaleFactor;    // zoom scale from ctrl+/-
            let scaledRect = {
                height: rect.height * zoomFactor,
                width: rect.width * zoomFactor,
                x: rect.left * zoomFactor,
                y: rect.top * zoomFactor
            };
            return scaledRect;
        }

        static _onResize(param) {
            try {
                let newClientRect = appViewManager.getBoundingClientRect();
                let newScaledRect = HostedApplication._scaleRectCoordinates(newClientRect);
                let hostedApplicationManager = CloudExperienceHostAPI.HostedApplicationCore.getForCurrentView();
                let currentLocation = hostedApplicationManager.windowLocation;
                if (newScaledRect !== currentLocation) {
                    hostedApplicationManager.windowLocation = newScaledRect;
                }
            }
            catch (error) {
                CloudExperienceHost.Telemetry.logEvent("showHostedAppAsyncNodePositionUpdateFailure", core.GetJsonFromError(error));
            }
        }

        launchAsyncWithNavigationCompletedCallback(currentNode, args, callback) {
            if (currentNode && currentNode.appUserModelId) {
                let clientRect = appViewManager.getBoundingClientRect();
                let scaledRect = HostedApplication._scaleRectCoordinates(clientRect);
                let showAppPromise = CloudExperienceHostAPI.HostedApplicationCore.showHostedAppAsync(currentNode.appUserModelId, currentNode.hostedApplicationProtocol, args, scaledRect);
                showAppPromise = showAppPromise.then(function (hostedApplicationResult) {
                    window.removeEventListener("resize", HostedApplication._onResize);
                    return hostedApplicationResult.exitResult;
                }, function (error) {
                    window.removeEventListener("resize", HostedApplication._onResize);
                    CloudExperienceHost.Telemetry.logEvent("showHostedAppAsyncFailure", core.GetJsonFromError(error));
                    return CloudExperienceHost.AppResult.fail;
                });

                window.addEventListener("resize", HostedApplication._onResize);
                appViewManager.dimChrome();
                let navigationCompletedEventArgs = new Object(); // Need to implement INavigationCompletedEventArgs
                navigationCompletedEventArgs.isSuccess = true; // boolean
                navigationCompletedEventArgs.webErrorStatus = Windows.Web.WebErrorStatus.unknown; // Windows.Web.WebErrorStatus
                navigationCompletedEventArgs.uri = "hostedapplication://" + currentNode.appUserModelId; // string
                callback(navigationCompletedEventArgs);
                return showAppPromise;
            }
            else {
                CloudExperienceHost.Telemetry.logEvent("showHostedAppAsyncNodeMisconfiguration", JSON.stringify(currentNode));
                return CloudExperienceHost.AppResult.fail;
            }
        }
    }
    return HostedApplication;
});
