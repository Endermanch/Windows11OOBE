//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core', 'winjs/ui'], (ko, bridge, constants, core) => {
    class ConfirmDialogManager {
        constructor(confirmDialogElement) {
            this.currentAfterHideHandler = null;
            this.confirmDialogElement = confirmDialogElement;
            this.confirmDialogWinControl = null;
        }

        show(title, description, primarybutton, secondarybutton, afterHideHandler) {
            if (this.confirmDialogWinControl) {
                if (!this.confirmDialogWinControl.hidden) {
                    // Skip showing it if there is already one.
                    return;
                }

                // Clean up the old winControl.
                if (this.currentAfterHideHandler) {
                    this.confirmDialogWinControl.removeEventListener("afterhide", this.currentAfterHideHandler);
                    this.currentAfterHideHandler = null;
                }
                this.confirmDialogWinControl.dispose();
                this.confirmDialogElement.winControl = null;
            }

            // Initialize the dialog and show it.
            this.confirmDialogElement.textContent = description ? description : "";
            WinJS.UI.process(this.confirmDialogElement).then(() => {
                this.confirmDialogWinControl = this.confirmDialogElement.winControl;
                this.confirmDialogWinControl.title = title;
                this.confirmDialogWinControl.primaryCommandText = primarybutton;
                this.confirmDialogWinControl.secondaryCommandText = secondarybutton;
                this.confirmDialogWinControl.addEventListener("afterhide", afterHideHandler);
                this.currentAfterHideHandler = afterHideHandler;

                this.confirmDialogWinControl.show();
            });
        }
    }

    class ProvisioningStatusViewModel {
        constructor(resourceStrings, oobeProvisioningResults, showEjectMediaMessage) {
            // Variables definitions
            this.componentName = ko.observable();
            this.provResults = ko.observableArray();
            this.doneFired = false;
            this.pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
            this.isResumed = oobeProvisioningResults.isResumed;
            this.sourceOverride = oobeProvisioningResults.sourceOverride;
            this.minProgressTextTime = 7000;   // in ms
            this.pollingInterval = 500; // in ms
            this.promisePollingResults = null;
            this.stopPollingResults = false;
            this.promisePollingAppList = null;
            this.disableRemediationButtons = ko.observable();
            this.disableRetryButton = ko.observable();
            this.signalNoStagedResults = ko.observable();
            this.signalNoStagedResults(false);
            this.signalForceCompletion = ko.observable();
            this.signalForceCompletion(false);
            this.promiseWaitForNoStagedResults = this.createPromiseWaitForNoStagedResults();
            this.appDisplayNameList = {};
            this.hotKeyEnabled = ko.observable();
            this.confirmDialogManager = new ConfirmDialogManager(document.getElementById("provCommonConfirmDlg"));
            let titleStrings = {};
            let subHeaderTitleStrings = {};
            let flexStartHyperLinksSets = {};
            let flexEndButtonsSets = {};

            // UI element initialization
            this.resourceStrings = resourceStrings;

            titleStrings["main"] = resourceStrings.ProvisioningStatusTitleAlreadyStarted;
            titleStrings["errorReport"] = resourceStrings.ProvisioningStatusTitle;

            subHeaderTitleStrings["main"] = showEjectMediaMessage ? resourceStrings.ProvisioningSafeToEject : "";
            subHeaderTitleStrings["errorReport"] = "";

            flexStartHyperLinksSets["main"] = [];
            flexStartHyperLinksSets["errorReport"] = [
                {
                    hyperlinkText: resourceStrings.ProvisioningStatusContinueButtonText,
                    disableControl: ko.pureComputed(() => {
                        return this.disableRemediationButtons();
                    }),
                    handler: () => {
                        this.onContinue();
                    }
                }
            ];

            flexEndButtonsSets["main"] = [];
            flexEndButtonsSets["errorReport"] = [
                {
                    buttonText: resourceStrings.ProvisioningStatusResetPCButtonText,
                    buttonType: "button",
                    isPrimaryButton: true,
                    disableControl: ko.pureComputed(() => {
                        return this.disableRemediationButtons();
                    }),
                    buttonClickHandler: () => {
                        this.onReset();
                    }
                },
                {
                    buttonText: resourceStrings.ProvisioningStatusRetryButtonText,
                    buttonType: "button",
                    isPrimaryButton: true,
                    disableControl: ko.pureComputed(() => {
                        return this.disableRemediationButtons() || this.disableRetryButton();
                    }),
                    buttonClickHandler: () => {
                        this.onRetry();
                    }
                },
            ];

            this.title = ko.pureComputed(() => {
                return titleStrings[this.componentName()];
            });

            this.subHeaderText = ko.pureComputed(() => {
                return subHeaderTitleStrings[this.componentName()];
            });

            this.flexStartHyperLinks = ko.pureComputed(() => {
                return flexStartHyperLinksSets[this.componentName()];
            });

            this.flexEndButtons = ko.pureComputed(() => {
                return flexEndButtonsSets[this.componentName()];
            });

            this.getLogsText = resourceStrings.ProvisioningStatusGetLogsButtonText;

            this.componentName.subscribe((newValue) => {
                this.setupVoiceOverAndSpeechRecognition(newValue);
            });

            this.componentName("main");
            this.disableRemediationButtons(true);
            this.disableRetryButton(true);
            this.hotKeyEnabled(true);

            // Override the provisioning source if any.
            if (this.sourceOverride) {
                this.pluginManager.setSourceOverride(this.sourceOverride);
            }
        }

        setupVoiceOverAndSpeechRecognition(componentName) {
            // Setup simple voiceover and speech recognition using the resource strings
            try {
                CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
                let continueConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(new Array(this.resourceStrings.ProvisioningStatusContinueButtonText));
                continueConstraint.tag = "continue";
                let retryConstraint = new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(new Array(this.resourceStrings.ProvisioningStatusRetryButtonText));
                retryConstraint.tag = "retry";
                let constraintsSets = {};
                let voiceOverSets = {};

                voiceOverSets["errorReport"] = this.resourceStrings.ProvisioningStatusVoiceOver;

                constraintsSets["errorReport"] = [continueConstraint, retryConstraint];

                if (componentName in voiceOverSets) {
                    CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(voiceOverSets[componentName], constraintsSets[componentName]).done((result) => {
                        if (result) {
                            if (result.constraint.tag == continueConstraint.tag) {
                                this.onContinue();
                            } else if (result.constraint.tag == retryConstraint.tag) {
                                this.onRetry();
                            }
                        }
                    });
                }
            }
            catch (error) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SpeechRecognitionSetupError",
                    JSON.stringify(new core.WinRtErrorWrapper(error)));
            }
        }

        checkOrExitErrorReport() {
            // Stop the polling task.
            this.stopPollingResults = true;

            let commandResults = {};

            // Wait for any polling finished.
            WinJS.Promise.join({ promisePollingResults: this.promisePollingResults }).then(() => {
                return this.pluginManager.getLastProvisioningCommandResultsAsync();
            })
            .then((results) => {
                commandResults = results;

                // Check if any errors to show or exit the report flow.
                return this.pluginManager.getLastProvisioningResultsAsync();
            })
            .then((results) => {
                // Continue if no results to show.
                if (results.length == 0) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningProceededSuccessfully",
                        JSON.stringify(
                        {
                            sourceOverride: this.sourceOverride
                        }));
                    this.onExitErrorReport();
                    return;
                }

                // Check any errors.
                let anyError = false;
                results.forEach((currentResult) => {
                    if (currentResult.hasError) {
                        anyError = true;
                    }
                });

                // Check if we are forced to show the error view.
                if (this.signalForceCompletion()) {
                    anyError = true;
                }

                // Continue if no errors to show.
                if (!anyError) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningProceededSuccessfully",
                        JSON.stringify(
                        {
                            sourceOverride: this.sourceOverride
                        }));
                    this.pluginManager.onProvisioningCompletedAsync(this.resourceStrings.ProvisioningSuccessfulMessage).then(() => {
                        this.onExitErrorReport();
                    })
                    .done(null, (error) => {
                        this.onExitErrorReport();
                    });
                    return;
                }

                // Show the error report and populate the results to the view.
                this.componentName("errorReport");
                this.updateProvisioningResults(results);
                this.updateProvisioningCommandsResults(commandResults);
                this.disableRemediationButtons(false);
                this.disableRetryButton(this.signalForceCompletion());

                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningShowErrorReport",
                    JSON.stringify(
                    {
                        forceCompletion: this.signalForceCompletion(),
                        sourceOverride: this.sourceOverride
                    }));
            })
            .done(null, (error) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningCheckErrorReportOrExitError", core.GetJsonFromError(error));
                this.onExitErrorReport();
            });
        }

        onContinue() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningContinueAnywayStart").then(() => {
                this.confirmDialogManager.show(
                    this.resourceStrings.ContinueConfirmationDialogTitle,
                    this.resourceStrings.ContinueConfirmationDialogDescription,
                    this.resourceStrings.ContinueConfirmationDialogCommandContinue,
                    this.resourceStrings.ContinueConfirmationDialogCommandCancel,
                    this.onContinueConfirmCheck.bind(this));
            });
        }

        onContinueConfirmCheck(eventInfo) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningContinueAnywayCompleted", JSON.stringify({ result: eventInfo.detail.result }));

            if (eventInfo.detail.result != WinJS.UI.ContentDialog.DismissalResult.primary) {
                // User cancelled.
                return;
            }

            if (this.doneFired) {
                return;
            }

            this.doneFired = true;
            // Lead to the local account creation page.
            bridge.fireEvent(constants.Events.done, constants.AppResult.action1);
        }

        onExitErrorReport() {
            if (this.doneFired) {
                return;
            }

            this.doneFired = true;

            let shouldSkipOobe = this.pluginManager.getSkipOobeValue();

            if (shouldSkipOobe) {
                // Lead to the end of OOBE.
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningCommitSkipOobe");
                bridge.fireEvent(constants.Events.done, constants.AppResult.exitCxhSuccess);
            } else {
                bridge.fireEvent(constants.Events.done, constants.AppResult.success);
            }
        }

        onGetLogs() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningGetLogsStart").then(() => {
                return bridge.invoke("CloudExperienceHost.showFolderPicker");
            })
            .then((folderPath) => {
                // Delegate the folder picker to run in the MSAppHost (application) context.
                // Otherwise, it will fail to run in the WebView control context.
                return this.pluginManager.exportDiagEvtLogAsync(folderPath);
            })
            .then(() => {
                return bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningGetLogsCompleted");
            })
            .then(null, (error) => {
                return bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningGetLogsError", core.GetJsonFromError(error));
            });
        }

        onRetry() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningRetry", JSON.stringify({ sourceOverride: this.sourceOverride}));

            if (this.doneFired) {
                return;
            }

            this.doneFired = true;
            // Navigate to the provisioning entry page again.
            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "OobeProvisioningSourceOverride", "OOBE_RETRY");
            bridge.fireEvent(constants.Events.done, constants.AppResult.action2);
        }

        ready() {
            let promiseSet = {
                // Ensure the progress ring will be visible for at least minProgressTextTime milliseconds.
                promiseMinProgressTextTime: WinJS.Promise.timeout(this.minProgressTextTime),
                promiseWaitForNoStagedResults: this.promiseWaitForNoStagedResults
            };

            if (!this.isResumed) {
                promiseSet.promiseApplyProvisioning = this.pluginManager.applyAcquiredPackageAsync();
            } else {
                promiseSet.promiseApplyProvisioning = this.pluginManager.applyAfterConnectivityPackagesAsync();
            }

            // Start polling the real-time updates.
            this.promisePollingResults = this.createPromisePollingResults();
            this.promisePollingAppList = this.createPromiseAppList();

            // Wait for the provisioning done.
            this.onExitProvisioningFlow(promiseSet);
        }

        onExitProvisioningFlow(promiseSet) {
            let internalPromiseSet = {};
            internalPromiseSet.promiseWaitForForceCompletion = new WinJS.Promise((onComplete, onError) => {
                try {
                    this.signalForceCompletion.subscribe((newValue) => {
                        if (newValue == true) {
                            onComplete(true);
                        }
                    });
                }
                catch (err) {
                    onError(err);
                }
            });

            internalPromiseSet.promiseWaitForNormalProvisioning =
            WinJS.Promise.join(promiseSet).then((resultSet) => {
                // Ensure we won't enter the provisioning flow again by gestures.
                bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "hasProvisionedThisSession", true);

                if (this.pluginManager.isRebootRequired()) {
                    // Case 1: Request CXH OOBE to reboot and come back for turn #3.
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "OobeProvisioningResumeContinuation", true);
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningCommitRebootRequired");
                    bridge.invoke("CloudExperienceHost.setRebootForOOBE", "OobeProvisioningStatus");
                    bridge.fireEvent(constants.Events.done, constants.AppResult.action3);
                }
                else if (!this.isResumed) {
                    // Case 2: Navigate away, but request to come back for turn #3 immediately.
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "OobeProvisioningResumeContinuation", true);
                    bridge.fireEvent(constants.Events.done, constants.AppResult.action2);
                }
                else {
                    // Case 3: No additional turn #3 to run. Go to error report view if any errors.
                    bridge.invoke("CloudExperienceHost.Telemetry.oobeHealthEvent", CloudExperienceHostAPI.HealthEvent.enterpriseProvisioningCensusResult, 0);
                    return true;
                }

                return false;
            })
            .then(null, (error) => {
                // Generic error handler.
                // Any unhandled errors up the promise chain should be captured here.
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", this.isResumed ? "oobeProvisioningTurn3Failed" : "oobeProvisioningTurn2Failed", core.GetJsonFromError(error));
                bridge.invoke("CloudExperienceHost.Telemetry.oobeHealthEvent", CloudExperienceHostAPI.HealthEvent.enterpriseProvisioningCensusResult, error.number ? error.number : 0x8000ffff);
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);

                return false;
            });

            // No matter what promise comes first, it need to carry a boolean value to indicate "should we check the error view or exit".
            // For force completion case, it always set the value to true to force the error view to be shown.
            WinJS.Promise.any(internalPromiseSet).then((result) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningOnExitReason", result.key);

                // Disable the 'esc' hotkey listener, since we are done with the provisioning.
                this.hotKeyEnabled(false);
                return result.value;
            })
            .then((result) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningCheckErrorReportOrExit", result);
                if (result) {
                    this.checkOrExitErrorReport();
                }
            });
        }

        createPromisePollingResults() {
            // Break the polling when in the error report.
            if (this.stopPollingResults) {
                return WinJS.Promise.as(true);
            }

            let provDataResult = {};

            // Get the real-time updates.
            return this.pluginManager.getLastProvisioningResultsAsync().then((results) => {
                provDataResult = results;
                this.checkAndSignalNoStagedResults(results);

                return this.pluginManager.getLastProvisioningCommandResultsAsync();
            })
            .then((results) => {
                this.updateProvisioningResults(provDataResult);
                this.updateProvisioningCommandsResults(results);

                return WinJS.Promise.timeout(this.pollingInterval);
            })
            .then(() => {
                return this.createPromisePollingResults();
            })
            // Regardless of the errors, we continue the polling.
            .then(null, (error) => {
                return WinJS.Promise.timeout(this.pollingInterval);
            })
            .then(() => {
                return this.createPromisePollingResults();
            });
        }

        updateProvisioningResults(results) {
            this.provResults.removeAll();

            let completionStateByGroup = {};
            let errorStateByGroup = {};
            // (1) Aggregate the completion states by category (or user named child node)
            // {
            //     categoryA: [NotStarted, NotStarted, Staged, Completed],
            //     categoryB: [NotStarted, NotStarted],
            //     categoryC: [NotStarted, NotStarted, Staged],
            //     categoryD: [Staged, Completed],
            //     categoryE: [Completed]
            // }
            results.forEach((currentResult) => {
                let index = currentResult.categoryId;

                if (currentResult.userNamedChildNode) {
                    index = currentResult.userNamedChildNode;
                }

                if (!completionStateByGroup[index]) {
                    completionStateByGroup[index] = [];
                }

                completionStateByGroup[index].push(currentResult.completionState);

                if (!errorStateByGroup[index]) {
                    errorStateByGroup[index] = false;
                }

                if (currentResult.hasError) {
                    errorStateByGroup[index] = currentResult.hasError;
                }
            });

            let shownStateByGroup = {};
            // (2) Compute the shown state.
            // {
            //     categoryA: "Running",
            //     categoryB: "Running",
            //     categoryC: "Running",
            //     categoryD: "Running",
            //     categoryE: "Completed"
            // }
            for (var key in completionStateByGroup) {
                shownStateByGroup[key] = "Completed";

                completionStateByGroup[key].forEach((currentResult) => {
                    if (currentResult != "Completed") {
                        shownStateByGroup[key] = "Running"
                    }
                });
            }

            // (3) Construct the bound-data.
            // [
            //     {
            //         contentCategory: "Enroll this device to active directory",
            //         localizedCompletionState: "Completed"
            //     },
            //     ...
            // ]
            for (var key in shownStateByGroup) {
                let currentResult = {};

                currentResult.hasError = ko.observable();
                currentResult.hasError(false);

                currentResult.contentCategory = key;
                if (this.resourceStrings["ContentCategory" + key]) {
                    currentResult.contentCategory = this.resourceStrings["ContentCategory" + key];
                }

                if (this.appDisplayNameList[key]) {
                    currentResult.contentCategory = this.appDisplayNameList[key].displayName;
                }

                currentResult.isRunning = (shownStateByGroup[key] == "Running");
                currentResult.localizedCompletionState = "";
                if (this.resourceStrings["CompletitonState" + shownStateByGroup[key]]){
                    currentResult.localizedCompletionState = this.resourceStrings["CompletitonState" + shownStateByGroup[key]];
                }

                if (errorStateByGroup[key]) {
                    currentResult.hasError(true);
                    currentResult.localizedCompletionState = this.resourceStrings["CompletitonStateFailed"];
                }

                // Categories we don't show to users, unless there are errors.
                let categoryNotShown = ["Provisioning", "Reboot", "InitialCustomization"];
                if ((categoryNotShown.indexOf(key) != -1) && (!currentResult.hasError())) {
                    continue;
                }

                this.provResults.push(currentResult);
            }
        }

        updateProvisioningCommandsResults(results) {
            results.forEach((currentResult) => {
                let newResult = {};

                newResult.hasError = ko.observable();

                newResult.contentCategory = this.resourceStrings["ContentCategoryScripts"];
                newResult.contentCategory += " (" + currentResult.name + ")";

                newResult.localizedCompletionState = this.resourceStrings["CompletitonState" + currentResult.completionState];
                newResult.isRunning = (currentResult.completionState == "Staged");
                newResult.hasError(currentResult.completionState == "Failed");

                this.provResults.push(newResult);
            });
        }

        checkAndSignalNoStagedResults(results) {
            let anyStaged = false;
            let anyNotStarted = false;
            let anyError = false;

            results.forEach((currentResult) => {
                if (currentResult.completionState == "Staged") {
                    anyStaged = true;
                }
                else if (currentResult.completionState == "NotStarted") {
                    anyNotStarted = true;
                }
                else if (currentResult.hasError) {
                    anyError = true;
                }
            });

            // No staged settings means we are safe to continue to reboot, exit, or show error options.
            if (!anyStaged && (!anyNotStarted || anyError || this.pluginManager.isRebootRequired())) {
                this.signalNoStagedResults(true);
            }
        }

        createPromiseWaitForNoStagedResults() {
            return new WinJS.Promise((onComplete, onError) => {
                try {
                    this.signalNoStagedResults.subscribe((newValue) => {
                        if (newValue == true) {
                            onComplete();
                        }
                    });
                }
                catch (err) {
                    onError(err);
                }
            });
        }

        createPromiseAppList() {
            // Break the polling when in the error report.
            if (this.stopPollingResults) {
                return WinJS.Promise.as(true);
            }

            // Get the real-time updates.
            return this.pluginManager.findAppPackagesAsync().then((results) => {
                this.appDisplayNameList = results;
                return WinJS.Promise.timeout(this.pollingInterval);
            })
            .then(() => {
                return this.createPromiseAppList();
            })
            // Regardless of the errors, we continue the polling.
            .then(null, (error) => {
                return WinJS.Promise.timeout(this.pollingInterval);
            })
            .then(() => {
                return this.createPromiseAppList();
            });
        }

        // The hot-key "esc" handler
        handleHotKey(ev) {
            // KeyCode 27 is the escape key.
            if (ev.keyCode != 27) {
                return;
            }

            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningEscapeConfirmStart").then(() => {
                this.confirmDialogManager.show(
                    this.resourceStrings.EscapeConfirmationDialogTitle,
                    null,
                    this.resourceStrings.ConfirmationDialogCommandYes,
                    this.resourceStrings.ConfirmationDialogCommandNo,
                    this.onEscapeConfirmCheck.bind(this));
            });
        }

        onEscapeConfirmCheck(eventInfo) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningEscapeConfirmCompleted", JSON.stringify({ result: eventInfo.detail.result }));

            if (eventInfo.detail.result != WinJS.UI.ContentDialog.DismissalResult.primary) {
                // User cancelled.
                return;
            }

            // Signal the completion.
            this.signalForceCompletion(true);
        }

        onReset() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningResetConfirmStart").then(() => {
                this.confirmDialogManager.show(
                    this.resourceStrings.ResetConfirmationDialogTitle,
                    null,
                    this.resourceStrings.ConfirmationDialogCommandYes,
                    this.resourceStrings.ConfirmationDialogCommandNo,
                    this.onResetConfirmCheck.bind(this));
            });
        }

        onResetConfirmCheck(eventInfo) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningResetConfirmCompleted", JSON.stringify({ result: eventInfo.detail.result }));

            if (eventInfo.detail.result != WinJS.UI.ContentDialog.DismissalResult.primary) {
                // User cancelled.
                return;
            }

            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningSystemResetStart").then(() => {
                return this.pluginManager.initiateSystemResetAsync();
            })
            .then(() => {
                return bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningSystemResetCompleted");
            })
            .then(null, (error) => {
                return bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeProvisioningSystemResetError", core.GetJsonFromError(error));
            });
        }
    }

    ko.bindingHandlers.oobeProvHotKeys = {
        update: function (element, valueAccessor) {
            let supportHotKeys = ko.unwrap(valueAccessor());
            if (supportHotKeys) {
                let vm = ko.dataFor(element);
                element.hotkeyDownHandler = vm.handleHotKey.bind(vm);
                element.addEventListener("keydown", element.hotkeyDownHandler);
            }
            else if (element.hotkeyDownHandler) {
                element.removeEventListener("keydown", element.hotkeyDownHandler);
                element.hotkeyDownHandler = null;
            }
        }
    };

    return ProvisioningStatusViewModel;
});
