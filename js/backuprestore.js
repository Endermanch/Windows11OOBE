//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var BackupRestore;
    (function (BackupRestore) {
        function setRestoreProfileAsync(profileId, correlationVector) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                if ((correlationVector === null) || (correlationVector === undefined)) {
                    correlationVector = "";
                }
                CloudExperienceHostAPI.BackupRestoreManager.setRestoreProfileAsync(profileId, correlationVector).done(function () {
                    completeDispatch();
                }, function (e) { errorDispatch(e); });
            });
        }
        BackupRestore.setRestoreProfileAsync = setRestoreProfileAsync;
        function downloadUserRestoreDataAsync(deviceProfileId, profileDataRoamingUserToken) {
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeRestoreDataLayer")) {
                return CloudExperienceHostAPI.BackupRestoreManager.downloadUserRestoreDataAsync(deviceProfileId, profileDataRoamingUserToken);
            }
            else {
                CloudExperienceHost.Telemetry.logEvent("Feature_OobeRestoreDataLayer_Disabled", "downloadUserRestoreDataAsync");
                throw "ApiNonexistentOnClient";
            }
        }
        BackupRestore.downloadUserRestoreDataAsync = downloadUserRestoreDataAsync;
        function setSystemRestoreEnabledAsync(enabled) {
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeRestoreDataLayer")) {
                return CloudExperienceHostAPI.BackupRestoreManager.setSystemRestoreEnabledAsync(enabled);
            }
            else {
                CloudExperienceHost.Telemetry.logEvent("Feature_OobeRestoreDataLayer_Disabled", "setSystemRestoreEnabledAsync");
                throw "ApiNonexistentOnClient";
            }
        }
        BackupRestore.setSystemRestoreEnabledAsync = setSystemRestoreEnabledAsync;
        function downloadUserFileAsync(userFileType, userFileUri, userFileRequestHeaders, localSavedFileName, timeoutInSecs) {
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeRestoreDataLayer")) {
                if ((userFileUri != null) && (userFileUri.trim() != "")) {
                    // Make sure that the URI gets logged without accidental PII in it.
                    CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}`, CloudExperienceHost.UriHelper.RemovePIIFromUri(userFileUri));
                    // We'll save the image with the name specified by the caller.
                    if ((localSavedFileName == null) || (localSavedFileName.trim() == "")) {
                        CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error_InvalidLocalSavedFileName`);
                        throw "InvalidLocalSavedFileName";
                    }
                    // The downloaded file will be saved to LocalState in a predefined directory.
                    const restoreFolderName = "cloudrestore";
                    const fileFolderName = userFileType.toLowerCase();
                    let localFileUri = "ms-appdata:///local/" + restoreFolderName + "/" + fileFolderName + "/" + localSavedFileName;
                    CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_FileDownloadStarted`);
                    try {
                        // Initialize default client and headers
                        let httpClient = new Windows.Web.Http.HttpClient();
                        let requestHeaders = httpClient.defaultRequestHeaders;
                        let fileUri = new Windows.Foundation.Uri(userFileUri);
                        // Headers should include the authorization token to access the file.
                        if (userFileRequestHeaders) {
                            for (const key in userFileRequestHeaders) {
                                if (!requestHeaders.tryAppendWithoutValidation(key, userFileRequestHeaders[key])) {
                                    // We won't throw an error if this fails, but we'll fail the download later and catch the error there.
                                    CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error_HeaderAppendFailure`, key);
                                }
                            }
                        }
                        // Include a timeout for the operation
                        let fileDownloadComplete = false;
                        let timedOut = false;
                        let timeoutPromise = WinJS.Promise.timeout(timeoutInSecs * 1000 /* to milliseconds */).then(() => { timedOut = true; return null; });
                        // Download the file from the provided URI.
                        let userFile;
                        let downloadPromise = Windows.Storage.ApplicationData.current.localFolder.createFolderAsync(restoreFolderName, Windows.Storage.CreationCollisionOption.openIfExists)
                            .then((cloudRestoreFolder) => {
                            return cloudRestoreFolder.createFolderAsync(fileFolderName, Windows.Storage.CreationCollisionOption.openIfExists);
                        }, (error) => {
                            CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error_CloudRestoreFolderCreationFailed`);
                            throw CloudExperienceHost.GetJsonFromError(error);
                        }).then((userFileFolder) => {
                            return userFileFolder.createFileAsync(localSavedFileName, Windows.Storage.CreationCollisionOption.replaceExisting);
                        }, (error) => {
                            CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error_ImageFolderCreationFailed`);
                            throw CloudExperienceHost.GetJsonFromError(error);
                        }).then((file) => {
                            userFile = file;
                            return httpClient.getBufferAsync(fileUri);
                        }, (error) => {
                            CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error_ImageFileCreationFailed`);
                            throw CloudExperienceHost.GetJsonFromError(error);
                        }).then((buffer) => {
                            return Windows.Storage.FileIO.writeBufferAsync(userFile, buffer);
                        }, (error) => {
                            CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error_HttpRequestFailed`);
                            throw CloudExperienceHost.GetJsonFromError(error);
                        }).then(() => {
                            fileDownloadComplete = true;
                            CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_FileDownloadComplete`);
                            return userFile.path;
                        });
                        return WinJS.Promise.any([downloadPromise, timeoutPromise]).then((localpath) => {
                            if (fileDownloadComplete) {
                                CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_LocalUriReturnedToCaller`);
                                return localFileUri;
                            }
                            else if (timedOut) {
                                CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error_DownloadTimedOut`);
                                throw `DownloadTimedOut_${userFileType}`;
                            }
                            throw `DownloadInterruptedError_${userFileType}`;
                        }, (error) => {
                            let errorAsString = CloudExperienceHost.GetJsonFromError(error);
                            CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error_DownloadError`, errorAsString);
                            throw `DownloadError_${userFileType}`;
                        });
                    }
                    catch (error) {
                        let errorAsString = CloudExperienceHost.GetJsonFromError(error);
                        CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error`, errorAsString);
                        throw errorAsString;
                    }
                }
                CloudExperienceHost.Telemetry.logEvent(`downloadUserFileAsync_${userFileType}_error_FileUriIsEmpty`);
                throw `FileUriIsEmpty_${userFileType}`;
            }
            else {
                CloudExperienceHost.Telemetry.logEvent("Feature_OobeRestoreDataLayer_Disabled", "downloadUserFileAsync");
                throw "ApiNonexistentOnClient";
            }
        }
        // Note that the below wallpaper and lock screen methods are handling assets in a very similar way,
        // however we are intentionally keeping the entry points separate at this time. Since we anticipate subtle
        // behavior divergence at this layer between the two scenarios, keeping the entry points independent helps
        // mitigate the risk even if the implementation is mostly common.
        function downloadUserWallpaperAsync(userWallpaperUri, userWallpaperHeaders, localWallpaperFileName, timeoutInSecs = 90) {
            return downloadUserFileAsync("Wallpaper", userWallpaperUri, userWallpaperHeaders, localWallpaperFileName, timeoutInSecs);
        }
        BackupRestore.downloadUserWallpaperAsync = downloadUserWallpaperAsync;
        function downloadUserLockScreenAsync(userLockScreenUri, userLockScreenHeaders, localLockScreenFileName, timeoutInSecs = 90) {
            return downloadUserFileAsync("Lockscreen", userLockScreenUri, userLockScreenHeaders, localLockScreenFileName, timeoutInSecs);
        }
        BackupRestore.downloadUserLockScreenAsync = downloadUserLockScreenAsync;
        function copyWallpaperToUserProfileAsync(appDataUri) {
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeRestoreDataLayer")) {
                let uri = new Windows.Foundation.Uri(appDataUri);
                return Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri).then((storageFile) => {
                    return CloudExperienceHostAPI.BackupRestoreManager.copyWallpaperToUserProfileAsync(storageFile.path);
                }, (error) => {
                    CloudExperienceHost.Telemetry.logEvent("CopyWallpaperToUserProfileAsync_Error", CloudExperienceHost.GetJsonFromError(error));
                });
            }
            else {
                CloudExperienceHost.Telemetry.logEvent("Feature_OobeRestoreDataLayer_Disabled", "copyWallpaperToUserProfileAsync");
                throw "ApiNonexistentOnClient";
            }
        }
        BackupRestore.copyWallpaperToUserProfileAsync = copyWallpaperToUserProfileAsync;
        function copyLockscreenToUserProfileAsync(appDataUri) {
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeRestoreDataLayer")) {
                let uri = new Windows.Foundation.Uri(appDataUri);
                return Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri).then((storageFile) => {
                    return CloudExperienceHostAPI.BackupRestoreManager.copyLockscreenToUserProfileAsync(storageFile.path);
                }, (error) => {
                    CloudExperienceHost.Telemetry.logEvent("CopyLockscreenToUserProfileAsync_Error", CloudExperienceHost.GetJsonFromError(error));
                });
            }
            else {
                CloudExperienceHost.Telemetry.logEvent("Feature_OobeRestoreDataLayer_Disabled", "copyLockscreenToUserProfileAsync");
                throw "ApiNonexistentOnClient";
            }
        }
        BackupRestore.copyLockscreenToUserProfileAsync = copyLockscreenToUserProfileAsync;
        function cleanupUserRestoreDataAsync() {
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeRestoreDataLayer")) {
                return CloudExperienceHostAPI.BackupRestoreManager.cleanupUserRestoreDataAsync();
            }
            else {
                CloudExperienceHost.Telemetry.logEvent("Feature_OobeRestoreDataLayer_Disabled", "cleanupUserRestoreDataAsync");
                throw "ApiNonexistentOnClient";
            }
        }
        BackupRestore.cleanupUserRestoreDataAsync = cleanupUserRestoreDataAsync;
        var OobeCloudBackupRestore;
        (function (OobeCloudBackupRestore) {
            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch /*, errorDispatch */) {
                    let policyValue = CloudExperienceHostAPI.UtilStaticsCore.getLicensingPolicyValue("OOBE-Skip-CloudBackupRestore");
                    completeDispatch(policyValue != 0);
                });
            }
            OobeCloudBackupRestore.getShouldSkipAsync = getShouldSkipAsync;
        })(OobeCloudBackupRestore = BackupRestore.OobeCloudBackupRestore || (BackupRestore.OobeCloudBackupRestore = {}));
    })(BackupRestore = CloudExperienceHost.BackupRestore || (CloudExperienceHost.BackupRestore = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=backuprestore.js.map