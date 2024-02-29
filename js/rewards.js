//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Rewards;
    (function (Rewards) {
        var shouldReportRewards;
        function setShouldReportRewards(f) {
            shouldReportRewards = f;
        }
        Rewards.setShouldReportRewards = setShouldReportRewards;

        function reportRewardsActivityRestAsync(token) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                try {
                    let url = "https://prod.rewardsplatform.microsoft.com/dapi/me/activities"; // REST Api
                    let xhr = new XMLHttpRequest();
                    xhr.open("POST", url, true);
                    xhr.setRequestHeader("Content-type", "application/json");
                    xhr.setRequestHeader("Authorization", "Bearer " + token);
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState === 4) { // 4 is DONE
                            // log rest api result, 200 is success, everything else is failure
                            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("ReportRewardsActivityStatus", xhr.status.toString());
                            completeDispatch(xhr.status);
                        }
                    };
                    // SCOOBE rewards offer type is 200, amount == 1 is times rewards can be claimed, not actual point value which is decided by rewards server
                    xhr.send(JSON.stringify({"type": 200, "amount": 1, "country": CloudExperienceHost.Globalization.GeographicRegion.getCode().toLowerCase()}));
                } catch (ex) {
                    CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("ReportRewardsActivityError", CloudExperienceHost.GetJsonFromError(ex));
                    errorDispatch(ex);
                }
            });
        }

        function reportRewardsActivityAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                if (shouldReportRewards) {
                    try {
                        Windows.Security.Authentication.Web.Core.WebAuthenticationCoreManager.findAccountProviderAsync("https://login.windows.local").then(function (provider) {
                            if (provider && (provider.authority === "consumers")) {
                                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("RewardsAccountDefault");
                                let tokenRequest = new Windows.Security.Authentication.Web.Core.WebTokenRequest(provider, "service::prod.rewardsplatform.microsoft.com::MBI"); // rewards site requires MBI policy
                                return Windows.Security.Authentication.Web.Core.WebAuthenticationCoreManager.getTokenSilentlyAsync(tokenRequest);
                            }
                            else {
                                // no default MSA
                                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("RewardsAccountNotDefault");
                                return Windows.Security.Authentication.Web.Core.WebAuthenticationCoreManager.findAccountProviderAsync("https://login.microsoft.com", "consumers").then(function (provider) {
                                    let tokenRequest = new Windows.Security.Authentication.Web.Core.WebTokenRequest(provider, "service::prod.rewardsplatform.microsoft.com::MBI"); // rewards site requires MBI policy
                                    return Windows.Security.Authentication.Web.Core.WebAuthenticationCoreManager.findAllAccountsAsync(provider).then(function (findAllAccountsResult) {
                                        if ((findAllAccountsResult != null) && (findAllAccountsResult.accounts != null) && (findAllAccountsResult.accounts.size == 1)) {
                                            return Windows.Security.Authentication.Web.Core.WebAuthenticationCoreManager.getTokenSilentlyAsync(tokenRequest, findAllAccountsResult.accounts[0]);
                                        }
                                        else {
                                            completeDispatch(0); // return 0 to indicate no work done
                                        }
                                    });
                                });
                            }
                        }).then(function(tokenResponse) {
                            if (tokenResponse) {
                                return reportRewardsActivityRestAsync(tokenResponse.responseData[0].token);
                            }
                            else {
                                CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("RewardsAccountNoToken");
                                completeDispatch(0);
                            }
                        }).then(function(result) {
                            completeDispatch(result);
                        });
                    }
                    catch (ex) {
                        CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logCriticalEvent2("ReportRewardsActivityError", CloudExperienceHost.GetJsonFromError(ex));
                        errorDispatch(ex);
                    }
                }
                else {
                    completeDispatch(0); // no work done
                }
            });
        }
        Rewards.reportRewardsActivityAsync = reportRewardsActivityAsync;
    })(CloudExperienceHost.Rewards || (CloudExperienceHost.Rewards = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
