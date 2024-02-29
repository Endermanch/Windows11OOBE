//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/appObjectFactory', 'legacy/events', 'legacy/core', 'oobezdp-helpers',
    'optional!sample/Sample.Oobe.ZdpManager'],
    (ko, bridge, appObjectFactory, constants, core, oobeZdpHelpers) => {

    class ZdpViewModel {
        constructor(resourceStrings, targetPersonality) {
            this.resourceStrings = resourceStrings;
            this.hasExitBeenCalled = false;
            this.isSpeechInProgress = ko.observable(false);
            this.populateZTPPolicyCacheCompleted = ko.observable(false);

            // Set to notify always, since we need to exit even if there is any error not relating to speech,
            // once all conditions are met.
            this.isSpeechInProgress.extend({ notify: 'always' });
            this.populateZTPPolicyCacheCompleted.extend({ notify: 'always' });

            // Prevent done event to be fired multiple times
            this.hasDoneEventFired = false;

            // Subscribe to the set of events (speech completed and ZTP policy cache population completed) that
            // can trigger exit of the webapp. For speech, this subscription is for the final string that is spoken
            // before we exit the webapp. Since that string might be long in different languages, we provide additional
            // timeout for voice to complete before exit.
            this.isSpeechInProgress.subscribe(() => {
                this.fireDoneEventIfNecessary();
            });
            this.populateZTPPolicyCacheCompleted.subscribe(() => {
                this.fireDoneEventIfNecessary();
            });

            this.isLiteWhitePersonality = ko.pureComputed(() => {
                return targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite;
            });

            this.progressText = ko.observable("");
            this.progressText.subscribe((newTitle) => {
                document.title = newTitle;
            });
            this.zdpStatus = CloudExperienceHostAPI.OobeZdpStatus.none;
            this.zdpManager = appObjectFactory.getObjectFromString("CloudExperienceHostAPI.OobeZdpManagerStaticsCore");

            // Build the map of status handler objects
            this.statusMaps = {};
            this.statusMaps[CloudExperienceHostAPI.OobeZdpStatus.scanning] = new oobeZdpHelpers.ScanningStatusHandler(this);
            let downloadingAndInstallingStatusHandler = new oobeZdpHelpers.DownloadingAndInstallingStatusHandler(this);
            this.statusMaps[CloudExperienceHostAPI.OobeZdpStatus.downloading] = downloadingAndInstallingStatusHandler;
            this.statusMaps[CloudExperienceHostAPI.OobeZdpStatus.installing] = downloadingAndInstallingStatusHandler;
            this.statusMaps[CloudExperienceHostAPI.OobeZdpStatus.finished] = new oobeZdpHelpers.FinishedStatusHandler(this);
            this.statusMaps[CloudExperienceHostAPI.OobeZdpStatus.skipped] = new oobeZdpHelpers.SkippedStatusHandler(this);
            this.statusQueue = [];

            this.zdpManager.onstatuschanged = (status) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ZDPStatusChanged", status);
                this.startTimer();
                this.statusQueue.push(status);
                this.processStatusQueue();
            };

            setImmediate(() => {
                this.startUpdate();
                this.populateZTPPolicyCache().done(() => {
                    this.populateZTPPolicyCacheCompleted(true);
                });
            });
        }

        fireDoneEventIfNecessary() {
            if ((this.isSpeechInProgress() == false) && (this.hasDoneEventFired == false) && this.hasExitBeenCalled && this.exitEvent && this.populateZTPPolicyCacheCompleted()) {
                this.hasDoneEventFired = true;
                if ((this.exitEvent === constants.AppResult.success) && this.isRebootRequired()) {
                    bridge.invoke("CloudExperienceHost.setRebootForOOBE");
                }
                this.dispose();
                if (this.exitTimer) {
                    clearTimeout(this.exitTimer);
                    this.exitTimer = null;
                }
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ZDPExitEvent");
                bridge.fireEvent(constants.Events.done, this.exitEvent);
            }
        }

        populateZTPPolicyCache() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "populateZTPPolicyCacheStarted");
            let startTime = performance.now();
            let populateZTPCachePromise = EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.retrieveSettingsAsync().then(() => {
                let details = { timeElapsed: performance.now() - startTime };
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeZTPCacheReturned", JSON.stringify(details));
            }, (error) => {
                let errorJson = core.GetJsonFromError(error);
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeZTPCacheFailure", errorJson);
            });
            // The ZTP call doesn't actually support cancellation and is basically fire-and-forget,
            // but we wait up to 36 seconds for it to finish before moving on to give it adequate time to complete per commercial business requirements.
            // This number is based on telemetry for the +99% download completion rate across all machines, and AutoPilot
            // is now disabled on Core so the worst-case for a consumer device is poor connectivity on Pro where the API doesn't
            // immediately fail due to no network.  Note that this timeout is in parallel to any ZDP download and may finish
            // before patching has completed.  Any previous cache population should result in this immediately returning success as well.
            let timedOut = false;
            let timeoutPromise = WinJS.Promise.timeout(36000 /*36 second timeout*/).then(() => { timedOut = true; });
            return WinJS.Promise.any([populateZTPCachePromise, timeoutPromise]).then((result) => {
                if (timedOut) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ZTPPolicyCacheTimeout");
                }
                else {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ZTPPolicyCacheAttemptDone");
                }
            });
        }

        dispose() {
            this.cancelTimer();
            this.zdpManager.onstatuschanged = null;
        }

        onProgressTextChange(newTextResID) {
            this.progressText(resourceStrings[newTextResID]);
        }

        processStatusQueue() {
            if (!this.processQueueIntervalID) {
                // Pick up the first item in the queue immediately and then check the queue periodically with a fixed interval
                // This will make sure strings shown in the zdp page can stay on the screen for a certain amount of time, even if multiple zdp status changes come in a small window
                this.processStatusQueueItem();
                this.processQueueIntervalID = setInterval(() => {
                    this.processStatusQueueItem();
                }, oobeZdpHelpers.constants.interval);
            }
        }

        processStatusQueueItem() {
            if (this.statusQueue.length > 0) {
                let status = this.statusQueue.shift();
                if (this.zdpStatus != CloudExperienceHostAPI.OobeZdpStatus.none) {
                    this.statusMaps[this.zdpStatus].leave(status);
                }
                this.statusMaps[status].enter(this.zdpStatus, status);
                this.zdpStatus = status;
            }
            else {
                clearInterval(this.processQueueIntervalID);
                this.processQueueIntervalID = null;
            }
        }

        startUpdate() {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeZDPUpdateStarted");
            this.zdpManager.startUpdateAsync().done(() => { },
                (error) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ZDPUpdateFailure", core.GetJsonFromError(error));
                this.exit(constants.AppResult.fail);
            });
            this.startTimer();
        }

        exit(event) {
            this.hasExitBeenCalled = true;
            this.exitEvent = event;
            // We provide an additional timeout for 5 seconds for long strings at the end of this webapp in different languages
            // Strings running longer than additional 5 seconds will be cut off
            this.exitTimer = setTimeout(() => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ZDPExitTimerFired");
                this.isSpeechInProgress(false);
            }, 5000);
        }

        cancelUpdate() {
            this.zdpManager.cancelUpdateAsync().done(() => { /* success do nothing */ },
                (error) => {
                    this.exit(constants.AppResult.cancel);
                });
        }

        startTimer() {
            this.cancelTimer();
            this.cancelTimerID = setTimeout(() => {
                this.cancelUpdate();
            }, oobeZdpHelpers.constants.zdpTimeout);
        }

        cancelTimer() {
            if (this.cancelTimerID) {
                clearTimeout(this.cancelTimerID);
                this.cancelTimerID = null;
            }
        }

        showPage() {
            bridge.fireEvent(constants.Events.visible, true);
        }

        isRebootRequired() {
            if (!this.rebootRequired) {
                this.rebootRequired = this.zdpManager.rebootRequired;
            }
            return this.rebootRequired;
        }

        onSpeechError(error) {
            this.isSpeechInProgress(false);
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ZDPVoiceOverError", core.GetJsonFromError(error));
        }

        onSpeechComplete() {
            this.isSpeechInProgress(false);
        }

        onSpeechStarting() {
            this.isSpeechInProgress(true);
        }
    }
    return ZdpViewModel;
});
