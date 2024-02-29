//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core', 'legacy/appObjectFactory', 'optional!sample/Sample.CloudExperienceHostAPI.OobeDisplayLanguageManagerCore'], (ko, bridge, constants, core, appObjectFactory) => {
    class LanguageViewModel {
        constructor(resourceStrings, gestureManager, targetPersonality) {
            this.gestureManager = gestureManager;
            this.resourceStringsObservable = ko.observable(resourceStrings);

            this.supportClickableTitle = true;
            this.supportExtraSpaceTitle = true;
            this.optinHotKey = true;

            // Title to be removed in ROOBE only.
            this.removeTitle = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite);

            this.languages = CloudExperienceHostAPI.OobeDisplayLanguagesCore.getDisplayLanguages();

            let selectedDisplayLanguageTag = this.languages[0].tag;
            let defaultDisplayLanguageObject = CloudExperienceHostAPI.OobeDisplayLanguageManagerCore.tryGetDefaultDisplayLanguage();

            if (defaultDisplayLanguageObject.succeeded) {
                selectedDisplayLanguageTag = defaultDisplayLanguageObject.value;
            }

            this.selectedLanguage = ko.observable(this.languages.find((language) => language.tag === selectedDisplayLanguageTag));
            if (!this.selectedLanguage()) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LanguageUpdateNoInput");
                this.selectedLanguage(this.languages[0]);
            }
            this.selectedLanguage.subscribe((newSelectedLanguage) => {
                this.updateLanguage(newSelectedLanguage)
            });
            this.updateLanguage(this.selectedLanguage());

            this.title = ko.pureComputed(() => { return this.resourceStringsObservable().titleText; });

            this.listAccessibleName = ko.pureComputed(() => {
                return this.resourceStringsObservable().languagesSelection
            });

            this.processingFlag = ko.observable(false);
            this.flexEndButtons = [
                {
                    buttonText: ko.pureComputed(() => { return this.resourceStringsObservable().yesButtonText}),
                    buttonType: "button",
                    isPrimaryButton: true,
                    disableControl: ko.pureComputed(() => {
                        return this.processingFlag();
                    }),
                    buttonClickHandler: () => {
                        this.completeLanguageSelection();
                    }
                }
            ];

            this.pageDefaultAction = () => {
                this.completeLanguageSelection();
            }
        }

        completeLanguageSelection() {
            if (!this.processingFlag()) {
                this.processingFlag(true);

                uiHelpers.PortableDeviceHelpers.unsubscribeToDeviceInsertion(this.gestureManager, bridge, core);

                try {
                    // Show the progress ring while committing async.
                    bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                    let languageManager = appObjectFactory.getObjectFromString("CloudExperienceHostAPI.OobeDisplayLanguageManagerCore");
                    let commitLanguage = languageManager.commitDisplayLanguageAsync(this.selectedLanguage());
                    commitLanguage.action.done(() => {
                        // Notify the frame to change the reading direction after commit
                        bridge.invoke("CloudExperienceHost.AppFrame.updateFrameDirection");

                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LanguageCommitSuccess");
                        if (commitLanguage.effects && commitLanguage.effects.rebootRequired) {
                            // Notify progress UI to update the text in order to notify user the device is going to reboot. This only applies to win10x.
                            // Win10x will reboot immediately right after the language selection whereas win10 OOBE will postpone the reboot until after ZDP.
                            bridge.invoke("CloudExperienceHost.updateTransitionMessage", this.resourceStringsObservable().rebootMessage);
                            setTimeout(() => {
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommitLanguageRebootRequired");
                                bridge.invoke("CloudExperienceHost.setRebootForOOBE");
                                bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                            }, 3000);
                        }
                        else {
                            bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                        }
                    });
                } catch (error) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent",
                                  "LanguageCommitError",
                                  core.GetJsonFromError(error));
                    bridge.fireEvent(constants.Events.done, constants.AppResult.error);
                }
            }
        }

        updateLanguage(newLanguage) {
            if (Windows.Globalization.ApplicationLanguages.languages[0] !== newLanguage.tag) {
                // Though primaryLanguageOverride is disabled for SystemApps, it is needed here to update Windows.Globalization.ApplicationLanguages.languages 
                // and it won't impact MRT lookups.
                Windows.Globalization.ApplicationLanguages.primaryLanguageOverride = newLanguage.tag;
                bridge.invoke("CloudExperienceHost.languageOverridden", newLanguage.tag);
                this.getUpdatedResourceStrings(newLanguage.tag);
            }
        }

        getUpdatedResourceStrings(language) {
            let getLocalizedStringsPromise = requireAsync(['legacy/bridge']).then((result) => {
                return result.legacy_bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeLanguage", null /* keyList */, language);
            }).then((result) => {
                this.resourceStringsObservable(JSON.parse(result));
            });
        }

        subscribeToDeviceInsertion(gestureManager) {
            uiHelpers.PortableDeviceHelpers.subscribeToDeviceInsertion(gestureManager, bridge, core);
        }
    }

    return LanguageViewModel;
});
