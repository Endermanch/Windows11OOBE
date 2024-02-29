//
// Copyright (C) Microsoft. All rights reserved.
//

define(['lib/knockout'], (ko) => {
    class NavigationManager {
        constructor() {
            this.listeners = new Object;
            this.navigator = null;
            this.bridge = null;
            this.webviewCtrl = null;
            this.appView = null;
            this.observers = {};

            this.canNavigateToPreviousWebapp = ko.observable(false);
            this.canNavigateToPreviousPanel = ko.observable(false);
            this.shouldDisableBackNavigation = ko.observable(false);
            // This is applicable for webapps with multiple panels where you want to always 'back'
            // and reload the app (basically go to first panel)
            this.canNavigateToCurrentWebapp = ko.observable(false);
            // This is to close CXH
            this.canExitCxhFromCurrentWebapp = ko.observable(false);

            this.canNavigateToPreviousWebapp.subscribe((newvalue) => {
                this.evaluateBackNavigationAndNotify();
            });

            this.canNavigateToPreviousPanel.subscribe((newvalue) => {
                this.evaluateBackNavigationAndNotify();
            });

            this.shouldDisableBackNavigation.subscribe((newvalue) => {
                this.evaluateBackNavigationAndNotify();
            });

            this.canNavigateToCurrentWebapp.subscribe((newvalue) => {
                this.evaluateBackNavigationAndNotify();
            });

            this.canExitCxhFromCurrentWebapp.subscribe((newvalue) => {
                this.evaluateExitCxhAndNotify();
            });

            // handle back command via WNF
            AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.AppEventSubscriptionManager").addEventListener("back", this.navigateBack.bind(this));

            if (CloudExperienceHostAPI.FeatureStaging.isOobeFeatureEnabled("WindowsAutopilotDiagnostics")) {
                // handle diagnostics command via WNF only if feature is enabled
                AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.AppEventSubscriptionManager").addEventListener("diagnostics", this.navigateToDiagnostics.bind(this));
            }
        }

        registerNavigator(navigatorInstance)
        {
            this.navigator = navigatorInstance;
        }

        registerBridge(bridgeInstance)
        {
            this.bridge = bridgeInstance;
        }

        registerWebviewCtrl(viewinstance)
        {
            this.webviewCtrl = viewinstance;
        }

        registerAppView(appViewInstance)
        {
            this.appView = appViewInstance;
        }

        navigateBack() {
            // Back panel navigation should never be available on panel 1 of a webapp
            // So always check for panel availability first, and then check for previous app
            // availability and navigate if applicable.
            if (this.canNavigateToPreviousPanel()) {
                this.bridge.fireEvent(CloudExperienceHost.Events.backButtonClicked, null);
                // Remove keyboard focus from the back button, and get focus back to the inclusive web app
                document.activeElement.blur();
                this.webviewCtrl.focus();
            }
            else if (this.canNavigateToPreviousWebapp() || this.canNavigateToCurrentWebapp()) {
                if (this.appView) {
                    this.appView.showProgress().then(function () {
                        this.navigator.goToPreviousVisitedNode();
                    }.bind(this));
                }
                else {
                    this.navigator.goToPreviousVisitedNode();
                }
            }
        }

        navigateToDiagnostics() {
            // Check if navigator has been initialized
            if (this.navigator != null) {
                let diagnosticsNode = this.navigator.getDiagnosticsNode();
                let currentNode = this.navigator.getCurrentNode();

                // Diagnostics navigation is only available if the current scenario has a valid diagnostics node
                if ((diagnosticsNode != null) && (diagnosticsNode.cxid != "") && (diagnosticsNode != currentNode)) {
                    // Save current node
                    CloudExperienceHost.Storage.SharableData.addValue("DiagnosticsPreviousCXID", currentNode.cxid);

                    // Navigate to diagnostics node
                    if (this.appView) {
                        this.appView.showProgress().then(function () {
                            this.navigator.navigateToNode(diagnosticsNode);
                        }.bind(this));
                    }
                    else {
                        this.navigator.navigateToNode(diagnosticsNode);
                    }
                }
            }
        }

        closeCxh() {
            if (this.canExitCxhFromCurrentWebapp()) {
                // Exit CXH with app result cancel from current webapp
                CloudExperienceHost.cancel();
            }
        }

        evaluateBackNavigationAndNotify() {
            if (!this.shouldDisableBackNavigation() && (this.canNavigateToPreviousWebapp() || this.canNavigateToPreviousPanel() || this.canNavigateToCurrentWebapp())) {
                this.fireEvent("ShowBackButton");
                AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.AppEventNotificationManager").notifyBackStateChanged(true);
            }
            else {
                this.fireEvent("HideBackButton");
                AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.AppEventNotificationManager").notifyBackStateChanged(false);
            }
        }

        evaluateExitCxhAndNotify() {
            if (this.canExitCxhFromCurrentWebapp()) {
                this.fireEvent("ShowCloseButton");
            } else {
                this.fireEvent("HideCloseButton");
            }
        }

        setExitCxhAvailability(isAvailable) {
            this.canExitCxhFromCurrentWebapp(isAvailable);
        }

        setWebAppBackNavigationAvailability(isAvailable)
        {
            // This is the first panel, set panel navigation to false
            this.canNavigateToPreviousPanel(false);
            this.canNavigateToCurrentWebapp(false);
            this.canNavigateToPreviousWebapp(isAvailable);
        }

        setPanelBackNavigationAvailability(isAvailable) {
            this.canNavigateToPreviousPanel(isAvailable);
        }

        setDisableBackNavigation(disableBackNavigation) {
            let value = (typeof disableBackNavigation !== 'undefined') && disableBackNavigation;
            this.shouldDisableBackNavigation(value);
        }

        setBackNavigationCheckpoint() {
            if (this.navigator.addCurrentNodeToTopOfBackstack()) {
                this.shouldDisableBackNavigation(false);
                // We force the webapp to relinquish back control at this point
                this.setPanelBackNavigationAvailability(false);
                this.canNavigateToCurrentWebapp(true);
            }
        }

        fireEvent(eventName, e) {
            var listeners = this.listeners[eventName];
            if (listeners) {
                for (let listener of listeners) {
                    listener.call(this, e);
                }
            }
        }

        addEventListener(type, listener) {
            if (!this.listeners.hasOwnProperty(type)) {
                this.listeners[type] = new Array();
            }
            this.listeners[type].push(listener);
        }

        addNavigationEventListener(type, listener) {
            this.navigator.addEventListener(type, listener);
        }

        getFailedNode() {
            return this.navigator.getResumeNode();
        }

        notifyEvent(event, payload) {
            if (this.observers[event]) {
                for (let observer of this.observers[event]) {
                    observer.onNavigationEvent(event, payload);
                }
            }
        }

        subscribeForNavigationEvent(observer, event) {
            if (!this.observers[event]) {
                this.observers[event] = [];
                this.observers[event].push(observer);
            }
            else if (this.observers[event].indexOf(observer) == -1) {
                this.observers[event].push(observer);
            }
        }

        unsubscribeForNavigationEvent(observer, event) {
            if (this.observers[event]) {
                let obsIndex = this.observers[event].indexOf(observer);
                if (obsIndex != -1) {
                    this.observers[event].splice(obsIndex, 1);
                }
            }
        }
    }

    return new NavigationManager();
});
