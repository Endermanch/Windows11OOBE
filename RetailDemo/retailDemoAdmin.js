(function () {
    "use strict";
    WinJS.UI.Pages.define("/RetailDemo/retailDemoAdmin.html", {
        ready: function (element, options) {
            var bridge = new CloudExperienceHost.Bridge();
            bridge.invoke("CloudExperienceHost.LocalAccount.createRetailAccount", null, true).done(function () {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
            }, function (error) {
                
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CreateRetailAdminAccountFailure", error.description);

                if (error.number === -2147023580) { 
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                } else {
                    
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                }
            });
        }
    });
})();