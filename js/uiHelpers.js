//
// Copyright (C) Microsoft. All rights reserved.
//
"use strict";
// This needs to be kept in sync with the same one in uiHelpers_ut.ts
var ErrorCodes;
(function (ErrorCodes) {
    ErrorCodes[ErrorCodes["SUCCESS"] = 1] = "SUCCESS";
    ErrorCodes[ErrorCodes["PasswordPlaceholder"] = 2] = "PasswordPlaceholder";
    ErrorCodes[ErrorCodes["ReenterPlaceholder"] = 3] = "ReenterPlaceholder";
    ErrorCodes[ErrorCodes["HintPlaceholder"] = 4] = "HintPlaceholder";
    ErrorCodes[ErrorCodes["SecurityQuestion1Placeholder"] = 5] = "SecurityQuestion1Placeholder";
    ErrorCodes[ErrorCodes["SecurityQuestion2Placeholder"] = 6] = "SecurityQuestion2Placeholder";
    ErrorCodes[ErrorCodes["SecurityQuestion3Placeholder"] = 7] = "SecurityQuestion3Placeholder";
    ErrorCodes[ErrorCodes["SecurityAnswerPlaceholder"] = 8] = "SecurityAnswerPlaceholder";
    ErrorCodes[ErrorCodes["LocalUser_NoUsername_Error"] = 9] = "LocalUser_NoUsername_Error";
    ErrorCodes[ErrorCodes["Username_Too_Long"] = 10] = "Username_Too_Long";
    ErrorCodes[ErrorCodes["UserEmpty_Error_Title"] = 11] = "UserEmpty_Error_Title";
    ErrorCodes[ErrorCodes["Username_Error"] = 12] = "Username_Error";
    ErrorCodes[ErrorCodes["UsernameContainsAt_Error"] = 13] = "UsernameContainsAt_Error";
    ErrorCodes[ErrorCodes["UserExists_Error"] = 14] = "UserExists_Error";
    ErrorCodes[ErrorCodes["UserReserved_Error"] = 15] = "UserReserved_Error";
    ErrorCodes[ErrorCodes["UserIsComputer_Error_Title"] = 16] = "UserIsComputer_Error_Title";
    ErrorCodes[ErrorCodes["PasswordHint_Empty_Error"] = 17] = "PasswordHint_Empty_Error";
    ErrorCodes[ErrorCodes["PasswordHint_Invalid_Error"] = 18] = "PasswordHint_Invalid_Error";
    ErrorCodes[ErrorCodes["PasswordConfirm_Error"] = 19] = "PasswordConfirm_Error";
    ErrorCodes[ErrorCodes["PasswordPolicy_Error"] = 20] = "PasswordPolicy_Error";
    ErrorCodes[ErrorCodes["SecurityQuestion1_Error"] = 21] = "SecurityQuestion1_Error";
    ErrorCodes[ErrorCodes["SecurityQuestion2_Error"] = 22] = "SecurityQuestion2_Error";
    ErrorCodes[ErrorCodes["SecurityQuestion3_Error"] = 23] = "SecurityQuestion3_Error";
    ErrorCodes[ErrorCodes["SecurityAnswer1_Error"] = 24] = "SecurityAnswer1_Error";
    ErrorCodes[ErrorCodes["SecurityAnswer2_Error"] = 25] = "SecurityAnswer2_Error";
    ErrorCodes[ErrorCodes["SecurityAnswer3_Error"] = 26] = "SecurityAnswer3_Error";
    ErrorCodes[ErrorCodes["Security_Error"] = 27] = "Security_Error";
    ErrorCodes[ErrorCodes["Error_Creating_Account_Warning"] = 28] = "Error_Creating_Account_Warning";
    ErrorCodes[ErrorCodes["PasswordEmpty_Error"] = 29] = "PasswordEmpty_Error";
    ErrorCodes[ErrorCodes["UsernameFormat_Error"] = 30] = "UsernameFormat_Error";
})(ErrorCodes || (ErrorCodes = {}));
var uiHelpers;
(function (uiHelpers) {
    class Validator {
        constructor() {
        }
        validateUsername(userName) {
            return this.validateUsernameString(userName.value, false /* validateWithLocalAccountManager */);
        }
        validateUsernameString(userName, validateWithLocalAccountManager) {
            if ((userName.length) < 1) {
                return ErrorCodes.LocalUser_NoUsername_Error;
            }
            else if (userName.length > 20) {
                return ErrorCodes.Username_Too_Long;
            }
            else if (userName.match(/^\s*$/)) {
                return ErrorCodes.UserEmpty_Error_Title;
            }
            else if (userName.indexOf('@') > -1) {
                return ErrorCodes.UsernameContainsAt_Error;
            }
            else if (userName.match(/^[.*]*[^\"\\\/\[\]\:\|\<\>\+\=\;\,\?\*\%]*$/) === null) {
                return ErrorCodes.Username_Error;
            }
            else if (userName.trim().lastIndexOf(".") === (userName.trim().length - 1)) {
                return ErrorCodes.Username_Error;
            }
            else if (validateWithLocalAccountManager) {
                let localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
                return GetErrorCodeFromError(localAccountManager.validateUsername(userName));
            }
            return ErrorCodes.SUCCESS;
        }
        preCheckPassword(password, passwordValidate) {
            var result = null;
            if (password.value === passwordValidate.value) {
                result = ErrorCodes.SUCCESS;
            }
            else if (password.value.length < 1) {
                result = ErrorCodes.PasswordPlaceholder;
            }
            else if (passwordValidate.value.length < 1) {
                result = ErrorCodes.ReenterPlaceholder;
            }
            else {
                result = ErrorCodes.PasswordConfirm_Error;
            }
            return result;
        }
        validateConfirmPasswordString(confirmPassword, password) {
            let result = ErrorCodes.SUCCESS;
            if (password !== confirmPassword) {
                result = ErrorCodes.PasswordConfirm_Error;
            }
            return result;
        }
        validateHint(password, passwordHint) {
            return this.validateHintString(passwordHint.value, password.value);
        }
        validateHintString(hint, password) {
            let result = ErrorCodes.SUCCESS;
            if (password.length > 0) {
                if (hint.length === 0) {
                    result = ErrorCodes.PasswordHint_Empty_Error;
                }
                else if (hint.indexOf(password) > -1) {
                    result = ErrorCodes.PasswordHint_Invalid_Error;
                }
            }
            return result;
        }
        validateSecurityQuestionSelection(password, securityQuestion, questionNumber) {
            return this.validateSecurityQuestionSelectionString((password ? password.value : null), securityQuestion.value, (questionNumber + 1));
        }
        validateSecurityQuestionSelectionString(password, securityQuestion, questionNumber) {
            let result = ErrorCodes.SUCCESS;
            // Only care about security question if we have a password
            if (((password === null) || (password.length > 0)) && !securityQuestion) {
                result = questionNumber ?
                    ErrorCodes["SecurityQuestion" + questionNumber + "_Error"] : ErrorCodes.Security_Error;
            }
            return result;
        }
        validateSecurityAnswer(password, securityAnswer, answerNumber) {
            return this.validateSecurityAnswerString((password ? password.value : null), securityAnswer.value, (answerNumber + 1));
        }
        validateSecurityAnswerString(password, securityAnswer, answerNumber) {
            let result = ErrorCodes.SUCCESS;
            // Only care about security answers if we have a password
            if (((password === null) || (password.length > 0)) && (securityAnswer.trim().length === 0)) {
                result = answerNumber ?
                    ErrorCodes["SecurityAnswer" + answerNumber + "_Error"] : ErrorCodes.Security_Error;
            }
            return result;
        }
        validateAll(userName, password, passwordValidate, passwordHint) {
            let result = this.validateUsername(userName);
            if (result === ErrorCodes.SUCCESS) {
                result = this.preCheckPassword(password, passwordValidate);
                if (result === ErrorCodes.SUCCESS) {
                    result = this.validateHint(password, passwordHint);
                }
            }
            return result;
        }
        validateSQSA(password, securityQuestions, securityAnswers) {
            let result = [];
            for (let i = 0; i < securityQuestions.length; i++) {
                let errorCode = this.validateSecurityQuestionSelection(password, securityQuestions[i], i);
                if (errorCode !== ErrorCodes.SUCCESS) {
                    result.push(errorCode);
                }
                errorCode = this.validateSecurityAnswer(password, securityAnswers[i], i);
                if (errorCode !== ErrorCodes.SUCCESS) {
                    result.push(errorCode);
                }
            }
            return result;
        }
        validateAllList(userName, password, passwordValidate, securityQuestions, securityAnswers) {
            let errorCode = this.validateUsername(userName);
            if (errorCode === ErrorCodes.SUCCESS) {
                errorCode = this.preCheckPassword(password, passwordValidate);
                if (errorCode === ErrorCodes.SUCCESS) {
                    return this.validateSQSA(password, securityQuestions, securityAnswers);
                }
            }
            return [errorCode];
        }
        validateUpn(upn) {
            var result = null;
            if ((upn.value.length) < 1) {
                result = ErrorCodes.LocalUser_NoUsername_Error;
            }
            else if (upn.value.indexOf('@') == -1) {
                result = ErrorCodes.UsernameFormat_Error;
            }
            else if (upn.value.lastIndexOf('@') >= upn.value.lastIndexOf('.')) {
                result = ErrorCodes.UsernameFormat_Error;
            }
            else if (upn.value.match(/^[.*]*[^\"\\\/\[\]\:\|\<\>\+\=\;\,\?\*\%]*$/) === null) {
                result = ErrorCodes.Username_Error;
            }
            else if (upn.value.trim().lastIndexOf(".") === (upn.value.trim().length - 1)) {
                result = ErrorCodes.Username_Error;
            }
            else {
                result = ErrorCodes.SUCCESS;
            }
            return result;
        }
    }
    uiHelpers.Validator = Validator;
    class ErrorUI {
        constructor() {
        }
        ShowError(inputField, errorDiv, error) {
            if (errorDiv.childNodes.length < 1) {
                inputField.classList.add('inputState_error');
                errorDiv.classList.add('template-tooltip');
                var errorParagraph = document.createElement('p');
                errorParagraph.setAttribute("aria-hidden", "true");
                errorDiv.appendChild(errorParagraph);
            }
            errorDiv.setAttribute("aria-label", error);
            errorDiv.firstChild.textContent = error;
            errorDiv.parentElement.style.display = 'inline';
        }
        HideError(inputField, errorDiv) {
            errorDiv.parentElement.style.display = 'none';
            // Update the label after hiding the element
            errorDiv.setAttribute("aria-label", null);
            if (errorDiv.childNodes.length > 0) {
                inputField.classList.remove('inputState_error');
                errorDiv.classList.remove('template-tooltip');
                while (errorDiv.firstChild) {
                    errorDiv.removeChild(errorDiv.firstChild);
                }
            }
        }
    }
    uiHelpers.ErrorUI = ErrorUI;
    function GetErrorCodeFromError(errorNumber) {
        switch (errorNumber) {
            case 0:
                return ErrorCodes.SUCCESS;
            case -0x7ff8fadd:
                return ErrorCodes.Username_Error;
            case -0x7ff8fadc:
                return ErrorCodes.UserExists_Error;
            case -0x7ff8fd46:
                return ErrorCodes.UserReserved_Error;
            case -0x7ff8ffcc:
                return ErrorCodes.UserIsComputer_Error_Title;
            case -0x7ff8fb78:
                return ErrorCodes.UserEmpty_Error_Title;
            case -0x7ff8fad1:
                return ErrorCodes.UsernameContainsAt_Error;
            case -0x7ff8fad3:
            case -0x2fffff94:
                return ErrorCodes.PasswordPolicy_Error;
            case -0x7ff8fad5:
                return ErrorCodes.PasswordConfirm_Error;
            case -0x7ff8df84:
                return ErrorCodes.PasswordHint_Empty_Error;
            default:
                return ErrorCodes.Error_Creating_Account_Warning;
        }
    }
    uiHelpers.GetErrorCodeFromError = GetErrorCodeFromError;
    function SetElementVisibility(container, shouldShow) {
        container.style.visibility = (shouldShow) ? 'inline' : 'hidden';
    }
    uiHelpers.SetElementVisibility = SetElementVisibility;
    function LoadCssPromise(head, appRoot, bridge) {
        return new WinJS.Promise(function (completeDispatch, errorDispatch) {
            bridge.invoke("CloudExperienceHost.getContext").done(function (context) {
                var cssList = CloudExperienceHost.GetCssList(appRoot, context);
                for (var i = 0; i < cssList.length; i++) {
                    CloudExperienceHost.AddCssToHead(head, cssList[i]);
                }
                completeDispatch();
            }, errorDispatch);
        });
    }
    uiHelpers.LoadCssPromise = LoadCssPromise;
    function LoadPersonalityCssPromise(head, appRoot, targetPersonality, bridge) {
        return new WinJS.Promise(function (completeDispatch, errorDispatch) {
            bridge.invoke("CloudExperienceHost.getContext").done(function (context) {
                context.personality = targetPersonality;
                var cssList = CloudExperienceHost.GetCssList(appRoot, context);
                for (var i = 0; i < cssList.length; i++) {
                    CloudExperienceHost.AddCssToHead(head, cssList[i]);
                }
                completeDispatch();
            }, errorDispatch);
        });
    }
    uiHelpers.LoadPersonalityCssPromise = LoadPersonalityCssPromise;
    function LangAndDirPromise(documentElement, bridge) {
        let langPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then((result) => {
            documentElement.lang = result;
        });
        let dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then((result) => {
            documentElement.dir = result;
        });
        return WinJS.Promise.join({ langPromise, dirPromise });
    }
    uiHelpers.LangAndDirPromise = LangAndDirPromise;
    function ReplaceHalfWidthCharsWithSpaces(name) {
        return name.replace(/[()]/g, ' ');
    }
    uiHelpers.ReplaceHalfWidthCharsWithSpaces = ReplaceHalfWidthCharsWithSpaces;
    function InvokeEaseOfAccess(element, bridge) {
        var rect = element.getBoundingClientRect();
        return bridge.invoke("CloudExperienceHost.showEaseOfAccessFlyout", new CloudExperienceHost.ShowEaseOfAccessArgs(rect));
    }
    uiHelpers.InvokeEaseOfAccess = InvokeEaseOfAccess;
    function InvokeInputSwitcher(element, bridge) {
        var rect = element.getBoundingClientRect();
        return bridge.invoke("CloudExperienceHost.showInputSwitchFlyout", rect.left, rect.top, rect.right, rect.bottom);
    }
    uiHelpers.InvokeInputSwitcher = InvokeInputSwitcher;
    function RegisterEaseOfAccess(easeOfAccessElement, bridge) {
        bridge.invoke("CloudExperienceHost.shouldShowEaseOfAccessControl").done(function (show) {
            SetElementVisibility(easeOfAccessElement, show);
        });
        bridge.invoke("CloudExperienceHost.Resources.getString", "oobecommon", "EaseOfAccessAccName").done(function (label) {
            easeOfAccessElement.setAttribute("aria-label", label);
            // Title is needed to display a tooltip
            easeOfAccessElement.setAttribute("title", label);
        });
        easeOfAccessElement.addEventListener("click", function () {
            // Calling bridge to bring up accessibility menu
            InvokeEaseOfAccess(easeOfAccessElement, bridge);
        });
    }
    uiHelpers.RegisterEaseOfAccess = RegisterEaseOfAccess;
    function RegisterInputSwitcher(inputSwitcherElement, bridge) {
        bridge.invoke("CloudExperienceHost.shouldShowInputSwitchButton").done(function (show) {
            SetElementVisibility(inputSwitcherElement, show);
        });
        bridge.invoke("CloudExperienceHost.Resources.getString", "oobecommon", "InputSwitchAccName").done(function (label) {
            inputSwitcherElement.setAttribute("aria-label", label);
            // Title is needed to display a tooltip
            inputSwitcherElement.setAttribute("title", label);
        });
        inputSwitcherElement.addEventListener("click", function () {
            // Calling bridge to bring up the input switcher menu
            InvokeInputSwitcher(inputSwitcherElement, bridge);
        });
    }
    uiHelpers.RegisterInputSwitcher = RegisterInputSwitcher;
    class PortableDeviceHelpers {
        constructor() {
        }
        static subscribeToDeviceInsertion(gestureManager, bridge, core) {
            try {
                gestureManager.startPortableDeviceWatcher();
            }
            catch (err) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "StartMediaWatcherFailed", core.GetJsonFromError(err));
            }
        }
        static unsubscribeToDeviceInsertion(gestureManager, bridge, core) {
            try {
                gestureManager.stopPortableDeviceWatcher();
            }
            catch (err) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "StopPortableDeviceWatcherFailed", core.GetJsonFromError(err));
            }
        }
    }
    uiHelpers.PortableDeviceHelpers = PortableDeviceHelpers;
})(uiHelpers || (uiHelpers = {}));
// Expose css function to be loaded by requirejs
if ((typeof define === "function") && define.amd) {
    define(['legacy/bridge', 'legacy/core'], function (bridge, core) {
        return {
            LoadCss: function (head) {
                bridge.invoke("CloudExperienceHost.getContext").done(function (context) {
                    var cssList = core.GetCssList("", context);
                    for (var i = 0; i < cssList.length; i++) {
                        core.AddCssToHead(head, cssList[i]);
                    }
                });
            },
            LoadCssPromise: uiHelpers.LoadCssPromise,
            LoadPersonalityCssPromise: uiHelpers.LoadPersonalityCssPromise,
            LangAndDirPromise: uiHelpers.LangAndDirPromise,
            ReplaceHalfWidthCharsWithSpaces: uiHelpers.ReplaceHalfWidthCharsWithSpaces
        };
    });
}
//# sourceMappingURL=uiHelpers.js.map