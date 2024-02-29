//
// Copyright (C) Microsoft. All rights reserved.
//
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var UnifiedEnroll;
    (function (UnifiedEnroll) {
        var HTTP_E_STATUS_UNEXPECTED = -2145845247;
        var E_ABORT = -2147483641;
        var S_OK = 0;
        var DMLOGGING_ENROLLMENT = 0;
        var DMLOGGING_WEBAUTH = 1;
        var DMLOGGING_WEBAUTH_HTTP = 2;
        var WEB_AUTHENTICATION_STATUS_USER_CANCEL = 1;
        var WEB_AUTHENTICATION_STATUS_ERROR_HTTP = 2;
        var ENROLL_TYPE_MAM = 5;
        var ENROLL_TYPE_MDM_DEVICE_WITH_AAD = 6;
        var CONNECTIVITY_TIMEOUT = 1500000; // 25 minutes (in ms)
        var DSREG_E_CXH_DEVICE_NOT_JOINED = -2145647628;

        // Make sure this matches ReflectedJoinType in EnterpriseDeviceManagement.idl
        var reflectedEnrollmentJoinType = {
            DeviceJoin: 0,
            UserJoin: 1,
            MAMWithDiscovery: 2,
            MAMWithoutDiscovery: 3,
            BulkDeviceJoin: 4,
            DeviceJoinForDomainJoin: 5
        };

        function doAddWorkOrSchoolAccount(userPrincipalName, relatedActivityId) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var unifiedEnrollmentWorker = UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.createUnifiedEnrollmentWorkerForUser(CloudExperienceHost.IUserManager.getInstance().getIUser());
                unifiedEnrollmentWorker.doAddWorkOrSchoolAccountAsync(userPrincipalName, relatedActivityId).done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.doAddWorkOrSchoolAccount = doAddWorkOrSchoolAccount;
        function isAzureActiveDirectoryUser() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var unifiedEnrollmentWorker = UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.createUnifiedEnrollmentWorkerForUser(CloudExperienceHost.IUserManager.getInstance().getIUser());
                unifiedEnrollmentWorker.isAzureActiveDirectoryUserAsync().done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.isAzureActiveDirectoryUser = isAzureActiveDirectoryUser;
        function getNumberOfAccountsFromAad() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var unifiedEnrollmentWorker = UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.createUnifiedEnrollmentWorkerForUser(CloudExperienceHost.IUserManager.getInstance().getIUser());
                unifiedEnrollmentWorker.getNumberOfAccountsFromAadAsync().done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.getNumberOfAccountsFromAad = getNumberOfAccountsFromAad;
        function isAdminUser() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var platform = CloudExperienceHost.Environment.getPlatform();
                if ((platform === CloudExperienceHost.TargetPlatform.MOBILE) ||
                    (platform === CloudExperienceHost.TargetPlatform.XBOX) ||
                    (platform === CloudExperienceHost.TargetPlatform.HOLOGRAPHIC)) {
                    // these platforms have no concept of admin
                    completeDispatch(true);
                }
                else {
                    var unifiedEnrollmentWorker = UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.createUnifiedEnrollmentWorkerForUser(CloudExperienceHost.IUserManager.getInstance().getIUser());
                    unifiedEnrollmentWorker.isAdminUserAsync().done(completeDispatch, errorDispatch);
                }
            });
        }
        UnifiedEnroll.isAdminUser = isAdminUser;
        function isDeviceCloudJoined() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.isDeviceCloudJoinedAsync().done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.isDeviceCloudJoined = isDeviceCloudJoined;
        function isDeviceADJoined() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.isDeviceADJoinedAsync().done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.isDeviceADJoined = isDeviceADJoined;
        function isManagementRegistrationAllowed() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.isManagementRegistrationAllowedAsync().done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.isManagementRegistrationAllowed = isManagementRegistrationAllowed;
        function isOfflineUxPageAllowed() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var platform = CloudExperienceHost.Environment.getPlatform();
                if (platform === CloudExperienceHost.TargetPlatform.DESKTOP)
                    {
                        // If device is Desktop, the page should be allowed to be shown.
                        completeDispatch(true);
                    }
                    else
                    {
                        // Check SLAPI (other checks as a part of this API are only relevent on Desktop)
                        UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.isManagementRegistrationAllowedAsync().done(completeDispatch, errorDispatch);
                    }
            });
        }
        UnifiedEnroll.isOfflineUxPageAllowed = isOfflineUxPageAllowed;
        function isMdmPresent() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.isMdmPresentAsync().done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.isMdmPresent = isMdmPresent;
        function isDomainOperationSupported() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var platform = CloudExperienceHost.Environment.getPlatform();
                if (platform === CloudExperienceHost.TargetPlatform.DESKTOP) {
                    // Check if domain join/leave is supported on this desktop SKU
                    UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.isDomainOperationSupportedAsync().done(completeDispatch, errorDispatch);
                }
                else {
                    completeDispatch(false);
                }
            });
        }
        UnifiedEnroll.isDomainOperationSupported = isDomainOperationSupported;
        function isAzureDomainOperationSupported() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.isAzureDomainOperationSupportedAsync().done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.isAzureDomainOperationSupported = isAzureDomainOperationSupported;
        function isDomainJoinPending() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.isDomainJoinPendingAsync().done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.isDomainJoinPending = isDomainJoinPending;
        function isDomainLeavePending() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                UnifiedEnrollment.DataModel.UnifiedEnrollmentWorkerFactory.isDomainLeavePendingAsync().done(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.isDomainLeavePending = isDomainLeavePending;
        function doFindDiscovery(UPN, ignoreInsecureRedirect) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.findDiscoveryServiceAsync(UPN, ignoreInsecureRedirect).then(function (result) {
                    var findDiscoveryServiceObject = {
                        discoveryServiceFullURL: result.discoveryServiceFullURL, isInsecureRedirect: result.discoveryServiceInsecureRedirect
                    };
                    completeDispatch(findDiscoveryServiceObject);
                }, errorDispatch);
            });
        }
        UnifiedEnroll.doFindDiscovery = doFindDiscovery;
        function doDiscoverEndpoints(discoveryUrl, UPN, ignoreInvalidSslCert) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.discoverEndpointsAsync(discoveryUrl, UPN, ignoreInvalidSslCert).then(function (result) {
                    var discoverEndpointObject = {
                        enrollmentFlags: result.enrollmentFlags, authPolicy: result.authPolicy, policyServiceFullURL: result.policyServiceFullURL,
                        enrollmentServiceFullURL: result.enrollmentServiceFullURL, federatedAuthenticationService: result.federatedAuthenticationService
                    };
                    completeDispatch(discoverEndpointObject);
                }, errorDispatch);
            });
        }
        UnifiedEnroll.doDiscoverEndpoints = doDiscoverEndpoints;
        function doEnrollment(UPN, serverUrl, secret, authPolicy, domainUsername, policyServiceUrl, enrollmentServiceUrl, correlationVector, enrollmentFlags, SID) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.enrollAsync(UPN, serverUrl, secret, authPolicy, domainUsername, policyServiceUrl, enrollmentServiceUrl, correlationVector, enrollmentFlags, SID).then(function (result) {
                    // Can still have failures but not return a failing HR.  Must check value of enrollmentErrorCode.
                    var enrollmentResultObject = {
                        enrollmentErrorCode: result.enrollmentErrorCode, enrollmentErrorString: result.enrollmentErrorString, enrollmentInternalError: result.enrollmentInternalError, enrollmentGUIDAsString: result.enrollmentGUIDAsString
                    };
                    enterpriseManagementWorker.eventWriteForEnrollment(DMLOGGING_ENROLLMENT, result.enrollmentInternalError);
                    completeDispatch(enrollmentResultObject);
                }, function (e) {
                    enterpriseManagementWorker.eventWriteForEnrollment(DMLOGGING_ENROLLMENT, e.number);
                    errorDispatch(e);
                });
            });
        }
        UnifiedEnroll.doEnrollment = doEnrollment;
        function doEnrollmentForDomainJoin(UPN, serverUrl, secret, resourceUrl, touArtifact) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                let autoPilotManager = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();
                autoPilotManager.getDeviceAutopilotModeAsync().then(function (result) {
                    if (result !== EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP) {
                        CloudExperienceHost.Telemetry.logEvent("AutopilotWhiteGlove policy not found, performing device enrollment.");
                        let enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                        return enterpriseManagementWorker.aadenrollAsync(UPN, serverUrl, secret, touArtifact, reflectedEnrollmentJoinType.DeviceJoinForDomainJoin, "", resourceUrl, "").then(function (result) {
                            // Can still have failures but not return a failing HR.  Must check value of enrollmentErrorCode.
                            var enrollmentResultObject = {
                                enrollmentErrorCode: result.enrollmentErrorCode, enrollmentErrorString: result.enrollmentErrorString, enrollmentInternalError: result.enrollmentInternalError, enrollmentGUIDAsString: result.enrollmentGUIDAsString
                            };

                            CloudExperienceHost.Telemetry.logEvent("Device enrollment returned successfully with internal server error: " + enrollmentResultObject.enrollmentInternalError);
                            
                            if (enrollmentResultObject.enrollmentInternalError === 1) {
                                enrollmentResultObject.enrollmentInternalError = 0;
                            }

                            enterpriseManagementWorker.eventWriteForEnrollment(DMLOGGING_ENROLLMENT, result.enrollmentInternalError);
                            completeDispatch(enrollmentResultObject);
                        }, function (e) {
                            enterpriseManagementWorker.eventWriteForEnrollment(DMLOGGING_ENROLLMENT, e.number);
                            errorDispatch(e);
                        });
                    } else {
                        var emptyEnrollmentObject = {
                            enrollmentErrorCode: 0, enrollmentErrorString: "", enrollmentInternalError: 0, enrollmentGUIDAsString: ""
                        };
                        CloudExperienceHost.Telemetry.logEvent("AutopilotWhiteGlove hybrid mode detected, skipping enrollment");
                        completeDispatch(emptyEnrollmentObject);
                    }
                });
            });
        }
        UnifiedEnroll.doEnrollmentForDomainJoin = doEnrollmentForDomainJoin;
        function waitForDomainConnectivity() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.prepForFirstSignin();
                enterpriseManagementWorker.checkForDomainControllerConnectivity(CONNECTIVITY_TIMEOUT).then(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.waitForDomainConnectivity = waitForDomainConnectivity;
        function doUnenrollmentForDomainJoin() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.getEnrollment(ENROLL_TYPE_MDM_DEVICE_WITH_AAD).then(function (result) {
                    enterpriseManagementWorker.unenrollAsync(result).then(completeDispatch, errorDispatch);
                }, errorDispatch);
            });
        }
        UnifiedEnroll.doUnenrollmentForDomainJoin = doUnenrollmentForDomainJoin;
        function doWebAuth(webAuthUrl, upn, accessToken, deviceIdentifier, tenantIdentifier, ownership) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var appId = "";
                var platform = CloudExperienceHost.Environment.getPlatform();
                if (platform === CloudExperienceHost.TargetPlatform.MOBILE) {
                    // App SID of the old enrollment splash app, enrollUI.exe.
                    appId = "ms-app://s-1-15-2-4108341168-3731623572-3746702997-906799925-2574769856-1402521575-1149971147";
                } else {
                    // Desktop Settings appid.
                    appId = "ms-app://windows.immersivecontrolpanel";
                }

                // Check for optional parameters from the Deep Link scenario
                var queryString = "";
                if (accessToken !== null)
                {
                    queryString = queryString + "&accesstoken=" + Windows.Foundation.Uri.escapeComponent(accessToken);
                }
                if (deviceIdentifier !== null) {
                    queryString = queryString + "&deviceidentifier=" + Windows.Foundation.Uri.escapeComponent(deviceIdentifier);
                }
                if (tenantIdentifier !== null) {
                    queryString = queryString + "&tenantidentifier=" + Windows.Foundation.Uri.escapeComponent(tenantIdentifier);
                }
                if (ownership !== 0)
                {
                    queryString = queryString + "&ownership=" + ownership;
                }

                // Check if there is already a query string in the auth URL
                var startURI;
                var escapedUPN = Windows.Foundation.Uri.escapeComponent(upn);
                if (webAuthUrl.includes("?")) {
                    startURI = new Windows.Foundation.Uri(webAuthUrl + "&appru=" + Windows.Foundation.Uri.escapeComponent(appId) + "&login_hint=" + escapedUPN + "&username=" + escapedUPN + queryString);
                } else {
                    startURI = new Windows.Foundation.Uri(webAuthUrl + "?appru=" + Windows.Foundation.Uri.escapeComponent(appId) + "&login_hint=" + escapedUPN + "&username=" + escapedUPN + queryString);
                }

                var stopURI = new Windows.Foundation.Uri(appId);
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.allowAuthUri(startURI);

                Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(Windows.Security.Authentication.Web.WebAuthenticationOptions.useHttpPost | Windows.Security.Authentication.Web.WebAuthenticationOptions.useCorporateNetwork, startURI, stopURI).done(function (result) {
                    enterpriseManagementWorker.removeAuthUriAllowList();
                    var stringToSearch = "wresult=";
                    var beginningIndex = result.responseData.search(stringToSearch);
                    var endingIndex = result.responseData.indexOf("&", beginningIndex + stringToSearch.length);
                    var endString;
                    if (endingIndex === -1) {
                        endString = result.responseData.substring(beginningIndex + stringToSearch.length);
                    } else {
                        endString = result.responseData.substring(beginningIndex + stringToSearch.length, endingIndex);
                    }
                    var webAuthenticationResultObject = {
                        responseStatus: result.responseStatus, responseData: endString
                    };
                    if (WEB_AUTHENTICATION_STATUS_ERROR_HTTP === result.responseStatus) {
                        enterpriseManagementWorker.eventWriteForEnrollment(DMLOGGING_WEBAUTH_HTTP, result.responseErrorDetail);
                    } else if (WEB_AUTHENTICATION_STATUS_USER_CANCEL === result.responseStatus) {
                        enterpriseManagementWorker.eventWriteForEnrollment(DMLOGGING_WEBAUTH, E_ABORT);
                    } else {
                        enterpriseManagementWorker.eventWriteForEnrollment(DMLOGGING_WEBAUTH, S_OK);
                    }
                    completeDispatch(webAuthenticationResultObject);
                }, function (e) {
                    enterpriseManagementWorker.removeAuthUriAllowList();
                    enterpriseManagementWorker.eventWriteForEnrollment(1, e.number);
                    errorDispatch(e);
                });
            });
        }
        UnifiedEnroll.doWebAuth = doWebAuth;
        function checkCustomPageText() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.retrieveCustomAllDonePageAsync().then(function (result) {
                    var customAllDonePageResultsObject = {
                        customAllDonePageTitle: result.customAllDonePageTitle, customAllDonePageBody: result.customAllDonePageBody, customAllDonePageHyperlinkHref: result.customAllDonePageHyperlinkHref,
                        customAllDonePageHyperlinkText: result.customAllDonePageHyperlinkText
                    };
                    completeDispatch(customAllDonePageResultsObject);
                }, errorDispatch);
            });
        }
        UnifiedEnroll.checkCustomPageText = checkCustomPageText;
        function retrieveMamEnrollmentID() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.getEnrollment(ENROLL_TYPE_MAM).then(function (result) {
                    var enrollmentIDWithoutBrackets = result.substring(1, result.length -1);
                    completeDispatch(enrollmentIDWithoutBrackets);
                }, errorDispatch);
            });
        }
        UnifiedEnroll.retrieveMamEnrollmentID = retrieveMamEnrollmentID;
        function setMamEnrollmentAsDormant(enrollmentID) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.setEnrollmentAsDormant(enrollmentID, true, false).then(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.setMamEnrollmentAsDormant = setMamEnrollmentAsDormant;
        function completeMAMToMDMUpgrade(mdmEnrollmentID, mamEnrollmentID, isFailedUpgrade) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.completeMAMToMDMUpgrade(mdmEnrollmentID, mamEnrollmentID, isFailedUpgrade).then(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.completeMAMToMDMUpgrade = completeMAMToMDMUpgrade;
        function createCorrelationVector() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                enterpriseManagementWorker.createCorrelationVector().then(completeDispatch, errorDispatch);
            });
        }
        UnifiedEnroll.createCorrelationVector = createCorrelationVector;
        function checkIfPinPromptScenario() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var context = CloudExperienceHost.getContext();
                if (context.host.toLowerCase() !== "nthentormdm" && context.host.toLowerCase() !== "nthaadormdm") {
                    completeDispatch(true);
                } else {
                    completeDispatch(-1 !== context.source.toLowerCase().indexOf("ngc=enabled"));
                }
            });
        }
        UnifiedEnroll.checkIfPinPromptScenario = checkIfPinPromptScenario;
        function resetDevice() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
                pluginManager.initiateSystemResetAsync().then(function (results) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ResetDevice_Successful");
                    completeDispatch(true);
                }, function (e) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_ProvisioningProgressPage_ResetDevice_Error", JSON.stringify({ error: e }));
                    errorDispatch(e);
                });
            });
        }
        UnifiedEnroll.resetDevice = resetDevice;
        function localizedStrings() {
            var unifiedEnrollmentResources = {};
            var keyList = ['Title', 'LeadText', 'Description', 'UserPlaceholder', 'ServerUrlPlaceholder', 'FooterHeader', 'DjLink', 'Error_NoUsername', 'Error_UsernameFormat',
                'Error_UsernameLookup', 'Error_DomainLookup', 'Error_Network', 'Error_Generic_Code', 'Error_Generic', 'Error_Servername', 'NextButton', 'Error_MDM_StandardUser', 'Error_MDM_AlreadyConnected',
                'Error_MDM_DiscoveryError', 'DomainUsernamePlaceholder', 'PasswordPlaceholder', 'EnrollerLeadText', 'EnrollmentErrorFinishedTitle',
                'EnrollmentErrorFinishedLeadText', 'EnrollmentFinishedTitle', 'EnrollmentFinishedLeadText', 'FinishedButton', 'InsecureRedirectTitle', 'InsecureRedirectLeadText',
                'InsecureRedirectDescription', 'InvalidCertTitle', 'InvalidCertLeadText', 'InvalidCertDescription', 'TraceIdError', 'WebAuthError', 'MENROLL_E_DEVICE_UNKNOWN_ERROR', 'MENROLL_E_DEVICENOTSUPPORTED',
                'MENROLL_E_CONNECTIVITY', 'MENROLL_E_DEVICECAPREACHED', 'MENROLL_E_DEVICE_AUTHENTICATION_ERROR', 'MENROLL_E_PROV_UNKNOWN', 'MENROLL_E_PLATFORM_UNKNOWN_ERROR', 'DiscoveryProgressText',
                'WABProgressText', 'Error_MAM_DiscoveryError', 'MAMWebAuthError', 'EnrollmentProgressPoliciesText', 'EnrollmentProgressProfilesText', 'EnrollmentProgressAppsText', 'EnrollmentProgressCertificatesText',
                'EnrollmentProgressPolicyNotStartedText', 'EnrollmentProgressPolicyInProgressText', 'EnrollmentProgressPolicyFinishedText', 'EnrollmentProgressProfileNotStartedText', 'EnrollmentProgressProfileInProgressText', 
                'EnrollmentProgressProfileFinishedText', 'EnrollmentProgressApplicationNotStartedText', 'EnrollmentProgressApplicationInProgressText', 'EnrollmentProgressApplicationFinishedText',
                'EnrollmentProgressCertificateNotStartedText', 'EnrollmentProgressCertificateInProgressText', 'EnrollmentProgressCertificateFinishedText', 'EnrollmentProgressNotifyOfNotificationText',
                'UserNarratorText', 'ServerUrlNarratorText'];
            keyList.forEach(function (key) {
                var resourceId = '/unifiedEnrollment/' + key;
                unifiedEnrollmentResources[key] = WinJS.Resources.getString(resourceId).value;
            });
            return JSON.stringify(unifiedEnrollmentResources);
        }
        UnifiedEnroll.localizedStrings = localizedStrings;
        function localizedProvProgressStrings() {
            var unifiedEnrollmentResources = {};
            var keyList = ['BootstrapPageTitle', 'BootstrapPageRebootWarning', 'BootstrapPageDevicePrepTitle', 'BootstrapPageDeviceSetupTitle', 'BootstrapPageAccountSetupTitle', 'BootstrapPageShowDetailButton',
            'BootstrapPageGettingReady', 'BootstrapPageWaitingForPrevious', 'BootstrapPageComplete', 'BootstrapPageWorking', 'BootstrapPageStillWorking', 'BootstrapPageTPM', 'BootstrapPageAADJ', 'BootstrapPagePrepareMDM',
            'BootstrapPageMDM', 'BootstrapPageIdentifying', 'BootstrapPageAuthentication', 'BootstrapPageSecurityPolicies', 'BootstrapPageCertificates', 'BootstrapPageNetwork', 'BootstrapPageApps', 'BootstrapPagePolicyTrack',
            'BootstrapPageNetworkTrack', 'BootstrapPageAppTrack', 'BootstrapPageDontClose', 'BootstrapPagePatience', 'BootstrapPageFailed', 'BootstrapPageDefualtError', 'BootstrapPageCollectLogs',
            'BootstrapPageResetDevice', 'BootstrapPageTryAgain', 'BootstrapPageContinue', 'BootstrapPagePrevStepFailed', 'BootstrapPageContinueMessage', 'BootstrapPageSignInWait', 'BootstrapPageNotSetUp'];
            keyList.forEach(function (key) {
                var resourceId = '/unifiedEnrollment/' + key;
                unifiedEnrollmentResources[key] = WinJS.Resources.getString(resourceId).value;
            });
            return JSON.stringify(unifiedEnrollmentResources);
        }
        UnifiedEnroll.localizedProvProgressStrings = localizedProvProgressStrings;
    })(UnifiedEnroll = CloudExperienceHost.UnifiedEnroll || (CloudExperienceHost.UnifiedEnroll = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));