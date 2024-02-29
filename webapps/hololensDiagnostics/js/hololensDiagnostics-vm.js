//
// Copyright (C) Microsoft. All rights reserved.
//
// <disable>JS2085.EnableStrictMode</disable>
"use strict";

require.config(new RequirePathConfig('/webapps/hololensDiagnostics'));
define(['legacy/bridge', 'legacy/core', 'legacy/events'], (bridge, core, constants) => {
    const bookmarkPageIndicator = "hldiag_bookmark";
    const DiagPageEnum = {
        ErrorHandlerPage: 1,
        TroubleshootingPage: 2,
        SuccessPage: 3,
    };

    class HoloLensDiagnosticsViewModel {
        constructor(hololensDiagResources, bookmarkedPage) {
            this._logFileCollector = null;
            this._logFileCollector = new CloudExperienceHostAPI.Diagnostics.LogFileCollector();
            this._logFileCollector.registerLogFileSearchPattern("eventlog*system.etl*");
            this._logFileCollector.registerLogFileSearchPattern("eventlog*application.etl*");
            this._logFileCollector.registerLogFileSearchPattern("firstexperience*.etl*");

            this.hololensDiagResources = hololensDiagResources;
            this.bookmarkedPage = bookmarkedPage;

            // Update text content for UI elements including defaults on the 
            // landing page.
            var pageElementsWithTextContent = [Title, TroubleshootingLink, Body,
                PrivacyStatementLink, PrivacyHeadline, PrivacyBody,
                Instruction0, Instruction1, Instruction2, Instruction3, Instruction4,
                ProgressDescription];
            for (var i = 0; i < pageElementsWithTextContent.length; i++) {
                pageElementsWithTextContent[i].textContent = this.hololensDiagResources[pageElementsWithTextContent[i].id];
            }

            // Now that handlers are wired up, set button content and access keys
            var buttonsWithContent = [RetryButton, CancelButton, ContinueButton, BackButton, NextButton];
            buttonsWithContent.forEach((eachElement) => {
                var resourceKey = this.hololensDiagResources[eachElement.id];
                var result = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(resourceKey);
                eachElement.textContent = result.content;
                eachElement.accessKey = result.accessKey;
            });
        }

        registerEventHandlers() {
            // Clicking the troubleshooting link navigates to the privacy statement page
            TroubleshootingLink.addEventListener("click", ((event) => {
                event.preventDefault();
                this._onTroubleshooting.apply(this);
            }).bind(this), false);

            // Clicking the Privacy statement link on its page shows a flyout with additional info 
            PrivacyStatementLink.addEventListener("click", this._showPrivacyFlyout, false);

            // Retry button on the landing page restarts the whole flow
            RetryButton.addEventListener("click", () =>  {
                RetryButton.disabled = true;
                WinJS.Application.restart();
            });

            // Cancel button fails out of the error flow (similar to the default error handler).
            CancelButton.addEventListener("click", ((event) => {
                event.preventDefault();
                CancelButton.disabled = true;
                bridge.fireEvent(constants.Events.done, constants.AppResult.fail);
            }).bind(this));

            // Back button on the troubleshooting page returns to the landing page.
            BackButton.addEventListener("click", ((event) => {
                event.preventDefault();
                BackButton.disabled = true;
                this._onBackButton.apply(this);
            }).bind(this));

            // Next button on the troubleshooting page begins log transfer.
            NextButton.addEventListener("click", ((event) => {
                event.preventDefault();
                NextButton.disabled = true;
                this._onNextButton.apply(this);
            }).bind(this));

            // Continue button on the final success page wraps everything up
            ContinueButton.addEventListener("click", ((event) => {
                event.preventDefault();
                ContinueButton.disabled = true;
                this._onContinueButton.apply(this);
            }).bind(this));
        }

        prepareFirstPage() {
            // Turn off visibility of all elements that aren't part of the landing page.
            this._setVisibility(PageSpinner, false);
            this._setVisibility(BackButton, false);
            this._setVisibility(NextButton, false);
            this._setVisibility(PrivacyStatementLink, false);
            this._setVisibility(Instructions, false);

            switch (this.bookmarkedPage) {
                case DiagPageEnum.SuccessPage:
                    this._showSuccessPage();
                    break;
                case DiagPageEnum.TroubleshootingPage:
                    this._showOrHideTroubleshootingPage(true);
                    break;
                default:
                    this._showOrHideTroubleshootingPage(false);
                    break;
            }
        }

        _copyLogFiles() {
            var destinationPath = Windows.Storage.SystemDataPaths.getDefault().public;
            return this._logFileCollector.copyFilesAsync(destinationPath).then(() => {
                bridge.invoke("CloudExperienceHost.Storage.SharableData.addValue", bookmarkPageIndicator, DiagPageEnum.SuccessPage);
            });
        }

        _cleanupLogFiles() {
            return this._logFileCollector.deleteFilesAsync().then(() => {
                bridge.invoke("CloudExperienceHost.Storage.SharableData.removeValue", bookmarkPageIndicator);
            });
        }

        _onTroubleshooting() {
            // User has selected troubleshooting. 
            this._showOrHideTroubleshootingPage(true);
        }

        _onBackButton() {
            if (this.bookmarkedPage === DiagPageEnum.TroubleshootingPage) {
                // User started on the troubleshooting page directly and back
                // needs to navigate to the preceding set of pages by canceling
                // out of this flow.
                bridge.fireEvent(constants.Events.done, constants.AppResult.cancel);
            } else {
                // User started on the landing page, selected troubleshooting page 
                // and wants to return to the landing page.
                this._showOrHideTroubleshootingPage(false);
            }
        }

        _onNextButton() {
            // User consents to gathering logs. Begin copying and show the spinner.
            // Hide everything else.
            this._setVisibility(RetryButton, false);
            this._setVisibility(CancelButton, false);
            this._setVisibility(BackButton, false);
            this._setVisibility(NextButton, false);
            this._setVisibility(Title, false);
            this._setVisibility(PageBody, false);
            this._setVisibility(PageLogCollector, false);
            this._setVisibility(PageSpinner, true);

            this._copyLogFiles().done(() => {
                this._showSuccessPage();
            }, (e) => {
                this._reportErrorToTelemetry(e);
                this._showErrorPage();
            });
        }

        _onContinueButton() {
            // User had logs copied over and is now on the final success page. 
            // Continue will cleanup any files leftover and return back to OOBE.
            // The caller OOBE is responsible for restarting CXH or advancing.
            this._cleanupLogFiles().done(() => {
                bridge.fireEvent(constants.Events.done, constants.AppResult.success);
            }, (e) => {
                this._reportErrorToTelemetry(e);
                bridge.fireEvent(constants.Events.done, constants.AppResult.fail);
            });
        }

        _showOrHideTroubleshootingPage(showPage) {
            // Continue button is hidden on both pages. 
            this._setVisibility(ContinueButton, false);

            // Retry and Cancel buttons are shown on the landing page 
            // and hidden on the troubleshooting page. Same for the link.
            this._setVisibility(RetryButton, !showPage);
            RetryButton.disabled = showPage;

            this._setVisibility(CancelButton, !showPage);
            CancelButton.disabled = showPage;

            this._setVisibility(TroubleshootingLink, !showPage);

            // Change the title and body text according to the page.
            var titleKey = showPage ? 'TitleTroubleshooting' : 'Title';
            var bodyKey = showPage ? 'BodyTroubleshooting' : 'Body';
            Title.textContent = this.hololensDiagResources[titleKey];
            Body.textContent = this.hololensDiagResources[bodyKey];

            // Back and Next buttons and a link for the privacy 
            // statement are displayed on the troubleshooting
            // page and hidden on the landing page.
            this._setVisibility(PrivacyStatementLink, showPage);

            this._setVisibility(BackButton, showPage);
            BackButton.disabled = !showPage;

            this._setVisibility(NextButton, showPage);
            NextButton.disabled = !showPage;

            // Finally, if we are on the troubleshooting page, Retry has focus.
            // Otherwise, Next has focus.
            if (!showPage) {
                RetryButton.focus();
            } else {
                NextButton.focus();
            }
        }

        _showSuccessPage() {
            // Log transfer was successful. Show the success text and allow the user
            // to complete the process.

            Title.textContent = this.hololensDiagResources['TitleSuccess'];
            Body.textContent = this.hololensDiagResources['BodySuccess'];

            ContinueButton.focus();

            this._setVisibility(PageSpinner, false);
            this._setVisibility(TroubleshootingLink, false);
            this._setVisibility(PrivacyStatementLink, false);
            this._setVisibility(PageLogCollector, true);
            this._setVisibility(Title, true);
            this._setVisibility(PageBody, true);
            this._setVisibility(Instructions, true);
            this._setVisibility(RetryButton, false);
            this._setVisibility(CancelButton, false);
            this._setVisibility(ContinueButton, true);
        }

        _reportErrorToTelemetry(e) {
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HoloLensDiagnosticsPageError", core.GetJsonFromError(e));
        }

        _showErrorPage() {
            // Log transfer failed. Show the error text and allow the user to either
            // cancel.

            Title.textContent = this.hololensDiagResources['TitleError'];
            Body.textContent = this.hololensDiagResources['BodyError'];

            CancelButton.disabled = false;
            CancelButton.focus();

            this._setVisibility(PageSpinner, false);
            this._setVisibility(TroubleshootingLink, false);
            this._setVisibility(PrivacyStatementLink, false);
            this._setVisibility(PageLogCollector, true);
            this._setVisibility(Title, true);
            this._setVisibility(PageBody, true);
            this._setVisibility(CancelButton, true);
        }

        _showPrivacyFlyout() {
            // Show the flyout directly below the privacy link.
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "HoloLensDiagnostics.ShowPrivacyFlyout");
            var flyoutButton = document.getElementById("PrivacyStatementLink");
            var flyout = document.getElementById("PrivacyFlyout");

            // Get offset of element from top of window
            // Set this as the bottom of the rectangle so the link is still visible.
            let rect = flyoutButton.getBoundingClientRect();
            flyout.style.marginTop = rect.bottom + (window.pageYOffset || document.documentElement.scrollTop || 0) + "px";

            flyout.winControl.show(flyoutButton, "top", "left");
        }

        _setVisibility(container, visible) {
            container.style.visibility = (visible) ? 'visible' : 'hidden';
            container.style.display = (visible) ? 'inline' : 'none';
        }
    }

    return HoloLensDiagnosticsViewModel;
});
