
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
        var TARGET_DEVICE = 0;
        var TARGET_USER = 1;
        var TARGET_DEVICE_AND_USER = 2;
        var targetContext = TARGET_DEVICE_AND_USER;
        var isOOBE = true;
        var blockingValue = 0;
        var showCollectLogs = 0;

        function _logFailureEvent(failureName, e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack}));
        }
        
        function _displayProgress(htmlElement, textString1, textString2, value1, value2) {

            var textToReplace = unifiedEnrollmentResources[textString1];
            var textWithoutNumbers = textToReplace.replace("{0}", unifiedEnrollmentResources[textString2]);
            if (value2 === -1 || value2 === 0)
            {
                htmlElement.textContent = textWithoutNumbers;
            } else {
                textWithoutNumbers = textWithoutNumbers.replace("{0}", value1);
                htmlElement.textContent = textWithoutNumbers.replace("{1}", value2);
            }
        }

        function _displayErrorButtons()
        {
            if (blockingValue & 1)
            {
                ResetPC.style.display = 'block';
            }

            if (blockingValue & 2)
            {
                TryAgain.style.display = 'block';
            }

            if (blockingValue & 4)
            {
                ContinueAnyway.style.display = 'block';
            }

            if (showCollectLogs)
            {
                CollectLogs.style.display = 'block';
            }
        }

        function _displayError()
        {
            var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();

            enterpriseManagementWorker.retrieveCustomErrorText(isOOBE).then(function (results) {
                _displayErrorButtons();
                EnrollmentProgressNotifyOfNotificationText.textContent = results;
                if (targetContext === 0) {
                    EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageFailed"];
                } else {
                    EnrollmentProgressAccountSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageFailed"];
                }
            }, function (e) {
                _displayErrorButtons();
                EnrollmentProgressNotifyOfNotificationText.textContent = unifiedEnrollmentResources["BootstrapPageDefualtError"];
                if (targetContext === 0) {
                    EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageFailed"];
                } else {
                    EnrollmentProgressAccountSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageFailed"];
                }
            });
        }

        function _trackMDMSyncProgress() {
            if (targetContext === 0)
            {
                EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageIdentifying"];
            } else {
                EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageComplete"];
                EnrollmentProgressAccountSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageIdentifying"];
            }
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                var policyPromise = enterpriseManagementWorker.pollForExpectedPoliciesAndResources(0, isOOBE, targetContext).then(function (result) {
                    policyCurrentProgress = result.currentProgress;
                    policyExpectedEndValue = result.expectedEndValue;
                    if (result.expectedEndValue === -1 || result.expectedEndValue != result.currentProgress)
                    {
                        if (targetContext === 0)
                        {
                            _displayProgress(EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                        }
                    } else if (result.expectedEndValue === 0)
                    {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        }
                    } else {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                        }
                    }
                }, function (e) {
                    _logFailureEvent("UnifiedEnrollment_ProgressPage_PolicyPromise_Failure", e);
                }, function (result) {
                    if (result.expectedEndValue === -1) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                        }
                    } else if (result.expectedEndValue === 0) {
                        if (targetContext === 0) {
                            EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageWorking"];
                            _displayProgress(EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        } else {
                            EnrollmentProgressAccountSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageWorking"];
                            _displayProgress(EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        }
                    } else {
                        if (targetContext === 0) {
                            EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageWorking"];
                            _displayProgress(EnrollmentProgressDeviceSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                        } else {
                            EnrollmentProgressAccountSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageWorking"];
                            _displayProgress(EnrollmentProgressAccountSetupPolicies, "BootstrapPageSecurityPolicies", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                        }
                    }
                });
                    
                var certificatesPromise = enterpriseManagementWorker.pollForExpectedPoliciesAndResources(3, isOOBE, targetContext).then(function (result) {
                    certificatesCurrentProgress = result.currentProgress;
                    certificatesExpectedEndValue = result.expectedEndValue;
                    if (result.expectedEndValue === -1 || result.expectedEndValue != result.currentProgress) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                        }
                    } else if (result.expectedEndValue === 0) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        }
                    } else {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                        }
                    }
                }, function (e) {
                    _logFailureEvent("UnifiedEnrollment_ProgressPage_ProfilesPromise_Failure", e);
                }, function (result) {
                    if (result.expectedEndValue === -1) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                        }
                    } else if (result.expectedEndValue === 0) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        }
                    } else {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupCertificates, "BootstrapPageCertificates", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupCertificates, "BootstrapPageCertificates", "BootstrapPagePolicyTrack", result.currentProgress, result.expectedEndValue);
                        }
                    }
                    });
                    
                var profilesPromise = enterpriseManagementWorker.pollForExpectedPoliciesAndResources(1, isOOBE, targetContext).then(function (result) {
                    profilesCurrentProgress = result.currentProgress;
                    profilesExpectedEndValue = result.expectedEndValue;
                    if (result.expectedEndValue === -1 || result.expectedEndValue != result.currentProgress) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                        }
                    } else if (result.expectedEndValue === 0) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        }
                    } else {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNetworkTrack", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNetworkTrack", result.currentProgress, result.expectedEndValue);
                        }
                    }
                }, function (e) {
                    _logFailureEvent("UnifiedEnrollment_ProgressPage_ApplicationsPromise_Failure", e);
                }, function (result) {
                    if (result.expectedEndValue === -1) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                        }
                    } else if (result.expectedEndValue === 0) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        }
                    } else {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNetworkTrack", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupNetwork, "BootstrapPageNetwork", "BootstrapPageNetworkTrack", result.currentProgress, result.expectedEndValue);
                        }
                    }
                });
                    
                var appsPromise = enterpriseManagementWorker.pollForExpectedPoliciesAndResources(2, isOOBE, targetContext).then(function (result) {
                    appsCurrentProgress = result.currentProgress;
                    appsExpectedEndValue = result.expectedEndValue;
                    if (result.expectedEndValue === -1 || result.expectedEndValue != result.currentProgress) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageFailed", result.currentProgress, result.expectedEndValue);
                        }
                    } else if (result.expectedEndValue === 0) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        }
                    } else {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageAppTrack", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageAppTrack", result.currentProgress, result.expectedEndValue);
                        }
                    }
                }, function (e) {
                    _logFailureEvent("UnifiedEnrollment_ProgressPage_CertificatesPromise_Failure", e);
                }, function (result) {
                    if (result.expectedEndValue === -1) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageIdentifying", result.currentProgress, result.expectedEndValue);
                        }
                    } else if (result.expectedEndValue === 0) {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageNotSetUp", result.currentProgress, result.expectedEndValue);
                        }
                    } else {
                        if (targetContext === 0) {
                            _displayProgress(EnrollmentProgressDeviceSetupApplication, "BootstrapPageApps", "BootstrapPageAppTrack", result.currentProgress, result.expectedEndValue);
                        } else {
                            _displayProgress(EnrollmentProgressAccountSetupApplication, "BootstrapPageApps", "BootstrapPageAppTrack", result.currentProgress, result.expectedEndValue);
                        }
                    }
                    });
                
                return WinJS.Promise.join({ policies: policyPromise, profiles: profilesPromise, apps: appsPromise, certs: certificatesPromise }).then(function (results) {
                    if (policyCurrentProgress === policyExpectedEndValue && profilesCurrentProgress === profilesExpectedEndValue && appsCurrentProgress === appsExpectedEndValue && certificatesCurrentProgress === certificatesExpectedEndValue) {
                        progressIsDone = true;

                        try {
                            enterpriseManagementWorker.updateServerWithResult(true, isOOBE);
                            if (targetContext === 0)
                            {
                                EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageComplete"];
                            } else {
                                EnrollmentProgressAccountSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageComplete"];
                            }
                        } catch (e) {
                            _displayError();
                        }
                    } else {
                        try {
                            enterpriseManagementWorker.updateServerWithResult(false, isOOBE);
                            _displayError();
                        } catch (e) {
                            if (targetContext === 0) {
                                EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageComplete"];
                            } else {
                                EnrollmentProgressAccountSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageComplete"];
                            }
                        }
                    }
                }, function (e) {
                    try {
                        enterpriseManagementWorker.updateServerWithResult(false, isOOBE);
                        _displayError();
                    } catch (e) {
                        if (targetContext === 0) {
                            EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageComplete"];
                        } else {
                            EnrollmentProgressAccountSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageComplete"];
                        }
                    }
                });
        }

        WinJS.UI.Pages.define("/webapps/unifiedEnrollment/views/unifiedEnrollmentProvisioningProgress.html", {
            init: function (element, options) {
                var contextPromise = bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                    var host = result.host.toLowerCase();
                    if (host === "nthaadormdm" || host === "nthentormdm") {
                        isOOBE = false;
                    } 
                });
                var skipPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.showMdmSyncStatusPageAsync").then(function (result) {
                    if (result !== 1) {
                        return bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    }
                });
                var languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                    _htmlRoot.setAttribute("lang", preferredLang);
                }, function () { });
                var dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                    _htmlRoot.setAttribute("dir", dirVal);
                }, function () { });
                var stringPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.localizedProvProgressStrings").then(function (result) {
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

                TryAgain.addEventListener("click", function (event) {
                    event.preventDefault();
                    this._onTryAgain.apply(this);
                }.bind(this));

                ResetPC.addEventListener("click", function (event) {
                    event.preventDefault();
                    this._onResetDevice.apply(this);
                }.bind(this));

                CollectLogs.addEventListener("click", function (event) {
                    event.preventDefault();
                    this._onCollectLogs.apply(this);
                }.bind(this));

                ContinueAnyway.addEventListener("click", function (event) {
                    event.preventDefault();
                    this._onContinueAnyway.apply(this);
                }.bind(this));

                EnrollmentFinishedTitle.textContent = unifiedEnrollmentResources["BootstrapPageTitle"];
                EnrollmentFinishedLeadText.textContent = unifiedEnrollmentResources["BootstrapPageRebootWarning"];
                FinishedButton.focus();

                var buttonResult = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources["BootstrapPageContinue"]);
                FinishedButton.textContent = buttonResult.content;
                FinishedButton.accessKey = buttonResult.accessKey;
                var TryAgainButtonResult = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources["BootstrapPageTryAgain"]);
                TryAgain.textContent = TryAgainButtonResult.content;
                TryAgain.accessKey = TryAgainButtonResult.accessKey;
                var ResetPCButtonResult = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources["BootstrapPageResetDevice"]);
                ResetPC.textContent = ResetPCButtonResult.content;
                ResetPC.accessKey = ResetPCButtonResult.accessKey;
                var CollectLogsButtonResult = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources["BootstrapPageCollectLogs"]);
                CollectLogs.textContent = CollectLogsButtonResult.content;
                CollectLogs.accessKey = CollectLogsButtonResult.accessKey;
                var ContinueAnywayButtonResult = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources["BootstrapPageContinue"]);
                ContinueAnyway.textContent = ContinueAnywayButtonResult.content;
                ContinueAnyway.accessKey = ContinueAnywayButtonResult.accessKey;

                EnrollmentProgressDeviceSetupText.textContent = unifiedEnrollmentResources["BootstrapPageDeviceSetupTitle"];
                EnrollmentProgressDeviceSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageWaitingForPrevious"];
                EnrollmentProgressAccountSetupText.textContent = unifiedEnrollmentResources["BootstrapPageAccountSetupTitle"];
                EnrollmentProgressAccountSetupStatus.textContent = unifiedEnrollmentResources["BootstrapPageWaitingForPrevious"];

                EnrollmentProgressPoliciesImage.src = "../../../images/SecurityPoliciesWhite.png";

                
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                var checkProgressModePromise = enterpriseManagementWorker.checkMDMProgressModeAsync().then(function (result) {
                    if (!isOOBE)
                    {
                        targetContext = result;
                    } else {
                        targetContext = TARGET_DEVICE;
                    }
                });

                var checkBlockingValuePromise = enterpriseManagementWorker.checkBlockingValueAsync().then(function (result) {
                    blockingValue = result;
                    if (blockingValue != 0)
                    {
                        FinishedButton.style.display = 'none';
                    }
                });

                var shouldShowCollectLogsPromise = enterpriseManagementWorker.shouldShowCollectLogsAsync(isOOBE).then(function (result) {
                    showCollectLogs = result;
                });

                WinJS.Promise.join({ checkProgressMode: checkProgressModePromise, checkBlockingValue: checkBlockingValuePromise, shouldShowCollectLogs: shouldShowCollectLogsPromise }).then(function (results) {
                    bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                    _trackMDMSyncProgress();
                }, function (e) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_CheckBlockingValues_Error", JSON.stringify({ error: e }));
                    
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                });
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
            _onTryAgain: function () {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_TryAgain_Chosen");
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                try {
                    enterpriseManagementWorker.resetProgressTimeout(targetContext);
                    
                    _trackMDMSyncProgress();
                } catch (e) {
                    _logFailureEvent("UnifiedEnrollment_ProgressPage_ResetProgressTimeout_Failure", e);
                }
            },
            _onResetDevice: function () {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ResetDevice_Chosen");
                var pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
                pluginManager.initiateSystemResetAsync().then(function (results) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ResetDevice_Successful");
                }, function (e) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ResetDevice_Error", JSON.stringify({ error: e }));
                });
            },
            _onCollectLogs: function () {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_CollectLogs_Chosen");
                bridge.invoke("CloudExperienceHost.showFolderPicker").then(function (folderPath) {
                    var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                    enterpriseManagementWorker.collectLogs(folderPath).then(function () {

                    }, function (e) {
                        _logFailureEvent("UnifiedEnrollment_ProgressPage_CollectLogs_Failure", e);
                    });
                }, function (e) {
                    _logFailureEvent("UnifiedEnrollment_ProgressPage_FolderPicker_Failure", e);
                });

            },
            _onContinueAnyway: function () {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ContinueAnyway_Chosen");
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
            },
        });
    })(UnifiedEnroll = CloudExperienceHost.UnifiedEnroll || (CloudExperienceHost.UnifiedEnroll = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));