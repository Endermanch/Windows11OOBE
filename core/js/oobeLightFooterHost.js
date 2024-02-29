//
// Copyright (C) Microsoft. All rights reserved.
//
(() => {
    "use strict";
    require.config(new RequirePathConfig('/core'));

    require(['lib/knockout', 'knockouthelpers', 'legacy/bridge', 'legacy/uiHelpers'], (ko, KoHelpers, bridge, legacy_uiHelpers) => {
        // Setup knockout customizations
        let koHelpers = new KoHelpers();
        koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.LightFooter);
        window.KoHelpers = KoHelpers;

        let loadCssPromise = legacy_uiHelpers.LoadCssPromise(document.head, "", bridge);
        let langAndDirPromise = legacy_uiHelpers.LangAndDirPromise(document.documentElement, bridge);

        // Load resource strings
        let getLocalizedStringsPromise = bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeCommon").then((result) => {
            window.resourceStrings = JSON.parse(result);
        });

        WinJS.Promise.join({ loadCssPromise, langAndDirPromise, getLocalizedStringsPromise }).done(() => {
            ko.applyBindings();
        });
    });
})();
