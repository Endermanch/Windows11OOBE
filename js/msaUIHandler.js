//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode, JS2055.DoNotReferenceBannedTerms</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Crypto = Windows.Security.Cryptography;
    class MSAUIHandlerInternal {
        constructor(appView, tokenOperation) {
            this._webAppTelemetry = CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance();
            if (!this._webAppTelemetry.isStarted()) {
                this._webAppTelemetry.start("msaUIHandler");
            }
            this._appView = appView;
            this._registerNgcOperation = null;
            this._tokenBrokerOperation = tokenOperation; // Passed by tokenProviderManager
            WinJS.Namespace.define("CloudExperienceHost.MSAUIHandler", {
                saveAuthenticationState: this.saveAuthenticationState.bind(this),
                saveAuthStateAndCompleteWebFlow: this.saveAuthStateAndCompleteWebFlow.bind(this),
                getVerificationCode: this.getVerificationCode.bind(this),
                updateLogonCache: this.updateLogonCache.bind(this),
                completeWebFlow: this.completeWebFlow.bind(this)
            });
        }
        getTokenOperation() {
            return this._tokenBrokerOperation;
        }
        clearTokenBrokerOperation() {
            // This should only be called when there is a new ticket request coming from postTicketToReturnUrl.
            if (this._tokenBrokerOperation != null) {
                let target = this._tokenBrokerOperation.webFlowRequest ? this._tokenBrokerOperation.webFlowRequest.url : "";
                let policy = this._tokenBrokerOperation.webFlowRequest ? this._tokenBrokerOperation.webFlowRequest.policy : "";
                this._webAppTelemetry.logEvent("ResetTokenBrokerOperation", JSON.stringify({
                    target: target, policy: policy
                }));
                this._tokenBrokerOperation = null;
            }
        }
        _buildTicketRequest(target, policy, onComplete, onError) {
            // Set PostTicketToUrlOperation
            let webFlowRequest;
            webFlowRequest = new MicrosoftAccount.TokenProvider.Core.PostTicketToUrlOperation();
            webFlowRequest.url = target;
            webFlowRequest.policy = policy;
            webFlowRequest.onComplete = onComplete;
            webFlowRequest.onError = onError;
            webFlowRequest.isRequestTicketForUrlScenario = false;
            // Set TokenProviderOperation
            let tokenOperation;
            let user = null;
            user = CloudExperienceHost.IUserManager.getInstance().getIUser();
            tokenOperation = new MicrosoftAccount.TokenProvider.Core.TokenBrokerOperation(user);
            tokenOperation.isRequestFromWebFlow = true;
            tokenOperation.wasUserPrompted = true;
            tokenOperation.webFlowRequest = webFlowRequest;
            return tokenOperation;
        }
        requestTicketForUrl(data, msaTicketContext, navigate) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                this._appView.showProgress().then(function () {
                    this._webAppTelemetry.logEvent("postTicketToReturnUrl");
                    if (this._tokenBrokerOperation) {
                        // Concurrent WAM operations are banned. Return ERROR_OPERATION_IN_PROGRESS
                        errorDispatch({ number: -2147024567 });
                        return;
                    }
                    var tokenOperation;
                    tokenOperation = this._buildTicketRequest(data.targetUrl, data.policy, 
                    // On success, navigate to target
                    function (returnUrl, result) {
                        this._tokenBrokerOperation = null;
                        completeDispatch(new CloudExperienceHost.RedirectEventArgs(returnUrl, null, result, result ? "POST" : "GET"));
                    }.bind(this), 
                    // On failure, invoke parent error handler in a manner consistent with exceptions.
                    function (error) {
                        this._tokenBrokerOperation = null;
                        errorDispatch({ number: error });
                    }.bind(this));
                    this._tokenBrokerOperation = tokenOperation;
                    tokenOperation.wasUserPrompted = true;
                    tokenOperation.loadUrlInWebView = navigate;
                    tokenOperation.webFlowRequest.isRequestTicketForUrlScenario = true;
                    if (msaTicketContext) {
                        tokenOperation.scenarioId = msaTicketContext;
                    }
                    let user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                    if (user === null) {
                        tokenOperation.useBroker = data.msaTicketBroker;
                    }
                    // Request ticket
                    var executor;
                    executor = new MicrosoftAccount.TokenProvider.Core.TokenProviderExecutor(tokenOperation);
                    executor.requestTicketForUrl();
                }.bind(this));
            }.bind(this));
        }
        requestLPTForUser(data, msaTicketContext, experienceName, navigate) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                this._appView.showProgress().then(function () {
                    let userId = CloudExperienceHost.IUserManager.getInstance().getUserId();
                    if (this._registerNgcOperation) {
                        // Concurrent NGC operations are banned. Return ERROR_OPERATION_IN_PROGRESS
                        this._webAppTelemetry.logEvent("concurrentNgcRequest", JSON.stringify({
                            correlationId: this._webAppTelemetry.getId()
                        }));
                        errorDispatch({ number: -2147024567 });
                        return;
                    }
                    this._webAppTelemetry.logEvent("requestLPTForUser", JSON.stringify({
                        returnUrl: data.returnUrl,
                        useStrongAuth: data.useStrongAuth,
                        useBroker: data.msaTicketBroker ? true : false,
                        experienceName: experienceName,
                        correlationId: this._webAppTelemetry.getId(),
                        userId: userId
                    }));
                    let scope = "scope=service::http://passport.net/purpose::";
                    scope += data.useStrongAuth == true ? "PURPOSE_KEYREGISTER" : "PURPOSE_KEYREGISTER_WEAK";
                    scope += "&ssoappgroup=none";
                    var tokenOperation;
                    tokenOperation = this._buildTicketRequest(scope, "TOKEN_BROKER", 
                    // On success, return LPT
                    function (ignoredUrl, logonProofToken) {
                        this._registerNgcOperation = null;
                        this._webAppTelemetry.logEvent("requestLPTForUser", JSON.stringify({
                            experienceName: experienceName,
                            correlationId: this._webAppTelemetry.getId(),
                            hr: 0,
                            userId: userId
                        }));
                        completeDispatch(logonProofToken);
                    }.bind(this), 
                    // On failure, invoke parent error handler in a manner consistent with exceptions.
                    function (error) {
                        this._registerNgcOperation = null;
                        this._webAppTelemetry.logEvent("requestLPTForUser", JSON.stringify({
                            experienceName: experienceName,
                            correlationId: this._webAppTelemetry.getId(),
                            hr: error,
                            userId: userId
                        }));
                        let destinationUrl = this._appendErrorCodeToUrl(data.returnUrl, error);
                        errorDispatch(destinationUrl);
                    }.bind(this));
                    this._registerNgcOperation = tokenOperation;
                    tokenOperation.wasUserPrompted = true;
                    tokenOperation.loadUrlInWebView = navigate;
                    if (msaTicketContext) {
                        tokenOperation.scenarioId = msaTicketContext;
                    }
                    let user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                    if (user === null) {
                        tokenOperation.useBroker = data.msaTicketBroker;
                    }
                    // Request ticket
                    var executor;
                    executor = new MicrosoftAccount.TokenProvider.Core.TokenProviderExecutor(tokenOperation);
                    executor.requestLPTForUser(data.puid || "", data.username || "", data.flowToken || "");
                }.bind(this));
            }.bind(this));
        }
        registerNGCForUser(data, msaTicketContext, experienceName, navigate) {
            return new WinJS.Promise(function (completeDispatch, /* _onTicketRequestComplete */ errorDispatch /*, progressDispatch */) {
                this.requestLPTForUser(data, msaTicketContext, experienceName, navigate).done(function (logonProofToken) {
                    // Create NGC
                    var extension = new MicrosoftAccount.UserOperations.ExtensionForUser();
                    let user = null;
                    user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                    let logonProofTokenBuffer = null;
                    if (logonProofToken) {
                        logonProofTokenBuffer = Crypto.CryptographicBuffer.convertStringToBinary(logonProofToken, Crypto.BinaryStringEncoding.utf8);
                    }
                    let setChromeDimBasedOnFocus = (CloudExperienceHost.getContext().personality === CloudExperienceHost.TargetPersonality.LiteWhite);
                    let isTransparencyOptionSetOnCredUICoordinator = false;
                    if (setChromeDimBasedOnFocus) {
                        // hide UI for transparent CredUI
                        this._appView.setChromeDimBasedOnFocus(setChromeDimBasedOnFocus);
                        isTransparencyOptionSetOnCredUICoordinator = CloudExperienceHost.CredUI.setTransparencyOptionOnCredUICoordinator();
                    }
                    // Prime Ngc logon cache is required if it's NoPa or Federated MSA.
                    // If PIN is registered from the lock screen (i.e. WindowsLogon scenario), make the priming Ngc logon cache operation synchronously
                    // to avoid missing the logon cache due to the termination of the runtimebroker.exe.
                    let requirePrimeNgcLogonCache = (data.isNoPassword == true || msaTicketContext === "WindowsLogon");
                    extension.createUserIdKeyForUserAsync(user, data.useStrongAuth, requirePrimeNgcLogonCache, data.username || "", data.puid || "", logonProofTokenBuffer).done(function (hResult) {
                        if (setChromeDimBasedOnFocus) {
                            this._appView.setChromeDimBasedOnFocus(false);
                            if (isTransparencyOptionSetOnCredUICoordinator) {
                                CloudExperienceHost.CredUI.removeTransparencyOptionOnCredUICoordinator();
                            }
                        }
                        // Finish
                        this._webAppTelemetry.logEvent("registerNGCForUser", JSON.stringify({
                            useStrongAuth: data.useStrongAuth,
                            isNoPassword: (data.isNoPassword == true),
                            experienceName: experienceName,
                            correlationId: this._webAppTelemetry.getId(),
                            hr: hResult
                        }));
                        // Do not append the hResult in PIN enrollment since server need to create a new page in OOBE if prime Ngc logon cache fail.
                        completeDispatch(data.returnUrl);
                    }.bind(this), function (error) {
                        if (setChromeDimBasedOnFocus) {
                            this._appView.setChromeDimBasedOnFocus(false);
                            if (isTransparencyOptionSetOnCredUICoordinator) {
                                CloudExperienceHost.CredUI.removeTransparencyOptionOnCredUICoordinator();
                            }
                        }
                        // Error for createUserIdkeyAsync
                        this._webAppTelemetry.logEvent("registerNGCForUser", JSON.stringify({
                            useStrongAuth: data.useStrongAuth,
                            isNoPassword: (data.isNoPassword == true),
                            experienceName: experienceName,
                            correlationId: this._webAppTelemetry.getId(),
                            hr: error.number
                        }));
                        let destinationUrl = this._appendErrorCodeToUrl(data.returnUrl, error.number);
                        errorDispatch(destinationUrl);
                    }.bind(this));
                }.bind(this), errorDispatch /* Error for requestLPTForUser */);
            }.bind(this));
        }
        resetNGCForUser(data, msaTicketContext, experienceName, navigate) {
            return new WinJS.Promise(function (completeDispatch, /* _onTicketRequestComplete */ errorDispatch /*, progressDispatch */) {
                this.requestLPTForUser(data, msaTicketContext, experienceName, navigate).done(function (logonProofToken) {
                    // Reset NGC
                    var extension = new MicrosoftAccount.Extension.ExtensionWorkerForUser();
                    let user = null;
                    user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                    let logonProofTokenBuffer = null;
                    if (logonProofToken) {
                        logonProofTokenBuffer = Crypto.CryptographicBuffer.convertStringToBinary(logonProofToken, Crypto.BinaryStringEncoding.utf8);
                    }
                    extension.resetUserIdKeyForUserAsync(user, data.useStrongAuth, data.isNoPassword == true, msaTicketContext, data.username || "", data.puid || "", logonProofTokenBuffer).done(function (hResult) {
                        // Finish
                        this._webAppTelemetry.logEvent("resetNGCForUser", JSON.stringify({
                            useStrongAuth: data.useStrongAuth,
                            isNoPassword: (data.isNoPassword == true),
                            experienceName: experienceName,
                            correlationId: this._webAppTelemetry.getId(),
                            hr: hResult
                        }));
                        let destinationUrl = this._appendErrorCodeToUrl(data.returnUrl, hResult);
                        completeDispatch(destinationUrl);
                    }.bind(this), function (error) {
                        // Error for resetUserIdkeyAsync
                        this._webAppTelemetry.logEvent("resetNGCForUser", JSON.stringify({
                            useStrongAuth: data.useStrongAuth,
                            isNoPassword: (data.isNoPassword == true),
                            experienceName: experienceName,
                            correlationId: this._webAppTelemetry.getId(),
                            hr: error.number
                        }));
                        let destinationUrl = this._appendErrorCodeToUrl(data.returnUrl, error.number);
                        errorDispatch(destinationUrl);
                    }.bind(this));
                }.bind(this), errorDispatch /* Error for requestLPTForUser */);
            }.bind(this));
        }
        updateLogonCache(requestId, puid, encryptedPassword) {
        }
        getVerificationCode() {
            let verificationCode = null;
            if (this._tokenBrokerOperation) {
                verificationCode = this._tokenBrokerOperation.receivedVerificationCode;
            }
            else {
                verificationCode = CloudExperienceHost.MSA.getVerificationCode();
            }
            if ((typeof (verificationCode) === 'undefined') ||
                verificationCode == "") {
                verificationCode = null;
            }
            return verificationCode;
        }
        saveAuthenticationState(data) {
            let tokenOperation = this._registerNgcOperation || this._tokenBrokerOperation;
            let dataFromWeb = new MicrosoftAccount.TokenProvider.Core.WebFlowResultData();
            let daTokenBuffer = null;
            if (data.daToken) {
                daTokenBuffer = Crypto.CryptographicBuffer.convertStringToBinary(data.daToken, Crypto.BinaryStringEncoding.utf8);
            }
            let sessionKeyBuffer = null;
            if (data.sessionKey) {
                sessionKeyBuffer = Crypto.CryptographicBuffer.decodeFromBase64String(data.sessionKey);
            }
            dataFromWeb.daTokenBuffer = daTokenBuffer;
            dataFromWeb.sessionKeyBuffer = sessionKeyBuffer;
            dataFromWeb.sessionKeyType = data.sessionKeyType || "";
            dataFromWeb.daTokenCreationTime = data.daTokenCreationTime || "";
            dataFromWeb.daTokenExpiryTime = data.daTokenExpiryTime || "";
            dataFromWeb.puid = data.puid || "";
            dataFromWeb.username = data.username || "";
            dataFromWeb.isCompleteWebFlow = false;
            tokenOperation.wasUserPrompted = true;
            var msaTokenProvider;
            msaTokenProvider = new MicrosoftAccount.TokenProvider.Core.TokenProviderExecutor(tokenOperation);
            return msaTokenProvider.saveAuthenticationState(dataFromWeb);
        }
        saveAuthStateAndCompleteWebFlow(status, requestId, puid, username, daToken, daTokenCreationTime, daTokenExpiryTime, sessionKey, flowToken, hr, hrInternal, sessionKeyType) {
            this._webAppTelemetry.logEvent("saveAuthStateAndCompleteWebFlow", hr);
            var tokenOperation = this._registerNgcOperation || this._tokenBrokerOperation;
            if (!tokenOperation) {
                this._webAppTelemetry.logEvent("undefinedTokenOperation");
                // The unhandled exception handler in tokenProviderManager calls this function, so throwing would cause infinite recursion.
                // The TokenProvider error handler page calls this function on "OK", so that would cause an infinite loop.
                // Nothing we can do here if the caller was WAM.
                return;
            }
            this._appView.showProgress().then(function () {
                if (tokenOperation.stopListeningForVerificationCode != null) {
                    // This will not exist in non-Token Broker flows. In those cases, we don't have to worry about cancelling anyway.
                    tokenOperation.stopListeningForVerificationCode();
                }
                tokenOperation.wasUserPrompted = true;
                var msaTokenProvider;
                msaTokenProvider = new MicrosoftAccount.TokenProvider.Core.TokenProviderExecutor(tokenOperation);
                if (this._isUndefined("status", status) === true) {
                    msaTokenProvider.failAuthentication("0xc0000163", "0xc0000163"); // 0xc0000163 - TYPE_E_UNDEFINEDTYPE
                    this._webAppTelemetry.logEvent("saveAuthStateAndCompleteStatus", "0xc0000163");
                    return;
                }
                if (status == CloudExperienceHost.AppResult.success) {
                    let dataFromWeb = new MicrosoftAccount.TokenProvider.Core.WebFlowResultData();
                    let daTokenBuffer = null;
                    if (daToken) {
                        daTokenBuffer = Crypto.CryptographicBuffer.convertStringToBinary(daToken, Crypto.BinaryStringEncoding.utf8);
                    }
                    let sessionKeyBuffer = null;
                    if (sessionKey) {
                        sessionKeyBuffer = Crypto.CryptographicBuffer.decodeFromBase64String(sessionKey);
                    }
                    dataFromWeb.daTokenBuffer = daTokenBuffer;
                    dataFromWeb.sessionKeyBuffer = sessionKeyBuffer;
                    dataFromWeb.sessionKeyType = sessionKeyType;
                    dataFromWeb.daTokenCreationTime = daTokenCreationTime;
                    dataFromWeb.daTokenExpiryTime = daTokenExpiryTime;
                    dataFromWeb.flowToken = flowToken;
                    dataFromWeb.puid = puid;
                    dataFromWeb.username = username;
                    dataFromWeb.isCompleteWebFlow = false;
                    msaTokenProvider.resumeAuthentication(dataFromWeb);
                }
                else {
                    if (this._isUndefined("hr", hr) === true) {
                        hr = "0xc0000163"; // STATUS_UNDEFINED_CHARACTER
                    }
                    let HRESULT_ONL_E_REQUEST_THROTTLED = "0X80860010";
                    if ((hr !== null) && (hr.toUpperCase() === HRESULT_ONL_E_REQUEST_THROTTLED)) {
                        msaTokenProvider.restartAuthentication();
                    }
                    else {
                        msaTokenProvider.failAuthentication(hr, hrInternal);
                        this._isUndefined("hrInternal", hrInternal);
                    }
                }
                this._webAppTelemetry.logEvent("saveAuthStateAndCompleteStatus", JSON.stringify(status));
            }.bind(this));
        }
        completeWebFlow(data) {
            this._webAppTelemetry.logEvent("completeWebFlow", JSON.stringify(data.hr));
            let tokenOperation = this._registerNgcOperation || this._tokenBrokerOperation;
            if (!tokenOperation) {
                this._webAppTelemetry.logEvent("undefinedTokenOperation");
                // The unhandled exception handler in tokenProviderManager calls this function, so throwing would cause infinite recursion.
                // The TokenProvider error handler page calls this function on "OK", so that would cause an infinite loop.
                // Nothing we can do here if the caller was WAM.
                return;
            }
            tokenOperation.wasUserPrompted = true;
            this._appView.showProgress().then(function () {
                if (tokenOperation.stopListeningForVerificationCode != null) {
                    // This will not exist in non-Token Broker flows. In those cases, we don't have to worry about cancelling anyway.
                    tokenOperation.stopListeningForVerificationCode();
                }
                let msaTokenProvider;
                msaTokenProvider = new MicrosoftAccount.TokenProvider.Core.TokenProviderExecutor(tokenOperation);
                let dataFromWeb = new MicrosoftAccount.TokenProvider.Core.WebFlowResultData();
                dataFromWeb.flowToken = data.flowToken || "";
                dataFromWeb.puid = data.puid || "";
                dataFromWeb.username = data.username || "";
                dataFromWeb.isCompleteWebFlow = true;
                if (data.hr.toLowerCase() == "0x0") {
                    if (data.completeRequest === true) {
                        msaTokenProvider.completeAuthentication(dataFromWeb);
                    }
                    else {
                        msaTokenProvider.resumeAuthentication(dataFromWeb);
                    }
                }
                else {
                    msaTokenProvider.failAuthentication(data.hr, data.hrInternal);
                }
                this._webAppTelemetry.logEvent("completeWebFlow done");
            }.bind(this));
        }
        _isUndefined(paramName, param) {
            if ((typeof (param) === 'undefined')) {
                this._webAppTelemetry.logEvent("isUndefined", paramName);
                return true;
            }
            return false;
        }
        _appendErrorCodeToUrl(url, errorCode) {
            if (errorCode !== 0) {
                let hexString = "0x" + (errorCode < 0 ? errorCode + 0x100000000 /* 32-bit signed -> unsigned conversion; 2^32 */ : errorCode).toString(16);
                url += (url.indexOf('?') > 0 ? '&' : '?') + "errorCode=" + encodeURIComponent(hexString);
            }
            return url;
        }
    }
    CloudExperienceHost.MSAUIHandlerInternal = MSAUIHandlerInternal;
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=msauihandler.js.map