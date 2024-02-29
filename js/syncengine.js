//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var OneDrive;
    (function (OneDrive) {
        function setOobeOneDriveOptin(optinValue) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                let oobeOneDriveOptin = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCoreForUser;
                oobeOneDriveOptin.setOOBEOneDriveOptinForUserAsync(user, optinValue).done(() => {
                    completeDispatch();
                }, (err) => {
                    errorDispatch(err);
                }, (progress) => {
                    progressDispatch(progress);
                });
            });
        }
        OneDrive.setOobeOneDriveOptin = setOobeOneDriveOptin;

        function getOobeOneDriveOptin() {
            let user = CloudExperienceHost.IUserManager.getInstance().getIUser();
            let oobeOneDriveOptin = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCoreForUser;
            return oobeOneDriveOptin.getOOBEOneDriveOptinForUser(user);
        }
        OneDrive.getOobeOneDriveOptin = getOobeOneDriveOptin;

        function getShouldSkipAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                // China devices should skip OneDrive-related nodes, as they'll timeout in navigating to the OneDrive endpoint
                let oneDriveExcludedRegionList = ["cn", "chn"];
                if (oneDriveExcludedRegionList.indexOf(CloudExperienceHost.Globalization.GeographicRegion.getCode().toLowerCase()) > -1) {
                    completeDispatch(true);
                }
                else {
                    completeDispatch(false);
                }
            });
        }
        OneDrive.getShouldSkipAsync = getShouldSkipAsync;

        function syncClientInvokeAsync(request) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCoreForUser.syncClientInvokeForUserAsync(user, request)
                    .done(function (result) { completeDispatch(result); }, function(err) { errorDispatch(err); }, function(progress) { progressDispatch(progress); });
            });
        }
        OneDrive.syncClientInvokeAsync = syncClientInvokeAsync;

        function writeTargetingIdentifierAsync(identifier) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let oobeOneDriveOptin = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCore;
                oobeOneDriveOptin.writeTargetingIdentifierAsync(identifier)
                    .done(function () { completeDispatch(); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
            });
        }
        OneDrive.writeTargetingIdentifierAsync = writeTargetingIdentifierAsync;

        function writeUserIntentForOfficeAsync(user, intent) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let oobeOneDriveOptin = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCore;
                oobeOneDriveOptin.writeUserIntentForOfficeAsync(user, intent)
                    .done(function () { completeDispatch(); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
            });
        }
        OneDrive.writeUserIntentForOfficeAsync = writeUserIntentForOfficeAsync;

        function getRemainingSpaceForTaskbarPinningAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let oobeOneDriveOptin = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCore;
                oobeOneDriveOptin.getRemainingSpaceForTaskbarPinningAsync()
                    .done(function (result) { completeDispatch(result); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
            });
        }
        OneDrive.getRemainingSpaceForTaskbarPinningAsync = getRemainingSpaceForTaskbarPinningAsync;

        function getAreAppsPinnedAsync(aumids) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let oobeOneDriveOptin = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCore;
                oobeOneDriveOptin.getAreAppsPinnedAsync(aumids)
                    .done(function (result) { completeDispatch(result); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
            });
        }
        OneDrive.getAreAppsPinnedAsync = getAreAppsPinnedAsync;

        function pinOfficeAppsAsync(aumids) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let oobeOneDriveOptin = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCore;
                oobeOneDriveOptin.tryPinOfficeAppsAsync(aumids)
                    .done(function (result) { completeDispatch(result); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
            });
        }
        OneDrive.pinOfficeAppsAsync = pinOfficeAppsAsync;

        function isAppPackageProvisionedAsync(packageFamilyName) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                CloudExperienceHostAPI.UtilStaticsCore.isAppPackageProvisionedAsync(packageFamilyName)
                    .done(function (result) { completeDispatch(result); }, function(err) { errorDispatch(err); }, function(progress) { progressDispatch(progress); });
            });
        }
        OneDrive.isAppPackageProvisionedAsync = isAppPackageProvisionedAsync;

        function tryGetOfficeRegistryValueAsync(keyPath, valueName) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                let result = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCoreForUser.tryGetOfficeRegistryValueForUser(user, keyPath, valueName);
                completeDispatch(JSON.stringify({ "succeeded": result.succeeded, "value": result.value }));
            });
        }
        OneDrive.tryGetOfficeRegistryValueAsync = tryGetOfficeRegistryValueAsync;

        function tryGetOfficeRegistryValueForMachineAsync(keyPath, valueName) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let result = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCore.tryGetOfficeRegistryValueForMachine(keyPath, valueName);
                completeDispatch(JSON.stringify({ "succeeded": result.succeeded, "value": result.value }));
            });
        }
        OneDrive.tryGetOfficeRegistryValueForMachineAsync = tryGetOfficeRegistryValueForMachineAsync;

        function tryGetUninstallRegistryValueForMachineAsync(keyPath, valueName) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let result = CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCore.tryGetUninstallRegistryValueForMachine(keyPath, valueName);
                completeDispatch(JSON.stringify({ "succeeded": result.succeeded, "value": result.value }));
            });
        }
        OneDrive.tryGetUninstallRegistryValueForMachineAsync = tryGetUninstallRegistryValueForMachineAsync;

        function wasCentennialOfficeEverActivated() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                completeDispatch(CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCore.wasCentennialOfficeEverActivated());
            });
        }
        OneDrive.wasCentennialOfficeEverActivated = wasCentennialOfficeEverActivated;

    })(CloudExperienceHost.OneDrive || (CloudExperienceHost.OneDrive = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
