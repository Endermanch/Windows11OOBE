
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var UnifiedEnroll;
    (function (UnifiedEnroll) {
        var unifiedEnrollmentResources = {};
        var bridge = new CloudExperienceHost.Bridge();
        var validator = new uiHelpers.Validator();
        var errorClass = new uiHelpers.ErrorUI();
        var MENROLL_E_INVALIDSSLCERT = -2145910766;
        var ON_PREM_AUTH_NAVIGATION = CloudExperienceHost.AppResult.action1;
        var DISCOVERY_ERROR_NAVIGATION = CloudExperienceHost.AppResult.action2;
        var isMAM = false;
        var mamEnrollmentID = 0;
        var correlationVector = 0;

        function _handleMamUpgradeScenario(isInvalidSslCert) {
            bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                if (result.host.toLowerCase() === "mosetmamconnecttowork") {
                    isMAM = true;
                    bridge.invoke("CloudExperienceHost.UnifiedEnroll.retrieveMamEnrollmentID").then(function (result) {
                        mamEnrollmentID = result;
                        bridge.invoke("CloudExperienceHost.UnifiedEnroll.setMamEnrollmentAsDormant", result).then(function (result) {
                            _enrollMDM(isInvalidSslCert);
                        }, function (e) {
                            _logFailureEventMam("UnifiedEnrollment_AddMdm_Discovery_Set_Mam_Enrollment_As_Dormant_Failed", e);
                        });
                    }, function (e) {
                        _logFailureEventMam("UnifiedEnrollment_AddMdm_Discovery_Retrieve_MAM_Enrollment_Id_Failed", e);
                    });
                } else {
                    _enrollMDM(isInvalidSslCert);
                }
            }, function (e) {
                _logFailureEvent("UnifiedEnrollment_AddMdm_Discovery_Get_Context_Failed", e);
            });
        }

        function _enrollMDM(isInvalidSslCert) {
            enrollmentErrorDiv.style.display = 'none';
            progressDiv.style.display = '';
            progressText.textContent = unifiedEnrollmentResources["EnrollerLeadText"];

            var sslCertInt = 0;
            if (isInvalidSslCert)
            {
                sslCertInt = 16;
            }

            var UPNPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_upn");
            var serverURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_serverUrl");
            var secretPromise = bridge.invoke("CloudExperienceHost.Storage.PrivateData.getItem", "ue_token");
            var authPolicyPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_authPolicy");
            var enrollmentFlagsPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_enrollmentFlags");
            var policyServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_policyServiceFullURL");
            var enrollmentServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_enrollmentServiceFullURL");
            WinJS.Promise.join({
                UPN: UPNPromise, serverURL: serverURLPromise, secret: secretPromise, authPolicy: authPolicyPromise, enrollmentFlags: enrollmentFlagsPromise, policyServiceFullURL: policyServiceFullURLPromise,
                enrollmentServiceFullURL: enrollmentServiceFullURLPromise
            }).done(function (result) {
                
                bridge.invoke("CloudExperienceHost.UnifiedEnroll.doEnrollment", result.UPN, result.serverURL, result.secret, result.authPolicy, "", result.policyServiceFullURL, result.enrollmentServiceFullURL, correlationVector, result.enrollmentFlags + sslCertInt, "").then(function (result) {
                    
                    if (MENROLL_E_INVALIDSSLCERT === result.enrollmentErrorCode && sslCertInt === 0) {
                        _invalidCertWarning();
                    } else {
                        var enrollmentResultPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", result.enrollmentErrorCode);
                        var enrollmentErrorStringPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_trace_id", result.enrollmentErrorString);
                        var enrollmentInternalErrorPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_internal_error", result.enrollmentInternalError);
                        var enrollmentGUIDAsStringPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_enrollment_ID", result.enrollmentGUIDAsString);
                        var enrollmentErrorCode = result.enrollmentErrorCode;
                        var enrollmentGUIDAsString = result.enrollmentGUIDAsString;

                        WinJS.Promise.join({ enrollmentResult: enrollmentResultPromise, enrollmentErrorString: enrollmentErrorStringPromise, enrollmentInternalError: enrollmentInternalErrorPromise, enrollmentGUIDAsString: enrollmentGUIDAsStringPromise }).done(function (result) {
                            if (isMAM) {
                                if (0 === enrollmentErrorCode) {
                                    bridge.invoke("CloudExperienceHost.UnifiedEnroll.completeMAMToMDMUpgrade", enrollmentGUIDAsString, mamEnrollmentID, false).then(function (result) {
                                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                    }, function (e) {
                                        _logFailureEventMam("UnifiedEnrollment_AddMdm_Enrollment_Complete_Mam_To_Mdm_Upgrade_Failed", e);
                                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                                            
                                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                        });
                                    });
                                } else {
                                    bridge.invoke("CloudExperienceHost.UnifiedEnroll.completeMAMToMDMUpgrade", enrollmentGUIDAsString, mamEnrollmentID, true).then(function (result) {
                                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                    }, function (e) {
                                        _logFailureEventMam("UnifiedEnrollment_AddMdm_Enrollment_Complete_Mam_To_Mdm_Upgrade_Failed", e);
                                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                                            
                                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                        });
                                    });
                                }
                            } else {
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                            }
                        }, function (e) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Enrollment_Adding_Enrollment_Federated_Results_Failed",
                                JSON.stringify({ error: e, correlationVector: correlationVector }));
                            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                                
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                            });
                        });
                    }
                }, function (e) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Federated_Enrollment_Failed",
                            JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack, correlationVector: correlationVector }));
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                        
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    });
                });
            }, function (e) {
                
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Enrollment_Retrieving_Federated_Values_Failed",
                    JSON.stringify({ error: e, correlationVector: correlationVector }));
                bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                    
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                });
            });
        }

        function _invalidCertWarning() {
            EnrollerTitle.textContent = unifiedEnrollmentResources["InvalidCertTitle"];
            EnrollerLeadText.textContent = unifiedEnrollmentResources["InvalidCertLeadText"];
            EnrollerDescription.textContent = unifiedEnrollmentResources["InvalidCertDescription"];

            
            NextButton.addEventListener("click", function (event) {
                event.preventDefault();
                _handleMamUpgradeScenario(true);
            });
            
            var checkAmpersandFor = [NextButton];
            checkAmpersandFor.forEach(function (eachElement) {
                var result = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources[eachElement.id]);
                eachElement.textContent = result.content;
                eachElement.accessKey = result.accessKey;
            });

            progressDiv.style.display = 'none';
            enrollmentErrorDiv.style.display = '';

            bridge.invoke("CloudExperienceHost.Storage.PrivateData.addItem", "isInvalidCert", "InvalidCert");
        }

        function _addEnrollmentOnPremParameters (result) {
            
            var authPolicyPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_authPolicy", result.authPolicy);
            var enrollmentFlagsPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_enrollmentFlags", result.enrollmentFlags);
            var policyServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_policyServiceFullURL", result.policyServiceFullURL);
            var enrollmentServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_enrollmentServiceFullURL", result.enrollmentServiceFullURL);
            var federatedAuthenticationServicePromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_federatedAuthenticationService", 0);
            WinJS.Promise.join({
                authPolicy: authPolicyPromise, enrollmentFlags: enrollmentFlagsPromise, policyServiceFullURL: policyServiceFullURLPromise, enrollmentServiceFullURL: enrollmentServiceFullURLPromise,
                federatedAuthenticationService: federatedAuthenticationServicePromise
            }).done(function (result) {
                
                bridge.fireEvent(CloudExperienceHost.Events.done, ON_PREM_AUTH_NAVIGATION);
            }, function (e) {
                
                _logFailureEvent("UnifiedEnrollment_AddMdm_Discovery_Adding_OnPrem_Values_Failed", e);
            });
        }

        function _addEnrollmentFederatedParameters (upn, result) {
            var authURL = result.federatedAuthenticationService;
            var authPolicyPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_authPolicy", result.authPolicy);
            var enrollmentFlagsPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_enrollmentFlags", result.enrollmentFlags);
            var policyServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_policyServiceFullURL", result.policyServiceFullURL);
            var enrollmentServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_enrollmentServiceFullURL", result.enrollmentServiceFullURL);
            var federatedAuthenticationServicePromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_federatedAuthenticationService", result.federatedAuthenticationService);
            var accessTokenPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_accesstoken");
            var deviceIdentifierPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_deviceidentifier");
            var tenantIdentifierPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_tenantidentifier");
            var ownershipPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_ownership");
            WinJS.Promise.join({
                authPolicy: authPolicyPromise, enrollmentFlags: enrollmentFlagsPromise, policyServiceFullURL: policyServiceFullURLPromise, enrollmentServiceFullURL: enrollmentServiceFullURLPromise,
                federatedAuthenticationService: federatedAuthenticationServicePromise, accessToken: accessTokenPromise, deviceIdentifier: deviceIdentifierPromise, tenantIdentifier: tenantIdentifierPromise,
                ownership: ownershipPromise
            }).done(function (result) {
                
                progressText.textContent = unifiedEnrollmentResources["WABProgressText"];

                bridge.invoke("CloudExperienceHost.UnifiedEnroll.doWebAuth", authURL, upn, result.accessToken, result.deviceIdentifier, result.tenantIdentifier, result.ownership).then(function (result) {
                    if (result.responseStatus) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_WebAuthCancel", JSON.stringify({ responseStatus: result.responseStatus, correlationVector: correlationVector }));
                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", unifiedEnrollmentResources['WebAuthError']).done(function (result) {
                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                        });
                    } else {
                        bridge.invoke("CloudExperienceHost.Storage.PrivateData.addItem", "ue_token", result.responseData).then(function (result) {
                            _handleMamUpgradeScenario(false);
                        }, function (e) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_DoWebAuth_Storage_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack, correlationVector: correlationVector }));
                            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", unifiedEnrollmentResources['WebAuthError']).done(function (result) {
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                            });
                        });
                    }
                }, function (e) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_DoWebAuth_Failed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack, correlationVector: correlationVector }));
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", unifiedEnrollmentResources['WebAuthError']).done(function (result) {
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                    });
                });
            }, function (e) {
                
                _logFailureEvent("UnifiedEnrollment_AddMdm_Discovery_Adding_Federated_Values_Failed", e);
            });
        }

        function _logFailureEvent (failureName, e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack, correlationVector: correlationVector }));
            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", unifiedEnrollmentResources['Error_MDM_DiscoveryError']).done(function (result) {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
            });
        }

        function _logFailureEventMam(failureName, e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                JSON.stringify({ error: e, correlationVector: correlationVector }));
            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", unifiedEnrollmentResources['Error_MDM_DiscoveryError']).done(function (result) {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
            });
        }

        WinJS.UI.Pages.define("/webapps/unifiedEnrollment/views/unifiedEnrollmentDiscovery.html", {
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
                var correlationVectorPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.createCorrelationVector").then(function (result) {
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_correlation_vector", result);
                    correlationVector = result;
                }, function (e) {
                    
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CorrelationVectorCreationFailure",
                        JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_correlation_vector", 0);
                    correlationVector = 0;
                });
                var cssPromise = uiHelpers.LoadCssPromise(document.head, "../../..", bridge);
                return WinJS.Promise.join({ languagePromise: languagePromise, dirPromise: dirPromise, stringPromise: stringPromise, cssPromise: cssPromise, correlationVectorPromise: correlationVectorPromise });
            },
            ready: function (element, options) {
                
                var upnPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_upn");
                var serverNamePromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_serverUrl");
                var errorPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_discovery_error");
                var mdmAuthEnum = { MDMAuthPolicyOnPremise: 0, MDMAuthPolicyFederated: 1, MDMAuthPolicyCertificate: 2, MDMAuthPolicyMax: 3};
                enrollmentErrorDiv.style.display = 'none';
                progressText.textContent = unifiedEnrollmentResources["DiscoveryProgressText"];
                bridge.fireEvent(CloudExperienceHost.Events.visible, true);

                return WinJS.Promise.join({ upn: upnPromise, serverName: serverNamePromise, mdmError: errorPromise }).then(function (result) {
                    var upn = result.upn
                    var isInsecureRedirect = false;
                    var isInvalidSslCert = false;

                    if ("MENROLL_E_INVALIDSSLCERT" === result.mdmError)
                    {
                        isInvalidSslCert = true;
                    } else if ("MENROLL_E_INSECUREREDIRECT" === result.mdmError)
                    {
                        isInsecureRedirect = true;
                    }

                    
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_discovery_error", 0);
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_trace_id", "");

                    if (!result.serverName) {
                        
                        bridge.invoke("CloudExperienceHost.UnifiedEnroll.doFindDiscovery", upn, isInsecureRedirect).then(function (result) {

                            var discoveryServiceFullURL = result.discoveryServiceFullURL;
                            var isInsecureRedirect = result.isInsecureRedirect;
                            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_serverUrl", discoveryServiceFullURL).then(function (result) {
                                
                                if (isInsecureRedirect) {
                                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_discovery_error", "MENROLL_E_INSECUREREDIRECT").done(function (result) {
                                        bridge.fireEvent(CloudExperienceHost.Events.done, DISCOVERY_ERROR_NAVIGATION);
                                    });
                                } else {
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Discovery_FindDiscoveryService_Succeeded", correlationVector);
                                    bridge.invoke("CloudExperienceHost.UnifiedEnroll.doDiscoverEndpoints", discoveryServiceFullURL, upn, isInvalidSslCert).then(function (result) {
                                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Discovery_DiscoverEndpoints_Succeeded", correlationVector);
                                        if (mdmAuthEnum.MDMAuthPolicyOnPremise === result.authPolicy) {
                                            
                                            _addEnrollmentOnPremParameters(result);
                                        } else {
                                            
                                            _addEnrollmentFederatedParameters(upn, result);
                                        }
                                    }, function (e) {
                                        if (e.number === MENROLL_E_INVALIDSSLCERT) {
                                            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_discovery_error", "MENROLL_E_INVALIDSSLCERT").done(function (result) {
                                                bridge.fireEvent(CloudExperienceHost.Events.done, DISCOVERY_ERROR_NAVIGATION);
                                            });
                                        } else {
                                            
                                            _logFailureEvent("UnifiedEnrollment_AddMdm_Discovery_DiscoverEndpoints_Failed", e);
                                        }
                                    });
                                }
                            }, function (e) {
                                
                                _logFailureEvent("UnifiedEnrollment_AddMdm_Discovery_AddValue_Failed", e);
                            });
                        }, function (e) {
                            
                            _logFailureEvent("UnifiedEnrollment_AddMdm_Discovery_FindDiscoveryService_Failed", e);
                        });
                    } else {
                        
                        bridge.invoke("CloudExperienceHost.UnifiedEnroll.doDiscoverEndpoints", result.serverName, upn, isInvalidSslCert).then(function (result) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Discovery_DiscoverEndpoints_Succeeded", correlationVector);
                            if (mdmAuthEnum.MDMAuthPolicyOnPremise === result.authPolicy) {
                                
                                _addEnrollmentOnPremParameters(result);
                            } else {
                                
                                _addEnrollmentFederatedParameters(upn, result);
                            }
                        }, function (e) {
                            if (e.number === MENROLL_E_INVALIDSSLCERT) {
                                bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_discovery_error", "MENROLL_E_INVALIDSSLCERT").done(function (result) {
                                    bridge.fireEvent(CloudExperienceHost.Events.done, DISCOVERY_ERROR_NAVIGATION);
                                });
                            } else {
                                
                                _logFailureEvent("UnifiedEnrollment_AddMdm_Discovery_DiscoverEndpoints_Failed", e);
                            }
                        });
                    }
                }, function (e) {
                    
                    _logFailureEvent("UnifiedEnrollment_AddMdm_Discovery_getUpnValue_Failed", e);
                });
            }
        });
    })(UnifiedEnroll = CloudExperienceHost.UnifiedEnroll || (CloudExperienceHost.UnifiedEnroll = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));