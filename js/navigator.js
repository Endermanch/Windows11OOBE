//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
/// <reference path="error.ts" />
/// <reference path="discovery.ts" />
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    class Context {
    }
    CloudExperienceHost.Context = Context;
    class WebViewNavigatable {
    }
    CloudExperienceHost.WebViewNavigatable = WebViewNavigatable;
    class InvokeAPIHelper {
        invokeByName(apiName, args) {
            var namespaces = apiName.split(".");
            var func = namespaces.pop();
            var context = this._accessByNamespaces(namespaces);
            return context[func].apply(context, args);
        }
        accessByName(name) {
            var namespaces = name.split(".");
            return this._accessByNamespaces(namespaces);
        }
        _accessByNamespaces(namespaces) {
            var context = window;
            for (var i = 0; i < namespaces.length; i++) {
                context = context[namespaces[i]];
            }
            return context;
        }
    }
    CloudExperienceHost.InvokeAPIHelper = InvokeAPIHelper;
    var PagePropertiesEnum;
    (function (PagePropertiesEnum) {
        PagePropertiesEnum[PagePropertiesEnum["FeatureId"] = 0] = "FeatureId";
        PagePropertiesEnum[PagePropertiesEnum["FallbackPage"] = 1] = "FallbackPage";
    })(PagePropertiesEnum || (PagePropertiesEnum = {}));
    ;
    var PreloadCheckObjNameEnum;
    (function (PreloadCheckObjNameEnum) {
        PreloadCheckObjNameEnum[PreloadCheckObjNameEnum["FeatureId"] = 0] = "FeatureId";
        PreloadCheckObjNameEnum[PreloadCheckObjNameEnum["FallbackObjName"] = 1] = "FallbackObjName";
    })(PreloadCheckObjNameEnum || (PreloadCheckObjNameEnum = {}));
    ;
    var BackNavigationStatus;
    (function (BackNavigationStatus) {
        BackNavigationStatus[BackNavigationStatus["Unknown"] = 0] = "Unknown";
        BackNavigationStatus[BackNavigationStatus["Disabled"] = 1] = "Disabled";
        BackNavigationStatus[BackNavigationStatus["Enabled"] = 2] = "Enabled";
    })(BackNavigationStatus || (BackNavigationStatus = {}));
    ;
    const aboutBlankURI = "about:blank";
    class Navigator {
        constructor(view, contractHandler, navManager) {
            this._visitedNodeStack = [];
            this._backNavigationStatusForNextTransition = BackNavigationStatus.Unknown;
            this._currentNavigationId = 0;
            this._redirectForPostTicketInterrupt = false;
            this._listeners = new Object;
            this._view = view;
            this._contractHandler = contractHandler;
            this._view.addEventListener("MSWebViewNavigationStarting", this._navigationStarting.bind(this));
            this._view.addEventListener("MSWebViewNavigationCompleted", this._navigationCompleted.bind(this));
            this._invokeHelper = new InvokeAPIHelper();
            this._navigatePromiseFunc = null;
            this._navManager = navManager;
            this._navManager.registerNavigator(this);
            this._navigationInterruptExpected = false;
            this._navigationTimerPromise = null;
            this._headersMap = new Map();
        }
        _fireEvent(errorName, e) {
            var listeners = this._listeners[errorName];
            if (listeners) {
                listeners.map(function (listener) {
                    listener.call(this, e);
                }.bind(this));
            }
        }
        _fireErrorEvent(e) {
            this._fireEvent("Error", e);
        }
        _topOfVisitedNodeStack() {
            if (this._visitedNodeStack.length == 0) {
                return "";
            }
            else {
                return this._visitedNodeStack[this._visitedNodeStack.length - 1].cxid;
            }
        }
        _clearVisitedNodeStack() {
            while (this._visitedNodeStack.length != 0) {
                this._visitedNodeStack.pop();
            }
        }
        _navigationStarting(e) {
            if (CloudExperienceHostAPI.FeatureStaging.isOobeFeatureEnabled("AADPinResetV2")) {
                let convertMsAppxWebNavigationToPrivateData = this._navMesh.getConvertMsAppxWebNavigationToPrivateData();
                if (convertMsAppxWebNavigationToPrivateData !== undefined) {
                    let navUri = new Windows.Foundation.Uri(e.uri);
                    // For above lock screen scenarios where "ms-appx-web" hosts are unavailable, interrupt the navigation to the specified host.
                    if ((navUri.schemeName === "ms-appx-web") && (navUri.host === convertMsAppxWebNavigationToPrivateData.hostToInterrupt)) {
                        // This behavior is copied from CloudExperienceHost.AppManager._onUnsupportedUriSchemeIdentified for scheme navigations that are unavailable in certain scenarios.
                        // Cache the payload locally for later retrieval when the relevant web content's relevant JS eventually loads
                        // http://osgvsowi/10484753 ms-aadj-redir protocol activation produces a fragment (#name=value) instead of query string (?name=value)
                        // For now we work around this by preferring the query string if available, but falling back to the fragment otherwise
                        let payload = (navUri.query !== "") ? navUri.query : navUri.fragment;
                        if ((convertMsAppxWebNavigationToPrivateData.privateKeyName !== undefined) && (payload !== "")) {
                            CloudExperienceHost.Storage.PrivateData.addItem(convertMsAppxWebNavigationToPrivateData.privateKeyName, payload);
                        }
                        e.preventDefault();
                        this.setNavigationInterruptExpected();
                        this._navigateToCurrentNode().done();
                        return;
                    }
                }
            }
            if (this._navMesh.getRestrictNavigationToAllowList() && (e.uri !== aboutBlankURI) && (this._currentNode.cxid !== this._navMesh.getErrorNodeName())) {
                let blockedNavOutstanding = (CloudExperienceHost.Storage.VolatileSharableData.getItem("NavigationAccessPolicyValues", "blockedNavigationInstanceOutstanding") === true); // boolify the result in case it was undefined
                if (blockedNavOutstanding) {
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NavigationBlockedHandlingInProgress", JSON.stringify({
                        uri: CloudExperienceHost.UriHelper.RemovePIIFromUri(e.uri)
                    }));
                    e.preventDefault();
                }
                else if (!CloudExperienceHostAPI.UtilStaticsCore.isWebSignInNavigationAllowed(e.uri)) {
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NavigationBlocked", JSON.stringify({
                        uri: CloudExperienceHost.UriHelper.RemovePIIFromUri(e.uri)
                    }));
                    e.preventDefault();
                    CloudExperienceHost.Storage.VolatileSharableData.addItem("NavigationAccessPolicyValues", "blockedNavigationInstanceOutstanding", true);
                    CloudExperienceHost.Storage.VolatileSharableData.addItem("NavigationAccessPolicyValues", "blockedNavigationUri", CloudExperienceHost.UriHelper.RemovePIIFromUri(e.uri));
                    let err = new WebViewNavigatable();
                    err.webErrorStatus = Windows.Web.WebErrorStatus.operationCanceled;
                    err.isSuccess = false;
                    err.uri = e.uri;
                    this._navigationCompleted(err);
                }
            }
        }
        _navigationCompleted(e) {
            this._stopNavigationTimer();
            // Regardless of whether navigation failed, call _clearWebViewCompletion() if we're navigating to the about:blank URI
            if (e.uri == aboutBlankURI) {
                Debug.assert(this._clearWebViewCompletion, "_clearWebViewCompletion should be defined before navigating to about:blank");
                if (this._clearWebViewCompletion) {
                    let localClearWebViewCompletion = this._clearWebViewCompletion;
                    this._clearWebViewCompletion = null;
                    localClearWebViewCompletion();
                }
                return;
            }
            if (e.isSuccess === true) {
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NavigationSucceed", JSON.stringify({
                    webErrorStatus: e.webErrorStatus,
                    uri: CloudExperienceHost.UriHelper.RemovePIIFromUri(e.uri)
                }));
                this._fireEvent("NavigationCompleted", this._currentNode);
                if (this._navMesh.isBackstackForBackNavigationSupported()) {
                    // Show back button only if there is some back navigable node in the backstack
                    this._navManager.setWebAppBackNavigationAvailability(this._visitedNodeStack.length != 0);
                }
                this._navManager.setDisableBackNavigation(false);
                if (this._navMesh.isCloseToExitCxhSupported()) {
                    // Show close button if useCloseToExitCxh is set in the navmesh
                    this._navManager.setExitCxhAvailability(true);
                }
            }
            else if (!this._navigationInterruptExpected) {
                this._redirectForPostTicketInterrupt = false; // Clear redirect state on navigation failure
                var hasInternetAccess = CloudExperienceHost.Environment.hasInternetAccess();
                var navigationBlocked = this._navMesh.getRestrictNavigationToAllowList() &&
                    (CloudExperienceHost.Storage.VolatileSharableData.getItem("NavigationAccessPolicyValues", "blockedNavigationInstanceOutstanding") === true); // boolify the result in case it was undefined
                // Since it's known that 'e.isSuccess != True'
                // Treat all non-expected webErrorStatus as the scenario not being able to communicate with the server
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NavigationFailed", JSON.stringify({
                    webErrorStatus: e.webErrorStatus,
                    uri: CloudExperienceHost.UriHelper.RemovePIIFromUri(e.uri),
                    hasInternetAccess: hasInternetAccess,
                    isServerOffline: !navigationBlocked
                }));
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("IsNetworkConnected_NavigationFailed", hasInternetAccess);
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NetworkConnectivityLevel_NavigationFailed", CloudExperienceHost.Wireless.getConnectivityLevel());
                // Clear webview when the navigation fails
                this.clearWebView();
                if (!navigationBlocked) {
                    let failedNavCxid = this._currentNode.cxid;
                    var offlineID = this._currentNode.offlineID;
                    // Check if this scenario has a reconnect handler cxid and if we need to do in-place resume
                    let reconnectHandlerCxid = this.getNavMesh().getReconnectHandlerCxid();
                    if (reconnectHandlerCxid && this._isInplaceResumeNeeded()) {
                        CloudExperienceHost.Storage.VolatileSharableData.addItem("InPlaceResumeValues", "volatileResumeCxid", this._currentNode.cxid); // Store the resume cxid in memory
                        CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("ReconnectHandled", reconnectHandlerCxid);
                        this._currentNode = this._navMesh.getNode(reconnectHandlerCxid);
                    }
                    else if (offlineID) {
                        this._currentNode = this._navMesh.getNode(offlineID);
                    }
                    try {
                        // call to reprobe networking stack to re-evaluate the connectivity level so we can accurately differentiate network failures from other types of navigation failures.
                        CloudExperienceHostAPI.UtilStaticsCore.indicateNetworkReprobe();
                        CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("indicateNetworkReprobeSuccess");
                    }
                    catch (ex) {
                        CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("indicateNetworkReprobeFailed", CloudExperienceHost.GetJsonFromError(ex));
                    }
                    // Navigate to the node specified by the reconnect handler or offlineID
                    // If neither of these exist for the current node and scenario, _currentNode will not have changed-
                    // explicitly check for this to avoid an infinite navigation loop
                    if (this._currentNode && (this._currentNode.cxid !== failedNavCxid)) {
                        CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().stop(CloudExperienceHost.AppResult.fail);
                        this._navigateToCurrentNode().done();
                        return;
                    }
                }
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().stop(CloudExperienceHost.AppResult.fail);
                this._fireErrorEvent(new CloudExperienceHost.NavigationError(e.webErrorStatus, e.uri, this._currentNode));
            }
            else {
                this._redirectForPostTicketInterrupt = false; // Clear redirect state on navigation failure
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("ExpectedNavigationInterruptOccurred");
            }
            this._navigationInterruptExpected = false;
        }
        _getEncoding() {
            var encoding = Windows.Storage.Streams.UnicodeEncoding.utf8;
            if (this._currentNode.encoding) {
                switch (this._currentNode.encoding.toLowerCase()) {
                    case "utf8":
                        encoding = Windows.Storage.Streams.UnicodeEncoding.utf8;
                        break;
                    case "utf16le":
                        encoding = Windows.Storage.Streams.UnicodeEncoding.utf16LE;
                        break;
                    case "utf16be":
                        encoding = Windows.Storage.Streams.UnicodeEncoding.utf16BE;
                        break;
                    default:
                        encoding = Windows.Storage.Streams.UnicodeEncoding.utf8;
                        break;
                }
            }
            return encoding;
        }
        _createHttpRequestMessage(httpMethod, url, queryString) {
            var qs = "";
            if (queryString) {
                if (url.indexOf('?') === -1) {
                    qs = '?';
                }
                else {
                    qs = '&';
                }
                qs = qs + queryString;
            }
            var uri = new Windows.Foundation.Uri(url + qs);
            return new Windows.Web.Http.HttpRequestMessage(httpMethod, uri);
        }
        _getQueryString() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                if (this._currentNode.queryStringBuilder) {
                    this._contractHandler.invokeFromString(this._currentNode.url, this._currentNode.queryStringBuilder, null).then(function (result) {
                        completeDispatch(result);
                    }.bind(this), errorDispatch.bind(this));
                }
                else {
                    completeDispatch(null);
                }
            }.bind(this));
        }
        _appendHttpHeaderWithFallback(httpRequestMessage, name, value) {
            try {
                httpRequestMessage.headers.append(name, value);
            }
            catch (e) {
                // Use a fallback value of "???" - this ensures there is always some RFC 7230 compliant value available
                // for the header on the server side. We do not want to take any other dependencies on RFC 7230 or how
                // other components choose to interpret that standard. Words were also avoided to sidestep any
                // localization concerns.
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("HeaderAppendFailure", CloudExperienceHost.GetJsonFromError(e));
                httpRequestMessage.headers.append(name, "???");
            }
        }
        _appendCustomHeaders(httpRequestMessage, contextHeaders) {
            this._appendHttpHeaderWithFallback(httpRequestMessage, "hostApp", "CloudExperienceHost");
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-hostAppVersion", CloudExperienceHost.getVersion().toString());
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-osVersionInfo", JSON.stringify(CloudExperienceHostAPI.Environment.osVersionInfo));
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-msaBinaryVersion", CloudExperienceHostAPI.Environment.msaBinaryVersion);
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-osPlatform", CloudExperienceHost.Environment.getPlatform());
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-preferredLanguage", CloudExperienceHost.Globalization.Language.getPreferredLang());
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-region", CloudExperienceHost.Globalization.GeographicRegion.getCode().toLowerCase());
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-isRTL", (CloudExperienceHost.Globalization.Language.getReadingDirection() === "rtl").toString());
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-cxid", this._currentNode.cxid);
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-identityClientBinaryVersion", CloudExperienceHostAPI.Environment.identityClientBinaryVersion);
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("Feature_ExpeditedUpdatePILess")) {
                this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-osRevision", JSON.stringify(CloudExperienceHostAPI.Environment.osRevision));
            }
            this._headersMap.forEach(function (item, key, mapObj) {
                this._appendHttpHeaderWithFallback(httpRequestMessage, key, item);
            }.bind(this));
            // OSGVSO 2740290 - Update CXH to public cross-platform Colors API http://osgvso/_workitems/edit/2740290
            if (CloudExperienceHost.Environment.getPlatform() === CloudExperienceHost.TargetPlatform.DESKTOP) {
                var themeColors = CloudExperienceHost.Styling.getThemeColors();
                var cxhColors = "";
                Object.keys(themeColors).forEach(function (colorKey) {
                    cxhColors += colorKey + "=" + themeColors[colorKey] + ";";
                });
                this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-colors", cxhColors);
            }
            var context = CloudExperienceHost.getContext();
            for (var key in context) {
                if (context[key]) {
                    this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-" + key, context[key]);
                }
            }
            // Append the Tailored Experiences privacy setting
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-tailoredExperiencesEnabled", CloudExperienceHostAPI.ContentDeliveryManagerHelpers.tailoredExperiencesEnabled.toString());
            // Per-scenario custom headers
            let scenarioCustomHeaders = this._navMesh.getScenarioCustomHeaders();
            if (scenarioCustomHeaders.length > 0) {
                scenarioCustomHeaders = scenarioCustomHeaders.map(function (ele) { return ele.toLowerCase(); }); // Convert the custom headers array to lowercase for case-insensitive comparisons
                let daysSinceFirstLogonHeaderName = "cxh-daysSinceFirstLogon";
                if (scenarioCustomHeaders.indexOf(daysSinceFirstLogonHeaderName.toLowerCase()) > -1) {
                    let daysSinceFirstLogonRef = CloudExperienceHostAPI.UtilStaticsCore.daysSinceFirstLogon;
                    if (daysSinceFirstLogonRef != null) {
                        this._appendHttpHeaderWithFallback(httpRequestMessage, daysSinceFirstLogonHeaderName, daysSinceFirstLogonRef.toString());
                    }
                }
                let daysSinceFirstLogonOnCurrentInstallationHeaderName = "cxh-daysSinceFirstLogonOnCurrentInstallation";
                if (scenarioCustomHeaders.indexOf(daysSinceFirstLogonOnCurrentInstallationHeaderName.toLowerCase()) > -1) {
                    let daysSinceFirstLogonOnCurrentInstallationRef = CloudExperienceHostAPI.UtilStaticsCore.daysSinceFirstLogonOnCurrentInstallation;
                    if (daysSinceFirstLogonOnCurrentInstallationRef != null) {
                        this._appendHttpHeaderWithFallback(httpRequestMessage, daysSinceFirstLogonOnCurrentInstallationHeaderName, daysSinceFirstLogonOnCurrentInstallationRef.toString());
                    }
                }
                let oobeNetworkStateHeaderName = "cxh-oobeNetworkState";
                if (scenarioCustomHeaders.indexOf(oobeNetworkStateHeaderName.toLowerCase()) > -1) {
                    let oobeNetworkStateRef = CloudExperienceHostAPI.UtilStaticsCore.oobeNetworkState;
                    if (oobeNetworkStateRef != null) {
                        this._appendHttpHeaderWithFallback(httpRequestMessage, oobeNetworkStateHeaderName, oobeNetworkStateRef.toString());
                    }
                }
                let scoobeLaunchInstanceHeaderName = "cxh-scoobeLaunchInstance";
                if (scenarioCustomHeaders.indexOf(scoobeLaunchInstanceHeaderName.toLowerCase()) > -1) {
                    let scoobeLaunchInstanceObj = CloudExperienceHost.ScoobeContextHelper.tryGetScoobeLaunchInstance();
                    if (scoobeLaunchInstanceObj.succeeded) {
                        this._appendHttpHeaderWithFallback(httpRequestMessage, scoobeLaunchInstanceHeaderName, scoobeLaunchInstanceObj.scoobeLaunchInstance.toString());
                    }
                }
            }
            // Append a breadcrumb to inform the webapp about whether or not it will need to manually fire Visible on completion of intra-webapp redirections, once UI is ready to display
            this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-intraWebAppVisibility", (this._currentNode.intraWebAppVisibility == null) ? "true" : this._currentNode.intraWebAppVisibility.toString());
            // Per-node custom headers
            if (this._currentNode.needCustomHeaders) {
                let perNodeCustomHeaders = this._currentNode.needCustomHeaders.map(function (ele) { return ele.toLowerCase(); }); // Convert the custom headers array to lowercase for case-insensitive comparisons
                // Note: despite the name, this is the 4x5 product activation ID.  This name needs to be used for server webapp compatibility with previous versions of Windows.
                let windowsProductKeyHeaderName = "cxh-windowsProductKey";
                if (perNodeCustomHeaders.indexOf(windowsProductKeyHeaderName.toLowerCase()) > -1) {
                    this._appendHttpHeaderWithFallback(httpRequestMessage, windowsProductKeyHeaderName, CloudExperienceHostAPI.UtilStaticsCore.productActivationId);
                }
                let windowsProductKeyFiveByFiveHeaderName = "cxh-windowsProductKeyFiveByFive";
                if (perNodeCustomHeaders.indexOf(windowsProductKeyFiveByFiveHeaderName.toLowerCase()) > -1) {
                    this._appendHttpHeaderWithFallback(httpRequestMessage, windowsProductKeyFiveByFiveHeaderName, CloudExperienceHostAPI.UtilStaticsCore.windowsProductKey);
                }
                let windowsTelemetryLevelHeaderName = "cxh-windowsTelemetryLevel";
                if (perNodeCustomHeaders.indexOf(windowsTelemetryLevelHeaderName.toLowerCase()) > -1) {
                    this._appendHttpHeaderWithFallback(httpRequestMessage, windowsTelemetryLevelHeaderName, CloudExperienceHostAPI.OobeSettingsManagerStaticsCore.getTelemetryLevel().toString());
                }
            }
            if (CloudExperienceHost.Telemetry.WebAppTelemetry != null) {
                this._appendHttpHeaderWithFallback(httpRequestMessage, "client-request-id", CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().getId());
                this._appendHttpHeaderWithFallback(httpRequestMessage, "cxh-correlationId", CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().getId());
            }
            if (typeof (contextHeaders) !== 'undefined' && contextHeaders !== null) {
                for (var iterator = contextHeaders.first(); iterator.hasCurrent; iterator.moveNext()) {
                    // Add context headers to httpRequestMessage headers, but don't overwrite any
                    // existing properties.
                    if (!httpRequestMessage.headers.hasKey(iterator.current.key)) {
                        this._appendHttpHeaderWithFallback(httpRequestMessage, iterator.current.key, iterator.current.value);
                    }
                }
            }
        }
        _addDataToRequest(httpRequestMessage, key, value) {
            if (httpRequestMessage.method === Windows.Web.Http.HttpMethod.get) {
                if (!key) {
                    throw new CloudExperienceHost.InvalidArgumentError("key cannot be empty for GET request");
                }
                this._appendHttpHeaderWithFallback(httpRequestMessage, key, value);
            }
            else {
                var content = !!key ? (key + "=" + value) : value;
                var contentType = this._currentNode.contentType || "application/x-www-form-urlencoded";
                httpRequestMessage.content = new Windows.Web.Http.HttpStringContent(content, this._getEncoding(), contentType);
            }
        }
        _initializeRequest(httpRequestMessage) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                this._appendCustomHeaders(httpRequestMessage);
                if (this._currentNode.initialize) {
                    this._contractHandler.invokeFromString(this._currentNode.url, this._currentNode.initialize.getData, null).then(function (result) {
                        if (result !== null && result !== "") {
                            this._addDataToRequest(httpRequestMessage, this._currentNode.initialize.key, result);
                        }
                        completeDispatch(httpRequestMessage);
                    }.bind(this), errorDispatch.bind(this));
                }
                else {
                    completeDispatch(httpRequestMessage);
                }
            }.bind(this));
        }
        _startLauncher(LauncherClass, completeDispatch) {
            try {
                let launcherInstance = new LauncherClass();
                let expectedCurrentCxid = this._currentNode.cxid;
                let expectedNavigationId = this._currentNavigationId;
                if (launcherInstance.launchAsyncWithNavigationCompletedCallback) {
                    var launcherNavigationCompletedFunc = function (e) {
                        this._navigationCompleted(e);
                    }.bind(this);
                    var launchArguments = null;
                    if (this._currentNode.hostedApplicationLaunchArguments) {
                        launchArguments = this._invokeHelper.invokeByName(this._currentNode.hostedApplicationLaunchArguments, null);
                        this._clearVisitedNodeStack();
                    }
                    launcherInstance.launchAsyncWithNavigationCompletedCallback(this._currentNode, launchArguments, launcherNavigationCompletedFunc).done((appResult) => {
                        if (this._currentNavigationId === expectedNavigationId) {
                            this._fireEvent("Done", appResult);
                        }
                        else {
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("LauncherLateNavigationIgnored", JSON.stringify({
                                launcherCxid: expectedCurrentCxid, currentCxid: this._currentNode.cxid,
                                expectedNavigationId: expectedNavigationId, currentNavigationId: this._currentNavigationId
                            }));
                        }
                    });
                }
                else {
                    // Launchers don't actually navigate the webview, so fire "NavigationCompleted" before executing them
                    // This ensures the AppManager is operating over the correct _currentNode
                    this._fireEvent("NavigationCompleted", this._currentNode);
                    launcherInstance.launchAsync(this._currentNode).done((appResult) => {
                        if (this._currentNavigationId === expectedNavigationId) {
                            this._fireEvent("Done", appResult);
                        }
                        else {
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("LauncherLateNavigationIgnored", JSON.stringify({
                                launcherCxid: expectedCurrentCxid, currentCxid: this._currentNode.cxid,
                                expectedNavigationId: expectedNavigationId, currentNavigationId: this._currentNavigationId
                            }));
                        }
                    });
                }
                completeDispatch();
            }
            catch (e) {
                completeDispatch();
                this._fireEvent("Done", CloudExperienceHost.AppResult.fail);
            }
        }
        _startNavigationTimer() {
            let timeout = 90000; // 90 seconds
            if (this._currentNode.navigationTimeout) {
                timeout = this._currentNode.navigationTimeout;
            }
            this._stopNavigationTimer();
            this._navigationTimerPromise = WinJS.Promise.timeout(timeout).then(() => {
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NavigationTimedout");
                this._view.stop();
                let e = new WebViewNavigatable();
                e.webErrorStatus = Windows.Web.WebErrorStatus.timeout;
                e.isSuccess = false;
                e.uri = this._currentNode.url;
                this._navigationCompleted(e);
            }, (err) => {
                Debug.log(err);
            });
        }
        _stopNavigationTimer() {
            // Cancel navigation timeout
            if (this._navigationTimerPromise) {
                this._navigationTimerPromise.cancel();
                this._navigationTimerPromise = null;
            }
        }
        _navigatePromiseImpl(completeDispatch, errorDispatch) {
            if (this._currentNode == null) {
                // Fire the done event if we somehow end up here with a null current node
                this._fireEvent("Done", CloudExperienceHost.AppResult.success);
            }
            else if (this._currentNode && this._currentNode.launcher) {
                this._fireEvent("NavigationStarting", this._currentNode);
                this.navigateByLauncher(this._currentNode.launcher, completeDispatch);
            }
            else {
                this._fireEvent("NavigationStarting", this._currentNode);
                this._nextNode = null;
                this._getQueryString()
                    .then(function (qs) {
                    var httpMethod = ((this._currentNode.httpMethod === 'post') ? Windows.Web.Http.HttpMethod.post : Windows.Web.Http.HttpMethod.get);
                    var targetUri = this._currentNode.url;
                    // Handle dynamic URI targets if urlPathParam is specified in the navigation node
                    if (this._currentNode.urlPathParam) {
                        var pathParamName = this._currentNode.urlPathParam;
                        var fragment = this._navMesh.getUriArguments().getFirstValueByName(pathParamName); // throws if not exists
                        var winUri = new Windows.Foundation.Uri(targetUri, fragment);
                        targetUri = winUri.absoluteCanonicalUri;
                    }
                    return this._createHttpRequestMessage(httpMethod, targetUri, qs);
                }.bind(this))
                    .then(function (httpRequestMessage) {
                    return this._initializeRequest(httpRequestMessage);
                }.bind(this))
                    .then(function (httpRequestMessage) {
                    // Note: allowlist entries should case-sensitively match the corresponding header values
                    var allowlist = [
                        'requestUri',
                        'method',
                        'headers',
                        'cxh-osVersionInfo',
                        'platformId',
                        'majorVersion',
                        'minorVersion',
                        'buildNumber',
                        'cxh-msaBinaryVersion',
                        'hostApp',
                        'client-request-id',
                        'cxh-protocol',
                        'cxh-cxid',
                        'cxh-preferredLanguage',
                        'cxh-region',
                        'cxh-identityClientBinaryVersion',
                        'cxh-correlationId',
                        //'cxh-source',  explicit block to avoid sending query string
                        'cxh-machineModel',
                        'cxh-manufacturer',
                        'cxh-osPlatform',
                        'cxh-personality',
                        'cxh-platform',
                        'cxh-windowsProductId',
                        'cxh-edition',
                        'cxh-isRTL',
                        'cxh-colors',
                        'cxh-host',
                        'cxh-hostAppVersion',
                        'cxh-capabilities',
                        'cxh-launchSurface',
                        'cxh-windowsTelemetryLevel',
                        'cxh-windowsFlightData',
                        'cxh-tailoredExperiencesEnabled',
                        'cxh-daysSinceFirstLogon',
                        'cxh-daysSinceFirstLogonOnCurrentInstallation',
                        'cxh-oobeNetworkState',
                        'cxh-scoobeLaunchInstance',
                        'cxh-intraWebAppVisibility',
                        'cxh-osRevision'
                    ];
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NavigationStarted", JSON.stringify({
                        requestUri: httpRequestMessage.requestUri, method: httpRequestMessage.method, headers: httpRequestMessage.headers
                    }, allowlist));
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("IsNetworkConnected_NavigationStarted", CloudExperienceHost.Environment.hasInternetAccess());
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NetworkConnectivityLevel_NavigationStarted", CloudExperienceHost.Wireless.getConnectivityLevel());
                    this._startNavigationTimer();
                    this._view.navigateWithHttpRequestMessage(httpRequestMessage);
                    completeDispatch();
                }.bind(this))
                    .then(null, function (err) {
                    // This is the error handler for any failures or exceptions in the promise chain above
                    // Fire a navigation error event to inform app manager of the navigation failure, enabling it to proceed to the next node/recovery step
                    this._fireErrorEvent(new CloudExperienceHost.NavigationError(err.number, this._currentNode.url, this._currentNode, "An error occurred preparing to navigate to node '" + this._currentNode.cxid + "': " + err.message));
                    // since we 'handled' the error, call completeDispatch() instead of errorDispatch()
                    completeDispatch();
                }.bind(this));
            }
        }
        _getSignInIdentityProviderShortName() {
            let name = "none";
            switch (CloudExperienceHost.IUserManager.getInstance().getSignInIdentityProvider()) {
                case CloudExperienceHostAPI.SignInIdentityProviders.local:
                    name = "local";
                    break;
                case CloudExperienceHostAPI.SignInIdentityProviders.msa:
                    name = "msa";
                    break;
                case CloudExperienceHostAPI.SignInIdentityProviders.aad:
                    name = "aad";
                    break;
                default:
                    break;
            }
            return name;
        }
        _isSignInIdentityProviderInList(providerList) {
            let result = false;
            let providerName = this._getSignInIdentityProviderShortName();
            for (let i = 0; !result && (i < providerList.length); i++) {
                result = (providerName === providerList[i].toLowerCase());
            }
            return result;
        }
        _navigateToCurrentNode() {
            this._stopNavigationTimer();
            // Telemetry: WebApp start. Except if we're processing an Expected Navigation Interruption from uri schema e.g. ms-aadj-redir
            if (!this._navigationInterruptExpected) {
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().start(this._currentNode ? this._currentNode.cxid : "null");
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("IsNetworkConnected_WebAppActivityStarted", CloudExperienceHost.Environment.hasInternetAccess());
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("NetworkConnectivityLevel_WebAppActivityStarted", CloudExperienceHost.Wireless.getConnectivityLevel());
            }
            this._currentNavigationId++;
            var navigatePromiseFunc = this._navigatePromiseFunc ? this._navigatePromiseFunc : this._navigatePromiseImpl.bind(this);
            if (this._currentNode) {
                let skipPromise = WinJS.Promise.as(false);
                var appResult = CloudExperienceHost.AppResult.success;
                try {
                    let skip = false;
                    // Check if the node is on the (server-side) webapp-supplied skip list.
                    let skipListJson = CloudExperienceHost.Storage.SharableData.getValue("skipList_" + CloudExperienceHost.getContext().experienceName);
                    if (skipListJson) {
                        let skipList = JSON.parse(skipListJson);
                        if (Array.isArray(skipList)) {
                            skipList.forEach(function (skipCxid) {
                                if (this._currentNode.cxid && (typeof (skipCxid) === "string") && (skipCxid.toLowerCase() === this._currentNode.cxid.toLowerCase())) {
                                    skip = true;
                                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("DisabledBySkipList", this._currentNode.cxid);
                                }
                            });
                        }
                    }
                    // Skip if the feature is disabled
                    if (!skip && (this._currentNode.requiredFeatureName && !CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled(this._currentNode.requiredFeatureName))) {
                        skip = true;
                    }
                    // Skip if the feature is enabled
                    if (!skip && (this._currentNode.requiredDisabledFeatureName && CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled(this._currentNode.requiredDisabledFeatureName))) {
                        skip = true;
                    }
                    // Skip if current signin identity provider is unsupported
                    if (!skip && this._currentNode.supportedSignInIdentityProviders) {
                        skip = !this._isSignInIdentityProviderInList(this._currentNode.supportedSignInIdentityProviders);
                    }
                    // If internet is required on the web app, skip it if there is no internet
                    if (!skip && (this._currentNode.internetRequired && !CloudExperienceHost.Environment.hasInternetAccess())) {
                        // Check if this scenario has a reconnect handler cxid and if we need to do in-place resume
                        let reconnectHandlerCxid = this.getNavMesh().getReconnectHandlerCxid();
                        if (reconnectHandlerCxid && this._isInplaceResumeNeeded()) {
                            CloudExperienceHost.Storage.VolatileSharableData.addItem("InPlaceResumeValues", "volatileResumeCxid", this._currentNode.cxid); // Store the resume cxid in memory
                            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("ReconnectHandled", reconnectHandlerCxid);
                            appResult = reconnectHandlerCxid;
                        }
                        else {
                            appResult = CloudExperienceHost.AppResult.offline;
                        }
                        skip = true;
                    }
                    if (!skip && this._currentNode.preloadCheck) {
                        // preloadCheck in nav mesh defines the name of a static WinRT object.
                        // We look for shouldSkip (property) or getShouldSkipAsync (method) on this.
                        let skipInterface = this._invokeHelper.accessByName(this._currentNode.preloadCheck);
                        if (skipInterface.getShouldSkipAsync) {
                            Debug.assert(skipInterface.shouldSkip === undefined, "Preload interface should only specify one of shouldSkip or shouldSkipAsync");
                            skipPromise = skipInterface.getShouldSkipAsync();
                        }
                        else if (skipInterface.shouldSkip !== undefined) {
                            skipPromise = WinJS.Promise.as(skipInterface.shouldSkip);
                        }
                        else {
                            Debug.break("Invalid preloadCheck value provided");
                        }
                    }
                    else {
                        skipPromise = WinJS.Promise.as(skip);
                    }
                }
                catch (e) {
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("PreloadCheckError", JSON.stringify({ cxid: this._currentNode.cxid, preloadCheck: this._currentNode.preloadCheck, error: CloudExperienceHost.GetJsonFromError(e) }));
                }
                skipPromise = skipPromise.then(null, (e) => {
                    // If a preloadCheck hits an error, log the offender, then convert to success with appropriate result based on the node's preloadCheckSkipOnFailure value
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("PreloadCheckAsyncError", JSON.stringify({ cxid: this._currentNode.cxid, preloadCheck: this._currentNode.preloadCheck, error: CloudExperienceHost.GetJsonFromError(e) }));
                    return WinJS.Promise.as(!!this._currentNode.preloadCheckSkipOnFailure);
                });
                return skipPromise.then((skip) => {
                    if (skip === true) {
                        // Check if this node blocks back navigation, if so clear the list of previously visited nodes
                        if (this._currentNode.disableBackNavigationToNode) {
                            this._clearVisitedNodeStack();
                        }
                        // Webapps that are skipped without being loaded (due to preloadCheck or
                        // required feature properties) can optionally supply a preloadSkipID for
                        // that scenario. When provided, change the appResult to ensure it is used.
                        // Otherwise, the skip is treated as success, and the next navigation will
                        // be to the successID of the node.
                        //
                        // Exception: Do not override the "offline" result, which has its own offlineID.
                        if (this._currentNode.preloadSkipID && (appResult != CloudExperienceHost.AppResult.offline)) {
                            appResult = CloudExperienceHost.AppResult.preloadSkip;
                        }
                        // Change appResult if skipping should exit CXH. This overrides all other results.
                        if (this._navMesh.blockEarlyExit() && this._currentNode.canExitCxh && this._currentNode.skipExitsCxh) {
                            appResult = CloudExperienceHost.AppResult.exitCxhSuccess;
                        }
                        // Move on to the next web app
                        this._nextNode = this._getNext(appResult);
                        if (this._nextNode) {
                            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().stop(appResult);
                            this._currentNode = this._nextNode;
                            this._resumeNode = this._currentNode;
                            this._navigateToCurrentNode().done();
                        }
                        else {
                            // Fire the done event if we reach the end of the scenario
                            this._fireEvent("Done", appResult);
                        }
                    }
                    else {
                        // Clear backstack if the webapp we're navigating to blocks navigation from it
                        this._clearBackstackIfReturnFromCurrentNodeDisallowed();
                        // Navigate to the current web app
                        return new WinJS.Promise(navigatePromiseFunc);
                    }
                });
            }
            else {
                // Clear backstack if the webapp we're navigating to blocks navigation from it
                this._clearBackstackIfReturnFromCurrentNodeDisallowed();
                // Navigate to the current web app
                return new WinJS.Promise(navigatePromiseFunc);
            }
        }
        _getNext(appResult) {
            var node;
            if (this._currentNode) {
                switch (appResult) {
                    case CloudExperienceHost.AppResult.success:
                        node = this._navMesh.getNode(this._currentNode.successID);
                        // Certain nodes disable back navigation only on success, prevent back navigation
                        // for such nodes if they were visible
                        if (this._currentNode.disableBackNavigationToNodeOnSuccess &&
                            (this._backNavigationStatusForNextTransition !== BackNavigationStatus.Unknown)) {
                            this._backNavigationStatusForNextTransition = BackNavigationStatus.Disabled;
                        }
                        if (this._navMesh.checkpointsEnabled() && this._currentNode.checkpointOnSuccess) {
                            CloudExperienceHost.Storage.SharableData.addValue("resumeCXHId", this._currentNode.successID);
                        }
                        break;
                    case CloudExperienceHost.AppResult.fail:
                        node = this._navMesh.getNode(this._currentNode.failID);
                        break;
                    case CloudExperienceHost.AppResult.error:
                        // If a node has explicitly disabled error page it should never 
                        // send out an appresult of error, this is for safety
                        if (this._currentNode.disableErrorPageOnFailure && this._currentNode.failID) {
                            node = this._navMesh.getNode(this._currentNode.failID);
                        }
                        else {
                            node = this._navMesh.getErrorNode();
                        }
                        break;
                    case CloudExperienceHost.AppResult.cancel:
                        node = this._navMesh.getNode(this._currentNode.cancelID);
                        break;
                    case CloudExperienceHost.AppResult.abort:
                        node = this._navMesh.getNode(this._currentNode.abortID);
                        break;
                    case CloudExperienceHost.AppResult.offline:
                        node = this._navMesh.getNode(this._currentNode.offlineID);
                        break;
                    case CloudExperienceHost.AppResult.preloadSkip:
                        node = this._navMesh.getNode(this._currentNode.preloadSkipID);
                        break;
                    case CloudExperienceHost.AppResult.action1:
                        node = this._navMesh.getNode(this._currentNode.action1ID);
                        break;
                    case CloudExperienceHost.AppResult.action2:
                        node = this._navMesh.getNode(this._currentNode.action2ID);
                        break;
                    case CloudExperienceHost.AppResult.action3:
                        node = this._navMesh.getNode(this._currentNode.action3ID);
                        break;
                    case CloudExperienceHost.AppResult.exitCxhFailure:
                    case CloudExperienceHost.AppResult.exitCxhSuccess:
                        // Direct to designated exit page if one exists, otherwise, CXH should exit
                        node = this._navMesh.getNode(this._currentNode.exitID);
                        break;
                    default:
                        {
                            node = this._navMesh.getNode(appResult);
                            if (!node) {
                                node = this._navMesh.getNode(this._currentNode.failID);
                            }
                            break;
                        }
                }
            }
            return node;
        }
        // Function called right before navigating to a node.
        // If the node does not allow navigation to previous nodes, the visited node stack is cleared.
        // Back button is not supported for the app launched from HostedApplication.
        _clearBackstackIfReturnFromCurrentNodeDisallowed() {
            if (this._currentNode && this._currentNode.disableBackNavigationFromNode) {
                this._clearVisitedNodeStack();
            }
        }
        // Tiered conditions to determine if in-place resume is needed for network reconnect
        // This method's tiered conditions are:
        // 1. False if skipReconnectHandler set on node
        // 2. False if the OOBE network app is hidden (e.g. due to unattend)
        // 3. True if OOBE-Reconnect-Network licensing policy is set
        // 4. False if OobeNetworkReconnect disabled
        // 5. False if Retail Demo or user is allowed to skip network connect
        // 6. Else whether we haven't yet reached retry limit
        _isInplaceResumeNeeded() {
            if (this._currentNode.skipReconnectHandler) {
                return false;
            }
            if (CloudExperienceHostAPI.UtilStaticsCore.hideWireless) {
                return false;
            }
            if (CloudExperienceHostAPI.UtilStaticsCore.getLicensingPolicyValue("OOBE-Reconnect-Network") == 1) {
                return true;
            }
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeNetworkReconnect")) {
                if (CloudExperienceHost.Storage.SharableData.getValue("retailDemoEnabled") || !CloudExperienceHostAPI.UtilStaticsCore.disabledSkipNetwork) {
                    return false;
                }
                // Get reconnect limit based on velocity, or default value
                let reconnectLimit = 5; // Default to 5 to align with number of CXH/Explorer crashes before we go to recovery OOBE
                let variantObj = CloudExperienceHost.FeatureStaging.tryGetFeatureVariant("OobeNetworkReconnect");
                if (variantObj.result && (variantObj.value == "UseCustomReconnectLimit")) {
                    let variantDataObj = CloudExperienceHost.FeatureStaging.tryGetFeatureVariantData("OobeNetworkReconnect");
                    if (variantDataObj.result) {
                        reconnectLimit = variantDataObj.value;
                    }
                }
                // Get reconnection handled count, and allow reconnection if we haven't exceeded the limit
                let reconnectionHandledCount = CloudExperienceHost.Storage.VolatileSharableData.getItem("InPlaceResumeValues", "reconnectionHandledCount");
                reconnectionHandledCount = reconnectionHandledCount ? reconnectionHandledCount : 0;
                if (reconnectionHandledCount < reconnectLimit) {
                    return true;
                }
                else {
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("ReconnectLimitReached", reconnectLimit.toString());
                    return false;
                }
            }
            return false;
        }
        navigateByLauncher(launcher, completeDispatch) {
            try {
                var launcherStrings = launcher.split(":");
                var launcherType = launcherStrings[0];
                var launcherName = launcherStrings[1];
                switch (launcherType) {
                    case "winrt":
                        {
                            this._startLauncher(AppObjectFactory.getInstance().getObjectFromString(launcherName), completeDispatch);
                            break;
                        }
                    case "js":
                        {
                            require(["appLaunchers/" + launcherName], (LauncherClass) => {
                                this._startLauncher(LauncherClass, completeDispatch);
                            });
                            break;
                        }
                }
            }
            catch (e) {
                completeDispatch();
                this._fireEvent("Done", CloudExperienceHost.AppResult.fail);
            }
        }
        getCurrentNode() {
            return this._currentNode;
        }
        getDiagnosticsNode() {
            return this._navMesh.getDiagnosticsNode();
        }
        setNavigatePromiseFunc(func) {
            this._navigatePromiseFunc = func;
        }
        addEventListener(type, listener) {
            if (!this._listeners.hasOwnProperty(type)) {
                this._listeners[type] = new Array();
            }
            this._listeners[type].push(listener);
        }
        setHeaderParams(headerParams) {
            let headerString = headerParams.split(',');
            for (let i = 0; i < headerString.length; i++) {
                let headers = headerString[i].split('|');
                this._headersMap.set(headers[0], headers[1]);
            }
        }
        navigate(navMesh, experience, cxid) {
            this._navMesh = navMesh;
            if (cxid) {
                this._currentNode = this._navMesh.getNode(cxid);
            }
            else {
                // If start parameter is present in the experience description, then use it instead of the "start"
                // attribute for the scenario in the nav mesh.
                var cxidstart = CloudExperienceHost.ExperienceDescription.GetStart(experience);
                this._currentNode = (cxidstart != "") ? this._navMesh.getNode(cxidstart) : this._navMesh.getStart();
            }
            if (!this._resumeNode) {
                // This is the earliest point in the flow that we know which node we are navigating to
                this._resumeNode = this._currentNode;
            }
            return this._navigateToCurrentNode();
        }
        evaluateBackNavigationStatusForNextTransition() {
            // On node visibility, update the back navigation status which decides the back button visibility on 
            // the next transition. If a node doesn't end up being visible it shouldn't affect the back navigation.
            // The display of the error page should not affect the navigation status for the next transition.
            if (this._currentNode.cxid !== this._navMesh.getErrorNodeName()) {
                if (this._currentNode.disableBackNavigationToNode) {
                    this._backNavigationStatusForNextTransition = BackNavigationStatus.Disabled;
                }
                else {
                    this._backNavigationStatusForNextTransition = BackNavigationStatus.Enabled;
                }
            }
        }
        resetBackNavigationStatusForNextTransition() {
            // Set this when we are restarting the flow at any time
            this._backNavigationStatusForNextTransition = BackNavigationStatus.Unknown;
        }
        goToPreviousVisitedNode() {
            // Make sure speech related operations from previous page are cleared
            CloudExperienceHostAPI.Speech.SpeechSynthesis.stop();
            CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
            // Make sure there were visited nodes that can be navigated to
            if (this._navMesh.isBackstackForBackNavigationSupported() && (this._visitedNodeStack.length != 0)) {
                var backNode = this._visitedNodeStack.pop();
                if (backNode) {
                    // Stop current WebApp telemetry before loading previous WebApp.
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().stop(CloudExperienceHost.InternalAppResult.navigateWithBackstack);
                    this._currentNode = backNode;
                }
                this._navigateToCurrentNode().done();
            }
        }
        addCurrentNodeToTopOfBackstack() {
            if (this._navMesh.isBackstackForBackNavigationSupported() && this._currentNode &&
                (this._topOfVisitedNodeStack() !== this._currentNode.cxid)) {
                this._visitedNodeStack.push(this._currentNode);
                return true;
            }
            return false;
        }
        updateVisitedStack() {
            // General Transition Cases
            // Check if this node blocks back navigation, if so clear the list of previously visited nodes
            // If the node was not visible skip changes to the stack
            // Error Page Cases
            // Let's assume transition A->B->C, and some failure when loading B, with C as failId for B
            // If the error page shows up and user hits -
            // 1) Retry - cxh flow is restarted by loading oobestartselector and then loading the resume node,
            //      Now there are 2 cases:
            //      a) Error occurred before page became visible:
            //         resume node = B, backstack = A, statusfornexttransition = unknown
            //         => on retry you restart flow, explicitly set statusfornexttransition to unknown, set load startselector
            //            which doesn't get pushed onto the stack because of the unknown status, if the resume node loads correctly 
            //            this time, status is set to Enabled and is pushed onto the stack, so backstack = B ->A if B loads fine.
            //      b) Error after page visible:
            //         resume node = B, backstack = A, statusfornexttransition = enabled(if B loads and is visible)
            //         => this follows in the same way as the first case
            // 2) Skip - simply navigate to the failId C
            //      2 cases:
            //      a) Error occurred before page became visible:
            //         resume node = B, backstack = A, statusfornexttransition = unknown
            //         on transition to C backstack = A
            //      b) Error after page visible:
            //         resume node = B, backstack = A, statusfornexttransition = enabled if back not disabled, else unknown
            //         on transition to C backstack = B->A
            //      In both cases if the node disables back, clear the visited stack, so on reaching C backstack = empty
            if (this._navMesh.isBackstackForBackNavigationSupported() &&
                (this._topOfVisitedNodeStack() != this._currentNode.cxid)) {
                if (this._backNavigationStatusForNextTransition === BackNavigationStatus.Disabled) {
                    this._clearVisitedNodeStack();
                }
                else if (this._backNavigationStatusForNextTransition === BackNavigationStatus.Enabled) {
                    this._visitedNodeStack.push(this._currentNode);
                }
                // else if the status is unknown it means that the app was not visible, so skip modifying the stack
                // Let the next webapp set the status once it is visible
                this.resetBackNavigationStatusForNextTransition();
            }
        }
        clearWebView() {
            return new WinJS.Promise((completeDispatch /*, errorDispatch, progressDispatch */) => {
                Debug.assert(!this._clearWebViewCompletion, "_clearWebViewCompletion should not be defined");
                if (this._view.src == aboutBlankURI) {
                    // Webview is empty - no need to navigate it
                    completeDispatch();
                }
                else {
                    let httpRequestMessage = new Windows.Web.Http.HttpRequestMessage(Windows.Web.Http.HttpMethod.get, new Windows.Foundation.Uri(aboutBlankURI));
                    this._clearWebViewCompletion = completeDispatch;
                    this._view.navigateWithHttpRequestMessage(httpRequestMessage);
                }
            });
        }
        redirect(e, contextHeaders) {
            var httpMethod = (e.httpMethod.toUpperCase() === "POST") ? Windows.Web.Http.HttpMethod.post : Windows.Web.Http.HttpMethod.get;
            var httpRequestMessage = this._createHttpRequestMessage(httpMethod, e.url, null);
            this._appendCustomHeaders(httpRequestMessage, contextHeaders);
            if (e.value) {
                this._addDataToRequest(httpRequestMessage, e.key, e.value);
            }
            this._startNavigationTimer();
            this._view.navigateWithHttpRequestMessage(httpRequestMessage);
        }
        goBack() {
            // A flow which uses the visited node stack should not be able to use backIDs to go back
            if (!this._navMesh.isBackstackForBackNavigationSupported() && this._currentNode) {
                var backNode = this._navMesh.getNode(this._currentNode.backID);
                if (backNode) {
                    // Stop current WebApp telemetry before loading previous WebApp.
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().stop(CloudExperienceHost.InternalAppResult.back);
                    this._currentNode = backNode;
                }
                this._navigateToCurrentNode().done();
            }
        }
        skipCurrentApp(node) {
            // Navigate to the failID of the current app
            if (node) {
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().stop(CloudExperienceHost.AppResult.fail);
                // Check if this node blocks back navigation, if so clear the list of previously visited nodes.
                // The behavior is similar to preload check and skip.
                if (node.disableBackNavigationToNode) {
                    this._backNavigationStatusForNextTransition = BackNavigationStatus.Disabled;
                }
                this._nextNode = this._navMesh.getNode(node.failID);
                // calls _navigateToCurrentNode, which accounts for disableBackNavigationFromNode
                this.goNext();
            }
        }
        navigateToNode(node) {
            if (node) {
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().stop(CloudExperienceHost.AppResult.cancel);
                // Check if this node blocks back navigation, if so clear the list of previously visited nodes.
                // The behavior is similar to preload check and skip.
                if (node.disableBackNavigationToNode) {
                    this._backNavigationStatusForNextTransition = BackNavigationStatus.Disabled;
                }
                // Go directly to specified node
                this._nextNode = node;
                this.goNext();
            }
        }
        goNext() {
            // Update the visited stack to enable back navigation to the current node and then assign next
            // node to current node, note that this already went through the feature staging check
            // (page swap map) since goNext() is always called by the app manager after webAppDone(),
            // which calls _getNext() -- that contains the check. 
            this.updateVisitedStack();
            this._currentNode = this._nextNode;
            if (this._currentNode) {
                // On loading the new node, "save it" so that in case of a failure we return to this 
                // node. If a failure happened before this, it would resume back to the previous node.
                // The only case where this would fail is if we are trying to -
                // - Protocol launch to a particular node with a wrong cxid node name
                // In this case webAppDone returns a false, and appmanager._onDone ends up calling _close.
                // Please note that we don't want to save the error page itself as a resume node.
                if (!this._resumeNode || (this._currentNode !== this._navMesh.getErrorNode())) {
                    this._resumeNode = this._currentNode;
                }
            }
            // Navigate to the current node. Do this even if we get into a state where the current node is NULL,
            // as this will ensure that we proceed through the normal navigation logic that closes the app with
            // a "success" result. This is possible in various scenarios where nodes are skipped.
            this._navigateToCurrentNode().done();
        }
        loadIdentityProvider(signInIdentityProvider) {
            var id;
            switch (signInIdentityProvider) {
                case CloudExperienceHost.SignInIdentityProviders.Local:
                    id = 'Local';
                    break;
                case CloudExperienceHost.SignInIdentityProviders.MSA:
                    id = 'MSA';
                    break;
                case CloudExperienceHost.SignInIdentityProviders.AAD:
                    id = 'AAD';
                    break;
                default:
                    throw new CloudExperienceHost.InvalidArgumentError(signInIdentityProvider);
                    break;
            }
            var inclusive = (this.getNavMesh()) ? (this.getNavMesh().getInclusive() != 0) : false;
            if (inclusive) {
                id = 'Oobe' + id;
            }
            var provider = this._navMesh.getNode(id);
            // Stop current WebApp telemtery before loading the Identity Provider WebApp.
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().stop(CloudExperienceHost.AppResult.abort);
            this.updateVisitedStack();
            if (provider) {
                this._currentNode = provider;
            }
            else {
                this._currentNode = this._navMesh.getNode(this._currentNode.abortID);
            }
            this._navigateToCurrentNode().done();
        }
        getNavMesh() {
            return this._navMesh;
        }
        getResumeNode() {
            return this._resumeNode;
        }
        webAppDone(appResult) {
            // Telemetry: WebApp stop
            Debug.assert(!this._navigationTimerPromise, "_navigationTimerPromise should be null here. Adding a safeguard to call stopNavigationTimer");
            this._stopNavigationTimer();
            CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().stop(appResult);
            this._nextNode = this._getNext(appResult);
            // Fire an event containing the current node and the AppResult it just returned
            let navDecision = { result: appResult, currentNode: this._currentNode };
            this._fireEvent("AppResultDetermined", navDecision);
            return (this._nextNode ? true : false);
        }
        setNavigationInterruptExpected() {
            this._navigationInterruptExpected = true;
        }
        getRedirectForPostTicketInterrupt() {
            return this._redirectForPostTicketInterrupt;
        }
        setRedirectForPostTicketInterrupt(redirectForPostTicketInterrupt) {
            this._redirectForPostTicketInterrupt = redirectForPostTicketInterrupt;
        }
    }
    CloudExperienceHost.Navigator = Navigator;
})(CloudExperienceHost || (CloudExperienceHost = {}));
if ((typeof define === "function") && define.amd) {
    define(function () {
        return CloudExperienceHost.Navigator;
    });
}
//# sourceMappingURL=navigator.js.map