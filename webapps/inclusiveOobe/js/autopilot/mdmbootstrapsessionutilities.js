//
// Copyright (C) Microsoft. All rights reserved.
//

"use strict";

define([
    'autopilot/bootstrapSessionGeneralUtilities',
    'autopilot/commercialDiagnosticsUtilities'], (
    bootstrapSessionGeneralUtilities,
    commercialDiagnosticsUtilities) => {
    class mdmBootstrapSessionUtilities {
        constructor(resourceStrings, isDeviceBootstrapSession, sessionUtilities) {
            // Constants
            this.RESOURCE_TO_TRACK_POLICIES = 0;
            this.RESOURCE_TO_TRACK_NETWORK_PROFILES = 1;
            this.RESOURCE_TO_TRACK_APPLICATIONS = 2;
            this.RESOURCE_TO_TRACK_CERTIFICATES = 3;

            // Private member variables
            this.resourceStrings = resourceStrings;
            this.isDeviceBootstrapSession = isDeviceBootstrapSession;
            this.sessionUtilities = sessionUtilities;
            this.commercialDiagnosticsUtilities = new commercialDiagnosticsUtilities();
        }

        // Private methods
        logProvisioningStarted(resourceToTrack) {
            switch (resourceToTrack) {
                case this.RESOURCE_TO_TRACK_POLICIES:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_PoliciesInstallation_Started" : "CommercialOOBE_ESPAccountSetup_PoliciesInstallation_Started",
                        "BootstrapStatus: Beginning policies application tracking.");
                    break;
                case this.RESOURCE_TO_TRACK_NETWORK_PROFILES:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_NetworkProfilesInstallation_Started" : "CommercialOOBE_ESPAccountSetup_NetworkProfilesInstallation_Started",
                        "BootstrapStatus: Beginning network profiles application tracking.");
                    break;
                case this.RESOURCE_TO_TRACK_APPLICATIONS:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_ApplicationsInstallation_Started" : "CommercialOOBE_ESPAccountSetup_ApplicationsInstallation_Started",
                        "BootstrapStatus: Beginning apps installation tracking.");
                    break;
                case this.RESOURCE_TO_TRACK_CERTIFICATES:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_CertificatesInstallation_Started" : "CommercialOOBE_ESPAccountSetup_CertificatesInstallation_Started",
                        "BootstrapStatus: Beginning certificates installation tracking.");
                    break;
                default:
                    break;
            }
        }
    
        logProvisioningSucceeded(resourceToTrack) {
            switch (resourceToTrack) {
                case this.RESOURCE_TO_TRACK_POLICIES:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_PoliciesInstallation_Succeeded" : "CommercialOOBE_ESPAccountSetup_PoliciesInstallation_Succeeded",
                        "BootstrapStatus: Policies application completed successfully.");
                    break;
                case this.RESOURCE_TO_TRACK_NETWORK_PROFILES:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_NetworkProfilesInstallation_Succeeded" : "CommercialOOBE_ESPAccountSetup_NetworkProfilesInstallation_Succeeded",
                        "BootstrapStatus: Network profiles application completed successfully.");
                    break;
                case this.RESOURCE_TO_TRACK_APPLICATIONS:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_ApplicationsInstallation_Succeeded" : "CommercialOOBE_ESPAccountSetup_ApplicationsInstallation_Succeeded",
                        "BootstrapStatus: Apps installation succeeded successfully.");
                    break;
                case this.RESOURCE_TO_TRACK_CERTIFICATES:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_CertificatesInstallation_Succeeded" : "CommercialOOBE_ESPAccountSetup_CertificatesInstallation_Succeeded",
                        "BootstrapStatus: Certificates installation completed successfully.");
                    break;
                default:
                    break;
            }
        }
    
        logProvisioningError(resourceToTrack, errorCode) {
            let hexErrorCodeString = this.commercialDiagnosticsUtilities.formatNumberAsHexString(errorCode, 8);
    
            switch (resourceToTrack) {
                case this.RESOURCE_TO_TRACK_POLICIES:
                    this.commercialDiagnosticsUtilities.logHresultEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_PoliciesInstallation_Failed" : "CommercialOOBE_ESPAccountSetup_PoliciesInstallation_Failed",
                        `BootstrapStatus: An error occured during policy application. Error = ${hexErrorCodeString}`,
                        errorCode);
                    break;
                case this.RESOURCE_TO_TRACK_NETWORK_PROFILES:
                    this.commercialDiagnosticsUtilities.logHresultEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_NetworkProfilesInstallation_Failed" : "CommercialOOBE_ESPAccountSetup_NetworkProfilesInstallation_Failed",
                        `BootstrapStatus: An error occured during network profile application. Error = ${hexErrorCodeString}`,
                        errorCode);
                    break;
                case this.RESOURCE_TO_TRACK_APPLICATIONS:
                    this.commercialDiagnosticsUtilities.logHresultEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_ApplicationsInstallation_Failed" : "CommercialOOBE_ESPAccountSetup_ApplicationsInstallation_Failed",
                        `BootstrapStatus: An error occured during app installation. Error = ${hexErrorCodeString}`,
                        errorCode);
                    break;
                case this.RESOURCE_TO_TRACK_CERTIFICATES:
                    this.commercialDiagnosticsUtilities.logHresultEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_CertificatesInstallation_Failed" : "CommercialOOBE_ESPAccountSetup_CertificatesInstallation_Failed",
                        `BootstrapStatus: An error occured during certificate installation. Error = ${hexErrorCodeString}`,
                        errorCode);
                    break;
                default:
                    break;
            }
        }

        getProvisioningIncompleteEventId(resourceToTrack) {
            switch (resourceToTrack) {
                case this.RESOURCE_TO_TRACK_POLICIES:
                    return this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_PoliciesInstallation_Incomplete" : "CommercialOOBE_ESPAccountSetup_PoliciesInstallation_Incomplete";
                case this.RESOURCE_TO_TRACK_NETWORK_PROFILES:
                    return this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_NetworkProfilesInstallation_Incomplete" : "CommercialOOBE_ESPAccountSetup_NetworkProfilesInstallation_Incomplete";
                case this.RESOURCE_TO_TRACK_APPLICATIONS:
                    return this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_ApplicationsInstallation_Incomplete" : "CommercialOOBE_ESPAccountSetup_ApplicationsInstallation_Incomplete";
                case this.RESOURCE_TO_TRACK_CERTIFICATES:
                    return this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_CertificatesInstallation_Incomplete" : "CommercialOOBE_ESPAccountSetup_CertificatesInstallation_Incomplete";
                default:
                    return this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_UnexpectedEventId" : "CommercialOOBE_ESPAccountSetup_UnexpectedEventId";
            }
        }
        
        logProvisioningSkipped(resourceToTrack) {
            switch (resourceToTrack) {
                case this.RESOURCE_TO_TRACK_POLICIES:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_PoliciesInstallation_Skipped" : "CommercialOOBE_ESPAccountSetup_PoliciesInstallation_Skipped",
                        `BootstrapStatus: Monitoring policies. Nothing to monitor.`);
                    break;
                case this.RESOURCE_TO_TRACK_NETWORK_PROFILES:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_NetworkProfilesInstallation_Skipped" : "CommercialOOBE_ESPAccountSetup_NetworkProfilesInstallation_Skipped",
                        `BootstrapStatus: Monitoring network profiles. Nothing to monitor.`);
                    break;
                case this.RESOURCE_TO_TRACK_APPLICATIONS:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_ApplicationsInstallation_Skipped" : "CommercialOOBE_ESPAccountSetup_ApplicationsInstallation_Skipped",
                        `BootstrapStatus: Monitoring apps. Nothing to monitor.`);
                    break;
                case this.RESOURCE_TO_TRACK_CERTIFICATES:
                    this.commercialDiagnosticsUtilities.logInfoEvent(
                        this.sessionUtilities.runningInOobe() ? "CommercialOOBE_ESPDeviceSetup_CertificatesInstallation_Skipped" : "CommercialOOBE_ESPAccountSetup_CertificatesInstallation_Skipped",
                        `BootstrapStatus: Monitoring certificates. Nothing to monitor.`);
                    break;
                default:
                    break;
            }
        }
        
        monitorGenericSettingsAsync(
            resourceToTrack,
            resourceName,
            progressCallbackAsync,
            progressStatusId) {

            return this.initializeStateAsync().then(() => {
                let targetContext = this.sessionUtilities.getTransientState(this.sessionUtilities.STATE_NAME_GLOBAL_MDM_PROGRESS_MODE);
                this.logProvisioningStarted(resourceToTrack);

                return this.sessionUtilities.enrollmentApis.pollForExpectedPoliciesAndResources(
                    resourceToTrack,
                    true,
                    targetContext).then((monitorData) => {

                    // Completion callback

                    this.policyCurrentProgress = monitorData.currentProgress;
                    this.policyExpectedEndValue = monitorData.expectedEndValue;

                    if (monitorData.expectedEndValue === -1) {

                        this.commercialDiagnosticsUtilities.logInfoEvent(
                            this.getProvisioningIncompleteEventId(resourceToTrack),
                            `BootstrapStatus: Monitoring ${resourceName} from management server failed. Expected ${monitorData.expectedEndValue} items provisioned, but got only ${monitorData.currentProgress}.`);
                           
                        // Error case: Final count of applied policies doesn't match expected count.
                        return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                            this.sessionUtilities.SUBCATEGORY_STATE_FAILED,
                            this.resourceStrings["BootstrapPageStatusFailed"]));

                    } else if (monitorData.expectedEndValue !== monitorData.currentProgress) {
                        if (monitorData.blockedByRequiredReboot) {
                            return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                                this.sessionUtilities.SUBCATEGORY_STATE_REBOOT_REQUIRED_AND_TRY_AGAIN,
                                null));
                        } else {
                            this.commercialDiagnosticsUtilities.logInfoEventDeprecated(`BootstrapStatus: Monitoring ${resourceName} from management server failed. Expected ${monitorData.expectedEndValue} items provisioned, but got only ${monitorData.currentProgress}.`);

                            // Error case: Final count of applied policies doesn't match expected count.
                            return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                                this.sessionUtilities.SUBCATEGORY_STATE_FAILED,
                                this.resourceStrings["BootstrapPageStatusFailed"]));
                        }
                    } else if (monitorData.expectedEndValue === 0) {
                        this.logProvisioningSkipped(resourceToTrack);

                        // Nothing to monitor
                        return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                            this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED,
                            this.resourceStrings["BootstrapPageStatusNoSetupNeeded"]));

                    } else {
                        this.logProvisioningSucceeded(resourceToTrack);

                        // Show the final "X/Y completed" message as the last thing the user sees, since
                        // it's useful for debugging and indicates full completion.
                        let messageString = this.commercialDiagnosticsUtilities.formatMessage(
                            this.resourceStrings[progressStatusId],
                            monitorData.currentProgress,
                            monitorData.expectedEndValue);

                        // Done monitoring
                        return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                            this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED,
                            messageString));
                    }
                },
                (e) => {
                    // Error callback
                    this.policyCurrentProgress = 0;
                    this.policyExpectedEndValue = -1;

                    // Error case
                    this.logProvisioningError(resourceToTrack, e.number);

                    // Done monitoring
                    return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                        this.sessionUtilities.SUBCATEGORY_STATE_FAILED,
                        this.commercialDiagnosticsUtilities.formatNumberAsHexString(e.number, 8)));

                }, (monitorData) => {
                    // Progress callback

                    if (monitorData.expectedEndValue === -1) {
                        // Identifying state
                        return progressCallbackAsync(this.resourceStrings["BootstrapPageStatusIdentifying"]);

                    } else if (monitorData.expectedEndValue === 0) {
                        // Nothing to monitor
                        return progressCallbackAsync(this.resourceStrings["BootstrapPageStatusNoSetupNeeded"]);

                    } else {
                        let messageString = this.commercialDiagnosticsUtilities.formatMessage(
                            this.resourceStrings[progressStatusId],
                            monitorData.currentProgress,
                            monitorData.expectedEndValue);

                        return progressCallbackAsync(messageString);
                    }
                });
            },
            (e) => {
                // Return failure indicator if this fails.
                return WinJS.Promise.as(this.sessionUtilities.createActionResult(
                    this.sessionUtilities.SUBCATEGORY_STATE_FAILED,
                    null));
            });
        }

        // Public methods

        monitorPoliciesApplicationAsync(progressCallbackAsync) {
            return this.monitorGenericSettingsAsync(
                this.RESOURCE_TO_TRACK_POLICIES,
                "policies",
                progressCallbackAsync,
                "BootstrapPageStatusXOfYApplied");
        }

        monitorCertsInstallationAsync(progressCallbackAsync) {
            return this.monitorGenericSettingsAsync(
                this.RESOURCE_TO_TRACK_CERTIFICATES, 
                "certificates", 
                progressCallbackAsync, 
                "BootstrapPageStatusXOfYApplied");
        }

        monitorNetworkProfilesConfigAsync(progressCallbackAsync) {
            return this.monitorGenericSettingsAsync(
                this.RESOURCE_TO_TRACK_NETWORK_PROFILES,
                "network profiles",
                progressCallbackAsync,
                "BootstrapPageStatusXOfYAdded");
        }

        monitorAppsInstallAsync(progressCallbackAsync) {
            return this.monitorGenericSettingsAsync(
                this.RESOURCE_TO_TRACK_APPLICATIONS,
                "apps",
                progressCallbackAsync,
                "BootstrapPageStatusXOfYInstalled");
        }

        initializeStateAsync() {
            return this.sessionUtilities.enrollmentApis.checkMDMProgressModeAsync().then((targetContext) => {
                targetContext = this.isDeviceBootstrapSession ? this.sessionUtilities.MDM_PROGRESS_MODE_DEVICE : targetContext;

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_MdmBootstrapSessionUtilities_State_Initialized",
                    `MDM target context: ${targetContext}`);

                this.sessionUtilities.storeTransientState(this.sessionUtilities.STATE_NAME_GLOBAL_MDM_PROGRESS_MODE, targetContext);
            },
            (e) => {
                // Error handler. Nothing to do.
            });
        }

        async initiateSyncSessionsAsync(exitCondition) {
            try {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_MdmBootstrapSessionUtilities_SyncSessions_Started",
                    `BootstrapStatus: Running sync sessions with exit condition ${exitCondition}`);
                await this.sessionUtilities.deviceManagementUtilities.runSyncSessionsAsync(exitCondition);
            } catch (e) {
                this.commercialDiagnosticsUtilities.logExceptionEvent(
                    "CommercialOOBE_MdmBootstrapSessionUtilities_SyncSessions_Failed",
                    `BootstrapStatus: Failed to run sync sessions with exit condition ${exitCondition}.`,
                    e);
            }
        }
    }

    return mdmBootstrapSessionUtilities;
});
