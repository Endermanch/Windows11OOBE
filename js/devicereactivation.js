

"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Licensing;
    (function (Licensing) {
        function activateDeviceWithPreviousId(oldDeviceId) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                var deviceReactivationManager = new CloudExperienceHostAPI.Licensing.DeviceReactivationManager();
                deviceReactivationManager.activateDeviceWithPreviousIdAsync(oldDeviceId)
                    .done(function (statusCode) { completeDispatch(statusCode); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
            });
        }
        Licensing.activateDeviceWithPreviousId = activateDeviceWithPreviousId;
    })(CloudExperienceHost.Licensing || (CloudExperienceHost.Licensing = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
