//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var DeviceDisplayNameSetup;
    (function (DeviceDisplayNameSetup) {
        function setDisplayName(displayName) {
            try {
                // Try to create the ResourceAccount Manager.  If this succeeds, then store the display name
                // to be used for the Resource Account.
                let resourceAccountManagerSetup = new Microsoft.ResourceAccountManager.ResourceAccountSetup();
                CloudExperienceHost.Storage.SharableData.addValue("resourceAccountDisplayName", displayName);
            }
            catch (err) {
                // Nothing to do here, just don't want the failure to bubble out.
            }
            return Hub.DeviceConfig.DeviceDisplayNameSetup.setDisplayNameAsync(displayName);
        }
        DeviceDisplayNameSetup.setDisplayName = setDisplayName;
    })(CloudExperienceHost.DeviceDisplayNameSetup || (CloudExperienceHost.DeviceDisplayNameSetup = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
