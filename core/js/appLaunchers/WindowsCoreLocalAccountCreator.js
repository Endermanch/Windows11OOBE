//
// Copyright (C) Microsoft. All rights reserved.
//

define(['legacy/core'], (core) => {
    class WindowsCoreLocalAccountCreator {
        launchAsync() {
            return CloudExperienceHostAPI.UserManagementStatics.provisionNewCoreLocalAccountAsync(true /*isDeviceOwner*/).then((userId) => {
                CloudExperienceHost.Telemetry.logEvent("CreateAndSignInCoreLocalAccountSucceeded");
                try {
                    CloudExperienceHost.IUserManager.getInstance().setIUserFromId(userId);
                    CloudExperienceHost.IUserManager.getInstance().setSignInIdentityProvider(CloudExperienceHostAPI.SignInIdentityProviders.local);
                }
                catch (err) {
                    CloudExperienceHost.Telemetry.logEvent("LocalUserSetIUserFromIdFailure", core.GetJsonFromError(err));
                }
                return CloudExperienceHost.AppResult.success;
            },
            (error) => {
                CloudExperienceHost.Telemetry.logEvent("CreateAndSignInCoreLocalAccountFailed", core.GetJsonFromError(error));
                return CloudExperienceHost.AppResult.fail;
            });
        }
    }
    return WindowsCoreLocalAccountCreator;
});
