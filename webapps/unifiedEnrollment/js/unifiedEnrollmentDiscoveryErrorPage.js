
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var UnifiedEnroll;
    (function (UnifiedEnroll) {
        var unifiedEnrollmentResources = {};
        var bridge = new CloudExperienceHost.Bridge();
        var validator = new uiHelpers.Validator();
        var errorClass = new uiHelpers.ErrorUI();
        var correlationVector = 0;

        function _logFailureEvent(failureName, e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", failureName,
                JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack, correlationVector: correlationVector }));
            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", unifiedEnrollmentResources['Error_MDM_DiscoveryError']).done(function (result) {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
            });
        }

        WinJS.UI.Pages.define("/webapps/unifiedEnrollment/views/unifiedEnrollmentDiscoveryError.html", {
            init: function (element, options) {
                var languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                    _htmlRoot.setAttribute("lang", preferredLang);
                }, function () { });
                var dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                    _htmlRoot.setAttribute("dir", dirVal);
                }, function () { });
                var stringPromise = bridge.invoke("CloudExperienceHost.UnifiedEnroll.localizedStrings").then(function (result) {
                    unifiedEnrollmentResources = JSON.parse(result);
                });
                var correlationVectorPromise = bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_correlation_vector").then(function (result) {
                    correlationVector = result;
                });
                var cssPromise = uiHelpers.LoadCssPromise(document.head, "../../..", bridge);
                return WinJS.Promise.join({ languagePromise: languagePromise, dirPromise: dirPromise, stringPromise: stringPromise, cssPromise: cssPromise, correlationVectorPromise: correlationVectorPromise });
            },
            ready: function (element, options) {
                NextButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    this._onNext.apply(this);
                }.bind(this));
                
                var checkAmpersandFor = [NextButton];
                checkAmpersandFor.forEach(function (eachElement) {
                    var result = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(unifiedEnrollmentResources[eachElement.id]);
                    eachElement.textContent = result.content;
                    eachElement.accessKey = result.accessKey;
                });

                bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_discovery_error").then(function (result) {
                    var discoveryError = result;
                    
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_discovery_error", 0);
                    
                    bridge.invoke("CloudExperienceHost.Storage.PrivateData.addItem", "ue_private_discovery_error", discoveryError).then(function (result) {
                        if (discoveryError === "MENROLL_E_INVALIDSSLCERT") {
                            Title.textContent = unifiedEnrollmentResources["InvalidCertTitle"];
                            LeadText.textContent = unifiedEnrollmentResources["InvalidCertLeadText"];
                            Description.textContent = unifiedEnrollmentResources["InvalidCertDescription"];
                        } else if (discoveryError === "MENROLL_E_INSECUREREDIRECT") {
                            bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "ue_serverUrl").then(function (result) {
                                Title.textContent = unifiedEnrollmentResources["InsecureRedirectTitle"];
                                Description.textContent = unifiedEnrollmentResources["InsecureRedirectDescription"];
                                var leadTextToReplace = unifiedEnrollmentResources["InsecureRedirectLeadText"];
                                LeadText.textContent = leadTextToReplace.replace("{0}", result);
                            }, function (e) {
                                _logFailureEvent("UnifiedEnrollment_DiscoveryErrorPage_GetServerUrl_Failed", e)
                            });
                        } else {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "UnifiedEnrollment_DiscoveryErrorPage_GetDiscoveryError_Failed", correlationVector);
                            bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_mdm_error", unifiedEnrollmentResources['Error_MDM_DiscoveryError']).done(function (result) {
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                            });
                        }
                    }, function (e) {
                        _logFailureEvent("UnifiedEnrollment_DiscoveryErrorPage_AddPrivateDiscoveryError_Failed", e)
                    });
                }, function (e) {
                    _logFailureEvent("UnifiedEnrollment_DiscoveryErrorPage_GetDiscoveryError_Failed", e)
                });
                bridge.fireEvent(CloudExperienceHost.Events.visible, true);
            },
            _onNext: function () {
                bridge.invoke("CloudExperienceHost.Storage.PrivateData.getItem", "ue_private_discovery_error").then(function (result) {
                    bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", "ue_discovery_error", result).then(function (result) {
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    }, function (e) {
                        _logFailureEvent("UnifiedEnrollment_DiscoveryErrorPage_AddSharableDiscoveryError_Failed", e)
                    });
                }, function (e) {
                    _logFailureEvent("UnifiedEnrollment_DiscoveryErrorPage_GetPrivateDiscoveryError_Failed", e)
                });
            },
        });
    })(UnifiedEnroll = CloudExperienceHost.UnifiedEnroll || (CloudExperienceHost.UnifiedEnroll = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));

