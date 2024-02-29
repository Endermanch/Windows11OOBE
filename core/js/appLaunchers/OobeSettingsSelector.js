//
// Copyright (C) Microsoft. All rights reserved.
//

define(() => {
    class OOBESettingsSelector {
        launchAsync() {
            let self = this;
            return new WinJS.Promise((completeDispatch /*, errorDispatch, progressDispatch */) => {
                self.recordAadcApplicabilityBreadcrumbAsync( 1 /* breadcrumbValue */).then(() => {
                    CloudExperienceHost.AgeAppropriateDesignCode.Eligibility.shouldRestrictionsApplyToCurrentUserAsync().then((shouldRestrictionsApply) => {
                        if (shouldRestrictionsApply && (CloudExperienceHost.getContext().personality === CloudExperienceHost.TargetPersonality.LiteWhite)) {
                            // If AADC restrictions apply to the current user and we're running in a CXH flow with LiteWhite personality, go to the AADC settings page
                            completeDispatch(CloudExperienceHost.AppResult.action2);
                        } else {
                            // If AADC restrictions don't apply or we're running in a CXH flow with InclusiveBlue personality, choose between single-page and multi-page privacy settings
                            completeDispatch(self.selectPrivacySettingsPage());
                        }
                    }, (e) => {
                        // In error cases, choose between single-page and multi-page privacy settings
                        completeDispatch(self.selectPrivacySettingsPage());
                    });
                }, (e) => {
                    // In error cases, choose between single-page and multi-page privacy settings
                    completeDispatch(self.selectPrivacySettingsPage());
                });
            });
        }

        // Record an override for the "FirstLogonOnAadcCompliantInstallation" value written in LogonTasks
        // This applies specifically for the OOBE case, where the device could receive an update after the privacy settings page but before the first user logon
        recordAadcApplicabilityBreadcrumbAsync(breadcrumbValue) {
            return CloudExperienceHostAPI.UserIntentRecordCore.setIntentPropertyDWORDAsync("OobeSettingsSelector", "FirstLogonOnAadcCompliantInstallationOverride", breadcrumbValue);
        }

        selectPrivacySettingsPage() {
            return CloudExperienceHost.Globalization.GeographicRegion.isPrivacySensitiveRegion() ? CloudExperienceHost.AppResult.action1 : CloudExperienceHost.AppResult.success;
        }
    }
    return OOBESettingsSelector;
});
