//
// Copyright (C) Microsoft. All rights reserved.
//
define(() => {
    class CommonTextInputViewModel {
        constructor(params) {
            this.placeHolder = params.placeHolder;
            this.inputType = params.inputType || "text";
            this.inputText = params.inputText;
            this.maxLength = params.maxLength;
            this.showError = params.showError;
            this.errorText = params.errorText;
            this.ariaLabel = params.ariaLabel || null;
            this.disable = params.disable;
            this.hasFocus = params.hasFocus;
            this.autoFocus = params.autoFocus;
            this.inputTextCaption = params.inputTextCaption;
            this.id = params.id;
        }
    }
    return CommonTextInputViewModel;
});