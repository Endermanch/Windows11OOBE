
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var UnifiedEnroll;
    (function (UnifiedEnroll) {
        var unifiedEnrollmentResources = {};
        var bridge = new CloudExperienceHost.Bridge();
        var validator = new uiHelpers.Validator();
        var errorClass = new uiHelpers.ErrorUI();
        var mdmError = 0;
        var isAllowed = true;
        var deeplink = false;
        var isUserNameError = false;
        var noEnrollmentError = "noError";
        var deepLinkUPN = "";
        var deepLinkServername = "";
        var mode = null;
        WinJS.UI.Pages.define("/webapps/unifiedEnrollment/views/unifiedEnrollment.html", {
            init: function (element, options) {
                var languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                    _htmlRoot.setAttribute("lang", preferredLang);
                }, function () { });
                var dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                    _htmlRoot.setAttribute("dir", dirVal);
                }, function () { });
                var stringPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.localizedStrings").then(function (result) {
                    unifiedEnrollmentResources = JSON.parse(result);
                });

                var queryStringPromise = this._parseQueryString();
                var dataSetupPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_error").then(function (result) {
                    if (!result) {
                        mdmError = 0;
                    }
                    else {
                        mdmError = result;
                    }
                    
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", 0);
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", noEnrollmentError);
                }, function (e) {
                    
                    mdmError = 1;
                });
                
                var isAllowedSetupPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isOfflineUxPageAllowed").then(function (result) {
                    isAllowed = result;
                }, function (e) {
                    isAllowed = false;
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_SLAPIFailure", JSON.stringify({ number: e && e.number.toString(16)}));
                });

                var cssPromise = uiHelpers.LoadCssPromise(document.head, "../../..", bridge);
                return WinJS.Promise.join({ languagePromise: languagePromise, dirPromise: dirPromise, stringPromise: stringPromise, cssPromise: cssPromise, queryStringPromise: queryStringPromise, dataSetupPromise: dataSetupPromise, isAllowedSetupPromise : isAllowedSetupPromise });
            },
            ready: function (element, options) {
                
                var setContentFor = [Title, LeadText, FooterHeader, DjLink, NextButton];
                setContentFor.forEach(function (content) {
                    content.textContent = unifiedEnrollmentResources[content.id];
                });
                
                var placeholderKey = [userName];
                var placeholderValue = ['UserPlaceholder'];
                var i = 0;
                for (i = 0; i < placeholderKey.length; i++) {
                    placeholderKey[i].setAttribute('placeholder', unifiedEnrollmentResources[placeholderValue[i]]);
                }
                userName.setAttribute('aria-label', unifiedEnrollmentResources['UserNarratorText']);

                if (mode && (mode.toLowerCase() === "awa" || mode.toLowerCase() === "aadj")) {
                    userName_input.style.display = 'none';
                    LeadText.textContent = unifiedEnrollmentResources["Error_Network"];
                } else {

                    
                    if (mdmError !== 0) {
                        if (mdmError !== 1) {
                            
                            this._showError(mdmError, false );
                        } else {
                            
                            this._showErrorCode(0, false);
                        }

                        
                        serverNameField.style.display = 'block';
                        serverName.setAttribute('placeholder', unifiedEnrollmentResources['ServerUrlPlaceholder']);
                        serverName.setAttribute('aria-label', unifiedEnrollmentResources['ServerUrlNarratorText']);
                    }

                    
                    if ((mdmError !== 0)) {
                        
                        bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_upn").done(function (result) {
                            if (result) {
                                userName.value = result;
                            }
                        }.bind(this));

                        
                        NextButton.disabled = false;

                        
                        bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_serverUrl").done(function (result) {
                            if (result) {
                                serverName.value = result;

                                serverNameField.style.display = 'block';
                                serverName.setAttribute('placeholder', unifiedEnrollmentResources['ServerUrlPlaceholder']);
                                serverName.setAttribute('aria-label', unifiedEnrollmentResources['ServerUrlNarratorText']);
                            }
                        }.bind(this));
                    } else if (deeplink === true) {
                        if (typeof deepLinkUPN !== "undefined") {
                            userName.value = deepLinkUPN;
                            NextButton.disabled = false;
                        }

                        if (typeof deepLinkServername !== "undefined") {
                            
                            var deepLinkServernameTrimmed = deepLinkServername.replace(/[\u200B-\u200D\uFEFF]/g, '');
                            if (deepLinkServernameTrimmed.length === deepLinkServername.length)
                            {
                                serverName.value = deepLinkServername;
                                serverNameField.style.display = 'block';
                                serverName.setAttribute('placeholder', unifiedEnrollmentResources['ServerUrlPlaceholder']);
                                serverName.setAttribute('aria-label', unifiedEnrollmentResources['ServerUrlNarratorText']);
                            }
                            else
                            {
                                serverNameField.style.display = 'block';
                                serverName.setAttribute('placeholder', unifiedEnrollmentResources['ServerUrlPlaceholder']);
                                serverName.setAttribute('aria-label', unifiedEnrollmentResources['ServerUrlNarratorText']);
                                this._showError(unifiedEnrollmentResources['Error_Servername'], true);
                            }
                        }
                    }
                    
                    NextButton.addEventListener("click", function (event) {
                        event.preventDefault();
                        this._onNext.apply(this);
                    }.bind(this));
                }
                
                var checkAmpersandFor = [NextButton];
                checkAmpersandFor.forEach(function (eachElement) {
                    var result = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources[eachElement.id]);
                    eachElement.textContent = result.content;
                    eachElement.accessKey = result.accessKey;
                });
                
                bridge.invoke("CloudExperienceHost.UnifiedEnroll.isDomainOperationSupported").done(function (isDomainOperationSupported) {
                    if (isDomainOperationSupported) {
                        var isDeviceCloudJoinedPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isDeviceCloudJoined");
                        var isDeviceAdJoinedPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isDeviceADJoined");
                        var isAdminPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isAdminUser");
                        var isDomainJoinPendingPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isDomainJoinPending");
                        var isDomainLeavePendingPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isDomainLeavePending");
                        
                        var getContextPromise = bridge.invoke("CloudExperienceHost.getContext");

                        WinJS.Promise.join({
                            isDeviceCloudJoined: isDeviceCloudJoinedPromise,
                            isDeviceAdJoined: isDeviceAdJoinedPromise,
                            isAdmin: isAdminPromise,
                            isDomainJoinPending: isDomainJoinPendingPromise,
                            isDomainLeavePending: isDomainLeavePendingPromise,
                            getContext: getContextPromise
                        }).done(function (result) {
                            if (result.isAdmin && !result.isDeviceCloudJoined && !result.isDeviceAdJoined && !result.isDomainJoinPending && !result.isDomainLeavePending && (result.getContext.host.toLowerCase() !== "mosetmdmconnecttowork")
                                && (result.getContext.host.toLowerCase() !== "mosetmamconnecttowork")) {
                                
                                document.getElementById("alternateActions").style.display = "block";
                                DjLink.addEventListener("click", function (event) {
                                    event.preventDefault();
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_LaunchDj");
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action3);
                                }.bind(this));
                            }
                        }, function (e) {
                            
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ShowDomainLinkPending_Failed", JSON.stringify({ isDomainJoinPending: e.isDomainJoinPending, isDomainLeavePending: e.isDomainLeavePending }));
                        });
                    }
                }, function (e) {
                    
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ShowDomainLinkSupported_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                });
                
                userName.addEventListener("blur", function () {
                    var errorCode = validator.validateUpn(userName);
                    if ((errorCode !== ErrorCodes.SUCCESS) && (errorCode !== ErrorCodes.LocalUser_NoUsername_Error)) {
                        isUserNameError = true;
                        this._showErrorCode(errorCode, false );
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_OnBlur_ValidateUpnFailed", JSON.stringify({ number: errorCode && errorCode.toString(16) }));
                    }
                }.bind(this));
                
                userName.addEventListener("keyup", function () {
                    if (validator.validateUpn(userName) === ErrorCodes.SUCCESS) {
                        NextButton.disabled = false;
                        if (isUserNameError === true) {
                            isUserNameError = false;
                            errorClass.HideError(userName, userName_errorDialog);
                        }
                    } else {
                        NextButton.disabled = true;
                    }
                });

                
                if (!isAllowed)
                {
                    this._setProgressState(true);
                    this._showError(unifiedEnrollmentResources['Error_Network'], true);
                }
                
                bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                userName.focus();
            },
            _onNext: function () {
                this._setProgressState(true);
                var result = validator.validateUpn(userName);
                if (result === ErrorCodes.SUCCESS) {
                    bridge.invoke("CloudExperienceHost.Environment.hasNetworkConnectivity").done(function (isConnectedToNetwork) {
                        if (isConnectedToNetwork) {
                            this._addMdm();
                        } else {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_OnNext_NoNetwork");
                            this._setProgressState(false);
                            this._showError(unifiedEnrollmentResources['Error_Network'], true);
                        }
                    }.bind(this), function (e) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_hasNetworkConnectivityError", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                        
                        this._addMdm();
                    }.bind(this));
                } else {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_OnNext_ValidateUpnFailed", JSON.stringify({ number: result && result.toString(16) }));
                    isUserNameError = true;
                    this._setProgressState(false);
                    this._showErrorCode(result, true );
                }
            },
            _parseNamedValues: function (queryString) {
                var nameValuePairs = {};
                var pos = queryString.indexOf("?");
                if (pos > -1) {
                    var terms = queryString.substring(pos + 1);
                    var splitTerms = terms.split("&");
                    splitTerms.forEach(function (term) {
                        var nameValuePair = term.split("=");
                        if (nameValuePair.length === 2) {
                            nameValuePairs[nameValuePair[0]] = nameValuePair[1];
                        }
                    });
                }
                return nameValuePairs;
            },
            _parseQueryString: function () {
                bridge.invoke("CloudExperienceHost.getContext").done(function (cloudExperienceHostContext) {
                    var queryTerms = this._parseNamedValues(decodeURIComponent(cloudExperienceHostContext.source));
                    mode = queryTerms["mode"];
                    if (mode) {
                        deeplink = true;
                    }

                    var usernameString = queryTerms["username"];
                    var servernameString = queryTerms["servername"];
                    var accessToken = queryTerms["accesstoken"];
                    var deviceIdentifier = queryTerms["deviceidentifier"];
                    var tenantIdentifier = queryTerms["tenantidentifier"];
                    var ownership = parseInt(queryTerms["ownership"]);
                    
                    deepLinkUPN = usernameString;
                    deepLinkServername = servernameString;

                    var accessTokenPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_accesstoken", accessToken);
                    var deviceIdentifierPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_deviceidentifier", deviceIdentifier);
                    var tenantIdentifierPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_tenantidentifier", tenantIdentifier);

                    var ownershipPromise;
                    if (ownership >= 1 && ownership <= 3) {
                        ownershipPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_ownership", ownership);
                    }
                    else {
                        ownershipPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_ownership", 0);
                    }

                    return WinJS.Promise.join({
                        accessTokenPromise: accessTokenPromise,
                        deviceIdentifierPromise: deviceIdentifierPromise,
                        tenantIdentifierPromise: tenantIdentifierPromise,
                        ownershipPromise: ownershipPromise
                    }).done(function (result) {
                    }, function (e) {
                        
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ParseQueryString_Failed", JSON.stringify(e));
                    });
                }.bind(this));  
            },

            _addMdm: function () {
                bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                    if (result.host.toLowerCase() === "mosetmamconnecttowork") {
                        var isAdminUserPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isAdminUser");
                        var isManagementRegistrationAllowedPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isManagementRegistrationAllowed");
                        WinJS.Promise.join({ isAdminUser: isAdminUserPromise, isManagementRegistrationAllowed: isManagementRegistrationAllowedPromise}).done(function (result) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm", JSON.stringify({ isAdminUser: result.isAdminUser, isManagementRegistrationAllowed: result.isManagementRegistrationAllowed, isMdmPresent: result.isMdmPresent }));
                            if (result.isAdminUser && result.isManagementRegistrationAllowed) {
                                bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_upn", userName.value.trim()).then(function () {
                                    if (serverNameField.style.display === 'block') {
                                        
                                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_serverUrl", serverName.value.trim()).done(function () {
                                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                        }, function (e) {
                                            
                                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                                            this._showErrorCode(0, false );
                                        }.bind(this));
                                    } else {
                                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_serverUrl", 0).done(function () {
                                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                        }, function (e) {
                                            
                                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                                            this._showErrorCode(0, false );
                                        }.bind(this));
                                    }
                                }.bind(this), function (e) {
                                    
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                                    this._showErrorCode(0, false );
                                }.bind(this));
                            } else {
                                
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ isAdminUser: result.isAdminUser, isManagementRegistrationAllowed: result.isManagementRegistrationAllowed, isMdmPresent: result.isMdmPresent }));
                                if (!result.isAdminUser) {
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed_NotApplicable", "NonAdminUser");
                                    this._showErrorCode(ErrorCodes.UserReserved_Error, false );
                                } else {
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed_NoApplicable", "ManagementRegistrationNotAllowed");
                                    this._showErrorCode(ErrorCodes.UserExists_Error, false );
                                }
                            }
                        }.bind(this), function (e) {
                            
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                            this._showErrorCode(0, false );
                        }.bind(this));
                    } else {
                        var isAdminUserPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isAdminUser");
                        var isManagementRegistrationAllowedPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isManagementRegistrationAllowed");
                        var isMdmPresentPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.isMdmPresent");
                        WinJS.Promise.join({ isAdminUser: isAdminUserPromise, isManagementRegistrationAllowed: isManagementRegistrationAllowedPromise, isMdmPresent: isMdmPresentPromise }).done(function (result) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm", JSON.stringify({ isAdminUser: result.isAdminUser, isManagementRegistrationAllowed: result.isManagementRegistrationAllowed, isMdmPresent: result.isMdmPresent }));
                            if (result.isAdminUser && result.isManagementRegistrationAllowed && !result.isMdmPresent) {
                                bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_upn", userName.value.trim()).then(function () {
                                    if (serverNameField.style.display === 'block') {
                                        
                                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_serverUrl", serverName.value.trim()).done(function () {
                                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                        }, function (e) {
                                            
                                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                                            this._showErrorCode(0, false );
                                        }.bind(this));
                                    } else {
                                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_serverUrl", 0).done(function () {
                                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                        }, function (e) {
                                            
                                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                                            this._showErrorCode(0, false );
                                        }.bind(this));
                                    }
                                }.bind(this), function (e) {
                                    
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                                    this._showErrorCode(0, false );
                                }.bind(this));
                            } else {
                                
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ isAdminUser: result.isAdminUser, isManagementRegistrationAllowed: result.isManagementRegistrationAllowed, isMdmPresent: result.isMdmPresent }));
                                if (!result.isAdminUser) {
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed_NotApplicable", "NonAdminUser");
                                    this._showErrorCode(ErrorCodes.UserReserved_Error, false );
                                } else {
                                    if (!result.isManagementRegistrationAllowed) {
                                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed_NoApplicable", "ManagementRegistrationNotAllowed");
                                    } else {
                                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed_NotApplicable", "MdmAlreadyPresent");
                                    }
                                    this._showErrorCode(ErrorCodes.UserExists_Error, false );
                                }
                            }
                        }.bind(this), function (e) {
                            
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                            this._showErrorCode(0, false );
                        }.bind(this));
                    }
                }.bind(this), function (e) {
                    
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                    this._showErrorCode(0, false );
                }.bind(this));
            },
            
            _setProgressState: function (waiting) {
                NextButton.disabled = waiting;
                userName.disabled = waiting;
            },
            
            _showErrorCode: function (errorCode, setFocus) {
                
                var resourceId = null;
                switch (errorCode) {
                    case ErrorCodes.LocalUser_NoUsername_Error:
                        resourceId = 'Error_NoUsername';
                        break;
                    case ErrorCodes.Username_Error:
                        resourceId = 'Error_UsernameFormat';
                        break;
                    case ErrorCodes.UsernameFormat_Error:
                        resourceId = 'Error_UsernameFormat';
                        break;
                    case ErrorCodes.UserReserved_Error:
                        resourceId = 'Error_MDM_StandardUser';
                        break;
                    case ErrorCodes.UserExists_Error:
                        resourceId = 'Error_MDM_AlreadyConnected';
                        break;
                    default:
                        resourceId = 'Error_Generic';
                        break;
                }
                if (mdmError !== 0) {
                    this._showError(unifiedEnrollmentResources[resourceId], setFocus);
                } else if (resourceId) {
                    this._showError(unifiedEnrollmentResources[resourceId], setFocus);
                }
            },
            _showError: function (error, setFocus) {
                errorClass.ShowError(userName, document.getElementById(userName.id + '_errorDialog'), error);
                if (setFocus) {
                    userName.focus();
                }
            },
        });
    })(UnifiedEnroll = CloudExperienceHost.UnifiedEnroll || (CloudExperienceHost.UnifiedEnroll = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
