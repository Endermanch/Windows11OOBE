//
// Copyright (C) Microsoft. All rights reserved.
//
define(() => {
    class OobeToggleViewModel {
        constructor(params, element) {
            this.titleText = ko.isObservable(params.titleText) ? params.titleText : ko.observable(params.titleText);
            this.labelOnText = params.labelOnText;
            this.labelOffText = params.labelOffText;
            this.checkedValue = ko.isObservable(params.checked) ? params.checked : ko.observable(params.checked);
            this.contentHeader = params.contentHeader || null;
            this.descriptionOn = params.descriptionOn || this.titleText();
            this.descriptionOff = params.descriptionOff || this.titleText();
            this.summaryFormatString = params.summaryFormatString;
            this.isLastInAGroupValue = ko.isObservable(params.isLastInAGroup) ? params.isLastInAGroup : ko.observable(params.isLastInAGroup);
            this.currentAccDescription = ko.pureComputed(() => {
                let isChecked = this.checkedValue();
                let description = isChecked ? this.descriptionOn : this.descriptionOff;
                let sliderAt = isChecked ? this.labelOnText : this.labelOffText;
                return this.summaryFormatString.replace("%1", description).replace("%2", sliderAt);
            });

            // To support programmatic control through Narrator/UIA the toggle needs to support click event, 
            // which WinJS's implementation does not do (they build on pointerdown directly against the slider div).
            // Thus we add two handlers in the OobeToggle VM
            // - pointerdown, which executes in the capturing (routing) phase to suppress WinJS's own behavior
            // - click, to add checked-flipping for clicks to the slider and label and programmatic clicks
            this.element = element;
            this.clickHandler = this.onClick.bind(this);
            element.addEventListener("click", this.clickHandler);
            element.addEventListener("pointerdown", this.onPointerDown, true /*useCapture*/ );
        }

        onClick(ev) {
            this.checkedValue(!this.checkedValue());

            // Since click handler is manually flipping checkedValue we need to poke the titleText
            // to get Narrator to read the computed currentAccDescription after checkedValue change.
            let title = this.titleText();
            this.titleText(" ");
            this.titleText(title);

            ev.preventDefault();
        }

        onPointerDown(ev) {
            ev.stopImmediatePropagation();
        }

        dispose() {
            this.element.removeEventListener("click", this.clickHandler);
            this.element.removeEventListener("pointerdown", this.onPointerDown);
        }
    }
    return OobeToggleViewModel;
});
