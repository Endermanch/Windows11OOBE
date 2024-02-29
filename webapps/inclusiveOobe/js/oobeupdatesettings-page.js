(() => {
    var pages = [
        {
            uri: "/webapps/inclusiveOobe/view/oobeupdatesettings-main.html",
            viewmodel: 'oobeupdatesettings-vm'
        },
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
                    return result.legacy_bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeUpdateSettings");
                }).then((result) => {
                    this.resourceStrings = JSON.parse(result);
                });

                let getPersonalityPromise = requireAsync(['legacy/bridge']).then((result) => {
                    return result.legacy_bridge.invoke("CloudExperienceHost.getContext");
                }).then((targetContext) => {
                    this.targetPersonality = targetContext.personality;
                });

                return WinJS.Promise.join({ loadCssPromise: loadCssPromise, langAndDirPromise: langAndDirPromise, getLocalizedStringsPromise: getLocalizedStringsPromise, getPersonalityPromise: getPersonalityPromise });
            },
            error: (e) => {
                require(['legacy/bridge', 'legacy/events'], (bridge, constants) => {
                    bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                });
            },
            ready: (element, options) => {
                require(['lib/knockout', 'corejs/knockouthelpers', 'legacy/bridge', 'legacy/events', page.viewmodel, 'lib/knockout-winjs'], (ko, KoHelpers, bridge, constants, UpdateSettingsViewModel) => {
                    // Setup knockout customizations
                    koHelpers = new KoHelpers();
                    koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                    window.KoHelpers = KoHelpers;

                    // Apply bindings and show the page
                    let vm = new UpdateSettingsViewModel(this.resourceStrings, this.targetPersonality);
                    ko.applyBindings(vm, document.documentElement);
                    KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                        WinJS.Utilities.addClass(document.body, "pageLoaded");
                        bridge.fireEvent(constants.Events.visible, true);
                        KoHelpers.setFocusOnAutofocusElement();
                        vm.startVoiceOver();
                    });
                });
            }
        });
    });
})();
