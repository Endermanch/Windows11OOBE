//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
/// <reference path="error.ts" />
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    class ExperienceDescription {
        static _parse(uri) {
            var a = document.createElement('a');
            a.href = uri;
            var winUri = new Windows.Foundation.Uri(uri);
            return {
                source: uri,
                protocol: a.protocol.replace(':', ''),
                host: a.hostname,
                port: a.port,
                query: a.search,
                paramsParsed: winUri.queryParsed,
                params: (function () {
                    var ret = {}, seg = a.search.replace(/^\?/, '').split('&'), len = seg.length, i = 0, s;
                    for (; i < len; i++) {
                        if (!seg[i]) {
                            continue;
                        }
                        s = seg[i].split('=');
                        ret[s[0].toLowerCase()] = s[1];
                    }
                    return ret;
                })(),
                file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ''])[1],
                hash: a.hash.replace('#', ''),
                path: a.pathname.replace(/^([^\/])/, '/$1'),
                segments: a.pathname.replace(/^\//, '').split('/')
            };
        }
        static _validate(experience) {
            if ((experience.port.length > 0) ||
                (experience.hash.length > 0) ||
                (experience.segments.length > 1) ||
                (experience.protocol.toUpperCase() != "MS-CXH")) {
                throw new CloudExperienceHost.InvalidExperienceError();
            }
        }
        static Create(uri) {
            var description = ExperienceDescription._parse(uri);
            ExperienceDescription._validate(description);
            return description;
        }
        static getExperience(experience) {
            var exp = null;
            if (experience) {
                exp = experience.host.toUpperCase() + experience.segments[0].toUpperCase();
            }
            return exp;
        }
        static GetHeaderParams(experience) {
            let headerParams = "";
            let headerParamsParameterName = "headerparams";
            if (experience.params.hasOwnProperty(headerParamsParameterName)) {
                headerParams = experience.params[headerParamsParameterName];
            }
            return headerParams;
        }
        static GetCorrelationId(experience) {
            var correlationId = "";
            var correlationIdParameterName = "correlationid";
            if (experience.params.hasOwnProperty(correlationIdParameterName)) {
                correlationId = experience.params[correlationIdParameterName];
            }
            return correlationId;
        }
        static GetStart(experience) {
            var start = "";
            var startParameterName = "start";
            if (experience.params.hasOwnProperty(startParameterName)) {
                start = experience.params[startParameterName];
            }
            return start;
        }
        static GetTargetedContentId(experience) {
            let contentId = "";
            let contentIdParameterName = "tccontentid";
            if (experience.params.hasOwnProperty(contentIdParameterName)) {
                contentId = experience.params[contentIdParameterName];
            }
            return contentId;
        }
        static GetTargetedContentPath(experience) {
            let contentPath = "";
            let contentPathParameterName = "tccontentpath";
            if (experience.params.hasOwnProperty(contentPathParameterName)) {
                contentPath = experience.params[contentPathParameterName];
            }
            return contentPath;
        }
        static GetShouldReportRewards(experience) {
            let shouldReportRewards = false;
            let shouldReportRewardsParameterName = "rewards";
            if (experience.params.hasOwnProperty(shouldReportRewardsParameterName)) {
                let value = experience.params[shouldReportRewardsParameterName];
                shouldReportRewards = ((value === "true") || (value === "1"));
            }
            return shouldReportRewards;
        }
        static GetLaunchSurface(experience) {
            let launchSurface = "";
            let launchSurfaceParameterName = "surface";
            if (experience.params.hasOwnProperty(launchSurfaceParameterName)) {
                launchSurface = experience.params[launchSurfaceParameterName];
            }
            return launchSurface;
        }
        static RemovePIIFromExperienceDescription(experience) {
            // Remove the query string from the source as it has the potential to contain PII
            // Also filter out the "query" and "paramsParsed" elements entirely
            // 'params' can be kept via a recursive strategy (only allow sub-params that we know don't contain PII)
            let experienceToReturn = Object.assign({}, experience);
            experienceToReturn.source = CloudExperienceHost.UriHelper.RemovePIIFromUri(experienceToReturn.source);
            let descriptionAllowlist = [
                'source',
                'protocol',
                'host',
                'port',
                // 'query', explicitly block this to avoid sending the query string
                'params',
                'ocid',
                'ccid',
                'version',
                'clr',
                'scenarioId',
                'referrerCid',
                'surface',
                'file',
                'hash',
                'path',
                'segments'
            ];
            return JSON.stringify(experienceToReturn, descriptionAllowlist);
        }
        static GetVariantId(experience) {
            let variantId = "";
            let variantIdParameterName = "variantid";
            if (experience.params.hasOwnProperty(variantIdParameterName)) {
                variantId = experience.params[variantIdParameterName];
            }
            return variantId;
        }
    }
    CloudExperienceHost.ExperienceDescription = ExperienceDescription;
    class ServiceEndpoint {
        constructor(address) {
            this._address = address;
        }
        getAddress() {
            return this._address;
        }
    }
    CloudExperienceHost.ServiceEndpoint = ServiceEndpoint;
    var appDataType;
    (function (appDataType) {
        appDataType[appDataType["navMesh"] = 0] = "navMesh";
        appDataType[appDataType["uriRules"] = 1] = "uriRules";
    })(appDataType || (appDataType = {}));
    class Discovery {
        static _getUrl() {
            var url = "data\\prod";
            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("Discovery_URL", url);
            return url;
        }
        static _getMeshData() {
            return Discovery._getJSONFileData(appDataType.navMesh, Discovery._getUrl());
        }
        static _isCloudMeshPathAllowed(url) {
            return ["sdx.microsoft.com", "sdx.microsoft-int.com", "sdx.microsoft-ppe.com"].findIndex((x) => (url.toLowerCase().includes(x))) >= 0;
        }
        static _getCloudMeshJson(url, timeout, experience) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                if (!Discovery._isCloudMeshPathAllowed(url)) {
                    return null;
                }
                try {
                    let headers = {
                        "cxh-hostAppVersion": CloudExperienceHost.getVersion().toString(),
                        "cxh-osVersionInfo": JSON.stringify(CloudExperienceHostAPI.Environment.osVersionInfo),
                        "cxh-msaBinaryVersion": CloudExperienceHostAPI.Environment.msaBinaryVersion,
                        "cxh-osPlatform": CloudExperienceHost.Environment.getPlatform(),
                        "cxh-preferredLanguage": CloudExperienceHost.Globalization.Language.getPreferredLang(),
                        "cxh-region": CloudExperienceHost.Globalization.GeographicRegion.getCode().toLowerCase(),
                        "cxh-isRTL": (CloudExperienceHost.Globalization.Language.getReadingDirection() === "rtl").toString()
                    };
                    if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("Feature_ExpeditedUpdatePILess")) {
                        headers["cxh-osRevision"] = JSON.stringify(CloudExperienceHostAPI.Environment.osRevision);
                    }
                    let variantid = ExperienceDescription.GetVariantId(experience);
                    if (variantid) {
                        headers["cxh-experienceVariantId"] = variantid;
                    }
                    let context = CloudExperienceHost.getContext();
                    for (let key in context) {
                        if (context[key]) {
                            headers["cxh-" + key] = context[key];
                        }
                    }
                    WinJS.Promise.timeout(timeout, WinJS.xhr({
                        url: url,
                        responseType: "json",
                        headers: headers
                    }).then(function (response) {
                        completeDispatch(response.response);
                    }, function (e) {
                        errorDispatch(e);
                    }));
                }
                catch (ex) {
                    errorDispatch(ex);
                }
            });
        }
        static _processCloudJson(mesh, experience, target) {
            return new WinJS.Promise(function (completeDispatch) {
                if (!CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("StaticCloudNavmesh")) {
                    // If feature is disabled, just return the starting mesh without changes
                    completeDispatch(mesh);
                    return;
                }
                let cloudOverride;
                if (mesh) {
                    cloudOverride = mesh.cloudOverride;
                }
                let url = CloudExperienceHost.CloudOverride.getUrl(cloudOverride, target);
                if (url !== undefined) {
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("RetrievingCloudNavmesh", url);
                    let timeout = cloudOverride.retrievalTimeout;
                    if (timeout === undefined) {
                        // 5 second timeout if not otherwise specified
                        timeout = 5000;
                    }
                    Discovery._getCloudMeshJson(url, timeout, experience).then(function (response) {
                        let exp = ExperienceDescription.getExperience(experience);
                        if (response && (response[exp] !== undefined)) {
                            let cloudMesh = response[exp];
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("CloudNavmeshSuccess");
                            completeDispatch(cloudMesh);
                        }
                        else {
                            // Unable to find updated mesh in cloud response, return original mesh
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("CloudNavmeshExperienceNotFound");
                            completeDispatch(mesh);
                        }
                    }, function (e) {
                        // an error in getCloudMeshJson isn't fatal, we just return the original mesh
                        // The error thrown when xhr is canceled has a message property, not a statusText property.
                        let details = e.statusText ? e.statusText : e.message;
                        CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("CloudNavmeshError", details);
                        completeDispatch(mesh);
                    });
                }
                else {
                    completeDispatch(mesh);
                }
            });
        }
        static _getJSONFileData(dt, url) {
            return Windows.ApplicationModel.Package.current.installedLocation.getFolderAsync(url).then((folder) => {
                let queryResult = folder.createFileQuery();
                return queryResult.getFilesAsync();
            }).then(function (filesList) {
                let filePromises = filesList.map((file) => {
                    switch (dt) {
                        case appDataType.navMesh:
                            if (file.displayName.toLowerCase().includes("navigation")) {
                                return Windows.Storage.FileIO.readTextAsync(file);
                            }
                            return null;
                        case appDataType.uriRules:
                            if (file.displayName.toLowerCase().includes("urirules")) {
                                return Windows.Storage.FileIO.readTextAsync(file);
                            }
                            return null;
                        default:
                            return null;
                    }
                });
                return WinJS.Promise.join(filePromises).then((results) => {
                    let resultMesh = {};
                    for (let i = 0; i < results.length; i++) {
                        if (results[i] != null) {
                            let fileJson = JSON.parse(results[i]);
                            Object.keys(fileJson).forEach((key) => resultMesh[key] = fileJson[key]);
                        }
                    }
                    switch (dt) {
                        case appDataType.navMesh:
                            return JSON.stringify(resultMesh);
                        case appDataType.uriRules:
                            let apiRules = JSON.parse(JSON.stringify(resultMesh)).apiRules;
                            for (let rule in apiRules) {
                                if (apiRules.hasOwnProperty(rule)) {
                                    for (let i = 0; i < apiRules[rule].length; i++) {
                                        apiRules[rule][i] = apiRules[rule][i].trim();
                                    }
                                }
                            }
                            return apiRules;
                    }
                });
            });
        }
        static _getMesh(experience) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                Discovery._getMeshData().then(function (navData) {
                    var exp = ExperienceDescription.getExperience(experience);
                    var navigationList = JSON.parse(navData);
                    var mesh = navigationList[exp];
                    if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("StaticCloudNavmesh")) {
                        if (mesh) {
                            // The nav mesh may specify an optional "urlint" property to be used in place
                            // of "url" when the target environment is INT (as opposed to PROD). In that
                            // case, we replace the contents of the "url" property with "urlint" when
                            // present. We also always delete all "urlint" properties from the mesh, to
                            // eliminate the possibility that the wrong URL will be selected later.
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("NavMeshPreReplace", JSON.stringify(mesh));
                            let target;
                            try {
                                target = CloudExperienceHost.Environment.getTarget();
                                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("TargetEnvironment", target);
                            }
                            catch (ex) {
                                target = CloudExperienceHost.TargetEnvironment.PROD;
                            }
                            Discovery._processCloudJson(mesh, experience, target).then(function (updatedMesh) {
                                Object.keys(updatedMesh).forEach(function (key) {
                                    if (updatedMesh[key].url !== undefined) {
                                        let urlOverride = CloudExperienceHostAPI.Environment.getRegValue(updatedMesh[key].cxid + "Override");
                                        if (urlOverride !== "") {
                                            updatedMesh[key].url = urlOverride;
                                        }
                                        else if ((updatedMesh[key].urlint !== undefined) && (target == CloudExperienceHost.TargetEnvironment.INT)) {
                                            updatedMesh[key].url = updatedMesh[key].urlint;
                                        }
                                    }
                                    delete updatedMesh[key].urlint;
                                });
                                completeDispatch(updatedMesh);
                            });
                        }
                        else {
                            // If we tried to load a Scenario not defined in the parsed navigationList,
                            // it could be a scenario from a .json file that wasn't packaged on the install
                            // or an invalid param passed in from protocol activation.
                            // We don't want to blow up here so that control can return to appmanager to cleanly exit the app.
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("NavigationMeshNotDefinedInJson", exp);
                            completeDispatch(mesh);
                        }
                    }
                    else {
                        if (mesh) {
                            // The nav mesh may specify an optional "urlint" property to be used in place
                            // of "url" when the target environment is INT (as opposed to PROD). In that
                            // case, we replace the contents of the "url" property with "urlint" when
                            // present. We also always delete all "urlint" properties from the mesh, to
                            // eliminate the possibility that the wrong URL will be selected later.
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("NavMeshPreReplace", JSON.stringify(mesh));
                            let target;
                            try {
                                target = CloudExperienceHost.Environment.getTarget();
                                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("TargetEnvironment", target);
                            }
                            catch (ex) {
                                target = CloudExperienceHost.TargetEnvironment.PROD;
                            }
                            Object.keys(mesh).forEach(function (key) {
                                if (mesh[key].url !== undefined) {
                                    let urlOverride = CloudExperienceHostAPI.Environment.getRegValue(mesh[key].cxid + "Override");
                                    if (urlOverride !== "") {
                                        mesh[key].url = urlOverride;
                                    }
                                    else if ((mesh[key].urlint !== undefined) && (target == CloudExperienceHost.TargetEnvironment.INT)) {
                                        mesh[key].url = mesh[key].urlint;
                                    }
                                }
                                delete mesh[key].urlint;
                            });
                        }
                        else {
                            // If we tried to load a Scenario not defined in the parsed navigationList,
                            // it could be a scenario from a .json file that wasn't packaged on the install
                            // or an invalid param passed in from protocol activation.
                            // We don't want to blow up here so that control can return to appmanager to cleanly exit the app.
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("NavigationMeshNotDefinedInJson", exp);
                        }
                        completeDispatch(mesh);
                    }
                }, function (e) {
                    errorDispatch(e);
                });
            });
        }
        static getNavMesh(experience) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("ExperienceDescription", CloudExperienceHost.ExperienceDescription.RemovePIIFromExperienceDescription(experience));
                Discovery._getMesh(experience).then(function (mesh) {
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("NavMesh", JSON.stringify(mesh));
                    completeDispatch(new CloudExperienceHost.NavMesh(mesh, experience.paramsParsed));
                }, function (e) {
                    errorDispatch(e);
                });
            });
        }
        static getApiRules() {
            return Discovery._getJSONFileData(appDataType.uriRules, Discovery._getUrl());
        }
    }
    CloudExperienceHost.Discovery = Discovery;
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=discovery.js.map