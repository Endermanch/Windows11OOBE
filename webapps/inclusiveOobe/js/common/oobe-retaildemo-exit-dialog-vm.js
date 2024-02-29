//
// Copyright (C) Microsoft. All rights reserved.
//
define(["lib/knockout", "legacy/bridge", "jsCommon/oobe-gesture-manager", "legacy/core", "winjs/ui"], (ko, bridge, gestureManager, core) => {
    class RetailDemoExitDlgViewModel {
        constructor(params, element) {
            this.dlgContent = ko.observable("");
            this.dlgCtrl = null;

            this.loadPromise = bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeRetailDemoExit").then((result) => {
                this.resourceStrings = JSON.parse(result);
                return WinJS.UI.processAll(element).done(() => {
                    this.dlgCtrl = element.querySelector(".win-contentdialog").winControl;
                });
            }, (err) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "getOobeRetailDemoExitStringResourcesFailure", core.GetJsonFromError(err));
            });
        }

        showDlg() {
            return this.loadPromise.then(() => {
                this.dlgContent(this.resourceStrings.confirmContent);

                this.dlgCtrl.title = this.resourceStrings.confirmTitle;
                this.dlgCtrl.primaryCommandText = this.resourceStrings.confirmPrimaryCommandText;
                this.dlgCtrl.secondaryCommandText = this.resourceStrings.confirmSecondayCommandText;

                return this.dlgCtrl.show()
            });
        }
    }
    return RetailDemoExitDlgViewModel;
});