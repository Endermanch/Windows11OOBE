//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/navigationManager'], (ko, navManager) => {
    class OOBEBackstackChromeBreadCrumbViewModel {
        constructor(params) {
            this.showBackButton = ko.observable(false);
            navManager.addEventListener("ShowBackButton", this.onShowBackButton.bind(this));
            navManager.addEventListener("HideBackButton", this.onHideBackButton.bind(this));

            let resourceStrings = this.getResources();
            this.resources = ko.observable(resourceStrings);
        }

        onBackButtonClick() {
            navManager.navigateBack();
        }

        onShowBackButton() {
            this.showBackButton(true);
        }

        onHideBackButton() {
            this.showBackButton(false);
        }

        getResources() {
            let result = CloudExperienceHost.StringResources.makeResourceObject("oobeCommon");
            return JSON.parse(result);
        }
    }
    return OOBEBackstackChromeBreadCrumbViewModel;
});
