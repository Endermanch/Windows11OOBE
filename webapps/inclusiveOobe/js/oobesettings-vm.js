//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'oobesettings-data', 'legacy/bridge', 'legacy/events', 'legacy/core', 'corejs/knockouthelpers'], (ko, oobeSettingsData, bridge, constants, core, KoHelpers) => {

    class SettingsViewModel {
        constructor(resources, isInternetAvailable, targetPersonality) {
            bridge.addEventListener(constants.Events.backButtonClicked, this.handleBackNavigation.bind(this));
            this.resources = resources;
            let oobeSettingsToggles = this.getSettingsToggles();
            this.contentSettings = oobeSettingsToggles.settingsData;
            this.settingsObjects = oobeSettingsToggles.settingsObjects;
            this.learnMoreContent = oobeSettingsData.getLearnMoreContent();
            this.scrolledToTheBottom = true;
            this.firstUpdateForScrollState = true;
            this.scrollViewEle = null;
            this.scrollDuration = 666;

            // Log telemetry for Default Settings
            for (let setting of this.settingsObjects) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Default" + setting.canonicalName, setting.value);
            }

            // observable to monitor page view change
            this.viewName = ko.observable("customize");

            let mainTitleTextStrings = {};
            let mainSubHeaderTextStrings = {};
            mainTitleTextStrings["customize"] = resources.SettingsTitle;
            mainSubHeaderTextStrings["customize"] = resources.SettingsSubtitle;
            mainTitleTextStrings["learnmore"] = resources.LearnMoreTitle;

            this.title = ko.pureComputed(() => {
                return mainTitleTextStrings[this.viewName()];
            });
            this.subHeaderText = ko.pureComputed(() => {
                return mainSubHeaderTextStrings[this.viewName()];
            });

            this.voiceOverContent = {};
            this.voiceOverContent["customize"] = resources.CustomizeVoiceOver;

            this.processingFlag = ko.observable(false);

            let flexEndButtonSet = {};
            flexEndButtonSet["customize"] = [
                {
                    buttonText: resources.LearnMoreButtonText,
                    buttonType: "button",
                    automationId: "OobeSettingsLearnMoreButton",
                    isPrimaryButton: false,
                    autoFocus: false,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: () => {
                        this.onLearnMore();
                    }
                },
                {
                    buttonText: resources.AcceptButtonText,
                    buttonType: "button",
                    automationId: "OobeSettingsAcceptButton",
                    isPrimaryButton: true,
                    autoFocus: true,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: () => {
                        this.onSave();
                    }
                }
            ];
            flexEndButtonSet["learnmore"] = [
                {
                    buttonText: resources.ContinueButtonText,
                    buttonType: "button",
                    automationId: "OobeSettingsContinueButton",
                    isPrimaryButton: true,
                    autoFocus: false,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: () => {
                        this.onLearnMoreContinue();
                    }
                }
            ];

            this.flexEndButtons = ko.pureComputed(() => {
                return flexEndButtonSet[this.viewName()];
            });

            this.customizeVisible = ko.pureComputed(() => {
                return (this.viewName() === "customize");
            });
            this.learnMoreVisible = ko.pureComputed(() => {
                return (this.viewName() === "learnmore");
            });

            this.pageDefaultAction = () => {
                if (this.customizeVisible()) {
                    this.onSave();
                }
                else if (this.learnMoreVisible()) {
                    this.onLearnMoreContinue();
                }
            };

            this.viewName.subscribe((newViewName) => {
                this.processingFlag(false);
            });

            let footerDescriptionTextSet = {};
            footerDescriptionTextSet["customize"] = resources.LearnMoreDescription;
            this.footerDescriptionText = ko.pureComputed(() => {
                return footerDescriptionTextSet[this.viewName()];
            });

            this.initScrollState();
        }

        initScrollState() {
            this.scrolledToTheBottom = true;
            this.firstUpdateForScrollState = true;
            this.scrollViewEle = document.querySelector('#scrollRegion');
            if (this.scrollViewEle) {
                this.scrollViewEle.addEventListener("scroll", this.updateForScrollState.bind(this));
            }

            document.addEventListener("keyup", this.tabKeyUpHandler.bind(this));
        }

        startVoiceOver() {
            this.speak(this.viewName());
        }

        speak(viewName) {
            if (viewName in this.voiceOverContent) {
                CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
                CloudExperienceHostAPI.Speech.SpeechSynthesis.speakAsync(this.voiceOverContent[viewName]);
            }
        }

        onLearnMore() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "Settings", "LearnMoreLink");
                this.viewName("learnmore");
                bridge.invoke("CloudExperienceHost.setShowBackButton", true); // Ensure back button shows on Learn More page and that it will return to the main page
                this.onAfterViewNameUpdated();
                KoHelpers.setFocusOnAutofocusElement();
            }
        }

        onAfterViewNameUpdated() {
            let learnMoreIFrame = document.getElementById("learnMoreIFrame");
            let doc = learnMoreIFrame.contentWindow.document;
            oobeSettingsData.updateLearnMoreContentForRender(doc, document.documentElement.dir, isInternetAvailable, this.resources.NavigationError, targetPersonality);
        }

        onToggleChange() {
        }

        onSave() {
            if (!this.processingFlag()) {
                this.processingFlag(true);

                if (!this.scrolledToTheBottom) {
                    if (this.scrollViewEle) {
                        this.scrollTo(this.scrollViewEle, this.scrollViewEle.scrollTop + this.scrollViewEle.offsetHeight, true /* autoFocus */);
                    }
                }
                else {
                    oobeSettingsData.commitSettings(this.settingsObjects, 2 /*PrivacyConsentPresentationVersion::AllSettingsSinglePageTwoColumn*/);
                }
            }
        }

        updateForScrollState() {
            if (this.firstUpdateForScrollState || !this.scrolledToTheBottom) {
                let lastEle = document.querySelector('#lastElementInToggleList');
                if (lastEle) {
                    this.scrolledToTheBottom = this.isScrolledIntoView(lastEle);
                    let btnTextCurr = this.scrolledToTheBottom ? this.resources.AcceptButtonText : this.resources.NextButtonText;
                    let btnEle = document.querySelector('#OobeSettingsAcceptButton');
                    if (btnEle && (btnTextCurr !== btnEle.innerHTML)) {
                        btnEle.innerHTML = btnTextCurr;
                        if (!this.scrolledToTheBottom) {
                            // Override the visible button label when we need to explain an unusual effect
                            btnEle.setAttribute("aria-label", this.resources.NextButtonAccLabel);
                        }
                        else {
                            btnEle.setAttribute("aria-label", this.resources.AcceptButtonAccLabel);
                        }
                    }
                }
                this.firstUpdateForScrollState = false;
            }
            this.enableToggleAria();
        }

        enableToggleAria() {
            if (this.scrollViewEle) {
                this.scrollViewEle.removeAttribute("aria-hidden");
            }
        }

        tabKeyUpHandler(e) {
            if (!this.scrolledToTheBottom && (e.keyCode === WinJS.Utilities.Key.tab)) {
                let focused = document.activeElement;
                if (focused && focused.winControl && focused.winControl.isLastInAGroup) {
                    this.scrollTo(this.scrollViewEle, this.scrollViewEle.scrollTop + this.scrollViewEle.offsetHeight, false /* autoFocus */);
                }
            }
        }

        isScrolledIntoView(el) {
            let visible = true;
            if (this.scrollViewEle) {
                let rect = el.getBoundingClientRect();
                visible = (rect.top >= 0) && (rect.bottom <= this.scrollViewEle.offsetTop + this.scrollViewEle.offsetHeight);
            }
            return visible;
        }

        scrollTo(element, to, autoFocus) {
            let start = element.scrollTop,
                change = to - start,
                currentTime = 0,
                increment = 20;

            let animateScroll = function () {
                currentTime += increment;
                let val = this.easeInOutQuad(currentTime, start, change, this.scrollDuration);
                element.scrollTop = val;
                if (currentTime < this.scrollDuration) {
                    setTimeout(animateScroll, increment);
                }
                else {
                    this.processingFlag(false);
                    if (autoFocus) {
                        KoHelpers.setFocusOnAutofocusElement();
                    }
                }
                this.updateForScrollState();
            }.bind(this);
            animateScroll();
        }

        //t = current time
        //b = start value
        //c = change in value
        //d = duration
        easeInOutQuad(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }

        onLearnMoreContinue() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                this.viewName("customize");
                bridge.invoke("CloudExperienceHost.setShowBackButton", false); // Fall back to normal back button behavior
                this.initScrollState();
                this.updateForScrollState();
                KoHelpers.setFocusOnAutofocusElement();
            }
        }

        handleBackNavigation() {
            if (this.learnMoreVisible()) {
                this.onLearnMoreContinue();
            }
        }

        // Converts the underlying settings objects into a format consumable by the single-page variant of oobe settings
        getSettingsToggles() {
            //initialize the settingsData object
            let settingsData = [];
            let settingsObjects = [];
            let oobeSettingsGroups = CloudExperienceHostAPI.OobeSettingsStaticsCore.getSettingGroups();

            for (let oobeSettingsGroup of oobeSettingsGroups) {
                let settingsGroupModel = {};
                settingsGroupModel.contentHeader = oobeSettingsGroup.title;
                settingsGroupModel.description = oobeSettingsGroup.description;

                let toggles = [];
                let settingsInGroup = oobeSettingsGroup.getSettings();
                let settingsLen = settingsInGroup.length;
                for (let index = 0; index < settingsLen; index++) {
                    let setting = settingsInGroup[index];
                    settingsObjects.push(setting);
                    let toggle = {
                        labelOffText: setting.valueOffLabel,
                        labelOnText: setting.valueOnLabel,
                        checkedValue: ko.observable(setting.value),
                        isLastInAGroupValue: (index === (settingsLen - 1)) ? true : false,
                        name: setting.name,
                        descriptionOn: setting.descriptionOn,
                        descriptionOff: setting.descriptionOff,
                        titleText: ko.observable(setting.value ? setting.descriptionOn : setting.descriptionOff),
                        canonicalName: setting.canonicalName
                    };
                    toggle.checkedValue.subscribe(function (newValue) {
                        setting.value = newValue;
                        toggle.titleText(newValue ? toggle.descriptionOn : toggle.descriptionOff);
                    });
                    toggles.push(toggle);
                }
                settingsGroupModel.toggleContent = toggles;
                settingsData.push(settingsGroupModel);
            }
            return {
                settingsData: settingsData,
                settingsObjects: settingsObjects
            };
        }
    }
    return SettingsViewModel;
});
