//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/navigationManager'], (ko, navManager) => {
    class CloseChromeBreadCrumbViewModel {
        constructor(params) {
            this.showCloseButton = ko.observable(false);
            navManager.addEventListener("ShowCloseButton", this.onShowCloseButton.bind(this));
            navManager.addEventListener("HideCloseButton", this.onHideCloseButton.bind(this));

            let resourceStrings = this.getResources();
            this.resources = ko.observable(resourceStrings);
        }

        onCloseButtonClick() {
            navManager.closeCxh();
        }

        onShowCloseButton() {
            this.showCloseButton(true);
        }

        onHideCloseButton() {
            this.showCloseButton(false);
        }

        getResources() {
            let result = CloudExperienceHost.StringResources.makeResourceObject("oobeCommon");
            return JSON.parse(result);
        }
    }
    return CloseChromeBreadCrumbViewModel;
});
