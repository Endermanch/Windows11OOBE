//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Cortana;
    (function (Cortana) {
        var cortanaManager;
        function setCortanaOptin(optinValue) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                if (!cortanaManager) {
                    try {
                        cortanaManager = new CloudExperienceHostBroker.Cortana.OOBECortanaManager();
                    }
                    catch (error) {
                        cortanaManager = CloudExperienceHostBroker.Cortana.OOBECortanaManagerCoreForUser;
                    }
                }
                cortanaManager.setCortanaOptinAsync(optinValue)
                    .done(function () { completeDispatch(); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
            });
        }
        Cortana.setCortanaOptin = setCortanaOptin;

        function isCortanaAllowedByPolicy() {
            try {
                if (!cortanaManager) {
                    try {
                        cortanaManager = new CloudExperienceHostBroker.Cortana.OOBECortanaManager();
                    }
                    catch (e) {
                        try {
                            cortanaManager = CloudExperienceHostBroker.Cortana.OOBECortanaManagerCoreForUser;
                        }
                        catch (error) {
                            return false;
                        }
                    }
                }
                return cortanaManager.isCortanaAllowedByPolicy;
            }
            catch (error) {
                return false;
            }
        }
        Cortana.isCortanaAllowedByPolicy = isCortanaAllowedByPolicy;

        // market and region checks are copied from cortana page
        function isCortanaSupportedByMarket() {
            try {
                const market = CloudExperienceHost.Globalization.Language.getPreferredLang().toLowerCase();
                const pseudoLocales = ["qps-ploc", "qps-ploca", "qps-plocm", "qps-Latn-x-sh"];
                const cortanaSupportedMarkets = ["en-us", "zh-cn", "zh-hans-cn", "en-gb", "fr-fr", "it-it", "de-de", "es-es", "ja", "pt-br", "es-mx", "fr-ca"];
                return ((pseudoLocales.findIndex(x => x === market) >= 0) || (cortanaSupportedMarkets.findIndex(x => x === market) >= 0));
            }
            catch (error) {
                return false;
            }
        }
        Cortana.isCortanaSupportedByMarket = isCortanaSupportedByMarket;

        function isCortanaSupportedByRegion() {
            try {
                const region = CloudExperienceHost.Globalization.GeographicRegion.getCode().toLowerCase();
                const cortanaSupportedRegions = ["us", "au", "br", "ca", "cn", "fr", "de", "in", "it", "jp", "mx", "es", "gb"];
                return (cortanaSupportedRegions.findIndex(x => x === region) >= 0);
            }
            catch (error) {
                return false;
            }
        }
        Cortana.isCortanaSupportedByRegion = isCortanaSupportedByRegion;

        function isCortanaSupported() {
            return (isCortanaSupportedByMarket() && isCortanaSupportedByRegion() && isCortanaAllowedByPolicy());
        }
        Cortana.isCortanaSupported = isCortanaSupported;

        function callSetCortanaOptinUsingIUser(optinValue) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                let user = CloudExperienceHost.IUserManager.getInstance().getIUser();
                let oobeCortanaOptin = CloudExperienceHostBroker.Cortana.OOBECortanaManagerCoreForUser;
                oobeCortanaOptin.setCortanaOptinAsync(optinValue, user).done(() => {
                    completeDispatch();
                }, (err) => {
                    errorDispatch(err);
                }, (progress) => {
                    progressDispatch(progress);
                });
            });
        }
        Cortana.callSetCortanaOptinUsingIUser = callSetCortanaOptinUsingIUser;

        // Get all the strings via bridge
        function localizedStrings() {
            var cortanaResources = {};
            var keyList = ['cortanaIntro', 'cortanaPersonaText', 'cortanaPersonaText2', 'cortanaPersonaText3', 'cortanaContent', 'setCortanaOptOut', 'learnMoreLink', 'cortanaNextButton', 'learnMoreHeadline', 'learnMoreBody', 'learnMoreBody2'];
            var i = 0;
            for (i = 0; i < keyList.length; i++) {
                var resourceId = '/cortana/' + keyList[i];
                cortanaResources[keyList[i]] = WinJS.Resources.getString(resourceId).value;
            }
            return JSON.stringify(cortanaResources);
        }
        Cortana.localizedStrings = localizedStrings;

    })(CloudExperienceHost.Cortana || (CloudExperienceHost.Cortana = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
