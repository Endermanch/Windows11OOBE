//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Resources;
    (function (Resources) {
        function getString(resource, id) {
            return WinJS.Resources.getString("/" + resource + "/" + id).value;
        }
        Resources.getString = getString;
        function getStrings(resource, strings) {
            Object.keys(strings).forEach(function (id) {
                var resourceId = "/" + resource + "/" + id;
                strings[id] = WinJS.Resources.getString(resourceId).value;
            });
            return strings;
        }
        Resources.getStrings = getStrings;
        class IrisServiceHelper {
            static serializeCreativeResults(creativeResults) {
                // Serialize creatives
                let serializedCreatives = [];
                if (creativeResults.creatives) {
                    for (let i = 0; i < creativeResults.creatives.length; i++) {
                        let creative = creativeResults.creatives[i.toString()];
                        serializedCreatives.push({
                            id: creative.id,
                            content: creative.content,
                            rawJson: creative.rawJson
                        });
                    }
                }
                // Serialize errors
                let serializedErrors = [];
                if (creativeResults.errors) {
                    for (let i = 0; i < creativeResults.errors.length; i++) {
                        let error = creativeResults.errors[i.toString()];
                        serializedErrors.push({
                            irisStatusCode: error.irisStatusCode,
                            isSuccessStatusCode: error.isSuccessStatusCode
                        });
                    }
                }
                return {
                    statusCode: creativeResults.statusCode,
                    isSuccessStatusCode: creativeResults.isSuccessStatusCode,
                    errors: serializedErrors,
                    creatives: serializedCreatives
                };
            }
            static getInstanceAsync() {
                if (IrisServiceHelper._irisServiceInstance) {
                    return WinJS.Promise.as(IrisServiceHelper._irisServiceInstance);
                }
                else {
                    return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                        try {
                            WindowsUdk.Services.Iris.IrisService.getDefaultAsync().then((irisService) => {
                                IrisServiceHelper._irisServiceInstance = irisService;
                                completeDispatch(irisService);
                            }, (e) => {
                                errorDispatch(e);
                            });
                        }
                        catch (ex) {
                            errorDispatch(ex);
                        }
                    });
                }
            }
            static getCreativeResultsAsync(placementId, creativeCount, customQueryParameters, option) {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        // Get customQueryParameters as an IMapView<string, string> so we can interop with the UDK API
                        let customQueryParametersMap = new Windows.Foundation.Collections.StringMap();
                        Object.keys(customQueryParameters).forEach(function (key) {
                            customQueryParametersMap.insert(key, customQueryParameters[key]);
                        });
                        let customQueryParametersView = customQueryParametersMap.getView();
                        IrisServiceHelper.getInstanceAsync().then((irisService) => {
                            if (option != null) {
                                irisService.getCreativeResultsAsync(placementId, creativeCount, customQueryParametersView, option).then((creativeResults) => {
                                    completeDispatch(IrisServiceHelper.serializeCreativeResults(creativeResults));
                                }, (e) => {
                                    errorDispatch(e);
                                });
                            }
                            else {
                                irisService.getCreativeResultsAsync(placementId, creativeCount, customQueryParametersView).then((creativeResults) => {
                                    completeDispatch(IrisServiceHelper.serializeCreativeResults(creativeResults));
                                }, (e) => {
                                    errorDispatch(e);
                                });
                            }
                        }, (e) => {
                            errorDispatch(e);
                        });
                    }
                    catch (ex) {
                        errorDispatch(ex);
                    }
                });
            }
            static reportImpressionAsync(creativeRawJson) {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        let irisCreative = new WindowsUdk.Services.Iris.IrisCreative(creativeRawJson);
                        IrisServiceHelper.getInstanceAsync().then((irisService) => {
                            irisService.reportImpressionAsync(irisCreative).then((httpStatusCode) => {
                                completeDispatch(httpStatusCode);
                            }, (e) => {
                                errorDispatch(e);
                            });
                        }, (e) => {
                            errorDispatch(e);
                        });
                    }
                    catch (ex) {
                        errorDispatch(ex);
                    }
                });
            }
            static reportActionAsync(creativeRawJson, action) {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        let irisCreative = new WindowsUdk.Services.Iris.IrisCreative(creativeRawJson);
                        IrisServiceHelper.getInstanceAsync().then((irisService) => {
                            irisService.reportActionAsync(irisCreative, action).then((httpStatusCode) => {
                                completeDispatch(httpStatusCode);
                            }, (e) => {
                                errorDispatch(e);
                            });
                        }, (e) => {
                            errorDispatch(e);
                        });
                    }
                    catch (ex) {
                        errorDispatch(ex);
                    }
                });
            }
            static reportCustomActionAsync(creativeRawJson, action) {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        let irisCreative = new WindowsUdk.Services.Iris.IrisCreative(creativeRawJson);
                        IrisServiceHelper.getInstanceAsync().then((irisService) => {
                            irisService.reportCustomActionAsync(irisCreative, action).then((httpStatusCode) => {
                                completeDispatch(httpStatusCode);
                            }, (e) => {
                                errorDispatch(e);
                            });
                        }, (e) => {
                            errorDispatch(e);
                        });
                    }
                    catch (ex) {
                        errorDispatch(ex);
                    }
                });
            }
        }
        IrisServiceHelper._irisServiceInstance = null;
        Resources.IrisServiceHelper = IrisServiceHelper;
    })(Resources = CloudExperienceHost.Resources || (CloudExperienceHost.Resources = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=resources.js.map