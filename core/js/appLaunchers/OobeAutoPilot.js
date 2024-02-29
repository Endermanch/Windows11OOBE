//
// Copyright (C) Microsoft. All rights reserved.
//

define(['legacy/core'], (core) => {
    class OOBEAutoPilot {
        launchAsync(currentNode) {
            return new WinJS.Promise(async function (completeDispatch) {
                try {
                    const OS_DEFAULT = "os-default";
                    let autoPilot = new EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotServer();
                    switch (currentNode.policyName) {
                        // Set language
                        case "CloudAssignedLanguage":
                            try {
                                CloudExperienceHost.AutoPilot.logInfoEvent(
                                    "CommercialOOBE_AutopilotLanguage_SettingRetrieval_Started",
                                    "Retrieving Autopilot language settings policy.");

                                let policyValue = await autoPilot.getStringPolicyAsync(currentNode.policyName);

                                CloudExperienceHost.AutoPilot.logInfoEvent(
                                    "CommercialOOBE_AutopilotLanguage_SettingRetrieval_Succeeded",
                                    "Successfully retrieved Autopilot language settings policy.");

                                if (policyValue) {
                                    let languageManager = AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.OobeDisplayLanguageManagerCore");
                                    let languages = CloudExperienceHostAPI.OobeDisplayLanguagesCore.getDisplayLanguages();
                                    let policyLanguage = languages.find((language) => language.tag.localeCompare(policyValue, undefined, { sensitivity: 'base' }) === 0); // String-insensitive compare, allows accent marks to be treated the same if the same base

                                    // If no match on installed languages or policy value is "os-default", set to the first (defaulted) language in the list
                                    if ((!policyLanguage) ||
                                        (policyValue === OS_DEFAULT)) {
                                        policyLanguage = languages[0];
                                    }

                                    CloudExperienceHost.AutoPilot.logInfoEvent(
                                        "CommercialOOBE_AutopilotLanguage_SettingApplication_Started",
                                        "Applying Autopilot language settings policy.");

                                    languageManager.commitDisplayLanguageAsync(policyLanguage).action.done(() => {
                                        CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotLanguage_SettingApplication_Success", "Language set by AutoPilot policy");

                                        completeDispatch(CloudExperienceHost.AppResult.success);
                                    });
                                } else {
                                    completeDispatch(CloudExperienceHost.AppResult.success);
                                }
                            } catch (e) {
                                CloudExperienceHost.AutoPilot.logInfoEvent(
                                    "CommercialOOBE_AutopilotLanguage_SettingRetrieval_Failed",
                                    `Error getting Autopilot string policy '${currentNode.policyName}'`);
                                completeDispatch(CloudExperienceHost.AppResult.fail);
                            }
                            break;

                        // Set region
                        case "CloudAssignedRegion":
                            try {
                                CloudExperienceHost.AutoPilot.logInfoEvent(
                                    "CommercialOOBE_AutopilotRegion_SettingRetrieval_Started",
                                    "Retrieving Autopilot region settings policy.");

                                let policyValue = await autoPilot.getStringPolicyAsync(currentNode.policyName);

                                CloudExperienceHost.AutoPilot.logInfoEvent(
                                    "CommercialOOBE_AutopilotRegion_SettingRetrieval_Succeeded",
                                    "Successfully retrieved Autopilot region settings policy.");

                                if (policyValue) {
                                    let regionCode = policyValue;

                                    if (policyValue === OS_DEFAULT) {
                                        regionCode = CloudExperienceHost.Globalization.GeographicRegion.getCode().toLowerCase();
                                    }

                                    CloudExperienceHost.AutoPilot.logInfoEvent(
                                        "CommercialOOBE_AutopilotRegion_SettingApplication_Started",
                                        "Applying Autopilot region settings policy.");

                                    let regionManager = AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.OobeRegionManagerStaticsCore");
                                    let commitRegion = regionManager.commitRegionAsync(regionCode);
                                    commitRegion.action.done(() => {
                                        CloudExperienceHost.AutoPilot.logInfoEvent(
                                            "CommercialOOBE_AutopilotRegion_SettingApplication_Succeeded",
                                            "Region set by AutoPilot policy.");
                                        if (commitRegion.effects.rebootRequired) {
                                            CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotRegion_RebootRequired", "CommitRegionRebootRequired");
                                        }

                                        // Additionally, set the keyboard since language and region have already been established.
                                        // This avoids the necessity of creating another appLauncher node after OobeKeyboard
                                        // when we've already determined the keyboard(s) at this point.
                                        let keyboardManager = AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.OobeKeyboardManagerStaticsCore");
                                        let keyboards = CloudExperienceHostAPI.OobeKeyboardStaticsCore.getKeyboardsForDefaultInputLanguage();
                                        let defaultKeyboard = [keyboards[0]]; // Set to the first default keyboard in the list
                                        keyboardManager.commitKeyboardsAsync(defaultKeyboard).done(() => {
                                            CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotKeyboard_SettingApplication_Succeeded", "Keyboard set by AutoPilot policy");

                                            // Notify the chrome footer to update the input switch button
                                            CloudExperienceHost.setShowInputSwitchButton();

                                            completeDispatch(CloudExperienceHost.AppResult.success);
                                        }, (err) => {
                                            CloudExperienceHost.AutoPilot.logInfoEvent(
                                                "CommercialOOBE_AutopilotRegion_SettingApplication_Failed",
                                                "Failed to set region by AutoPilot policy.");
                                        });
                                    });
                                } else {
                                    completeDispatch(CloudExperienceHost.AppResult.success);
                                }
                            } catch (e) {
                                CloudExperienceHost.AutoPilot.logInfoEvent(
                                    "CommercialOOBE_AutopilotRegion_SettingRetrieval_Failed",
                                    `Error getting Autopilot string policy '${currentNode.policyName}'`);
                                completeDispatch(CloudExperienceHost.AppResult.fail);
                            }
                            break;

                        case "offlineCheck":
                            autoPilot.getStringPolicyAsync("CloudAssignedTenantId").then(function (policyValue) {
                                if ((policyValue === null) || (policyValue === "")) {
                                    // No valid autopilot profile since there is no valid Tenant ID in Autopilot profile.
                                    // success as "no autopilot profile"
                                    completeDispatch(CloudExperienceHost.AppResult.success);
                                } else {
                                    // Take action1, since there is a valid autopilot profile.
                                    completeDispatch(CloudExperienceHost.AppResult.action1);
                                }
                            }, function (err) {
                                completeDispatch(CloudExperienceHost.AppResult.abort);
                            });
                            break;

                        case "postReset":
                            let pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
                            let isAutopilotReset = pluginManager.isPostPowerwash();

                            // This tells the AAD sign in service to enable navigation to the Enterprise Provisioning page
                            CloudExperienceHost.Storage.SharableData.addValue("AADProvisioningPage", "OobeEnterpriseProvisioning");

                            if (isAutopilotReset === true) {
                                CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotPostReset_Flow_Entered", "Device is in a post Autopilot reset flow.");

                                let isHybridDomainJoinEnabled = (await EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getDwordPolicyAsync("CloudAssignedDomainJoinMethod") === 1);

                                if (isHybridDomainJoinEnabled) {
                                    // Skip Hybrid DJ
                                    CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotPostReset_DomainJoinFlow_Skipped", "Skipping domain join flow due to Autopilot reset.");
                                    completeDispatch(CloudExperienceHost.AppResult.action2);
                                } else {
                                    // Skip AAD registration
                                    CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotPostReset_AadRegistration_Skipped", "Skipping AAD registration flow due to Autopilot reset.");
                                    completeDispatch(CloudExperienceHost.AppResult.action1);
                                }
                            }
                            else {
                                let profileState = await EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getProfileStateAsync();

                                // If the device is Autopilot-registered, skip to the AAD sign-in page. Otherwise, navigate to the normal OOBE flow
                                if (EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotProfileState.available === profileState) {
                                    CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_Autopilot_Profile_Available", "Autopilot profile is available.");

                                    let enrollmentStaticApis = new EnterpriseDeviceManagement.Enrollment.ReflectedEnrollmentStatics();

                                    if (enrollmentStaticApis.ShouldSkip() === 1) {
                                        CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_Autopilot_Profile_NonHAADJ", "No Hybrid AADJ specified in the Autopilot profile. Move to AADJ sign-in.");

                                        completeDispatch(CloudExperienceHost.AppResult.action3);
                                    } else {
                                        CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_Autopilot_Profile_HAADJ", "Hybrid AADJ is specified in the Autopilot profile. Move to Hybrid AADJ sign-in.");

                                        completeDispatch(CloudExperienceHost.AppResult.success);
                                    }
                                } else {
                                    CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_Autopilot_Profile_Unavailable", "No Autopilot profile available.");
                                    completeDispatch(CloudExperienceHost.AppResult.success);
                                }
                            }

                            break;

                        case "prefetch":
                            CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotPreFetch_PolicyCache_Started", "AutoPilot prefetch ZTP policy cache started");
                            let startTime = performance.now();
                            let cxidOrResult = CloudExperienceHost.AppResult.success;
                            let clearAndPopulateZTPCachePromise = EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.clearDdsCacheAsync().then(() => {
                                CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotPreFetch_PolicyCache_Cleared", "AutoPilot policy cache cleared");
                            }).then(() => {
                                return EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.retrieveSettingsAsync();
                            }).then(() => {
                                let details = { timeElapsed: performance.now() - startTime };
                                CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotPreFetch_PolicyCache_Returned", "AutoPilot prefetch ZTP policy cache returned" + JSON.stringify(details));
                            }, (error) => {
                                CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotPreFetch_PolicyCache_Failed", "AutoPilot prefetch ZTP policy cache failed");
                            }).then(() => {
                                return EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getCXIDPostRebootAsync();
                            }).then((cxidToJumpTo) => {
                                const UpdateRebootCXIDKey = "UpdateRebootCXID";
                                if ((cxidToJumpTo !== null) && (cxidToJumpTo !== "")) {
                                    let lastResetWasFromAutopilotUpdate = CloudExperienceHost.Storage.SharableData.getValue("resetFromAutopilotUpdate");
                                    if (lastResetWasFromAutopilotUpdate) {
                                        cxidOrResult = cxidToJumpTo;
                                        CloudExperienceHost.Storage.SharableData.addValue("resetFromAutopilotUpdate", false);
                                        // Reset the UpdateRebootCXID node after it is used.
                                        return autoPilot.storeSettingAsync(UpdateRebootCXIDKey, "");
                                    }
                                }
                            });

                            // The ZTP call doesn't actually support cancellation and is basically fire-and-forget,
                            // but we wait up to 36 seconds for it to finish before moving on to give it adequate time to complete.
                            let timedOut = false;
                            let timeoutPromise = WinJS.Promise.timeout(36000 /*36 second timeout*/).then(() => { timedOut = true; });
                            WinJS.Promise.any([clearAndPopulateZTPCachePromise, timeoutPromise]).then((result) => {
                                if (timedOut) {
                                    CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotPreFetch_PolicyCache_TimedOut", "AutoPilot prefetch ZTP policy cache timed out");
                                } else {
                                    CloudExperienceHost.AutoPilot.logInfoEvent("CommercialOOBE_AutopilotPreFetch_PolicyCache_Success", "AutoPilot prefetch ZTP policy cache done");
                                }

                                completeDispatch(cxidOrResult);
                            }, function (err) {
                                completeDispatch(CloudExperienceHost.AppResult.fail);
                            });
                            break;

                        default:
                            completeDispatch(CloudExperienceHost.AppResult.success);
                            break;
                    }
                } catch (err) {
                    CloudExperienceHost.AutoPilot.logInfoEvent(
                        "CommercialOOBE_AutopilotPreFetch_AppLauncher_Failed",
                        `Failed to run app launcher Autopilot policy '${currentNode.policyName}' for node '${currentNode.cxid}'`);
                    completeDispatch(CloudExperienceHost.AppResult.fail);
                }
            });
        }
    }
    return OOBEAutoPilot;
});
