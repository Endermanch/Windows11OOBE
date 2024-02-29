//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    function getUserPreferredColors() {
        var userPreferredColors = {};
        userPreferredColors.controlDarkLinkRest = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.controlDarkLinkRest);
        userPreferredColors.controlDarkLinkHover = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.controlDarkLinkHover);
        userPreferredColors.controlDarkLinkPressed = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.controlDarkLinkPressed);
        userPreferredColors.controlDarkSelectHighlightSelectedHover = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.controlDarkSelectHighlightSelectedHover);
        userPreferredColors.controlDarkSelectHighlightSelected = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.controlDarkSelectHighlightSelected);
        userPreferredColors.controlDefaultDarkButtonBackgroundRest = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.controlDefaultDarkButtonBackgroundRest);
        userPreferredColors.controlDefaultDarkButtonBackgroundHover = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.controlDefaultDarkButtonBackgroundHover);
        userPreferredColors.saturatedBackground = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.saturatedBackground);
        userPreferredColors.controlDarkSelectPopupBackgroundSelected = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.controlDarkSelectPopupBackgroundSelected);
        userPreferredColors.saturatedInlineErrorText = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.saturatedInlineErrorText);
        userPreferredColors.saturatedSecondaryText = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.saturatedSecondaryText);
        userPreferredColors.saturatedSelectionBackground = CloudExperienceHost.Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.saturatedSelectionBackground);
        return JSON.stringify(userPreferredColors);
    }
    CloudExperienceHost.getUserPreferredColors = getUserPreferredColors;
    class InputSwitchButton {
    }
    CloudExperienceHost.InputSwitchButton = InputSwitchButton;
    class EaseOfAccessControl {
    }
    CloudExperienceHost.EaseOfAccessControl = EaseOfAccessControl;
    function shouldShowInputSwitchButton() {
        try {
            var inputSwitchControl = new CloudExperienceHostAPI.InputSwitchControl();
            InputSwitchButton.shouldShow = inputSwitchControl.shouldShowButton;
            InputSwitchButton.hasBeenChecked = true;
        }
        catch (e) {
            InputSwitchButton.shouldShow = false;
            InputSwitchButton.hasBeenChecked = true;
        }
        return InputSwitchButton.shouldShow;
    }
    CloudExperienceHost.shouldShowInputSwitchButton = shouldShowInputSwitchButton;
    function setShowInputSwitchButton() {
        return requireAsync(['legacy/appViewManager']).then((result) => {
            return result.legacy_appViewManager.setShowInputSwitchButton();
        });
    }
    CloudExperienceHost.setShowInputSwitchButton = setShowInputSwitchButton;
    function getBoundingClientRect() {
        return requireAsync(['legacy/appViewManager']).then((result) => {
            let clientRect = result.legacy_appViewManager.getBoundingClientRect();
            let resultRect = {
                height: clientRect.height,
                width: clientRect.width,
                x: clientRect.left,
                y: clientRect.top
            };
            return WinJS.Promise.as(resultRect);
        });
    }
    CloudExperienceHost.getBoundingClientRect = getBoundingClientRect;
    function getFrameViewBoundingRect() {
        return requireAsync(['legacy/appViewManager']).then((result) => {
            let clientRect = result.legacy_appViewManager.getFrameViewBoundingRect();
            let resultRect = null;
            if (clientRect) {
                resultRect = {
                    height: clientRect.height,
                    width: clientRect.width,
                    x: clientRect.left,
                    y: clientRect.top
                };
            }
            return WinJS.Promise.as(resultRect);
        });
    }
    CloudExperienceHost.getFrameViewBoundingRect = getFrameViewBoundingRect;
    function dimChrome() {
        return requireAsync(['legacy/appViewManager']).then((result) => {
            return result.legacy_appViewManager.dimChrome();
        });
    }
    CloudExperienceHost.dimChrome = dimChrome;
    function undimChrome() {
        return requireAsync(['legacy/appViewManager']).then((result) => {
            return result.legacy_appViewManager.undimChrome();
        });
    }
    CloudExperienceHost.undimChrome = undimChrome;
    function getChromeFooterOffset() {
        return requireAsync(['legacy/appViewManager']).then((result) => {
            return result.legacy_appViewManager.getChromeFooterOffset();
        });
    }
    CloudExperienceHost.getChromeFooterOffset = getChromeFooterOffset;
    function getOverrideLanguage() {
        return WinJS.Promise.wrap("");
    }
    CloudExperienceHost.getOverrideLanguage = getOverrideLanguage;
    function languageOverridden(newLanguage) {
        return requireAsync(['legacy/appViewManager']).then((result) => {
            return result.legacy_appViewManager.languageOverridden(newLanguage);
        });
    }
    CloudExperienceHost.languageOverridden = languageOverridden;
    function updateTransitionMessage(message) {
        return requireAsync(['legacy/appViewManager']).then((result) => {
            return result.legacy_appViewManager.updateTransitionMessage(message);
        });
    }
    CloudExperienceHost.updateTransitionMessage = updateTransitionMessage;
    function notifyPanelChange() {
        return requireAsync(['legacy/appViewManager']).then((result) => {
            return result.legacy_appViewManager.resetFooterFocus();
        });
    }
    CloudExperienceHost.notifyPanelChange = notifyPanelChange;
    function showInputSwitchFlyout(left, top, right, bottom) {
        return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
            var inputSwitchControl = new CloudExperienceHostAPI.InputSwitchControl();
            var rect = {
                height: bottom - top,
                width: right - left,
                x: left,
                y: top
            };
            inputSwitchControl.showFlyoutAsync(rect)
                .done(function () { completeDispatch(); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
        });
    }
    CloudExperienceHost.showInputSwitchFlyout = showInputSwitchFlyout;
    function showVolumeControlFlyout(left, top, right, bottom) { // Volume control flyout
        return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
            var volumeFlyoutControl = new CloudExperienceHostAPI.VolumeFlyoutControl();
            let relativeWidth;
            if (CloudExperienceHost.Globalization.Language.getReadingDirection() == "ltr") {
                relativeWidth = right - left;
            }
            else {
                relativeWidth = left;
            }
            var rect = {
                height: bottom - top,
                width: relativeWidth,
                x: left,
                y: top
            };
            volumeFlyoutControl.showFlyoutAsync(rect)
                .done(function () { completeDispatch(); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
        });
    }
    CloudExperienceHost.showVolumeControlFlyout = showVolumeControlFlyout;
    function shouldShowEaseOfAccessControl() {
        if (!EaseOfAccessControl.hasBeenChecked) {
            // CloudExperienceHostAPI.Accessibility.EaseOfAccessControl only exists on Desktop, so wrap it
            // with try/catch and treat all exceptions as "should not show"
            try {
                var easeOfAccessControl = new CloudExperienceHostAPI.Accessibility.EaseOfAccessControl();
                EaseOfAccessControl.shouldShow = easeOfAccessControl.shouldShow;
            }
            catch (e) {
                EaseOfAccessControl.shouldShow = false;
            }
            EaseOfAccessControl.hasBeenChecked = true;
        }
        return EaseOfAccessControl.shouldShow;
    }
    CloudExperienceHost.shouldShowEaseOfAccessControl = shouldShowEaseOfAccessControl;
    function showEaseOfAccessFlyout(boundingRectOfEOAButton) { // Ease of access flyout
        return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
            if (boundingRectOfEOAButton) {
                var easeOfAccessControl = new CloudExperienceHostAPI.Accessibility.EaseOfAccessControl();
                var rect = {
                    height: boundingRectOfEOAButton.bottom - boundingRectOfEOAButton.top,
                    width: boundingRectOfEOAButton.right - boundingRectOfEOAButton.left,
                    x: boundingRectOfEOAButton.left,
                    y: boundingRectOfEOAButton.top
                };
                easeOfAccessControl.show(rect);
                completeDispatch();
            }
            else {
                errorDispatch(new CloudExperienceHost.InvalidArgumentError("Missing bounding rectangle info"));
            }
        });
    }
    CloudExperienceHost.showEaseOfAccessFlyout = showEaseOfAccessFlyout;
    function getAllowedIdentityProviders() {
        var allowedProviders = CloudExperienceHostAPI.SignInIdentities.allowedProviders;
        var listOfallowedproviders = [];
        var signInProvidersflag = CloudExperienceHostAPI.SignInIdentityProviders;
        if (allowedProviders & signInProvidersflag.local) {
            listOfallowedproviders.push(CloudExperienceHost.SignInIdentityProviders.Local);
        }
        if (allowedProviders & signInProvidersflag.msa) {
            listOfallowedproviders.push(CloudExperienceHost.SignInIdentityProviders.MSA);
        }
        if (allowedProviders & signInProvidersflag.aad) {
            listOfallowedproviders.push(CloudExperienceHost.SignInIdentityProviders.AAD);
        }
        return listOfallowedproviders;
    }
    CloudExperienceHost.getAllowedIdentityProviders = getAllowedIdentityProviders;
    function setRebootForOOBE(resumeCXHId) {
        // Set the value to ask OOBEReboot web app to reboot
        CloudExperienceHost.Storage.SharableData.addValue("shouldRebootForOOBE", true);
        // If exists, set the CXHID to resume from after a reboot.
        if (resumeCXHId) {
            CloudExperienceHost.Storage.SharableData.addValue("resumeCXHId", resumeCXHId);
        }
    }
    CloudExperienceHost.setRebootForOOBE = setRebootForOOBE;
    function setDisableBackNavigation(disableBackNavigation) {
        require(['legacy/navigationManager'], (navManager) => {
            navManager.setDisableBackNavigation(disableBackNavigation);
        });
    }
    CloudExperienceHost.setDisableBackNavigation = setDisableBackNavigation;
    function setShowBackButton(backNavigation) {
        require(['legacy/navigationManager'], (navManager) => {
            navManager.setPanelBackNavigationAvailability(backNavigation);
        });
    }
    CloudExperienceHost.setShowBackButton = setShowBackButton;
    function setBackNavigationCheckpoint() {
        require(['legacy/navigationManager'], (navManager) => {
            navManager.setBackNavigationCheckpoint();
        });
    }
    CloudExperienceHost.setBackNavigationCheckpoint = setBackNavigationCheckpoint;
    function setShowCloseButton(closeButton) {
        require(['legacy/navigationManager'], (navManager) => {
            navManager.setExitCxhAvailability(closeButton);
        });
    }
    CloudExperienceHost.setShowCloseButton = setShowCloseButton;
    function promptForKnownCommandsAsync(promptVoice, tagsJson) {
        var constraints = [];
        var tags = JSON.parse(tagsJson);
        for (var i = 0; i < tags.length; i++) {
            constraints.push(CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands[tags[i]]); // this synxtax retrieves the property under SpeechRecognitionKnownCommands
        }
        return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
            CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(promptVoice, constraints).done(function (result) {
                var tag = null;
                if (result) {
                    tag = result.constraint.tag;
                }
                completeDispatch(JSON.stringify({ "tag": tag }));
            });
        });
    }
    CloudExperienceHost.promptForKnownCommandsAsync = promptForKnownCommandsAsync;
    function getFailedNode() {
        return new WinJS.Promise(function (completeDispatch /*, errorDispatch, progressDispatch*/) {
            require(['legacy/navigationManager'], (navManager) => {
                let result = navManager.getFailedNode();
                completeDispatch(result);
            });
        });
    }
    CloudExperienceHost.getFailedNode = getFailedNode;
    function showFolderPicker() { // Where would a folder picker be used?
        var folderPicker = new Windows.Storage.Pickers.FolderPicker();
        folderPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.computerFolder;
        folderPicker.fileTypeFilter.replaceAll(["*"]);
        return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
            folderPicker.pickSingleFolderAsync().then(function (folder) {
                if (folder && folder.path) {
                    completeDispatch(folder.path);
                }
                else {
                    errorDispatch(new Error("no folder has been chosen."));
                }
            }).done(null, function (error) {
                errorDispatch(error);
            });
        });
    }
    CloudExperienceHost.showFolderPicker = showFolderPicker;
    class IUserManager {
        constructor() {
            if (!IUserManager._allowInstantiation) {
                throw new Error("Error: Instantiation failed: Use getInstance() instead of new.");
            }
            IUserManager._userObj = null;
            IUserManager._userId = null;
        }
        static getInstance() {
            if (IUserManager._instance === null) {
                IUserManager._userObj = null;
                IUserManager._userId = null;
                IUserManager._signInIdentityProvider = CloudExperienceHostAPI.SignInIdentityProviders.none;
                IUserManager._allowInstantiation = true;
                IUserManager._instance = new IUserManager();
                IUserManager._allowInstantiation = false;
            }
            return IUserManager._instance;
        }
        static resetInstance() {
            if (IUserManager._instance !== null) {
                IUserManager._instance = null;
            }
        }
        setIUser(userObj) {
            IUserManager._userObj = userObj;
            if (userObj) {
                IUserManager._userId = userObj.nonRoamableId;
            }
        }
        getIUser() {
            return IUserManager._userObj;
        }
        setIUserFromId(userId) {
            IUserManager._userId = userId;
            var userObj = Windows.System.User.getFromId(userId);
            IUserManager.getInstance().setIUser(userObj);
        }
        getUserId() {
            return IUserManager._userId;
        }
        setSignInIdentityProvider(signInIdentityProvider) {
            IUserManager._signInIdentityProvider = signInIdentityProvider;
        }
        getSignInIdentityProvider() {
            return IUserManager._signInIdentityProvider;
        }
    }
    IUserManager._userObj = null;
    IUserManager._userId = null;
    IUserManager._signInIdentityProvider = CloudExperienceHostAPI.SignInIdentityProviders.none;
    IUserManager._instance = null;
    CloudExperienceHost.IUserManager = IUserManager;
    function setIUserFromId(userId) {
        IUserManager.getInstance().setIUserFromId(userId);
    }
    CloudExperienceHost.setIUserFromId = setIUserFromId;
    function getIUser() {
        return IUserManager.getInstance().getIUser();
    }
    CloudExperienceHost.getIUser = getIUser;
    function getUserId() {
        return IUserManager.getInstance().getUserId();
    }
    CloudExperienceHost.getUserId = getUserId;
})(CloudExperienceHost || (CloudExperienceHost = {}));
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var UserManager;
    (function (UserManager) {
        function setIUserFromId(userId) {
            CloudExperienceHost.IUserManager.getInstance().setIUserFromId(userId);
        }
        UserManager.setIUserFromId = setIUserFromId;
        function getIUser() {
            return CloudExperienceHost.IUserManager.getInstance().getIUser();
        }
        UserManager.getIUser = getIUser;
        function getUserId() {
            return CloudExperienceHost.IUserManager.getInstance().getUserId();
        }
        UserManager.getUserId = getUserId;
        function setSignInIdentityProvider(signInIdentityProvider) {
            CloudExperienceHost.IUserManager.getInstance().setSignInIdentityProvider(signInIdentityProvider);
        }
        UserManager.setSignInIdentityProvider = setSignInIdentityProvider;
    })(UserManager = CloudExperienceHost.UserManager || (CloudExperienceHost.UserManager = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var CredUI;
    (function (CredUI) {
        // Add transparent option to CredUICoordinator if using InlineFluentTheme and option is not already set.
        // Return true if flag is toggled on by this call, otherwise return false.
        function setTransparencyOptionOnCredUICoordinator() {
            // WindowsUdk API may not exist
            try {
                let coordinator = WindowsUdk.Security.Credentials.UI.CredUICoordinator.getForCurrentView();
                if (coordinator &&
                    (coordinator.styleOptions & WindowsUdk.Security.Credentials.UI.CredUICoordinatorStyleOptions.inlineFluentTheme) &&
                    !(coordinator.styleOptions & WindowsUdk.Security.Credentials.UI.CredUICoordinatorStyleOptions.transparent)) {
                    coordinator.styleOptions = (coordinator.styleOptions | WindowsUdk.Security.Credentials.UI.CredUICoordinatorStyleOptions.transparent);
                    return true;
                }
            }
            catch (e) {
                CloudExperienceHost.Telemetry.logEvent("setTransparencyOptionOnCredUICoordinator_exception", CloudExperienceHost.GetJsonFromError(e));
            }
            return false;
        }
        CredUI.setTransparencyOptionOnCredUICoordinator = setTransparencyOptionOnCredUICoordinator;
        function removeTransparencyOptionOnCredUICoordinator() {
            // WindowsUdk API may not exist
            try {
                let coordinator = WindowsUdk.Security.Credentials.UI.CredUICoordinator.getForCurrentView();
                if (coordinator) {
                    coordinator.styleOptions = (coordinator.styleOptions & ~WindowsUdk.Security.Credentials.UI.CredUICoordinatorStyleOptions.transparent);
                }
            }
            catch (e) {
                CloudExperienceHost.Telemetry.logEvent("removeTransparencyOptionOnCredUICoordinator_exception", CloudExperienceHost.GetJsonFromError(e));
            }
        }
        CredUI.removeTransparencyOptionOnCredUICoordinator = removeTransparencyOptionOnCredUICoordinator;
    })(CredUI = CloudExperienceHost.CredUI || (CloudExperienceHost.CredUI = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var AppFrameInternal;
    (function (AppFrameInternal) {
        function showView() {
            return requireAsync(['legacy/appViewManager']).then((result) => {
                return result.legacy_appViewManager.showView();
            });
        }
        AppFrameInternal.showView = showView;
        function showProgress() {
            return requireAsync(['legacy/appViewManager']).then((result) => {
                return result.legacy_appViewManager.showProgress();
            });
        }
        AppFrameInternal.showProgress = showProgress;
        function setChromeDimBasedOnFocus(enable) {
            return requireAsync(['legacy/appViewManager']).then((result) => {
                return result.legacy_appViewManager.setChromeDimBasedOnFocus(enable);
            });
        }
        AppFrameInternal.setChromeDimBasedOnFocus = setChromeDimBasedOnFocus;
    })(AppFrameInternal = CloudExperienceHost.AppFrameInternal || (CloudExperienceHost.AppFrameInternal = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=app.js.map
