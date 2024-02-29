//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/bridge',
    'optional!sample/Sample.CloudExperienceHostAPI.Speech.SpeechSynthesis'], (ko, bridge) => {

    let pendingPanelTransition = WinJS.Promise.as(null);

    let componentLoadCompleteCallback;
    let componentLoadingPromise = new WinJS.Promise((reportComplete) => {
        componentLoadCompleteCallback = reportComplete;
    });
    let pendingComponentLoads = 0;
    let preLoadHeldForAdditionalRegistrations = false;
    let initialComponentLoadComplete = false;
    function onComponentPreloaded(component) {
        if (!initialComponentLoadComplete && !preLoadHeldForAdditionalRegistrations && (--pendingComponentLoads == 0)) {
            initialComponentLoadComplete = true;
            setImmediate(() => {
                componentLoadCompleteCallback();
            });
        }
    }

    let dialogComponentLoadCompleteCallback;
    let dialogComponentLoadingPromise = new WinJS.Promise((reportComplete) => {
        dialogComponentLoadCompleteCallback = reportComplete;
    });
    let dialogPendingComponentLoads = 0;
    let dialogComponentLoadComplete = false;
    function onDialogComponentPreloaded(component) {
        if (!dialogComponentLoadComplete && --dialogPendingComponentLoads == 0) {
            dialogComponentLoadComplete = true;
            setImmediate(() => {
                dialogComponentLoadCompleteCallback();
            });
        }
    }

    let componentsRegistered = false;
    let dialogComponentsRegistered = false;

    function isEnterKey(ev) {
        return (ev.keyCode == WinJS.Utilities.Key.enter);
    }

    function isPageDefaultActionAllowed(ev, lastSelectedElement) {
        if (isEnterKey(ev) && (ev.target == lastSelectedElement)) {
            let isLink = ev.target && ev.target.tagName && (ev.target.tagName.toLowerCase() === "a");
            let isButton = ev.target && ev.target.tagName && (ev.target.tagName.toLowerCase() === "button");
            let isSelect = ev.target && ev.target.tagName && (ev.target.tagName.toLowerCase() === "select");
            if (!isLink && !isButton && !isSelect) {
                return true;
            }
        }
        return false;
    }

    class KnockoutHelpers {
        // Register components
        registerComponents(scenarioMode, holdForAdditionalRegistration = false) {
            if (componentsRegistered) { Debug.break(); return; }
            if (holdForAdditionalRegistration) { preLoadHeldForAdditionalRegistrations = true; }

            // Components to register and pre-load
            let components_Default = {
                'default-progress': {},
                'default-contentView': {},
                'backstack-chrome-breadcrumb': {},
                'close-chrome-breadcrumb': {},
                'oobe-chrome-breadcrumb': {},
                'oobe-chrome-contentview': {},
                'oobe-chrome-footer': {},
                'oobe-progress': {},
                'oobe-light-contentview': {},
                'oobe-light-progress': {},
                'default-frame': {},
                'oobe-frame': {},
                'sspr-frame': {},
                'oobe-light-frame': {},
            };

            let components_InclusiveOobe = {
                'oobe-header': {},
                'oobe-footer': {},
                'oobe-button': {},
                'oobe-listview': {},
                'oobe-toggle': {},
                'oobe-textinput': {},
            };

            let components_Scoobe = {
                'common-header': {},
                'common-footer': {},
                'common-button': {},
                'common-listview': {},
                'common-toggle': {},
                'common-textinput': {},
            };

            let components_AOobe = {
                'oobe-header': {},
                'oobe-footer': {},
                'oobe-button': {},
                'oobe-textinput': {},
            };

            let components_LightProgress = {
                'oobe-progress': {},
                'oobe-light-progress': {},
            };

            let components_LightFooter = {
                'oobe-light-footer': {},
            };

            let componentsLookupTable = new Object();
            componentsLookupTable[CloudExperienceHost.RegisterComponentsScenarioMode.Default] = {
                components: components_Default,
                viewModelConfigPath: '',
                templateConfigPth: 'pageView/'
            };

            componentsLookupTable[CloudExperienceHost.RegisterComponentsScenarioMode.InclusiveOobe] = {
                components: components_InclusiveOobe,
                viewModelConfigPath: 'inclusiveOobeJsCommon/',
                templateConfigPth: 'inclusiveOobeViewTemplates/'
            };

            componentsLookupTable[CloudExperienceHost.RegisterComponentsScenarioMode.Scoobe] = {
                components: components_Scoobe,
                viewModelConfigPath: 'jsTemplates/',
                templateConfigPth: 'viewCommonTemplates/'
            };

            componentsLookupTable[CloudExperienceHost.RegisterComponentsScenarioMode.AOobe] = {
                components: components_AOobe,
                viewModelConfigPath: 'aOobeJsCommon/',
                templateConfigPth: 'aOobeViewTemplates/'
            };

            componentsLookupTable[CloudExperienceHost.RegisterComponentsScenarioMode.LightProgress] = {
                components: components_LightProgress,
                viewModelConfigPath: 'corejs/',
                templateConfigPth: 'coreView/'
            };

            componentsLookupTable[CloudExperienceHost.RegisterComponentsScenarioMode.LightFooter] = {
                components: components_LightFooter,
                viewModelConfigPath: 'corejs/',
                templateConfigPth: 'coreView/'
            };

            let components = componentsLookupTable[scenarioMode].components;

            // Setup naming convention and path for templates and view models for requirejs to load
            let componentLoader = {
                getConfig: (name, callback) => {
                    let viewModelConfig = { require: componentsLookupTable[scenarioMode].viewModelConfigPath + name + '-vm' };
                    let templateConfig = { require: 'lib/text!' + componentsLookupTable[scenarioMode].templateConfigPth + name + '-template.html' };
                    // The synchronous flag means components are *allowed* to load synchronously,
                    // after the initial load which is always async
                    callback({ viewModel: viewModelConfig, template: templateConfig, synchronous: true });
                },
                loadViewModel: (name, viewModelConfig, callback) => {
                    // Pass the component root element to the VM,
                    // and hook up an easy way to get to the VM from the element
                    let viewModelConstructor = {
                        createViewModel: function (params, componentInfo) {
                            let vm = new viewModelConfig(params, componentInfo.element);
                            componentInfo.element.koComponent = vm;
                            return vm;
                        }
                    };
                    ko.components.defaultLoader.loadViewModel(name, viewModelConstructor, callback);
                }
            };
            ko.components.loaders.unshift(componentLoader);

            // Register virtual elements
            Object.keys(components).forEach((key) => {
                ko.components.register(key, components[key]);
            });

            // Preload async components and allow waiting on them
            Object.keys(components).forEach((key) => {
                pendingComponentLoads++;
                ko.components.get(key, onComponentPreloaded);
            });

            if (!holdForAdditionalRegistration) {
                preLoadHeldForAdditionalRegistrations = false;
                componentsRegistered = true;
            }
        }

        static registerDialogComponents() {
            if (dialogComponentsRegistered) { Debug.break(); return; }

            let customDialogComponents = {
                'oobe-retaildemo-dialog': {},
                'oobe-retaildemo-exit-dialog': {},
            };

            // Register virtual elements
            Object.keys(customDialogComponents).forEach((key) => {
                ko.components.register(key, customDialogComponents[key]);
            });

            // Preload async components and allow waiting on them
            Object.keys(customDialogComponents).forEach((key) => {
                dialogPendingComponentLoads++;
                ko.components.get(key, onDialogComponentPreloaded);
            });

            dialogComponentsRegistered = true;
        }

        // Since we don't have jQuery with its handy .index() method...
        static getElementIndex(element) {
            let index = 0;
            let parent = element.parentNode;
            if (parent && parent.children.length > 0) {
                for (let i = 0; i < parent.children.length; i++) {
                    if (element == parent.children[i]) {
                        index = i;
                        break;
                    }
                }
            }
            return index;
        }

        static waitForInitialComponentLoadAsync() {
            return componentLoadingPromise;
        }

        static waitForDialogComponentLoadAsync() {
            return dialogComponentLoadingPromise;
        }

        enableWinJSBinding(callback) {
            // Enable winjs control binding
            require(['lib/knockout-winjs'], callback);
        }

        static setFocusOnAutofocusElement() {
            let currentPanel = document.querySelector('.current-visible-panel');
            // If there is no current panel, assume the page does not use panels and see if there is an autofocus element in the doc
            let autofocusElement = currentPanel ? currentPanel.querySelector("[autofocus='true']") : document.querySelector("[autofocus='true']");
            let firstInput = currentPanel ? currentPanel.querySelector("input") : null;
            if (autofocusElement) {
                autofocusElement.focus();
            } else if (firstInput) {
                firstInput.focus();
            }
        }

        static loadIframeContent(iframeDocument, value) {
            iframeDocument.open('text/html', 'replace');
            iframeDocument.write(value.content);
            iframeDocument.close();

            iframeDocument.dir = value.dir;
            iframeDocument.body.setAttribute("tabindex", "0");
            if (value.focusBody) {
                iframeDocument.body.focus();
            }

            if (value.addStyleSheet && (value.addStyleSheet !== "")) {
                let fileRef = iframeDocument.head.ownerDocument.createElement("link");
                fileRef.setAttribute("rel", "stylesheet");
                fileRef.setAttribute("type", "text/css");
                fileRef.setAttribute("href", value.addStyleSheet);
                iframeDocument.head.appendChild(fileRef);
            }

            if (value.frameTitle) {
                iframeDocument.title = value.frameTitle;
            }

            if (value.pageDefaultAction) {
                let lastSelectedElement;
                function enterKeyDownHandler(ev) {
                    if (isEnterKey(ev)) {
                        lastSelectedElement = ev.target;
                    }
                    return true; // Tells Knockout to allow the default action
                }
                iframeDocument.addEventListener("keydown", enterKeyDownHandler);
                function enterKeyUpHandler(ev) {
                    if (isPageDefaultActionAllowed(ev, lastSelectedElement)) {
                        value.pageDefaultAction();
                        return false;
                    }
                    return true; // Tells Knockout to allow the default action
                }
                iframeDocument.addEventListener("keyup", enterKeyUpHandler);
            }
        }
    };

    ko.bindingHandlers.panelIndexVisible = {
        init: function (element, valueAccessor) {
            let panelIndex = element.getAttribute("data-panel-index") || KnockoutHelpers.getElementIndex(element);
            Debug.assert(panelIndex !== undefined, "Panel binding couldn't find a panel index");
            let shouldDisplay = ko.unwrap(valueAccessor()) == panelIndex;
            element.style.display = shouldDisplay ? "" : "none";
            if (shouldDisplay) {
                element.classList.add("current-visible-panel");
            }
            document.dispatchEvent(new Event("panelChanged"));
        },
        update: function (element, valueAccessor, allBindings) {
            let panelIndex = element.getAttribute("data-panel-index") || KnockoutHelpers.getElementIndex(element);
            Debug.assert(panelIndex !== undefined, "Panel binding couldn't find a panel index");
            let shouldDisplay = ko.unwrap(valueAccessor()) == panelIndex;
            if (shouldDisplay) {
                // This function (update) gets called for every panel when the active panel index changes.
                // Each panel decides whether it should be hidden or shown.
                // The setImmediate here ensures the hidden panel starts its exit animation (and assigns to pendingPanelTransition)
                // before the entrance animation gets queued by the incoming panel.
                // This introduces a very small timing window where two panels can have entrance animations queued in setImmediate callbacks
                // We synchronously add this class to the chosen incoming panel (and remove from others) to guard against this.
                element.classList.add("current-visible-panel");
                setImmediate(() => {
                    // Ensure we don't queue an entrance if another panel got selected as visible before the setImmediate callback fired
                    if (element.classList.contains("current-visible-panel")) {
                        pendingPanelTransition = pendingPanelTransition.then(() => {
                            if (element.style.display == "none") {
                                element.style.opacity = 0;
                                element.style.display = "";
                                document.dispatchEvent(new Event("panelChanged"));
                                let autoFocusItem = element.querySelector("[autofocus='true']");
                                let firstInput = element.querySelector("input");
                                if (autoFocusItem) {
                                    autoFocusItem.focus();
                                } else if (firstInput) {
                                    // If there is no item with the autofocus attribute then fall back to setting focus on the first input element
                                    firstInput.focus();
                                }
                                return WinJS.UI.Animation.fadeIn(element);
                            }
                        });
                    }
                });
            }
            else {
                element.classList.remove("current-visible-panel");
                pendingPanelTransition = pendingPanelTransition.then(() => {
                    if (element.style.display != "none") {
                        return WinJS.UI.Animation.fadeOut(element).then(() => {
                            element.style.display = "none";
                        });
                    }
                });
            }
        }
    };

    ko.bindingHandlers.textVoiceOver = {
        update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            let value = valueAccessor();
            let valueUnwrapped = ko.unwrap(value);

            if (valueUnwrapped && (valueUnwrapped.length > 0)) {
                let speechSynthesis = AppObjectFactory.getInstance().getObjectFromString("CloudExperienceHostAPI.Speech.SpeechSynthesis");
                speechSynthesis.speakAsync(valueUnwrapped, true /* useVoiceOver */, true /* checkSpeechControllerState */).done(() => {
                    if (typeof viewModel.onSpeechComplete === "function") {
                        viewModel.onSpeechComplete();
                    }
                }, (error) => {
                    if (typeof viewModel.onSpeechError === "function") {
                        viewModel.onSpeechError(error);
                    }
                }, (progressState) => {
                    if ((progressState == 10 /* SpeechProgressValue_Starting */) && (typeof viewModel.onSpeechStarting === "function")) {
                        viewModel.onSpeechStarting();
                    }
                });
            }

            ko.bindingHandlers.text.update(element, valueAccessor, allBindings, viewModel, bindingContext);
        }
    };

    ko.bindingHandlers.oobeHotKeys = {
        update: function (element, valueAccessor) {
            let supportHotKeys = ko.unwrap(valueAccessor());
            if (supportHotKeys) {
                require(['jsCommon/oobe-gesture-manager'], (gestureManager) => {
                    element.hotkeyDownHandler = gestureManager.onKeyDown.bind(gestureManager);
                    element.hotkeyUpHandler = gestureManager.onKeyUp.bind(gestureManager);
                    element.addEventListener("keydown", element.hotkeyDownHandler);
                    element.addEventListener("keyup", element.hotkeyUpHandler);
                });
            }
            else if (element.hotkeyDownHandler) {
                this.element.removeEventListener("keydown", element.hotkeyDownHandler);
                this.element.removeEventListener("keyup", element.hotkeyUpHandler);
                element.hotkeyDownHandler = null;
                element.hotkeyUpHandler = null;
            }
        }
    };

    ko.bindingHandlers.oobePageDefaultAction = {
        update: function (element, valueAccessor) {
            let defaultAction = ko.unwrap(valueAccessor());
            if (defaultAction) {
                let lastSelectedElement;
                function enterKeyDownHandler(ev) {
                    if (isEnterKey(ev)) {
                        lastSelectedElement = ev.target;
                    }
                    return true; // Tells Knockout to allow the default action
                }
                element.addEventListener("keydown", enterKeyDownHandler);
                function enterKeyUpHandler(ev) {
                    if (isPageDefaultActionAllowed(ev, lastSelectedElement)) {
                        defaultAction();
                        return false;
                    }
                    return true; // Tells Knockout to allow the default action
                }
                element.addEventListener("keyup", enterKeyUpHandler);
            }
        }
    };

    ko.bindingHandlers.iframeContent = {
        update: function (element, valueAccessor, allBindings) {
            let value = ko.utils.unwrapObservable(valueAccessor());
            if (value.content && value.dir) {
                let iframeDocument = element.contentWindow.document;

                if (value.preventLinkNavigation) {
                    // Prevent navigation from loaded iframe content within the iframe.
                    // We do this by listening for any "load" event, and for any that occur after the initial load
                    // of HTML content in the iframe, we first redirect to "about:blank" and when that load event
                    // occurs, reload the original HTML content into the iframe again. The end result is that the link
                    // appears not to work, i.e., we never appear to navigate away from the original HTML content.
                    function loadHandler(event) {
                        if (!event.srcElement.initialLoadComplete) {
                            event.srcElement.initialLoadComplete = true;
                        }
                        else if (event.srcElement.needReload) {
                            KnockoutHelpers.loadIframeContent(event.srcElement.contentWindow.document, value);
                            event.srcElement.needReload = false;
                        }
                        else {
                            event.srcElement.needReload = true; // allow next load to complete
                            event.srcElement.src = "about:blank";
                        }
                        return true; // Tells Knockout to allow the default action
                    }
                    element.addEventListener("load", loadHandler);
                }
                KnockoutHelpers.loadIframeContent(iframeDocument, value);
            }
        }
    };

    return KnockoutHelpers;
});
