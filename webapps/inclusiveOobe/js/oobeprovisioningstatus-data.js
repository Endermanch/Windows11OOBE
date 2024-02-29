//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge'], (ko, bridge) => {
    class OobeProvisioningStatusData {
        getLastProvisioningResultsAsync() {
            let provisioningResults = {
            };

            return bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "OobeProvisioningResumeContinuation").then((result) => {
                provisioningResults.isResumed = result;

                return bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "OobeProvisioningSourceOverride");
            })
            .then((result) =>{
                provisioningResults.sourceOverride = result;
                return provisioningResults;
            });
        }
    }
    return new OobeProvisioningStatusData();
});