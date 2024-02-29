//
// Copyright (C) Microsoft. All rights reserved.
//
(function () {
    "use strict";
    let localAccountResources = {};
    let bridge = new CloudExperienceHost.Bridge();
    let validator = new uiHelpers.Validator();
    let errorClass = new uiHelpers.ErrorUI();
    WinJS.UI.Pages.define("/views/sqsaLocalAccount.html", {
        init: function (element, options) {
            let languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _htmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            let dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _htmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            let stringPromise = bridge.invoke("CloudExperienceHost.LocalAccount.localizedStringsSetupSQSA").then(function (result) {
                localAccountResources = JSON.parse(result);
            });
            let cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            return WinJS.Promise.join({ languagePromise, dirPromise, stringPromise, cssPromise });
        },
        ready: function (element, options) {
            // Dynamically adding textContent to following elements
            let setContentFor = [UpdateSQSATitle, SQSALegend, FinishButton, CancelButton];
            for (let i = 0; i < setContentFor.length; i++) {
                setContentFor[i].textContent = localAccountResources[setContentFor[i].id];
            }
            // Dynamically setting attributes for security answer input boxes
            let answerInputBoxes = [securityAnswer1, securityAnswer2, securityAnswer3];
            let answerPlaceholderValue = Array(3).fill('SecurityAnswerPlaceholder');
            for (let i = 0; i < answerInputBoxes.length; i++) {
                answerInputBoxes[i].setAttribute('placeholder', localAccountResources[answerPlaceholderValue[i]]);
            }
            // Dynamically adding security question selection placeholder
            let securityQuestionDropdown = [securityQuestion1, securityQuestion2, securityQuestion3];
            let questionPlaceholderValue = ['SecurityQuestion1Placeholder', 'SecurityQuestion2Placeholder', 'SecurityQuestion3Placeholder'];
            const NUM_SECURITY_QUESTIONS = 6;
            for (let i = 0; i < securityQuestionDropdown.length; i++) {
                let currDropdown = securityQuestionDropdown[i];
                currDropdown.options[0] = new Option(localAccountResources[questionPlaceholderValue[i]], '', true, true);
                // Add label to question dropdown and corresponding answer input box
                answerInputBoxes[i].setAttribute('aria-label', localAccountResources[questionPlaceholderValue[i]]);
                currDropdown.setAttribute('aria-label', localAccountResources[questionPlaceholderValue[i]]);
                // Fill security question dropdown with questions
                for (let j = 1; j <= NUM_SECURITY_QUESTIONS; j++) {
                    let question = localAccountResources['SecurityQuestion' + j];
                    currDropdown.options[j] = new Option(question, question);
                    currDropdown.options[j].title = question;
                }
            }
            // Call _onFinish() on FinishButton click
            FinishButton.addEventListener("click", function (event) {
                event.preventDefault();
                _onFinish.apply(this);
            }.bind(this));
            // Update textContent and accesskey for Finish and Cancel Button
            let checkAmersandFor = [FinishButton, CancelButton];
            checkAmersandFor.forEach(function (eachElement) {
                let result = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(localAccountResources[eachElement.id]);
                eachElement.textContent = result.content;
                eachElement.accessKey = result.accessKey;
            });
            // Calling bridge to go cancel
            CancelButton.addEventListener("click", function (event) {
                event.preventDefault();
                _onCancel.apply(this);
            });
            // Add Event handlers and Validation checks for security question dropdowns
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
                    let errorCode = validator.validateSecurityQuestionSelection(null, questionDropdown, questionNumber);
                    _checkErrorCodeAndShowError(this, errorCode);
                }.bind(this, currSecurityQuestionDropdown, i));
                // Remove error-message(if any) on valid Security question 'i'
                currSecurityQuestionDropdown.addEventListener("change", function (securityErrorDialog, questionNumber) {
                    let errorCode = validator.validateSecurityQuestionSelection(null, this, questionNumber);
                    _checkErrorCodeAndHideError(this, errorCode, securityErrorDialog);
                }.bind(currSecurityQuestionDropdown, securityQuestionErrorDialog[i], i));
            }
            //Add Validation checks for security answer inputs
            let securityAnswerInput = [securityAnswer1, securityAnswer2, securityAnswer3];
            let securityAnswerErrorDialog = [securityAnswer1_errorDialog, securityAnswer2_errorDialog, securityAnswer3_errorDialog];
            for (let i = 0; i < securityAnswerInput.length; i++) {
                let currSecurityAnswerInput = securityAnswerInput[i];
                // Validate Security Answer 'i' input field onBlur event
                currSecurityAnswerInput.addEventListener("blur", function (inputField, answerNumber) {
                    let errorCode = validator.validateSecurityAnswer(null, inputField, answerNumber);
                    _checkErrorCodeAndShowError(this, errorCode);
                }.bind(this, currSecurityAnswerInput, i));
                // Remove error-message(if any) on valid Security Answer 'i'
                currSecurityAnswerInput.addEventListener("keyup", function (securityErrorDialog, answerNumber) {
                    let errorCode = validator.validateSecurityAnswer(null, this, answerNumber);
                    _checkErrorCodeAndHideError(this, errorCode, securityErrorDialog);
                }.bind(currSecurityAnswerInput, securityAnswerErrorDialog[i], i));
            }

            // Call to register EaseOfAccess and InputSwitcher controls
            uiHelpers.RegisterEaseOfAccess(easeOfAccess, bridge);
            uiHelpers.RegisterInputSwitcher(inputSwitcher, bridge);

            bridge.fireEvent(CloudExperienceHost.Events.visible, true);

            // Validate user credentials before loading page
            bridge.invoke("CloudExperienceHost.LocalAccount.verifyLocalAccountCredentials").done(function (credsValidated) {
                if (!credsValidated) {
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.abort);
                } else {
                    securityQuestion1.focus();
                }
            }, function (e) {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
            });
            // Helper function to Validate inputs and invoke the API CreateLocalAccount
            function _onFinish() {
                _setProgressState(true);
                // Validate all user inputs
                let inputErrors = validator.validateSQSA(null, [securityQuestion1, securityQuestion2, securityQuestion3],
                    [securityAnswer1, securityAnswer2, securityAnswer3]);
                if (inputErrors.length === 0) {
                    let recoveryData = _serializeQuestions(); // unable to directly call serialize() on fieldset
                    // Invoke update API via bridge
                    bridge.invoke("CloudExperienceHost.LocalAccount.updateSQSA", recoveryData).done(function () {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SQSAUpdateSucessful");
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    }, function (e) {
                        this._showError(this._getErrorCode(e.number), true /* setFocus */);
                        _setProgressState(false);
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SQSAUpdateFailure", JSON.stringify({ errorNumber: e.number.toString(16), errorStack: e.asyncOpSource.stack }));
                    }.bind(this));
                }
                else {
                    _setProgressState(false);
                    for (let i = 0; i < inputErrors.length; i++) {
                        this._showError(inputErrors[i], (i === 0) /* setFocus */);
                    }
                }
            }
            // Helper function to cancel update for security questions
            function _onCancel() {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UpdateSecurityQuestions_Cancelled");
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.cancel);
            }
            // Helper function to enable/disable user input interaction based on bool parameter
            function _setProgressState(waiting) {
                FinishButton.disabled = waiting;
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
            // Note:The _showError() displays error on the var inputField.
            let resourceId = null;
            let inputField = null;
            switch (errorCode) {
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
                case ErrorCodes.Error_Creating_Account_Warning:
                    resourceId = 'Error_Creating_Account_Warning';
                    inputField = securityAnswer3;
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
