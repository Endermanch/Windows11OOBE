// Copyright (C) Microsoft. All rights reserved.
(function () {
    "use strict";

    var bridge = new CloudExperienceHost.Bridge();
    var resources;
    var navFlow;
    var rdamJson = null;
    var passwordErrorExists = false; // True iff the passwords don't match or are empty
    var blockNext = false; // If true, block the next button

    WinJS.UI.Pages.define("/RetailDemo/retailDemoSecurity.html", {
        init: function (element, options) {
            let pagePromise = bridge.invoke("CloudExperienceHost.StringResources.getRetailDemoStrings").done(function (result) {
                resources = JSON.parse(result);
            });
            let cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            let languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _htmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            let dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _htmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            let navFlowPromise = bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                navFlow = result.host;
            }, function () { });

            return WinJS.Promise.join({ pagePromise: pagePromise, cssPromise: cssPromise, languagePromise: languagePromise, dirPromise: dirPromise, navFlowPromise: navFlowPromise });
        },

        ready: function (element, options) {
            // Load string resources in HTML elements
            securityTitle.textContent = resources.securityTitle;
            securityText.textContent = resources.securityText;
            passwordManagmentLegend.textContent = resources.passwordManagmentLegend;
            timeoutLegend.textContent = resources.timeoutLegend;
            passwordLegend.textContent = resources.passwordLegend;
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBE_Password_Label_Accessibility")) {
                passwordInputCheck.setAttribute("aria-label", resources.confirmPassword);
                passwordInputCheck.setAttribute("aria-roledescription", resources.editField);
            }

            // start the toggle out disabled until the RDAM request has completed
            passwordManagementToggle.disabled = true;

            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBE_Toggle_Control_Type_Accessibility")) {
                // set the role to switch for the accessibility API to read it as toggle switch instead of checkbox
                passwordManagementToggle.setAttribute("aria-label", resources.passwordManagmentLegend);
                passwordManagementToggle.setAttribute("role", "switch");
            }

            // Check the flow
            if (navFlow === "FRXRDX") {
                nextButton.textContent = resources.nextButton;
            } else {
                nextButton.textContent = resources.finishButton;
            }

            passwordInputCheck.addEventListener("change", passwordCheck);
            passwordInput.addEventListener("change", passwordCheck);

            // Reusing the method used in OobeToggle VM to handle click events on the toggle
            // To support programmatic control through Narrator/UIA the toggle needs to support click event,
            // which WinJS's implementation does not do (they build on pointerdown directly against the slider div).
            // Thus we add two handlers in the OobeToggle VM
            // - pointerdown, which executes in the capturing (routing) phase to suppress WinJS's own behavior
            // - click, to add checked-flipping for clicks to the slider and label and programmatic clicks
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBE_Narrator_ScanMode_Activation_Accessibility")) {
                passwordManagementToggle.addEventListener("click", function (eventInfo) {
                    passwordManagementToggle.winControl.checked = !passwordManagementToggle.winControl.checked;
                    eventInfo.preventDefault();
                });

                passwordManagementToggle.addEventListener("pointerdown", onPointerDownHandler, true /*useCapture*/);
            }

            passwordManagementToggle.addEventListener("change", function (eventInfo) {
                eventInfo.preventDefault();
                if (passwordManagementToggle.winControl.checked) {
                    timeoutElements.style.display = "inline";
                    passwordElements.style.display = "none";
                    allowUserToContinue();
                    if (passwordError.firstChild) {
                        passwordError.removeChild(passwordError.firstChild);
                    }
                } else {
                    timeoutElements.style.display = "none";
                    passwordElements.style.display = "inline";
                    passwordCheck();
                }
            });

            // we allow a max of 21 days before we disable the admin account
            for (let i = 0; i < 22; i++) {
                let option = document.createElement("option");
                option.value = i * 24;
                if (i == 0) {
                    option.text = resources.immediatelyText;
                } else if (i == 1) {
                    option.text = resources.dayText.replace("{0}", i);
                } else {
                    option.text = resources.daysText.replace("{0}", i);
                }

                timeoutSelect.appendChild(option);
            }

            timeoutSelect.selectedIndex = 1;

            let racValue;
            if (Windows.System.Profile.RetailInfo.properties.hasKey("RetailAccessCode")) {
                racValue = Windows.System.Profile.RetailInfo.properties.lookup("RetailAccessCode");
            }

            // before the RDAM request, prevent the user from continuing
            preventContinue();
            let racOption = {
                url: "https://retailstore.microsoft.com/RedecsService/Content/api/attributes/metadata?RAC=" + racValue,
                responseType: "json"
            };
            WinJS.Promise.timeout(30000, bridge.invoke("WinJS.xhr", racOption)).then(
                function (result) {
                    rdamJson = result.response;
                    // populate the password if the rac has one
                    passwordInput.value = rdamJson.RetailerAccessCodes[0].AdminPassword;
                    passwordInputCheck.value = rdamJson.RetailerAccessCodes[0].AdminPassword;
                    passwordManagementToggle.disabled = false
                    allowUserToContinue();
                },
                function (error) {
                    // Status code is 0 if interent goes out or url doesn't exist for some reason
                    if ((error.message === "Canceled") || (error.status === 0)) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "RdamRequestTimeout");
                    } else {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "InvalidRac", racValue);
                    }
                    passwordManagementToggle.disabled = false
                    allowUserToContinue();
                }
            );

            nextButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                if (!blockNext) {
                    if (passwordManagementToggle.winControl.checked) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "DisableAdminSelected", timeoutSelect[timeoutSelect.selectedIndex].value);
                        bridge.invoke("RetailDemo.Internal.RetailInfoSetter.setDWORDAsync", "DelayDisableAdminAccess", timeoutSelect[timeoutSelect.selectedIndex].value)
                        .done(() => {
                            retailDemoShared.SetupPageSuccessNavigation(rdamJson ? rdamJson.RetailerAccessCodes[0].AdminPassword : null, navFlow, bridge);
                        });
                    } else {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CustomPasswordSelected");
                        bridge.invoke("RetailDemo.Internal.RetailInfoSetter.setDWORDAsync", "DelayDisableAdminAccess", 4294967295) // max dword
                        .done(() => {
                            retailDemoShared.SetupPageSuccessNavigation(passwordInput.value, navFlow, bridge);
                        });
                    }
                }
            });

            // Call to register EaseOfAccess and InputSwitcher controls
            uiHelpers.RegisterEaseOfAccess(easeOfAccess, bridge);
            uiHelpers.RegisterInputSwitcher(inputSwitcher, bridge);

            // If the disable admin account feature is not enabled, do not show this page.
            if (!CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_DisableAdminAccount")) {
                retailDemoShared.SetupPageSuccessNavigation(null, navFlow, bridge);
            } else {
                bridge.fireEvent(CloudExperienceHost.Events.visible, true);
            }

            // Show an error message under the RAC input
            function showPasswordError(message) {
                if (passwordError.firstChild) {
                    passwordError.removeChild(passwordError.firstChild);
                }
                passwordErrorExists = true;
                passwordError.classList.add("inputState_error");
                let text = document.createElement("p");
                text.textContent = message;
                text.setAttribute("aria-hidden", "true");
                let tooltip = document.createElement("div");
                tooltip.className = "errorDialog-dialogRoot template-tooltip tooltipType_error";
                tooltip.appendChild(text);

                passwordError.appendChild(tooltip);
                passwordError.setAttribute("aria-label", message);
                passwordError.style.display = 'inline';
            }

            // Enable all text entry fields and the next button
            function allowUserToContinue() {
                nextButton.classList.add("button_primary");
                blockNext = false;
            }

            function preventContinue() {
                nextButton.classList.remove("button_primary");
                blockNext = true;
            }

            function passwordCheck() {
                if (passwordErrorExists) {
                    passwordError.style.display = 'none';
                    passwordError.setAttribute("aria-label", null);
                    passwordError.classList.remove("inputState_error");
                    if (passwordError.firstChild) {
                        passwordError.removeChild(passwordError.firstChild);
                    }
                    passwordErrorExists = false;
                }

                // Check if the passwords match
                if ((passwordInput.value != passwordInputCheck.value) || (passwordInput.value.length == 0)) {
                    preventContinue();
                    showPasswordError(resources.passwordError);
                } else {
                    if (blockNext) {
                        allowUserToContinue();
                    }
                }
            }

            function onPointerDownHandler(ev) {
                if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBE_Narrator_ScanMode_Activation_Accessibility")) {
                    ev.stopImmediatePropagation();
                }
            }
        }
    });
})();
