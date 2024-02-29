
(function () {
    "use strict";
    var hololensAccountResources = {};
    var bridge = new CloudExperienceHost.Bridge();
    var validator = new uiHelpers.Validator();
    var errorClass = new uiHelpers.ErrorUI();
    var creationError = 0;

    WinJS.UI.Pages.define("/views/hololensWorkAccount.html", {
        init: function (element, options) {
            var languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _htmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            var dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _htmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            var stringPromise = bridge.invoke("CloudExperienceHost.HoloLensAccount.localizedStrings").then(function (result) {
                hololensAccountResources = JSON.parse(result);
            });
            bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "hlwa_error").done(function (result) { 
                if (!result) { 
                    creationError = 0;
                    
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "hlwa_upn", 0);
                }
                else {
                    creationError = result;
                }
            }, function (e) {
                creationError = 1;
            });
            var cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            return WinJS.Promise.join({ languagePromise: languagePromise, dirPromise: dirPromise, stringPromise: stringPromise, cssPromise: cssPromise });
        },
        ready: function (element, options) {
            
            var setContentFor = [Title, LeadText, NextButton, BackButton];
            var i = 0;

            for (i = 0; i < setContentFor.length; i++) {
                setContentFor[i].textContent = hololensAccountResources[setContentFor[i].id];
            }
            
            var placeholderKey = [userName, password];
            var placeholderValue = ['UserPlaceholder', 'PasswordPlaceholder'];
            for (i = 0; i < placeholderKey.length; i++) {
                placeholderKey[i].setAttribute('placeholder', hololensAccountResources[placeholderValue[i]]);
            }
            if (creationError !== 0) {
                this._showError(this._getErrorCode(creationError), true);

                bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "hlwa_upn").done(function (result) {
                    userName.value = result;
                }.bind(this));

                NextButton.disabled = false;
            }
            
            NextButton.addEventListener("click", function (event) {
                event.preventDefault();
                _onNext.apply(this);
            }.bind(this));
            
            BackButton.addEventListener("click", function () {
                bridge.fireEvent(CloudExperienceHost.Events.goBack);
            });
            
            userName.addEventListener("blur", function () {
                var errorCode = validator.validateUpn(userName);
                if (errorCode !== ErrorCodes.SUCCESS) {
                    this._showError(errorCode, false );
                }
            }.bind(this));
            
            userName.addEventListener("keyup", function () {
                if (validator.validateUpn(userName) === ErrorCodes.SUCCESS) {
                    errorClass.HideError(userName, userName_errorDialog);
                }
            });
            
            function _onNext() {
                
                var result = validator.validateUpn(userName);
                if (result === ErrorCodes.SUCCESS) {
                    if (password.value.length === 0) { 
                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "hlwa_upn", userName.value.trim()).done(function (result) { 
                            _switchToPasswordPage();
                        });
                    }
                    else {
                        _setProgressState(true);
                        
                        bridge.invoke("CloudExperienceHost.HoloLensAccount.createWorkAccount", userName.value.trim(), password.value).then(function () { 
                            bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", "hlwa_error");                            
                        }).done(function () {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HoloLensWorkAccountCreationSuccess");
                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                        }, function (e) {
                            _setProgressState(false);
                            this._showError(this._getErrorCode(e.number), true);
                            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "hlwa_error", e.number).done(function (result) { 
                                bridge.fireEvent(CloudExperienceHosts.Events.done, CloudExperienceHost.AppResult.fail);
                            });
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HoloLensWorkAccountCreationFailure", JSON.stringify({ errorNumber: e.number.toString(16), errorStack: e && e.asyncOpSource && e.asyncOpSource.stack}));
                        }.bind(this));
                    }
                }
                else {
                    this._showError(result, true );
                }
            }

            function _showUsernamePage() {
                userName_input.style.display='block';
                password_input.style.display='none';
                userName.focus();
                BackButton.disabled = true;
            }

            function _switchToPasswordPage() {
                userName_input.style.display='none';
                password_input.style.display='block';
                LeadText.style.display='none';
                Title.textContent = hololensAccountResources['PasswordTitle'];
                password.focus();
                BackButton.disabled = false;
            }
            
            
            function _setProgressState(waiting) {
                BackButton.disabled = waiting;
                NextButton.disabled = waiting;
                uiHelpers.SetElementVisibility(progressRing, waiting);
                userName.disabled = waiting;
                password.disabled = waiting;
            }
            
            _showUsernamePage();
        },
        error: function (e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HoloLensWorkAccountPageError", JSON.stringify({ number: e && e.number, stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
        },
        
        _getErrorCode: function (errorNumber) {
            var errorCode = null;
            switch (errorNumber) {
                case -0x7ff8fadd:
                    errorCode = ErrorCodes.Username_Error;
                    break;
                case -0x7f5df1fe:
                    errorCode = ErrorCodes.UserExists_Error;
                    break;
                default:
                    errorCode = ' Error:' + errorNumber;
                    break;
            }
            return errorCode;
        },
        
        _showError: function (errorCode, setFocus) {
            
            var resourceId = null, inputField = null, errorDetail = null;
            switch (errorCode) {
                case ErrorCodes.Username_Error:
                    resourceId = 'Error_NoUsername';
                    inputField = userName;
                    break;
                case ErrorCodes.UsernameFormat_Error:
                    resourceId = 'Error_UsernameFormat';
                    inputField = userName;
                    break;
                case ErrorCodes.UserExists_Error:
                    resourceId = 'Error_UserExists';
                    inputField = password;
                    break;                    
                default:
                    resourceId = 'Error_Creating_Account_Warning';
                    errorDetail = errorCode;
                    inputField = password;
                    break;
            }
            if (resourceId && inputField) {
                errorClass.ShowError(inputField, document.getElementById(inputField.id + '_errorDialog'), hololensAccountResources[resourceId] + errorDetail);
                if (setFocus) {
                    inputField.focus();
                }
            }
        },
    });
})();
