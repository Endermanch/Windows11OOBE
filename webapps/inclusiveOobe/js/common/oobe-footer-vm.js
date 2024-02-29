//
// Copyright (C) Microsoft. All rights reserved.
//
define(() => {
    class OobeFooterViewModel {
        constructor(params) {
            this.flexEndDropdowns = params.flexEndDropdowns;
            this.flexStartButtons = params.flexStartButtons;
            this.flexEndButtons = params.flexEndButtons;
            this.flexStartHyperLinks = params.flexStartHyperLinks;
            this.flexEndHyperLinks = params.flexEndHyperLinks;
        }
    }
    return OobeFooterViewModel;
});
