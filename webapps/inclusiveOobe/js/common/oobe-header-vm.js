define(["lib/knockout", "jsCommon/oobe-gesture-manager", "legacy/bridge"], (ko, gestureManager, bridge) => {
    class OobeHeaderViewModel {
        constructor(params, element) {
            this.boundElement = element;
            this.title = ko.isObservable(params.title) ? params.title : ko.observable(params.title);

            // After the bindings are all applied, check if the header is visible and the title should be applied to the document title
            setImmediate(() => {
                this._updateDocumentTitle(this.title());
            });

            this.title.subscribe((newTitle) => {
                this._updateDocumentTitle(newTitle);
            });

            // Register to be notified when a web page navigates between panel elements
            this.panelChangedHandler = this.onPanelChanged.bind(this);
            document.addEventListener("panelChanged", this.panelChangedHandler, true);

            this.subtitle = params.subtitle;
            this.onHeaderClickHandler = null;

            let supportClickableTitle = params.supportClickableTitle || false;
            if (supportClickableTitle) {
                gestureManager.reevaluateRetailDemoEntryAllowed().done((result) => {
                    if (result) {
                        gestureManager.setHeaderVM(this);
                        this.onHeaderClickHandler = this.onHeaderClick;
                    }
                });
            }

            let supportExtraSpaceTitle = params.supportExtraSpaceTitle || false;
            if (supportExtraSpaceTitle) {
                let titleElement = element.querySelector(".body-header h1");
                titleElement.classList.add("body-header-two-lines");
            }
        }

        dispose() {
            document.removeEventListener("panelChanged", this.panelChangedHandler);
        }

        disableRetailDemoEntryPoint() {
            this.onHeaderClickHandler = null;
        }

        onHeaderClick() {
            gestureManager.onTitleClicked();
        }

        onPanelChanged(ev) {
            bridge.invoke("CloudExperienceHost.notifyPanelChange");
            this._updateDocumentTitle(this.title());
        }

        _updateDocumentTitle(newTitle) {
            // If the element is visible, set the document title to the title string
            if (this.boundElement.offsetHeight > 0) {
                document.title = newTitle;
            }
        }
    }
    return OobeHeaderViewModel;
});
