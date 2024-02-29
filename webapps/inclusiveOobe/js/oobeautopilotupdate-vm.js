//
// Copyright (C) Microsoft. All rights reserved.
//

define(['lib/knockout', 'legacy/bridge', 'legacy/appObjectFactory', 'legacy/events', 'legacy/core', 'corejs/autopilotCore'], (ko, bridge, appObjectFactory, constants, core, autopilotCore) => {
    class AutopilotUpdateViewModel {
        constructor(resourceStrings) {
            this.updateMessageText = ko.observable(resourceStrings.UpdateMessageText);

            this.resourceStrings = resourceStrings;

            this.isLiteWhitePersonality = ko.pureComputed(() => {
                return targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite;
            });

            // Ignore promise return value, it'll complete itself
            this.startUpdateAsync();
        }

        async handleAutopilotUpdateResultAsync(result) {
            const FinishedMessageDelay = 2000;

            if (result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotUpdateStatus.noUpdateAvailable) {
                await bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "No Autopilot update available");
            } else if (result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotUpdateStatus.updateInstalledAndNeedsReboot) {
                this.updateMessageText(this.resourceStrings.UpdateMessageRestartText);
                await bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot update installed and needs reboot");

                await this.setDeviceUpForReboot();

                await WinJS.Promise.timeout(FinishedMessageDelay);
            } else if (result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotUpdateStatus.updateInstalled) {
                await bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot update installed and does not need reboot. We are forcing a reboot to re-consume updated .js files");
                this.updateMessageText(this.resourceStrings.UpdateMessageRestartText);

                await this.setDeviceUpForReboot();

                await WinJS.Promise.timeout(FinishedMessageDelay);
            } else if (result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotUpdateStatus.unknownFailure) {
                await bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot update unknownFailure");
                throw new Error("AutopilotUpdateStatus.unknownFailure");
            } else if (result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotUpdateStatus.updateFailed) {
                await bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Autopilot updateFailed");
                throw new Error("AutopilotUpdateStatus.updateFailed");
            } else {
                throw new Error("AutopilotUpdateStatus.unknownState");
            }
        }

        async setDeviceUpForReboot()
        {
            try {
                const UpdateRebootCXIDKey = "UpdateRebootCXID";
                // Mark that this reboot is caused by autopilot update, and force the start selector to jump to the Autopilot prefetch page.
                await bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "resetFromAutopilotUpdate", true);
                await bridge.invoke("CloudExperienceHost.setRebootForOOBE", "AutopilotPrefetch");

                let autopilotServer = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();

                // Update UpdateRebootCXIDKey to jump back to this page if it currently isn't set.
                let existingUpdateRebootCXID = await autopilotServer.getSettingAsync(UpdateRebootCXIDKey);
                if (existingUpdateRebootCXID === "")
                {
                    let currentNode = await bridge.invoke("CloudExperienceHost.AutoPilot.AutopilotWrapper.GetCurrentNode");
                    await autopilotServer.storeSettingAsync(UpdateRebootCXIDKey, currentNode.cxid);
                }

                // Clear auto-logon creds since they're invalid post-reboot. Not clearing would make Windows try to use it and prompt an error to the user.
                let enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.clearAutoLoginData();
            } catch (error) {
                await bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AutopilotUpdatePage_setDeviceUpForReboot: Error occured while getting/setting the UpdateRebootCXID setting", JSON.stringify({ error: e }));
            }
        }

        async handleAutopilotUpdateProgressNotificationAsync(progress) {
            await bridge.invoke("CloudExperienceHost.Telemetry.logEvent", `Autopilot Update Progress: ${JSON.stringify(progress)}`);

            if (progress.autopilotUpdateState === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotUpdateState.downloading) {
                this.updateMessageText(this.resourceStrings.UpdateMessageDownloadingText_param.replace("{0}", progress.currentStateProgress));
            } else if (progress.autopilotUpdateState === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotUpdateState.installing) {
                this.updateMessageText(this.resourceStrings.UpdateMessageInstallingText_param.replace("{0}", progress.currentStateProgress));
            }
        }

        performAutopilotUpdateAndHookProgressToUIAsync() {
            return autopilotCore.performAutopilotUpdateWithProgressAsync()
                .then(
                    result => this.handleAutopilotUpdateResultAsync(result),
                    null, // don't handle errors, let them propagate
                    progress => this.handleAutopilotUpdateProgressNotificationAsync(progress)
                );
        }

        async startUpdateAsync() {
            try {
                await bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "oobeAutopilotUpdateStarted");

                const timeoutDuration = await autopilotCore.getAutopilotUpdateTimeoutAsync();

                const updatePromise = this.performAutopilotUpdateAndHookProgressToUIAsync();

                await WinJS.Promise.timeout(timeoutDuration, updatePromise);

                bridge.fireEvent(constants.Events.done, constants.AppResult.success);
            } catch (error) {
                await bridge.invoke("CloudExperienceHost.Telemetry.logEvent", `AutopilotUpdateFailed: ${error}`);
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            }
        }
    }

    return AutopilotUpdateViewModel;
});
