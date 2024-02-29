//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/appViewManager', 'legacy/navigationManager', 'legacy/core'], (ko, appViewManager, navManager, core) => {
    ko.bindingHandlers.addFooterWebView = {
        init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            viewModel.attachFooterWebView(element);
        }
    };

    class LiteFrameViewModel {
        constructor() {
            document.title = this.getResources().MainFrameAccName;

            // Create OOBE Light specific markups
            // Need to insert a div for background into DOM App because the blur filter will not handle segmentation correctly in the frame layer
            let backgroundContainer = document.getElementsByClassName("background-image-container");
            if (backgroundContainer.length === 0) {
                backgroundContainer = document.createElement('div');
                backgroundContainer.setAttribute('class', 'background-image-container');
                document.body.insertBefore(backgroundContainer, document.body.childNodes[0]);

                this.SetBackgroundImageUrlUsingThemeAsync(backgroundContainer);
            }

            this._webViewCtrl = document.createElement('x-ms-webview');
            this._webViewCtrl.className = "content-webview";
            this._previousAnimationFile = null;
            this._anim = null;
            this.showLightFooter = CloudExperienceHostAPI.Environment.isFullscreenCXHRunning;

            // Override inputPane event handler when it's needed in the future. For example split-screen devices where SIP only covers part of CXH
            let shouldOverrideInputPaneShowing = false;
            if (shouldOverrideInputPaneShowing) {
                this._inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
                if (this._inputPane) {
                    this._inputShowingListener = this.InputPaneShowing.bind(this);
                    this._inputPane.addEventListener("showing", this._inputShowingListener);
                }
            }

            CloudExperienceHost.Globalization.Utils.setDocumentElementLangAndDir();
            appViewManager.subscribe(this);
            appViewManager.subscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.Language);
            appViewManager.subscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.UpdateDirection);
            appViewManager.subscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.InputSwitchButton);
            appViewManager.subscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.ResetFooterFocus);
        }

        getResources(updateTag) {
            let result = CloudExperienceHost.StringResources.makeResourceObject("oobeCommon", null /* keyList */, updateTag);
            return JSON.parse(result);
        }

        InputPaneShowing(e) {
            // Prevent WWAHost from resizing or scrolling the view, we'll do it ourselves
            e.ensuredFocusedElementInView = true;

            // This work around won't be able to scroll to input elements that are below the keyboard if they're in the bottom N pixels(where N = e.occludedRect.height) of the page.
            // The options for addressing that include resizing the WebView, or translating it up the necessary number of pixels which is roughly what the frameworks do.
            const scriptToInject = `
                const el = document.activeElement;
                if (el) {
                    const rect = el.getBoundingClientRect();
                    const isOffScreen = (rect.bottom > (window.innerHeight - ${e.occludedRect.height})) || (rect.top < 0);
                    if (isOffScreen) {
                        el.scrollIntoView();
                    }
                }`;
            let op = this._webViewCtrl.invokeScriptAsync("eval", [scriptToInject]);
            op.start();
        }

        setInputModalityChangeListeners() {

            const scriptToInject = `
                // Functions to check the current input modality and adjust focus visual per modality.
                // If modality is Keyboard - allow focus visual to be shown
                // If others - hide focus visuals
                // Start with assumption that customer is using Pointing device
                function handleKeyDown() {
                    setFocusVisibleState(true);
                }

                function handlePointerDown() {
                    setFocusVisibleState(false);
                }

                function setFocusVisibleState(isFocusVisible) {
                    let rootEle = document.querySelector(":root");
                    if (rootEle != null) {
                        rootEle.setAttribute("focus-visible", isFocusVisible);
                    }
                }

                // If mouse click or touch started or stylus touched digitizer, its a good indication that customer is going to use pointing device
                document.addEventListener("pointerdown", handlePointerDown, { capture: true });

                // On a keypress bring the focus outline since its likely customer would use keyboard for focus
                document.addEventListener("keydown", handleKeyDown, { capture: true });

                // Sets custom attribute to the root element on init, updates another one when keyDown or pointerDown is detected
                setFocusVisibleState(false);
                `;

            let op = this._webViewCtrl.invokeScriptAsync("eval", [scriptToInject]);
            op.start();
        }

        async SetBackgroundImageUrlUsingThemeAsync(backgroundContainer) {
            let backgroundImageUri;
            try {
                // Get background image from main composer silently, and then apply it to OOBE
                backgroundImageUri = ApplicationTheme.AppThemeBrokeredAPI.getThemeImage(ApplicationTheme.ThemeImageType.startBackground);
            } catch (error) {}

            if (!backgroundImageUri) {
                // Get background image from platform specific API as backup. It's still possible to not have a background.
                try {
                    let backgroundStream = ApplicationTheme.AppThemeBrokeredPlatformAPI.getThemeImageStream(ApplicationTheme.ThemeImageType.startBackground);
                    if (backgroundStream) {
                        let imageStream = await backgroundStream.imageStream.openReadAsync();
                        let blob = MSApp.createBlobFromRandomAccessStream("image/jpg", imageStream.cloneStream());
                        backgroundImageUri = URL.createObjectURL(blob);
                    }
                } catch (error) {
                    CloudExperienceHost.Telemetry.logEvent("BrokeredBackgroundThemeImageError", core.GetJsonFromError(error));
                }
            }

            let imageHref = null;

            if (backgroundImageUri) {
                imageHref = backgroundImageUri;
            }
            else { // Get test image for background after failing to get the theme background on 10x or desktop
                let imgFolderName = "images";
                let imgFileName = "lightBackgroundTest.jpg";
                let imgFullName = "../" + imgFolderName + "/" + imgFileName;
                try {
                    let imageFolder = await Windows.ApplicationModel.Package.current.installedLocation.tryGetItemAsync(imgFolderName);
                    if (imageFolder) {
                        let file = await imageFolder.tryGetItemAsync(imgFileName);
                        if (file) {
                            imageHref = imgFullName;
                        }
                    }
                } catch (error) {
                    CloudExperienceHost.Telemetry.logEvent("GetBackgroundTestImageError", core.GetJsonFromError(error));
                }
            }

            if (imageHref) {
                let svgFilterString = `<filter id="background-blur" x="0" y="0" width="1" height="1">
                                        <feGaussianBlur stdDeviation="45" result="blurred" />
                                      </filter >`;
                let svgBackdropHTML = `<svg class="SVGBackdropImage">` + svgFilterString + `<image href="` + imageHref + `" filter="url(#background-blur)" height="100%" width="100%"> </svg>`;
                backgroundContainer.innerHTML += svgBackdropHTML;
            }
        }

        // A valid app local data url example: "ms-appdata:///local/aa/bb/lightBackgroundTest.jpg"
        SetBackgroundImageUsingAppDataUri(appDataUri) {
            if (!CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("OobeSetBackgroundImage")) {
                return;
            }

            if (!this.isValidAppDataUrl(appDataUri)) {
                CloudExperienceHost.Telemetry.logEvent("SetBackgroundImageUsingAppDataUri_InvalidAppDataUri");
            }
            else {
                let uri = new Windows.Foundation.Uri(appDataUri);
                Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri).then(
                    (file) => {
                        let svgFilterString = `<filter id="background-blur" x="0" y="0" width="1" height="1">
                                                    <feGaussianBlur stdDeviation="45" result="blurred" />
                                                </filter >`;
                        let svgBackdropHTML = `<svg class="SVGBackdropImage">` + svgFilterString + `<image href="` + appDataUri + `" filter="url(#background-blur)" height="100%" width="100%"> </svg>`;

                        let backgroundContainer = document.getElementsByClassName("background-image-container");
                        let backgroundSVGContainer = document.getElementsByClassName("svgContainer");

                        // The current background image element was created without "svgContainer" class. We need to duplicate it under "svgContainer" class.
                        if ((backgroundSVGContainer.length == 0) && (backgroundContainer.length == 1)) {
                            let oldBackgroundSVGBackdropImageEle = document.getElementsByClassName("SVGBackdropImage");

                            // duplicate the old background element
                            let oldBackgroundSVGContainer = document.createElement('div');
                            oldBackgroundSVGContainer.setAttribute('class', 'svgContainer');
                            oldBackgroundSVGContainer.innerHTML = backgroundContainer[0].innerHTML;
                            backgroundContainer[0].appendChild(oldBackgroundSVGContainer);

                            // Remove the old background element
                            oldBackgroundSVGBackdropImageEle[0].remove();

                            backgroundSVGContainer = document.getElementsByClassName("svgContainer");
                        }

                        if (backgroundSVGContainer.length > 0) {
                            let oldBackgroundSVGContainer = backgroundSVGContainer[0];
                            if (backgroundContainer.length > 0) {
                                // Create the new background element with fade in
                                let newBackgroundSVGContainer = document.createElement('div');
                                newBackgroundSVGContainer.setAttribute('class', 'svgContainer');
                                newBackgroundSVGContainer.innerHTML = svgBackdropHTML;
                                newBackgroundSVGContainer.classList.add("fade-in");

                                backgroundContainer[0].appendChild(newBackgroundSVGContainer);

                                // Remove the old background element upon the end of the fade in transition.
                                newBackgroundSVGContainer.addEventListener("animationend", () => {
                                    oldBackgroundSVGContainer.remove();
                                });

                                CloudExperienceHost.Telemetry.logEvent("SetBackgroundImageUsingAppDataUri_Success");
                            }
                            else {
                                CloudExperienceHost.Telemetry.logEvent("SetBackgroundImageUsingAppDataUri_InvalidBackgroundContainerElement");
                            }
                        }
                        else {
                            CloudExperienceHost.Telemetry.logEvent("SetBackgroundImageUsingAppDataUri_InvalidBackgroundSVGContainerElement");
                        }
                    },
                    (error) => {
                        CloudExperienceHost.Telemetry.logEvent("SetBackgroundImageUsingAppDataUri_Error", CloudExperienceHost.GetJsonFromError(error));
                    }
                );
            }
        }

        dispose() {
            appViewManager.unSubscrible();
            appViewManager.unsubscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.Language);
            appViewManager.unsubscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.UpdateDirection);
            appViewManager.unsubscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.InputSwitchButton);
            appViewManager.unsubscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.ResetFooterFocus);

            if (this._webViewCtrl) {
                WinJS.Utilities.empty(this._webViewCtrl);
            }

            let root = document.getElementById("_defaultRoot");
            if (root) {
                WinJS.Utilities.empty(root);
            }

            if (this._inputPane && this._inputShowingListener) {
                this._inputPane.removeEventListener("showing", this._inputShowingListener);
            }
        }

        setWebView(webViewCtrl) {
            this._webViewCtrl = webViewCtrl;
        }

        createWebView() {
            return this._webViewCtrl;
        }

        attachFooterWebView(parentElement) {
            if (!this._footerWebViewCtrl) {
                this._footerWebViewCtrl = document.createElement('x-ms-webview');
                this._footerWebViewCtrl.style.width = '100%';
                this._footerWebViewCtrl.style.height = '100%';
                this._footerWebViewCtrl.style.background = 'transparent';

                CloudExperienceHost.Discovery.getApiRules().done((rules) => {
                    let contractHandler = new CloudExperienceHost.ContractHandler(rules);
                    this._bridge = new CloudExperienceHost.Bridge(this._footerWebViewCtrl, contractHandler);
                    this._footerWebViewCtrl.navigate('ms-appx-web:///core/view/oobeLightFooterHost.html');
                    parentElement.appendChild(this._footerWebViewCtrl);
                });
            }
        }

        getView() {
            return document.getElementById('_view');
        }

        getContentViewBoundingRect() {
            return this._webViewCtrl.getBoundingClientRect();
        }

        getFrameViewBoundingRect() {
            let frameRootEle = document.getElementById("oobeLightFrameView");
            if (frameRootEle) {
                return frameRootEle.getBoundingClientRect();
            }
            return null;
        }

        getChromeFooterOffset() {
            if (this._footerWebViewCtrl) {
                let chromeFooterRect = this._footerWebViewCtrl.getBoundingClientRect();
                return { x: chromeFooterRect.left, y: chromeFooterRect.top };
            } else {
                return { x: 0, y: 0 };
            }
        }

        undimChrome(progressControl, progressText) {
            if (this.showLightFooter) {
                document.querySelector(".footerView").classList.remove("dimmed");
            }

            // Undimming of frame does not change the progress container
            progressControl.removeAttribute("aria-hidden");
            progressText.removeAttribute("aria-hidden");
            progressControl.style.display = "block";
        }

        update(updateType, completeDispatch, errorDispatch, updateTag) {
            let progressControl = document.getElementById("_progress");
            let progressText = document.getElementById("_progressText");
            let progressElement = document.getElementsByTagName("oobe-light-progress")[0];
            let view = this.getView();

            switch (updateType) {
                case CloudExperienceHost.FrameViewModelUpdateType.Progress:
                    this.undimChrome(progressControl, progressText);

                    const displayStyle = "block";
                    progressElement.removeAttribute("aria-hidden");
                    progressElement.style.display = displayStyle;

                    navManager.setDisableBackNavigation(true);

                    WinJS.UI.Animation.crossFade(progressElement, view).done(() => {
                        // We should serialize the hide/show transitions to avoid an earlier hide
                        // of the progress element stomping on a later show request, but since we don't,
                        // make sure we at least end up in the final desired state when the animation ends.
                        progressElement.style.display = displayStyle;
                        progressText.focus();

                        // Adjust the live text value so Narrator reads progress after three seconds
                        // and also on a loop every 30 seconds if progress continues to be up.
                        if (!this._progressTextTimerID) {
                            this._progressTextTimerID = setTimeout(function () {
                                progressText.textContent = progressText.textContent;
                            }, 3000);
                        }

                        if (!this._progressTextIntervalID) {
                            this._progressTextIntervalID = setInterval(function () {
                                progressText.textContent = progressText.textContent;
                            }, 30000);
                        }

                        completeDispatch();
                    }, errorDispatch);
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.View:
                    this.undimChrome(progressControl, progressText);

                    progressElement.setAttribute("aria-hidden", "true");
                    progressControl.setAttribute("aria-hidden", "true");
                    progressText.setAttribute("aria-hidden", "true");

                    if (this._webViewCtrl) {
                        this._webViewCtrl.removeAttribute("aria-hidden");

                        // Put the focus on the web view control on any show view 
                        // This will move focus from chrome elements into the page on navigation by voice/back button
                        this._webViewCtrl.focus();
                        this.setInputModalityChangeListeners();
                    }

                    if (this._progressTextTimerID) {
                        clearTimeout(this._progressTextTimerID);
                        this._progressTextTimerID = null;
                    }

                    if (this._progressTextIntervalID) {
                        clearInterval(this._progressTextIntervalID);
                        this._progressTextIntervalID = null;
                    }

                    WinJS.UI.Animation.crossFade(view, progressElement).done(() => {
                        progressElement.style.display = "none"; // hide the progress element completely
                        completeDispatch();
                    }, errorDispatch);
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.InputSwitchButton:
                    if (this._bridge) {
                        this._bridge.fireEvent(CloudExperienceHost.Events.inputSwitchIndicatorChange);
                    }
                    completeDispatch();
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.Language:
                    if (this._bridge) {
                        this._bridge.fireEvent(CloudExperienceHost.Events.languageChange, updateTag);
                    }
                    document.title = this.getResources().MainFrameAccName;

                    completeDispatch();
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.ResetFooterFocus:
                    if (this._bridge) {
                        this._bridge.fireEvent(CloudExperienceHost.Events.resetFooterFocus);
                    }
                    completeDispatch();
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.UpdateDirection:
                    if (this._bridge) {
                        this._bridge.fireEvent(CloudExperienceHost.Events.updateFrameDirection);
                    }

                    CloudExperienceHost.Globalization.Utils.setDocumentElementLangAndDir();
                    completeDispatch();
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.GraphicAnimation:
                    if (this._previousAnimationFile !== updateTag) {
                        this._previousAnimationFile = updateTag;
                        if (this._anim) {
                            this.exitAnim();
                        }
                        setTimeout(() => {
                            this.clearAnimation();
                            if (updateTag) {
                                let animationContainer = document.getElementById("animation");
                                animationContainer.setAttribute("aria-hidden", "true");
                                this._anim = this.loadAnims(animationContainer, updateTag);
                            }
                        }, 500);
                    }
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.Dimmed:
                    if (this.showLightFooter) {
                        document.querySelector(".footerView").classList.add("dimmed");
                    }

                    if (this._webViewCtrl && appViewManager.isChromeDimBasedOnFocus()) {
                        this._webViewCtrl.setAttribute("aria-hidden", "true");
                    }

                    // Dimming of frame does not change the progress container
                    // progress timers should be cleared to prevent the progress text from grabbing Narrator focus.
                    if (this._progressTextTimerID) {
                        clearTimeout(this._progressTextTimerID);
                        this._progressTextTimerID = null;
                    }

                    if (this._progressTextIntervalID) {
                        clearInterval(this._progressTextIntervalID);
                        this._progressTextIntervalID = null;
                    }
                    progressText.blur();
                    progressControl.style.display = "none";     // hide the progress element completely
                    progressControl.setAttribute("aria-hidden", "true");
                    progressText.setAttribute("aria-hidden", "true");
                    completeDispatch();
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.Undimmed:
                    if (this._webViewCtrl && appViewManager.isChromeDimBasedOnFocus()) {
                        this._webViewCtrl.removeAttribute("aria-hidden");
                    }

                    this.undimChrome(progressControl, progressText);
                    progressText.focus();
                    completeDispatch();
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.SetDisplayModeFullScreen:
                    let frameRootEle = document.getElementById("oobeLightFrameView").parentElement;
                    if (frameRootEle) {
                        frameRootEle.classList.add("fullscreen");

                        // After animation and backdrop have faded, collapse the animation half
                        setTimeout(() => {
                            let frameRootGraphicEle = frameRootEle.getElementsByClassName("graphic");
                            if (frameRootGraphicEle.length > 0) {
                                frameRootGraphicEle[0].classList.add("collapsed");
                            }
                        }, 333);
                    }
                    completeDispatch();
                    break;

                case CloudExperienceHost.FrameViewModelUpdateType.SetBackgroundImage:
                    if (updateTag) {
                        this.SetBackgroundImageUsingAppDataUri(updateTag);
                        completeDispatch();
                    }
                    break;
            }
        }

        isValidHttpsUrl(string) {
            let url;
            try {
                url = new URL(string);
            } catch (e) {
                // No need to log error here in order to decrease unnecessary noise
                return false;
            }
            return url.protocol === "https:";
        }

        isValidAppDataUrl(string) {
            let url;
            try {
                url = new URL(string);
            } catch (e) {
                // No need to log error here in order to decrease unnecessary noise
                return false;
            }
            return url.protocol === 'ms-appdata:';
        }

        clearAnimation() {
            if (this._anim) {
                bodymovin.destroy(this._anim.name);
                this._anim = null;
            }
        }

        // Function to load all bodymovin animations and assign event listeners to each
        loadAnims(animationContainer, fileName) {
            let element = animationContainer,
                thisAnim = null,
                file = fileName,
                name = file.replace(/$.json/, ""),
                path = (this.isValidHttpsUrl(fileName) || this.isValidAppDataUrl(fileName)) ? fileName : ("../images/" + file),
                assetsPath = (this.isValidHttpsUrl(fileName) || this.isValidAppDataUrl(fileName)) ? "ms-appdata:///temp/" : "../images/",
                params = {
                    assetsPath: assetsPath,
                    container: element,
                    renderer: "svg",
                    name: name,
                    loop: false,
                    autoplay: false,
                    path: path
                };

            thisAnim = bodymovin.loadAnimation(params);

            // Add events to this animation
            thisAnim.addEventListener('DOMLoaded', () => {
                parent = element.parentNode;
                this.enterAnim(false);
            });

            CloudExperienceHost.Telemetry.logEvent("LottieAnimationFileName", JSON.stringify({path: params.path, assetsPath: params.assetsPath}));
            return thisAnim;
        }

        enterAnim(loop) {
            if (this._anim.isPaused) {
                this._anim.loop = loop;
                this._anim.playSegments([0, 120], true);
            }
        }

        exitAnim() {
            if (this._anim.isPaused) {
                this._anim.loop = false;
                this._anim.playSegments([180, 210], false);
            }
        }
    }
    return LiteFrameViewModel;
});
