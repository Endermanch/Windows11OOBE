
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var UnifiedEnroll;
    (function (UnifiedEnroll) {
        var unifiedEnrollmentResources = {};
        var bridge = new CloudExperienceHost.Bridge();
        var validator = new uiHelpers.Validator();
        var errorClass = new uiHelpers.ErrorUI();
        var MENROLL_E_DEVICE_UNKNOWN_ERROR = -2145910776;
        var MENROLL_E_DEVICENOTSUPPORTED = -2145910764;
        var MENROLL_E_CONNECTIVITY = -2145910768;
        var MENROLL_E_DEVICECAPREACHED = -2145910765;
        var MENROLL_E_DEVICE_AUTHENTICATION_ERROR = -2145910782;
        var MENROLL_E_PROV_UNKNOWN = -2145910749;
        var MENROLL_E_PLATFORM_UNKNOWN_ERROR = -2145910755;
        var TARGET_DEVICE_AND_USER = 2;
        var isError = true;
        var noEnrollmentError = "noError";
        var correlationVector = 0;
        var showingProgress = false;
        var progressIsDone = false;
        var policyCurrentProgress = 0;
        var policyExpectedEndValue = 0;
        var profilesCurrentProgress = 0;
        var profilesExpectedEndValue = 0;
        var appsCurrentProgress = 0;
        var appsExpectedEndValue = 0;
        var certificatesCurrentProgress = 0;
        var certificatesExpectedEndValue = 0;

        function _logFailureEvent(failureName, e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack, correlationVector: correlationVector }));
        }

        function _displayGenericError() {
            isError = false;
            EnrollmentFinishedTitle.textContent = unifiedEnrollmentResources["EnrollmentErrorFinishedTitle"];
            EnrollmentFinishedLeadText.textContent = unifiedEnrollmentResources["EnrollmentErrorFinishedLeadText"];
        }

        function _displayProgress(htmlElement, textString, value1, value2) {
            var errorTextToReplace = unifiedEnrollmentResources[textString];
            
            if (value1 > value2)
            {
                value1 = value2;
            }
            errorTextToReplace = errorTextToReplace.replace("{0}", value1);
            htmlElement.textContent = errorTextToReplace.replace("{1}", value2);
        }

        function _trackMDMSyncProgress() {
            var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
            var policyPromise = enterpriseManagementWorker.pollForExpectedPoliciesAndResources(0, true, TARGET_DEVICE_AND_USER).then(function (result) {
                if (result.expectedEndValue != 0)
                {
                    EnrollmentProgressPoliciesDiv.style.display = 'block';
                }
                
                policyCurrentProgress = result.currentProgress;
                policyExpectedEndValue = result.expectedEndValue;
                if (result.currentProgress === result.expectedEndValue) {
                    _displayProgress(EnrollmentPoliciesCount, "EnrollmentProgressPolicyFinishedText", result.currentProgress, result.expectedEndValue);
                } else {
                    _displayProgress(EnrollmentPoliciesCount, "EnrollmentProgressPolicyInProgressText", result.currentProgress + 1, result.expectedEndValue);
                }
                EnrollmentPoliciesProgressBar.style.display = 'none';
            }, function (e) {
                EnrollmentPoliciesProgressBar.style.display = 'none';
                _logFailureEvent("UnifiedEnrollment_ProgressPage_PolicyPromise_Failure", e);
            }, function (result) {
                if (result.expectedEndValue != 0)
                {
                    EnrollmentProgressPoliciesDiv.style.display = 'block';
                }
                policyCurrentProgress = result.currentProgress;
                policyExpectedEndValue = result.expectedEndValue;
                if (result.currentProgress === 0) {
                    _displayProgress(EnrollmentPoliciesCount, "EnrollmentProgressPolicyNotStartedText", result.currentProgress, result.expectedEndValue);
                } else {
                    _displayProgress(EnrollmentPoliciesCount, "EnrollmentProgressPolicyInProgressText", result.currentProgress + 1, result.expectedEndValue);
                }
                EnrollmentPoliciesProgressBar.style.display = 'block';
            });

            var profilesPromise = enterpriseManagementWorker.pollForExpectedPoliciesAndResources(1, true, TARGET_DEVICE_AND_USER).then(function (result) {
                if (result.expectedEndValue != 0)
                {
                    EnrollmentProgressNetworkDiv.style.display = 'block';
                }
                
                profilesCurrentProgress = result.currentProgress;
                profilesExpectedEndValue = result.expectedEndValue;
                if (result.currentProgress === result.expectedEndValue) {
                    _displayProgress(EnrollmentProfilesCount, "EnrollmentProgressProfileFinishedText", result.currentProgress, result.expectedEndValue);
                } else {
                    _displayProgress(EnrollmentProfilesCount, "EnrollmentProgressProfileInProgressText", result.currentProgress + 1, result.expectedEndValue);
                }
                EnrollmentProfilesProgressBar.style.display = 'none';
            }, function (e) {
                EnrollmentProfilesProgressBar.style.display = 'none';
                _logFailureEvent("UnifiedEnrollment_ProgressPage_ProfilesPromise_Failure", e);
            }, function (result) {
                if (result.expectedEndValue != 0)
                {
                    EnrollmentProgressNetworkDiv.style.display = 'block';
                }
                profilesCurrentProgress = result.currentProgress;
                profilesExpectedEndValue = result.expectedEndValue;
                if (result.currentProgress === 0) {
                    _displayProgress(EnrollmentProfilesCount, "EnrollmentProgressProfileNotStartedText", result.currentProgress, result.expectedEndValue);
                } else {
                    _displayProgress(EnrollmentProfilesCount, "EnrollmentProgressProfileInProgressText", result.currentProgress + 1, result.expectedEndValue);
                }
                EnrollmentProfilesProgressBar.style.display = 'block';
            });

            var appsPromise = enterpriseManagementWorker.pollForExpectedPoliciesAndResources(2, true, TARGET_DEVICE_AND_USER).then(function (result) {
                if (result.expectedEndValue != 0)
                {
                    EnrollmentProgressApplicationsDiv.style.display = 'block';
                }
                
                appsCurrentProgress = result.currentProgress;
                appsExpectedEndValue = result.expectedEndValue;
                if (result.currentProgress === result.expectedEndValue) {
                    _displayProgress(EnrollmentProgressAppsCount, "EnrollmentProgressApplicationFinishedText", result.currentProgress, result.expectedEndValue);
                } else {
                    _displayProgress(EnrollmentProgressAppsCount, "EnrollmentProgressApplicationInProgressText", result.currentProgress + 1, result.expectedEndValue);
                }
                EnrollmentApplicationsProgressBar.style.display = 'none';
            }, function (e) {
                EnrollmentApplicationsProgressBar.style.display = 'none';
                _logFailureEvent("UnifiedEnrollment_ProgressPage_ApplicationsPromise_Failure", e);
            }, function (result) {
                if (result.expectedEndValue != 0)
                {
                    EnrollmentProgressApplicationsDiv.style.display = 'block';
                }
                appsCurrentProgress = result.currentProgress;
                appsExpectedEndValue = result.expectedEndValue;
                if (result.currentProgress === 0) {
                    _displayProgress(EnrollmentProgressAppsCount, "EnrollmentProgressApplicationNotStartedText", result.currentProgress, result.expectedEndValue);
                } else {
                    _displayProgress(EnrollmentProgressAppsCount, "EnrollmentProgressApplicationInProgressText", result.currentProgress + 1, result.expectedEndValue);
                }
                EnrollmentApplicationsProgressBar.style.display = 'block';
            });

            var certificatesPromise = enterpriseManagementWorker.pollForExpectedPoliciesAndResources(3, true, TARGET_DEVICE_AND_USER).then(function (result) {
                if (result.expectedEndValue != 0)
                {
                    EnrollmentProgressCertificatesDiv.style.display = 'block';
                }
                
                certificatesCurrentProgress = result.currentProgress;
                certificatesExpectedEndValue = result.expectedEndValue;
                if (result.currentProgress === result.expectedEndValue) {
                    _displayProgress(EnrollmentProgressCertificatesCount, "EnrollmentProgressCertificateFinishedText", result.currentProgress, result.expectedEndValue);
                } else {
                    _displayProgress(EnrollmentProgressCertificatesCount, "EnrollmentProgressCertificateInProgressText", result.currentProgress + 1, result.expectedEndValue);
                }
                EnrollmentCertificatesProgressBar.style.display = 'none';
            }, function (e) {
                EnrollmentCertificatesProgressBar.style.display = 'none';
                _logFailureEvent("UnifiedEnrollment_ProgressPage_CertificatesPromise_Failure", e);
            }, function (result) {
                if (result.expectedEndValue != 0)
                {
                    EnrollmentProgressCertificatesDiv.style.display = 'block';
                }
                certificatesCurrentProgress = result.currentProgress;
                certificatesExpectedEndValue = result.expectedEndValue;
                if (result.currentProgress === 0) {
                    _displayProgress(EnrollmentProgressCertificatesCount, "EnrollmentProgressCertificateNotStartedText", result.currentProgress, result.expectedEndValue);
                } else {
                    _displayProgress(EnrollmentProgressCertificatesCount, "EnrollmentProgressCertificateInProgressText", result.currentProgress + 1, result.expectedEndValue);
                }
                EnrollmentCertificatesProgressBar.style.display = 'block';
            });

            return WinJS.Promise.join({ policies: policyPromise, profiles: profilesPromise, apps: appsPromise, certs: certificatesPromise }).then(function (results) {
                if (policyCurrentProgress === policyExpectedEndValue && profilesCurrentProgress === profilesExpectedEndValue && appsCurrentProgress === appsExpectedEndValue && certificatesCurrentProgress === certificatesExpectedEndValue) {
                    progressIsDone = true;
                    try {
                        enterpriseManagementWorker.updateServerWithResult(true, false);
                    } catch (e) {
                        EnrollmentProgressNotifyOfNotificationText.textContent = unifiedEnrollmentResources["EnrollmentErrorFinishedLeadText"] + " " + unifiedEnrollmentResources["InsecureRedirectDescription"];
                    }
                } else {
                    try {
                        enterpriseManagementWorker.updateServerWithResult(false, false);
                        EnrollmentProgressNotifyOfNotificationText.textContent = unifiedEnrollmentResources["EnrollmentErrorFinishedLeadText"] + " " + unifiedEnrollmentResources["InsecureRedirectDescription"];
                    } catch (e) {
                        
                    }
                }
            }, function (e) {
                try {
                    enterpriseManagementWorker.updateServerWithResult(false, false);
                    EnrollmentProgressNotifyOfNotificationText.textContent = unifiedEnrollmentResources["EnrollmentErrorFinishedLeadText"] + " " + unifiedEnrollmentResources["InsecureRedirectDescription"];
                } catch (e) {
                    
                }
            });
        }

        function _displayErrorOrSuccess(traceId, errorValue, internalError, enrollmentID) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_Enrollment_HRESULT", JSON.stringify({ errorValue: errorValue, correlationVector: correlationVector }));

            
            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", 0);
            var title;
            var leadText;
            var internalErrorUnsigned = internalError + 0xFFFFFFFF + 1;
            var internalErrorString = "0x" + internalErrorUnsigned.toString(16).toUpperCase();
            EnrollmentFinishedError.style.visibility = "hidden";

            switch (errorValue) {
                case MENROLL_E_DEVICE_UNKNOWN_ERROR:
                    title = "EnrollmentErrorFinishedTitle";
                    var leadTextToReplace = unifiedEnrollmentResources["MENROLL_E_DEVICE_UNKNOWN_ERROR"];
                    leadText = leadTextToReplace.replace("{0}", internalErrorString);
                    break;
                case MENROLL_E_DEVICENOTSUPPORTED:
                    title = "EnrollmentErrorFinishedTitle";
                    var leadTextToReplace = unifiedEnrollmentResources["MENROLL_E_DEVICENOTSUPPORTED"];
                    leadText = leadTextToReplace.replace("{0}", internalErrorString);
                    break;
                case MENROLL_E_CONNECTIVITY:
                    title = "EnrollmentErrorFinishedTitle";
                    var leadTextToReplace = unifiedEnrollmentResources["MENROLL_E_CONNECTIVITY"];
                    leadText = leadTextToReplace.replace("{0}", internalErrorString);
                    break;
                case MENROLL_E_DEVICECAPREACHED:
                    title = "EnrollmentErrorFinishedTitle";
                    var leadTextToReplace = unifiedEnrollmentResources["MENROLL_E_DEVICECAPREACHED"];
                    leadText = leadTextToReplace.replace("{0}", internalErrorString);
                    break;
                case MENROLL_E_DEVICE_AUTHENTICATION_ERROR:
                    title = "EnrollmentErrorFinishedTitle";
                    var leadTextToReplace = unifiedEnrollmentResources["MENROLL_E_DEVICE_AUTHENTICATION_ERROR"];
                    leadText = leadTextToReplace.replace("{0}", internalErrorString);
                    break;
                case MENROLL_E_PROV_UNKNOWN:
                    title = "EnrollmentErrorFinishedTitle";
                    var leadTextToReplace = unifiedEnrollmentResources["MENROLL_E_PROV_UNKNOWN"];
                    leadText = leadTextToReplace.replace("{0}", internalErrorString);
                    break;
                case MENROLL_E_PLATFORM_UNKNOWN_ERROR:
                    title = "EnrollmentErrorFinishedTitle";
                    var leadTextToReplace = unifiedEnrollmentResources["MENROLL_E_PLATFORM_UNKNOWN_ERROR"];
                    leadText = leadTextToReplace.replace("{0}", internalErrorString);
                    break;
                case 0:
                    title = "EnrollmentFinishedTitle";
                    leadText = unifiedEnrollmentResources["EnrollmentFinishedLeadText"];
                    isError = false;
                    break;
                default:
                    title = "EnrollmentErrorFinishedTitle";
                    leadText = unifiedEnrollmentResources["EnrollmentErrorFinishedLeadText"];
            }

            if (traceId) {
                var errorTextToReplace = unifiedEnrollmentResources["TraceIdError"];
                EnrollmentFinishedError.textContent = errorTextToReplace.replace("{0}", traceId);
                EnrollmentFinishedError.style.visibility = "visible";
            }

            if (title === "EnrollmentFinishedTitle") {
                bridge.invoke("CloudExperienceHost.UnifiedEnroll.checkCustomPageText").done(function (result) {
                    if (result.customAllDonePageTitle != "") {
                        EnrollmentFinishedTitle.textContent = result.customAllDonePageTitle;
                    } else {
                        EnrollmentFinishedTitle.textContent = unifiedEnrollmentResources[title];
                    }

                    if (result.customAllDonePageBody != "") {
                        EnrollmentFinishedLeadText.textContent = result.customAllDonePageBody;
                    } else {
                        EnrollmentFinishedLeadText.textContent = leadText;
                    }

                    if (result.customAllDonePageHyperlinkHref != "" && result.customAllDonePageHyperlinkText != "") {
                        EnrollmentCustomHyperlink.href = result.customAllDonePageHyperlinkHref;
                        EnrollmentCustomHyperlink.textContent = result.customAllDonePageHyperlinkText;
                    }
                }.bind(this), function (e) {
                    EnrollmentFinishedTitle.textContent = unifiedEnrollmentResources[title];
                    EnrollmentFinishedLeadText.textContent = leadText;
                }.bind(this));

                
            } else {
                EnrollmentFinishedTitle.textContent = unifiedEnrollmentResources[title];
                EnrollmentFinishedLeadText.textContent = leadText;
            }
        }

        WinJS.UI.Pages.define("/webapps/unifiedEnrollment/views/unifiedEnrollmentFinished.html", {
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
                
                FinishedButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    this._onFinished.apply(this);
                }.bind(this));
                FinishedButton.focus();

                var buttonResult = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources["FinishedButton"]);
                FinishedButton.textContent = buttonResult.content;
                FinishedButton.accessKey = buttonResult.accessKey;

                var enrollmentIDPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_enrollment_enrollment_ID");
                var traceIdPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_enrollment_trace_id");
                var errorPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_enrollment_result");
                var internalErrorPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_enrollment_internal_error");
                var getContextPromise = bridge.invoke("CloudExperienceHost.getContext");
                WinJS.Promise.join({ traceId: traceIdPromise, errorValue: errorPromise, internalError: internalErrorPromise, getContext: getContextPromise, enrollmentID: enrollmentIDPromise }).done(function (result) {
                    
                    if (result.getContext.host.toLowerCase() === "mosetmamconnecttowork") {
                        if (result.errorValue === noEnrollmentError) {
                            EnrollmentFinishedTitle.textContent = unifiedEnrollmentResources["EnrollmentErrorFinishedTitle"];
                            EnrollmentFinishedLeadText.textContent = unifiedEnrollmentResources["EnrollmentErrorFinishedLeadText"];
                            bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_mdm_error").done(function (result) {
                                if (result === unifiedEnrollmentResources['Error_MDM_DiscoveryError']) {
                                    EnrollmentFinishedLeadText.textContent = unifiedEnrollmentResources['Error_MAM_DiscoveryError'];
                                } else if (result === unifiedEnrollmentResources['WebAuthError']) {
                                    EnrollmentFinishedLeadText.textContent = unifiedEnrollmentResources['MAMWebAuthError'];
                                }
                            });
                        } else {
                            _displayErrorOrSuccess(result.traceId, result.errorValue, result.internalError, result.enrollmentID);
                        }
                        
                        bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", 0);
                    } else {
                        _displayErrorOrSuccess(result.traceId, result.errorValue, result.internalError, result.enrollmentID);
                    }
                });
                bridge.fireEvent(CloudExperienceHost.Events.visible, true);
            },
            _onFinished: function () {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_Enrollment_UserFinished", correlationVector).done(function (result) {
                    if (isError)
                    {
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                    } else {
                        if (showingProgress)
                        {
                            var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                            try {
                                enterpriseManagementWorker.startPollingTask();
                            } catch (e) {
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                            }
                        }
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    }
                });
            },
        });
    })(UnifiedEnroll = CloudExperienceHost.UnifiedEnroll || (CloudExperienceHost.UnifiedEnroll = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));