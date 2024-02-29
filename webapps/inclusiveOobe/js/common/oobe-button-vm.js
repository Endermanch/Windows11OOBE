define(['lib/knockout'],(ko) => {
    class OobeButtonViewModel {
        constructor(params) {
            this.buttonType = params.buttonType || "button";
            this.accessKey = params.accessKey;
            this.buttonText = params.buttonText;
            this.isPrimaryButton = params.isPrimaryButton || false;
            this.buttonClickHandler = params.buttonClickHandler;
            this.isVisible = (params.isVisible === undefined) ? true : params.isVisible;
            this.disableControl = ko.isObservable(params.disableControl) ? (params.disableControl) : ko.observable(!!params.disableControl);
            this.autoFocus = params.autoFocus || false;
            this.id = params.id;
        }
    }
    return OobeButtonViewModel;
});
