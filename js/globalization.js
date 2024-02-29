// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Globalization;
    (function (Globalization) {
        class GeographicRegion {
            static getAll() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    CloudExperienceHostAPI.GeographicRegion.getAll().done(function (regions) {
                        completeDispatch(JSON.parse(regions));
                    }, errorDispatch);
                });
            }
            static getCode() {
                return new Windows.Globalization.GeographicRegion().code;
            }
            static isPrivacySensitiveRegion() {
                // List of regions that is part of privacy sensitive zone.
                // Please be aware of the lists in %SDXROOT%\onecoreuap\shell\inc\PrivacyConsentHelpers.h
                // and %SDXROOT%\onecoreuap\shell\cloudexperiencehost\onecore\app\App\ts\environment.ts,
                // which are not necessarily the same as this list
                let privacySensitiveRegionsList = ["AT", "AUT", "BE", "BEL", "BG", "BGR", "BR", "BRA", "CA", "CAN", "HR", "HRV", "CY", "CYP",
                    "CZ", "CZE", "DK", "DNK", "EE", "EST", "FI", "FIN", "FR", "FRA", "DE", "DEU", "GR", "GRC",
                    "HU", "HUN", "IS", "ISL", "IE", "IRL", "IT", "ITA", "KR", "KOR", "LV", "LVA", "LI", "LIE", "LT", "LTU",
                    "LU", "LUX", "MT", "MLT", "NL", "NLD", "NO", "NOR", "PL", "POL", "PT", "PRT", "RO", "ROU",
                    "SK", "SVK", "SI", "SVN", "ES", "ESP", "SE", "SWE", "CH", "CHE", "GB", "GBR"];
                let region = CloudExperienceHost.Globalization.GeographicRegion.getCode();
                return (privacySensitiveRegionsList.indexOf(region) != -1);
            }
        }
        Globalization.GeographicRegion = GeographicRegion;
        class Language {
            static getPreferredLang() {
                return Windows.Globalization.ApplicationLanguages.languages[0];
            }
            static getReadingDirection() {
                // Check reading direction from a Windows.Globalization DateTimeFormatting Pattern generated from the ApplicationLanguages list
                var dtf = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("month.full", Windows.Globalization.ApplicationLanguages.languages, "ZZ", "GregorianCalendar", "24HourClock");
                var pat = dtf.patterns[0];
                var isRTL = pat.charCodeAt(0) === 8207; // Right-To-Left Mark
                return isRTL ? "rtl" : "ltr";
            }
        }
        Globalization.Language = Language;
        class Utils {
            static setDocumentElementLangAndDir() {
                document.documentElement.lang = CloudExperienceHost.Globalization.Language.getPreferredLang();
                document.documentElement.dir = CloudExperienceHost.Globalization.Language.getReadingDirection();
            }
        }
        Globalization.Utils = Utils;
    })(Globalization = CloudExperienceHost.Globalization || (CloudExperienceHost.Globalization = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=globalization.js.map