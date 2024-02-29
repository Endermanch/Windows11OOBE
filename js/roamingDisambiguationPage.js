
(function () {
    "use strict";
    var roamingSettingsResources = {};
    var bridge = new CloudExperienceHost.Bridge();
    WinJS.UI.Pages.define("/views/roamingDisambiguation.html", {
        init: function (element, options) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                bridge.invoke("CloudExperienceHost.RoamingSettings.localizedStrings").done(function (result) {
                    roamingSettingsResources = JSON.parse(result);
                    completeDispatch();
                }, errorDispatch, progressDispatch);
            });
        },
        ready: function (element, options) {
            bridge.invoke("CloudExperienceHost.RoamingSettings.initializeDisambiguationPage").done(function () {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
            }, function () {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
            });
        }
    });
})();
