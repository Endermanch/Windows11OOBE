//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";

(() => {
    require.config(new RequirePathConfig('/webapps/hololensDiagnostics'));
    require(['legacy/bridge', 'legacy/core', 'legacy/events', 'legacy/uiHelpers'], (bridge, core, constants, uiHelpers) => {
        var hololensDiagResources = {};
        var bookmarkedPage = 0;

        WinJS.UI.Pages.define("/webapps/hololensDiagnostics/views/hololensDiagnostics.html", {
            init: (element, options) => {
                var initPromiseSet = {
                    getPreferredLang: bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang"),
                    getReadingDirection: bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection"),
                    getStrings: bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "hololensDiagnostics"),
                    loadCss: uiHelpers.LoadCssPromise(document.head, "../../..", bridge),
                    getBookmark: bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "hldiag_bookmark"),
                };

                return WinJS.Promise.join(initPromiseSet).then((resultSet) => {
                    _htmlRoot.setAttribute("lang", resultSet.getPreferredLang);
                    _htmlRoot.setAttribute("dir", resultSet.getReadingDirection);
                    hololensDiagResources = JSON.parse(resultSet.getStrings);

                    var savedBookmark = resultSet.getBookmark;
                    if (!savedBookmark) {
                        // If no value defined, start directly at the troubleshooting page
                        bookmarkedPage = 2;
                    } else {
                        bookmarkedPage = savedBookmark;
                    }

                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HoloLensDiagnosticsPageBookmark", bookmarkedPage);
                });
            },
            error: (e) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HoloLensDiagnosticsPageError", core.GetJsonFromError(e));
                bridge.fireEvent(constants.Events.done, constants.AppResult.fail);
            },
            ready: (element, options) => {
                require.config(new RequirePathConfig('/webapps/hololensDiagnostics'));
                require(['hololensDiagnostics-vm'], (HoloLensDiagnosticsViewModel) => {
                    let hlDiagVM = new HoloLensDiagnosticsViewModel(hololensDiagResources, bookmarkedPage);
                    hlDiagVM.registerEventHandlers();
                    hlDiagVM.prepareFirstPage();
                });
            },
        });
    });
})();
