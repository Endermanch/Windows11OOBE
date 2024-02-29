

"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var OEMRegistrationInfo;
    (function (OEMRegistrationInfo) {
        var FIELDTYPE = { checkbox: 'checkbox', text: 'text', email: 'email', select: 'select', paragraph: 'paragraph' };
        var FIELDCLASS = { text: 'inputType_text', email: 'inputType_email', select: 'inputType_select' };
        var UICreator = (function () {
            function UICreator(pageContainerDiv, flyoutIframeElement, flyoutDiv) {
                this.selectedOptionValue = '';
                this.createdInputs = new Array();
                this.isPrePopulated = false;
                this._pageContainerDiv = pageContainerDiv;
                this._flyoutIframe = flyoutIframeElement;
                this._flyoutDiv = flyoutDiv;
            }
            UICreator.prototype._addDefaultAttribute = function (element, value) {
                element.setAttribute('defaultValue', value);
            };
            UICreator.prototype._createCheckboxInputElement = function (id, checked) {
                var checkboxInputElement = document.createElement('input');
                checkboxInputElement.type = FIELDTYPE.checkbox;
                this._addDefaultAttribute(checkboxInputElement, checked.toString());
                checkboxInputElement.id = id;
                checkboxInputElement.checked = checked;
                checkboxInputElement.classList.add('win-checkbox');
                return checkboxInputElement;
            };
            UICreator.prototype._createCheckboxLabelElement = function (id, textContent) {
                var labelElement = document.createElement('label');
                labelElement.htmlFor = id;
                labelElement.id = id + 'Label';
                labelElement.textContent = textContent;
                labelElement.setAttribute('aria-hidden', 'true'); 
                return labelElement;
            };
            UICreator.prototype._createTextInputElement = function (id, placeHolder, value) {
                var textInputElement = document.createElement('input');
                this._addDefaultAttribute(textInputElement, value);
                textInputElement.type = FIELDTYPE.text;
                textInputElement.id = id;
                textInputElement.value = value;
                textInputElement.placeholder = placeHolder;
                textInputElement.classList.add('win-textbox');
                return textInputElement;
            };
            UICreator.prototype._createEmailInputElement = function (id, placeHolder, value) {
                var emailInputElement = document.createElement('input');
                this._addDefaultAttribute(emailInputElement, value);
                emailInputElement.type = FIELDTYPE.email;
                emailInputElement.id = id;
                emailInputElement.placeholder = placeHolder;
                emailInputElement.value = value;
                emailInputElement.classList.add('win-textbox');
                
                emailInputElement.addEventListener("blur", function () {
                    var eAddress = emailInputElement.value;
                    if (eAddress.length > 0) {
                        var atPos = eAddress.lastIndexOf('@');
                        var periodPos = eAddress.lastIndexOf(".");
                        if ((((eAddress.split('@').length - 1) > 1) || ((eAddress.split('.').length - 1) < 1))
                            || !((atPos > 0) && (periodPos < eAddress.length - 1) && (periodPos > atPos + 2) && (eAddress.length - atPos > 5))) {
                            this._emailError(emailInputElement, true, oemMetadata.emailInvalidError);
                        }
                        else {
                            this._emailError(emailInputElement, false, '');
                        }
                    }
                    else {
                        this._emailError(emailInputElement, false, '');
                    }
                }.bind(this));
                return emailInputElement;
            };
            UICreator.prototype._createEmailErrorElement = function (errorDivParent) {
                var errorDiv = document.createElement('div');
                errorDiv.classList.add('template-tooltip');
                errorDiv.classList.add('tooltipType_error');
                errorDiv.id = 'email_errorDialog';
                errorDiv.setAttribute("role", "alert");
                errorDiv.setAttribute("aria-live", "assertive");
                errorDiv.style.display = 'none';
                errorDivParent.appendChild(errorDiv);
            };
            UICreator.prototype._createSelectElement = function (id, placeholderOptionValue, placeholderOptionText, option) {
                var selectElement = document.createElement('select');
                selectElement.id = id;
                selectElement.setAttribute('type', FIELDTYPE.select);
                selectElement.classList.add('win-dropdown');
                this.selectedOptionValue = option;
                this._addDefaultAttribute(selectElement, option);
                
                var optionTag = document.createElement('option');
                optionTag.value = placeholderOptionValue;
                optionTag.innerText = placeholderOptionText;
                selectElement.appendChild(optionTag);
                return selectElement;
            };
            UICreator.prototype._createAnchorElement = function (id, href, textContent, fileName) {
                var anchorElement = document.createElement('a');
                anchorElement.id = id;
                anchorElement.href = href;
                anchorElement.innerText = textContent;
                anchorElement.onclick = function () {
                    var iframeDocument = this._flyoutIframe.contentWindow.document;
                    pageHelper.getLinkFileContent(fileName).done(function (fileContent) {
                        iframeDocument.open('text/html', 'replace');
                        iframeDocument.dir = _htmlRoot.dir;
                        iframeDocument.write(fileContent);
                        iframeDocument.close();
                        this._flyoutDiv.style.marginTop = this._getPageTop(this._pageContainerDiv) + 'px';
                        this._flyoutDiv.winControl.show(anchorElement, 'top', _htmlRoot.dir === "rtl" ? 'right' : 'left');
                    }.bind(this));
                }.bind(this);
                return anchorElement;
            };
            UICreator.prototype._createInputElementWrapperDiv = function (inputElement) {
                var wrappperDiv = document.createElement('div');
                wrappperDiv.classList.add('template-input');
                wrappperDiv.classList.add(this._getFieldClass(inputElement.getAttribute('type')));
                wrappperDiv.appendChild(inputElement);
                return wrappperDiv;
            };
            
            UICreator.prototype._getFieldClass = function (fieldTypeName) {
                switch (fieldTypeName) {
                    case FIELDTYPE.text:
                        return FIELDCLASS.text;
                    case FIELDTYPE.email:
                        return FIELDCLASS.email;
                    case FIELDTYPE.select:
                        return FIELDCLASS.select;
                    default:
                        throw "Invalid Type Name";
                        break;
                }
            };
            
            UICreator.prototype._getPageTop = function (el) {
                var rect = el.getBoundingClientRect();
                var docEl = document.documentElement;
                return rect.top + (window.pageYOffset || docEl.scrollTop || 0);
            };
            
            UICreator.prototype._emailError = function (emailObject, shouldShow, errorMessage) {
                var errorDiv = emailObject.nextSibling;
                if (shouldShow) {
                    if (errorDiv.childNodes.length < 1) {
                        var pTag = document.createElement('p');
                        pTag.setAttribute("aria-hidden", "true");
                        errorDiv.appendChild(pTag);
                    }
                    errorDiv.setAttribute("aria-label", errorMessage);
                    errorDiv.firstChild.textContent = errorMessage;
                    errorDiv.style.display = 'inline';
                }
                else {
                    errorDiv.style.display = 'none';
                    if (errorDiv.firstChild) {
                        errorDiv.removeChild(errorDiv.firstChild);
                    }
                    errorDiv.setAttribute("aria-label", null);
                }
            };
            UICreator.prototype._createParagraphElement = function (id, typeAttributeValue, textContent, visibility) {
                var paragraphElement = document.createElement('p');
                paragraphElement.id = id;
                paragraphElement.textContent = textContent;
                paragraphElement.setAttribute("type", typeAttributeValue);
                paragraphElement.setAttribute("tabindex", "-1");
                paragraphElement.setAttribute("aria-label", textContent);
                paragraphElement.style.visibility = visibility ? 'visible' : 'hidden';
                this.isPrePopulated = visibility;
                paragraphElement.style.display = visibility ? 'inline' : 'none';
                return paragraphElement;
            };
            UICreator.prototype._createOptionElement = function (codeTwoLetter, displayName) {
                var optionElement = document.createElement('option');
                optionElement.value = codeTwoLetter;
                optionElement.innerText = displayName;
                if (codeTwoLetter === this.selectedOptionValue) {
                    optionElement.selected = true;
                }
                return optionElement;
            };
            
            UICreator.prototype._addChildElement = function (parentElement, fields) {
                for (var i = 0; fields[i]; i++) {
                    var field = fields[i];
                    if (typeof field.type !== 'undefined') {
                        switch (field.type) {
                            case OEMRegistrationInfo.ElementType.Checkbox:
                                var checkboxInputElement = this._createCheckboxInputElement(field.id, field.checked);
                                parentElement.appendChild(checkboxInputElement);
                                this.createdInputs.push(checkboxInputElement);
                                var labelElement = this._createCheckboxLabelElement(field.id, field.text);
                                parentElement.appendChild(labelElement);
                                parentElement.classList.add('inputType_checkbox');
                                break;
                            case OEMRegistrationInfo.ElementType.Text:
                                var textInputElement = this._createTextInputElement(field.id, field.placeHolder, field.value);
                                var wrapperDiv = this._createInputElementWrapperDiv(textInputElement);
                                parentElement.appendChild(wrapperDiv);
                                this.createdInputs.push(textInputElement);
                                break;
                            case OEMRegistrationInfo.ElementType.EMail:
                                var emailInputElement = this._createEmailInputElement(field.id, field.placeHolder, field.value);
                                var wrapperDiv = this._createInputElementWrapperDiv(emailInputElement);
                                parentElement.appendChild(wrapperDiv);
                                this.createdInputs.push(emailInputElement);
                                this._createEmailErrorElement(wrapperDiv);
                                break;
                            case OEMRegistrationInfo.ElementType.Select:
                                var selectElement = this._createSelectElement(field.id, "", field.placeHolder, field.option);
                                var wrapperDiv = this._createInputElementWrapperDiv(selectElement);
                                this._addChildElement(selectElement, field.options);
                                parentElement.appendChild(wrapperDiv);
                                this.createdInputs.push(selectElement);
                                break;
                            case OEMRegistrationInfo.ElementType.Link:
                                var anchorElement = this._createAnchorElement(field.id, '#', field.text, field.fileName);
                                parentElement.appendChild(anchorElement);
                                break;
                            case OEMRegistrationInfo.ElementType.Paragraph:
                                var paragraphElement = this._createParagraphElement(field.id, FIELDTYPE.paragraph, field.text, field.visibility);
                                paragraphElement.classList.add('secondaryText');
                                parentElement.appendChild(paragraphElement);
                                parentElement.classList.add('secondaryText_parent');
                                break;
                            default:
                                throw "Invalid Field Type";
                                break;
                        }
                    }
                    else if ((typeof field.codeTwoLetter !== 'undefined') && (typeof field.displayName !== 'undefined')) {
                        var optionElement = this._createOptionElement(field.codeTwoLetter, field.displayName);
                        parentElement.appendChild(optionElement);
                    }
                }
            };
            UICreator.prototype.createUI = function (oemMetadata, oemInfo, linkInfo) {
                for (var i = 0; oemMetadata.fields[i]; i++) {
                    var parentElement = document.createElement('div');
                    parentElement.classList.add('template-input');
                    var field = oemMetadata.fields[i];
                    if (field.length > 1) {
                        parentElement = document.createElement('fieldset');
                        parentElement.classList.add('haveMultipleChildren');
                        parentElement.setAttribute("role", "presentation");
                    }
                    this._addChildElement(parentElement, oemMetadata.fields[i]);
                    (field[0].type === OEMRegistrationInfo.ElementType.Link) ? linkInfo.appendChild(parentElement) : oemInfo.appendChild(parentElement);
                }
            };
            return UICreator;
        })();
        OEMRegistrationInfo.UICreator = UICreator;
        var bridge = new CloudExperienceHost.Bridge();
        var pageHelper = new OEMRegistrationInfo.OEMRegistrationHelper(bridge);
        var oemMetadata = null;
        var uiCreatorObject = null;
        var shouldShowOEM = false;
        WinJS.UI.Pages.define("/views/OEMRegistration.html", {
            init: function (element, options) {
                uiCreatorObject = new UICreator(pageContainer, flyoutIframe, flyout);
                var pagePromise = new WinJS.Promise(function (completeDispatch, errorDispatch ) {
                    bridge.invoke("CloudExperienceHost.OEMRegistrationInfo.getShouldShowOEMRegistration").then(function (showOEM) {
                        shouldShowOEM = showOEM;
                        if (shouldShowOEM) {
                            bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                                _htmlRoot.setAttribute("lang", preferredLang);
                                bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                                    _htmlRoot.setAttribute("dir", dirVal);
                                    pageHelper.initialize().then(function () {
                                        pageHelper.getPageDescriptor().then(function (result) {
                                            _processResultHelper(result, completeDispatch, errorDispatch);
                                        }, function (e) {
                                            errorDispatch(e);
                                        });
                                    }, function (e) {
                                        errorDispatch(e);
                                    });
                                }, function (e) {
                                    errorDispatch(e);
                                });
                            }, function (e) {
                                errorDispatch(e);
                            });
                        }
                        else {
                            completeDispatch();
                        }
                    }, function (e) {
                        errorDispatch(e);
                    });
                });
                var cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
                return WinJS.Promise.join({ pagePromise: pagePromise, cssPromise: cssPromise });
                function _processResultHelper(result, completeDispatch, errorDispatch) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OEMRegHelperMetaDataReceivedSuccessfully");
                    oemMetadata = result;
                    uiCreatorObject.createUI(oemMetadata, oemInfo, linkInfo);
                    WinJS.Binding.processAll(null, oemMetadata).done(function () {
                        try {
                            
                            uiHelpers.SetElementVisibility(skipButton, !oemMetadata.hideSkip);
                            
                            var checkAmpersandFor = document.getElementsByTagName('button');
                            for (var i = 0; i < checkAmpersandFor.length; i++) {
                                var result = CloudExperienceHost.ResourceManager.GetContentAndAccesskey(checkAmpersandFor[i].textContent);
                                checkAmpersandFor[i].textContent = result.content;
                                checkAmpersandFor[i].accessKey = result.accessKey;
                            }
                            
                            if (uiCreatorObject.createdInputs.length != 0) {
                                uiCreatorObject.createdInputs[0].focus();
                            }
                            else {
                                
                                nextButton.focus();
                            }
                            completeDispatch();
                        }
                        catch (e) {
                            errorDispatch(e);
                        }
                    });
                }
            },
            error: function (e) {
                shouldShowOEM = false;
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "OEMRegistrationPageError", JSON.stringify({ number: e && e.number, stack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.abort);
            },
            ready: function (element, options) {
                
                nextButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    onNext();
                });
                
                function onNext() {
                    _setProgressState(true);
                    var resultPageInfo = new Array();
                    var telemetryInfo = new Array();
                    uiCreatorObject.createdInputs.forEach(function (element) {
                        var resultElement;
                        switch (element.getAttribute("type")) {
                            case FIELDTYPE.checkbox:
                                resultElement = new OEMRegistrationInfo.CheckboxElement(element.id, document.getElementById(element.id + 'Label').textContent, element.checked);
                                telemetryInfo.push(getTelemetryInfo(element, element.value));
                                break;
                            case FIELDTYPE.email:
                                resultElement = new OEMRegistrationInfo.EMailElement(element.id, element.placeholder, element.value);
                                telemetryInfo.push(getTelemetryInfo(element, element.value));
                                break;
                            case FIELDTYPE.select:
                                
                                resultElement = new OEMRegistrationInfo.TextElement(element.id, element.options[0].text, element.options[element.selectedIndex].value);
                                telemetryInfo.push(getTelemetryInfo(element, element.options[element.selectedIndex].value));
                                break;
                            case FIELDTYPE.text:
                                resultElement = new OEMRegistrationInfo.TextElement(element.id, element.placeholder, element.value);
                                telemetryInfo.push(getTelemetryInfo(element, element.value));
                                break;
                            default:
                                throw "Invalid Field Type";
                                break;
                        }
                        resultPageInfo.push(resultElement);
                    }, this);
                    
                    pageHelper.saveOEMRegistrationInfo(resultPageInfo).then(function () {
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "saveOEMRegistrationInfoSuccess", JSON.stringify(telemetryInfo));
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
                    }, function (e) {
                        _setProgressState(false);
                        bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "saveOEMRegistrationInfoFailure", JSON.stringify({ errorNumber: e && e.number.toString(16), errorStack: e && e.asyncOpSource && e.asyncOpSource.stack }));
                        
                        bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.cancel);
                    });
                }
                
                skipButton.addEventListener("click", function (event) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "SkipUserOobeOEMRegistrationPage");
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.cancel);
                });
                
                function getTelemetryInfo(element, value) {
                    var defaultValue = element.getAttribute('defaultValue');
                    if (element.getAttribute("type") === FIELDTYPE.checkbox) {
                        var fieldTelemetry = {
                            id: element.id,
                            isPrePopulated: defaultValue === 'true',
                            isEmpty: false,
                            wasEmpty: false,
                            changed: defaultValue !== value
                        };
                        return fieldTelemetry;
                    }
                    else {
                        var fieldTelemetry = {
                            id: element.id,
                            isPrePopulated: defaultValue.length > 0,
                            isEmpty: value.length < 1,
                            wasEmpty: defaultValue.length < 1,
                            changed: defaultValue !== value
                        };
                        return fieldTelemetry;
                    }
                }
                
                flyout.addEventListener("afterhide", function () {
                    var iframeDocument = flyoutIframe.contentWindow.document;
                    iframeDocument.open('text/html', 'replace');
                    iframeDocument.write('');
                    iframeDocument.close();
                });
                
                function _setProgressState(waiting) {
                    nextButton.disabled = waiting;
                    uiHelpers.SetElementVisibility(progressRing, waiting);
                }
                
                uiHelpers.RegisterEaseOfAccess(easeOfAccess, bridge);
                uiHelpers.RegisterInputSwitcher(inputSwitcher, bridge);
                
                if (shouldShowOEM) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "ShowUserOobeOEMRegistrationPage");
                    bridge.fireEvent(CloudExperienceHost.Events.visible, true);
                }
                else {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "DoNotShowUserOobeOEMRegistrationPage");
                    bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.abort);
                }
            } 
        });
    })(OEMRegistrationInfo = CloudExperienceHost.OEMRegistrationInfo || (CloudExperienceHost.OEMRegistrationInfo = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
