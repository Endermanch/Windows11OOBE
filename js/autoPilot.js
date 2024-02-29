//
// Copyright (C) Microsoft. All rights reserved.
//

"use strict";

var CloudExperienceHost;
(function (CloudExperienceHost) {
    var AutoPilot;
    (function (AutoPilot) {
        var PlugAndForget;
        (function (PlugAndForget) {
            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getOobeSettingsOverrideAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotOobeSetting.aadAuthUsingDeviceTicket).then(function (useDeviceTicketForAadAuth) {
                            // True - Skip the pages for the Autopilot Plug and Forget flow
                            // False - Show the pages
                            completeDispatch(useDeviceTicketForAadAuth);
                        }, errorDispatch);
                    } catch (err) {
                        // If an exception is thrown, skip the Plug and Forget flow and resume through the Consumer OOBE flow
                        CloudExperienceHost.Telemetry.logEvent("Autopilot_PlugAndForget_GetShouldSkipAsyncFailed", JSON.stringify({ error: err }));
                        completeDispatch(true);
                    }
                });
            }
            PlugAndForget.getShouldSkipAsync = getShouldSkipAsync;
        })(PlugAndForget = AutoPilot.PlugAndForget || (AutoPilot.PlugAndForget = {}));

        var ShouldUseRefactoredEsp;
        (function (ShouldUseRefactoredEsp) {
            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getSettingAsync("UseRefactoredEsp").then(function (result) {
                            if ("" === result) {
                                // Don't use refactored ESP.
                                completeDispatch(false);
                            } else {
                                // Use refactored ESP.
                                completeDispatch(true);
                            }
                        }, errorDispatch);
                    } catch (err) {
                        // If an exception is thrown, don't use the refactored ESP.
                        CloudExperienceHost.Telemetry.logEvent("AutoPilot_ShouldUseRefactoredEsp_GetShouldSkipAsyncFailed", JSON.stringify({ error: err }));
                        completeDispatch(false);
                    }
                });
            }
            ShouldUseRefactoredEsp.getShouldSkipAsync = getShouldSkipAsync;
        })(ShouldUseRefactoredEsp = AutoPilot.ShouldUseRefactoredEsp || (AutoPilot.ShouldUseRefactoredEsp = {}));

        var ShouldUseRefactoredEspAndShouldShowEsp;
        (function (ShouldUseRefactoredEspAndShouldShowEsp) {
            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getSettingAsync("UseRefactoredEsp").then(function (result) {
                            if ("" === result) {
                                // Don't use refactored ESP.
                                let context = CloudExperienceHost.getContext();
                                let isOOBE = (context.host.toLowerCase() !== "nthentormdm" && context.host.toLowerCase() !== "nthaadormdm");

                                let enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();

                                return enterpriseManagementWorker.showMdmSyncStatusPageAsync(isOOBE).then(function (results) {
                                    CloudExperienceHost.Telemetry.logEvent("Show ESP page?", results);
                                    if (1 === results) {
                                        completeDispatch(false);
                                    } else {
                                        completeDispatch(true);
                                    }
                                }, errorDispatch);
                            } else {
                                // Use refactored ESP.
                                completeDispatch(true);
                            }
                        }, errorDispatch);
                    } catch (err) {
                        // If an exception is thrown, don't use the refactored ESP.
                        CloudExperienceHost.Telemetry.logEvent("AutoPilot_ShouldUseRefactoredEspAndShouldShowEsp_GetShouldSkipAsyncFailed", JSON.stringify({ error: err }));
                        completeDispatch(false);
                    }
                });
            }
            ShouldUseRefactoredEspAndShouldShowEsp.getShouldSkipAsync = getShouldSkipAsync;
        })(ShouldUseRefactoredEspAndShouldShowEsp = AutoPilot.ShouldUseRefactoredEspAndShouldShowEsp || (AutoPilot.ShouldUseRefactoredEspAndShouldShowEsp = {}));

        var ShouldSkipAutoPilotUpdate;
        (function (ShouldSkipAutoPilotUpdate) {
            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.isLocalProfileAvailableAsync().then(function (result) {
                            // If we have a profile, check if update is enabled (absence of this policy means enabled by default)
                            if (result) {
                                EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getDwordPolicyAsync("CloudAssignedAutopilotUpdateDisabled").then(function (isDisabledResult) {
                                    CloudExperienceHost.Telemetry.logEvent(isDisabledResult !== 0 ? "AutoPilot_ShouldSkipAutoPilotUpdate_SkippingBecauseDisabled" : "AutoPilot_ShouldSkipAutoPilotUpdate_NoSkippingBecauseEnabled");
                                    completeDispatch(isDisabledResult !== 0); // return we should skip if update is explicitly disabled
                                }, function (err) {
                                    CloudExperienceHost.Telemetry.logEvent("Autopilot_AutoPilotUpdatePage_GetShouldSkipOptOutAsyncFailed", JSON.stringify({ error: err }));
                                    completeDispatch(true); 
                                });
                            }
                            else {
                                CloudExperienceHost.Telemetry.logEvent("AutoPilot_ShouldSkipAutoPilotUpdate_Skipping");
                                completeDispatch(true); // return we should skip if we don't have AP profile
                            }
                        }, errorDispatch);
                    } catch (err) {
                        // If an exception is thrown, skip the update page and resume through the Consumer OOBE flow
                        CloudExperienceHost.Telemetry.logEvent("Autopilot_AutoPilotUpdatePage_GetShouldSkipAsyncFailed", JSON.stringify({ error: err }));
                        completeDispatch(true);
                    }
                });
            }
            ShouldSkipAutoPilotUpdate.getShouldSkipAsync = getShouldSkipAsync;
        })(ShouldSkipAutoPilotUpdate = AutoPilot.ShouldSkipAutoPilotUpdate || (AutoPilot.ShouldSkipAutoPilotUpdate = {}));

        var ShouldSkipPostEnrollmentAutopilotUpdate;
        (function (ShouldSkipPostEnrollmentAutopilotUpdate) {
            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        CloudExperienceHost.Telemetry.logEvent("StartPostEnrollmentShouldSkipCheck");
                        let shouldCheckForUpdates = ModernDeployment.Autopilot.Core.AutopilotAgility().shouldCheckForUpdatesPostEnrollment;
                        CloudExperienceHost.Telemetry.logEvent(shouldCheckForUpdates ? "Autopilot_Agility_NotSkippingPostEnrollmentUpdate" : "Autopilot_Agility_SkippingPostEnrollmentUpdate");
                        // If we want updates we don't want to skip this page
                        // IE: If shouldCheckForUpdates == true want to return false
                        completeDispatch(!shouldCheckForUpdates);
                    } catch (err) {
                        // If an exception is thrown, skip the update page.
                        CloudExperienceHost.Telemetry.logEvent("Autopilot_Agility_ShouldSkipPostEnrollmentAutopilotUpdateFailed", JSON.stringify({ error: err }));
                        completeDispatch(true);
                    }
                });
            }
            ShouldSkipPostEnrollmentAutopilotUpdate.getShouldSkipAsync = getShouldSkipAsync;
        })(ShouldSkipPostEnrollmentAutopilotUpdate = AutoPilot.ShouldSkipPostEnrollmentAutopilotUpdate || (AutoPilot.ShouldSkipPostEnrollmentAutopilotUpdate = {}));

        var ShouldSkipDeviceRename;
        (function (ShouldSkipDeviceRename) {
            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    checkIfShouldSkipAsync().then(completeDispatch, errorDispatch);
                });
            }

            async function checkIfShouldSkipAsync() {
                try {
                    // Get the CloudAssignedDeviceName policy
                    let deviceName = await EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getStringPolicyAsync("CloudAssignedDeviceName");

                    // If policy is empty or null, skip device rename
                    if ((deviceName === null) || (deviceName === "")) {
                        CloudExperienceHost.Telemetry.logEvent("ShouldSkipDeviceRename.checkIfShouldSkipAsync: Info: No device name specified. Skipping Autopilot device rename.");
                        return true;
                    } else {
                        let deviceNameLastProcessed = await EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getStringPolicyAsync("CloudAssignedDeviceNameLastProcessed");
                        if (deviceName === deviceNameLastProcessed) {
                            CloudExperienceHost.Telemetry.logEvent("ShouldSkipDeviceRename.checkIfShouldSkipAsync: Info: Autopilot device rename has already been set. Skipping device rename.");
                            return true;
                        }
                        return false;
                    }
                } catch (err) {
                    // If an exception is thrown, skip the rename page and resume through the Consumer OOBE flow
                    CloudExperienceHost.Telemetry.logEvent("ShouldSkipDeviceRename.checkIfShouldSkipAsync: Failure: AutoPilotDeviceRename preload check failed. Skipping Autopilot device rename.", JSON.stringify(err));
                    return true;
                }
            }
            ShouldSkipDeviceRename.getShouldSkipAsync = getShouldSkipAsync;
        })(ShouldSkipDeviceRename = AutoPilot.ShouldSkipDeviceRename || (AutoPilot.ShouldSkipDeviceRename = {}));

        var Activation;
        (function (Activation) {
            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        // Bypass the Mandatory Connectivity page for non-Commercial SKUs.
                        if (CloudExperienceHostAPI.UtilStaticsCore.getLicensingPolicyValue("WorkstationService-DomainJoinEnabled") === 0) {
                            CloudExperienceHost.Telemetry.logEvent("Autopilot_ActivationPage_PreLoadCheckCompleted_SkippingDueToUnsupportedSku");
                            completeDispatch(true);
                        } else {
                            CloudExperienceHostAPI.UtilStaticsCore.isNetworkRequiredAsync().then(function (result) {
                                CloudExperienceHost.Telemetry.logEvent(result ? "AutoPilot_ActivationPage_PreLoadCheckCompleted_NoSkipping" : "AutoPilot_ActivationPage_PreLoadCheckCompleted_Skipping");
                                completeDispatch(!result);
                            }, errorDispatch);
                        }
                    } catch (err) {
                        CloudExperienceHost.Telemetry.logEvent("AutoPilot_ActivationPage_PreLoadCheckFailed", JSON.stringify(err));
                        completeDispatch(true);
                    }

                });
            }
            Activation.getShouldSkipAsync = getShouldSkipAsync;
        })(Activation = AutoPilot.Activation || (AutoPilot.Activation = {}));

        var AutopilotWrapper;
        (function (AutopilotWrapper) {
            function GetCurrentNode() {
                return CloudExperienceHost.getCurrentNode();
            }
            AutopilotWrapper.GetCurrentNode = GetCurrentNode;
        })(AutopilotWrapper = AutoPilot.AutopilotWrapper || (AutoPilot.AutopilotWrapper = {}));

        var EnrollmentStatusPage;
        (function (EnrollmentStatusPage) {
            function showMdmSyncStatusPageAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    var context = CloudExperienceHost.getContext();
                    var host = context.host.toLowerCase();
                    if (host === "mosetmdmconnecttoworkprogress" || host === "mosetmdmconnecttoworkprovisioningprogress") {
                        completeDispatch(1);
                    }

                    if ((CloudExperienceHost.getCurrentNode().cxid === "ManagementProgress") ||
                        (CloudExperienceHost.getCurrentNode().cxid === "MDMProgressForPlugAndForget") ||
                        (CloudExperienceHost.getCurrentNode().cxid === "AutopilotEnrollmentStatus")){
                        completeDispatch(1);
                    }

                    // For Autopilot WG DJ++ scenario, we want to always show ESP
                    let autopilotManager = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();
                    autopilotManager.getDeviceAutopilotModeAsync().then(function (result) {
                        CloudExperienceHost.Telemetry.logEvent("Autopilot_EnrollmentStatusPage_showMdmSyncStatusPageAsync_getDeviceAutopilotModeAsync", result);

                        if (result === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP) {
                            completeDispatch(1);
                        }
                    });

                    var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                    if (host === "mosetmamconnecttowork" || host === "mosetmdmconnecttowork" || host === "mosetconnecttowork" || host === "nthaadormdm" || host === "nthentormdm") {
                        enterpriseManagementWorker.showMdmSyncStatusPageAsync(false).then(completeDispatch, errorDispatch);
                    } else {
                        enterpriseManagementWorker.showMdmSyncStatusPageAsync(true).then(completeDispatch, errorDispatch);
                    }
                });
            }
            AutoPilot.EnrollmentStatusPage.showMdmSyncStatusPageAsync = showMdmSyncStatusPageAsync;

            function runProvisioningInStatusPageAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    var platform = CloudExperienceHost.Environment.getPlatform();
                    if (platform === CloudExperienceHost.TargetPlatform.DESKTOP) {
                        // This will fail on WCOS devices as provisioning is only available on desktop
                        let pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
                        let isAutopilotReset = pluginManager.isPostPowerwash();

                        // Run provisioning after Autopilot Reset or for Plug and Forget (self-deploying) modes
                        if ((isAutopilotReset) ||
                            (CloudExperienceHost.getCurrentNode().cxid === "MDMProgressForPlugAndForget")) {
                            completeDispatch(1);
                        } else {
                            completeDispatch(0);
                        }
                    } else {
                        completeDispatch(0);
                    }
                });
            }
            AutoPilot.EnrollmentStatusPage.runProvisioningInStatusPageAsync = runProvisioningInStatusPageAsync;

            function restoreMDMSyncTasks() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    var platform = CloudExperienceHost.Environment.getPlatform();
                    if (platform === CloudExperienceHost.TargetPlatform.DESKTOP) {
                        // This will fail on WCOS devices as provisioning is only available on desktop
                        let pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
                        let isAutopilotReset = pluginManager.isPostPowerwash();

                        // Restore MDM sync tasks after Autopilot Reset
                        if (isAutopilotReset) {
                            completeDispatch(1);
                        } else {
                            completeDispatch(0);
                        }
                    } else {
                        completeDispatch(0);
                    }
                });
            }
            AutoPilot.EnrollmentStatusPage.restoreMDMSyncTasks = restoreMDMSyncTasks;

            function forceInclusiveCSS(appRoot) {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    var context = CloudExperienceHost.getContext();
                    context.host = "frx";
                    context.experienceName = "FRXINCLUSIVE";
                    context.personality = CloudExperienceHost.TargetPersonality.InclusiveBlue;
                    var cssList = CloudExperienceHost.GetCssList(appRoot, context);
                    completeDispatch(cssList);
                });
            }
            AutoPilot.EnrollmentStatusPage.forceInclusiveCSS = forceInclusiveCSS;

            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getSettingAsync("DPP.devicePreparationPageEnabled").then(
                        (result) => {
                            if ("true" === result) {
                                // Device Preparation page is enabled, and so skip the ESP.
                                completeDispatch(true);
                            } else {
                                let context = CloudExperienceHost.getContext();
                                let isRunInOOBE = (context.host.toLowerCase() !== "nthentormdm" && context.host.toLowerCase() !== "nthaadormdm");

                                // Do not skip user ESP if it we're navigating back from the troubleshooting page.
                                var sourcePageCxid = (CloudExperienceHost.getCurrentNode()) !== null ? CloudExperienceHost.getCurrentNode().cxid.toLowerCase() : "";
                                var diagnosticsPreviousCxid = CloudExperienceHost.Storage.SharableData.getValue("DiagnosticsPreviousCXID");
                                if ((diagnosticsPreviousCxid === undefined) || (diagnosticsPreviousCxid === null)) {
                                    diagnosticsPreviousCxid = "";
                                }

                                CloudExperienceHost.Telemetry.logEvent(`Autopilot_EnrollmentStatusPage_getShouldSkipAsync_Info:SkippedMDMPage: isRunInOOBE = ${isRunInOOBE}, cxid = ${sourcePageCxid}, diagnosticsPreviousCxid = ${diagnosticsPreviousCxid}`);

                                // The user ESP can be disabled upon completion by policy, so in order to allow navigation back to the user ESP from the Diagnostics page,
                                // we check that we're coming from a TS (or error) page (cxid), and that DiagnosticsPreviousCXID value says we came from the user ESP (note the 
                                // DiagnosticsPreviousCXID is not cleared, so the condition of coming from the TS page is important.
                                if ((isRunInOOBE === false) && (sourcePageCxid == "oobediagnostics" || sourcePageCxid == "oobediagnosticslite" || sourcePageCxid == "oobeerror") && (diagnosticsPreviousCxid.toLowerCase() === "mdmprogressrefactored")) {
                                    CloudExperienceHost.Telemetry.logEvent("Autopilot_EnrollmentStatusPage_getShouldSkipAsync_Info:SkippedMDMPage: Returning from Diagnostics page, so don't skip.");
                                    completeDispatch(false);
                                } else {
                                    let enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();

                                    return enterpriseManagementWorker.showMdmSyncStatusPageAsync(isRunInOOBE).then(function (results) {
                                        CloudExperienceHost.Telemetry.logEvent("Autopilot_EnrollmentStatusPage_getShouldSkipAsync_Info:SkippedMDMPage", isRunInOOBE);

                                        // For Autopilot WG DJ++ scenario, we want to always show ESP
                                        let autopilotServer = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();

                                        autopilotServer.getDeviceAutopilotModeAsync().then(function (autopilotMode) {
                                            let isWhiteGloveDJPP = (autopilotMode === EnterpriseDeviceManagement.Service.AutoPilot.AutopilotMode.whiteGloveDJPP);

                                            if (1 === results || isWhiteGloveDJPP) {
                                                completeDispatch(false);
                                            } else {
                                                completeDispatch(true);
                                            }
                                        });
                                    }, errorDispatch);
                                }
                            }
                        },
                        errorDispatch);
                });
            }
            AutoPilot.EnrollmentStatusPage.getShouldSkipAsync = getShouldSkipAsync;

            function setStatusPageReboot() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    var pageName = CloudExperienceHost.getCurrentNode().cxid;
                    var cxidToMatch = CloudExperienceHost.Storage.SharableData.getValue("MDMRebootPossible");
                    CloudExperienceHost.Telemetry.logEvent(`Autopilot_EnrollmentStatusPage_setStatusPageReboot: Initializing persistent reboot settings. Current CXID: ${pageName}`);
                    if ((pageName === cxidToMatch) && (pageName !== "MDMProgressForPlugAndForget") && (pageName !== "AutopilotEnrollmentStatus") && pageName !== ("MDMProgressForPlugAndForgetRefactored")) {
                        // If we've seen this page before, we are rebooting, so we need to clear AutoLogin information.  Best effort.
                        try {
                            CloudExperienceHost.Telemetry.logEvent("Autopilot_EnrollmentStatusPage_setStatusPageReboot: Clearing Autologon credentials");
                            var enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
                            enterpriseManagementWorker.clearAutoLoginData();
                        } catch (e) {
                            CloudExperienceHost.Telemetry.logEvent("Autopilot_EnrollmentStatusPage_setStatusPageReboot: Error occured while clearing Autologon credentials", JSON.stringify({ error: e }));
                        }
                    }
                    CloudExperienceHost.setRebootForOOBE(pageName);
                    CloudExperienceHost.Storage.SharableData.addValue("OOBEResumeEnabled", true);
                    CloudExperienceHost.Storage.SharableData.addValue("MDMRebootPossible", pageName);
                    completeDispatch(true);
                });
            }
            AutoPilot.EnrollmentStatusPage.setStatusPageReboot = setStatusPageReboot;
        })(EnrollmentStatusPage = AutoPilot.EnrollmentStatusPage || (AutoPilot.EnrollmentStatusPage = {}));

        var Veto;
        (function (Veto) {
            function getShouldSkipAsync() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    try {
                        EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getOobeSettingsOverrideAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotOobeSetting.aadAuthUsingDeviceTicket).then(function (useDeviceTicketForAadAuth) {
                            // True - Show the Autopilot Veto page
                            // False - Skip the Autopilot Veto page
                            completeDispatch(!useDeviceTicketForAadAuth);
                        }, errorDispatch);
                    } catch (err) {
                        // If an exception is thrown, skip the Plug and Forget flow and resume through the Consumer OOBE flow
                        CloudExperienceHost.Telemetry.logEvent("Autopilot_Veto_GetShouldSkipAsyncFailed", JSON.stringify({ error: err }));
                        completeDispatch(true);
                    }
                });
            }
            Veto.getShouldSkipAsync = getShouldSkipAsync;
        })(Veto = AutoPilot.Veto || (AutoPilot.Veto = {}));

        function isDevicePlugAndForgetAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getOobeSettingsOverrideAsync(EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotOobeSetting.aadAuthUsingDeviceTicket).then(function (result) {
                    // If result is true, proceed with the Plug and Forget Scenario. Else, proceed with the normal flow.
                    completeDispatch(result);
                }, function (e) {
                    // Default to normal flow
                    completeDispatch(false);
                });
            });
        }
        AutoPilot.isDevicePlugAndForgetAsync = isDevicePlugAndForgetAsync;

        function disableAutoPilotAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.disableAsync().then(function () {
                    CloudExperienceHost.setRebootForOOBE();
                    completeDispatch(true);
                });
            });
        }
        AutoPilot.disableAutoPilotAsync = disableAutoPilotAsync;

        function getDwordPolicyAsync(policyName) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getDwordPolicyAsync(policyName).done(completeDispatch, errorDispatch);
            });
        }
        AutoPilot.getDwordPolicyAsync = getDwordPolicyAsync;

        function getStringPolicyAsync(policyName) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getStringPolicyAsync(policyName).done(completeDispatch, errorDispatch);
            });
        }
        AutoPilot.getStringPolicyAsync = getStringPolicyAsync;

        function getStringSettingAsync(policyName) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getSettingAsync(policyName).done(completeDispatch, errorDispatch);
            });
        }
        AutoPilot.getStringSettingAsync = getStringSettingAsync;

        function getDeviceAutopilotModeAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getDeviceAutopilotModeAsync().done(completeDispatch, errorDispatch);
            });
        }
        AutoPilot.getDeviceAutopilotModeAsync = getDeviceAutopilotModeAsync;

        // This function creates the query string part of the URL to pass-in the ZTD tenant name to eSTS.
        // This is required to be passed-in up front as opposed to using the CXH bridge since the branding elements are burned into the page upon generation.
        function getZTDQueryStringAsync() {
            return EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getStringPolicyAsync("CloudAssignedTenantDomain").then(function (result) {
                let ztdQueryString = "";
                if (result) {
                    ztdQueryString += "ztd_tenant=" + encodeURIComponent(result); 
                }

                return ztdQueryString;
            });
        }
        AutoPilot.getZTDQueryStringAsync = getZTDQueryStringAsync;

        // Resource creation function for just Autopilot OOBE pages
        function makeAutopilotResourceObject() {
            var resources = {};

            let resourceManager = ModernDeployment.Autopilot.Core.AutopilotLocalizationResourcesHelper.getAutopilotSystemResourceManager();
            let resourceMap = resourceManager.mainResourceMap.getSubtree("ModernDeployment.Autopilot.Core.AutopilotSystemResources\\Autopilot");
            let currentAppContext = Windows.ApplicationModel.Resources.Core.ResourceContext.getForCurrentView();
            let clonedSystemContext = resourceManager.defaultContext.clone();

            // The resource map needs to use clonedSystemContext as the currentAppContext is from a different resource manager.
            // To use the correct app context we need to manually copy the qualiferValues over to a context object created by our
            // system resource manager. (We have to use the system resource manager to load the autopilot system resource.)
            clonedSystemContext.qualifierValues.AlternateForm = currentAppContext.qualifierValues.AlternateForm;
            clonedSystemContext.qualifierValues.Configuration = currentAppContext.qualifierValues.Configuration;
            clonedSystemContext.qualifierValues.Contrast = currentAppContext.qualifierValues.Contrast;
            clonedSystemContext.qualifierValues.Custom = currentAppContext.qualifierValues.Custom;
            clonedSystemContext.qualifierValues.DeviceFamily = currentAppContext.qualifierValues.DeviceFamily;
            clonedSystemContext.qualifierValues.DXFeatureLevel = currentAppContext.qualifierValues.DXFeatureLevel;
            clonedSystemContext.qualifierValues.HomeRegion = currentAppContext.qualifierValues.HomeRegion;
            clonedSystemContext.qualifierValues.Language = currentAppContext.qualifierValues.Language;
            clonedSystemContext.qualifierValues.LayoutDirection = currentAppContext.qualifierValues.LayoutDirection;
            clonedSystemContext.qualifierValues.Scale = currentAppContext.qualifierValues.Scale;
            clonedSystemContext.qualifierValues.TargetSize = currentAppContext.qualifierValues.TargetSize;
            clonedSystemContext.qualifierValues.Theme = currentAppContext.qualifierValues.Theme;

            let iter = resourceMap.first();
            while (iter.hasCurrent) {
                resources[iter.current.key] = iter.current.value.resolve(clonedSystemContext).valueAsString;
                iter.moveNext();
            }
            return JSON.stringify(resources);
        }
        AutoPilot.makeAutopilotResourceObject = makeAutopilotResourceObject;

        function internalLogEvent(eventName, errorCode, eventMessage, eventMetadata) {
            var c_message = "message";
            var c_errorCode = "errorCode";
        
            if ((eventMetadata === null) || (eventMetadata === undefined) || (typeof(eventMetadata) !== "object")) {
                eventMetadata = {};
            }
        
            if ((eventMessage === null) || (eventMessage === undefined) || (typeof(eventMessage) !== "string")) {
              eventMetadata[c_message] = "";
            } else {
              eventMetadata[c_message] = eventMessage;
            }
        
            if ((errorCode === null) || (errorCode === undefined) || (typeof(errorCode) !== "number")) {
              eventMetadata[c_errorCode] = 0;
            } else {
              eventMetadata[c_errorCode] = errorCode;
            }

            CloudExperienceHost.Telemetry.safeLogEvent(eventName, eventMetadata);
        }
        AutoPilot.internalLogEvent = internalLogEvent;

        function logInfoEvent(eventName, eventMessage) {
            internalLogEvent(eventName, null, eventMessage, null);
        }
        AutoPilot.logInfoEvent = logInfoEvent;

        function logHresultEvent(eventName, eventMessage, hresult) {
            internalLogEvent(eventName, hresult, eventMessage, null);
        }
        AutoPilot.logHresultEvent = logHresultEvent;

    })(AutoPilot = CloudExperienceHost.AutoPilot || (CloudExperienceHost.AutoPilot = {}));

    var AutopilotShouldSkipInDesktopLite;
    (function (AutopilotShouldSkipInDesktopLite) {
        function getShouldSkipAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var context = CloudExperienceHost.getContext();
                completeDispatch(context.personality === CloudExperienceHost.TargetPersonality.LiteWhite);
            });
        }
        AutopilotShouldSkipInDesktopLite.getShouldSkipAsync = getShouldSkipAsync;
    })(AutopilotShouldSkipInDesktopLite = AutoPilot.AutopilotShouldSkipInDesktopLite || (AutoPilot.AutopilotShouldSkipInDesktopLite = {}));

    var DevicePreparationPage;
    (function (DevicePreparationPage) {
        function getShouldSkipAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                try {
                    EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getSettingAsync("DPP.devicePreparationPageEnabled").then(
                        (result) => {
                            if ("true" === result) {
                                // Device Preparation page is enabled, and so don't skip.
                                completeDispatch(false);
                            } else {
                                completeDispatch(true);
                            }
                        },
                        errorDispatch);
                } catch (err) {
                    // If an exception is thrown, don't enable the Device Preparation page.
                    CloudExperienceHost.Telemetry.logEvent("Autopilot_DevicePreparationPage_getShouldSkipAsyncFailed", JSON.stringify({ error: err }));
                    completeDispatch(true);
                }
            });
        }
        DevicePreparationPage.getShouldSkipAsync = getShouldSkipAsync;

        function setResumeToCurrentPageAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                try {
                    let pageId = CloudExperienceHost.getCurrentNode().cxid;

                    CloudExperienceHost.setRebootForOOBE(pageId);

                    CloudExperienceHost.Storage.SharableData.addValue("OOBEResumeEnabled", true);

                    CloudExperienceHost.Telemetry.logEvent("Autopilot_DevicePreparationPage_setResumeToCurrentPageAsyncSucceeded");

                    completeDispatch(true);

                } catch (err) {
                    CloudExperienceHost.Telemetry.logEvent("Autopilot_DevicePreparationPage_setResumeToCurrentPageAsyncFailed", JSON.stringify({ error: err }));
                    completeDispatch(false);
                }
            });
        }
        DevicePreparationPage.setResumeToCurrentPageAsync = setResumeToCurrentPageAsync;

        function unsetResumeToCurrentPageAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                try {
                    CloudExperienceHost.Storage.SharableData.removeValue("shouldRebootForOOBE")
                    CloudExperienceHost.Storage.SharableData.removeValue("resumeCXHId");
                    CloudExperienceHost.Storage.SharableData.removeValue("OOBEResumeEnabled");

                    CloudExperienceHost.Telemetry.logEvent("Autopilot_DevicePreparationPage_unsetResumeToCurrentPageAsyncSucceeded");

                    completeDispatch(true);

                } catch (err) {
                    CloudExperienceHost.Telemetry.logEvent("Autopilot_DevicePreparationPage_unsetResumeToCurrentPageAsyncFailed", JSON.stringify({ error: err }));
                    completeDispatch(false);
                }
            });
        }
        DevicePreparationPage.unsetResumeToCurrentPageAsync = unsetResumeToCurrentPageAsync;

    })(DevicePreparationPage = AutoPilot.DevicePreparationPage || (AutoPilot.DevicePreparationPage = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
