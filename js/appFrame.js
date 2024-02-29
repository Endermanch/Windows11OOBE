//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var AppFrame;
    (function (AppFrame) {
        function showGraphicAnimation(fileName) {
            return requireAsync(['legacy/appViewManager']).then((result) => {
                return result.legacy_appViewManager.showGraphicAnimation(fileName);
            });
        }
        AppFrame.showGraphicAnimation = showGraphicAnimation;
        function updateFrameDirection() {
            return requireAsync(['legacy/appViewManager']).then((result) => {
                return result.legacy_appViewManager.updateFrameDirection();
            });
        }
        AppFrame.updateFrameDirection = updateFrameDirection;
        function setDisplayModeFullScreen() {
            return requireAsync(['legacy/appViewManager']).then((result) => {
                return result.legacy_appViewManager.setDisplayModeFullScreen();
            });
        }
        AppFrame.setDisplayModeFullScreen = setDisplayModeFullScreen;
        function setBackgroundImage(appDataUri) {
            // We intentionally do not support changing the background image when OOBE may transition to enduser session.
            // If we ever need to (partially) re-enable this functionality, we need to update the conditional statement below.
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeSetBackgroundImage") && !CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeInEnduserSession")) {
                return requireAsync(['legacy/appViewManager']).then((result) => {
                    return result.legacy_appViewManager.setBackgroundImage(appDataUri);
                });
            }
        }
        AppFrame.setBackgroundImage = setBackgroundImage;
    })(AppFrame = CloudExperienceHost.AppFrame || (CloudExperienceHost.AppFrame = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=appFrame.js.map