

"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var RetailDemo;
    (function (RetailDemo) {
        function openOnDeviceAdmin() {
            Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri("ms-retaildemo-oda:"));
        }
        RetailDemo.openOnDeviceAdmin = openOnDeviceAdmin;
    })(CloudExperienceHost.RetailDemo || (CloudExperienceHost.RetailDemo = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
