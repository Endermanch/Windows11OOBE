// Copyright (C) Microsoft. All rights reserved.
(function () {
    "use strict";

    var bridge = new CloudExperienceHost.Bridge();
    var resources;
    var navFlow;
    var rdamJson = null;
    var racErrorExists = false; // True iff an invalid RAC was entered
    var blockNext = false; // If true, block the next button

    WinJS.UI.Pages.define("/RetailDemo/retailDemoSetup.html", {
        init: function (element, options) {
            let pagePromise = bridge.invoke("CloudExperienceHost.StringResources.getRetailDemoStrings").done(function (result) {
                resources = JSON.parse(result);
            });
            let cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            let languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _htmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            let dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _htmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            let navFlowPromise = bridge.invoke("CloudExperienceHost.getContext").then(function (result) {
                navFlow = result.host;
            }, function () { });

            return WinJS.Promise.join({ pagePromise: pagePromise, cssPromise: cssPromise, languagePromise: languagePromise, dirPromise: dirPromise, navFlowPromise: navFlowPromise });
        },

        ready: function (element, options) {
            // Load string resources in HTML elements
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

            let platform = CloudExperienceHost.Environment.getPlatform();

            if (CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled("RDX_TimedShutdown") && !(platform === CloudExperienceHost.TargetPlatform.MOBILE))
            {
                extraConfigButton.style.visibility = "visible";
            }

            // Verify that the RAC is alphanumeric.
            // If so, proceed to retrieve the list of SKUs from RDAM.
            racInput.addEventListener("change", function () {
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

                // Check if alphanumeric
                if (racInput.value.match(/^[a-zA-Z\d]+$/)) {
                    blockNext = true;
                    racInput.disabled = true;
                    let ring = document.createElement("progress");
                    ring.id = "rdamProgress";
                    ring.className = "win-ring win-small";
                    progressContainer.appendChild(ring);
                    nextButton.classList.remove("button_primary");

                    // Query RDAM, timeout of 30 seconds
                    let options = {
                        url: "https://retailstore.microsoft.com/RedecsService/Content/api/attributes/metadata?RAC=" + racInput.value,
                        responseType: "json"
                    };
                    WinJS.Promise.timeout(30000, bridge.invoke("WinJS.xhr", options)).then(
                        function (result) {
                            rdamJson = result.response;
                            allowUserToContinue();
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
            });

            // Set RAC/SKU, create RetailAdmin if necessary, fire done
            nextButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                if (!blockNext) {
                    writeRacAndSkuAsyncThen(function () {
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    }, function (error) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "RetailInfoSetterFailure", JSON.stringify({ number: error.number.toString(16), description: error.description }));
                        switch (navFlow) {
                            case "RDXFRXMOB":
                                // Proceed to rdxMsa
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.fail);
                                break;
                            case "FRXRDX":
                            case "RDXPOSTOOBE":
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                                break;
                            case "RDXRACSKU":
                                // Allow the user to retry setting RAC/SKU as they can always close the app if things are really stuck
                                break;
                            default: // Unknown flow
                                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.abort);
                                break;
                        }
                    });
                }
            });

            extraConfigButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                if (!blockNext) {
                    writeRacAndSkuAsyncThen(function () {
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action1);
                    }, function (error) {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "RetailInfoSetterFailure", JSON.stringify({ number: error.number.toString(16), description: error.description }));
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.action1);
                    });
                }
            });

            if (Windows.System.Profile.RetailInfo.properties.hasKey("RetailAccessCode")) {
                racInput.value = Windows.System.Profile.RetailInfo.properties.lookup("RetailAccessCode");
            }

            if (Windows.System.Profile.RetailInfo.properties.hasKey("SKU")) {
                skuInput.value = Windows.System.Profile.RetailInfo.properties.lookup("SKU");
            }

            if (Windows.System.Profile.RetailInfo.properties.hasKey("StoreID")) {
                storeIdInput.value = Windows.System.Profile.RetailInfo.properties.lookup("StoreID");
            }

            // Call to register EaseOfAccess and InputSwitcher controls
            uiHelpers.RegisterEaseOfAccess(easeOfAccess, bridge);
            uiHelpers.RegisterInputSwitcher(inputSwitcher, bridge);

            // Check if CXH has internet access
            bridge.invoke("CloudExperienceHost.Environment.hasInternetAccess").done(function (connected) {
                if (!connected) {
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.abort);
                } else {
                    bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                }
            }, function () {
                bridge.fireEvent(CloudExperienceHost.Events.visible, true);
            });

            // Write RAC and SKU to registry
            function writeRacAndSkuAsyncThen(complete, error) {
                let platform = CloudExperienceHost.Environment.getPlatform();
                if ((navFlow != "RDXRACSKU") || (platform === CloudExperienceHost.TargetPlatform.MOBILE)) {
                    bridge.invoke("RetailDemo.Internal.RetailInfoSetter.setStringAsync", "RetailAccessCode", racInput.value)
                        .then(function () {
                            let setSkuPromise = bridge.invoke("RetailDemo.Internal.RetailInfoSetter.setStringAsync", "SKU", skuInput.value);
                            let setStoreIdPromise = bridge.invoke("RetailDemo.Internal.RetailInfoSetter.setStringAsync", "StoreID", storeIdInput.value);
                            return WinJS.Promise.join({ setSkuPromise: setSkuPromise, setStoreIdPromise: setStoreIdPromise });
                        })
                        .done(complete, error);
                } else {
                    CloudExperienceHostBroker.RetailDemo.ConfigureRetailDemo.setRetailInfoStringValue("RetailAccessCode", racInput.value)
                        .then(function () {
                            let setSkuPromise =  CloudExperienceHostBroker.RetailDemo.ConfigureRetailDemo.setRetailInfoStringValue("SKU", skuInput.value);
                            let setStoreIdPromise =  CloudExperienceHostBroker.RetailDemo.ConfigureRetailDemo.setRetailInfoStringValue("StoreID", storeIdInput.value);
                            return WinJS.Promise.join({ setSkuPromise: setSkuPromise, setStoreIdPromise: setStoreIdPromise });
                        })
                        .done(complete, error);
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
                tooltip.className = "errorDialog-dialogRoot template-tooltip tooltipType_error";
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
        }
    });
})();
