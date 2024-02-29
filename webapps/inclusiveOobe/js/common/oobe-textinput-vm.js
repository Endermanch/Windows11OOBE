//
// Copyright (C) Microsoft. All rights reserved.
//
define(() => {
    class OobeTextInputViewModel {
        constructor(params) {
            this.placeHolder = params.placeHolder;
            this.inputType = params.inputType || "text";
            this.inputLabelId = params.inputLabelId || null;
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
            this.isAutoCorrectEnabled = (params.isAutoCorrectEnabled !== false);
            this.autoComplete = (this.isAutoCorrectEnabled ? "on" : "off");
            this.autoCorrect = (this.isAutoCorrectEnabled ? "on" : "off");
            this.autoCapitalize = (this.isAutoCorrectEnabled ? "on" : "off");
            this.spellCheck = (this.isAutoCorrectEnabled ? "true" : "false");
        }
    }
    return OobeTextInputViewModel;
});