//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode, JS2055.DoNotReferenceBannedTerms</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    class AppManager {
        constructor() {
            this._appView = null;
            this._description = null;
            this._correlationId = null;
            this._targetedContentId = null;
            this._targetedContentPath = null;
            this._launchSurface = null;
            this._windowsFlightData = null;
            this._bridge = null;
            this._navigator = null;
            this._currentNode = null;
            this._pendingNode = null;
            this._hasNotifiedFirstVisible = false;
            this._processingWebAppTerminationMessage = false;
            this._ticketRequestId = null;
            this._resultsOperation = null;
            this._msaUIHandler = null;
            this._visibilityTimer = null;
            this._showProgressWhenPageIsBusyTimer = null;
            this._appResult = CloudExperienceHost.AppResult.fail;
            this._machineModel = null;
            this._manufacturer = null;
            this._platform = null;
            this._windowsProductId = "0"; // valid default value meaning non-specified product
            this._edition = null;
            this._discoveryNavMesh = null;
            this._scenario = null;
            this._failFromCxh = "CXHInternalFail";
            this._readyToNavigate = false;
            this._cxhReadyToClose = false;
            this._errorAppFailedNavigationAttemptsCount = 0;
            this._errorAppFailedNavigationMaxAttemptsAllowed = 5;
            this._narratorInstruction = null;
            this._endIntroVideoTimer = null;
            WinJS.Namespace.define("CloudExperienceHost", {
                getVersion: this._getVersion.bind(this),
                getContext: this._getContext.bind(this),
                getCurrentNode: function () { return this._currentNode; }.bind(this),
                fail: function () {
                    this._appResult = CloudExperienceHost.AppResult.fail;
                    this._close();
                }.bind(this),
                cancel: function () {
                    this._appResult = CloudExperienceHost.AppResult.cancel;
                    this._close();
                }.bind(this),
                getNavMesh: this.getDiscoveryNavMesh.bind(this),
                getNavManager: this.getNavManager.bind(this),
                getWindowsFlightDataAsync: this._getWindowsFlightDataAsync.bind(this)
            });
        }
        initialize(args) {
            // Add the UDK package to the wwahost.exe process package graph
            // This is best-effort and depends on an object that may not exist for all editions with CXH, so wrap it in a try-catch
            try {
                CloudExperienceHostAPI.AppExtensionsManager.addUdkPackageToProcessPackageGraph();
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("AddUdkPackageToProcessPackageGraphSucceeded");
            }
            catch (ex) {
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("AddUdkPackageToProcessPackageGraphFailed", CloudExperienceHost.GetJsonFromError(ex));
            }
            // Set up listener for network status changes
            Windows.Networking.Connectivity.NetworkInformation.onnetworkstatuschanged = this._onNetworkStatusChanged.bind(this);
            this._machineModel = CloudExperienceHost.Environment.getMachineModel();
            this._manufacturer = CloudExperienceHost.Environment.getManufacturer();
            this._platform = CloudExperienceHost.Environment.getPlatform();
            this._windowsProductId = CloudExperienceHost.Environment.getWindowsProductId();
            this._edition = CloudExperienceHost.Environment.getEdition();
            this._setScenario(args);
            this._setDescription(this._scenario);
            let validReboot = CloudExperienceHost.Storage.SharableData.getValue("shouldRebootForOOBE");
            if (validReboot) {
                // If the resume was from a valid reboot request, it's safe to reset it
                CloudExperienceHost.Storage.SharableData.removeValue("shouldRebootForOOBE");
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("AppResuming", CloudExperienceHost.Storage.SharableData.getValue("resumeCXHId"));
            }
            else {
                // Make sure there are no persisting resume-to nodes unless it's a valid reboot and resume case
                CloudExperienceHost.Storage.SharableData.addValue("OOBEResumeEnabled", false);
            }
            let navMeshPromise = CloudExperienceHost.Discovery.getNavMesh(this._description).then((navMesh) => {
                this._discoveryNavMesh = navMesh;
                // Do not play intro video for reboots orchestrated by the running scenario
                if (!validReboot) {
                    let videoSrc = navMesh.getIntroVideoPath();
                    if (videoSrc !== "") {
                        this._playIntroVideo(videoSrc);
                    }
                }
                if (navMesh.getInclusive() != 0) {
                    let speechDisabled = navMesh.getSpeechDisabled();
                    // Catch errors but fail silently (i.e., continue with no speech capabilities).
                    return AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Speech.SpeechRecognitionController").enableAsync(CloudExperienceHost.Cortana.isCortanaSupported() && !speechDisabled).then(() => { }, (error) => { });
                }
            });
            let flightDataPromise = this._getWindowsFlightDataAsync();
            return WinJS.Promise.join({ navMeshPromise: navMeshPromise, flightDataPromise: flightDataPromise });
        }
        setAppViewManager(view) {
            this._appView = view;
        }
        setNavManager(navManager) {
            this._navManager = navManager;
        }
        getNavManager() {
            return this._navManager;
        }
        static getGlobalBridgeInstance() {
            return this._globalBridgeInstance;
        }
        getDiscoveryNavMesh() {
            return this._discoveryNavMesh;
        }
        start(args) {
            this._start(false);
        }
        resume(args) {
            this._start(true);
        }
        checkpoint() {
            // This application is about to be suspended. Save any state
            // that needs to persist across suspensions here.
        }
        restart(scenario) {
            if (scenario) {
                this._scenario = scenario;
                this._setDescription(this._scenario);
                CloudExperienceHost.Discovery.getNavMesh(this._description).then(function (navMesh) {
                    this._discoveryNavMesh = navMesh;
                    this._navigate();
                }.bind(this));
            }
            else {
                this._navigate();
            }
        }
        _onNetworkStatusChanged(eventArgs) {
            let connectionProfile = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();
            let connectivityLevel = connectionProfile ? connectionProfile.getNetworkConnectivityLevel() : -1; // Use -1 to indicate null/undefined connectionProfile
            /* No check for InternetAccess because if we were previously in constrainedInternetAccess,
             * we assume that user resolved the captive portal and "CaptivePortalConnect" breadcrumb still holds true.
             * We are ignoring the case of user connecting Ethernet cable after attempting to connect to captive portal network, as this is unlikely */
            if (connectivityLevel == Windows.Networking.Connectivity.NetworkConnectivityLevel.constrainedInternetAccess) {
                // Add volatile CaptivePortalConnect in VolatileSharableData if connectivity level is 'constrained Internet access'
                CloudExperienceHost.Storage.VolatileSharableData.addItem("NetworkingValues", "CaptivePortalConnect", true);
            }
            else if (connectivityLevel != Windows.Networking.Connectivity.NetworkConnectivityLevel.internetAccess) {
                // Delete volatile CaptivePortalConnect in VolatileSharableData if the network access is 'no network' or 'local internet access' or null/undefined
                CloudExperienceHost.Storage.VolatileSharableData.removeItem("NetworkingValues", "CaptivePortalConnect");
            }
        }
        _playIntroVideo(videoSrc) {
            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("StartToPlayIntroVideo");
            let videoWrapperElement = document.createElement('div');
            videoWrapperElement.setAttribute('class', 'introvideo-wrapper');
            let videoElement = document.createElement('video');
            // Early return if HTMLMediaElement cannot play the video type.
            // Return without appending any video or container elements to the document body, so execution will proceed
            // the same as Scenarios which don't specify an intro video, and interactive ux will not be covered at any point.
            // e.g. .canPlayType is undefined on HTMLMediaElement on N SKUs, which are not packaged with media components
            let mediaElement = videoElement;
            if (!mediaElement.canPlayType || !mediaElement.canPlayType("video/mp4")) {
                return;
            }
            videoElement.setAttribute('class', 'introvideo-container');
            videoElement.src = videoSrc;
            videoWrapperElement.appendChild(videoElement);
            document.body.appendChild(videoWrapperElement);
            this._setRootElementDisplayed(false);
            // If video fails to load - remove the video and let scenario proceed.
            videoElement.addEventListener("error", () => {
                this._setRootElementDisplayed(true);
                videoWrapperElement.style.display = "none";
            });
            // If video loads - play the video
            videoElement.addEventListener("loadeddata", () => {
                videoElement.play();
                AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Synchronization").onFirstOOBEWebAppVisible();
                // This is a timeout that will remove the video wrapper element from the layout when we are not otherwise notified that the video playback ended
                let videoDuration = (videoElement.duration && (videoElement.duration > 0)) ? videoElement.duration : 5; // default to be 5s if failed to get the video duration
                this._startPlayIntroVideoTimer(videoWrapperElement, videoDuration);
            });
            videoElement.addEventListener('ended', () => {
                this._removeIntroVideoWrapper(videoWrapperElement);
                this._stopPlayIntrovideoTimer();
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("EndToPlayIntroVideo");
            });
        }
        _removeIntroVideoWrapper(videoWrapperElement) {
            // Adding the animation style into the root view element when it's time to show up after removing the intro video element from the layout.
            let controlsContainer = document.getElementsByClassName("Container");
            if (controlsContainer.length > 0) {
                controlsContainer[0].classList.add('intro');
            }
            this._setRootElementDisplayed(true);
            videoWrapperElement.style.display = "none";
        }
        _extractExceptionLogData(data) {
            return {
                exp: CloudExperienceHost.ExperienceDescription.getExperience(this._description),
                cxid: this._currentNode && this._currentNode.cxid,
                pendingCxid: this._pendingNode && this._pendingNode.cxid,
                sourceUrl: data && data.errorUrl,
                colno: data && (data.colno || data.errorCharacter),
                lineno: data && (data.lineno || data.errorLine),
                filename: data && (data.filename || (data.error && data.error.filename)),
                errorCode: data && (data.number || (data.exception && (data.exception.number || data.exception.code)) || (data.error && data.error.number) || data.errorCode || 0),
                message: data && (data.message || data.errorMessage || (data.error && data.error.message) || (data.exception && data.exception.message) || null),
                stack: data && (data.stack || (data.exception && (data.exception.stack || data.exception.message)) || (data.error && ((data.error.stack) || (data.error.error && data.error.error.stack))) || "empty").split("  at ").join(""),
            };
        }
        onUnhandledException(e) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                try {
                    Debug.break("Unhandled exception caught by AppManager");
                    let logData = this._extractExceptionLogData(e.detail);
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("UnhandledException", JSON.stringify(logData));
                    // When CXH is in the process of closing, just log the exceptions and don't take any action.
                    if (!this._cxhReadyToClose) {
                        // For Xbox, we don't want to display the error page in any situation since we need WinJS 4.2 in order to
                        // have controller support to navigate the page.  The showErrorPageOnFailure value in the data JSON file
                        // protects most of the flows, it does not protect this flow.
                        if (this._platform === CloudExperienceHost.TargetPlatform.XBOX) {
                            this._appResult = this._failFromCxh;
                            this._close();
                        }
                        else {
                            if (this._isInclusiveNavMesh()) {
                                this._tryLoadInclusiveErrorApp(e);
                            }
                            else {
                                // Loading Error Pages on any unhandled exception. Any unhandled exception in Error Page will re-navigate to itself.
                                // Only default to show account error if it's in FRX on desktop, as creating local account as a fallback doesn't apply elsewhere.
                                let shouldShowAccountErrorPageOnFailurebyDefault = CloudExperienceHost.getContext() && (CloudExperienceHost.getContext().host.toLowerCase() === "frx") &&
                                    (CloudExperienceHost.Environment.getPlatform() === CloudExperienceHost.TargetPlatform.DESKTOP);
                                this._loadErrorPage(this._currentNode ? this._currentNode.showAccountErrorPageOnFailure : shouldShowAccountErrorPageOnFailurebyDefault).done(completeDispatch, errorDispatch);
                            }
                        }
                    }
                }
                catch (error) {
                    // Cleaning the unhandled exception handler and then re-throwing error will crash the app.
                    this._crashCxh(error);
                }
            }.bind(this));
        }
        _crashCxh(error) {
            AppManager.prototype.onUnhandledException = () => {
                return null;
            };
            throw error;
        }
        _resetErrorPageNavigationFailureCount() {
            this._errorAppFailedNavigationAttemptsCount = 0;
        }
        _navigateHelper(navigateCallback, onSuccessCallback, onErrorCallback) {
            if (navigateCallback) {
                this._appView.showProgress().then(() => {
                    this._appView.resetFooterFocus();
                }).then(() => {
                    navigateCallback();
                }).done(() => {
                    if (onSuccessCallback) {
                        onSuccessCallback();
                    }
                }, (error) => {
                    if (error) {
                        if (!onErrorCallback) {
                            this.onUnhandledException(error);
                        }
                        else {
                            onErrorCallback(error);
                        }
                    }
                });
            }
        }
        _tryLoadInclusiveErrorApp(e) {
            // Take a limited number of attempts to load the error page, if this fails, skip to next node or crash cxh
            if (this._errorAppFailedNavigationAttemptsCount < this._errorAppFailedNavigationMaxAttemptsAllowed) {
                this._loadInclusiveErrorAppOrSkipToNext();
            }
            else {
                let resumeNode = this._navigator.getResumeNode();
                if (resumeNode.failID) {
                    this._navigateHelper(() => {
                        this._processingWebAppTerminationMessage = false;
                        this._navigator.navigate(this._navigator.getNavMesh(), this._description, resumeNode.failID);
                    }, () => {
                        this._resetErrorPageNavigationFailureCount();
                    }, (err) => {
                        // We tried our best, it's ok to crash
                        this._crashCxh(err);
                    });
                }
                else {
                    this._crashCxh(e);
                }
            }
        }
        _onWebViewUnhandledException(e) {
            try {
                Debug.break("Unhandled exception from WebView received by AppManager");
                // If we hit a webview deadlock in edgehtml we show the error page, for other cases we simply log and ignore.
                if (e.detail && e.detail.number && (e.detail.number == -2147023765 /* error: ERROR_POSSIBLE_DEADLOCK 0x8007046B */)) {
                    this.onUnhandledException(e);
                }
                else {
                    let logData = this._extractExceptionLogData(e.detail);
                    logData.sourceUrl = CloudExperienceHost.UriHelper.RemovePIIFromUri(e.sourceUrl);
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("WebViewUnhandledException", JSON.stringify(logData));
                }
            }
            catch (ex) {
            }
        }
        _onReportTargetedContentInteraction(interaction) {
            try {
                if (this._targetedContentId && this._targetedContentPath) {
                    Windows.Services.TargetedContent.TargetedContentContainer.getAsync(this._targetedContentId).then((result) => {
                        if (result.availability !== Windows.Services.TargetedContent.TargetedContentAvailability.none) {
                            let content = result.selectSingleObject(this._targetedContentPath);
                            if (content) {
                                // fire a beacon
                                content.item.reportInteraction(interaction);
                            }
                        }
                    }, (err) => {
                        CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("TargetedContentContainer", CloudExperienceHost.GetJsonFromError(err));
                    });
                }
            }
            catch (ex) {
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("TargetedContentContainer", CloudExperienceHost.GetJsonFromError(ex));
            }
        }
        _start(resumed) {
            if (this._description) {
                var stateManager = CloudExperienceHost.StateManager.getInstance();
                var cxid = (resumed && stateManager.isValid(this._scenario)) ? stateManager.getNextCXID() : null;
                stateManager.setSource(this._scenario);
                this._navigate(cxid);
            }
            else {
                window.close();
            }
        }
        _getVersion() {
            // App Manager Version is a uint that manually revs whenever the API surface or design language changes
            // such that a server partner is required to differentiate between different versions of CXH.
            return 1;
        }
        _setScenario(args) {
            var scenario = null;
            switch (args.detail.kind) {
                case Windows.ApplicationModel.Activation.ActivationKind.launch:
                    scenario = args.detail.arguments; /* WebUILaunchActivatedEventArgs */
                    // If we are on Xbox, we need get the result operation from the TCUI context
                    // when activated.  If CXH calls another TCUI operation, we could lose the
                    // original context from the activation.
                    this._resultsOperation = this._getResultOperationForXbox();
                    break;
                case Windows.ApplicationModel.Activation.ActivationKind.protocol:
                    scenario = args.detail.uri.absoluteCanonicalUri; /* WebUIProtocolActivatedEventArgs */
                    // Deep link scenario for MDM enrollment:
                    // ms-device-enrollment is registered in the CXH appx manifest.
                    // If the user is using this entrypoint (with the specific URL and query string),
                    // we want to navigate the user to the offline MDM landing page, else we show the generic
                    // CXH enrollment page.
                    if (args.detail.uri.schemeName.toLowerCase() === "ms-device-enrollment") {
                        // Check if the entire URI matches what is expected, else route to the generic failure page.
                        // We don't want to open this up to allow users to navigate to any CXH page.
                        if (args.detail.uri.absoluteCanonicalUri.toLowerCase().indexOf("ms-device-enrollment:?mode=mdm") === 0) {
                            scenario = scenario.replace("ms-device-enrollment:", "ms-cxh://mosetMDMconnecttowork/");
                        }
                        else if (args.detail.uri.absoluteCanonicalUri.toLowerCase().indexOf("ms-device-enrollment:?mode=awa") === 0 ||
                            args.detail.uri.absoluteCanonicalUri.toLowerCase().indexOf("ms-device-enrollment:?mode=aadj") === 0) {
                            scenario = scenario.replace("ms-device-enrollment:", "ms-cxh://MOSET/CONNECTTOWORK");
                        }
                        else {
                            scenario = "ms-cxh://";
                        }
                    }
                    else if (args.detail.uri.schemeName.toLowerCase() === "ms-cxh-test") {
                        // This is a protocol supported by the CXH Test App (Visual Studio project) to support
                        // deploying the app, then launching it via Win+R and entering a URI. (The CXH System App
                        // has already registered "ms-cxh".) To ensure identical app behavior from this point onwards,
                        // we must perform the replace operation below.
                        scenario = scenario.replace("ms-cxh-test://", "ms-cxh://");
                    }
                    // If we are on Xbox, we need get the result operation from the TCUI context
                    // when activated.  If CXH calls another TCUI operation, we could lose the
                    // original context from the activation.
                    this._resultsOperation = this._getResultOperationForXbox();
                    break;
                case Windows.ApplicationModel.Activation.ActivationKind.protocolForResults:
                    scenario = args.detail.uri.absoluteUri; /* WebUIProtocolActivatedEventArgs */
                    this._resultsOperation = args.detail.protocolForResultsOperation;
                    break;
                case Windows.ApplicationModel.Activation.ActivationKind.componentUI:
                    scenario = args.detail.arguments; /* WebUILaunchActivatedEventArgs */
                    // If we are on Xbox, we need get the result operation from the TCUI context
                    // when activated.  If CXH calls another TCUI operation, we could lose the
                    // original context from the activation.
                    this._resultsOperation = this._getResultOperationForXbox();
                    break;
                default:
                    throw new Error(CloudExperienceHost.ErrorNames.ActivationNotSupported);
                    break;
            }
            // Check if scenario is not empty, else alert to launch with a URI
            if (!scenario || (scenario.length === 0)) {
                this._crashCxh(new Error("Scenario not set. If you are in debug mode, please launch with a URI."));
            }
            this._scenario = scenario;
        }
        _setDescription(scenario) {
            if (scenario) {
                this._description = CloudExperienceHost.ExperienceDescription.Create(scenario);
                if (this._description) {
                    this._correlationId = CloudExperienceHost.ExperienceDescription.GetCorrelationId(this._description);
                    this._targetedContentId = CloudExperienceHost.ExperienceDescription.GetTargetedContentId(this._description);
                    this._targetedContentPath = CloudExperienceHost.ExperienceDescription.GetTargetedContentPath(this._description);
                    this._launchSurface = CloudExperienceHost.ExperienceDescription.GetLaunchSurface(this._description);
                    CloudExperienceHost.Rewards.setShouldReportRewards(CloudExperienceHost.ExperienceDescription.GetShouldReportRewards(this._description));
                }
            }
        }
        _getContext() {
            if (this._description) {
                let context = new CloudExperienceHost.Context();
                context.source = this._description.source;
                context.protocol = this._description.protocol;
                context.host = this._description.host;
                context.machineModel = this._machineModel;
                context.manufacturer = this._manufacturer;
                context.platform = this._platform;
                context.windowsProductId = this._windowsProductId;
                context.edition = this._edition;
                context.launchSurface = this._launchSurface;
                context.windowsFlightData = this._windowsFlightData;
                let currentNode = (this._navigator && this._navigator.getCurrentNode()) ? this._navigator.getCurrentNode() : undefined;
                // The context includes an "Inclusive" property that is computed as follows:
                // - The nav mesh "speechCapable" property indicates whether the mesh is Inclusive.
                //   * If not specified, then the mesh is NOT Inclusive.
                // - The node "speechCapableOverride" property indicates whether a node overrides the mesh value.
                //   * If specified, then the mesh value is ignored in favor of the override value from the node.
                //   * If not specified, then the value computed for the mesh is used.
                let inclusiveFromNode = currentNode ? currentNode.speechCapableOverride : undefined;
                let inclusiveFromMesh = (this._navigator && this._navigator.getNavMesh()) ? this._navigator.getNavMesh().getInclusive() : 0;
                let inclusive = (inclusiveFromNode === undefined) ? inclusiveFromMesh : ((inclusiveFromNode === true) ? 1 : 0);
                let isCloudPolicyEnforced = CloudExperienceHostAPI.Environment.isCloudPolicyEnforced ? 1 : 0;
                // NodeCapabilities is omitted from context.capabilities if there is no JSON object specfiying them on currentNode
                let nodeCapabilities = (currentNode && currentNode.nodeCapabilities) ? JSON.stringify(currentNode.nodeCapabilities) : undefined;
                context.capabilities = JSON.stringify({
                    "PrivatePropertyBag": 1,
                    "PasswordlessConnect": 1,
                    "Inclusive": inclusive,
                    "IsCloudPolicyEnforced": isCloudPolicyEnforced,
                    "PasswordlessSelfConnect": 1,
                    "VisibilityTimerCancelledByShowProgress": true,
                    "NodeCapabilities": nodeCapabilities
                });
                context.experienceName = CloudExperienceHost.ExperienceDescription.getExperience(this._description);
                // Prefer to populate the Context Personality from the Discovery mesh (over the Navigator mesh) since it's the root data source
                // and available earlier than navigator, for the pre-node Context cases.
                // Check this value to guard against app-initialization Context requests before the scenario itself is loaded.
                let discoveryMesh = this.getDiscoveryNavMesh();
                context.personality = discoveryMesh ? discoveryMesh.getPersonality() : CloudExperienceHost.TargetPersonality.Unspecified;
                return context;
            }
            else {
                return null;
            }
        }
        _getWindowsFlightDataAsync() {
            return CloudExperienceHostAPI.UtilStaticsCore.getWindowsFlightDataAsync().then((result) => {
                if (result) {
                    // Filter this to just the "FX:" flight IDs (Windows flights).
                    this._windowsFlightData = result.split(",").filter((featureId) => { return featureId.startsWith("FX:"); }).toString();
                }
            }, (error) => {
                // catch errors but fail silently (i.e., continue with no flight data).
            });
        }
        _navigate(cxid) {
            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().start(CloudExperienceHost.UriHelper.RemovePIIFromUri(this._description.source), CloudExperienceHost.ExperienceDescription.RemovePIIFromExperienceDescription(this._description), this._correlationId);
            this._appView.showProgress().then(function () {
                this._create().then(function () {
                    this._setRootElementDisplayed(true);
                    this._initializeExternalModalRects();
                    this._navigator.navigate(this.getDiscoveryNavMesh(), this._description, cxid).done();
                }.bind(this));
            }.bind(this));
        }
        _setRootElementDisplayed(visible) {
            document.getElementById("_defaultRoot").style.display = (visible ? "" : "none");
        }
        _setupForNavigation(webViewCtrl, completeDispatch, errorDispatch) {
            CloudExperienceHost.Discovery.getApiRules().then(function (rules) {
                var contractHandler = new CloudExperienceHost.ContractHandler(rules);
                // Web view is a singleton because frame view model which creates/caches it is singleton.
                // So we need to make sure the bridge is a singleton on the CXH side too.
                if (AppManager._globalBridgeInstance) {
                    this._bridge = AppManager._globalBridgeInstance;
                    this._bridge.setContractHandler(contractHandler);
                }
                else {
                    this._bridge = new CloudExperienceHost.Bridge(webViewCtrl, contractHandler);
                    AppManager._globalBridgeInstance = this._bridge;
                }
                this._bridge.addEventListener(CloudExperienceHost.Events.visible, this._onVisible.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.goBack, this._onGoBack.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.done, this._onDone.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.skipApp, this._onSkip.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.retryApp, this._onRetry.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.navigate, this._onNavigate.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.showEaseOfAccessControl, this._onShowEaseOfAccessControl.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.loadIdentityProvider, this._onLoadIdentityProvider.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.postTicketToReturnUrl, this._onPostTicketToReturnUrl.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.postDeviceTicketToUrl, this._onPostDeviceTicketToUrl.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.registerNGCForUser, this._onRegisterNGCForUser.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.resetNGCForUser, this._onResetNGCForUser.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.postSharedAccountRegistrationTicketsToUrl, this._onPostSharedAccountRegistrationTicketsToUrl.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.showProgressWhenPageIsBusy, this._onShowProgressWhenPageIsBusy.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.unhandledException, this._onWebViewUnhandledException.bind(this));
                this._bridge.addEventListener(CloudExperienceHost.Events.reportTargetedContentInteraction, this._onReportTargetedContentInteraction.bind(this));
                this._navManager.registerBridge(this._bridge);
                this._navManager.registerWebviewCtrl(webViewCtrl);
                this._navManager.registerAppView(this._appView);
                this._navigator = new CloudExperienceHost.Navigator(webViewCtrl, contractHandler, this._navManager);
                this._navigator.addEventListener("Error", this._onError.bind(this));
                this._navigator.addEventListener("NavigationStarting", this._onNavigationStarting.bind(this));
                this._navigator.addEventListener("NavigationCompleted", this._onNavigationCompleted.bind(this));
                this._navigator.addEventListener("Done", this._onDone.bind(this));
                webViewCtrl.addEventListener("MSWebViewUnsupportedUriSchemeIdentified", this._onUnsupportedUriSchemeIdentified.bind(this));
                window.addEventListener("focus", this._onFocus.bind(this), false);
                window.addEventListener("focusout", this._onFocusOut.bind(this), false);
                window.addEventListener("resize", this._onResize.bind(this));
                let headerParams = CloudExperienceHost.ExperienceDescription.GetHeaderParams(this._description);
                if (headerParams !== "") {
                    this._navigator.setHeaderParams(headerParams);
                }
                this._readyToNavigate = true;
                completeDispatch();
            }.bind(this), errorDispatch);
        }
        _create() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                var webViewCtrl = this._appView.createWebView();
                this._appView.cleanView();
                this._appView.getView().appendChild(webViewCtrl);
                webViewCtrl.setAttribute("id", "x-ms-webview");
                // http://osgvsowi/6895474
                // This is a patch for CL 49489 which broke the golden path Xbox account
                // recovery flow.  In order to allow the FI to get past the Xbox L1, we potentially
                // broke any accessibility improvements which the original fix added.
                if (this._platform === CloudExperienceHost.TargetPlatform.XBOX) {
                    webViewCtrl.focus();
                }
                // If this is a case where we are 'restarting' cxh without rebooting, make sure that we
                // do not recreate instances of bridge, navigator.
                if (!this._readyToNavigate) {
                    this._setupForNavigation(webViewCtrl, completeDispatch, errorDispatch);
                }
                else {
                    completeDispatch();
                }
            }.bind(this));
        }
        _initializeExternalModalRects() {
            if (this.getDiscoveryNavMesh().getInitializeExternalModalRects()) {
                let clientRect = this._appView.getBoundingClientRect();
                let rect = {
                    height: clientRect.height,
                    width: clientRect.width,
                    x: clientRect.left,
                    y: clientRect.top
                };
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("UpdatingExternalBoundingClientRect", JSON.stringify(rect));
                CloudExperienceHostAPI.HostedApplicationCore.setWindowLocation(false /* modal rect */, rect);
                let coordinator = WindowsUdk.Security.Credentials.UI.CredUICoordinator.getForCurrentView();
                if (coordinator) {
                    let physicalPixelRect = {
                        height: clientRect.height * window.devicePixelRatio,
                        width: clientRect.width * window.devicePixelRatio,
                        x: clientRect.left * window.devicePixelRatio,
                        y: clientRect.top * window.devicePixelRatio
                    };
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("UpdatingCredUICoordinatorRect", JSON.stringify(physicalPixelRect));
                    coordinator.styleOptions = coordinator.styleOptions | WindowsUdk.Security.Credentials.UI.CredUICoordinatorStyleOptions.useCoordinatorPlacement |
                        WindowsUdk.Security.Credentials.UI.CredUICoordinatorStyleOptions.inlineFluentTheme;
                    coordinator.placement = physicalPixelRect;
                    coordinator.reportChanged();
                }
            }
        }
        _onResize() {
            this._initializeExternalModalRects();
        }
        _onFocus() {
            if (this._platform === CloudExperienceHost.TargetPlatform.XBOX) {
                // We really want to use the focusin event, but unfortunately, we are not seeing
                // it when we return the Xbox power menu like you would expect.  In order for
                // us to find the webViewCtrl in the handler, we use the ID.
                var webViewCtrl = document.getElementById("x-ms-webview");
                // There is a timing issue here and a single call to focus does not always return focus where we
                // need it be, but a double gets it to be over 80% of the time.
                webViewCtrl.focus();
                webViewCtrl.focus();
            }
            if (this._appView.isChromeDimBasedOnFocus()) {
                this._appView.undimChrome();
            }
        }
        _onFocusOut() {
            if (this._appView.isChromeDimBasedOnFocus()) {
                this._appView.dimChrome();
            }
        }
        _onNavigationStarting(node) {
            Debug.log(`Navigation starting to node: ${node && node.cxid}`);
            if (this._pendingNode) {
                Debug.break("Trying to navigate to " + node && node.cxid + " while already navigating to " + this._pendingNode.cxid);
                let logDetails = { currentCxid: this._currentNode && this._currentNode.cxid, pendingCxid: this._pendingNode.cxid, navCxid: node && node.cxid };
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("StartedNavigatingWhileAlreadyNavigating", JSON.stringify(logDetails));
            }
            this._pendingNode = node;
            CloudExperienceHost.StateManager.getInstance().onNavigate(node);
            if (this._blockLateWebAppCalls()) {
                this._bridge.connectToWebView();
            }
            this._stopShowProgressWhenPageIsBusyTimer();
            this._stopVisibilityTimer(); // Ensure timer is cleared prior to navigation- if needed, it will be set again on navigation completion
            this._appView.setAllowChangeDisplayMode(node.allowDisplayModeChange);
        }
        _startVisibilityTimer() {
            var timeout = 15000; // 15 seconds
            if (this._currentNode.timeout) {
                timeout = this._currentNode.timeout;
            }
            this._visibilityTimer = WinJS.Promise.timeout(timeout).then(function () {
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("VisibilityTimeout", this._currentNode.cxid);
                // Inclusive flow returns error in order to show the error page, while non-inclusive flow returns fail.
                this._onDone(this._isInclusiveNavMesh() ? CloudExperienceHost.AppResult.error : CloudExperienceHost.AppResult.fail, true); // WebApp should fire Visible event when is ready; passing true to signify that this an internal CXH result
            }.bind(this));
        }
        _stopVisibilityTimer() {
            // Cancel visibility timeout
            if (this._visibilityTimer) {
                this._visibilityTimer.cancel();
                this._visibilityTimer = null;
            }
        }
        _startNarratorInstructionTimer() {
            let timeout = 20000; // 20 seconds
            this._narratorInstruction = WinJS.Promise.timeout(timeout).then(() => {
                try {
                    let resourceStrings = JSON.parse(CloudExperienceHost.StringResources.makeResourceObject("oobeWelcome"));
                    CloudExperienceHostAPI.Speech.SpeechSynthesis.speakAsync(resourceStrings.LaunchNarratorInstruction, true /* useVoiceOver */, false /* checkSpeechControllerState */);
                }
                catch (e) {
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("NarratorInstructionFailed", CloudExperienceHost.GetJsonFromError(e));
                }
            });
        }
        _stopNarratorInstructionTimer() {
            if (this._narratorInstruction) {
                this._narratorInstruction.cancel();
                this._narratorInstruction = null;
            }
        }
        _startShowProgressWhenPageIsBusyTimer() {
            var timeout = 60000; // 60 seconds (settings for some pages may take a while to commit)
            this._showProgressWhenPageIsBusyTimer = WinJS.Promise.timeout(timeout).then(function () {
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("ShowProgressWhenPageIsBusyTimeout", this._currentNode.cxid);
                this._onDone(CloudExperienceHost.AppResult.error, true); // WebApp should fire Appresult success/fail event when is ready; passing true to signify that this an internal CXH result
            }.bind(this));
        }
        _stopShowProgressWhenPageIsBusyTimer() {
            // Cancel showProgressWhenPageIsBusy timeout
            if (this._showProgressWhenPageIsBusyTimer) {
                this._showProgressWhenPageIsBusyTimer.cancel();
                this._showProgressWhenPageIsBusyTimer = null;
            }
        }
        _startPlayIntroVideoTimer(videoWrapperElement, videoDuration) {
            let timeout = 2000 * videoDuration; // 2 times of the video duration in ms
            this._endIntroVideoTimer = WinJS.Promise.timeout(timeout).then(() => {
                try {
                    this._removeIntroVideoWrapper(videoWrapperElement);
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("EndToPlayIntroVideoDueToTimeout");
                }
                catch (e) {
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("EndIntroVideoTimerFailed", CloudExperienceHost.GetJsonFromError(e));
                }
            });
        }
        _stopPlayIntrovideoTimer() {
            if (this._endIntroVideoTimer) {
                this._endIntroVideoTimer.cancel();
                this._endIntroVideoTimer = null;
            }
        }
        _stopSpeech() {
            this._stopNarratorInstructionTimer();
            if (this._isInclusiveNavMesh()) {
                try {
                    // Stop speech operations
                    CloudExperienceHostAPI.Speech.SpeechSynthesis.stop();
                    CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
                }
                catch (e) {
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("StopSpeechFailure", CloudExperienceHost.GetJsonFromError(e));
                }
            }
        }
        _onNavigationCompleted(node) {
            Debug.log(`Navigation completed to node: ${node && node.cxid}`);
            if (!this._pendingNode) {
                // Apparently IDPS/MSA/AAD currently hit this case
                Debug.log("Completed a navigation without NavigationStarting having fired");
            }
            else if (node != this._pendingNode) {
                Debug.break("Completed navigating to " + node && node.cxid + " while already navigating to " + this._pendingNode.cxid);
                let logDetails = { currentCxid: this._currentNode && this._currentNode.cxid, pendingCxid: this._pendingNode && this._pendingNode.cxid, navCxid: node && node.cxid };
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NavigationCompletedDifferentNodeThanStarted", JSON.stringify(logDetails));
            }
            this._pendingNode = null;
            if ((this._currentNode) && (this._currentNode.cxid === node.cxid)) {
                this._stopVisibilityTimer();
                this._stopShowProgressWhenPageIsBusyTimer();
                if ((typeof (this._currentNode.intraWebAppVisibility) === 'undefined') || (this._currentNode.intraWebAppVisibility === true) || (this._navigator.getRedirectForPostTicketInterrupt() === true)) {
                    // To work around MSA server, always fire Visible for internal navigations caused by a PostTicket interrupt
                    // Note that this won't fire visible automatically when we post a ticket to the requesting endpoint without interrupt UX
                    this._onVisible(true);
                }
                else {
                    // Waiting for WebApp to send visible event
                    this._startVisibilityTimer();
                }
            }
            else {
                this._stopVisibilityTimer();
                this._stopShowProgressWhenPageIsBusyTimer();
                this._currentNode = node;
                if ((typeof (this._currentNode.visibility) === 'undefined') || (this._currentNode.visibility === true)) {
                    this._onVisible(true);
                }
                else {
                    // Waiting for WebApp to send visible event
                    this._startVisibilityTimer();
                }
            }
            this._navigator.setRedirectForPostTicketInterrupt(false);
        }
        _onUnsupportedUriSchemeIdentified(e) {
            var uri = new Windows.Foundation.Uri(e.uri);
            if (uri.schemeName === "ms-aadj-redir") {
                // Cache the ms-aadj-redir payload locally for later retrieval when the relevant web content's relevant JS eventually loads
                // http://osgvsowi/10484753 ms-aadj-redir protocol activation produces a fragment (#name=value) instead of query string (?name=value)
                // For now we work around this by preferring the query string if available, but falling back to the fragment otherwise
                var payload = (uri.query !== "") ? uri.query : uri.fragment;
                CloudExperienceHost.Storage.PrivateData.addItem("msAadjRedirQueryTerms", payload);
                // This happened in response to an HTTP 302 on this custom protocol scheme, but unfortunately we have no way to redirect or
                // cleanly abort that original HTTP 302 (because we're not http/https). Therefore, although we're about to set up an async operation
                // to navigate to the desire navmesh's node, we will also shortly see a navigation failure event. We are expecting it and need to eat it.
                this._navigator.setNavigationInterruptExpected();
                // Reload nav mesh current node start URL. The Web App will figure out what to do.
                this._navigate(this._currentNode.cxid);
                e.preventDefault();
            }
        }
        _notifyWebAppVisibleIfNecessary() {
            if (this._currentNode) {
                AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.AppEventNotificationManager").notifyWebAppStatusChanged(this._currentNode.cxid, CloudExperienceHostAPI.WebAppStatus.visible);
            }
            if (!this._hasNotifiedFirstVisible) {
                this._hasNotifiedFirstVisible = true;
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("FirstWebAppVisible", this._currentNode && this._currentNode.cxid);
                if (this._navigator && this._navigator.getNavMesh().getNotifyOnFirstVisible()) {
                    AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Synchronization").onFirstOOBEWebAppVisible();
                }
                if (CloudExperienceHost.getContext().host.toLowerCase() === "frx") {
                    AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.AppEventNotificationManager").notifyOobeReadyStateChanged(true);
                }
                if (this._discoveryNavMesh.shouldRunNarratorInstruction() &&
                    !(CloudExperienceHost.Storage.SharableData.getValue("OOBEResumeEnabled")) &&
                    AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Speech.SpeechRecognitionController").isSpeechAllowedByPolicy()) {
                    this._startNarratorInstructionTimer();
                }
            }
        }
        _loadErrorPage(showAccountErrorPageOnFailure) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                // First clear the view element, and then show the progress element before we load error page into the view element, and lastly show the view element again.
                // This process will make sure we can show the error page regardless what the current rendering element is.
                this._appView.cleanView();
                this._appView.showProgress().then(function () {
                    let errorPageUri = "views/errorHandler.html";
                    WinJS.UI.Pages.render(errorPageUri, this._appView.getView(), showAccountErrorPageOnFailure).done(function () {
                        this._appView.showView().done(completeDispatch, errorDispatch);
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }
        _isInclusiveNavMesh() {
            return (this._navigator && this._navigator.getNavMesh()) ? (this._navigator.getNavMesh().getInclusive() != 0) : false;
        }
        _blockLateWebAppCalls() {
            return (this._navigator && this._navigator.getNavMesh()) ? this._navigator.getNavMesh().blockLateWebAppCalls() : false;
        }
        _loadInclusiveErrorAppOrSkipToNext() {
            // By default we show the error page unless the node exclusively subscribes to not showing the same (the node has a failID to support this)
            let resumeNode = this._navigator.getResumeNode();
            if (resumeNode.disableErrorPageOnFailure && resumeNode.failID) {
                this._processingWebAppTerminationMessage = false;
                this._onSkip();
            }
            else {
                // We are trying to navigate to the inclusive error app, any unhandled exceptions happening now until the time
                // user clicks skip/retry and exits out of the error app is catastrophic and accounted for.
                this._errorAppFailedNavigationAttemptsCount++;
                this._navigateHelper(() => {
                    this._processingWebAppTerminationMessage = false;
                    this._navigator.navigate(this._navigator.getNavMesh(), this._description, this._navigator.getNavMesh().getErrorNodeName());
                });
            }
        }
        _onError(e) {
            // If this particular node requested that we show an error page on failure, then do so. Otherwise,
            // automatically navigate to the next node instead. There's two types of error pages: both allow
            // retry, the first sends you to the local account page (used in User OOBE to ensure we don't leave
            // without creating an account), and the second closes this app (used in Cloud Domain Join scenarios
            // within the System Settings app).
            if (e.node) {
                this._currentNode = e.node;
            }
            // The first case over here can be made more generic by checking if the Mesh supports an "error node", if not
            // it always falls back to the existing generic error node from earlier days.
            // if (e.node && this._discoveryNavMesh.getErrorNode()) {}
            if (e.node && this._isInclusiveNavMesh()) {
                this._tryLoadInclusiveErrorApp(e);
            }
            else if (e.node && (e.node.showAccountErrorPageOnFailure || e.node.showErrorPageOnFailure)) {
                this._loadErrorPage(e.node.showAccountErrorPageOnFailure ? true : false).done(function () {
                    this._notifyWebAppVisibleIfNecessary();
                }.bind(this));
            }
            else {
                // Navigate to the next node specified when the app returns a failure result.
                this._onDone(CloudExperienceHost.AppResult.fail, true); // Passing true to signify that this an internal CXH result
            }
        }
        _onVisible(arg) {
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("Visible", arg);
            if (arg === true) {
                this._stopVisibilityTimer();
                this._stopShowProgressWhenPageIsBusyTimer();
                let switchView = true;
                // If this is a launcher node, don't switch the view to the webview control - as we're not using it
                if (this._currentNode && this._currentNode.launcher) {
                    switchView = false;
                }
                this._navManager.notifyEvent(CloudExperienceHost.NavigationEvent.CompletedAndVisible, this._currentNode ? this._currentNode.cxid : undefined);
                if (switchView) {
                    this._appView.showView().done(function () {
                        this._notifyWebAppVisibleIfNecessary();
                    }.bind(this));
                }
                else {
                    this._notifyWebAppVisibleIfNecessary();
                }
                if (this._currentNode && this._currentNode.frameAnimation) {
                    CloudExperienceHost.AppFrame.showGraphicAnimation(this._currentNode.frameAnimation);
                }
                this._navigator.evaluateBackNavigationStatusForNextTransition();
            }
        }
        _onGoBack() {
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("GoBack");
            this._stopSpeech();
            this._navigateHelper(() => {
                this._navigator.goBack();
            });
        }
        _onSkip() {
            this._resetErrorPageNavigationFailureCount();
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("SkippingWebapp");
            this._stopSpeech();
            this._navigateHelper(() => {
                this._navigator.skipCurrentApp(this._navigator.getResumeNode());
            });
        }
        _onRetry() {
            this._resetErrorPageNavigationFailureCount();
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("Retry");
            this._stopSpeech();
            CloudExperienceHost.Storage.SharableData.addValue("resumeCXHId", this._navigator.getResumeNode().cxid);
            // We can make this more generic and available always by moving this to the default launcher
            CloudExperienceHost.Storage.SharableData.addValue("OOBEResumeEnabled", true);
            // The new inclusive error page is available only on the inclusive flow
            this._navigator.resetBackNavigationStatusForNextTransition();
            this.restart(this._description.source.replace(this._description.query, ""));
        }
        _logDuplicateWebAppTerminationAttempt(eventName, result) {
            let errorObj = new Error();
            let logResult = {
                currentNode: this._currentNode ? this._currentNode.cxid : "unknown",
                result: result,
                stack: errorObj.stack
            };
            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2(eventName, JSON.stringify(logResult));
        }
        _onDone(result, isInternalResult) {
            if (this._processingWebAppTerminationMessage && this._blockLateWebAppCalls()) {
                // Something is wrong, as a WebApp termination event is being reported again while we're finding the next node to show
                Debug.break("Second WebApp termination message reported while navigating to next node");
                // If this is an internal 'done', let the original 'done' complete & only log, as this one
                // is likely from one of the timers since cancellation of them could be slightly too late
                if (isInternalResult) {
                    this._logDuplicateWebAppTerminationAttempt("DuplicateInternalDone", result);
                    return;
                }
                // Launcher nodes that leverage the visibility timeout to timebox their execution time
                // may also have their completion race an internal timer. If the non-internal "Done" event
                // from the launcher arrives after an internal timeout, but not long enough after the timeout
                // that the internal navigation identifier tracked by the Navigator has been incremented,
                // then log an event and otherwise ignore the duplicate Done, without crashing the app.
                if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("IgnoreLauncherDuplicateWebappDone") && this._currentNode && this._currentNode.launcher) {
                    this._logDuplicateWebAppTerminationAttempt("DuplicateLauncherDone", result);
                    return;
                }
                // If it's from a webapp, log and then crash since it's likely the system is now in an unknown state
                // from a webapp trying to modify the same system state twice - potentially to different things
                this._logDuplicateWebAppTerminationAttempt("DuplicateWebAppDone", result);
                this._crashCxh(new Error("CrashAppOnDuplicateWebAppDone"));
            }
            this._processingWebAppTerminationMessage = true;
            // Reset the ticket request id.
            this._ticketRequestId = null;
            // Stop visibility timer: WebApp may report failure before getting visible.
            this._stopVisibilityTimer();
            this._stopShowProgressWhenPageIsBusyTimer();
            // Disconnect the bridge from the webapp so it can't send more messages to the host app
            if (this._blockLateWebAppCalls()) {
                this._bridge.disconnectFromWebView();
            }
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("Done", result);
            this._stopSpeech();
            if (this._currentNode) {
                CloudExperienceHost.StateManager.getInstance().onDone(this._currentNode, result);
                AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.AppEventNotificationManager").notifyWebAppStatusChanged(this._currentNode.cxid, CloudExperienceHostAPI.WebAppStatus.done);
            }
            if (!this._currentNode || (typeof (this._currentNode.ignoreResult) === 'undefined') || (this._currentNode.ignoreResult === false)) {
                // The appresult values set here are consumed in external code, these values should not be updated
                this._appResult = CloudExperienceHost.AppResult.getExternalAppResult(result);
            }
            // Since we can't display the error page for Xbox, we need to give some information to the
            // caller to decide if they should show an error on our behalf.  If the failure was was an internal
            // result and not from the hosted page, we change the error code from the generic fail to
            // fail from CXH so that the caller can attempt to do the right thing and display an error
            // to the user.
            if ((this._platform === CloudExperienceHost.TargetPlatform.XBOX) &&
                (this._appResult === CloudExperienceHost.AppResult.fail) &&
                isInternalResult) {
                this._appResult = this._failFromCxh;
            }
            if (this._navigator.webAppDone(result)) {
                this._navigateHelper(() => {
                    let completeNavigation = function () {
                        this._processingWebAppTerminationMessage = false;
                        this._navigator.goNext();
                    }.bind(this);
                    if (this._blockLateWebAppCalls()) {
                        this._navigator.clearWebView().done(() => {
                            completeNavigation();
                        }, (e) => {
                            Debug.break("Failed to clear the webview after a page was done");
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("ClearWebViewFailure", CloudExperienceHost.GetJsonFromError(e));
                            completeNavigation();
                        });
                    }
                    else {
                        completeNavigation();
                    }
                });
            }
            else {
                // No next node, so either the error page hit an error or we're about to exit CXH
                // If there is an error loading up the error webapp, it returns an AppResult.fail, however the error node doesn't have a failID
                // resulting in the nextNode in navigator to be set to null. We handle this over here depending on the scenario.
                if (this._navigator.getNavMesh().getErrorNode() === this._navigator.getCurrentNode()) {
                    this._tryLoadInclusiveErrorApp("InclusiveError App failed to load");
                }
                else if (this._navigator.getNavMesh().blockEarlyExit() && this._navigator.getCurrentNode() &&
                    (!this._navigator.getCurrentNode().canExitCxh || !CloudExperienceHost.AppResult.doesResultAllowExit(result))) {
                    // Restart the flow from the beginning, as the current node can't exit CXH or it returned a non-exit code
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("UnexpectedResultFromWebapp", JSON.stringify({ cxid: this._navigator.getCurrentNode().cxid, result: result }));
                    this._processingWebAppTerminationMessage = false;
                    CloudExperienceHost.Storage.SharableData.addValue("OOBEResumeEnabled", false);
                    this._navigator.resetBackNavigationStatusForNextTransition();
                    this.restart(this._description.source.replace(this._description.query, ""));
                }
                else {
                    this._close();
                }
            }
        }
        _onNavigate(e, contextHeaders) {
            var target = ((typeof e === "string") ? new CloudExperienceHost.RedirectEventArgs(e) : e);
            // http://osgvsowi/10484490 AAD login page fires an unnecessary CXH navigation event when processing redirect_uri
            // This is a temporary workaround for bug 10484490. With ms-aadj-redir we sometimes get an explicit CXH navigate
            // request from AAD for what should be just an "unsupported uri scheme". The navigate stack here expects to be able
            // to complete an HTTP navigate later, which requires http scheme. So we have to filter the unsupported uri scheme out.
            if (target.url.split(':')[0] === 'ms-aadj-redir') {
                return;
            }
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("Navigate", JSON.stringify({
                httpMethod: target.httpMethod,
                url: CloudExperienceHost.UriHelper.RemovePIIFromUri(target.url)
            }));
            this._navigateHelper(() => {
                this._navigator.redirect(target, contextHeaders);
            });
        }
        _onShowProgressWhenPageIsBusy() {
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("showProgressWhenPageIsBusy");
            // If the webapp explicitly requests to show the progress spinner due to long-running background work, clear existing visibility and showProgress timers first
            this._stopVisibilityTimer();
            this._stopShowProgressWhenPageIsBusyTimer();
            this._startShowProgressWhenPageIsBusyTimer();
            this._appView.showProgress();
        }
        _onShowEaseOfAccessControl(boundingRectOfEOAButton) {
            if (!boundingRectOfEOAButton) {
                var boundingRectangleOfWindow = this._appView.getBoundingClientRect();
                boundingRectOfEOAButton = {
                    left: boundingRectangleOfWindow.left,
                    top: boundingRectangleOfWindow.bottom,
                    right: boundingRectangleOfWindow.left,
                    bottom: boundingRectangleOfWindow.bottom
                };
            }
            CloudExperienceHost.showEaseOfAccessFlyout(boundingRectOfEOAButton).then(function () {
            }, function (e) {
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent(e);
            });
        }
        _onLoadIdentityProvider(signInIdentityProvider) {
            if (this._processingWebAppTerminationMessage && this._blockLateWebAppCalls()) {
                // If we're already processing a WebApp termination event, just ignore the duplicate one and no-op
                this._logDuplicateWebAppTerminationAttempt("DuplicateLoadIdentityProvider", signInIdentityProvider);
                return;
            }
            this._processingWebAppTerminationMessage = true;
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("LoadIdentityProvider", signInIdentityProvider);
            this._navigateHelper(() => {
                this._navigator.loadIdentityProvider(signInIdentityProvider);
                this._processingWebAppTerminationMessage = false;
            });
        }
        // Error handler for postTicketToReturnUrl, postDeviceTicketToUrl, and postSharedAccountRegistrationTicketsToUrl
        // Returns true if it handled the error condition (navigates according to error logic), false if it does not navigate and only logged the error
        _onTicketError(targetUrl, errorMsg, errorCode, localErrorHandlingMode) {
            // Log the error
            var logData = new Object;
            logData["cxid"] = this._currentNode && this._currentNode.cxid;
            logData["errorCode"] = errorCode || null;
            logData["message"] = errorMsg || null;
            logData["targetUrl"] = targetUrl;
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("TicketRequestError", JSON.stringify(logData));
            // Map error cases down to those handled by CXH
            var error = null;
            switch (errorCode) {
                case -2147023665:
                    // HRESULT_FROM_WIN32(ERROR_NETWORK_UNREACHABLE)
                    error = Windows.Web.WebErrorStatus.serverUnreachable;
                    break;
            }
            if ((localErrorHandlingMode == CloudExperienceHost.LocalErrorHandlingMode.LocalErrorHandlingEnabled)
                || ((localErrorHandlingMode == CloudExperienceHost.LocalErrorHandlingMode.LocalErrorHandlingEnabledForKnownErrors) && error)) {
                // Handle error condition.
                this._onError(new CloudExperienceHost.NavigationError(error, targetUrl, this._currentNode, errorMsg || errorCode.toString()));
                return true;
            }
            return false;
        }
        // Callback invoked by MicrosoftAccount.TokenProvider.Core.TokenProviderExecutor.RequestTicketForUrl() on completion
        _onTicketRequestComplete(targetUrl, result) {
            if (targetUrl) {
                this._navigator.redirect(new CloudExperienceHost.RedirectEventArgs(targetUrl, null, result, result ? "POST" : "GET"));
            }
            else {
                // If this happens, there is a bug.
                this._onTicketError(targetUrl, result, -2147012891 /* WININET_E_INVALID_URL */, CloudExperienceHost.LocalErrorHandlingMode.LocalErrorHandlingEnabled);
            }
        }
        _onPostTicketToReturnUrl(data) {
            // Instantiate MsaUIHandler if necessary
            this._msaUIHandler = this._msaUIHandler || new CloudExperienceHost.MSAUIHandlerInternal(this._appView);
            // If there is an existing ticket request, we will allow this newer request to go through and ignore the existing request.
            // So we clear the existing tokenBrokerOperation if there is one.
            this._msaUIHandler.clearTokenBrokerOperation();
            // Then we generate an unique id for this request, which will compare it in the callback.
            let currentCxid = this._currentNode ? this._currentNode.cxid : "";
            let uniqueid = currentCxid + '_' + Math.random().toString(16).slice(2);
            // this._ticketRequestId will set to null when navigating to different webapps.
            this._ticketRequestId = uniqueid;
            data.ticketRequestId = uniqueid;
            // Determine MSA scenario category (OOBE, TSET, etc.)
            // If the value does not get set, TokenProviderExecutor defaults to "TokenBroker"
            var msaTicketContext = this._navigator.getNavMesh().getMsaTicketContext();
            data.msaTicketBroker = this._navigator.getNavMesh().getMsaTicketBroker() || false;
            this._msaUIHandler.requestTicketForUrl(data, msaTicketContext, function (e, contextHeaders) {
                // Callback if there is an interrupt during this ticket request.
                if (this._ticketRequestId === data.ticketRequestId) {
                    // Only navigate if ticket request ids are the same.
                    this._navigator.setRedirectForPostTicketInterrupt(true);
                    this._onNavigate(e, contextHeaders);
                }
                else {
                    let logDetails = { thisRequestId: this._ticketRequestId, callbackRequestId: data.ticketRequestId };
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("PostTicketToReturnUrlInterrupt", JSON.stringify(logDetails));
                }
            }.bind(this)).done(
            // completeDispatch
            function (redirectArgs) {
                if (this._ticketRequestId === data.ticketRequestId) {
                    // Only redirect if ticket request ids are the same.
                    this._navigator.redirect(redirectArgs);
                }
                else {
                    let logDetails = { thisRequestId: this._ticketRequestId, callbackRequestId: data.ticketRequestId };
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("PostTicketToReturnUrlCompleteDispatch", JSON.stringify(logDetails));
                }
            }.bind(this), 
            // errorDispatch
            function (error) {
                if (this._ticketRequestId === data.ticketRequestId) {
                    // Only redirect if ticket request ids are the same.
                    // Handle known error cases and redirect if necessary, otherwise redirect to errorUrl provided in data
                    var localErrorHandlingMode = data.errorUrl ? CloudExperienceHost.LocalErrorHandlingMode.LocalErrorHandlingEnabledForKnownErrors : CloudExperienceHost.LocalErrorHandlingMode.LocalErrorHandlingEnabled;
                    if (!this._onTicketError(data.targetUrl, "", error.number, localErrorHandlingMode)) {
                        this._navigator.setRedirectForPostTicketInterrupt(true);
                        this._navigator.redirect(new CloudExperienceHost.RedirectEventArgs(data.errorUrl, "ticketError", error.number, "POST"));
                    }
                }
                else {
                    let logDetails = { thisRequestId: this._ticketRequestId, callbackRequestId: data.ticketRequestId };
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("PostTicketToReturnUrlErrorDispatch", JSON.stringify(logDetails));
                }
            }.bind(this));
        }
        _onRegisterNGCForUser(data) {
            // Instantiate MsaUIHandler
            this._msaUIHandler = this._msaUIHandler || new CloudExperienceHost.MSAUIHandlerInternal(this._appView);
            // Determine MSA scenario category (OOBE, WindowsLogon, etc.)
            // If the value does not get set, TokenProviderExecutor defaults to "TokenBroker"
            let msaTicketContext = this._navigator.getNavMesh().getMsaTicketContext() || "";
            let experienceName = CloudExperienceHost.ExperienceDescription.getExperience(this._description);
            data.msaTicketBroker = this._navigator.getNavMesh().getMsaTicketBroker() || false;
            this._msaUIHandler.registerNGCForUser(data, msaTicketContext, experienceName, this._onNavigate.bind(this)).done(this._onTicketRequestComplete.bind(this), function (destinationUrl) {
                this._navigator.redirect(new CloudExperienceHost.RedirectEventArgs(destinationUrl));
            }.bind(this));
        }
        _onResetNGCForUser(data) {
            // Instantiate MsaUIHandler
            this._msaUIHandler = this._msaUIHandler || new CloudExperienceHost.MSAUIHandlerInternal(this._appView);
            // Determine MSA scenario category (OOBE, WindowsLogon, etc.)
            // If the value does not get set, TokenProviderExecutor defaults to "TokenBroker"
            let msaTicketContext = this._navigator.getNavMesh().getMsaTicketContext() || "";
            let experienceName = CloudExperienceHost.ExperienceDescription.getExperience(this._description);
            data.msaTicketBroker = this._navigator.getNavMesh().getMsaTicketBroker() || false;
            this._msaUIHandler.resetNGCForUser(data, msaTicketContext, experienceName, this._onNavigate.bind(this)).done(this._onTicketRequestComplete.bind(this), function (destinationUrl) {
                this._navigator.redirect(new CloudExperienceHost.RedirectEventArgs(destinationUrl));
            }.bind(this));
        }
        _onPostDeviceTicketToUrl(data) {
            var targetUrl = data.targetUrl;
            var policy = data.policy;
            var guid = "49BB5C55-7CF8-49EA-BE52-9FEC226F728C"; // Value is only used for analytics
            // Generate an unique id for the device ticket request.
            let currentCxid = this._currentNode ? this._currentNode.cxid : "";
            let uniqueid = currentCxid + '_' + Math.random().toString(16).slice(2);
            this._ticketRequestId = uniqueid;
            data.ticketRequestId = uniqueid;
            this._appView.showProgress().then(function () {
                let msaExtension = new MicrosoftAccount.Extension.ExtensionWorkerForUser();
                let user = null;
                user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                msaExtension.getDeviceTicketForWebFlowForUserAsync(user, targetUrl, policy, guid).done(function (result) {
                    if (this._ticketRequestId === data.ticketRequestId) {
                        // Only attempt to post the ticket if the request ids are the same.
                        this._onTicketRequestComplete(result.lookup("ResultUrl"), result.lookup("Ticket"));
                    }
                    else {
                        let logDetails = { thisRequestId: this._ticketRequestId, callbackRequestId: data.ticketRequestId };
                        CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("PostDeviceTicketToUrlDone", JSON.stringify(logDetails));
                    }
                }.bind(this), function (error) {
                    if (this._ticketRequestId === data.ticketRequestId) {
                        // Attempt to handle the error only if request ids are the same.
                        this._onTicketError(targetUrl, error.message, error.number, CloudExperienceHost.LocalErrorHandlingMode.LocalErrorHandlingEnabled);
                    }
                    else {
                        let logDetails = { thisRequestId: this._ticketRequestId, callbackRequestId: data.ticketRequestId };
                        CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("PostDeviceTicketToUrlError", JSON.stringify(logDetails));
                    }
                }.bind(this));
            }.bind(this));
        }
        _onPostSharedAccountRegistrationTicketsToUrl(data) {
            let targetUrl = data.targetUrl;
            let policy = data.policy;
            let guid = "49BB5C55-7CF8-49EA-BE52-9FEC226F728C"; // Value is only used for analytics
            this._appView.showProgress().then(function () {
                let userTicketRedirectArgs = null;
                let deviceTicketRedirectArgs = null;
                this._msaUIHandler = this._msaUIHandler || new CloudExperienceHost.MSAUIHandlerInternal(this._appView);
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("onPostSharedAccountRegistrationTicketsToUrl", this._currentNode ? this._currentNode.cxid : "");
                // By design, if there is an existing ticket request, we will clear it and let this new one go through.
                // It prevents the callback of the existing request redirect or navigate to other webpage.
                this._msaUIHandler.clearTokenBrokerOperation();
                // Determine MSA scenario category (OOBE, TSET, etc.)
                // If the value does not get set, TokenProviderExecutor defaults to "TokenBroker"
                let msaTicketContext = this._navigator.getNavMesh().getMsaTicketContext();
                let getUserTicket = this._msaUIHandler.requestTicketForUrl(data, msaTicketContext, this._onNavigate.bind(this));
                getUserTicket.done(function (userRedirectArgs) {
                    userTicketRedirectArgs = userRedirectArgs;
                }.bind(this), function (error) {
                    this._onTicketError(data.targetUrl, "", error.number, CloudExperienceHost.LocalErrorHandlingMode.LocalErrorHandlingEnabled);
                }.bind(this));
                let msaExtension = new MicrosoftAccount.Extension.ExtensionWorkerForUser();
                let user = null;
                user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                let getDeviceTicket = msaExtension.getSharedAccountDeviceTicketForWebFlowForUserAsync(user, targetUrl, policy, guid);
                getDeviceTicket.done(function (deviceRedirectArgs) {
                    deviceTicketRedirectArgs = deviceRedirectArgs;
                }.bind(this), function (error) {
                    this._onTicketError(targetUrl, error.message, error.number, CloudExperienceHost.LocalErrorHandlingMode.LocalErrorHandlingEnabled);
                }.bind(this));
                WinJS.Promise.join({
                    getUserTicket: getUserTicket,
                    getDeviceTicket: getDeviceTicket
                }).done(function () {
                    // Strip off other parameters and "t=" from the device ticket (if it exists)
                    let deviceTicket = deviceTicketRedirectArgs.lookup("Ticket");
                    let deviceTicketStart = deviceTicket.indexOf("t=");
                    if (deviceTicketStart == -1) {
                        deviceTicket = null;
                    }
                    else {
                        let deviceTicketEnd = deviceTicket.indexOf("&", deviceTicketStart);
                        if (deviceTicketEnd == -1) {
                            deviceTicket = deviceTicket.substring(deviceTicketStart + 2);
                        }
                        else {
                            deviceTicket = deviceTicket.substring(deviceTicketStart + 2, deviceTicketEnd);
                        }
                    }
                    if (userTicketRedirectArgs.value && deviceTicket) {
                        userTicketRedirectArgs.value = userTicketRedirectArgs.value + "&d=" + deviceTicket;
                    }
                    this._navigator.redirect(userTicketRedirectArgs);
                }.bind(this));
            }.bind(this));
        }
        _close() {
            // CXH is ready to close right now, set the flag so that we can ignore any external unhandled exceptions at this point
            this._cxhReadyToClose = true;
            var cxhResult = (this._appResult !== CloudExperienceHost.AppResult.fail);
            let checkpointsEnabled = CloudExperienceHost.getNavMesh().checkpointsEnabled();
            if ((this._appResult === CloudExperienceHost.AppResult.success) && checkpointsEnabled) {
                CloudExperienceHost.Storage.SharableData.removeValue("resumeCXHId");
            }
            // Tear down listener for network status changes
            Windows.Networking.Connectivity.NetworkInformation.onnetworkstatuschanged = null;
            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().stop(this._appResult);
            CloudExperienceHost.StateManager.getInstance().clean();
            // Failures here are critical, hence we crash the app. For Oobe we hope the app will be restarted.
            try {
                if (this._resultsOperation != null) {
                    var valueSet = new Windows.Foundation.Collections.ValueSet();
                    valueSet.insert("Result", this._appResult);
                    this._resultsOperation.reportCompleted(valueSet);
                }
                else {
                    AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Synchronization").reportResult(cxhResult);
                    AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Synchronization").reportSubResult(this._appResult);
                }
                if (CloudExperienceHost.getContext().host.toLowerCase() === "frx") {
                    AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.AppEventNotificationManager").notifyOobeReadyStateChanged(false);
                }
                AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.AppEventNotificationManager").notifyAppFinished(cxhResult, this._appResult);
                if (this._navigator && this._navigator.getNavMesh() && this._navigator.getNavMesh().getNotifyOnLastFinished()) {
                    if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeFadeTransitions") && this._navigator.getNavMesh().endFadeTransition()) {
                        let blackOverlay = document.createElement('div');
                        blackOverlay.setAttribute('class', 'black-overlay');
                        document.body.appendChild(blackOverlay);
                        blackOverlay.classList.add('fade-in-overlay');
                        // Full-screen fade to black before allowing the app to exit intended for use of end OOBE -> FSIA, only in FRXINCLUSIVE flow
                        blackOverlay.addEventListener("animationend", () => {
                            AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Synchronization").onLastOOBEWebAppFinished(cxhResult, this._appResult);
                        });
                    }
                    else {
                        AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Synchronization").onLastOOBEWebAppFinished(cxhResult, this._appResult);
                    }
                    this._navManager.notifyEvent(CloudExperienceHost.NavigationEvent.LastWebAppFinished, undefined);
                    // Wait before closing the app in scenarios where app is launched near the end of logon.
                    // This provides time for the tray and other shell components to fully initialize before showing the Desktop.
                    if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeInEnduserSession")) {
                        if (this._navigator.getNavMesh().getWaitForTaskbarReady()) {
                            CloudExperienceHostAPI.Synchronization.waitForTaskbarReadyAsync(30000 /* timeoutMs */).then(() => {
                                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("WaitForTaskbarReady", "Success");
                                window.close();
                            }, (error) => {
                                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("WaitForTaskbarReadyFailed", CloudExperienceHost.GetJsonFromError(error));
                                window.close();
                            });
                        }
                    }
                }
                else {
                    window.close();
                }
            }
            catch (error) {
                AppManager.prototype.onUnhandledException = () => {
                    return null;
                };
                throw error;
            }
        }
        _getResultOperationForXbox() {
            var resultOperation = null;
            if (CloudExperienceHost.Environment.getPlatform() === CloudExperienceHost.TargetPlatform.XBOX) {
                try {
                    var tcuiContext = Windows.Xbox.UI.Internal.TCUIStateManager.getContext();
                    if (tcuiContext != null) {
                        resultOperation = new CloudExperienceHost.XboxTcuiContext(tcuiContext);
                    }
                }
                catch (e) {
                    // Log the error, but ignore it.  Technically, CXH should always be called
                    // via TCUI on the Xbox, but if we ever call it as a non-TCUI app, we
                    // don't want it to fail.
                    this.onUnhandledException(e);
                }
            }
            return resultOperation;
        }
    }
    AppManager._globalBridgeInstance = null;
    CloudExperienceHost.AppManager = AppManager;
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=appManager.js.map