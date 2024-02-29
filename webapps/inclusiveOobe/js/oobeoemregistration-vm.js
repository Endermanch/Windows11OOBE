//
// Copyright (C) Microsoft. All rights reserved.
//
"use strict";
define(['lib/knockout', 'legacy/bridge', 'legacy/events', 'legacy/core'], (ko, bridge, constants, core) => {
    class OemRegistrationViewModel {
        constructor(resourceStrings, regions, defaultRegion, oemRegistrationInfo, userInfo, targetPersonality) {
            this.resourceStrings = resourceStrings;
            this.countryCodeDefaultSelectOption = {
                displayName: this.resourceStrings["PhoneNumberCountryCodeLabel"],
                rawCode: ""
            };
            this.regions = regions;
            this.countryCodeSelectOptions = this.getCountryCodeSelectOptions();
            userInfo = userInfo || {};
            let selectedRegionCode = userInfo.country || (this.regions.find((region) => (region.codeTwoLetter == defaultRegion)).codeTwoLetter);
            this.title = oemRegistrationInfo.title;
            this.subHeaderText = oemRegistrationInfo.subtitle;
            this.hideSkip = oemRegistrationInfo.hideskip;
            this.showPhoneNumber = oemRegistrationInfo.showphonenumber;
            this.loadingLink = ko.observable(false);

            this.isLiteWhitePersonality = ko.pureComputed(() => {
                return targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite;
            });
            bridge.addEventListener(constants.Events.backButtonClicked, this.handleBackNavigation.bind(this));

            this.processingFlag = ko.observable(false);
            this.disableControl = ko.pureComputed(() => {
                return this.processingFlag();
            });

            this.customerInfo = {
                firstName: {
                    label: resourceStrings.FirstNameLabel,
                    value: ko.observable(userInfo.firstName || ""),
                    defaultValue: userInfo.firstName || "",
                },
                lastName: {
                    label: resourceStrings.LastNameLabel,
                    value: ko.observable(userInfo.lastName || ""),
                    defaultValue: userInfo.lastName || "",
                },
                email: {
                    label: resourceStrings.EmailAddressLabel,
                    value: ko.observable(userInfo.email || ""),
                    defaultValue: userInfo.email || "",
                },
                region: {
                    label: resourceStrings.RegionLabel,
                    value: ko.observable(this.getRegionObjectFromTwoLetterCode(selectedRegionCode) || ""),
                    defaultValue: this.getRegionObjectFromTwoLetterCode(selectedRegionCode) || "",
                },
                phoneNumber: {
                    label: resourceStrings.PhoneNumberLabel,
                    value: {
                        countryCode: ko.observable(selectedRegionCode ? this.preselectCountryCodeSelectOption(selectedRegionCode) : this.countryCodeDefaultSelectOption),
                        number: ko.observable("")
                    },
                    defaultValue: {
                        countryCode: selectedRegionCode ? this.preselectCountryCodeSelectOption(selectedRegionCode) : this.countryCodeDefaultSelectOption,
                        number: ""
                    },
                },
            };

            this.customerInfoField = oemRegistrationInfo.customerinfo;
            this.customerInfoField.value = ko.observable(this.customerInfoField.value);

            oemRegistrationInfo.fields.forEach((field) => {
                if (field.value !== undefined) {
                    field.value = ko.observable(field.value);
                    field.defaultValue = field.value;
                }
            });
            this.checkBoxFields = oemRegistrationInfo.fields.filter((field => field.type == "checkbox"));
            this.linkFields = oemRegistrationInfo.fields.filter((field => field.type == "link"));

            this.currentPanelIndex = ko.observable(this.customerInfoField ? 0 : 1);

            this.pageDefaultAction = () => {
                if (this.currentPanelIndex() == 0) {
                    this.onSubmitCustomerInfo();
                }
                else {
                    this.onSubmitAdditionalFields();
                }
            }

            this.currentPanelIndex.subscribe((newStepIndex) => {
                this.processingFlag(false);
            });
        }

        saveInfoAsync() {
            // Must be sure to unpack all observables before serializing
            let customerInfoFieldUnwrapped = {
                label: this.customerInfoField.label,
                value: this.customerInfoField.value(),
            };

            let registrationInfo = {
                customerinfo: customerInfoFieldUnwrapped,
                fields: [],
            };

            let telemetryInfos = [];

            if (this.customerInfoField) {
                Object.keys(this.customerInfo).forEach((key, index) => {
                    let field = this.customerInfo[key];
                    field.type = "textbox";
                    field.id = "text" + (index + 1);
                    field.defaultValue = ko.unwrap(field.defaultValue);

                    if (key == "region") {
                        // Region values are an object with codeTwoLetter and displayName properties.
                        field.value = field.value();
                        if (field.value && field.value.codeTwoLetter) {
                            field.value = field.value.codeTwoLetter;
                        } else {
                            field.value = "";
                        }

                        if (field.defaultValue && field.defaultValue.codeTwoLetter) {
                            field.defaultValue = field.defaultValue.codeTwoLetter;
                        } else {
                            field.defaultValue = "";
                        }
                    } else if (key == "phoneNumber") {
                        // Phone number values are an object with countryCode and number properties
                        // countryCode values are objects with displayName and rawCode properties
                        field.value.countryCode = field.value.countryCode();
                        field.value.number = field.value.number();
                        if (field.value && field.value.countryCode && field.value.countryCode.rawCode && field.value.countryCode.rawCode.length > 0 && field.value.number && field.value.number.length > 0) {
                            field.value = field.value.countryCode.rawCode + " " + field.value.number; // Serialize with a single space between country code and number, aligning with E.123 formatting standard for phone numbers
                        } else {
                            field.value = "";
                        }

                        if (field.defaultValue && field.defaultValue.countryCode && field.defaultValue.countryCode.rawCode && field.defaultValue.countryCode.rawCode.length > 0 && field.defaultValue.number && field.defaultValue.number.length > 0) {
                            field.defaultValue = field.defaultValue.countryCode.rawCode + " " + field.defaultValue.number; // Serialize with a single space between country code and number, aligning with E.123 formatting standard for phone numbers
                        } else {
                            field.defaultValue = "";
                        }
                    } else {
                        field.value = field.value();
                    }

                    // Don't add fields with null/undefined values (e.g. if the user doesn't select a region)
                    // as these break serialization in the broker's save implementation.
                    if (!field.value) {
                        field.value = "";
                    }
                    registrationInfo.fields.push(field);
                    telemetryInfos.push(this.getTelemetryInfo(field));
                });
            }

            this.checkBoxFields.forEach((field, index) => {
                field.value = field.value();
                field.defaultValue = ko.unwrap(field.defaultValue);
                registrationInfo.fields.push(field);
                telemetryInfos.push(this.getTelemetryInfo(field));
            });

            return bridge.invoke("CloudExperienceHost.OEMRegistrationInfo.saveOEMRegistrationInfo", JSON.stringify(registrationInfo)).then(() => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "saveOEMRegistrationInfoSuccess", JSON.stringify(telemetryInfos));
            });
        }

        onSkipCustomerInfo() {
            if (!this.processingFlag()) {
                this.processingFlag(true);

                // Show the progress ring while committing async.
                bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                var emptyObj = {};
                bridge.invoke("CloudExperienceHost.OEMRegistrationInfo.saveOEMRegistrationInfo", JSON.stringify(emptyObj)).then(() => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SkipUserOobeOEMRegistrationPage");
                }).done(() => {
                    bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
                }, (error) => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SkipUserOobeOEMRegistrationPageFailure", core.GetJsonFromError(error));
                    bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
                });
            }
        }

        onSubmitCustomerInfo() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                this.currentPanelIndex(1);
                bridge.invoke("CloudExperienceHost.setShowBackButton", true);
            }
        }

        onSubmitAdditionalFields() {
            if (!this.processingFlag()) {
                this.processingFlag(true);

                // Show the progress ring while committing async.
                bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                this.saveInfoAsync().done(() => {
                    bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                }, (error) => {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "saveOEMRegistrationInfoFailure", core.GetJsonFromError(error));
                    // Mimicking old OEM page behavior of not blocking OOBE if saving the OEM data fails. This is the same as if the user clicked skip button, if it's not hidden.
                    bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
                });
            }
        }

        onOemLinkClicked(linkItem, e) {
            if (!this.loadingLink()) {
                this.loadingLink(true);
                let filePromise = bridge.invoke("CloudExperienceHost.OEMRegistrationInfo.getLinkFileContent", linkItem.value());
                let winjsPromise = requireAsync(["winjs/ui"]);
                WinJS.Promise.join({ fileContent: filePromise, modules: winjsPromise }).done((result) => {
                    let flyoutEl = document.getElementById("linkFlyout");
                    flyoutEl.setAttribute("aria-label", linkItem.label);
                    let flyoutControl = flyoutEl.winControl;
                    if (!flyoutControl) {
                        flyoutControl = new WinJS.UI.Flyout(flyoutEl);
                    }
                    let flyoutFrame = flyoutEl.querySelector("#linkFlyoutIFrame");
                    let frameDoc = flyoutFrame.contentWindow.document;
                    frameDoc.open('text/html', 'replace');
                    frameDoc.dir = document.dir;
                    frameDoc.write(result.fileContent);
                    frameDoc.close();

                    // Avoid reading "pane" for this
                    frameDoc.body.setAttribute("role", "presentation");

                    flyoutControl.onaftershow = () => {
                        flyoutFrame.contentWindow.focus();
                    };

                    flyoutControl.show(e.target, 'autovertical', 'left');
                    this.loadingLink(false);
                }, (error) => {
                    this.loadingLink(false);
                });
            }
        }

        getTelemetryInfo(field) {
            if (field.type == "checkbox") {
                return {
                    id: field.id,
                    isPrePopulated: !!field.defaultValue,
                    isEmpty: false,
                    wasEmpty: false,
                    changed: field.defaultValue !== field.value
                };
            }
            else {
                return {
                    id: field.id,
                    isPrePopulated: field.defaultValue.length > 0,
                    isEmpty: field.value && field.value.length < 1,
                    wasEmpty: field.defaultValue.length < 1,
                    changed: field.defaultValue !== field.value
                };
            }
        }

        getRegionObjectFromTwoLetterCode(code) {
            for (let i = 0; i < this.regions.length; i++) {
                if (code === this.regions[i].codeTwoLetter) {
                    return this.regions[i];
                }
            }
            return null;
        }

        getCountryCodeSelectEntryForRegion(regionCode) {
            let countryCode = Windows.Globalization.PhoneNumberFormatting.PhoneNumberFormatter.getCountryCodeForRegion(regionCode);
            return countryCode ? {
                displayName: regionCode + " (+" + countryCode.toString() + ")", // Format: United States (+1)
                rawCode: "+" + countryCode.toString()
            } : this.countryCodeDefaultSelectOption;
        }

        getCountryCodeSelectOptions() {
            // Add all phone number country codes associated with a supported region
            let countryCodeSelectOptions = [];
            for (let i = 0; i < this.regions.length; i++) {
                let countryCodeSelectEntry = this.getCountryCodeSelectEntryForRegion(this.regions[i].codeTwoLetter);
                if (countryCodeSelectEntry && countryCodeSelectEntry.rawCode && countryCodeSelectEntry.rawCode.length > 0) {
                    countryCodeSelectOptions.push(countryCodeSelectEntry);
                }
            }
            
            // Sort by displayName and prepend the select placeholder option before returning
            countryCodeSelectOptions.sort((a,b) => {
                if (a.displayName < b.displayName) {
                    return -1;
                } else if (a.displayName > b.displayName) {
                    return 1;
                }
                return 0;
            });
            countryCodeSelectOptions.unshift(this.countryCodeDefaultSelectOption);
            return countryCodeSelectOptions;
        }

        preselectCountryCodeSelectOption(regionCode) {
            for (let i = 0; i < this.countryCodeSelectOptions.length; i++) {
                if (this.countryCodeSelectOptions[i].displayName.startsWith(regionCode)) {
                    return this.countryCodeSelectOptions[i];
                }
            }
            return this.countryCodeDefaultSelectOption;
        }

        startVoiceOver() {
            try {
                CloudExperienceHostAPI.Speech.SpeechRecognition.stop();
                CloudExperienceHostAPI.Speech.SpeechSynthesis.speakAsync(this.resourceStrings.PageIntroVoiceOver);
            }
            catch (err) {
            }
        }

        handleBackNavigation() {
            if (this.currentPanelIndex() === 1) {
                this.currentPanelIndex(0);
                bridge.invoke("CloudExperienceHost.setShowBackButton", false);
            }
        }
    }
    return OemRegistrationViewModel;
});
