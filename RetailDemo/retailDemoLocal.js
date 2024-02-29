(function () {
    "use strict";
    WinJS.UI.Pages.define("/RetailDemo/retailDemoLocal.html", {
        ready: function (element, options) {
            var bridge = new CloudExperienceHost.Bridge();
            bridge.invoke("CloudExperienceHost.LocalAccount.createRetailAccount", null, false).done(function () {
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.exitCxhSuccess);
            }, function (error) {
                
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CreateRetailLocalAccountFailure", error.description);

                if (error.number === -2147023580) { 
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.exitCxhSuccess);
                } else {
                    
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                }
            });
        }
    });
})();