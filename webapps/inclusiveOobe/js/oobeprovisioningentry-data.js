//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge'], (ko, bridge) => {
    class OobeProvisioningEntryData {
        getProvisioningDataAsync() {
            let provisioningData = {
                packages: []
            };

            // Get list of provisioning packages from plugin manager
            let pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
            return pluginManager.getPackagesFromProvidersAsync().then((packages) => {
                provisioningData.packages = packages;
                return provisioningData;
            });
        }
    }
    return new OobeProvisioningEntryData();
});