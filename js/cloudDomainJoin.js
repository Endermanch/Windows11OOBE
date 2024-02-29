//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    (function (CloudDomain) {
        function _getCloudDomainWorker() {
            if (!CloudDomain.hasOwnProperty("cloudDomainJoinWorker")) {
                CloudDomain.cloudDomainJoinWorker = new CloudDomainJoin.DataModel.CloudDomainJoinWorker();
            }
            return CloudDomain.cloudDomainJoinWorker;
        }

        var commonFeatures = [];

        // Web App js calls this to negotiate common features. We start with [] above, then when Web App JS calls into
        // getCommonFeatures it's populated with the client/server union.
        function getCommonFeatures(allServerFeatures) {
            var allClientFeatures = [
                "JoinResultObject",
                "CentralizedGetPolicy", // Note: this really means that this version of CXH supports CloudExperienceHost.Policy.getPolicy*
                "CheckOSEditionUpgradeFeature",
                "MmpcRedirectFeature",
                //"CloudBackupRestoreForAad",
                // The following features are ones the server now always negotiates (and always will), and which we
                // "negotiate" but no longer support the old behavior. These can be removed once the server also
                // always does the new thing.
                "NativeGetPolicy",
            ];

            commonFeatures = allClientFeatures.filter(feature => allServerFeatures.includes(feature));
            return commonFeatures;
        }
        CloudDomain.getCommonFeatures = getCommonFeatures;

        // We translate result, which is a WinRT Object, to a property bag so the values can be accessed
        // directly without making any additional WinRT/bridge calls.
        function returnResultByValue(result) {
            var resultValueCopy = {};
            for (var propertyName in result) {
                resultValueCopy[propertyName] = result[propertyName];
            }

            return resultValueCopy;
        }

        function isErrorClassNotReg(error) {
            if (error.hasOwnProperty("number") && ((error.number >>> 0) === 0x80040154)) {
                // REGDB_E_CLASSNOTREG
                return true;
            }
            return false;
        }

        //
        // BEGIN: remove once PROD always negotiates CentralizedGetPolicy
        function getPolicyString(policyName) {
            try {
                return EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getStringPolicyAsync(policyName);
            } catch (e) {
                if (isErrorClassNotReg(e)) {
                    return "";
                }
                
                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("CDJUIGetPolicyStringFailure", JSON.stringify({objectType: e && e.toString(), status: e.status && e.status.toString()}));
                throw e;
            }
        }
        CloudDomain.getPolicyString = getPolicyString;

        // autoPilotOobeSetting is a value from the EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotOobeSetting enumeration
        function getPolicyBool(autoPilotOobeSetting) {
            try {
                return EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.getOobeSettingsOverrideAsync(autoPilotOobeSetting);
            } catch (e) {
                if (isErrorClassNotReg(e)) {
                    return false;
                }

                CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("CDJUIGetPolicyBoolFailure", JSON.stringify({objectType: e && e.toString(), status: e.status && e.status.toString()}));
                throw e;
            }
        }
        CloudDomain.getPolicyBool = getPolicyBool;
        // END: remove once PROD always negotiates CentralizedGetPolicy
        //

        function isAlreadyAzureADJoined() {
            var cloudDomainJoinWorker = _getCloudDomainWorker();
            return cloudDomainJoinWorker.isAlreadyAzureADJoinedAsync();
        }
        CloudDomain.isAlreadyAzureADJoined = isAlreadyAzureADJoined;

        function configureCredentialGuarantee(credentialPromptTitle, credentialPromptCaption) {
            var cloudDomainJoinWorker = _getCloudDomainWorker();
            return cloudDomainJoinWorker.configureCredentialGuarantee(credentialPromptTitle, credentialPromptCaption);
        }
        CloudDomain.configureCredentialGuarantee = configureCredentialGuarantee;

        function decodeJsonWebTokenPart(jwtPart) {
            var base64String = jwtPart.replace(/-/g, "+").replace(/_/g, "/");
            var utf8String = window.atob(base64String);
            var originalString = decodeURIComponent(escape(utf8String));
            return originalString;
        }

        function crackIdToken(idToken) {
            var parts = idToken.split(".");
            if (parts.length == 3) {
                var encodedPayload = parts[1];
                var jsonObjectValue = decodeJsonWebTokenPart(encodedPayload);
                return JSON.parse(jsonObjectValue);
            } else {
                throw new CloudExperienceHost.InvalidArgumentError();
            }
        }

        function getMmpcUrlsFromTokenAsync(idToken){
            let crackedIdToken = crackIdToken(idToken);
            let enterpriseManagementWorker = new EnterpriseDeviceManagement.Enrollment.ReflectedEnroller();
            return enterpriseManagementWorker.mmpcGetManagementUrlsAsync(crackedIdToken["upn"], getClientRequestId()).then(function(result) {
                return returnResultByValue(result);
            });
        }
        CloudDomain.getMmpcUrlsFromTokenAsync = getMmpcUrlsFromTokenAsync;

        // Since the WinRT object doesn't technically trust its inputs and token cracking is a nontrivial parsing
        // task, we instead require the caller to do it. Here, as caller, we crack the id token, extract properties of
        // interest, and promote them into an assortment of string properties. The WinRT implementation object then
        // consumes those strings. Historical note: in the past the AADJ Web App did this directly, but we can
        // just as well do it here, and the web app doesn't have any specific interest in the cracked token or its
        // properties, so there's no reason for it to remain in that business.
        function inPlacePromoteIdTokenProperties(propertySet) {
            var idTokenProperties = {
                mandatoryTokenProperties: {
                    upn: {
                        internalName: "tokenUpn",
                        tokenName: "upn",
                    },
                    sid: {
                        internalName: "tokenSid",
                        tokenName: "sid",
                    },
                    tid: {
                        internalName: "tokenTenantId",
                        tokenName: "tid",
                    },
                    displayName: {
                        internalName: "tokenTenantDisplayName",
                        tokenName: "tenant_display_name",
                    },
                },
                optionalTokenProperties: {
                    mdmEnrollmentUrl: {
                        internalName: "tokenMdmEnrollmentUrl",
                        tokenName: "mdm_enrollment_url",
                    },
                    mdmTermsOfUse: {
                        internalName: "tokenMdmTermsOfUseUrl",
                        tokenName: "mdm_terms_of_use_url",
                    },
                    mdmComplianceUrl: {
                        internalName: "tokenMdmComplianceUrl",
                        tokenName: "mdm_compliance_url",
                    },
                    settingSyncUrl: {
                        internalName: "tokenUserSettingSyncUrl",
                        tokenName: "user_setting_sync_url",
                    },
                },
            };

            var crackedIdToken = crackIdToken(propertySet["idToken"]);

            var mandatoryProperties = idTokenProperties.mandatoryTokenProperties;
            for (var property in mandatoryProperties) {
                propertySet[mandatoryProperties[property].internalName] = crackedIdToken[mandatoryProperties[property].tokenName];
            }

            var optionalProperties = idTokenProperties.optionalTokenProperties;
            for (var property in optionalProperties) {
                if (crackedIdToken.hasOwnProperty(optionalProperties[property].tokenName)) {
                    propertySet[optionalProperties[property].internalName] = crackedIdToken[optionalProperties[property].tokenName];
                }
            }
        }

        function inPlaceOverwriteMmpcUrlsFromTokenAsync(propertySet) {
            if (commonFeatures.includes("MmpcRedirectFeature") &&
                propertySet.hasOwnProperty("tokenMdmEnrollmentUrl") &&
                (propertySet["tokenMdmEnrollmentUrl"] != "")) {
                return getMmpcUrlsFromTokenAsync(propertySet["idToken"]).then(function (result) {
                    let isLockedDown = result.isMmpcLockedDown;
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("CDJIsMmpcLockedDown", isLockedDown);
                    if (isLockedDown) {
                        propertySet["tokenMdmEnrollmentUrl"] = result.getManagementUrlsEnrollmentUrl;
                        propertySet["tokenMdmTermsOfUseUrl"] = result.getManagementUrlsTermsOfUseUrl;
                    }
                    return propertySet;
                });
            } else {
                return WinJS.Promise.as(propertySet);
            }

        }

        function returnJoinResultByValue(joinResult) {
            var joinResultValueCopy = {};
            for (var propertyName in joinResult) {
                joinResultValueCopy[propertyName] = joinResult[propertyName];
            }

            return joinResultValueCopy;
        }

        function completeAzureADJoin(joinResult) {
            var cloudDomainJoinWorker = _getCloudDomainWorker();
            CloudExperienceHost.IUserManager.getInstance().setIUserFromId(cloudDomainJoinWorker.joiningUserId.toString());
            CloudExperienceHost.IUserManager.getInstance().setSignInIdentityProvider(CloudExperienceHostAPI.SignInIdentityProviders.aad);

            // If we succeeded, we need to remove the Resource Account display name from the shareable data
            if (joinResult.resultType === 0) {
                CloudExperienceHost.Storage.SharableData.removeValue("resourceAccountDisplayName");
            }

            if (commonFeatures.includes("JoinResultObject")) {
                return returnJoinResultByValue(joinResult);
            } else {
                // Server doesn't yet support getting back an IJoinResult, so we need to continue returning an int
                // result type (and throwing an exception on failure HRESULT). This can be removed once the server
                // updates have rolled out to production.
                if (joinResult.resultType == 3) {                   // ResultType::Failed
                    throw { HResult: joinResult.failureResult };    // Simulate old behavior of failure HRESULT appearing via e.HResult
                } else {
                    return joinResult.resultType;
                }
            }
        }

        function doAzureADJoin() {
            var cloudDomainJoinWorker = _getCloudDomainWorker();

            var credPromptTitle = WinJS.Resources.getString('/cloudDomainJoin/CredPromptTitle').value;
            var credPromptCaption = WinJS.Resources.getString('/cloudDomainJoin/CredPromptCaption').value;
            cloudDomainJoinWorker.configureCredentialGuarantee(credPromptTitle, credPromptCaption);

            var propertySet = CloudExperienceHost.Storage.PrivateData.getValues();
            inPlacePromoteIdTokenProperties(propertySet);

            var resourceAccountDisplayName = CloudExperienceHost.Storage.SharableData.getValue("resourceAccountDisplayName");
            if (resourceAccountDisplayName) {
                propertySet["resourceAccountDisplayName"] = resourceAccountDisplayName;
            }

            // CorrelationId needs to be wrapped in braces when sent to the WinRT
            propertySet["correlationId"] = "{" + getClientRequestId() + "}";

            return inPlaceOverwriteMmpcUrlsFromTokenAsync(propertySet).then(function(propertySet) {
                return cloudDomainJoinWorker.doAzureADJoinAsync(propertySet).then(function (joinResult) {
                    // If the join operation succeeds and we are running in OOBE, enable the OneDrive policies
                    if ((CloudExperienceHost.getContext().host.toLowerCase() === "frx") && (joinResult.resultType === 0)) {
                        var tenantId = propertySet["idTokenTenantId"];
                        return CloudExperienceHostBroker.SyncEngine.OOBEOneDriveOptinCore.enableOneDriveBusinessPoliciesAsync(tenantId).then(function () {
                            return completeAzureADJoin(joinResult);
                        }, function (e) {
                            CloudExperienceHost.Telemetry.logEvent("CDJUIEnableOneDriveBusinessPoliciesAsyncFailure",
                                JSON.stringify({objectType: e && e.toString(), status: e.status && e.status.toString()}));
                            return completeAzureADJoin(joinResult);
                        });
                    }
                    return completeAzureADJoin(joinResult);
                });
            });
        }
        CloudDomain.doAzureADJoin = doAzureADJoin;

        function prepareOSLicenseUpgrade() {
            var cloudDomainJoinWorker = _getCloudDomainWorker();

            var propertySet = CloudExperienceHost.Storage.PrivateData.getValues();
            inPlacePromoteIdTokenProperties(propertySet);
            return cloudDomainJoinWorker.prepareOSLicenseUpgradeAsync(propertySet);
        }
        CloudDomain.prepareOSLicenseUpgrade = prepareOSLicenseUpgrade;

        function doConnectAADAccount(localAccountPassword) {
            var cloudDomainJoinWorker = _getCloudDomainWorker();

            var propertySet = CloudExperienceHost.Storage.PrivateData.getValues();
            inPlacePromoteIdTokenProperties(propertySet);

            if ((localAccountPassword == null) || (localAccountPassword === "")) {
                return cloudDomainJoinWorker.doConnectAADAccountAsync(propertySet).then(function (connectAADResult) {
                    return returnResultByValue(connectAADResult);
                });
            }
            else
            {
                var dataProtectionProvider = new Windows.Security.Cryptography.DataProtection.DataProtectionProvider("local=user");
                var utf8EncodedPassword = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(localAccountPassword, Windows.Security.Cryptography.BinaryStringEncoding.utf8);

                // Chaining promises to first encrypt the password and then pass it to the partial trust API to connect the local account
                return dataProtectionProvider.protectAsync(utf8EncodedPassword).then(function (protectedLocalAccountPassword) {
                    var encodedLocalAccountPassword = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(protectedLocalAccountPassword);
                    propertySet["encodedLocalAccountPassword"] = encodedLocalAccountPassword;

                    return cloudDomainJoinWorker.doConnectAADAccountAsync(propertySet);

                }).then(function (connectAADResult) {
                    return returnResultByValue(connectAADResult);
                });
            }
        }
        CloudDomain.doConnectAADAccount = doConnectAADAccount;

        function isOSEditionUpgradeFeatureEnabled(feature) {
            var cloudDomainJoinWorker = _getCloudDomainWorker();
            return cloudDomainJoinWorker.isOSEditionUpgradeFeatureEnabledAsync(feature);
        }
        CloudDomain.isOSEditionUpgradeFeatureEnabled = isOSEditionUpgradeFeatureEnabled;

        function getAuthorizationEndpoint(discoveryUrl) {
            var correlationId = getClientRequestId();
            return WinJS.xhr({
                    url: discoveryUrl,
                    headers: {
                        "client-request-id": correlationId,
                        "cxh-correlationId": correlationId
                    }
                }).then(function (response) {
                    return JSON.parse(response.responseText)["authorization_endpoint"];
                }, function (e) {
                    CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().logEvent("CDJUIDiscoveryFailure", JSON.stringify({objectType: e && e.toString(), status: e.status && e.status.toString()}));
                    return Promise.reject(e);
                });
        }
        CloudDomain.getAuthorizationEndpoint = getAuthorizationEndpoint;

        function getRecoveryUpn() {
            var cloudDomainJoinWorker = _getCloudDomainWorker();
            return cloudDomainJoinWorker.getRecoveryUpnAsync();
        }
        CloudDomain.getRecoveryUpn = getRecoveryUpn;

        function doRecovery() {
            var cloudDomainJoinWorker = _getCloudDomainWorker();

            var propertySet = CloudExperienceHost.Storage.PrivateData.getValues();
            inPlacePromoteIdTokenProperties(propertySet);
            return cloudDomainJoinWorker.doRecoveryAsync(propertySet);
        }
        CloudDomain.doRecovery = doRecovery;

        function revertZtdPolicy() {
            var cloudDomainJoinWorker = _getCloudDomainWorker();
            return cloudDomainJoinWorker.revertZtdPolicyAsync();
        }
        CloudDomain.revertZtdPolicy = revertZtdPolicy;

        function isCancellationAllowed() {
            var allowed = true;
            if (CloudExperienceHost.getContext().host.toLowerCase() === "frx") {
                var allowedProviders = CloudExperienceHostAPI.SignInIdentities.allowedProviders;
                var signInProvidersflag = CloudExperienceHostAPI.SignInIdentityProviders;

                if (0 === (allowedProviders & signInProvidersflag.msa)) {
                    // If we're in OOBE and MSA isn't supported, then CDJ isn't cancellable.
                    allowed = false;
                }
            }
            return allowed;
        }
        CloudDomain.isCancellationAllowed = isCancellationAllowed;

        function getClientRequestId() {
            return CloudExperienceHost.Telemetry.WebAppTelemetry.getInstance().getId();
        }
        CloudDomain.getClientRequestId = getClientRequestId;

        function getMsAadjRedirQueryTerms() {
            var msAadjRedirQueryTermsPropertyName = "msAadjRedirQueryTerms";

            var propertySet = CloudExperienceHost.Storage.PrivateData.getValues();

            var queryTerms = "";
            if (propertySet.hasOwnProperty(msAadjRedirQueryTermsPropertyName)) {
                queryTerms = propertySet[msAadjRedirQueryTermsPropertyName];

                // This property can only be read once, as like a query term on a URL, it's irretrievable
                // at any other time in any other context.
                CloudExperienceHost.Storage.PrivateData.addItem(msAadjRedirQueryTermsPropertyName, "");
            }

            return queryTerms;
        }
        CloudDomain.getMsAadjRedirQueryTerms = getMsAadjRedirQueryTerms;

    })(CloudExperienceHost.CloudDomain || (CloudExperienceHost.CloudDomain = {}));
    var CloudDomain = CloudExperienceHost.CloudDomain;
})(CloudExperienceHost || (CloudExperienceHost = {}));
