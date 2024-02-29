//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Hello;
    (function (Hello) {
        var resourceStrings = {};
        var enrollmentKinds = {};
        var targetPersonality = "CloudExperienceHost.personality.Unspecified";
        var helloAnim = null;
        var isLiteWhitePersonality = false;
        var showConfirmationPage = false;
        var isMultiChoice = false;
        var isFaceSelected = true;
        var faceDisambiguationChoice = { title: "", description: "", glyph: "\uEB68" };
        var fingerDisambiguationChoice = { title: "", description: "", glyph: "\uE928" };
        var disambiguationArray = [faceDisambiguationChoice, fingerDisambiguationChoice];
        Hello.enrollmentList = new WinJS.Binding.List(disambiguationArray);
        WinJS.UI.Pages.define("/views/helloEnrollment.html", {
            init: function (element, options) {
                require.config(new RequirePathConfig('/webapps/inclusiveOobe'));
                let pagePromise = new WinJS.Promise(function (completeDispatch, errorDispatch) {
                    requireAsync(['legacy/bridge']).then((result) => {
                        let bridge = result.legacy_bridge;
                        function _checkIfEnrollmentSupportedAndGetReady(completeDispatch, errorDispatch) {
                            bridge.invoke("CloudExperienceHost.Hello.getSupportedHelloEnrollmentKinds").then(function (kinds) {
                                enrollmentKinds = JSON.parse(kinds);
                                isMultiChoice = (enrollmentKinds && enrollmentKinds.face && enrollmentKinds.fingerprint);
                                if (enrollmentKinds && (enrollmentKinds.face || enrollmentKinds.fingerprint)) {
                                    let langAndDirPromise = requireAsync(['legacy/uiHelpers']).then((result) => {
                                        return result.legacy_uiHelpers.LangAndDirPromise(document.documentElement, bridge);
                                    });

                                    let getLocalizedStringsPromise = bridge.invoke("CloudExperienceHost.StringResources.makeResourceObject", "oobeHello").then((result) => {
                                        resourceStrings = JSON.parse(result);
                                    });

                                    let getPersonalityPromise = bridge.invoke("CloudExperienceHost.getContext").then((targetContext) => {
                                        targetPersonality = targetContext.personality;
                                        isLiteWhitePersonality = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite);
                                        showConfirmationPage = isLiteWhitePersonality;
                                    });

                                    let getLearnMoreContentPromise = requireAsync(['oobesettings-data']).then((result) => {
                                        return result.oobesettings_data.initializeLearnMoreContentAsync();
                                    });

                                    WinJS.Promise.join({ langAndDirPromise: langAndDirPromise, getLocalizedStringsPromise: getLocalizedStringsPromise, getPersonalityPromise: getPersonalityPromise, getLearnMoreContentPromise: getLearnMoreContentPromise }).then(completeDispatch, errorDispatch);
                                } else {
                                    completeDispatch();
                                }
                            }, function (e) {
                                errorDispatch(e);
                            });
                        }
                        function _checkIfNthSkipCondition(completeDispatch, errorDispatch) {
                            bridge.invoke("CloudExperienceHost.UnifiedEnroll.checkIfPinPromptScenario").then(function (result) {
                                if (result) {
                                    _checkIfEnrollmentSupportedAndGetReady(completeDispatch, errorDispatch);
                                } else {
                                    // This should only fire in the NTHENTORMDM or NTHAADORMDM flows, else the app will "Fall Off" and quit.
                                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentSkipInNthFlow");
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action1);
                                }
                            }, function (e) {
                                _checkIfEnrollmentSupportedAndGetReady(completeDispatch, errorDispatch);
                            });
                        }
                        // Check to see if a previous component would like us to be skipped
                        bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "skipNGC").then(function (skipNGC) {
                            if (skipNGC) {
                                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentSkippedViaSharableData");
                                completeDispatch();
                            }
                            else {
                                _checkIfNthSkipCondition(completeDispatch, errorDispatch);
                            }
                        }, function (e) {
                            _checkIfNthSkipCondition(completeDispatch, errorDispatch);
                        });
                    });
                });

                let cssPromise = requireAsync(['legacy/uiHelpers', 'legacy/bridge']).then((result) => {
                    return result.legacy_uiHelpers.LoadCssPromise(document.head, "..", result.legacy_bridge);
                });

                return WinJS.Promise.join({ cssPromise: cssPromise, pagePromise: pagePromise });
            },
            ready: function (element, options) {
                let bridge = new CloudExperienceHost.Bridge();

                if (isLiteWhitePersonality) {
                    setLiteStyles();
                } else {
                    setBlueStyles();
                }

                // Elements based on supported hardware
                if (enrollmentKinds && (enrollmentKinds.face || enrollmentKinds.fingerprint)) {
                    // Next button
                    NextButton.textContent = resourceStrings["HelloButtonText"];
                    NextButton.addEventListener("click", enrollHelloButtonClick);
                    NextButton.focus();

                    if (isMultiChoice) {
                        _logEvent("ShowingHelloEnrollmentPage", "Face AND Fingerprint");

                        if (!isLiteWhitePersonality) {
                            // Remove the non-applicable elements
                            _setVisibility(FaceOrFingerprint, false);
                            _setVisibility(HelloSwitchLinkContentBox, false);

                            // Set the ListView properties
                            let rootStyle = window.getComputedStyle(_htmlRoot, "");
                            let rootBackgroundColor = rootStyle.getPropertyValue("background-color");
                            EnrollmentChoiceItemTemplateStyle.style = "height: 125px; display: -ms-grid; background-color: " + rootBackgroundColor;

                            Title.textContent = resourceStrings['HelloTitleMulti'];
                            faceDisambiguationChoice.title = resourceStrings['HelloOptionTitleFace'];
                            faceDisambiguationChoice.description = resourceStrings['HelloLeadTextFace'];
                            fingerDisambiguationChoice.title = resourceStrings['HelloOptionTitleFingerprint'];
                            fingerDisambiguationChoice.description = resourceStrings['HelloOptionBodyFingerprint'];

                            NextButton.disabled = true;
                            EnrollmentListView.addEventListener("iteminvoked", function (e) {
                                NextButton.disabled = false;
                                if (disambiguationArray[e.detail.itemIndex] === faceDisambiguationChoice) {
                                    _logEvent("HelloEnrollmentDisambiguationFaceSelected");
                                    enrollmentKinds.face = true;
                                    enrollmentKinds.fingerprint = false;
                                }
                                else {
                                    _logEvent("HelloEnrollmentDisambiguationFingerprintSelected");
                                    enrollmentKinds.fingerprint = true;
                                    enrollmentKinds.face = false;
                                }
                            });
                            EnrollmentListView.focus();
                        } else {
                            // This applies in isMultiChoice and isLiteWhitePersonality scenarios
                            _setVisibility(FaceAndFingerprint, false);
                            renderFace();
                            HelloSwitchHyperlink.textContent = resourceStrings["HelloSwitchFaceToFingerprint"];
                            HelloSwitchHyperlink.addEventListener("click", onHelloSwitchHyperlinkClicked);
                        }
                    } else {
                        // Remove the non-applicable elements
                        _setVisibility(FaceAndFingerprint, false);
                        _setVisibility(HelloSwitchLinkContentBox, false);

                        if (enrollmentKinds.face) {
                            renderFace();
                        } else {
                            renderFingerprint();
                        }
                    }

                    HelloLearnMoreLink.textContent = resourceStrings['HelloLearnMoreLinkText'];
                    HelloLearnMoreLink.addEventListener("click", function (event) {
                        event.preventDefault();
                        onLearnMoreClick();
                    });

                    // Learn More content
                    LearnMoreTitle.textContent = resourceStrings['HelloLearnMoreLinkText'];
                    ContinueButton.textContent = resourceStrings['HelloContinueButtonText'];
                    ContinueButton.addEventListener("click", onLearnMoreContinue);
                    document.getElementById("LearnMoreContent").style.display = "none";
                    // Breadcrumb for version of experience being rendered, and includes the learn more link.
                    // Event should align with "ShowingHelloEnrollmentPage" event fired above.
                    // This event should be kept the same as in oobehello-page.js.
                    bridge.invoke("CloudExperienceHost.Telemetry.commitIntentPropertyDWORDAsync", "WindowsHello", "LearnMoreAvailable", 1);

                    // Enable page
                    bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                } else {
                    _logEvent("NotShowingHelloEnrollmentPage");
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.abort);
                }

                function enrollHelloButtonClick() {
                    event.preventDefault();
                    NextButton.disabled = true; // prevent double click
                    getViewBoundingRectandEnroll();
                }

                function setLiteStyles() {
                    // Adding class to divs based on Personality
                    document.getElementById("appContainer").className = "body-container";
                    document.getElementById("content").className = "container-content";
                    document.getElementById("LearnMoreContent").className = "container-content";
                    document.getElementById("skipDivs").style.visibility = "hidden";
                    SkipLink.disabled = true;
                    _setVisibility(SkipLink, false);
                    document.getElementById("easeOfAccessDiv").remove();
                    skipForNow(SkipLinkLite);
                    document.getElementById("LearnMoreControlPage").style.margin = "0";
                }

                function setBlueStyles() {
                    _setVisibility(SkipLinkLite, false);
                    SkipLinkLite.disabled = true;
                    skipForNow(SkipLink);
                    document.getElementById("appContainer").className = "control-app";
                    document.getElementById("content").className = "app-content";
                    document.getElementById("LearnMoreContent").className = "app-content";
                    document.getElementById("LearnMorePageBody").style.display = "flex";
                    document.getElementById("LearnMorePageBody").style.flexDirection = "column";
                    // Call to register EaseOfAccess control
                    uiHelpers.RegisterEaseOfAccess(easeOfAccess, bridge);
                }

                function renderFace() {
                    _logEvent("ShowingHelloEnrollmentPage", "Face");
                    _setVisibility(FingerprintOnlyGlyph, false);
                    Title.textContent = resourceStrings['HelloTitleFace'];
                    LeadText.textContent = resourceStrings['HelloLeadTextFace'];
                    if (isLiteWhitePersonality) {
                        _setVisibility(FaceOnlyGlyph, false);
                        HelloSwitchHyperlink.textContent = resourceStrings["HelloSwitchFaceToFingerprint"];
                        enrollmentKinds.face = true;
                        enrollmentKinds.fingerprint = false;
                        bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", "winhellofaceLottie.json");
                    } else {
                        FaceOnlyGlyph.textContent = "\uEB68";
                        FaceOnlyGlyph.setAttribute("aria-label", resourceStrings['HelloFaceIconAriaLabel']);
                    }
                }

                function renderFingerprint() {
                    _logEvent("ShowingHelloEnrollmentPage", "Fingerprint");
                    _setVisibility(FaceOnlyGlyph, false);
                    Title.textContent = resourceStrings['HelloTitleFingerprint'];
                    LeadText.textContent = resourceStrings['HelloLeadTextFingerprint'];
                    if (isLiteWhitePersonality) {
                        _setVisibility(FingerprintOnlyGlyph, false);
                        HelloSwitchHyperlink.textContent = resourceStrings["HelloSwitchFingerprintToFace"];
                        enrollmentKinds.fingerprint = true;
                        enrollmentKinds.face = false;
                        bridge.invoke("CloudExperienceHost.AppFrame.showGraphicAnimation", "winhellofingerprintLottie.json");
                    } else {
                        FingerprintOnlyGlyph.textContent = "\uE928";
                        FingerprintOnlyGlyph.setAttribute("aria-label", resourceStrings['HelloFingerprintIconAriaLabel']);
                    }
                }

                function skipForNow(skip) {
                    skip.textContent = resourceStrings["Hello" + SkipLink.id];
                    skip.addEventListener("click", function (event) {
                        event.preventDefault();
                        _logEvent("HelloEnrollmentCanceled");
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.cancel);
                    });
                }

                function _logEvent(eventName, eventParam) {
                    if (eventParam) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", eventName, eventParam);
                    } else {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", eventName);
                    }
                }

                function _setVisibility(container, visible) {
                    container.style.visibility = (visible) ? 'visible' : 'hidden';
                    container.style.display = (visible) ? 'inline' : 'none';
                    container.setAttribute("aria-hidden", (visible) ? "false" : "true");
                }

                function onHelloSwitchHyperlinkClicked() {
                    isFaceSelected = !isFaceSelected;

                    if (isFaceSelected) {
                        renderFace();
                    } else {
                        renderFingerprint();
                    }
                }

                function onLearnMoreClick() {
                    bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "LearnMoreButtonClicked");
                    document.getElementById("content").style.display = "none";
                    document.getElementById("LearnMoreContent").style.display = "flex";

                    let learnMoreIFrame = document.getElementById("hello-learnmore-iframe");
                    learnMoreIFrame.setAttribute("aria-label", resourceStrings['HelloLearnMoreLinkText']);
                    let doc = learnMoreIFrame.contentWindow.document;
                    require(['corejs/knockouthelpers', 'oobesettings-data'], function (KoHelpers, oobeSettingsData) {
                        bridge.invoke("CloudExperienceHost.Environment.hasInternetAccess").done(function (isConnectedToNetwork) {
                            KoHelpers.loadIframeContent(doc, {content: oobeSettingsData.getLearnMoreContent(), dir:document.documentElement.dir, focusBody: true});
                            oobeSettingsData.updateLearnMoreContentForRender(doc, document.documentElement.dir, isConnectedToNetwork, resourceStrings['HelloLearnMoreNavigationError'], _setUpLearnMorePersonality(), "WindowsHello");
                        });
                    });
                }

                function onLearnMoreContinue() {
                    let learnMoreIFrame = document.getElementById("hello-learnmore-iframe");
                    learnMoreIFrame.src = "about:blank"; // Clear the iframe when navigating away from learn more page. Otherwise, we may not be able to re-access the contentWindows.document to re-render.
                    bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "LearnMoreContinueButtonClicked");
                    document.getElementById("LearnMoreContent").style.display = "none";
                    document.getElementById("content").style.display = "flex";
                    NextButton.focus();
                }

                function loadContentAnims(contentAnimations, file, path) {
                    let name = file.replace(/$.json/, "");
                    let params = {
                        assetsPath: path,
                        container: contentAnimations,
                        renderer: "svg",
                        name: name,
                        loop: false,
                        autoplay: false,
                        path: path + file
                    };
                    let anim = bodymovin.loadAnimation(params);
                    anim.addEventListener('DOMLoaded', function () {
                        anim.goToAndStop(1, true);
                    });
                    return anim;
                }

                function playAnim(anim, loop) {
                    if (anim.isPaused) {
                        anim.loop = loop;
                        anim.play();
                    }
                }

                function getEnrollmentPersonality() {
                    let personality = CloudExperienceHostBroker.Hello.EnrollmentPersonality.notSpecified;
                    switch (targetPersonality) {
                        case CloudExperienceHost.TargetPersonality.InclusiveBlue:
                            personality = CloudExperienceHostBroker.Hello.EnrollmentPersonality.inclusiveBlue;
                            break;
                        case CloudExperienceHost.TargetPersonality.LiteWhite:
                            personality = CloudExperienceHostBroker.Hello.EnrollmentPersonality.liteWhite;
                            break;
                        default:
                            break;
                    }
                    return personality;
                }

                function updateToConfirmationPage() {
                    HeaderDiv.classList.add("error-light");
                    Title.textContent = resourceStrings['AllSetText'];
                    _setVisibility(Title, true);
                    _setVisibility(HelloLearnMoreLink, false);
                    document.getElementById("content").style.display = "flex";
                    NextButton.textContent = resourceStrings["NextButtonText"];
                    // Remove _enroll() function added to the button before confirmation page
                    NextButton.removeEventListener("click", enrollHelloButtonClick);
                    NextButton.addEventListener("click", function () {
                        event.preventDefault();
                        _logEvent("HelloEnrollmentSuccess");
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    });
                    NextButton.disabled = false;
                }

                function getViewBoundingRectandEnroll() {
                    var rect = {
                        height: 0,
                        width: 0,
                        x: 0,
                        y: 0
                    };
                    if (isLiteWhitePersonality) {
                        bridge.invoke("CloudExperienceHost.getFrameViewBoundingRect").done((result) => {
                            rect = {
                                height: result.height,
                                width: result.width,
                                x: result.x * window.devicePixelRatio,
                                y: result.y * window.devicePixelRatio
                            };
                            _setVisibility(SkipLinkLite, false);
                            _enroll(rect);
                        }, (error) => {
                            _logEvent("HelloEnrollmentSizingFailed", core.GetJsonFromError(error));
                            bridge.fireEvent(constants.Events.done, constants.AppResult.fail);
                        });
                    } else {
                        _enroll(rect);
                    }
                }

                // Helper function to invoke the Hello enrollment app
                function _enroll(rect) {
                    _logEvent("HelloEnrollmentShowingEnrollmentApp");
                    uiHelpers.SetElementVisibility(PageContent, false);
                    document.getElementById("content").style.display = "none";

                    let personality = getEnrollmentPersonality();
                    bridge.invoke("CloudExperienceHost.Hello.startHelloEnrollment", enrollmentKinds, rect, personality).then(function (enrollResult) {
                        let enrollmentResult = JSON.parse(enrollResult);
                        if (enrollmentResult.completed) {
                            if (showConfirmationPage) {
                                updateToConfirmationPage();
                            } else {
                                _logEvent("HelloEnrollmentSuccess");
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                            }
                        } else { // Report enrollmentResult.incomplete and enrollmentResult.compeltedWithError as a cancel event
                            _logEvent("HelloEnrollmentCanceled");
                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.cancel);
                        }
                    }, function (e) {
                        _logEvent("HelloEnrollmentFailed", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                    });
                }

                function _setUpLearnMorePersonality() {
                    // Learn More supports rendering in white-on-blue (InclusiveBlue) or black-on-white (LiteWhite).
                    // Since this page is reused across scenarios that pre-date the explicit use of Personalities,
                    // we force the background color to white and Personality to LiteWhite (HC is still respected).
                    let returnPersonality = targetPersonality;
                    if (returnPersonality === CloudExperienceHost.TargetPersonality.Unspecified) {
                        let learnMoreIFrame = document.getElementById("hello-learnmore-iframe");
                        learnMoreIFrame.style.backgroundColor = "white";
                        returnPersonality = CloudExperienceHost.TargetPersonality.LiteWhite;
                    }
                    return returnPersonality;
                }
            },
            error: function (e) {
                require(["legacy/bridge"], function (bridge) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HelloEnrollmentWinJSPageError", JSON.stringify({ number: e && e.number.toString(16), stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                });
            },
        });
    })(Hello = CloudExperienceHost.Hello || (CloudExperienceHost.Hello = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
