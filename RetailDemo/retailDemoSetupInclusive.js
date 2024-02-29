// Copyright (C) Microsoft. All rights reserved.
(function () {
    "use strict";

    var bridge = new CloudExperienceHost.Bridge();
    var resources;
    var navFlow;
    var rdamJson = null;
    var racErrorExists = false; // True iff an invalid RAC was entered
    var blockNext = false; // If true, block the next button
    var racCode = "";

    WinJS.UI.Pages.define("/RetailDemo/retailDemoSetupInclusive.html", {
        init: function (element, options) {
            require.config(new RequirePathConfig('/webapps/inclusiveOobe'));
            let pagePromise = bridge.invoke("CloudExperienceHost.StringResources.getRetailDemoStrings").done(function (result) {
                resources = JSON.parse(result);
            });
            let cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            let languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _rdxHtmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            let dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _rdxHtmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            let navFlowPromise = bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                navFlow = result.host;
            }, function () { });

            return WinJS.Promise.join({ pagePromise: pagePromise, cssPromise: cssPromise, languagePromise: languagePromise, dirPromise: dirPromise, navFlowPromise: navFlowPromise });
        },

        ready: function (element, options) {
            let processingFlag = false;

            // Load string resources in HTML elements
            document.title = resources.rdxTitle;
            rdamTitle.textContent = resources.rdamTitle;
            rdamText.textContent = resources.rdamText;
            racLegend.textContent = resources.racLegend;
            skuLegend.textContent = resources.skuLegend;
            storeIdLegend.textContent = resources.storeIdLegend;
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBE_Edit_Box_Control_Type_Accessibility")) {
                racInput.setAttribute("aria-label", resources.racLegend);
                skuInput.setAttribute("aria-label", resources.skuLegend);
                storeIdInput.setAttribute("aria-label", resources.storeIdLegend);
            }
            extraConfigButton.textContent = resources.extraConfigText;
            nextButton.textContent = resources.nextButton;
            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBERACValidation")) {
                continueWithoutRAC.textContent = resources.continueWithoutRAC;
            }

            let platform = CloudExperienceHost.Environment.getPlatform();

            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_TimedShutdown") && !(platform === CloudExperienceHost.TargetPlatform.MOBILE)) {
                extraConfigButton.style.visibility = "visible";
            }

            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBERACValidation")) {
                continueWithoutRAC.style.visibility = "visible";
                extraConfigButton.className += " alt-button button_secondary";
            }

            // Verify that the RAC is alphanumeric.
            // If so, proceed to retrieve the list of SKUs from RDAM.
            racInput.addEventListener("change", function () {
                if (racCode != racInput.value) {
                    racCode = racInput.value;

                    if (racErrorExists) {
                        racError.style.display = 'none';
                        racError.setAttribute("aria-label", null);
                        racInput.classList.remove("inputState_error");
                        if (racError.firstChild) {
                            racError.removeChild(racError.firstChild);
                        }
                        racErrorExists = false;
                    }

                    skuInput.disabled = true;
                    storeIdInput.disabled = true;

                    // Verify that the RAC is alphanumeric.
                    verifyRacAndUpdateUI();
                }
            });

            // Set RAC/SKU, create RetailAdmin if necessary, fire done
            nextButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBERACValidation")) {
                    if (!blockNext && !processingFlag && !isRACBlank()) {
                        processingFlag = true;
                        bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);
                        writeRegAndEnableAsyncThen(function () {
                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                        }, function (error) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "RetailInfoSetterFailure", JSON.stringify({ number: error.number.toString(16), description: error.description }));
                            switch (navFlow) {
                                case "FRXRDXMOB":
                                    // Proceed to rdxMsa
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                                    break;
                                case "FRXINCLUSIVE":
                                case "RDXPOSTOOBEINCLUSIVE":
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                    break;
                                case "RDXRACSKUINCLUSIVE":
                                    // Allow the user to retry setting RAC/SKU as they can always close the app if things are really stuck
                                    processingFlag = false;
                                    bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                                    break;
                                default: // Unknown flow
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.abort);
                                    break;
                            }
                        });
                    }
                } else {
                    if (!blockNext && !processingFlag) {
                        processingFlag = true;
                        bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);
                        writeRegAndEnableAsyncThen(function () {
                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                        }, function (error) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "RetailInfoSetterFailure", JSON.stringify({ number: error.number.toString(16), description: error.description }));
                            switch (navFlow) {
                                case "RDXFRXMOB":
                                    // Proceed to rdxMsa
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                                    break;
                                case "FRXINCLUSIVE":
                                case "RDXPOSTOOBEINCLUSIVE":
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                    break;
                                case "RDXRACSKUINCLUSIVE":
                                    // Allow the user to retry setting RAC/SKU as they can always close the app if things are really stuck
                                    processingFlag = false;
                                    bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                                    break;
                                default: // Unknown flow
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.abort);
                                    break;
                            }
                        });
                    }
                }
            });

            extraConfigButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                if (!blockNext) {
                    writeRegAndEnableAsyncThen(function () {
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action1);
                    }, function (error) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "RetailInfoSetterFailure", JSON.stringify({ number: error.number.toString(16), description: error.description }));
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action1);
                    });
                }
            });

            // Launch the MSA sign in flow
            continueWithoutRAC.addEventListener("click", function (eventInfo) {
                if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBERACValidation")) {
                    eventInfo.preventDefault();
                    // SKIP means skipping the value of RAC and taking it as blank
                    racInput.value = "";
                    // don't block if Next is blocked as user is trying to SKIP it
                    if (!processingFlag) {
                        // reusing code of "Next" flow
                        processingFlag = true;
                        bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OOBEContinueWithoutRAC", racInput.value);
                        // need these keys for apps to function
                        writeRegAndEnableAsyncThen(function () {
                            bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                        }, function (error) {
                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "RetailInfoSetterFailure", JSON.stringify({ number: error.number.toString(16), description: error.description }));
                            switch (navFlow) {
                                case "FRXRDXMOB":
                                    // Proceed to rdxMsa
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                                    break;
                                case "FRXINCLUSIVE":
                                case "RDXPOSTOOBEINCLUSIVE":
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                    break;
                                case "RDXRACSKUINCLUSIVE":
                                    // Allow the user to retry setting RAC/SKU as they can always close the app if things are really stuck
                                    processingFlag = false;
                                    bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                                    break;
                                default: // Unknown flow
                                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.abort);
                                    break;
                            }
                        });
                    }
                }
            });

            if (Windows.System.Profile.RetailInfo.properties.hasKey("RetailAccessCode")) {
                racInput.value = Windows.System.Profile.RetailInfo.properties.lookup("RetailAccessCode");
                verifyRacAndUpdateUI();
            }

            if (Windows.System.Profile.RetailInfo.properties.hasKey("SKU")) {
                skuInput.value = Windows.System.Profile.RetailInfo.properties.lookup("SKU");
            }

            if (Windows.System.Profile.RetailInfo.properties.hasKey("StoreID")) {
                storeIdInput.value = Windows.System.Profile.RetailInfo.properties.lookup("StoreID");
            }

            bridge.fireEvent(CloudExperienceHost.Events.visible, true);

            // Write RAC and SKU to registry
            function writeRegAndEnableAsyncThen(complete, error) {
                if (navFlow === "RDXRACSKUINCLUSIVE") {
                    // Settings app based launch
                    WinJS.Promise.join({
                        setRacPromise: CloudExperienceHostBroker.RetailDemo.ConfigureRetailDemo.setRetailInfoStringValue("RetailAccessCode", racInput.value),
                        setSkuPromise: CloudExperienceHostBroker.RetailDemo.ConfigureRetailDemo.setRetailInfoStringValue("SKU", skuInput.value),
                        setStoreIdPromise: CloudExperienceHostBroker.RetailDemo.ConfigureRetailDemo.setRetailInfoStringValue("StoreID", storeIdInput.value)
                    }).done(complete, error);
                } else {
                    let promises = {
                        setRacPromise: bridge.invoke("RetailDemo.Internal.RetailInfoSetter.setStringAsync", "RetailAccessCode", racInput.value),
                        setSkuPromise: bridge.invoke("RetailDemo.Internal.RetailInfoSetter.setStringAsync", "SKU", skuInput.value),
                        setStoreIdPromise: bridge.invoke("RetailDemo.Internal.RetailInfoSetter.setStringAsync", "StoreID", storeIdInput.value)
                    };
                    // Desktop will be enabled by the retaildemoplugin and doesn't need this
                    if (CloudExperienceHost.Environment.getPlatform() !== CloudExperienceHost.TargetPlatform.DESKTOP) {
                        promises.enableDemoPromise = bridge.invoke("RetailDemo.Internal.RetailDemoSetup.enableDemoAsync");
                    }
                    WinJS.Promise.join(promises).done(complete, error);
                }
            }

            function verifyRacAndUpdateUI() {
                // trim spaces
                if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBERACValidation")) {
                    racInput.value = racInput.value.trim();
                }
                // Check if alphanumeric
                if (racInput.value.match(/^[a-zA-Z\d]+$/)) {
                    blockNext = true;
                    racInput.disabled = true;
                    let ring = document.createElement("progress");
                    ring.id = "rdamProgress";
                    ring.className = "win-ring win-small";
                    progressContainer.appendChild(ring);
                    nextButton.classList.remove("button_primary");

                    // Only verify further if we have connectivity
                    bridge.invoke("CloudExperienceHost.Environment.hasInternetAccess").done(function (connected) {
                        if (connected) {
                            // Query RDAM, timeout of 30 seconds
                            let options = {
                                url: "https://retailstore.microsoft.com/RedecsService/Content/api/attributes/metadata?RAC=" + racInput.value,
                                responseType: "json"
                            };
                            WinJS.Promise.timeout(30000, bridge.invoke("WinJS.xhr", options)).then(
                                function (result) {
                                    rdamJson = result.response;
                                    if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBERACValidation")) {
                                        if (isRACExpired()) {
                                            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OOBERACExpiry ", racInput.value);
                                            showRacError(resources.errorExpiredRac);
                                            progressContainer.removeChild(rdamProgress);
                                            racInput.disabled = false;
                                        } else {
                                            allowUserToContinue();
                                        }
                                    } else {
                                        allowUserToContinue();
                                    }
                                },
                                function (error) {
                                    // Status code is 0 if interent goes out or url doesn't exist for some reason
                                    if ((error.message === "Canceled") || (error.status === 0)) {
                                        showRacError(resources.errorRequestTimeout);
                                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "RdamRequestTimeout");
                                        allowUserToContinue();
                                    } else {
                                        showRacError(resources.errorInvalidRac);
                                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "InvalidRac", racInput.value);
                                        progressContainer.removeChild(rdamProgress);
                                        racInput.disabled = false;
                                    }
                                }
                            );
                        } else {
                            allowUserToContinue();
                        }
                    });
                } else if (racInput.value.length > 0) {
                    blockNext = true;
                    nextButton.classList.remove("button_primary");
                    showRacError(resources.errorInvalidRac);
                } else {
                    if (blockNext) {
                        nextButton.classList.add("button_primary");
                        blockNext = false;
                    }
                }
            }

            // Show an error message under the RAC input
            function showRacError(message) {
                if (racError.firstChild) {
                    racError.removeChild(racError.firstChild);
                }
                racErrorExists = true;
                racInput.classList.add("inputState_error");
                let text = document.createElement("p");
                text.textContent = message;
                text.setAttribute("aria-hidden", "true");
                let tooltip = document.createElement("div");
                if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBE_Alert_Contrast_Mode_Accessibility")) {
                    tooltip.className = "errorDialog-dialogRoot template-tooltip tooltipType_error_rdx";
                } else {
                    tooltip.className = "errorDialog-dialogRoot template-tooltip tooltipType_error";
                }
                
                tooltip.appendChild(text);

                racError.appendChild(tooltip);
                racError.setAttribute("aria-label", message);
                racError.style.display = 'inline';
            }

            // Enable all text entry fields and the next button
            function allowUserToContinue() {
                skuInput.disabled = false;
                storeIdInput.disabled = false;
                racInput.disabled = false;
                // Be careful where calling allowUserToContinue from
                // so that rdamProgress exists/isn't removed twice.
                progressContainer.removeChild(rdamProgress);
                nextButton.classList.add("button_primary");
                blockNext = false;
            }

            function isRACBlank() {
                if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBERACValidation")) {
                    if (racInput.value.length > 0) {
                        return false;
                    }

                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OOBEBlankRACNextClick");
                    showRacError(resources.errorBlankRac);

                    return true;
                }
                return false;
            }

            function isRACExpired() {
                if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_OOBERACValidation")) {
                    if (rdamJson.hasOwnProperty("RetailerAccessCodes") && rdamJson.RetailerAccessCodes.length != 0 && rdamJson.RetailerAccessCodes[0].hasOwnProperty("ExpirationDate")) {
                        let currDate = new Date();
                        let racExpiryDate = new Date(rdamJson.RetailerAccessCodes[0].ExpirationDate);
                        return currDate > racExpiryDate;
                    }
                    // Considering RAC is valid when the json fetched from redecs is corrupt
                    return false;
                }
                return false;
            }
        }
    });
})();
