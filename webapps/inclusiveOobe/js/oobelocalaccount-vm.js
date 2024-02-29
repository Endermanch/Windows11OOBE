//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'corejs/knockouthelpers', 'oobesettings-data', 'legacy/bridge', 'legacy/events', 'legacy/core', 'legacy/appObjectFactory'], (ko, KoHelpers, oobeSettingsData, bridge, constants, core, appObjectFactory) => {
    class LocalAccountViewModel {
        constructor(resourceStrings, isInternetAvailable, requirePassword, requireRecovery, allowOnlineAccount, onlineAccountTargetId, targetPersonality, shouldAadcRestrictionsApplyInDeviceRegion) {
            const NUM_SECURITY_ANSWERS = 3;

            const OnSubmitActions = {
                Success: 1,
                Error: 2,
                InProgress: 3
            };
            Object.freeze(OnSubmitActions);

            bridge.addEventListener(constants.Events.backButtonClicked, this.handleBackNavigation.bind(this));
            this.resourceStrings = resourceStrings;
            this.isInternetAvailable = isInternetAvailable;
            this.targetPersonality = targetPersonality;

            this.requirePassword = requirePassword;
            this.requireRecovery = requireRecovery;

            this.allowOnlineAccount = allowOnlineAccount;
            this.onlineAccountTargetId = onlineAccountTargetId;

            this.learnMoreContent = " "; // Learn More content is purely server-side; initialize it to " " to create well-defined iframe content for keyboard focus and Narrator readout

            this.currentPanelIndex = ko.observable(0).extend({ notify: 'always' });
            this.getPanelElement = (panelIndex) => {
                return document.querySelector(".oobe-panel[data-panel-index='" + panelIndex + "']");
            }

            this.currentPanelElement = ko.pureComputed(() => {
                return this.getPanelElement(this.currentPanelIndex());
            });

            this.username = ko.observable("");
            this.userNameErrorText = ko.observable("");
            this.usernameAriaLabel = ko.observable(this.resourceStrings["UserNamePlaceHolder"]);
            this.password = ko.observable("");
            this.passwordErrorText = ko.observable("");
            this.passwordAriaLabel = ko.observable(this.resourceStrings["PasswordPlaceHolder"]);
            this.passwordConfirm = ko.observable("");
            this.passwordConfirmAriaLabel = ko.observable(this.resourceStrings["PasswordConfirmPlaceHolder"]);
            this.passwordHint = ko.observable("");
            this.recoveryDataErrorText = ko.observable("");
            this.securityQuestionPlaceholder = ko.observable("");
            this.securityQuestions = ko.observableArray([]);
            this.selectedQuestion = ko.observable("");
            this.securityAnswer = ko.observable("");
            this.SQSAAriaLabel = ko.observable(this.resourceStrings["SecurityAnswerPlaceholder"]);
            let localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
            this.showSecurityQuestionFeature = localAccountManager.isLocalSecurityQuestionResetAllowed;
            this.recoverySecurityData = [];
            this.securityQuestionErrorText = ko.observable("");
            this.isLiteWhitePersonality = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite);

            this.userNameVoiceOverErrorString = ko.observable(resourceStrings.UserNameErrorVoiceOver);
            this.passwordVoiceOverErrorString = ko.observable("");
            this.passwordConfirmVoiceOverErrorString = ko.observable("");
            this.recoveryDataVoiceOverErrorString = ko.observable("");

            this.processingFlag = ko.observable(false);
            this.learnMoreVisible = ko.observable(false);
            this.learnMoreVisible.subscribe((newValue) => {
                if (newValue === false) {
                    // Reenable button interaction if we're not showing Learn More. On the Learn More page,
                    // buttons will be enabled after the iframe is shown after oobeSettingsData.showLearnMoreContent()
                    this.processingFlag(false);
                }
            });
            this.disableControl = ko.pureComputed(() => {
                return this.processingFlag();
            });

            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountCreationStart",
                JSON.stringify({
                    "recoveryKind": this.showSecurityQuestionFeature ? "Security Questions" : "Hint",
                    "enrollingFrom": "OOBE"
                }));

            this.getErrorMessage = function (errorCode) {
                switch (errorCode) {
                    case ErrorCodes.SUCCESS:
                        return "";
                    case ErrorCodes.LocalUser_NoUsername_Error:
                        return resourceStrings.LocalUser_NoUsername_Error;
                    case ErrorCodes.Username_Too_Long:
                        return resourceStrings.Username_Too_Long;
                    case ErrorCodes.UserEmpty_Error_Title:
                        return resourceStrings.UserEmpty_Error_Title;
                    case ErrorCodes.Username_Error:
                        return resourceStrings.Username_Error;
                    case ErrorCodes.UsernameContainsAt_Error:
                        return resourceStrings.UsernameContainsAt_Error;
                    case ErrorCodes.UserExists_Error:
                        return resourceStrings.UserExists_Error;
                    case ErrorCodes.UserReserved_Error:
                        return resourceStrings.UserReserved_Error;
                    case ErrorCodes.UserIsComputer_Error_Title:
                        return resourceStrings.UserIsComputer_Error_Title;
                    case ErrorCodes.PasswordHint_Empty_Error:
                        return resourceStrings.PasswordHint_Empty_Error;
                    case ErrorCodes.PasswordHint_Invalid_Error:
                        return resourceStrings.PasswordHint_Invalid_Error;
                    case ErrorCodes.PasswordConfirm_Error:
                        return resourceStrings.PasswordConfirm_Error;
                    case ErrorCodes.PasswordPolicy_Error:
                        return resourceStrings.PasswordPolicy_Error;
                    case ErrorCodes.PasswordEmpty_Error:
                        return resourceStrings.PasswordEmpty_Error;
                    case ErrorCodes.Error_Creating_Account_Warning:
                        return resourceStrings.Error_Creating_Account_Warning;
                    case ErrorCodes.Security_Error:
                        return resourceStrings.SQSA_Error;
                }
            };

            this.getPasswordVoiceOverErrorString = function (errorCode) {
                switch (errorCode) {
                    case ErrorCodes.PasswordConfirm_Error:
                        return resourceStrings.PasswordConfErrorVoiceOver;
                    default:
                        return resourceStrings.PasswordReqErrorVoiceOver;
                }

            };

            this.validator = new uiHelpers.Validator();

            this.onUserNameSubmit = () => {
                this.userNameErrorText(this.getErrorMessage(this.validator.validateUsernameString(this.username(), true /* validateWithLocalAccountManager */)));
                return this.userNameErrorText() ? OnSubmitActions.Error : OnSubmitActions.Success;
            };

            this.onPasswordSubmit = () => {
                if (this.password()) {
                    return OnSubmitActions.Success;
                }
                else if (this.requirePassword) {
                    let errorCode = ErrorCodes.PasswordEmpty_Error;
                    this.passwordErrorText(this.getErrorMessage(errorCode));
                    if (this.passwordErrorText()) {
                        this.passwordAriaLabel(this.passwordErrorText());
                    }
                    this.passwordVoiceOverErrorString(this.getPasswordVoiceOverErrorString(errorCode));
                    return OnSubmitActions.Error;
                }
                else {
                    // Commit here if empty password is allowed
                    this.commitAsync().done(null, (err) => {
                        this.evaluateCommitError(err.number);
                        this.recoveryDataErrorHandler();
                    });
                    return OnSubmitActions.InProgress;
                }
            }

            this.onPasswordConfirmSubmit = () => {
                let errorCode = this.validator.validateConfirmPasswordString(this.passwordConfirm(), this.password());
                this.passwordErrorText(this.getErrorMessage(errorCode));
                if (this.passwordErrorText()) {
                    this.passwordAriaLabel(this.passwordErrorText());
                }
                else if (!this.requireRecovery) {
                    // Create the local account after password is confirmed when recovery is not required
                    this.commitAsync().done(null, (err) => {
                        this.evaluateCommitError(err.number);
                        this.recoveryDataErrorHandler();
                    });
                    return OnSubmitActions.InProgress;
                }
                this.passwordVoiceOverErrorString(this.getPasswordVoiceOverErrorString(errorCode));
                return this.passwordErrorText() ? OnSubmitActions.Error : OnSubmitActions.Success;
            }

            this.onSubmitHint = () => {
                let errorCode = this.validator.validateHintString(this.passwordHint(), this.password());
                this.recoveryDataErrorText(this.getErrorMessage(errorCode));

                if (!this.recoveryDataErrorText()) {
                    this.commitAsync().done(null, (err) => {
                        this.evaluateCommitError(err.number);
                        this.recoveryDataErrorHandler();
                    });
                    return OnSubmitActions.InProgress;
                }
                else {
                    // Cortana only speaks for the PasswordHint_Invalid_Error and not the PasswordHint_Empty_Error
                    if (errorCode === ErrorCodes.PasswordHint_Invalid_Error) {
                        this.recoveryDataVoiceOverErrorString(resourceStrings.PasswordHintErrorVoiceOver);
                    }
                    else {
                        this.recoveryDataVoiceOverErrorString("");
                    }
                    return OnSubmitActions.Error;
                }
            }

            this.onSubmitSQSA = () => {
                // If option 0 (placeholder) in security question dropdown is selected, send empty string to get error message
                let errorCode = this.validator.validateSecurityQuestionSelectionString(this.password(), ((securityQuestionDropdown.selectedIndex === 0) ? '' : this.selectedQuestion()), null);
                this.securityQuestionErrorText(this.getErrorMessage(errorCode));
                errorCode = this.validator.validateSecurityAnswerString(this.password(), this.securityAnswer(), null);
                this.recoveryDataErrorText(this.getErrorMessage(errorCode));

                if (this.securityQuestionErrorText()) {
                    securityQuestionDropdown.focus();
                }
                else if (this.recoveryDataErrorText()) {
                    securityTextInput.focus();
                }
                else {
                    this.recoverySecurityData.push({ question: this.selectedQuestion(), answer: this.securityAnswer() });
                    let questionIndex = securityQuestionDropdown.selectedIndex - 1;
                    this.securityQuestions.splice(questionIndex, 1);

                    // Submit to create a local account after 3 security questions have been answered, otherwise display SQSA page again
                    if (this.recoverySecurityData.length >= NUM_SECURITY_ANSWERS) {
                        this.commitAsync().done(null, (err) => {
                            this.evaluateCommitError(err.number);
                            this.recoveryDataErrorHandler();
                        });
                        return OnSubmitActions.InProgress;
                    }
                }
                return OnSubmitActions.Error;
            }
            
            this.userNameInit = () => {
                this.username("");
                this.password("");
                this.passwordConfirm("");
                this.passwordHint("");
                this.passwordErrorText("");
                this.securityAnswer("");
                this.selectedQuestion("");
                this.passwordAriaLabel(this.resourceStrings["PasswordPlaceHolder"]);
                // First panel, no panel to navigate before this
                bridge.invoke("CloudExperienceHost.setShowBackButton", false);
            }

            this.passwordInit = () => {
                this.password("");
                this.passwordConfirm("");
                this.passwordHint("");
                this.recoveryDataErrorText("");
                this.selectedQuestion("");
                this.securityAnswer("");
                this.recoverySecurityData = [];
                this.securityQuestionErrorText("");
                // This is the second panel, enable back navigation for this and subsequent pages
                bridge.invoke("CloudExperienceHost.setShowBackButton", true);
            }

            this.passwordHintInit = () => {
                this.passwordHint("");
            }

            this.sqsaInit = () => {
                let sqsaPlaceholder = this.resourceStrings["SecurityQuestionPlaceholder" + (this.recoverySecurityData.length + 1)];
                this.securityQuestionPlaceholder(sqsaPlaceholder);
                securityQuestionDropdown.selectedIndex = 0;
                this.selectedQuestion(sqsaPlaceholder);
                securityQuestionDropdown.focus();
                this.securityAnswer("");
                this.speakStrings(this.resourceStrings["SQSA" + (this.recoverySecurityData.length + 1) + "VoiceOver"]);
                if (this.recoverySecurityData.length === 0) {
                    this.securityQuestions(this.populateSecurityQuestions());
                }
            }

            this.userNameErrorHandler = () => {
                this.initializeVoiceOverAndSpeakStrings(".error-voice-over", this.getPanelElement(this.currentPanelIndex()));
            }

            this.passwordErrorHandler = () => {
                this.initializeVoiceOverAndSpeakStrings(".error-voice-over", this.getPanelElement(this.currentPanelIndex()));
            }

            this.passwordConfirmErrorHandler = () => {
                this.navigate("password");
            }

            this.recoveryDataErrorHandler = () => {
                if (this.passwordErrorText()) {
                    this.navigate("password");
                }
                else if (this.userNameErrorText()) {
                    this.navigate("username");
                }
                else {
                    this.initializeVoiceOverAndSpeakStrings(".error-voice-over", this.getPanelElement(this.currentPanelIndex()));
                }
            }

            this.incompleteSQSAHandler = () => {
                if (!this.securityQuestionErrorText() && !this.recoveryDataErrorText()) {
                    this.sqsaInit();
                }
                else {
                    this.recoveryDataVoiceOverErrorString(resourceStrings.SQSAErrorVoiceOver);
                    this.initializeVoiceOverAndSpeakStrings(".error-voice-over", this.getPanelElement(this.currentPanelIndex()));
                }
            }

            this.backNavigateSkipPreviousPanel = () => {
                this.navigate(this.currentPanelIndex() - 2);
            }

            this.backNavigateSQSA = () => {
                if (this.recoverySecurityData.length === 0) {
                    this.backNavigateSkipPreviousPanel();
                }
                else {
                    let response = this.recoverySecurityData.pop();
                    this.securityQuestions.push({ "sqsaQuestionOption": response.question });
                    this.recoveryDataErrorText("");
                    this.securityQuestionErrorText("");
                    this.sqsaInit();
                }
            }

            this.isCurrentPageDisplayingError = function () {
                return WinJS.Utilities.hasClass(this.currentPanelElement(), "hasError");
            }

            this.onlineAccountLinkHandler = () => {
                this.onLinkClick();
            }

            this.ageConfirmationLearnMoreLinkHandler = () => {
                this.onLearnMoreClick();
            }

            this.ageConfirmationLearnMoreContinueHandler = () => {
                this.onLearnMoreContinue();
            }

            let allowedProviders = appObjectFactory.getObjectFromString("CloudExperienceHostAPI.SignInIdentities").allowedProviders;
            this.shouldShowOnlineAccountLink = this.allowOnlineAccount && isInternetAvailable && ((allowedProviders & CloudExperienceHostAPI.SignInIdentityProviders.msa) || (allowedProviders & CloudExperienceHostAPI.SignInIdentityProviders.aad));
            this.shouldShowAgeConfirmationText = this.allowOnlineAccount && (allowedProviders & CloudExperienceHostAPI.SignInIdentityProviders.msa) && shouldAadcRestrictionsApplyInDeviceRegion;
            if (!this.isLiteWhitePersonality && this.shouldShowOnlineAccountLink) {
                this.flexStartHyperLinks = [
                    {
                        handler: this.onlineAccountLinkHandler,
                        hyperlinkText: resourceStrings.UseOnlineAccountButtonText
                    }
                ];
            }

            this.currentPanelIndex.subscribe((newStepIndex) => {
                this.processingFlag(false);

                let newStepPanel = this.getPanelElement(newStepIndex);
                if (newStepPanel) {
                    let inputs = WinJS.Utilities.query("textarea, input", newStepPanel);
                    if (inputs.length > 0) {
                        inputs.forEach((input) => input.disabled = false);
                    }

                    let item = ko.dataFor(newStepPanel);
                    if (item.onInit) {
                        item.onInit();
                    }

                    // Back navigation can show up error strings, in such a case just read the error
                    // Sequential navigation on hitting next can never show an error (else)
                    if (this.isCurrentPageDisplayingError()) {
                        this.initializeVoiceOverAndSpeakStrings(".error-voice-over", newStepPanel);
                    }
                    else {
                        this.initializeVoiceOverAndSpeakStrings(".voice-over", newStepPanel);
                    }
                }
            });

            this.submitPanel = () => {
                if (!this.processingFlag()) {
                    this.processingFlag(true);

                    let item = ko.dataFor(this.currentPanelElement());
                    let onSubmitResult = item.onSubmit();
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountPanelSubmit",
                        JSON.stringify({
                            "panelIndex": this.currentPanelIndex(),
                            "result": onSubmitResult
                        })
                    );

                    // Take action depending on the result from this panel.
                    // If this panel returned an "InProgress" result (i.e. kicked off an async op), no-op and allow that to continue in the background
                    if (onSubmitResult === OnSubmitActions.Success) {
                        this.nextStep();
                    }
                    else if ((onSubmitResult === OnSubmitActions.Error) && item.onSubmitError) {
                        this.processingFlag(false);
                        item.onSubmitError();
                    }
                }
            }

            this.pageDefaultAction = () => {
                this.submitPanel();
            }

            // One of the component redirections loses the object context for invoking this. For now use an arrow function to work around this.
            this.nextStep = () => {
                this.navigate(this.currentPanelIndex() + 1);
            }

            this.commitAsync = function () {
                // Show the progress ring while committing async.
                bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                let promise = WinJS.Promise.as(null);
                if (this.password()) {
                    let provider = new Windows.Security.Cryptography.DataProtection.DataProtectionProvider("local=user");
                    let binary = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(this.password(), Windows.Security.Cryptography.BinaryStringEncoding.utf8);
                    promise = provider.protectAsync(binary);
                }

                promise = promise.then((protectedData) => {
                    let localAccountManager = new CloudExperienceHostBroker.Account.LocalAccountManager();
                    let recoveryData = this.passwordHint();
                    let recoveryKind = CloudExperienceHostBroker.Account.RecoveryKind.hint;
                    if (this.showSecurityQuestionFeature) {
                        recoveryData = JSON.stringify({ "version": 1.0, "questions": this.recoverySecurityData });
                        recoveryKind = CloudExperienceHostBroker.Account.RecoveryKind.questions;
                    }
                    return localAccountManager.createLocalAccountAsync(this.username().trim(), protectedData, recoveryData, recoveryKind);
                }).then(() => {
                    bridge.invoke("CloudExperienceHost.UserManager.setSignInIdentityProvider", CloudExperienceHostAPI.SignInIdentityProviders.local);
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountCreationSuccess",
                        JSON.stringify({
                            "passwordUsed": this.password() ? "Password" : "NoPassword",
                            "recoveryKind": this.showSecurityQuestionFeature ? "Security Questions" : "Hint",
                            "enrolledFrom": "OOBE"}));
                    bridge.fireEvent(constants.Events.done, constants.AppResult.success);
                });

                return promise;
            }

            this.evaluateCommitError = function (errorNumber) {
                // Just log the failure, no need to call AppResult.fail since we give the user another chance to re-commit their credentials
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountCreationFailure", errorNumber);

                // Hide the progress and show the page
                // Also reset the processing flag to ensure the buttons are interactable in case of error
                bridge.fireEvent(constants.Events.visible, true);
                this.processingFlag(false);

                let errorCode = uiHelpers.GetErrorCodeFromError(errorNumber);
                if (errorCode === ErrorCodes.PasswordHint_Empty_Error) {
                    this.recoveryDataErrorText(this.getErrorMessage(errorCode));
                    this.recoveryDataVoiceOverErrorString("");
                }
                else if ((errorCode === ErrorCodes.PasswordPolicy_Error) ||
                         (errorCode === ErrorCodes.PasswordConfirm_Error)) {
                    this.passwordErrorText(this.getErrorMessage(errorCode));
                    if (this.passwordErrorText()) {
                        this.passwordAriaLabel(this.passwordErrorText());
                    }
                    this.passwordVoiceOverErrorString(this.getPasswordVoiceOverErrorString(errorCode));
                }
                else {
                    this.userNameErrorText(this.getErrorMessage(errorCode));
                }
            }
        }

        populateSecurityQuestions() {
            let securityQuestions = [];

            let securityQuestion;
            for (let i = 1; securityQuestion = this.resourceStrings["SecurityQuestion" + i]; i++) {
                securityQuestions.push({ "sqsaQuestionOption": securityQuestion });
            }
            return securityQuestions;
        }

        startVoiceOver() {
            // Speak out the string for the UserName page as the subscription event doesn't fire for the first page
            this.speakStrings(this.resourceStrings.UserNameVoiceOver);
        }

        navigate(panel) {
            let panelIndex = panel;
            if (typeof (panel) === 'string') {
                let newStepPanel = document.querySelector(".oobe-panel[data-panel-id='" + panel + "']");
                panelIndex = newStepPanel.getAttribute("data-panel-index");
            }

            let oldStepPanel = this.getPanelElement(this.currentPanelIndex());
            if (oldStepPanel && (Number(panelIndex) !== this.currentPanelIndex())) {
                let inputs = WinJS.Utilities.query("textarea, input", oldStepPanel);
                inputs.forEach((input) => input.disabled = true);
            }
            this.currentPanelIndex(Number(panelIndex));
        }

        initializeVoiceOverAndSpeakStrings(voiceOverClass, currPanel) {
            let voiceOverString = WinJS.Utilities.query(voiceOverClass, currPanel);
            if (voiceOverString.length > 0) {
                this.speakStrings(voiceOverString[0].innerText);
            }
        }

        speakStrings(voiceOverString) {
            appObjectFactory.getObjectFromString("CloudExperienceHostAPI.Speech.SpeechSynthesis").speakAsync(voiceOverString).done(() => {
                // Voice over completed successfully
            }, (error) => {
                // Check that the error object is defined
                if (error) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "LocalAccountVoiceOverError", core.GetJsonFromError(error));
                }
            });
        }

        onLinkClick() {
            if (!this.processingFlag()) {
                this.processingFlag(true);

                // Redirect to the page which determines what type of online account to create
                bridge.fireEvent(constants.Events.done, this.onlineAccountTargetId);
            }
        }

        onLearnMoreClick() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                this.learnMoreVisible(true);
                bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "LearnMoreButtonClicked");
                this.showLearnMore();
                bridge.invoke("CloudExperienceHost.setShowBackButton", true); // Always override back button on learn more page
                KoHelpers.setFocusOnAutofocusElement();
            }
        }

        showLearnMore() {
            let learnMoreIFrame = document.querySelector(".eula-iframe[data-iframe-index='" + this.currentPanelIndex() + "']");
            let doc = learnMoreIFrame.contentWindow.document;
            let msaInformationPage = "https://go.microsoft.com/fwlink/?linkid=2162068";
            oobeSettingsData.showLearnMoreContent(doc, msaInformationPage, document.documentElement.dir, this.isInternetAvailable, this.resourceStrings.AgeConfirmationNavigationError, this.targetPersonality);
            this.processingFlag(false);
        }

        onLearnMoreContinue() {
            if (!this.processingFlag()) {
                this.processingFlag(true);
                bridge.invoke("CloudExperienceHost.Telemetry.logUserInteractionEvent", "LearnMoreContinueButtonClicked");
                this.learnMoreVisible(false);
                if (this.currentPanelIndex() === 0) {
                    bridge.invoke("CloudExperienceHost.setShowBackButton", false); // Fall back to normal back button behavior on first panel
                }
                KoHelpers.setFocusOnAutofocusElement();
            }
        }

        backNavigate(item) {
            if (item.onBackNavigate) {
                item.onBackNavigate();
            }
            // By default go to the previous panel
            else {
                this.navigate(this.currentPanelIndex() - 1);
            }
        }

        handleBackNavigation() {
            if (this.learnMoreVisible()) {
                this.onLearnMoreContinue();
            } else {
                this.backNavigate(ko.dataFor(this.currentPanelElement()));
            }
        }
    }
    return LocalAccountViewModel;
});
