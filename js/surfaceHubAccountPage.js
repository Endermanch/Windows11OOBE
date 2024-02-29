
(function () {
    "use strict";
    var surfaceHubAccountResources = {};
    var bridge = new CloudExperienceHost.Bridge();
    var validator = new uiHelpers.Validator();
    var errorClass = new uiHelpers.ErrorUI();
    WinJS.UI.Pages.define("/views/surfaceHubAccount.html", {
        init: function (element, options) {
            var languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _htmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            var dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _htmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            var stringPromise = bridge.invoke("CloudExperienceHost.SurfaceHubAccount.localizedStrings").then(function (result) {
                surfaceHubAccountResources = JSON.parse(result);
            });
            var cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            return WinJS.Promise.join({ languagePromise: languagePromise, dirPromise: dirPromise, stringPromise: stringPromise, cssPromise: cssPromise });
        },
        ready: function (element, options) {
            
            userName.setAttribute('maxLength', '20');
            
            var setContentFor = [Title, LeadText, UserNameLegend, PasswordLegend, NextButton, BackButton];
            var i = 0;
            for (i = 0; i < setContentFor.length; i++) {
                setContentFor[i].textContent = surfaceHubAccountResources[setContentFor[i].id];
            }
            
            var placeholderKey = [userName, password, passwordValidate];
            var placeholderValue = ['UserPlaceholder', 'PasswordPlaceholder', 'ReenterPlaceholder'];
            for (i = 0; i < placeholderKey.length; i++) {
                placeholderKey[i].setAttribute('placeholder', surfaceHubAccountResources[placeholderValue[i]]);
            }
            
            NextButton.addEventListener("click", function (event) {
                event.preventDefault();
                _onNext.apply(this);
            }.bind(this));
            
            var checkAmersandFor = [NextButton, BackButton];
            checkAmersandFor.forEach(function (eachElement) {
                var result = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(surfaceHubAccountResources[eachElement.id]);
                eachElement.textContent = result.content;
                eachElement.accessKey = result.accessKey;
            });
            
            bridge.invoke("CloudExperienceHost.Environment.hasInternetAccess").done(function (isConnectedToNetwork) {
                uiHelpers.SetElementVisibility(BackButton, isConnectedToNetwork);
            });
            
            BackButton.addEventListener("click", function () {
                bridge.fireEvent(CloudExperienceHost.Events.goBack);
            });
            
            userName.addEventListener("blur", function () {
                var errorCode = validator.validateUsername(userName);
                if (errorCode !== ErrorCodes.SUCCESS) {
                    this._showError(errorCode, false );
                }
            }.bind(this));
            
            userName.addEventListener("keyup", function () {
                if (validator.validateUsername(userName) === ErrorCodes.SUCCESS) {
                    errorClass.HideError(userName, userName_errorDialog);
                }
            });
            
            password.addEventListener("blur", function () {
                
                if ((passwordValidate.value.length >= 1) || (password.value.length === 0)) {
                    var errorCode = validator.preCheckPassword(password, passwordValidate);
                    if (errorCode !== ErrorCodes.SUCCESS) {
                        this._showError(errorCode, false );
                    }
                }
            }.bind(this));
            
            password.addEventListener("keyup", function () {
                if (validator.preCheckPassword(password, passwordValidate) === ErrorCodes.SUCCESS) {
                    errorClass.HideError(passwordValidate, passwordValidate_errorDialog);
                }
            });
            
            passwordValidate.addEventListener("blur", function () {
                var errorCode = validator.preCheckPassword(password, passwordValidate);
                if (errorCode !== ErrorCodes.SUCCESS) {
                    this._showError(errorCode, false );
                }
            }.bind(this));
            
            passwordValidate.addEventListener("keyup", function () {
                if (validator.preCheckPassword(password, passwordValidate) === ErrorCodes.SUCCESS) {
                    errorClass.HideError(passwordValidate, passwordValidate_errorDialog);
                }
            });
            
            uiHelpers.RegisterEaseOfAccess(easeOfAccess, bridge);
            uiHelpers.RegisterInputSwitcher(inputSwitcher, bridge);
            
            function _onNext() {
                _setProgressState(true);
                
                var result = validator.validateUsername(userName);
                if (result === ErrorCodes.SUCCESS) {
                    result = validator.preCheckPassword(password, passwordValidate);
                    if (result === ErrorCodes.SUCCESS && password.value.length < 4) {
                        result = ErrorCodes.PasswordEmpty_Error;
                    }
                }
                if (result === ErrorCodes.SUCCESS) {
                    
                    bridge.invoke("CloudExperienceHost.SurfaceHubAccount.createLocalAccount", userName.value.trim(), password.value).done(function () {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountCreationSuccess", (password.value.length > 0) ? "Password" : "NoPassword");
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    }, function (e) {
                        _setProgressState(false);
                        this._showError(this._getErrorCode(e.number), true );
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountCreationFailure", JSON.stringify({ errorNumber: e.number.toString(16), errorStack: e.asyncOpSource.stack }));
                    }.bind(this));
                }
                else {
                    _setProgressState(false);
                    this._showError(result, true );
                }
            }
            
            function _setProgressState(waiting) {
                NextButton.disabled = waiting;
                uiHelpers.SetElementVisibility(progressRing, waiting);
                userName.disabled = waiting;
                password.disabled = waiting;
                passwordValidate.disabled = waiting;
            }
        },
        error: function (e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", JSON.stringify({ number: e && e.number, stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
        },
        
        _getErrorCode: function (errorNumber) {
            var errorCode = null;
            switch (errorNumber) {
                case -0x7ff8fadd:
                    errorCode = ErrorCodes.Username_Error;
                    break;
                case -0x7ff8fadc:
                    errorCode = ErrorCodes.UserExists_Error;
                    break;
                case -0x7ff8fd46:
                    errorCode = ErrorCodes.UserReserved_Error;
                    break;
                case -0x7ff8ffcc:
                    errorCode = ErrorCodes.UserIsComputer_Error_Title;
                    break;
                case -0x7ff8fb78:
                    errorCode = ErrorCodes.UserEmpty_Error_Title;
                    break;
                case -0x7ff8fad1:
                    errorCode = ErrorCodes.UsernameContainsAt_Error;
                    break;
                case -0x7ff8fad3:
                    errorCode = ErrorCodes.PasswordPolicy_Error;
                    break;
                case -0x7ff8fad5:
                    errorCode = ErrorCodes.PasswordConfirm_Error;
                    break;
                default:
                    errorCode = ErrorCodes.Error_Creating_Account_Warning;
                    break;
            }
            return errorCode;
        },
        
        _showError: function (errorCode, setFocus) {
            
            var resourceId = null, inputField = null;
            switch (errorCode) {
                case ErrorCodes.PasswordPlaceholder:
                    resourceId = 'PasswordPlaceholder';
                    inputField = passwordValidate;
                    break;
                case ErrorCodes.ReenterPlaceholder:
                    resourceId = 'ReenterPlaceholder';
                    inputField = passwordValidate;
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
                case ErrorCodes.PasswordConfirm_Error:
                    resourceId = 'PasswordConfirm_Error';
                    inputField = passwordValidate;
                    break;
                case ErrorCodes.PasswordPolicy_Error:
                    resourceId = 'PasswordPolicy_Error';
                    inputField = passwordValidate;
                    break;
                case ErrorCodes.PasswordEmpty_Error:
                    resourceId = 'PasswordEmpty_Error';
                    inputField = passwordValidate;
                    break;
                case ErrorCodes.Error_Creating_Account_Warning:
                    resourceId = 'Error_Creating_Account_Warning';
                    inputField = passwordValidate;
                    break;
                default:
                    break;
            }
            if (resourceId && inputField) {
                errorClass.ShowError(inputField, document.getElementById(inputField.id + '_errorDialog'), surfaceHubAccountResources[resourceId]);
                if (setFocus) {
                    inputField.focus();
                }
            }
        },
    });
})();
