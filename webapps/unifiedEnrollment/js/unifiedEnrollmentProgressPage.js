
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var UnifiedEnroll;
    (function (UnifiedEnroll) {
        var unifiedEnrollmentResources = {};
        var bridge = new CloudExperienceHost.Bridge();
        var validator = new uiHelpers.Validator();
        var errorClass = new uiHelpers.ErrorUI();
        var policyCurrentProgress = 0;
        var policyExpectedEndValue = 0;
        var profilesCurrentProgress = 0;
        var profilesExpectedEndValue = 0;
        var appsCurrentProgress = 0;
        var appsExpectedEndValue = 0;
        var certificatesCurrentProgress = 0;
        var certificatesExpectedEndValue = 0;
        var progressIsDone = false;
        var contextHost = "";
        var TARGET_DEVICE_AND_USER = 2;
        
        function _logFailureEvent(failureName, e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack}));
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

        function _displayText() {
            var title = "EnrollmentFinishedTitle";
            var leadText = unifiedEnrollmentResources["EnrollmentFinishedLeadText"];

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
                        } catch (e)
                        {
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

        WinJS.UI.Pages.define("/webapps/unifiedEnrollment/views/unifiedEnrollmentProgress.html", {
            init: function (element, options) {
                var skipPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.showMdmSyncStatusPageAsync").then(function (result) {
                   if (result !== 1) {
                       return bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                   }
                });
                var contextPromise = bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                    contextHost = result.host.toLowerCase();
                });
                var languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                    _htmlRoot.setAttribute("lang", preferredLang);
                }, function () { });
                var dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                    _htmlRoot.setAttribute("dir", dirVal);
                }, function () { });
                var stringPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.localizedStrings").then(function (result) {
                    unifiedEnrollmentResources = JSON.parse(result);
                });
                var cssPromise = uiHelpers.LoadCssPromise(document.head, "../../..", bridge);
                return WinJS.Promise.join({ contextPromise: contextPromise, languagePromise: languagePromise, dirPromise: dirPromise, stringPromise: stringPromise, cssPromise: cssPromise, skipPromise: skipPromise });
            },
            ready: function (element, options) {
                
                FinishedButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    this._onFinished.apply(this);
                }.bind(this));
                _displayText();
                FinishedButton.focus();

                var buttonResult = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources["FinishedButton"]);
                FinishedButton.textContent = buttonResult.content;
                FinishedButton.accessKey = buttonResult.accessKey;

                var setContentFor = [EnrollmentProgressPoliciesText, EnrollmentProgressProfilesText, EnrollmentProgressAppsText, EnrollmentProgressCertificatesText, EnrollmentProgressNotifyOfNotificationText];
                setContentFor.forEach(function (content) {
                    content.textContent = unifiedEnrollmentResources[content.id];
                });
                if (contextHost === "nthentormdm" || contextHost === "nthaadormdm")
                {
                    EnrollmentProgressPoliciesImage.src = "../../../images/SecurityPoliciesWhite.png";
                    EnrollmentProgressNetworkImage.src =  "../../../images/NetworkProfilesWhite.png";
                    EnrollmentProgressApplicationsImage.src = "../../../images/ProvisionedApplicationsWhite.png";
                    EnrollmentProgressCertificatesImage.src = "../../../images/ProvisionedCertificatesWhite.png";
                }
                else
                {
                    EnrollmentProgressPoliciesImage.src = "../../../images/SecurityPolicies.svg";
                    EnrollmentProgressNetworkImage.src =  "../../../images/NetworkProfiles.svg";
                    EnrollmentProgressApplicationsImage.src = "../../../images/ProvisionedApplications.svg";
                    EnrollmentProgressCertificatesImage.src = "../../../images/ProvisionedCertificates.svg";
                }
                bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                _trackMDMSyncProgress();
            },
            _onFinished: function () {
                if (!progressIsDone) {
                    var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                    try {
                        enterpriseManagementWorker.startPollingTask();
                    } catch (e) {
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    }
                }
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
            },
        });
    })(UnifiedEnroll = CloudExperienceHost.UnifiedEnroll || (CloudExperienceHost.UnifiedEnroll = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));