//
// Copyright (C) Microsoft. All rights reserved.
//
(() => {
    var pages = [
        { 
            uri: "/webapps/inclusiveOobe/view/oobeeula-main.html",
            titleResourceId: "EulaTitleNonNumbered",
            shouldStartVoiceOver: true,
            frameStyleSheetPath:"/webapps/inclusiveOobe/css/inclusive-mseula.css"
        },
        {
            uri: "/webapps/inclusiveOobe/view/oobeeula-hololens.html",
            titleResourceId: "EulaTitle",
            shouldStartVoiceOver: false,
            frameStyleSheetPath: "/webapps/inclusiveOobe/css/hololens-oobe-eula.css"
        },
        {
            uri: "/webapps/AOobe/view/oobeeula-a.html",
            titleResourceId: "EulaTitleNonNumbered",
            shouldStartVoiceOver: false,
            frameStyleSheetPath: "/webapps/inclusiveOobe/css/light-iframe-eula.css"
        }
    ];

    pages.forEach((page) => {
        WinJS.UI.Pages.define(page.uri, {
            init: (element, options) => {
                require.config(new RequirePathConfig('/webapps/inclusiveOobe'));

                // Load css per scenario
                let loadCssPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                    return result.legacy_uiHelpers.LoadCssPromise(document.head, "", result.legacy_bridge);
                });

                let langAndDirPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                    return result.legacy_uiHelpers.LangAndDirPromise(document.documentElement, result.legacy_bridge);
                });

                let getLocalizedStringsPromise = requireAsync(['legacy/bridge']).then((result) => {
                    return result.legacy_bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeEula");
                }).then((result) => {
                    this.resourceStrings = JSON.parse(result);
                });

                let getEulaDataPromise = requireAsync(['oobeeula-data']).then((result) => {
                    return result.oobeeula_data.getEulaData();
                }).then((result) => {
                    this.eulaData = result;
                });

                let getPersonalityPromise = requireAsync(['legacy/bridge']).then((result) => {
                    return result.legacy_bridge.invoke("CloudExperienceHost.getContext");
                }).then((targetContext) => {
                    this.targetPersonality = targetContext.personality;
                });

                return WinJS.Promise.join({ loadCssPromise: loadCssPromise, langAndDirPromise: langAndDirPromise, getLocalizedStringsPromise: getLocalizedStringsPromise, getEulaDataPromise: getEulaDataPromise, getPersonalityPromise: getPersonalityPromise });
            },
            error: (e) => {
                require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                    bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                });
            },
            ready: (element, options) => {
                require(['lib/knockout', 'corejs/knockouthelpers', 'jsCommon/oobe-gesture-manager', 'legacy/bridge', 'legacy/core', 'legacy/events', 'oobeeula-vm', 'lib/knockout-winjs'], (ko, KoHelpers, gestureManager, bridge, core, constants, EulaViewModel) => {
                    // Setup knockout customizations
                    koHelpers = new KoHelpers();
                    koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);

                    // Apply bindings and show the page
                    let vm = new EulaViewModel(this.resourceStrings, page.titleResourceId, page.frameStyleSheetPath, this.eulaData, gestureManager, this.targetPersonality);
                    ko.applyBindings(vm);
                    KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                        WinJS.Utilities.addClass(document.body, "pageLoaded");
                        bridge.fireEvent(constants.Events.visible, true);
                        KoHelpers.setFocusOnAutofocusElement();
                        if (page.shouldStartVoiceOver)
                        {
                            vm.startVoiceOver();
                        }
                        vm.subscribeToDeviceInsertion(gestureManager);
                    });
                });
            }
        });
    });
})();
