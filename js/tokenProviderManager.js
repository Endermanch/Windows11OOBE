//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode, JS2055.DoNotReferenceBannedTerms</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    class MSAError {
    }
    CloudExperienceHost.MSAError = MSAError;
    class MSATokenProviderManager {
        constructor() {
            this._isInitialPageLoaded = false;
            this._platform = null;
            this._correlationId = null;
            this._webAppTelemetry = CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance();
            if (!this._webAppTelemetry.isStarted()) {
                // Dummy GUID provided since the GUID is not important and AppTelemetry is not started
                this._webAppTelemetry.start("msa-wam", "00000000-0000-0000-0000-000000000000");
            }
            this._msaExtension = new MicrosoftAccount.Extension.ExtensionWorker();
            WinJS.Namespace.define("CloudExperienceHost", {
                getContext: this._getContext.bind(this)
            });
            if (typeof (CloudExperienceHost.getCurrentNode) === 'undefined') {
                WinJS.Namespace.define("CloudExperienceHost", {
                    getCurrentNode: this._getINavigable.bind(this)
                });
            }
        }
        initialize(args) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                let user = null;
                this._platform = CloudExperienceHost.Environment.getPlatform();
                let argsWithUser;
                argsWithUser = args.detail;
                if (argsWithUser) {
                    user = argsWithUser.user;
                    CloudExperienceHost.IUserManager.getInstance().setIUser(user);
                }
                completeDispatch();
            }.bind(this));
        }
        setAppViewManager(appView) {
            this._appView = appView;
            let user = null;
            user = CloudExperienceHost.IUserManager.getInstance().getIUser();
            this._msaUIHandler = new CloudExperienceHost.MSAUIHandlerInternal(appView, new MicrosoftAccount.TokenProvider.Core.TokenBrokerOperation(user));
        }
        setNavManager(navManager) {
            return;
        }
        getDiscoveryNavMesh() {
            return null;
        }
        start(args) {
            var webAccountProviderOperation;
            if (args.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.webAccountProvider ||
                args.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.componentUI) {
                webAccountProviderOperation = args.detail.operation; /* WebAccountProviderActivatedEventArgs */
            }
            else {
                throw new Error(CloudExperienceHost.ErrorNames.ActivationNotSupported);
            }
            if (webAccountProviderOperation == null) {
                throw new CloudExperienceHost.InvalidArgumentError();
            }
            this._appView.showProgress().then(function () {
                this._initializeWebView().then(function () {
                    var tokenOperation = this._msaUIHandler.getTokenOperation();
                    tokenOperation.webAccountProviderOperation = webAccountProviderOperation;
                    tokenOperation.loadUrlInWebView = this._loadURLInWebView.bind(this);
                    tokenOperation.showErrorUX = this._showErrorUX.bind(this);
                    tokenOperation.stopListeningForVerificationCode = this._stopListeningForVerificationCode.bind(this);
                    var msaTokenProvider;
                    msaTokenProvider = new MicrosoftAccount.TokenProvider.Core.TokenProviderExecutor(tokenOperation);
                    msaTokenProvider.execute();
                }.bind(this));
            }.bind(this));
        }
        resume(args) {
            this.start(args);
        }
        checkpoint() {
        }
        restart(uri) {
        }
        onUnhandledException(e) {
            this._webAppTelemetry.logEvent("onUnhandledException", e.detail.errorMessage);
            this._msaUIHandler.saveAuthStateAndCompleteWebFlow(CloudExperienceHost.AppResult.fail, null /*requestId*/, null /*puid*/, null /*username*/, null /*da*/, null /*daCreation*/, null /*daExpiration*/, null /*sessionKey*/, null /*flowToken*/, "0xc0000144", /*STATUS_UNHANDLED_EXCEPTION*/ "0xc0000144", null /*sessionKeyType*/);
            return null;
        }
        _loadURLInWebView(url, contextParams, privateProperties, method, value) {
            this._isInitialPageLoaded = false;
            this._startListeningForVerificationCode();
            if (typeof (privateProperties) !== 'undefined' && privateProperties !== null) {
                for (var iterator = privateProperties.first(); iterator.hasCurrent; iterator.moveNext()) {
                    CloudExperienceHost.Storage.PrivateData.addItem(iterator.current.key, iterator.current.value);
                }
            }
            // If this is Xbox, we need to pass in the correct theme based upon the console's setting.
            if (this._platform == CloudExperienceHost.TargetPlatform.XBOX) {
                var useLightTheme = false;
                try {
                    var theme = Windows.Xbox.System.Internal.Personalization.SystemPersonalization.defaultSystemTheme;
                    useLightTheme = (theme == Windows.Xbox.System.Internal.Personalization.SystemTheme.light);
                }
                catch (e) {
                }
                url += (url.indexOf('?') > 0 ? '&' : '?') + "uitheme=" + (useLightTheme ? "xbox_2" : "xbox_1");
            }
            // Clean previous views before navigating to URL.
            this._appView.cleanView();
            this._appView.getView().appendChild(this._webView);
            this._webView.focus();
            if ((typeof (contextParams) !== 'undefined') && (contextParams !== null) && (contextParams.hasKey("cxh-correlationId") === true)) {
                this._correlationId = contextParams.lookup("cxh-correlationId");
            }
            else {
                this._correlationId = this._webAppTelemetry.getId();
            }
            this._redirectToURL(url, contextParams, method, value);
            this._webAppTelemetry.logEvent("_loadURLInWebView", JSON.stringify({
                correlationId: this._correlationId
            }));
        }
        _showErrorUX(hr, hrInternal, internalErrorDescription) {
            var error = this._numToHexString(hr, 4);
            var errorInternal = this._numToHexString(hrInternal, 4);
            this._handleNavigationError(error, errorInternal, internalErrorDescription);
            this._webAppTelemetry.logEvent("_showErrorUX", errorInternal);
        }
        _startListeningForVerificationCode() {
            var tokenOperation = this._msaUIHandler.getTokenOperation();
            this._msaExtension.getVerificationCodeAsync().then(function (verificationCode) {
                if (verificationCode) {
                    tokenOperation.receivedVerificationCode = verificationCode;
                }
                else {
                    // -1 indicates not to expect a code
                    tokenOperation.receivedVerificationCode = "-1";
                }
                this._stopListeningForVerificationCode();
            }.bind(this), function (e) {
                // This error callback will get called back on platforms that don't support auto-verification codes
                // -1 indicates not to expect a code
                tokenOperation.receivedVerificationCode = "-1";
                this._stopListeningForVerificationCode();
            }.bind(this));
        }
        _stopListeningForVerificationCode() {
            if (this._msaExtension) {
                this._msaExtension.cancelVerificationCodeWait();
            }
        }
        _initializeWebView() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                this._webView = this._appView.createWebView();
                this._appView.cleanView();
                this._appView.getView().appendChild(this._webView);
                this._webView.focus();
                this._webView.addEventListener("MSWebViewNavigationCompleted", this._onNavigationCompleted.bind(this));
                CloudExperienceHost.Discovery.getApiRules().then(function (rules) {
                    var contractHandler = new CloudExperienceHost.ContractHandler(rules);
                    this._bridge = new CloudExperienceHost.Bridge(this._webView, contractHandler);
                    this._bridge.addEventListener(CloudExperienceHost.Events.done, this._onDone.bind(this));
                    this._bridge.addEventListener(CloudExperienceHost.Events.postDeviceTicketToUrl, this._onPostDeviceTicketToUrl.bind(this));
                    this._bridge.addEventListener(CloudExperienceHost.Events.registerNGCForUser, this._onRegisterNGCForUser.bind(this));
                    completeDispatch();
                }.bind(this), errorDispatch);
            }.bind(this));
            //For TB flow done event should only be called in case of a catastrophic failure from which MSA server cannot recover.
        }
        // Callback invoked by _onPostDeviceTicketToUrl() and _onRegisterNGCForUser()
        // Result will be either a URL-encoded ticket or ""
        _onTicketRequestComplete(targetUrl, result) {
            if (targetUrl) {
                this._loadURLInWebView(targetUrl, null, null, result ? "POST" : "GET", result);
            }
            else {
                // This code path indicates a bug.
                this._onTicketError(targetUrl, result, -2147012891 /* WININET_E_INVALID_URL */);
            }
        }
        _onPostDeviceTicketToUrl(data) {
            var targetUrl = data.targetUrl;
            var policy = data.policy;
            var guid = "D9AB8D3D-41EF-49AD-86CB-F036516A662D"; // Value is only used for analytics
            this._webAppTelemetry.logEvent("IsNetworkConnected_PostTicketRequested", CloudExperienceHost.Environment.hasInternetAccess());
            this._webAppTelemetry.logEvent("NetworkConnectivityLevel_PostTicketRequested", CloudExperienceHost.Wireless.getConnectivityLevel());
            this._appView.showProgress().then(function () {
                var msaExtension = new MicrosoftAccount.Extension.ExtensionWorker();
                msaExtension.getDeviceTicketForWebFlowAsync(targetUrl, policy, guid).done(function (result) {
                    this._onTicketRequestComplete(result.lookup("ResultUrl"), result.lookup("Ticket"));
                }.bind(this), function (error) {
                    this._onTicketError(targetUrl, error.message, error.number);
                }.bind(this));
            }.bind(this));
        }
        // Error handler for postDeviceTicketToUrl
        _onTicketError(targetUrl, errorMsg, errorCode) {
            // Log the error
            var logData = new Object;
            logData["errorCode"] = errorCode || null;
            logData["message"] = errorMsg || null;
            logData["targetUrl"] = targetUrl;
            this._webAppTelemetry.logEvent("TicketRequestError", JSON.stringify(logData));
            // Handle error condition.
            var hr = this._numToHexString(errorCode, 4);
            var msaError = new CloudExperienceHost.MSAError();
            msaError.hr = hr;
            msaError.hrInternal = hr;
            msaError.msaUIHandler = this._msaUIHandler;
            msaError.hasInternetAccess = CloudExperienceHost.Environment.hasInternetAccess();
            msaError.correlationId = this._correlationId === null ? this._webAppTelemetry.getId() : this._correlationId;
            msaError.timeStamp = new Date().toUTCString();
            this._appView.cleanView();
            this._appView.showProgress().then(function () {
                WinJS.UI.Pages.render("views/tokenManagerErrorHandler.html", this._appView.getView(), msaError).done(function () {
                    this._appView.showView().done(function () {
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }
        _onRegisterNGCForUser(data) {
            this._msaUIHandler.registerNGCForUser(data, "", // msaTicketContext
            "WAM", // experienceName
            this._loadURLInWebView.bind(this)).done(this._onTicketRequestComplete.bind(this), function (destinationUrl) {
                this._loadURLInWebView(destinationUrl);
            }.bind(this));
        }
        // Convert a signed int to a string with its two's complement byte representation
        // Used for translating error codes from getDeviceTicketForWebFlowAsync to strings for passing into the generic error page
        _numToHexString(errorCode, integerByteLength) {
            var integerBitLength = 8 * integerByteLength;
            var hexString = "undefined";
            if (errorCode < Math.pow(2, integerBitLength) && errorCode > -Math.pow(2, integerBitLength)) {
                if (errorCode > 0) {
                    hexString = "0x" + errorCode.toString(16);
                }
                else {
                    hexString = "0x" + (errorCode + Math.pow(2, integerBitLength)).toString(16);
                }
            }
            return hexString;
        }
        _redirectToURL(url, contextParams, method, value) {
            var httpRequestMessage;
            var httpMethod = (!(typeof (method) === 'undefined') && method.toUpperCase() === "POST") ? Windows.Web.Http.HttpMethod.post : Windows.Web.Http.HttpMethod.get;
            var uri = new Windows.Foundation.Uri(url);
            httpRequestMessage = new Windows.Web.Http.HttpRequestMessage(httpMethod, uri);
            if (!(typeof (value) === 'undefined')) {
                this._addDataToRequest(httpRequestMessage, null, value);
            }
            this._appendCustomHeaders(httpRequestMessage, contextParams);
            // Only attempt to navigate if there is Internet connectivity.
            if (CloudExperienceHost.Environment.hasInternetAccess()) {
                this._webView.navigateWithHttpRequestMessage(httpRequestMessage);
            }
            else {
                this._onNavigationFailed(null);
            }
        }
        _appendCustomHeaders(httpRequestMessage, contextHeaders) {
            var context = CloudExperienceHost.getContext();
            httpRequestMessage.headers.append("hostApp", "CloudExperienceHost");
            httpRequestMessage.headers.append("cxh-cxid", "TokenBroker");
            httpRequestMessage.headers.append("cxh-osVersionInfo", JSON.stringify(CloudExperienceHostAPI.Environment.osVersionInfo));
            httpRequestMessage.headers.append("cxh-msaBinaryVersion", CloudExperienceHostAPI.Environment.msaBinaryVersion);
            httpRequestMessage.headers.append("cxh-identityClientBinaryVersion", CloudExperienceHostAPI.Environment.identityClientBinaryVersion);
            for (var key in context) {
                httpRequestMessage.headers.append("cxh-" + key, context[key]);
            }
            if (typeof (contextHeaders) !== 'undefined' && contextHeaders !== null) {
                if (contextHeaders.hasKey("cxh-correlationId") === false) {
                    httpRequestMessage.headers.append("cxh-correlationId", this._webAppTelemetry.getId());
                }
                for (var iterator = contextHeaders.first(); iterator.hasCurrent; iterator.moveNext()) {
                    httpRequestMessage.headers.append(iterator.current.key, iterator.current.value);
                }
            }
        }
        _addDataToRequest(httpRequestMessage, key, value) {
            if (httpRequestMessage.method === Windows.Web.Http.HttpMethod.get) {
                if (!key) {
                    throw new CloudExperienceHost.InvalidArgumentError("key cannot be empty for GET request");
                }
                httpRequestMessage.headers.append(key, value);
            }
            else {
                var content = !!key ? (key + "=" + value) : value;
                var contentType = "application/x-www-form-urlencoded";
                httpRequestMessage.content = new Windows.Web.Http.HttpStringContent(content, Windows.Storage.Streams.UnicodeEncoding.utf8, contentType);
            }
        }
        _onNavigationCompleted(eventInfo) {
            if (eventInfo.isSuccess === true) {
                if (!this._isInitialPageLoaded) {
                    this._appView.showView();
                    this._isInitialPageLoaded = true;
                }
            }
            else {
                this._onNavigationFailed(eventInfo);
            }
            this._webAppTelemetry.logEvent("_onNavigationCompleted");
        }
        _getContext() {
            var context = new CloudExperienceHost.Context();
            context.host = "TokenBroker";
            context.protocol = "TokenBroker";
            context.source = "TokenBroker";
            context.platform = this._platform;
            // Late in RS3 IoT platform took a change that resulted in CXH flows being rendered in a chrome-less UI. 
            // The end result is that users lost the ability to close\cancel CXH flows by using the X button.
            // To resolve this issue MSA server need to render a cancel button on IoT devices.
            // Set ChromelessUI capability for IOT devices (DEVICEFAMILYINFOENUM_IOT and DEVICEFAMILYINFOENUM_IOT_HEADLESS).
            let chromelessUI = (CloudExperienceHostAPI.Environment.platform == 7 || CloudExperienceHostAPI.Environment.platform == 8) ? 1 : 0;
            context.capabilities = JSON.stringify({ "PrivatePropertyBag": 1, "PasswordlessConnect": 1, "PreferAssociate": 1, "ChromelessUI": chromelessUI });
            return context;
        }
        _onDone(result) {
            // The contract with MSA Server UX for TokenBroker flows is that the "Done" event
            // will only be fired when saveAuthStateAndCompleteWebFlow() cannot be called.
            // This should only happen on unexpected server errors.
            var hr = "0x80048842"; // Return PPCRL_REQUEST_E_USER_CANCELED
            var hrInternal = null;
            if (result == CloudExperienceHost.AppResult.fail) {
                hrInternal = "0x80190005"; // HTTP_E_STATUS_UNEXPECTED_SERVER_ERROR
            }
            else {
                hrInternal = "0x8000ffff"; // E_UNEXPECTED
            }
            this._webAppTelemetry.logEvent("_onDone", JSON.stringify(result));
            this._stopListeningForVerificationCode();
            this._handleNavigationError(hr, hrInternal);
        }
        _onNavigationFailed(eventInfo) {
            // Return PPCRL_REQUEST_E_USER_CANCELED (User will be presented with error page prior to return)
            var hr = "0x80048842";
            //ERROR_NETWORK_NOT_AVAILABLE
            var hrInternal = "0x800713AB";
            if (eventInfo) {
                hrInternal = this._onTranslateWebErrorStatus(eventInfo.webErrorStatus);
                this._webAppTelemetry.logEvent("_onNavigationFailed_WebError", JSON.stringify(eventInfo.webErrorStatus));
            }
            this._handleNavigationError(hr, hrInternal);
            this._webAppTelemetry.logEvent("_onNavigationFailed", hrInternal);
        }
        _handleNavigationError(hr, hrInternal, internalErrorDescription) {
            var msaError = new CloudExperienceHost.MSAError();
            msaError.hr = hr;
            msaError.hrInternal = hrInternal;
            msaError.internalErrorDescription = internalErrorDescription;
            msaError.msaUIHandler = this._msaUIHandler;
            msaError.hasInternetAccess = CloudExperienceHost.Environment.hasInternetAccess();
            msaError.correlationId = this._correlationId === null ? this._webAppTelemetry.getId() : this._correlationId;
            msaError.timeStamp = new Date().toUTCString();
            var hrTmp = null;
            if (hrInternal != null) {
                hrTmp = hrInternal.toUpperCase();
            }
            // hasInternetAccess needs to be set to false in order for the network connectivity error handling
            // page to be displayed. So set hasInternetAccess == false when we receive networking errors
            // ERROR_NETWORK_UNREACHABLE, ERROR_CONNECTION_ABORTED, ERROR_HOST_UNREACHABLE
            if (hrTmp === "0X800704CF" || hrTmp === "0X800704D4" || hrTmp === "0X800704D0") {
                msaError.hasInternetAccess = false;
            }
            this._appView.cleanView();
            this._appView.showProgress().then(function () {
                // Render the error page.
                WinJS.UI.Pages.render("views/tokenManagerErrorHandler.html", this._appView.getView(), msaError).done(function () {
                    this._appView.showView();
                }.bind(this));
            }.bind(this));
        }
        _onTranslateWebErrorStatus(navigationError) {
            var hrInternal = null;
            switch (navigationError) {
                case Windows.Web.WebErrorStatus.certificateCommonNameIsIncorrect:
                case Windows.Web.WebErrorStatus.certificateExpired:
                case Windows.Web.WebErrorStatus.certificateContainsErrors:
                case Windows.Web.WebErrorStatus.certificateRevoked:
                case Windows.Web.WebErrorStatus.certificateIsInvalid:
                    hrInternal = "0x80072F17"; // WININET_E_SEC_CERT_ERRORS
                    break;
                case Windows.Web.WebErrorStatus.serverUnreachable:
                case Windows.Web.WebErrorStatus.timeout:
                case Windows.Web.WebErrorStatus.cannotConnect:
                case Windows.Web.WebErrorStatus.requestTimeout:
                case Windows.Web.WebErrorStatus.badGateway:
                case Windows.Web.WebErrorStatus.serviceUnavailable:
                case Windows.Web.WebErrorStatus.gatewayTimeout:
                    hrInternal = "0x800704CF"; // ERROR_NETWORK_UNREACHABLE
                    break;
                case Windows.Web.WebErrorStatus.connectionAborted:
                case Windows.Web.WebErrorStatus.connectionReset:
                case Windows.Web.WebErrorStatus.disconnected:
                case Windows.Web.WebErrorStatus.operationCanceled:
                    hrInternal = "0x800704D4"; // ERROR_CONNECTION_ABORTED
                    break;
                case Windows.Web.WebErrorStatus.httpToHttpsOnRedirection:
                    hrInternal = "0x80072f08"; // WININET_E_HTTPS_TO_HTTP_ON_REDIR
                    break;
                case Windows.Web.WebErrorStatus.httpsToHttpOnRedirection:
                    hrInternal = "0x80072f07"; // WININET_E_HTTP_TO_HTTPS_ON_REDIR
                    break;
                case Windows.Web.WebErrorStatus.hostNameNotResolved:
                    hrInternal = "0x800704D0"; // ERROR_HOST_UNREACHABLE
                    break;
                case Windows.Web.WebErrorStatus.unexpectedStatusCode:
                case Windows.Web.WebErrorStatus.unexpectedRedirection:
                case Windows.Web.WebErrorStatus.unexpectedClientError:
                case Windows.Web.WebErrorStatus.unexpectedServerError:
                    hrInternal = "0x8007003B"; // ERROR_UNEXP_NET_ERR
                    break;
                default:
                    hrInternal = "0x80190001"; // HTTP_E_STATUS_UNEXPECTED
            }
            return hrInternal;
        }
        // The cxid is the only value here that we expect to be used.
        _getINavigable() {
            return {
                cxid: "TokenBroker",
                url: "",
                requiredFeatureName: "",
                requiredDisabledFeatureName: "",
                urlPathParam: "",
                visibility: false,
                successID: "",
                failID: "",
                cancelID: "",
                backID: "",
                offlineID: "",
                preloadSkipID: "",
                abortID: "",
                exitID: "",
                action1ID: "",
                action2ID: "",
                action3ID: "",
                initialize: undefined,
                queryStringBuilder: "",
                httpMethod: "",
                contentType: "",
                encoding: "",
                showAccountErrorPageOnFailure: false,
                showErrorPageOnFailure: false,
                timeout: 0,
                navigationTimeout: 0,
                ignoreResult: false,
                preloadCheck: "",
                preloadCheckSkipOnFailure: false,
                launcher: "",
                hostedApplicationProtocol: "",
                internetRequired: false,
                skipReconnectHandler: false,
                appUserModelId: "",
                disableBackNavigationToNode: false,
                disableBackNavigationToNodeOnSuccess: false,
                disableBackNavigationFromNode: false,
                speechCapableOverride: false,
                nodeCapabilities: undefined,
                canExitCxh: false,
                skipExitsCxh: false,
                disableErrorPageOnFailure: false,
                needCustomHeaders: [],
                checkpointOnSuccess: false,
                policyName: "",
                customProperty: "",
                frameAnimation: "",
                supportedSignInIdentityProviders: [],
                intraWebAppVisibility: true,
                hostedApplicationLaunchArguments: "",
                allowDisplayModeChange: false
            };
        }
    }
    CloudExperienceHost.MSATokenProviderManager = MSATokenProviderManager;
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=tokenprovidermanager.js.map