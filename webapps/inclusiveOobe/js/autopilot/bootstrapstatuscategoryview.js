//
// Copyright (C) Microsoft. All rights reserved.
//

"use strict";

define([
    'autopilot/commercialDiagnosticsUtilities',
    'legacy/events',
    'legacy/bridge'], (
    commercialDiagnosticsUtilities,
    constants,
    bridge) => {
    class bootstrapStatusCategoryView {
        constructor(
            resourceStrings,
            sessionUtilities,
            parentTable,
            categoryViewModel) {

            // Local constants

            this.CATEGORY_TITLE_ID = "categoryId";
            this.DETAILS_BUTTON_ID = "DETAILS_BUTTON_ID";
            this.CATEGORY_STATUS_ID = "CATEGORY_STATUS_ID";
            this.SUBCATEGORIES_SECTION_ID = "SUBCATEGORIES_SECTION_ID";
            this.PROGRESS_BAR_ID = "PROGRESS_BAR_ID";
            this.STATE_NAME_STATUS = "Status";
            this.FORCED_RESULT_SUCCESS = "FORCED_RESULT_SUCCESS";
            this.FORCED_RESULT_FAILURE = "FORCED_RESULT_FAILURE";

            this.SUBCATEGORY_PROPERTY_NAME_STATE = "subcategoryState";
            this.SUBCATEGORY_PROPERTY_NAME_STATUS_TEXT = "subcategoryStatusText";

            this.CATEGORY_PROPERTY_NAME_STATE = "categoryState";
            this.CATEGORY_PROPERTY_NAME_STATUS_TEXT = "categoryStatusText";

            this.E_CANCELED = 0x800704C7;
            this.E_UNEXPECTED = 0x8000FFFF;

            this.MAX_WAIT_FOR_REBOOT_IN_MILLISECONDS = 60000; // 1 minute

            // Member variables
            this.resourceStrings = resourceStrings;
            this.sessionUtilities = sessionUtilities;
            this.categoryViewModel = categoryViewModel;
            this.storedCategoryStatus = {};

            this.startOneActionBatchPromise = null;
            this.batchCancelled = false;
            this.commercialDiagnosticsUtilities = new commercialDiagnosticsUtilities();

            // Set up the UI for the category.
            let uiRow = parentTable.insertRow();

            this.iconCell = uiRow.insertCell();
            this.iconCell.className = "glyph-cell";

            // Create:  "<div class='glyph'>"
            let iconDiv = document.createElement("div");
            iconDiv.className = "glyph categoryCell";
            this.iconCell.appendChild(iconDiv);
            this.iconCell.setAttribute("aria-hidden", true);

            let newChild = null;

            // Create:  "<span class='" + categoryViewModel .getIconClass() + "' />"
            this.iconElement = document.createElement("span");
            this.iconElement.className = categoryViewModel.getIconClass();
            iconDiv.appendChild(this.iconElement);

            // Create:  "<span class='base icon-base' style='visibility: hidden' />"
            this.iconBase = document.createElement("span");
            this.iconBase.className = "base icon-base";
            this.sessionUtilities.hideElement(this.iconBase, false);
            iconDiv.appendChild(this.iconBase);

            // Create:  "<span class='fill icon-fill' style='visibility: hidden' />"
            this.badgeFill = document.createElement("span");
            this.badgeFill.className = "fill icon-fill success";
            this.sessionUtilities.hideElement(this.badgeFill, false);
            iconDiv.appendChild(this.badgeFill);

            // Create:  "<span class='overlay' style='visibility: hidden' />"
            this.badgeIcon = document.createElement("span");
            this.badgeIcon.className = "overlay icon-checkmark";
            this.sessionUtilities.hideElement(this.badgeIcon, false);
            iconDiv.appendChild(this.badgeIcon);

            this.statusCell = uiRow.insertCell();

            // Create:  "<span id='" + this.CATEGORY_TITLE_ID + "' class='category'>" + categoryViewModel.getCategoryTitle() + "</span>"
            newChild = document.createElement("span");
            newChild.className = "category";
            newChild.appendChild(document.createTextNode(categoryViewModel.getTitle()));
            this.statusCell.appendChild(newChild);
            this.statusCell.className = "categoryCell";

            // Create:  "<button id='" + this.DETAILS_BUTTON_ID + "' class='win-button alt-button' tabindex='0' style='border: none' />"
            this.detailsButtonElement = document.createElement("button");
            this.detailsButtonElement.id = this.DETAILS_BUTTON_ID;
            this.detailsButtonElement.className = "win-button alt-button";
            this.detailsButtonElement.tabIndex = 0;
            this.detailsButtonElement.style.border = "none";
            this.detailsButtonElement.style.marginTop = "-12px";
            this.detailsButtonElement.style.marginBottom = "-12px";
            this.detailsButtonElement.setAttribute("aria-label", categoryViewModel.getTitle() + " " + resourceStrings["BootstrapPageShowDetailsButton"]);
            this.sessionUtilities.hideElement(this.detailsButtonElement, false);
            this.sessionUtilities.replaceNodeText(this.detailsButtonElement, resourceStrings["BootstrapPageShowDetailsButton"]);
            this.detailsButtonElement.addEventListener("click", this.handleClickEventOnDetailsButton.bind(this));
            this.statusCell.appendChild(this.detailsButtonElement);

            // Create:  "<p id='" + this.CATEGORY_STATUS_ID + "' class='status'

            // Try to find status text from a prior run of the category.
            let categoryStatusText = this.getCategoryProperty(this.CATEGORY_PROPERTY_NAME_STATUS_TEXT);

            if (undefined === categoryStatusText) {
                // No prior run of the category, and so use a default text.
                categoryStatusText = resourceStrings["BootstrapPageStatusWaitingForPrevious"];
            }

            this.categoryStatusElement = document.createElement("p");
            this.categoryStatusElement.id = this.CATEGORY_STATUS_ID;
            this.categoryStatusElement.className = "status";
            this.sessionUtilities.replaceNodeText(this.categoryStatusElement, categoryStatusText);
            this.statusCell.appendChild(this.categoryStatusElement);

            // Create:  "<progress id='" + this.PROGRESS_BAR_ID + "' class='win-progress-bar win-large' />"
            this.categoryProgressBarElement = document.createElement("progress");
            this.categoryProgressBarElement.id = this.PROGRESS_BAR_ID;
            this.categoryProgressBarElement.className = "win-progress-bar win-large";
            this.sessionUtilities.hideElement(this.categoryProgressBarElement, false);
            this.statusCell.appendChild(this.categoryProgressBarElement);

            // Create:  "<div id='" + this.SUBCATEGORIES_SECTION_ID + "' style='visibility: collapse'>"
            this.subcategoriesSectionElement = document.createElement("div");
            this.subcategoriesSectionElement.id = this.SUBCATEGORIES_SECTION_ID;
            this.subcategoriesSectionElement.style.borderBottom = "5px";
            this.sessionUtilities.hideElement(this.subcategoriesSectionElement, true);
            this.statusCell.appendChild(this.subcategoriesSectionElement);

            this.bootstrapSubcategories = categoryViewModel.getSubcategories();

            this.initializationPromise = this.getStoredCategoryStatusAsync().then((categoryStatus) => {
                this.storedCategoryStatus = categoryStatus;

                // Initialize the category's state only if it's not already set (e.g., from a prior run of the category).
                if (undefined === this.getCategoryProperty(this.CATEGORY_PROPERTY_NAME_STATE)) {
                    let newCategoryProperties = {};
                    newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATE] = this.sessionUtilities.CATEGORY_STATE_NOT_STARTED;

                    return this.setCategoryPropertiesAsync(newCategoryProperties);
                }
            }).then(() => {
                for (let i = 0; i < this.bootstrapSubcategories.length; i++) {
                    let currentSubcategory = this.bootstrapSubcategories[i];

                    // Initialize the subcategory's state only if it's not already set (e.g., from a prior run of the subcategory).
                    if (undefined === this.getSubcategoryProperty(
                        currentSubcategory.getId(),
                        this.SUBCATEGORY_PROPERTY_NAME_STATE)) {

                        let newSubcategoryProperties = {};
                        newSubcategoryProperties[this.SUBCATEGORY_PROPERTY_NAME_STATE] = this.sessionUtilities.SUBCATEGORY_STATE_NOT_STARTED;

                        this.setSubcategoryPropertiesAsync(currentSubcategory.getId(), newSubcategoryProperties);
                    }

                    let subcategoryDisposition = currentSubcategory.getDisposition();

                    if (subcategoryDisposition === this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE) {
                        // Try to find status text from a prior run of the subcategory.
                        let subcategoryText = this.getSubcategoryProperty(
                            currentSubcategory.getId(),
                            this.SUBCATEGORY_PROPERTY_NAME_STATUS_TEXT);

                        if (undefined === subcategoryText) {
                            // No prior run of the subcategory, and so use a default text.
                            subcategoryText = this.commercialDiagnosticsUtilities.formatMessage(
                                resourceStrings["BootstrapPageSubcategoryTextTemplate"],
                                currentSubcategory.getTitle(),
                                resourceStrings["BootstrapPageStatusWaitingForPrevious"]);
                        }

                        newChild = document.createElement("p");
                        this.sessionUtilities.replaceNodeText(newChild, subcategoryText);
                        currentSubcategory.setUiElement(newChild);
                        this.subcategoriesSectionElement.appendChild(newChild);
                    }
                }

                return categoryViewModel.getInitializationPromise();
            });
        }

        // Private methods

        handleClickEventOnDetailsButton() {
            if (this.sessionUtilities.isElementHidden(this.subcategoriesSectionElement)) {
                this.sessionUtilities.showElement(this.subcategoriesSectionElement, true);
                this.detailsButtonElement.setAttribute("aria-label", this.categoryViewModel.getTitle() + " " + resourceStrings["BootstrapPageHideDetailsButton"]);
                this.sessionUtilities.replaceNodeText(this.detailsButtonElement, resourceStrings["BootstrapPageHideDetailsButton"]);
            } else {
                this.sessionUtilities.hideElement(this.subcategoriesSectionElement, true);
                this.detailsButtonElement.setAttribute("aria-label", this.categoryViewModel.getTitle() + " " + resourceStrings["BootstrapPageShowDetailsButton"]);
                this.sessionUtilities.replaceNodeText(this.detailsButtonElement, resourceStrings["BootstrapPageShowDetailsButton"]);
            }
        }

        async updateSubcategoryTextFromActionResultsAsync(subcategory, actionResults) {
            let subcategoryText = actionResults.actionResultState;

            this.commercialDiagnosticsUtilities.logInfoEvent(
                this.sessionUtilities.subcategorySucceeded(actionResults.actionResultState) ?
                    "CommercialOOBE_BootstrapStatusCategory_SubcategoryProcessing_Success" :
                    "CommercialOOBE_BootstrapStatusCategory_SubcategoryProcessing_Failed",
                `BootstrapStatus: Subcategory ID = ${subcategory.getId()}; state = ${actionResults.actionResultState}.`);

            if (subcategory.getDisposition() === this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE) {
                // Update the current subcategory status text to show completion or failure.
                let statusText = null;

                if ((actionResults.statusMessage !== null) && (actionResults.statusMessage !== undefined)) {
                    statusText = actionResults.statusMessage;

                } else if (actionResults.actionResultState === this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED) {
                    statusText = this.resourceStrings["BootstrapPageStatusComplete"];

                } else if (actionResults.actionResultState === this.sessionUtilities.SUBCATEGORY_STATE_REBOOT_REQUIRED_AND_TRY_AGAIN) {
                    statusText = this.resourceStrings["BootstrapPageStatusRebootRequired"];

                } else {
                    // All other results are considered failures.  Need a catch-all clause to make sure nothing
                    // slips through as blank.
                    statusText = this.resourceStrings["BootstrapPageStatusFailed"];
                }

                subcategoryText = this.commercialDiagnosticsUtilities.formatMessage(
                    this.resourceStrings["BootstrapPageSubcategoryTextTemplate"],
                    subcategory.getTitle(),
                    statusText);

                this.sessionUtilities.replaceNodeText(subcategory.getUiElement(), subcategoryText);
            }

            let newSubcategoryProperties = {};
            newSubcategoryProperties[this.SUBCATEGORY_PROPERTY_NAME_STATUS_TEXT] = subcategoryText;

            await this.setSubcategoryPropertiesAsync(subcategory.getId(), newSubcategoryProperties);
        }

        async startOneActionBatchAsync(previousActionSucceeded, useParallelizableActions, forcedResult, tryingAgain) {
            if (this.currentSubcategoryIndex >= this.bootstrapSubcategories.length) {
                return previousActionSucceeded;
            }

            let subcategoriesToExecute = [];
            for (; this.currentSubcategoryIndex < this.bootstrapSubcategories.length; this.currentSubcategoryIndex++) {
                let currentSubcategory = this.bootstrapSubcategories[this.currentSubcategoryIndex];
                let currentSubcategoryId = currentSubcategory.getId();

                // If moving to next parallel/non-parallel section of the subcategories list, save that section
                // for the next batch (i.e., stop collecting subcategories for the current batch).
                if (useParallelizableActions !== currentSubcategory.isParallelizableAction()) {
                    break;
                } else if (!useParallelizableActions && (subcategoriesToExecute.length === 1)) {
                    // If the current batch is for nonparallelizable subcategories, then stop collecting 
                    // subcategories for the batch after the first subcategory.
                    break;
                }
                
                let subcategoryDisposition = currentSubcategory.getDisposition();

                // Within a parallelizable batch, don't execute subcategories that are supposed to be ignored.
                if (subcategoryDisposition !== this.sessionUtilities.SUBCATEGORY_DISPOSITION_IGNORED) {
                    let resultText;

                    // If the subcategory has already run, get its previous status text.
                    if (!this.shouldRunSubcategory(currentSubcategoryId, tryingAgain)) {
                        resultText = this.getSubcategoryProperty(
                            currentSubcategoryId,
                            this.SUBCATEGORY_PROPERTY_NAME_STATUS_TEXT);
                    }

                    // Prefer pre-existing status over forced result.
                    if ((undefined === resultText) && (forcedResult !== null)) {
                        switch (forcedResult) {
                            case this.FORCED_RESULT_SUCCESS:
                                resultText = this.resourceStrings["BootstrapPageStatusComplete"];
                                break;

                            case this.FORCED_RESULT_FAILURE:
                                resultText = this.resourceStrings["BootstrapPageStatusFailed"];
                                break;
                        }
                    }

                    if (resultText !== undefined) {
                        if (subcategoryDisposition === this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE) {
                            this.sessionUtilities.replaceNodeText(
                                currentSubcategory.getUiElement(),
                                resultText);
                        }
                    }

                    // Re-run the subcategory only under specific conditions.
                    if (this.shouldRunSubcategory(currentSubcategoryId, tryingAgain)) {
                        // Execute this subcategory only if it hasn't reached a terminal state yet.
                        subcategoriesToExecute.push(currentSubcategory);
                    }
                }
            }
            
            if (0 === subcategoriesToExecute.length) {
                // No batch to execute.  Run next batch of the opposite parallelizability.
                return await this.startOneActionBatchAsync(previousActionSucceeded, !useParallelizableActions, forcedResult, tryingAgain);
            }
            
            this.commercialDiagnosticsUtilities.logInfoEvent(
                "CommercialOOBE_BootstrapStatusCategory_BatchProcessing_Started",
                `BootstrapStatus: Processing one ${useParallelizableActions ? "parallelizable" : "non-parallelizable"} batch of ${subcategoriesToExecute.length} subcategories...`);

            // Update all runnable subcategories with appropriate state and status text.
            for (let i = 0; i < subcategoriesToExecute.length; i++) {
                let currentSubcategory = subcategoriesToExecute[i];
                let subcategoryDisposition = currentSubcategory.getDisposition();
                let subcategoryState;
                let statusText;

                if (previousActionSucceeded) {
                    statusText = this.resourceStrings["BootstrapPageStatusWorking"];
                    subcategoryState = this.sessionUtilities.SUBCATEGORY_STATE_IN_PROGRESS;
                } else {
                    statusText = this.resourceStrings["BootstrapPageStatusPreviousStepFailed"];
                    subcategoryState = this.sessionUtilities.SUBCATEGORY_STATE_FAILED_FROM_PREVIOUS_SUBCATEGORY;
                }

                let subcategoryText = this.commercialDiagnosticsUtilities.formatMessage(
                    this.resourceStrings["BootstrapPageSubcategoryTextTemplate"],
                    currentSubcategory.getTitle(),
                    statusText);

                if (subcategoryDisposition === this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE) {
                    this.sessionUtilities.replaceNodeText(currentSubcategory.getUiElement(), subcategoryText);
                }

                let newSubcategoryProperties = {};
                newSubcategoryProperties[this.SUBCATEGORY_PROPERTY_NAME_STATE] = subcategoryState;
                newSubcategoryProperties[this.SUBCATEGORY_PROPERTY_NAME_STATUS_TEXT] = subcategoryText;

                await this.setSubcategoryPropertiesAsync(currentSubcategory.getId(), newSubcategoryProperties);
            }

            if (!previousActionSucceeded) {
                // Previous action batch failed.  Move on to the next action batch.
                return await this.startOneActionBatchAsync(previousActionSucceeded, !useParallelizableActions, forcedResult, tryingAgain);
            }

            // Wait on all parallelizable actions.
            this.batchCancelled = false;
            let actionsToWaitOn = [];
            let subcategoryTextTemplate = this.resourceStrings["BootstrapPageSubcategoryTextTemplate"];
            for (let i = 0; i < subcategoriesToExecute.length; i++) {
                let currentSubcategory = subcategoriesToExecute[i];
                let title = currentSubcategory.getTitle();
                let uiElement = currentSubcategory.getUiElement();

                let progressCallbackAsync = (progressText) => {
                    if (!this.batchCancelled) {
                        let subcategoryDisposition = currentSubcategory.getDisposition();

                        if (subcategoryDisposition === this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE) {
                            let finalMessage = this.commercialDiagnosticsUtilities.formatMessage(subcategoryTextTemplate, title, progressText);

                            this.sessionUtilities.replaceNodeText(uiElement, finalMessage);

                            let newSubcategoryProperties = {};
                            newSubcategoryProperties[this.SUBCATEGORY_PROPERTY_NAME_STATUS_TEXT] = finalMessage;

                            return this.setSubcategoryPropertiesAsync(currentSubcategory.getId(), newSubcategoryProperties);
                        }
                    }

                    return WinJS.Promise.as(true);
                };

                let setSubcategoryStateCallbackAsync = (newSubcategoryState) => {
                    let newSubcategoryProperties = {};
                    newSubcategoryProperties[this.SUBCATEGORY_PROPERTY_NAME_STATE] = newSubcategoryState;

                    return this.setSubcategoryPropertiesAsync(currentSubcategory.getId(), newSubcategoryProperties);
                };

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_BootstrapStatusCategory_SubcategoryProcessing_Started",
                    this.commercialDiagnosticsUtilities.formatMessage("BootstrapStatus: Starting subcategory {0}...", subcategoriesToExecute[i].getId()));

                actionsToWaitOn.push(subcategoriesToExecute[i].startActionAsync(progressCallbackAsync, setSubcategoryStateCallbackAsync));
            }

            await WinJS.Promise.join(actionsToWaitOn);

            let batchSucceeded = true;
            let batchRequiresReboot = false;

            // All actions are done.  Reflect them in the status text.
            for (let i = 0; i < subcategoriesToExecute.length; i++) {
                let currentSubcategory = subcategoriesToExecute[i];
                let actionResult = currentSubcategory.getActionResult();

                await this.updateSubcategoryTextFromActionResultsAsync(currentSubcategory, actionResult);
                    
                if (!this.sessionUtilities.subcategorySucceeded(actionResult.actionResultState)) {
                    if (this.subcategoryNeedsReboot(actionResult.actionResultState)) {
                        batchRequiresReboot = true;

                        this.commercialDiagnosticsUtilities.logInfoEvent(
                            "CommercialOOBE_ESP_Subcategory_RebootRequiredBySubcategory_" + currentSubcategory.getId(),
                            `BootstrapStatus: Reboot required by subcategory ${currentSubcategory.getId()}.`);
                    } else {
                        batchSucceeded = false;
                    }
                }
            }

            let maxWaitForRebootInMilliseconds = 0;

            if (batchSucceeded && batchRequiresReboot) {
                // Only reboot if all subcategories succeeded (other than the ones that required a reboot, of course).
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_BootstrapStatusCategory_RebootCoalescing_Initiated",
                    `BootstrapStatus: ${useParallelizableActions ? "Parallelizable" : "Non-parallelizable"} batch of ${subcategoriesToExecute.length} subcategories requires a reboot.`);

                // Set OOBE to return to the ESP.
                bridge.invoke("CloudExperienceHost.AutoPilot.EnrollmentStatusPage.setStatusPageReboot");

                try {
                    // Set duration to wait for reboot.
                    maxWaitForRebootInMilliseconds = this.MAX_WAIT_FOR_REBOOT_IN_MILLISECONDS;

                    bridge.fireEvent(constants.Events.done, constants.AppResult.action1);
                } catch (e) {
                    this.commercialDiagnosticsUtilities.logExceptionEvent(
                        "CommercialOOBE_BootstrapStatusCategory_Rebooting_NavigationFailed",
                        "BootstrapStatus: Navigation to reboot failed.",
                        e);

                    // Force a failure.
                    batchSucceeded = false;

                    // Reboot isn't needed anymore.
                    batchRequiresReboot = false;
                    maxWaitForRebootInMilliseconds = 0;
                }
            } else {
                this.commercialDiagnosticsUtilities.logInfoEvent(
                    batchSucceeded ? "CommercialOOBE_BootstrapStatusCategory_BatchProcessing_Success" : "CommercialOOBE_BootstrapStatusCategory_BatchProcessing_Failed",
                    `BootstrapStatus: ${useParallelizableActions ? "Parallelizable" : "Non-parallelizable"} batch of ${subcategoriesToExecute.length} subcategories ${batchSucceeded ? "succeeded" : "failed"}`);
            }

            // Wait for OOBE to reboot, if needed.
            await WinJS.Promise.timeout(maxWaitForRebootInMilliseconds);

            // If a reboot was required but waiting for the device to reboot timed out (which implies the reboot was not successful),
            // then consider this batch (and hence the entire category) failed.  Assuming the IT admin allowed Try Again,
            // the end user at least has the option to retry.  
            if (batchRequiresReboot) {
                batchSucceeded = false;

                this.commercialDiagnosticsUtilities.logHresultEvent(
                    "CommercialOOBE_BootstrapStatusCategory_Rebooting_TimedOut",
                    "BootstrapStatus: Device failed to reboot within allotted time.",
                    this.E_UNEXPECTED);
            }

            if (!batchSucceeded) {
                // Send failure results to the MDM server, as a best effort.
                this.sessionUtilities.enrollmentApis.updateServerWithResult(false, this.sessionUtilities.runningInOobe());

                this.commercialDiagnosticsUtilities.logInfoEvent(
                    "CommercialOOBE_BootstrapStatusCategory_SendingFailureResultToMdmServer",
                    `BootstrapStatus: ${this.getId()} category sent failure result to MDM server.`);
            }

            // Start the next action batch.
            return await this.startOneActionBatchAsync(batchSucceeded, !useParallelizableActions, forcedResult, tryingAgain);
        }

        getCategoryStatusId() {
            return this.categoryViewModel.getId() + "." + this.STATE_NAME_STATUS;
        }

        getStoredCategoryStatusAsync() {
            return this.sessionUtilities.getSettingAsync(this.getCategoryStatusId()).then((categoryStatusValue) => {
                if ((categoryStatusValue !== null) && (categoryStatusValue.length > 0)) {
                    return WinJS.Promise.as(JSON.parse(categoryStatusValue));
                }

                return WinJS.Promise.as({});
            });
        }

        storeCategoryStatusAsync() {
            if (this.storedCategoryStatus !== null) {
                let categoryStatusValue = JSON.stringify(this.storedCategoryStatus);

                return this.sessionUtilities.storeSettingAsync(this.getCategoryStatusId(), categoryStatusValue);
            }

            return WinJS.Promise.as(false);
        }

        getCategoryProperty(propertyName) {
            return this.storedCategoryStatus[propertyName];
        }

        async setCategoryPropertiesAsync(propertyBag) {
            for (const propertyName in propertyBag) {
                this.storedCategoryStatus[propertyName] = propertyBag[propertyName];
            }

            await this.storeCategoryStatusAsync();
        }

        getSubcategoryProperty(subcategoryId, propertyName) {
            if (this.storedCategoryStatus[subcategoryId] === undefined) {
                this.storedCategoryStatus[subcategoryId] = {};
            }

            return this.storedCategoryStatus[subcategoryId][propertyName];
        }

        async setSubcategoryPropertiesAsync(subcategoryId, propertyBag) {
            if (this.storedCategoryStatus[subcategoryId] === undefined) {
                this.storedCategoryStatus[subcategoryId] = {};
            }

            for (const propertyName in propertyBag) {
                this.storedCategoryStatus[subcategoryId][propertyName] = propertyBag[propertyName];
            }

            await this.storeCategoryStatusAsync();
        }

        subcategoryNeedsReboot(subcategoryState) {
            return (subcategoryState === this.sessionUtilities.SUBCATEGORY_STATE_REBOOT_REQUIRED_AND_TRY_AGAIN);
        }

        isSubcategoryInTerminalState(subcategoryState) {
            return ((subcategoryState === this.sessionUtilities.SUBCATEGORY_STATE_SUCCEEDED) ||
                (subcategoryState === this.sessionUtilities.SUBCATEGORY_STATE_FAILED) ||
                (subcategoryState === this.sessionUtilities.SUBCATEGORY_STATE_CANCELLED) ||
                (subcategoryState === this.sessionUtilities.SUBCATEGORY_STATE_FAILED_FROM_PREVIOUS_SUBCATEGORY));
        }

        shouldRunCategory(tryingAgain) {
            // Run the category state only if one of the conditions is true:
            //    1) the category didn't already complete OR
            //    2) if already complete, this is a try again on a non-successful category.
            return (!this.isCategoryInTerminalState() ||
                (tryingAgain && !this.sessionUtilities.categorySucceeded(this.getCategoryProperty(this.CATEGORY_PROPERTY_NAME_STATE))));
        }

        shouldRunSubcategory(subcategoryId, tryingAgain) {
            // Run the subcategory state only if one of the conditions is true:
            //    1) the subcategory didn't already complete OR
            //    2) if already complete, this is a try again on a non-successful subcategory.
            let subcategoryState = this.getSubcategoryProperty(subcategoryId, this.SUBCATEGORY_PROPERTY_NAME_STATE);

            return (!this.isSubcategoryInTerminalState(subcategoryState) ||
                (tryingAgain && !this.sessionUtilities.subcategorySucceeded(subcategoryState)));
        }

        categoryStateHidesSubcategories(categoryState) {
            return ((categoryState === this.sessionUtilities.CATEGORY_STATE_NOT_STARTED) ||
                (categoryState === this.sessionUtilities.CATEGORY_STATE_FAILED_FROM_PREVIOUS_CATEGORY));
        }

        setSuccessVisuals(message) {
            this.sessionUtilities.replaceNodeText(this.categoryStatusElement, message);
            this.categoryStatusElement.className = "status";
            this.categoryStatusElement.style.opacity = "";

            // Set appropriate icon badge.
            this.badgeFill.className = "fill icon-fill success";
            this.badgeIcon.className = "overlay icon-checkmark";

            // Set appropriate icon badge.  Icons were initialized to success.  Just need to show them.
            this.sessionUtilities.showElement(this.iconBase, false);
            this.sessionUtilities.showElement(this.badgeFill, false);
            this.sessionUtilities.showElement(this.badgeIcon, false);
        }

        setFailureVisuals(message) {
            this.sessionUtilities.replaceNodeText(this.categoryStatusElement, message);
            this.categoryStatusElement.className = "status error";
            this.categoryStatusElement.style.opacity = 1;

            // Set appropriate icon badge.
            this.badgeFill.className = "fill icon-fill failure";
            this.badgeIcon.className = "overlay icon-exmark";

            this.sessionUtilities.showElement(this.iconBase, false);
            this.sessionUtilities.showElement(this.badgeFill, false);
            this.sessionUtilities.showElement(this.badgeIcon, false);
        }

        resetVisuals() {
            this.sessionUtilities.replaceNodeText(this.categoryStatusElement, this.resourceStrings["BootstrapPageStatusWaitingForPrevious"]);
            this.categoryStatusElement.className = "status";
            this.categoryStatusElement.style.opacity = "";

            // Set appropriate icon badge.
            this.badgeFill.className = "fill icon - fill success";

            this.sessionUtilities.hideElement(this.iconBase, false);
            this.sessionUtilities.hideElement(this.badgeFill, false);
            this.sessionUtilities.hideElement(this.badgeIcon, false);
        }

        restoreCategoryStatus() {
            let categoryState = this.getCategoryProperty(this.CATEGORY_PROPERTY_NAME_STATE);
            let categoryStatusText = this.getCategoryProperty(this.CATEGORY_PROPERTY_NAME_STATUS_TEXT);

            // Restore the status for the category.
            if (this.sessionUtilities.categorySucceeded(categoryState)) {
                this.setSuccessVisuals(categoryStatusText);
            } else if (categoryState === this.sessionUtilities.CATEGORY_STATE_FAILED) {
                // Only show failed visuals if the category actually failed.
                this.setFailureVisuals(categoryStatusText);
            } else {
                // Display only the status text, not changing any visuals.
                this.sessionUtilities.replaceNodeText(this.categoryStatusElement, categoryStatusText);
            }

            // Restore the statuses for the subcategories if the category is in a state that shows subcategories.
            if (!this.categoryStateHidesSubcategories(categoryState)) {
                // Show the category's details button.
                this.sessionUtilities.showElement(this.detailsButtonElement, false);

                for (let i = 0; i < this.bootstrapSubcategories.length; i++) {
                    let currentSubcategory = this.bootstrapSubcategories[i];
                    let currentSubcategoryId = currentSubcategory.getId();
                    let currentSubcategoryStatusText = this.getSubcategoryProperty(currentSubcategoryId, this.SUBCATEGORY_PROPERTY_NAME_STATUS_TEXT);

                    if (currentSubcategory.getDisposition() === this.sessionUtilities.SUBCATEGORY_DISPOSITION_VISIBLE) {
                        if (currentSubcategoryStatusText === undefined) {
                            // This subcategory might have been invisible/ignored previously, and somehow through some criteria is visible now.
                            currentSubcategoryStatusText = this.resourceStrings["BootstrapPageStatusNoSetupNeeded"];
                        }

                        this.sessionUtilities.replaceNodeText(currentSubcategory.getUiElement(), currentSubcategoryStatusText);
                    }
                }
            }
        }

        // bootstrapStatusCategoryUi interface methods

        getId() {
            return this.categoryViewModel.getId();
        }

        getDisposition() {
            return this.categoryViewModel.getDisposition();
        }

        runsInOobe() {
            return this.categoryViewModel.runsInOobe();
        }

        getInitializationPromise() {
            return this.initializationPromise;
        }

        getClickHandler() {
            return this.categoryViewModel.getClickHandler();
        }

        isCategoryInTerminalState() {
            let categoryState = this.getCategoryProperty(this.CATEGORY_PROPERTY_NAME_STATE);

            return ((categoryState === this.sessionUtilities.CATEGORY_STATE_SUCCEEDED) ||
                (categoryState === this.sessionUtilities.CATEGORY_STATE_FAILED) ||
                (categoryState === this.sessionUtilities.CATEGORY_STATE_CANCELLED) ||
                (categoryState === this.sessionUtilities.CATEGORY_STATE_FAILED_FROM_PREVIOUS_CATEGORY));
        }

        async showPreviousStepFailedStatusTextIfApplicableAsync() {
            if (!this.isCategoryInTerminalState()) {
                let newCategoryProperties = {};
                newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATE] = this.sessionUtilities.CATEGORY_STATE_FAILED_FROM_PREVIOUS_CATEGORY;

                await this.setCategoryPropertiesAsync(newCategoryProperties);

                this.sessionUtilities.replaceNodeText(this.categoryStatusElement, this.resourceStrings["BootstrapPageStatusPreviousStepFailed"]);
            }
        }

        async prepareForContinueAnywayAsync() {
            // On continue anyway, mark previously failed categories as not run
            let categoryState = this.getCategoryProperty(this.CATEGORY_PROPERTY_NAME_STATE);

            if (categoryState == this.sessionUtilities.CATEGORY_STATE_FAILED_FROM_PREVIOUS_CATEGORY) {
                let newCategoryProperties = {};
                newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATE] = this.sessionUtilities.CATEGORY_STATE_NOT_STARTED;

                await this.setCategoryPropertiesAsync(newCategoryProperties);
            }
        }

        async resetForTryAgainAsync() {
            // On try again, change the category state according to what it currently is:
            //    failed || failedFromPreviousCategory || cancelled -> notStarted
            switch (this.getCategoryProperty(this.CATEGORY_PROPERTY_NAME_STATE)) {
                case this.sessionUtilities.CATEGORY_STATE_FAILED:
                case this.sessionUtilities.CATEGORY_STATE_CANCELLED:
                case this.sessionUtilities.CATEGORY_STATE_FAILED_FROM_PREVIOUS_CATEGORY:
                    let statusMessage = this.resourceStrings["BootstrapPageStatusWaitingForPrevious"];

                    this.sessionUtilities.replaceNodeText(this.categoryStatusElement, statusMessage);

                    let newCategoryProperties = {};
                    newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATE] = this.sessionUtilities.CATEGORY_STATE_NOT_STARTED;
                    newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATUS_TEXT] = statusMessage;

                    await this.setCategoryPropertiesAsync(newCategoryProperties);
                    break;
            }

            return;
        }

        async startActionsAsync(previousCategorySucceeded, tryingAgain) {
            // If the category is already run, just restore the status text of the category and its subcategories,
            // and skip the processing of the entire category.
            if (!this.shouldRunCategory(tryingAgain)) {
                this.restoreCategoryStatus();
                return WinJS.Promise.as(this.sessionUtilities.categorySucceeded(this.getCategoryProperty(this.CATEGORY_PROPERTY_NAME_STATE)));
            }

            // The category can be run, and so run it and its subcategories.
            this.resetVisuals();

            if (!previousCategorySucceeded) {
                // Persist category status in case device restarts or device switches from OOBE to post-OOBE.
                let newCategoryProperties = {};
                newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATE] = this.sessionUtilities.CATEGORY_STATE_FAILED_FROM_PREVIOUS_CATEGORY;
                newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATUS_TEXT] = this.resourceStrings["BootstrapPageStatusPreviousStepFailed"];

                // Previous category failed.  Update current category's status to show failure, too.
                this.sessionUtilities.replaceNodeText(this.categoryStatusElement, this.resourceStrings["BootstrapPageStatusPreviousStepFailed"]);

                await this.setCategoryPropertiesAsync(newCategoryProperties);

                return WinJS.Promise.as(previousCategorySucceeded);
            } else {
                return new WinJS.Promise((completeDispatch, errorDispatch, progressDispatch) => {
                    // Promise initialization handler

                    let newCategoryProperties = {};
                    newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATE] = this.sessionUtilities.CATEGORY_STATE_IN_PROGRESS;

                    return this.setCategoryPropertiesAsync(newCategoryProperties).then(() => {
                        let forcedResult = null;

                        // In testing scenarios, this category meant to be run in OOBE could be skipped 
                        // by virtue of launching into a non-OOBE ESP node in the navmesh directly.
                        if (!this.sessionUtilities.runningInOobe() &&
                            this.runsInOobe()) {
                            // In testing scenarios, assume the category and its actions completed successfully.
                            // Update category status to show progress.
                            this.sessionUtilities.replaceNodeText(this.categoryStatusElement, this.resourceStrings["BootstrapPageStatusComplete"]);

                            forcedResult = this.FORCED_RESULT_SUCCESS;
                        } else {
                            // Show the category's progress bar.
                            this.sessionUtilities.showElement(this.categoryProgressBarElement, false);

                            // Update category status to show progress.
                            this.sessionUtilities.replaceNodeText(this.categoryStatusElement, this.resourceStrings["BootstrapPageStatusWorking"]);
                        }

                        // Show the category's details button.
                        this.sessionUtilities.showElement(this.detailsButtonElement, false);

                        // Run through each subcategory and run its action.
                        this.currentSubcategoryIndex = 0;

                        this.startOneActionBatchPromise = this.startOneActionBatchAsync(true, true, forcedResult, tryingAgain);

                        return this.startOneActionBatchPromise;
                    }).then((actionSucceeded) => {
                        // Update category status to show completion or failure.
                        let categoryStatusMessage = null;
                        let categoryState = null;

                        // Hide the category's progress bar.
                        this.sessionUtilities.hideElement(this.categoryProgressBarElement, false);

                        if (actionSucceeded) {
                            categoryState = this.sessionUtilities.CATEGORY_STATE_SUCCEEDED;
                            categoryStatusMessage = this.resourceStrings["BootstrapPageStatusComplete"];
                            this.setSuccessVisuals(categoryStatusMessage);
                        } else {
                            categoryState = this.sessionUtilities.CATEGORY_STATE_FAILED;
                            categoryStatusMessage = this.resourceStrings["BootstrapPageStatusFailed"];
                            this.setFailureVisuals(categoryStatusMessage);
                        }

                        // Persist category status in case device restarts or device switches from OOBE to post-OOBE.
                        newCategoryProperties = {};
                        newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATE] = categoryState;
                        newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATUS_TEXT] = categoryStatusMessage;

                        return this.setCategoryPropertiesAsync(newCategoryProperties).then(() => {
                            return actionSucceeded;
                        });
                    }).then((actionSucceeded) => {
                        completeDispatch(actionSucceeded);
                    }, (error) => {
                        this.commercialDiagnosticsUtilities.logExceptionEvent(
                            "CommercialOOBE_BootstrapStatusCategory_StartOneAction_Failed",
                            "BootstrapStatus: startOneActionBatchPromise failed",
                            error);
                    });
                },
                () => {
                    this.commercialDiagnosticsUtilities.logHresultEvent(
                        "CommercialOOBE_BootstrapStatusCategory_StartActions_Cancelled",
                        "BootstrapStatus: startActionsAsync is cancelled.",
                        this.E_CANCELED);
                    this.batchCancelled = true;

                    // Cancel batchPromise of subcategory actions that the current category invokes
                    if (this.startOneActionBatchPromise !== null) {
                        this.startOneActionBatchPromise.cancel();
                    }

                    let newCategoryProperties = {};
                    newCategoryProperties[this.CATEGORY_PROPERTY_NAME_STATE] = this.sessionUtilities.CATEGORY_STATE_CANCELLED;

                    return this.setCategoryPropertiesAsync(newCategoryProperties);
                });
            }
        }
    }

    return bootstrapStatusCategoryView;
});
