// Copyright (C) Microsoft. All rights reserved.
(function () {
    require.config(new RequirePathConfig('/webapps/inclusiveOobe'))
    require(['lib/knockout', 'corejs/knockouthelpers', 'legacy/bridge', 'legacy/events', 'legacy/core', 'legacy/uiHelpers'], (ko, KoHelpers, bridge, constants, core, uiHelpers) => {
        "use strict";
        let cortanaManager = new Object();
        try {
            cortanaManager = new CloudExperienceHostBroker.Cortana.OOBECortanaManager();
        }
        catch (error) {
            cortanaManager = CloudExperienceHostBroker.Cortana.OOBECortanaManagerCoreForUser;
        }
        const Events = constants.Events;

        //velocity feature names
        const feature_UseNewSearchAndCortanaApps = "UseNewSearchAndCortanaApps";

        //constraints for voice recognition
        const learnMoreTag = "LearnMore";

        const customOkLearnMorePage = ["ok"];
        const okTag = "OK";

        var pages = [
            {
                uri: "/webapps/inclusiveOobe/view/oobecortana-main.html"
            },
            {
                uri: "/webapps/AOobe/view/oobecortana-a.html"
            }
        ];
        pages.forEach((page) => {
            WinJS.UI.Pages.define(page.uri, {
                //create PageControl object in order to load in cortana page from navigator
                init: (element, options) => {
                    this.processingFlag = ko.observable(false);

                    //load all needed resources and return a promise that completes when ready to render
                    const langPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(lang => {
                        this.market = lang.toLowerCase();
                        document.documentElement.setAttribute("lang", lang);
                    });

                    const dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then((dirVal) => {
                        document.documentElement.setAttribute("dir", dirVal);
                    });

                    const isSupportedPromise = bridge.invoke("CloudExperienceHost.Cortana.isCortanaSupported").then((result) => {
                        this.isSupported = result;
                    });

                    const stringPromise = localizedStringsAsync().then((resources) => {
                        //create rudimentary view model
                        this.oobeCortana_vm = {
                            cortanaResources: resources,
                            currentPanelIndex: ko.observable(0).extend({ notify: 'always' }),
                            talkToCortanaCheckboxVisible: talkToCortanaCheckboxVisible(),
                            talkToCortanaCheckboxValue: ko.observable(talkToCortanaCheckboxInitialValue()),
                            talkToCortanaCheckboxText: talkToCortanaCheckboxText(resources),
                            cortanaHeadingText: cortanaHeadingText(resources),
                            cortanaSubheadingText: cortanaSubheadingText(resources),

                            //oobe-footer information
                            learnMoreLink: [
                                {
                                    hyperlinkText: resources.learnMoreLink,
                                    handler: showLearnMorePage,
                                    disableControl: ko.pureComputed(() => {
                                        return this.processingFlag() || (oobeCortana_vm.currentPanelIndex() == 1);
                                    }),
                                }
                            ],
                            learnMoreButton: [
                                {
                                    buttonText: resources.learnMoreLink,
                                    buttonClickHandler: showLearnMorePage,
                                    disableControl: ko.pureComputed(() => {
                                        return this.processingFlag() || (oobeCortana_vm.currentPanelIndex() == 1);
                                    }),

                                }
                            ],
                            endButtons: [
                                {
                                    buttonText: resources.setCortanaOptOut_newUwp,
                                    disableControl: ko.pureComputed(() => {
                                        return this.processingFlag() || (oobeCortana_vm.currentPanelIndex() == 1);
                                    }),
                                    buttonClickHandler: optOutClicked
                                },
                                {
                                    buttonText: resources.setCortanaOptIn,
                                    disableControl: ko.pureComputed(() => {
                                        return this.processingFlag() || (oobeCortana_vm.currentPanelIndex() == 1);
                                    }),

                                    buttonClickHandler: optInClicked,
                                    autoFocus: true
                                }
                            ],
                            learnMoreEndButtons: [
                                {
                                    buttonText: resources.returnToMain,
                                    buttonClickHandler: returnClicked,
                                    autoFocus: true,
                                    disableControl: ko.pureComputed(() => {
                                        return this.processingFlag() || (oobeCortana_vm.currentPanelIndex() == 0);
                                    })
                                }
                            ]
                        };

                        oobeCortana_vm.currentPanelIndex.subscribe((newStopIndex) => {
                            this.processingFlag(false);
                        });

                        this.mainSpeech = oobeCortana_vm.cortanaResources.cortanaSubHeadingVoiceOver;
                    });

                    const loadCssPromise = uiHelpers.LoadCssPromise(document.head, "", bridge);

                    return WinJS.Promise.join({ langPromise, dirPromise, isSupportedPromise, stringPromise, loadCssPromise });
                },

                ready: (element, options) => {
                    //if cortana is not supported then abort
                    if (!this.isSupported) {
                        bridge.fireEvent(Events.done, CloudExperienceHost.AppResult.abort);
                        return;
                    }

                    //first log all initial telemetry such as WoV checkbox value
                    logInitialCheckboxTelemetry(oobeCortana_vm);

                    // Setup knockout customizations
                    let koHelpers = new KoHelpers();
                    koHelpers.registerComponents(CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe);
                    window.KoHelpers = KoHelpers;

                    ko.applyBindings(oobeCortana_vm, document.body);

                    KoHelpers.waitForInitialComponentLoadAsync().then(() => {
                        WinJS.Utilities.addClass(document.body, "pageLoaded");
                        bridge.fireEvent(constants.Events.visible, true);

                        //these two must take place in this order!!!
                        //set up asynchronous speech output and recognition
                        CloudExperienceHostAPI.Speech.SpeechRecognition.promptForCommandsAsync(mainSpeech, mainPageConstraints()).then(handleSpeechCommandMain);
                        //set up focus for OOBE and narrator
                        KoHelpers.setFocusOnAutofocusElement();
                    });
                },
                error: (e) => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CortanaError", core.GetJsonFromError(e));
                    bridge.fireEvent(Events.done, CloudExperienceHost.AppResult.error);
                }
            });

            function handleSpeechCommandMain(command) {
                if (command && !processingFlag()) {
                    switch (command.constraint.tag) {
                        case CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag:
                            optInClicked();
                            break;
                        case CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no.tag:
                            optOutClicked();
                            break;
                        case learnMoreTag:
                            showLearnMorePage({ voiceActivated : true });
                            break;
                        default:
                            break;
                    }
                }
            }

            function handleSpeechCommandLearnMore(command) {
                if (command && !processingFlag()) {
                    switch (command.constraint.tag) {
                        case CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag:
                        case CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.back.tag:
                        case okTag:
                            returnClicked();
                            break
                        default:
                            break;
                    }
                }
            }

            function optOutClicked() {
                if (!processingFlag()) {
                    processingFlag(true);

                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Cortana user clicked opt out");

                    // Show the progress ring while committing async.
                    bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                    setCortanaOptin(0).done(() => {
                        bridge.fireEvent(Events.done, CloudExperienceHost.AppResult.success);
                    }, (e) => {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CortanaOptInError", core.GetJsonFromError(e));
                        bridge.fireEvent(Events.done, CloudExperienceHost.AppResult.error);
                    });
                }
            }

            function optInClicked() {
                if (!processingFlag()) {
                    processingFlag(true);
                
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Cortana user clicked opt in");
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HeyCortanaCheckboxFinalValue", oobeCortana_vm.talkToCortanaCheckboxValue());

                    // Show the progress ring while committing async.
                    bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                    setCortanaOptin(1).then(setHeyCortana).done(function () {
                        bridge.fireEvent(Events.done, CloudExperienceHost.AppResult.success);
                    }, function (e) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CortanaOptOutError", core.GetJsonFromError(e));
                    bridge.fireEvent(Events.done, CloudExperienceHost.AppResult.error);
                    });
                }
            }

            function localizedStringsAsync() {
                //this bridge invoke is needed because the CloudExperienceHost back end has resource access
                return (bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", 'oobeCortana').then((resourcesString) => {
                    return JSON.parse(resourcesString);
                }));
            }

            function setCortanaOptin(optinValue) {
                if (cortanaManager === CloudExperienceHostBroker.Cortana.OOBECortanaManagerCoreForUser) {
                    return (
                        bridge.invoke("CloudExperienceHost.Cortana.callSetCortanaOptinUsingIUser", optinValue).then((result) => {
                            return result;
                        }));
                }
                else {
                    return cortanaManager.setCortanaOptinAsync(optinValue, null);
                }
            }

            function setHeyCortana() {
                return cortanaManager.setHeyCortanaOptionAsync(oobeCortana_vm.talkToCortanaCheckboxValue() ? 1 : 0);
            }

            function talkToCortanaCheckboxVisible() {
                return (cortanaManager.hasMicrophone) && (!cortanaManager.isMobileDeviceWithBatteries || cortanaManager.isBatteryCertified);
            }
        
            function talkToCortanaCheckboxText(cortanaResources) {
                if(cortanaManager.hasMicrophone) {
                    if(!cortanaManager.isMobileDeviceWithBatteries) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CortanaInfo", "Checkbox is visible on a desktop platform");
                        return cortanaResources.heyCortanaCheckboxText;
                    }
                    else if(cortanaManager.isBatteryCertified && !cortanaManager.hasHardwareKeywordSpotter) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CortanaInfo", "Checkbox is visible on a battery certified platform");
                        return cortanaResources.heyCortanaCheckboxTextPluggedOnly;
                    }
                    else if(cortanaManager.isBatteryCertified && cortanaManager.hasHardwareKeywordSpotter) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CortanaInfo", "Checkbox is visible on a battery certified platform with a hw keyword spotter");
                        return cortanaResources.heyCortanaCheckboxTextUsesMoreBattery;
                    }
                }
                else {
                    return cortanaResources.heyCortanaCheckboxText;
                }
            }

            function cortanaHeadingText(cortanaResources) {
                if (isOOBEFeatureEnabled(feature_UseNewSearchAndCortanaApps)) {
                    return cortanaResources.cortanaHeading_newUwp;
                }
                else {
                    return cortanaResources.cortanaHeading_globalConsent;
                }
            }

            function cortanaSubheadingText(cortanaResources) {
                if (isOOBEFeatureEnabled(feature_UseNewSearchAndCortanaApps)) {
                    return cortanaResources.cortanaSubHeading_newUwp;
                }
                else {
                    return cortanaResources.cortanaCaptionText;
                }
            }

            function talkToCortanaCheckboxInitialValue() {
                return talkToCortanaCheckboxVisible() && cortanaManager.heyCortanaCheckboxDefaultValue;
            }

            function isOOBEFeatureEnabled(featureName) {
                return CloudExperienceHostAPI.FeatureStaging.isOobeFeatureEnabled(featureName);
            }

            function logInitialCheckboxTelemetry(oobeCortana_vm)
            {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HeyCortanaCheckboxInitialValue", oobeCortana_vm.talkToCortanaCheckboxValue());
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HeyCortanaCheckboxVisible", oobeCortana_vm.talkToCortanaCheckboxVisible);
            }

            // Params
            //  element: the html element to bind to from
            //  voiceActivated: an object with member boolean voiceActivated (for named parameter)
            function showLearnMorePage(options = { voiceActivated: false }) {
                if (!processingFlag()) {
                    processingFlag(true);

                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CortanaLearnMoreLink", options.voiceActivated ? "voice" : "click");
            
                        //cancel TTS action
                    CloudExperienceHostAPI.Speech.SpeechSynthesis.stop();
                    CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
            
                    oobeCortana_vm.currentPanelIndex(1);

                    CloudExperienceHostAPI.Speech.SpeechRecognition.listenForCommandsAsync(learnMorePageConstraints()).then((command) => {
                        if (command) {
                            handleSpeechCommandLearnMore(command);
                        }
                    });
                }
            }

            function returnClicked(element, options = { voiceActivated: false }) {
                if (!processingFlag()) {
                    processingFlag(true);
            
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CortanaBackToMainPageLink",  options.voiceActivated ? "voice" : "click");
            
                    //cancel listen action
                    CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
           
                    oobeCortana_vm.currentPanelIndex(0);

                    CloudExperienceHostAPI.Speech.SpeechRecognition.listenForCommandsAsync(mainPageConstraints())
                        .then((command) => {
                            if (command) {
                                handleSpeechCommandMain(command);
                            }
                    });
                }
            }

            function logError(err) {
                console.log("An error occurred in cortana page ", err);
            }

            function isCortanaAllowedByPolicy() {
                return cortanaManager.isCortanaAllowedByPolicy;
            }
        
            function mainPageConstraints() {
                const customYesResponsesMainPage = 
                    [oobeCortana_vm.cortanaResources.setCortanaOptIn,
                        oobeCortana_vm.cortanaResources.customYesConstraints_optIn];
                const customNoResponsesMainPage =
                    [oobeCortana_vm.cortanaResources.setCortanaOptOut_newUwp,
                        oobeCortana_vm.cortanaResources.customNoConstraints_dontUse];
                const customLearnMoreResponsesMainPage =
                    [oobeCortana_vm.cortanaResources.customLearnMoreConstraints_learnMore,
                        oobeCortana_vm.cortanaResources.customLearnMoreConstraints_showMore,
                        oobeCortana_vm.cortanaResources.customLearnMoreConstraints_tellMore];

                return [CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes, 
                CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no,
                new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(customYesResponsesMainPage, 
                    CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes.tag),
                new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(customNoResponsesMainPage,
                    CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.no.tag),
                new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(customLearnMoreResponsesMainPage, learnMoreTag)];
            }

            function learnMorePageConstraints() {
                return  [CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.yes,
                CloudExperienceHostAPI.Speech.SpeechRecognitionKnownCommands.back,
                new Windows.Media.SpeechRecognition.SpeechRecognitionListConstraint(customOkLearnMorePage, okTag)];
            }
        });
    });
})();
