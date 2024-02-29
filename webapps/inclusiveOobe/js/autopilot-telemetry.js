//
// Copyright (C) Microsoft. All rights reserved.
//
define(['legacy/bridge'], (bridge) => {

    class AutopilotTelemetryUtility {
        logError(eventType, eventMessage) {
            return bridge.invoke("CloudExperienceHost.Telemetry.logEvent", eventType, eventMessage);
        }

        logErrorCode(eventType, errorCode) {
            return bridge.invoke("CloudExperienceHost.Telemetry.logEvent", eventType, errorCode);
        }
  
    }

    // The following strings should be unique and if the strings are updated then the telemetry reports that consume them should be updated in tandem. 
    return {
        whiteGloveError: {
            Error: "Autopilot white glove error",
            Network: "Autopilot white glove error: Network",
            Tpm: "Autopilot white glove error: TPM", 
            Reset: "Autopilot white glove error: Reset", 
            Diagnostics: "Autopilot white glove error: Diagnostics", 
            Shutdown: "Autopilot white glove error: Shutdown", 
            Enrollment: "Autopilot white glove error: Enrollment", 
            AutopilotReset: "Autopilot Reset flows"
        },
        whiteGloveWarning: {
            Diagnostics: "Autopilot white glove warning",
        },
        whiteGloveInformational: {
            Success: "Autopilot white glove success",
            Message: "Autopilot white glove message",
        },
        logger: new AutopilotTelemetryUtility()
    };
});
