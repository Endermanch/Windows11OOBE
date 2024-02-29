//
// Copyright (C) Microsoft. All rights reserved.
//

define(['legacy/core'], (core) => {
    class OobeEnterpriseProvisioningAfterConnectivity {
        launchAsync() {
            let pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();

            return pluginManager.applyAfterConnectivityPackagesAsync().then(() => {
                CloudExperienceHost.Telemetry.logEvent("OobeEnterpriseProvisioningAfterConnectivitySucceeded");
                return CloudExperienceHost.AppResult.success;
            },
            (error) => {
                CloudExperienceHost.Telemetry.logEvent("OobeEnterpriseProvisioningAfterConnectivityFailed", core.GetJsonFromError(error));
                return CloudExperienceHost.AppResult.fail;
            });
        }
    }
    return OobeEnterpriseProvisioningAfterConnectivity;
});