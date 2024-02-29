//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Storage;
    (function (Storage) {
        var SharableData;
        (function (SharableData) {
            function _getShareContainer() {
                var localSettings = Windows.Storage.ApplicationData.current.localSettings;
                var shareContainerKey = "SHARE_CONTAINER";
                var shareContainer;
                if (localSettings.containers.hasKey(shareContainerKey)) {
                    shareContainer = localSettings.containers.lookup(shareContainerKey);
                }
                else {
                    shareContainer = localSettings.createContainer(shareContainerKey, Windows.Storage.ApplicationDataCreateDisposition.always);
                }
                return shareContainer;
            }
            // This has an 8KB max size
            function addValue(name, value) {
                _getShareContainer().values[name] = value;
            }
            SharableData.addValue = addValue;
            function removeValue(name) {
                _getShareContainer().values.remove(name);
            }
            SharableData.removeValue = removeValue;
            function getValue(name) {
                return _getShareContainer().values[name];
            }
            SharableData.getValue = getValue;
            // This has a 64KB max size by using a composite to store the value
            function addLargeString(name, value) {
                var composite = new Windows.Storage.ApplicationDataCompositeValue();
                var i = 0;
                var limit = 4000;
                while (value.length > 0) {
                    composite[i] = value.substring(0, limit);
                    value = value.substring(limit);
                    i++;
                }
                _getShareContainer().values[name] = composite;
            }
            SharableData.addLargeString = addLargeString;
            function getLargeString(name) {
                var value = "";
                var composite = _getShareContainer().values[name];
                var i = 0;
                for (i = 0; i < 16; i++) {
                    if (!composite.hasKey(i)) {
                        break;
                    }
                    value += composite[i];
                }
                return value;
            }
            SharableData.getLargeString = getLargeString;
        })(SharableData = Storage.SharableData || (Storage.SharableData = {}));
    })(Storage = CloudExperienceHost.Storage || (CloudExperienceHost.Storage = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Storage;
    (function (Storage) {
        var PrivateData;
        (function (PrivateData) {
            class Container {
                static getAppContainer() {
                    var appContainer;
                    var cxid = CloudExperienceHost.getCurrentNode().cxid;
                    if (Container._container.hasOwnProperty(cxid)) {
                        appContainer = Container._container[cxid];
                    }
                    else {
                        appContainer = new Object;
                        Container._container[cxid] = appContainer;
                    }
                    return appContainer;
                }
            }
            Container._container = new Object;
            function addItem(name, value) {
                Container.getAppContainer()[name] = value;
            }
            PrivateData.addItem = addItem;
            function getItem(name) {
                return Container.getAppContainer()[name];
            }
            PrivateData.getItem = getItem;
            function getValues() {
                var container = Container.getAppContainer();
                var propertySet = new Windows.Foundation.Collections.PropertySet();
                Object.keys(container).forEach(function (key) {
                    propertySet[key] = container[key];
                });
                return propertySet;
            }
            PrivateData.getValues = getValues;
        })(PrivateData = Storage.PrivateData || (Storage.PrivateData = {}));
    })(Storage = CloudExperienceHost.Storage || (CloudExperienceHost.Storage = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Storage;
    (function (Storage) {
        var VolatileSharableData;
        (function (VolatileSharableData) {
            class Container {
                static getCustomDictionary(key) {
                    let customDictionary;
                    if (Container._customDictionaries.has(key)) {
                        customDictionary = Container._customDictionaries.get(key);
                    }
                    else {
                        customDictionary = new Map();
                        Container._customDictionaries.set(key, customDictionary);
                    }
                    return customDictionary;
                }
            }
            Container._customDictionaries = new Map();
            function addItem(dictionaryName, key, value) {
                Container.getCustomDictionary(dictionaryName).set(key, value);
            }
            VolatileSharableData.addItem = addItem;
            function getItem(dictionaryName, key) {
                return Container.getCustomDictionary(dictionaryName).get(key);
            }
            VolatileSharableData.getItem = getItem;
            function removeItem(dictionaryName, key) {
                return Container.getCustomDictionary(dictionaryName).delete(key);
            }
            VolatileSharableData.removeItem = removeItem;
            function getValues(dictionaryName) {
                let customDictionary = Container.getCustomDictionary(dictionaryName);
                let propertySet = new Windows.Foundation.Collections.PropertySet();
                customDictionary.forEach((value, key, map) => propertySet.insert(value, key));
                return propertySet;
            }
            VolatileSharableData.getValues = getValues;
        })(VolatileSharableData = Storage.VolatileSharableData || (Storage.VolatileSharableData = {}));
    })(Storage = CloudExperienceHost.Storage || (CloudExperienceHost.Storage = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Storage;
    (function (Storage) {
        var UserImageLottie;
        (function (UserImageLottie) {
            // Download a specified lottie image to use
            // specify an image to download that the lottie can reference via a local filename
            // if anything fails, fallback to specified lottie
            // return to the caller with a string to the graphic
            function downloadUserImageLottie(lottieUriString, lottieLocalFilename, userImageUriString, userImageLocalFilename, fallbackLottie) {
                return downloadUserImageLottieWithHeaderCollection(lottieUriString, lottieLocalFilename, null, userImageUriString, userImageLocalFilename, null, fallbackLottie);
            }
            UserImageLottie.downloadUserImageLottie = downloadUserImageLottie;
            function downloadUserImageLottieWithHeaderCollection(lottieUriString, lottieLocalFilename, lottieHeaders, userImageUriString, userImageLocalFilename, userImageHeaders, fallbackLottie) {
                try {
                    let eventName = "";
                    if ((lottieHeaders == null) && (userImageHeaders == null)) {
                        eventName = "downloadUserImageLottie";
                    }
                    else {
                        eventName = "downloadUserImageLottieWithHeaderCollection";
                    }
                    CloudExperienceHost.Telemetry.logEvent(eventName, JSON.stringify({
                        lottieUriString: lottieUriString,
                        lottieLocalFilename: lottieLocalFilename,
                        userImageUriString: userImageUriString,
                        userImageLocalFilename: userImageLocalFilename }));
                    if ((lottieUriString == null || lottieUriString == "") ||
                        (lottieLocalFilename == null || lottieLocalFilename == "") ||
                        (userImageUriString == null || userImageUriString == "") ||
                        (userImageLocalFilename == null || userImageLocalFilename == "")) {
                        return new WinJS.Promise(() => { return fallbackLottie; });
                    }
                    let lottieHttpClient = new Windows.Web.Http.HttpClient();
                    if (lottieHeaders != null) {
                        let requestHeaders = lottieHttpClient.defaultRequestHeaders;
                        for (let key in lottieHeaders) {
                            let appendOK = requestHeaders.tryAppendWithoutValidation(key, lottieHeaders[key]);
                            if (!appendOK) {
                                CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_Lottie_HeaderCollection_AppendFailure", key);
                                return WinJS.Promise.wrap(fallbackLottie);
                            }
                        }
                    }
                    let userImageHttpClient = new Windows.Web.Http.HttpClient();
                    if (userImageHeaders != null) {
                        let requestHeaders = userImageHttpClient.defaultRequestHeaders;
                        for (let key in userImageHeaders) {
                            let appendOK = requestHeaders.tryAppendWithoutValidation(key, userImageHeaders[key]);
                            if (!appendOK) {
                                CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_userImage_HeaderCollection_AppendFailure", key);
                                return WinJS.Promise.wrap(fallbackLottie);
                            }
                        }
                    }
                    let applicationData = Windows.Storage.ApplicationData.current;
                    let lottieFile;
                    let lottieUri = new Windows.Foundation.Uri(lottieUriString);
                    let lottiePromise = applicationData.temporaryFolder.createFileAsync(lottieLocalFilename, Windows.Storage.CreationCollisionOption.replaceExisting).then((file) => {
                        CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_Lottie_FileCreated");
                        lottieFile = file;
                        return lottieHttpClient.getStringAsync(lottieUri);
                    }).then((s) => {
                        CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_Lottie_getStringCompleted");
                        return Windows.Storage.FileIO.writeTextAsync(lottieFile, s);
                    }).then(() => {
                        CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_Lottie_writeTextCompleted");
                        return true;
                    }, (error) => {
                        CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_Lottie_error", JSON.stringify(error));
                        return false;
                    });
                    let userImageFile;
                    let userImageUri = new Windows.Foundation.Uri(userImageUriString);
                    let userImagePromise = applicationData.temporaryFolder.createFileAsync(userImageLocalFilename, Windows.Storage.CreationCollisionOption.replaceExisting).then((file) => {
                        CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_userImage_FileCreated");
                        userImageFile = file;
                        return userImageHttpClient.getBufferAsync(userImageUri);
                    }).then((s) => {
                        CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_userImage_getBufferCompleted");
                        return Windows.Storage.FileIO.writeBufferAsync(userImageFile, s);
                    }).then(() => {
                        CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_userImage_writeBufferCompleted");
                        return true;
                    }, (error) => {
                        CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_userImage_error", JSON.stringify(error));
                        return false;
                    });
                    return WinJS.Promise.join({
                        lottie: lottiePromise,
                        userImage: userImagePromise
                    }).then((results) => {
                        if (results.lottie && results.userImage) {
                            CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_bothPromisesCompleted");
                            return "ms-appdata:///temp/" + lottieLocalFilename;
                        }
                        else {
                            return fallbackLottie;
                        }
                    }, (error) => {
                        CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_error", JSON.stringify(error));
                        return fallbackLottie;
                    });
                }
                catch (error) {
                    CloudExperienceHost.Telemetry.logEvent("downloadUserImageLottie_error", JSON.stringify(error));
                    return WinJS.Promise.wrap(fallbackLottie);
                }
            }
            UserImageLottie.downloadUserImageLottieWithHeaderCollection = downloadUserImageLottieWithHeaderCollection;
        })(UserImageLottie = Storage.UserImageLottie || (Storage.UserImageLottie = {}));
    })(Storage = CloudExperienceHost.Storage || (CloudExperienceHost.Storage = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=storage.js.map