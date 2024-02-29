//
// Copyright (C) Microsoft. All rights reserved.
//

define([], () => {
    function normalizePromise(promise) {
        return new WinJS.Promise((resolve, reject) => {
            Promise.resolve(promise).then(resolve, reject);
        });
    }

    class AutopilotModule {
        constructor() {
            this.autopilotManager = null;
        }

        isAutopilotEnabledAsync() {
            return normalizePromise(
                EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.isLocalProfileAvailableAsync()
                    .then(isProfileAvailable => isProfileAvailable, () => false)
            );
        }

        shouldSkipAutoPilotUpdateAsync() {
            return normalizePromise((async () => {
                try {
                    if (await this.isAutopilotEnabledAsync()) {
                        const isUpdateDisabled = (await EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getDwordPolicyAsync("CloudAssignedAutopilotUpdateDisabled") === 1);

                        await CloudExperienceHost.Telemetry.logEvent(isUpdateDisabled ? "AutoPilot_ShouldSkipAutoPilotUpdate_SkippingBecauseDisabled" : "AutoPilot_ShouldSkipAutoPilotUpdate_NoSkippingBecauseEnabled");

                        return isUpdateDisabled; // return we should skip if update is explicitly disabled
                    }

                    // Skip when no AP enabled
                    return true;
                } catch (err) {
                    CloudExperienceHost.Telemetry.logEvent("Autopilot_AutoPilotUpdatePage_GetShouldSkipOptOutAsyncFailed", JSON.stringify({ error: err }));
                    return true;
                }
            })());
        }

        getAutopilotUpdateTimeoutAsync() {
            const DefaultTimeoutMS = 1800000; // 1000 * 60 * 30 = 30m

            return normalizePromise((async () => {
                const isApEnabled = await this.isAutopilotEnabledAsync();
                if (!isApEnabled) {
                    // not now: throw new Error("Autopilot not enabled");
                }

                const timeoutDuration = await this.getAutopilotManager().getDwordPolicyAsync("AutopilotUpdateTimeout");

                return (timeoutDuration === 0 ? DefaultTimeoutMS : timeoutDuration);
            })());
        }

        performAutopilotUpdateWithProgressAsync() {
            return normalizePromise(this.getAutopilotManager().performAutopilotUpdateWithProgressAsync());
        }

        getAutopilotManager() {
            if (!this.autopilotManager) {
                this.autopilotManager = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();
            }

            return this.autopilotManager;
        }
    }

    return new AutopilotModule();
});
