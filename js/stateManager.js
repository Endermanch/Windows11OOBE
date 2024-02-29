//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    (function (WebAppExecutionState) {
        WebAppExecutionState[WebAppExecutionState["Running"] = 0] = "Running";
        WebAppExecutionState[WebAppExecutionState["Closed"] = 1] = "Closed";
    })(CloudExperienceHost.WebAppExecutionState || (CloudExperienceHost.WebAppExecutionState = {}));
    var WebAppExecutionState = CloudExperienceHost.WebAppExecutionState;
    class WebAppState {
        constructor(cxid, state, result) {
            this.cxid = cxid;
            this.state = state;
            this.result = result;
        }
    }
    CloudExperienceHost.WebAppState = WebAppState;
    class AppExecutionState {
        constructor() {
            this.source = null;
            this.current = null;
        }
    }
    class StateManager {
        constructor() {
            this._appState = null;
            this._webAppState = null;
            if (!StateManager._allowInstantiation) {
                throw new Error("Error: Instantiation failed: Use getInstance() instead of new.");
            }
            if (WinJS.Application.sessionState.appState) {
                this._appState = WinJS.Application.sessionState.appState;
            }
            else {
                this._appState = new AppExecutionState();
                WinJS.Application.sessionState.appState = this._appState;
            }
            if (WinJS.Application.sessionState.webAppState) {
                this._webAppState = WinJS.Application.sessionState.webAppState;
            }
            else {
                this._webAppState = new Object();
                WinJS.Application.sessionState.webAppState = this._webAppState;
            }
        }
        static getInstance() {
            if (StateManager._instance === null) {
                StateManager._allowInstantiation = true;
                StateManager._instance = new StateManager();
                StateManager._allowInstantiation = false;
            }
            return StateManager._instance;
        }
        isValid(source) {
            return (this._appState.source && (this._appState.source.toLocaleLowerCase() === source.toLocaleLowerCase()));
        }
        setSource(source) {
            this._appState.source = source;
        }
        onNavigate(node) {
            this._appState.current = new WebAppState(node.cxid, WebAppExecutionState.Running, null);
        }
        onDone(node, appResult) {
            this._appState.current.result = appResult;
            this._appState.current.state = WebAppExecutionState.Closed;
        }
        getNextCXID() {
            var cxid = null;
            if (this._appState.current && this._appState.current.state === WebAppExecutionState.Running) {
                cxid = this._appState.current.cxid;
            }
            return cxid;
        }
        clean() {
            WinJS.Application.sessionState = null;
        }
        setWebAppState(cxid, value) {
            this._webAppState[cxid] = value;
        }
        getWebAppState(cxid) {
            return this._webAppState[cxid];
        }
    }
    StateManager._instance = null;
    CloudExperienceHost.StateManager = StateManager;
    WinJS.Namespace.define("CloudExperienceHost.SessionState", {
        setState: function (value) { StateManager.getInstance().setWebAppState(CloudExperienceHost.getCurrentNode().cxid, value); },
        getState: function () { return StateManager.getInstance().getWebAppState(CloudExperienceHost.getCurrentNode().cxid); },
    });
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=stateManager.js.map