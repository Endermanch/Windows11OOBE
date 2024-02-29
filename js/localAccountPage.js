//
// Copyright (C) Microsoft. All rights reserved.
//
(function () {
    "use strict";
    var localAccountResources = {};
    var bridge = new CloudExperienceHost.Bridge();
    var validator = new uiHelpers.Validator();
    var errorClass = new uiHelpers.ErrorUI();
    var isSQSAAllowed = true;
    WinJS.UI.Pages.define("/views/localAccount.html", {
        init: function (element, options) {
            var languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _htmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            var dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _htmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            var stringPromise = bridge.invoke("CloudExperienceHost.LocalAccount.localizedStrings").then(function (result) {
                localAccountResources = JSON.parse(result);
            });
            var sqsaEnabledPromise = bridge.invoke("CloudExperienceHost.LocalAccount.isSQSAAllowed").then(function (isEnabled) {
                isSQSAAllowed = isEnabled;
            });
            var cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            return WinJS.Promise.join({ languagePromise: languagePromise, dirPromise: dirPromise, stringPromise: stringPromise, cssPromise: cssPromise, sqsaEnabledPromise: sqsaEnabledPromise });
        },
        ready: function (element, options) {
            // Dynamically adding maxlength(LM20_UNLEN   20) for userName
            userName.setAttribute('maxLength', '20');
            // Dynamically adding innerHTML to following elements
            let setContentFor = [Title, LeadText1, LeadText, UserNameLegend, PasswordLegend, SQSALegend, NextButton, BackButton];
            for (let i = 0; i < setContentFor.length; i++) {
                setContentFor[i].innerHTML = localAccountResources[setContentFor[i].id];
            }
            // Dynamically set placeholder and aria-label attributes for the following elements
            let placeholderKey = [userName, password, passwordValidate, passwordHint, securityAnswer1, securityAnswer2, securityAnswer3];
            let placeholderValue = ['UserPlaceholder', 'PasswordPlaceholder', 'ReenterPlaceholder', 'HintPlaceholder',
                            'SecurityAnswerPlaceholder', 'SecurityAnswerPlaceholder', 'SecurityAnswerPlaceholder'];
            for (let i = 0; i < placeholderKey.length; i++) {
                placeholderKey[i].setAttribute('placeholder', localAccountResources[placeholderValue[i]]);
                placeholderKey[i].setAttribute('aria-label', localAccountResources[placeholderValue[i]]);
            }
            // Dynamically adding security question selection placeholder
            let securityQuestionDropdown = [securityQuestion1, securityQuestion2, securityQuestion3];
            let questionPlaceholderValue = ['SecurityQuestion1Placeholder', 'SecurityQuestion2Placeholder', 'SecurityQuestion3Placeholder'];
            const NUM_SECURITY_QUESTIONS = 6;
            for (let i = 0; i < securityQuestionDropdown.length; i++) {
                let currDropdown = securityQuestionDropdown[i];
                currDropdown.options[0] = new Option(localAccountResources[questionPlaceholderValue[i]], '', true, true);
                // Fill security question dropdown with questions
                for (let j = 1; j <= NUM_SECURITY_QUESTIONS; j++) {
                    let question = localAccountResources['SecurityQuestion' + j];
                    currDropdown.options[j] = new Option(question, question);
                    currDropdown.options[j].title = question;
                }
            }
            // Hide SQSA on load (hidden until password input is detected)
            SQSAFieldset.style.display = 'none';
            // Call _onNext() on NextButton click
            NextButton.addEventListener("click", function (event) {
                event.preventDefault();
                _onNext.apply(this);
            }.bind(this));
            // Update textContent and accesskey for Next and Back Button
            let checkAmersandFor = [NextButton, BackButton];
            checkAmersandFor.forEach(function (eachElement) {
                let result = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(localAccountResources[eachElement.id]);
                eachElement.textContent = result.content;
                eachElement.accessKey = result.accessKey;
            });
            // depending on whether we are online or not, hide the back button
            bridge.invoke("CloudExperienceHost.Environment.hasInternetAccess").done(function (isConnectedToNetwork) {
                if (!isConnectedToNetwork) {
                    BackButton.style.display = "none";
                }
            });
            // If we launched into this scenario directly, hide the back button
            bridge.invoke("CloudExperienceHost.getContext").done(function (context) {
                if (context.host.toLowerCase() === "setaddlocalonly") {
                    BackButton.style.display = "none";
                }
            });
            // Calling bridge to go back
            BackButton.addEventListener("click", function () {
                bridge.fireEvent(CloudExperienceHost.Events.goBack);
            });
            // Validate userName input field onBlur event
            userName.addEventListener("blur", function () {
                let errorCode = validator.validateUsername(userName);
                _checkErrorCodeAndShowError(this, errorCode);
            }.bind(this));
            // Remove error-message (if any) on valid username
            userName.addEventListener("keyup", function () {
                let errorCode = validator.validateUsername(userName);
                _checkErrorCodeAndHideError(userName, errorCode, userName_errorDialog);
            });
            // Precheck password/passwordValidate on password onBlur event
            password.addEventListener("blur", function () {
                // This event is to handle case when user changes password field after passwordValidate field with wrong value or none,
                // But the first time user enters password and passwordValidate field is empty don't throw error
                if ((passwordValidate.value.length >= 1) || (password.value.length === 0)) {
                    let errorCode = validator.preCheckPassword(password, passwordValidate);
                    _checkErrorCodeAndShowError(this, errorCode);
                }
                SQSAFieldset.style.display = (password.value.length === 0) ? 'none' : '';
            }.bind(this));
            // Remove error-messages (if any) on valid password and hide/show SQSA if password is set
            password.addEventListener("keyup", function () {
                _hideErrorDialogsOnValidPassword();
                SQSAFieldset.style.display = (password.value.length === 0) ? 'none' : '';
            });
            // Precheck password/passwordValidate on passwordValidate onBlur event
            passwordValidate.addEventListener("blur", function () {
                let errorCode = validator.preCheckPassword(password, passwordValidate);
                _checkErrorCodeAndShowError(this, errorCode);
            }.bind(this));
            // Remove error-messages (if any) on valid passwordValidate
            passwordValidate.addEventListener("keyup", _hideErrorDialogsOnValidPassword);
            // Validate Hint input field onBlur event
            passwordHint.addEventListener("blur", function () {
                let errorCode = validator.validateHint(password, passwordHint);
                _checkErrorCodeAndShowError(this, errorCode);
            }.bind(this));
            // Remove error-message (if any) on valid passwordHint
            passwordHint.addEventListener("keyup", function () {
                let errorCode = validator.validateHint(password, passwordHint);
                _checkErrorCodeAndHideError(passwordHint, errorCode, passwordHint_errorDialog);
            });
            // Add Validation checks for security question dropdowns
            let securityQuestionErrorDialog = [securityQuestion1_errorDialog, securityQuestion2_errorDialog, securityQuestion3_errorDialog];
            for (let i = 0; i < securityQuestionDropdown.length; i++) {
                let currSecurityQuestionDropdown = securityQuestionDropdown[i];
                // Disable security questions that have been chosen in another dropdown
                let otherDropdowns = securityQuestionDropdown.slice();
                otherDropdowns.splice(i, 1);
                currSecurityQuestionDropdown.addEventListener('focus', function (otherDropdowns) {
                    for (let j = 0; j < this.options.length; j++) {
                        this.options[j].disabled = false;
                    }
                    otherDropdowns.filter(item => item.selectedIndex !== 0)
                        .forEach(item => this.options[item.selectedIndex].disabled = true);
                }.bind(currSecurityQuestionDropdown, otherDropdowns));
                // Validate Security Question 'i' selection onBlur event
                currSecurityQuestionDropdown.addEventListener("blur", function (questionDropdown, questionNumber) {
                    let errorCode = validator.validateSecurityQuestionSelection(password, questionDropdown, questionNumber);
                    _checkErrorCodeAndShowError(this, errorCode);
                }.bind(this, currSecurityQuestionDropdown, i));
                // Remove error-message (if any) on valid Security question 'i'
                currSecurityQuestionDropdown.addEventListener("change", function (securityErrorDialog, questionNumber) {
                    let errorCode = validator.validateSecurityQuestionSelection(password, this, questionNumber);
                    _checkErrorCodeAndHideError(this, errorCode, securityErrorDialog);
                }.bind(currSecurityQuestionDropdown, securityQuestionErrorDialog[i], i));
            }
            // Add Validation checks for security answer inputs
            let securityAnswerInput = [securityAnswer1, securityAnswer2, securityAnswer3];
            let securityAnswerErrorDialog = [securityAnswer1_errorDialog, securityAnswer2_errorDialog, securityAnswer3_errorDialog];
            for (let i = 0; i < securityAnswerInput.length; i++) {
                let currSecurityAnswerInput = securityAnswerInput[i];
                // Validate Security Answer 'i' input field onBlur event
                currSecurityAnswerInput.addEventListener("blur", function (inputField, answerNumber) {
                    let errorCode = validator.validateSecurityAnswer(password, inputField, answerNumber);
                    _checkErrorCodeAndShowError(this, errorCode);
                }.bind(this, currSecurityAnswerInput, i));
                // Remove error-message (if any) on valid Security Answer 'i'
                currSecurityAnswerInput.addEventListener("keyup", function (securityErrorDialog, answerNumber) {
                    let errorCode = validator.validateSecurityAnswer(password, this, answerNumber);
                    _checkErrorCodeAndHideError(this, errorCode, securityErrorDialog);
                }.bind(currSecurityAnswerInput, securityAnswerErrorDialog[i], i));
            }
            // Display UI for security questions or hint feature depending on velocity
            if (isSQSAAllowed) {
                passwordHint_input.style.display = 'none';
            } else {
                SQSA_input.style.display = 'none';
                SQSALegend.style.display = 'none';
            }
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountCreationStart",
                JSON.stringify({
                    "recoveryKind": isSQSAAllowed ? "Security Questions" : "Hint",
                    "enrollingFrom": "Settings"
                }));

            // Call to register EaseOfAccess and InputSwitcher controls
            uiHelpers.RegisterEaseOfAccess(easeOfAccess, bridge);
            uiHelpers.RegisterInputSwitcher(inputSwitcher, bridge);

            bridge.fireEvent(CloudExperienceHost.Events.visible, true);

            // Helper function to Validate inputs and invoke the API CreateLocalAccount
            function _onNext() {
                _setProgressState(true);
                // Validate all user inputs
                let inputErrors = [];
                let validInput = false;
                let recoveryData = passwordHint.value;
                let recoveryKind = "hint";
                if (isSQSAAllowed) {
                    inputErrors = validator.validateAllList(userName, password, passwordValidate, [securityQuestion1, securityQuestion2, securityQuestion3],
                        [securityAnswer1, securityAnswer2, securityAnswer3]);
                    if (inputErrors.length === 0) {
                        validInput = true;
                        if (password.value.length > 0) { // no questions if there's no password
                            recoveryData = _serializeQuestions(); // unable to directly call serialize() on fieldset
                            recoveryKind = "Security Questions";
                        }
                    }
                } else {
                    var result = validator.validateAll(userName, password, passwordValidate, passwordHint);
                    if (result === ErrorCodes.SUCCESS) {
                        validInput = true;
                    } else {
                        inputErrors = [result];
                    }
                }
                if (validInput) {
                    // Invoke CreateLocalAccount API via bridge
                    bridge.invoke("CloudExperienceHost.LocalAccount.createLocalAccount", userName.value.trim(), password.value, recoveryData).done(function () {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountCreationSuccess",
                            JSON.stringify({
                                "passwordUsed": (password.value.length > 0) ? "Password" : "NoPassword",
                                "recoveryKind": recoveryKind,
                                "enrolledFrom": "Settings"
                            }));
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    }, function (e) {
                        _setProgressState(false);
                        this._showError(this._getErrorCode(e.number), true /* setFocus */);
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountCreationFailure", JSON.stringify({ errorNumber: e.number.toString(16), errorStack: e.asyncOpSource.stack }));
                    }.bind(this));
                }
                else {
                    for (let i = 0; i < inputErrors.length; i++) {
                        this._showError(inputErrors[i], (i === 0) /* setFocus */);
                    }
                    _setProgressState(false);
                }
            }

            // Helper function to set progress state based on bool parameter
            function _setProgressState(waiting) {
                NextButton.disabled = waiting;
                uiHelpers.SetElementVisibility(progressRing, waiting);
                userName.disabled = waiting;
                password.disabled = waiting;
                passwordValidate.disabled = waiting;
                passwordHint.disabled = waiting;
                securityQuestion1.disabled = waiting;
                securityAnswer1.disabled = waiting;
                securityQuestion2.disabled = waiting;
                securityAnswer2.disabled = waiting;
                securityQuestion3.disabled = waiting;
                securityAnswer3.disabled = waiting;
            }

            // Helper function to serialize SQSA into JSON
            function _serializeQuestions() {
                let questions = [];
                let securityQuestions = [securityQuestion1, securityQuestion2, securityQuestion3];
                let securityAnswers = [securityAnswer1, securityAnswer2, securityAnswer3];
                for (let i = 0; i < securityQuestions.length; i++) {
                    questions.push({ 'question': securityQuestions[i].value, 'answer': securityAnswers[i].value });
                }
                return JSON.stringify({ version: 1.0, questions: questions });
            }

            // Helper function to hide all error dialogs for a valid password.
            function _hideErrorDialogsOnValidPassword() {
                if (validator.preCheckPassword(password, passwordValidate) === ErrorCodes.SUCCESS) {
                    errorClass.HideError(passwordValidate, passwordValidate_errorDialog);
                }
                // Security questions are not required if there is no password input for local account.
                if (password.value.length === 0) {
                    let securityInputs = [securityQuestion1, securityQuestion2, securityQuestion3,
                        securityAnswer1, securityAnswer2, securityAnswer3];
                    securityInputs.forEach(input => {
                        errorClass.HideError(input, document.getElementById(input.id + '_errorDialog'));
                    });
                }
            }

            function _checkErrorCodeAndShowError(thisArg, validatorErrorCode) {
                if (validatorErrorCode !== ErrorCodes.SUCCESS) {
                    thisArg._showError(validatorErrorCode, false /* setFocus */);
                }
            }

            function _checkErrorCodeAndHideError(inputField, validatorErrorCode, errorDialog) {
                if (validatorErrorCode === ErrorCodes.SUCCESS) {
                    errorClass.HideError(inputField, errorDialog);
                }
            }
        },
        error: function (e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountPageError", JSON.stringify({ number: e && e.number, stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
        },
        // Helper function to resolve e.number to ErrorCodes
        _getErrorCode: function (errorNumber) {
            let errorCode = uiHelpers.GetErrorCodeFromError(errorNumber);
            return errorCode;
        },
        // Helper function to resolve and display errors
        // Set focus on inputField if shouldSetFocus is true
        _showError: function (errorCode, setFocus) {
            // Note:The _showError() displays error on the var inputField. password field 
            // does not have an error div to display error, passwordValidate field has.
            // If you want to show error below password please update the HTML first.
            let resourceId = null;
            let inputField = null;
            switch (errorCode) {
                case ErrorCodes.PasswordPlaceholder:
                    resourceId = 'PasswordPlaceholder';
                    inputField = passwordValidate;
                    break;
                case ErrorCodes.ReenterPlaceholder:
                    resourceId = 'ReenterPlaceholder';
                    inputField = passwordValidate;
                    break;
                case ErrorCodes.HintPlaceholder:
                    resourceId = 'HintPlaceholder';
                    inputField = passwordHint;
                    break;
                case ErrorCodes.SecurityQuestion1_Error:
                    resourceId = 'SQSA_Error';
                    inputField = securityQuestion1;
                    break;
                case ErrorCodes.SecurityQuestion2_Error:
                    resourceId = 'SQSA_Error';
                    inputField = securityQuestion2;
                    break;
                case ErrorCodes.SecurityQuestion3_Error:
                    resourceId = 'SQSA_Error';
                    inputField = securityQuestion3;
                    break;
                case ErrorCodes.SecurityAnswer1_Error:
                    resourceId = 'SQSA_Error';
                    inputField = securityAnswer1;
                    break;
                case ErrorCodes.SecurityAnswer2_Error:
                    resourceId = 'SQSA_Error';
                    inputField = securityAnswer2;
                    break;
                case ErrorCodes.SecurityAnswer3_Error:
                    resourceId = 'SQSA_Error';
                    inputField = securityAnswer3;
                    break;
                case ErrorCodes.UserEmpty_Error_Title:
                    resourceId = 'UserEmpty_Error_Title';
                    inputField = userName;
                    break;
                case ErrorCodes.LocalUser_NoUsername_Error:
                    resourceId = 'LocalUser_NoUsername_Error';
                    inputField = userName;
                    break;
                case ErrorCodes.Username_Too_Long:
                    resourceId = 'Username_Too_Long';
                    inputField = userName;
                    break;
                case ErrorCodes.Username_Error:
                    resourceId = 'Username_Error';
                    inputField = userName;
                    break;
                case ErrorCodes.UsernameContainsAt_Error:
                    resourceId = 'UsernameContainsAt_Error';
                    inputField = userName;
                    break;
                case ErrorCodes.UserExists_Error:
                    resourceId = 'UserExists_Error';
                    inputField = userName;
                    break;
                case ErrorCodes.UserReserved_Error:
                    resourceId = 'UserReserved_Error';
                    inputField = userName;
                    break;
                case ErrorCodes.UserIsComputer_Error_Title:
                    resourceId = 'UserIsComputer_Error_Title';
                    inputField = userName;
                    break;
                case ErrorCodes.PasswordHint_Empty_Error:
                    resourceId = 'PasswordHint_Empty_Error';
                    inputField = passwordHint;
                    break;
                case ErrorCodes.PasswordHint_Invalid_Error:
                    resourceId = 'PasswordHint_Invalid_Error';
                    inputField = passwordHint;
                    break;
                case ErrorCodes.PasswordConfirm_Error:
                    resourceId = 'PasswordConfirm_Error';
                    inputField = passwordValidate;
                    break;
                case ErrorCodes.PasswordPolicy_Error:
                    resourceId = 'PasswordPolicy_Error';
                    inputField = passwordValidate;
                    break;
                case ErrorCodes.Error_Creating_Account_Warning:
                    resourceId = 'Error_Creating_Account_Warning';
                    inputField = passwordHint;
                    if (isSQSAAllowed) {
                        inputField = securityAnswer3;
                    }
                    break;
                default:
                    break;
            }
            if (resourceId && inputField) {
                errorClass.ShowError(inputField, document.getElementById(inputField.id + '_errorDialog'), localAccountResources[resourceId]);
                if (setFocus) {
                    inputField.focus();
                }
            }
        },
    });
})();
