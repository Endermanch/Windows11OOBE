// Copyright (C) Microsoft. All rights reserved.

define(['legacy/core'], (core) => {
    class OobeNetworkLogging {
        launchAsync()
        {
            try
            {
                let connectionProfile = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();
                if (!connectionProfile) {
                    CloudExperienceHost.Telemetry.logEvent("OobeNetworkLogging_NullConnectionProfile");
                    return WinJS.Promise.as(CloudExperienceHost.AppResult.success);
                }
                let isWifi = connectionProfile.isWlanConnectionProfile;
                let isCellular = connectionProfile.isWwanConnectionProfile;
                let isEthernet = !isWifi && !isCellular;
                let costType = connectionProfile.getConnectionCost().networkCostType;
                let securitySettings = connectionProfile.networkSecuritySettings;
                let authenticationType = securitySettings.networkAuthenticationType;
                let encryptionType = securitySettings.networkEncryptionType;
                let captivePortalState = CloudExperienceHost.Storage.VolatileSharableData.getItem("NetworkingValues", "CaptivePortalConnect") ? true : false;
                CloudExperienceHost.Telemetry.logEvent("OobeNetworkLogging_SuccessfulConnection", JSON.stringify({
                    "isWifi": isWifi,
                    "isCellular": isCellular,
                    "isEthernet": isEthernet,
                    "captivePortalState": captivePortalState,
                    "costType": costType,
                    "authenticationType": authenticationType,
                    "encryptionType": encryptionType
                }));
                return WinJS.Promise.as(CloudExperienceHost.AppResult.success);
            }
            catch (err) {
                CloudExperienceHost.Telemetry.logEvent("OobeNetworkLoggingFailure", core.GetJsonFromError(err));
                return WinJS.Promise.as(CloudExperienceHost.AppResult.fail);
            }
        }
    }
    return OobeNetworkLogging;
});
