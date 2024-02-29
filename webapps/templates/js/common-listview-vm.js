define(() => {
    class CommonListViewModel {
        constructor(params, element) {
            this.element = element;
            this.listRootElement = element.querySelector(".list");
            this.items = params.items;
            this.listAccessibleName = params.listAccessibleName;
            this.selectionFollowsFocus = (params.selectionFollowsFocus === undefined) ? true : params.selectionFollowsFocus;
            this.isBinaryChoice = (params.binaryChoice === undefined) ? false : params.binaryChoice;
            this.selectedItem = params.selectedItem;
            this.selectedItem.subscribe(this.focusSelectedItem.bind(this));
            this.onItemKeyDown = this.handleKeyNav.bind(this);
            this.onItemKeyUp = this.handleKeyUpNav.bind(this);
            this.focusSelectedItem();
            this.ensuredInCenter = false;

            // Forward the autofocus attribute onto our focusable list element
            if (element.hasAttribute("autofocus")) {
                this.listRootElement.setAttribute("autofocus", true);
                element.removeAttribute("autofocus");
            }

            // Forward the 2 option list param onto list element class
            if (this.isBinaryChoice) {
                this.optInBinaryChoice();
            }
        }

        optInBinaryChoice() {
            let el = this.listRootElement;
            el.className += " binaryChoice";
        }

        focusSelectedItem() {
            setImmediate(() => {
                let focusElement = this.listRootElement.querySelector(".list-item.selected");
                if (focusElement) {
                    focusElement.focus();

                    // Put selected item at center of scroll-view when page gets initialized
                    if (!this.ensuredInCenter) {
                        let targetoffset = focusElement.offsetTop;
                        let scrollView = this.element.querySelector(".scroll-view");
                        let contentboxHeight = scrollView.offsetHeight;
                        if (targetoffset > contentboxHeight) {
                            scrollView.scrollTop = targetoffset - contentboxHeight / 2;
                        }
                    }
                    this.ensuredInCenter = true;
                }
            });
        }

        // To achieve our desired focus behavior,
        // we make the list itself a tab stop and then forward focus to the selected list item
        onListFocus(list, e) {
            if (e.relatedTarget && e.relatedTarget.parentElement == this.listRootElement) {
                return;
            }
            let focusElement = this.listRootElement.querySelector(".list-item.selected") || e.target.firstElementChild;
            if (focusElement && focusElement.focus) {
                focusElement.focus();
                e.preventDefault();
            } 
        }
        
        onListFocusIn() {
            // If focus comes to the list or any child, we disable having the list as a tab stop
            // (so shift+tab from inside the list doesn't focus the list)
            this.listRootElement.tabIndex = -1;
        }

        onListFocusOut(list, e) {
            // If focus leaves the list, make the list a tab stop again
            let newFocusElement = e.relatedTarget;
            let isNewFocusListOrChild = newFocusElement &&
                                        ((newFocusElement == this.listRootElement) ||
                                        (newFocusElement.parentElement && (newFocusElement.parentElement == this.listRootElement)));
            if (!isNewFocusListOrChild) {
                this.listRootElement.tabIndex = 0;
            }
        }

        handleKeyNav(item, e) {
            let currentElement = e.target;
            let scrollView = this.element.querySelector(".scroll-view");
            let elementToFocus = null;
            let goingUp = false;
            switch (e.keyCode) {
                case WinJS.Utilities.Key.downArrow:
                    elementToFocus = currentElement.nextElementSibling || currentElement;
                    break;
                case WinJS.Utilities.Key.upArrow:
                    goingUp = true;
                    elementToFocus = currentElement.previousElementSibling || currentElement;
                    break;
                case WinJS.Utilities.Key.home:
                    goingUp = true;
                    elementToFocus = this.listRootElement.firstElementChild;
                    break;
                case WinJS.Utilities.Key.end:
                    elementToFocus = this.listRootElement.lastElementChild;
                    break;
                case WinJS.Utilities.Key.pageUp:
                    goingUp = true;
                case WinJS.Utilities.Key.pageDown:
                    elementToFocus = currentElement;
                    // Basic implementation assuming equal height rows
                    let itemHeight = currentElement.offsetHeight;
                    if (itemHeight) {
                        let itemsOnScreen = scrollView.offsetHeight / itemHeight;
                        for (let i = 0; i < itemsOnScreen && (goingUp ? elementToFocus.previousElementSibling : elementToFocus.nextElementSibling); i++) {
                            elementToFocus = goingUp ? elementToFocus.previousElementSibling : elementToFocus.nextElementSibling;
                        }
                    }
                    break;
                case WinJS.Utilities.Key.space:
                    // Default (selectionFollowsFocus is true): To prevent the space key from causing
                    // scrolling of the scroll- view, and since this list view auto-selects the focused
                    // item, obviating a de-select command, just focus the current element.
                    // If selectionFollowsFocus is false, auto-selection does not happen when focused.
                    // Thus, here, making sure the focused item is selected when spacebar/enter pressed.
                    elementToFocus = currentElement;
                    if (!this.selectionFollowsFocus) {
                        this.selectedItem(ko.dataFor(currentElement));
                    }
                    break;
                case WinJS.Utilities.Key.enter:
                    if (!this.selectionFollowsFocus) {
                        elementToFocus = currentElement;
                    }
                    break;
            }

            if (elementToFocus) {
                let scrolled = false;
                if (elementToFocus.offsetTop < scrollView.scrollTop) {
                    scrolled = true;
                    scrollView.msZoomTo({
                        contentY: elementToFocus.offsetTop,
                        viewportY: "top",
                    });
                }
                else if ((elementToFocus.offsetTop + elementToFocus.offsetHeight) > (scrollView.scrollTop + scrollView.offsetHeight)) {
                    scrolled = true;
                    scrollView.msZoomTo({
                        contentY: (elementToFocus.offsetTop + elementToFocus.offsetHeight),
                        viewportY: "bottom",
                    });
                }
                setTimeout(() => {
                    elementToFocus.focus();
                }, scrolled ? 100 : 0);
                e.preventDefault();
                e.stopImmediatePropagation();
            }
            return true; // Tell KO not to mark everything handled
        }

        handleKeyUpNav(item, e) {
            let currentElement = e.target;
            switch (e.keyCode) {
                case WinJS.Utilities.Key.enter:
                    if (!this.selectionFollowsFocus) {
                        if (this.listRootElement.querySelector(".list-item.selected") !== currentElement) {
                            e.stopImmediatePropagation();
                        }
                        this.selectedItem(ko.dataFor(currentElement));
                    }
            }
        }
    }
    return CommonListViewModel;
});
