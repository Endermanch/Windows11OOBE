
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
                            if (isInvalidSslCert)
                            {
                                _enrollIgnoreCertWarning();
                            } else {
                                _enroll();
                            }
                        }, function (e) {
                            _logFailureEventMam("UnifiedEnrollment_AddMdm_Discovery_Set_Mam_Enrollment_As_Dormant_Failed", e);
                        });
                    }, function (e) {
                        _logFailureEventMam("UnifiedEnrollment_AddMdm_Discovery_Retrieve_MAM_Enrollment_Id_Failed", e);
                    });
                } else {
                    if (isInvalidSslCert) {
                        _enrollIgnoreCertWarning();
                    } else {
                        _enroll();
                    }
                }
            }, function (e) {
                _logFailureEventMam("UnifiedEnrollment_AddMdm_Discovery_Get_Context_Failed", e);
            });
        }

        function _logFailureEvent(failureName, e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack, correlationVector: correlationVector }));
            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
            });
        }

        function _invalidCertWarning() {
            uiHelpers.SetElementVisibility(password, false);
            uiHelpers.SetElementVisibility(domainName, false);
            Title.textContent = unifiedEnrollmentResources["InvalidCertTitle"];
            LeadText.textContent = unifiedEnrollmentResources["InvalidCertLeadText"];
            Description.textContent = unifiedEnrollmentResources["InvalidCertDescription"];

            progressDiv.style.display = 'none';
            onPremDiv.style.display = '';

            bridge.invoke("CloudExperienceHost.Storage.PrivateData.addItem", "isInvalidCert", "InvalidCert");
        }

        function _enroll() {
            
            var UPNPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_upn");
            var serverURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_serverUrl");
            var authPolicyPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_authPolicy");
            var enrollmentFlagsPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_enrollmentFlags");
            var policyServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_policyServiceFullURL");
            var enrollmentServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_enrollmentServiceFullURL");
            var passwordPromise = bridge.invoke("CloudExperienceHost.Storage.PrivateData.addItem", "ue_password", password.value.trim());
            var domainPromise = bridge.invoke("CloudExperienceHost.Storage.PrivateData.addItem", "ue_domainName", domainName.value.trim());
            WinJS.Promise.join({
                UPN: UPNPromise, serverURL: serverURLPromise, authPolicy: authPolicyPromise, enrollmentFlags: enrollmentFlagsPromise, policyServiceFullURL: policyServiceFullURLPromise,
                enrollmentServiceFullURL: enrollmentServiceFullURLPromise, password: passwordPromise, domain: domainPromise
            }).done(function (result) {
                
                bridge.invoke("CloudExperienceHost.UnifiedEnroll.doEnrollment", result.UPN, result.serverURL, password.value.trim(), result.authPolicy, domainName.value.trim(), result.policyServiceFullURL, result.enrollmentServiceFullURL, correlationVector, result.enrollmentFlags, "").done(function (result) {
                    
                    if (MENROLL_E_INVALIDSSLCERT === result.enrollmentErrorCode) { 
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
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Enrollment_Adding_Enrollment_OnPrem_Results_Failed",
                                JSON.stringify({ error: e, correlationVector: correlationVector }));
                            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                                
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                            });
                        });
                    }
                }, function (e) {
                    _logFailureEvent("UnifiedEnrollment_AddMdm_OnPremAuth_Enrollment_Failed", e);
                });
            }, function (e) {
                
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Enrollment_Retrieving_OnPremAuth_Values_Failed",
                    JSON.stringify({ error: e, correlationVector: correlationVector }));
                bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                    
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                });
            });
        }

        function _enrollIgnoreCertWarning() {
            
            var UPNPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_upn");
            var serverURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_serverUrl");
            var authPolicyPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_authPolicy");
            var enrollmentFlagsPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_enrollmentFlags");
            var policyServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_policyServiceFullURL");
            var enrollmentServiceFullURLPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_enrollmentServiceFullURL");
            var passwordPromise = bridge.invoke("CloudExperienceHost.Storage.PrivateData.getItem", "ue_password");
            var domainPromise = bridge.invoke("CloudExperienceHost.Storage.PrivateData.getItem", "ue_domainName");
            WinJS.Promise.join({
                UPN: UPNPromise, serverURL: serverURLPromise, authPolicy: authPolicyPromise, enrollmentFlags: enrollmentFlagsPromise, policyServiceFullURL: policyServiceFullURLPromise,
                enrollmentServiceFullURL: enrollmentServiceFullURLPromise, password: passwordPromise, domain: domainPromise
            }).done(function (result) {
                
                bridge.invoke("CloudExperienceHost.UnifiedEnroll.doEnrollment", result.UPN, result.serverURL, result.password, result.authPolicy, result.domain, result.policyServiceFullURL, result.enrollmentServiceFullURL, correlationVector, result.enrollmentFlags + 16, "").done(function (result) {
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
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Enrollment_Adding_Enrollment_OnPrem_Results_Failed",
                            JSON.stringify({ error: e, correlationVector: correlationVector }));
                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                            
                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                        });
                    });
                }, function (e) {
                    _logFailureEvent("UnifiedEnrollment_AddMdm_OnPremAuth_Enrollment_Failed", e);
                });
            }, function (e) {
                
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_AddMdm_Enrollment_Retrieving_OnPremAuth_Values_Failed",
                    JSON.stringify({ error: e }));
                bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_enrollment_result", "genericError").done(function (result) {
                    
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                });
            });
        }

        function _logFailureEventMam(failureName, e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                JSON.stringify({ error: e, correlationVector: correlationVector }));
            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", unifiedEnrollmentResources['Error_MDM_DiscoveryError']).done(function (result) {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
            });
        }

        WinJS.UI.Pages.define("/webapps/unifiedEnrollment/views/unifiedEnrollmentOnPremAuth.html", {
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
                var correlationVectorPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_correlation_vector").then(function (result) {
                    correlationVector = result;
                });
                var cssPromise = uiHelpers.LoadCssPromise(document.head, "../../..", bridge);
                return WinJS.Promise.join({ languagePromise: languagePromise, dirPromise: dirPromise, stringPromise: stringPromise, cssPromise: cssPromise, correlationVectorPromise: correlationVectorPromise });
            },
            ready: function (element, options) {
                
                var setContentFor = [Title, LeadText, NextButton];
                setContentFor.forEach(function (content) {
                    content.textContent = unifiedEnrollmentResources[content.id];
                });

                progressDiv.style.display = 'none';
                domainName.setAttribute('placeholder', unifiedEnrollmentResources['DomainUsernamePlaceholder']);
                password.setAttribute('placeholder', unifiedEnrollmentResources['PasswordPlaceholder']);

                
                NextButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    this._onNext.apply(this);
                }.bind(this));
                
                var checkAmpersandFor = [NextButton];
                checkAmpersandFor.forEach(function (eachElement) {
                    var result = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources[eachElement.id]);
                    eachElement.textContent = result.content;
                    eachElement.accessKey = result.accessKey;
                });

                bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                domainName.focus();
            },
            _onNext: function () {
                this._setProgressState();
                bridge.invoke("CloudExperienceHost.Storage.PrivateData.getItem", "isInvalidCert").then(function (result) {
                    if ("InvalidCert" === result) {
                        _handleMamUpgradeScenario(true);
                    } else {
                        _handleMamUpgradeScenario(false);
                    }
                }, function (e) {
                    _handleMamUpgradeScenario(false);
                });
            },
            
            _setProgressState: function () {
                progressText.textContent = unifiedEnrollmentResources["EnrollerLeadText"];
                onPremDiv.style.display = 'none';
                progressDiv.style.display = '';
            },
        });
    })(UnifiedEnroll = CloudExperienceHost.UnifiedEnroll || (CloudExperienceHost.UnifiedEnroll = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
