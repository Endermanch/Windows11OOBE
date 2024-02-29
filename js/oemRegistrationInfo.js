//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var OEMRegistrationInfo;
    (function (OEMRegistrationInfo_1) {
        (function (ElementType) {
            ElementType[ElementType["Text"] = 0] = "Text";
            ElementType[ElementType["EMail"] = 1] = "EMail";
            ElementType[ElementType["Select"] = 2] = "Select";
            ElementType[ElementType["Checkbox"] = 3] = "Checkbox";
            ElementType[ElementType["Link"] = 4] = "Link";
            ElementType[ElementType["Paragraph"] = 5] = "Paragraph";
        })(OEMRegistrationInfo_1.ElementType || (OEMRegistrationInfo_1.ElementType = {}));
        var ElementType = OEMRegistrationInfo_1.ElementType;
        class Element {
            constructor(type, id) {
                this.type = type;
                this.id = id;
            }
        }
        OEMRegistrationInfo_1.Element = Element;
        class TextElement extends Element {
            constructor(id, placeHolder, value) {
                super(ElementType.Text, id);
                this.placeHolder = placeHolder;
                this.value = value;
            }
        }
        OEMRegistrationInfo_1.TextElement = TextElement;
        class EMailElement extends Element {
            constructor(id, placeHolder, value) {
                super(ElementType.EMail, id);
                this.placeHolder = placeHolder;
                this.value = value;
            }
        }
        OEMRegistrationInfo_1.EMailElement = EMailElement;
        class SelectElement extends Element {
            constructor(id, placeHolder, option, options) {
                super(ElementType.Select, id);
                this.placeHolder = placeHolder;
                this.option = option;
                this.options = options;
            }
        }
        OEMRegistrationInfo_1.SelectElement = SelectElement;
        class CheckboxElement extends Element {
            constructor(id, text, checked) {
                super(ElementType.Checkbox, id);
                this.text = text;
                this.checked = checked;
            }
        }
        OEMRegistrationInfo_1.CheckboxElement = CheckboxElement;
        class LinkElement extends Element {
            constructor(id, text, fileName) {
                super(ElementType.Link, id);
                this.text = text;
                this.fileName = fileName;
            }
        }
        OEMRegistrationInfo_1.LinkElement = LinkElement;
        class ParagraphElement extends Element {
            constructor(id, text, visibility) {
                super(ElementType.Paragraph, id);
                this.text = text;
                this.visibility = visibility;
            }
        }
        OEMRegistrationInfo_1.ParagraphElement = ParagraphElement;
        class OEMRegistrationInfo {
            constructor(registrationInfo, keyNames) {
                this._keyNames = keyNames;
                this._registrationDefinition = registrationInfo;
            }
            getTitle() {
                return this._registrationDefinition[this._keyNames.title];
            }
            getSubtitle() {
                return this._registrationDefinition[this._keyNames.subtitle];
            }
            getHideskip() {
                return this._registrationDefinition[this._keyNames.hideSkip];
            }
            getShowPhoneNumber() {
                return this._registrationDefinition[this._keyNames.showPhoneNumber];
            }
            getCustomerinfo() {
                var customerInfo = null;
                var ci = this._registrationDefinition[this._keyNames.customerInfo];
                if (ci) {
                    customerInfo = {
                        label: ci[this._keyNames.label],
                        value: ci[this._keyNames.value],
                    };
                }
                return customerInfo;
            }
            getFields() {
                var result = new Array();
                var fields = this._registrationDefinition[this._keyNames.fields];
                if (fields) {
                    fields.forEach(function (field) {
                        result.push({
                            type: field[this._keyNames.type],
                            id: field[this._keyNames.id],
                            label: field[this._keyNames.label],
                            value: field[this._keyNames.value],
                        });
                    }, this);
                }
                return result;
            }
            getKeyNames() {
                return this._keyNames;
            }
        }
        class Strings {
            constructor() {
                this.firstNamePlaceholder = "";
                this.lastNamePlaceholder = "";
                this.emailPlaceholder = "";
                this.regionDefaultOption = "";
                this.prepopulatedInfoLabel = "";
                this.emailInvalidError = "";
                this.skipButton = "";
                this.nextButton = "";
            }
        }
        class CustomerInfoFieldId {
        }
        CustomerInfoFieldId.firstName = "text1";
        CustomerInfoFieldId.lastName = "text2";
        CustomerInfoFieldId.email = "text3";
        CustomerInfoFieldId.country = "text4";
        CustomerInfoFieldId.consent = "consentCheckbox";
        class OEMRegistrationHelper {
            constructor(bridge) {
                this._bridge = null;
                this._keyNames = null;
                this._strings = null;
                this._userInfo = null;
                this._bridge = bridge;
            }
            initialize() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    this._getOEMRegistrationKeyNames().then(function () {
                        this._getUserInfo().then(function () {
                            this._getStrings().then(function () {
                                completeDispatch();
                            }.bind(this), errorDispatch);
                        }.bind(this), errorDispatch);
                    }.bind(this), errorDispatch);
                }.bind(this));
            }
            getPageDescriptor() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    var pd = {
                        title: "",
                        subTitle: "",
                        hideSkip: false,
                        showPhoneNumber: false,
                        emailInvalidError: "",
                        nextButton: "",
                        skipButton: "",
                        fields: []
                    };
                    this._getOEMRegistrationInfo().then(function (def) {
                        this._addCustomerInfo(pd, def).then(function () {
                            pd.title = def.getTitle();
                            pd.subTitle = def.getSubtitle();
                            pd.hideSkip = def.getHideskip();
                            pd.showPhoneNumber = def.getShowPhoneNumber();
                            pd.emailInvalidError = this._strings.emailInvalidError;
                            pd.nextButton = this._strings.nextButton;
                            pd.skipButton = this._strings.skipButton;
                            this._addFields(pd, def);
                            completeDispatch(pd);
                        }.bind(this), errorDispatch);
                    }.bind(this), errorDispatch);
                }.bind(this));
            }
            saveOEMRegistrationInfo(elements) {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    var customerInfo = null;
                    var fields = new Array();
                    elements.forEach(function (element) {
                        var field = null;
                        switch (element.type) {
                            case ElementType.EMail:
                            case ElementType.Text:
                                var textElement = element;
                                field = new Object();
                                field[this._keyNames.type] = this._keyNames.textboxType;
                                field[this._keyNames.id] = textElement.id;
                                field[this._keyNames.label] = textElement.placeHolder;
                                field[this._keyNames.value] = textElement.value;
                                break;
                            case ElementType.Checkbox:
                                var checkElement = element;
                                if (checkElement.id === CustomerInfoFieldId.consent) {
                                    customerInfo = new Object();
                                    customerInfo[this._keyNames.label] = checkElement.text;
                                    customerInfo[this._keyNames.value] = checkElement.checked;
                                }
                                else {
                                    field = new Object();
                                    field[this._keyNames.type] = this._keyNames.checkboxType;
                                    field[this._keyNames.id] = checkElement.id;
                                    field[this._keyNames.label] = checkElement.text;
                                    field[this._keyNames.value] = checkElement.checked;
                                }
                                break;
                            default:
                                throw "Invalid Field Type";
                                break;
                        }
                        if (field) {
                            fields.push(field);
                        }
                    }, this);
                    var registrationInfo = new Object();
                    if (fields.length > 0) {
                        registrationInfo[this._keyNames.fields] = fields;
                    }
                    if (customerInfo) {
                        registrationInfo[this._keyNames.customerInfo] = customerInfo;
                    }
                    this._bridge.invoke("CloudExperienceHost.OEMRegistrationInfo.saveOEMRegistrationInfo", JSON.stringify(registrationInfo)).then(function () {
                        completeDispatch();
                    }.bind(this), errorDispatch);
                }.bind(this));
            }
            getLinkFileContent(filePath) {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    this._bridge.invoke("CloudExperienceHost.OEMRegistrationInfo.getLinkFileContent", filePath).then(function (content) {
                        completeDispatch(content);
                    }.bind(this), errorDispatch);
                }.bind(this));
            }
            _getStrings() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    this._bridge.invoke("CloudExperienceHost.Resources.getStrings", "oemRegistration", new Strings()).then(function (strings) {
                        this._strings = strings;
                        completeDispatch();
                    }.bind(this), errorDispatch);
                }.bind(this));
            }
            _getUserInfo() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    this._bridge.invoke("CloudExperienceHost.MSA.getUserInfo").then(function (userInfo) {
                        this._userInfo = userInfo;
                        completeDispatch();
                    }.bind(this), errorDispatch);
                }.bind(this));
            }
            _getOEMRegistrationKeyNames() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    this._bridge.invoke("CloudExperienceHost.OEMRegistrationInfo.getOEMRegistrationKeyNames").then(function (keyNames) {
                        this._keyNames = keyNames;
                        completeDispatch();
                    }.bind(this), errorDispatch);
                }.bind(this));
            }
            _getOEMRegistrationInfo() {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    this._bridge.invoke("CloudExperienceHost.OEMRegistrationInfo.retrieveOEMRegistrationInfo").then(function (registrationInfo) {
                        completeDispatch(new OEMRegistrationInfo(JSON.parse(registrationInfo), this._keyNames));
                    }.bind(this), errorDispatch);
                }.bind(this));
            }
            _addCustomerInfo(pd, def) {
                return new WinJS.Promise(function (completeDispatch, errorDispatch /*, progressDispatch */) {
                    if (def.getCustomerinfo()) {
                        var firstName = null;
                        var lastName = null;
                        var email = null;
                        var country = null;
                        var prepopulated = false;
                        if (this._userInfo) {
                            firstName = this._userInfo.firstName;
                            lastName = this._userInfo.lastName;
                            email = this._userInfo.email;
                            country = this._userInfo.country;
                            prepopulated = true;
                        }
                        this._bridge.invoke("CloudExperienceHost.Globalization.GeographicRegion.getAll").then(function (regions) {
                            pd.fields.push([new TextElement(CustomerInfoFieldId.firstName, this._strings.firstNamePlaceholder, firstName), new TextElement(CustomerInfoFieldId.lastName, this._strings.lastNamePlaceholder, lastName)]);
                            pd.fields.push([new EMailElement(CustomerInfoFieldId.email, this._strings.emailPlaceholder, email), new SelectElement(CustomerInfoFieldId.country, this._strings.regionDefaultOption, country, regions)]);
                            pd.fields.push([new ParagraphElement("prepopulated", this._strings.prepopulatedInfoLabel, prepopulated)]);
                            pd.fields.push([new CheckboxElement(CustomerInfoFieldId.consent, def.getCustomerinfo().label, def.getCustomerinfo().value)]);
                            completeDispatch();
                        }.bind(this), errorDispatch);
                    }
                    else {
                        completeDispatch();
                    }
                }.bind(this));
            }
            _addFields(pd, def) {
                def.getFields().forEach(function (field) {
                    var element = null;
                    switch (field.type) {
                        case def.getKeyNames().checkboxType:
                            element = new CheckboxElement(field.id, field.label, field.value);
                            break;
                        case def.getKeyNames().linkType:
                            element = new LinkElement(field.id, field.label, field.value);
                            break;
                        case def.getKeyNames().textboxType:
                        default:
                            throw "Invalid Field Type";
                            break;
                    }
                    pd.fields.push([element]);
                }, this);
            }
        }
        OEMRegistrationInfo_1.OEMRegistrationHelper = OEMRegistrationHelper;
    })(OEMRegistrationInfo = CloudExperienceHost.OEMRegistrationInfo || (CloudExperienceHost.OEMRegistrationInfo = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=oemRegistrationInfo.js.map