



window.DebugJS = window.DebugJS || {};

function DebugJSConsole() {

    this._registers = [];
    this._pendingOutput = [];
    this._pendingOutputTimer = null;
    this._createUI();
    this._catchErrors();
    this._loadCommandHistory();
    this._eval = eval;

    var that = this;
    function interceptKey(ev) {
        if (that._isVisible() && !ev.key.match("F\\d")) {
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            return true;
        }
        return false;
    }
    window.addEventListener("keydown", function (ev) {

        if (ev.keyCode === 74 && ev.shiftKey && ev.ctrlKey) { // Ctrl + Shift + J
            ev.preventDefault();
            that._toggleLayerVisibility();
        } else if (interceptKey(ev)) {

            var controlKeys = [ "ArrowUp", "Up", "ArrowDown", "Down", "PageUp", "PageDown", "Home", "End" ];
            if (controlKeys.indexOf(ev.key) === -1 &&
                !ev.ctrlKey && !ev.altKey) {
                that._textInputElement.focus();
            }


            if (ev.key === "Esc" || ev.key === "Escape") {
                that._toggleLayerVisibility(); // Closes the developer console
            }


            if (document.activeElement === that._textInputElement) {
                that._onTextInput(ev);
            }
        }
    }, true);
    window.addEventListener("keyup", interceptKey, true);
    window.addEventListener("keypress", interceptKey, true);


    this._textInputFlipElement.addEventListener("click", function () {
        if (that._isSingleLineMode()) {
            this.innerText = "<";
            that._textInputElement.className = "debugConsoleMultiLine";
        } else {
            this.innerText = ">";
            that._textInputElement.className = "debugConsoleSingleLine";
        }
        that._setCommand(that._textInputElement.value);
        that._textInputElement.focus();
    }, false);
}
DebugJSConsole.prototype._onTextInput = function (ev) {
    this._textInputElement.scrollIntoView();
    if (ev.key === "Enter" && (ev.ctrlKey || this._isSingleLineMode())) { // Ctrl + Enter or single line mode

        ev.preventDefault();
        var command = this._textInputElement.value.trim();
        this._textInputElement.value = "";
        if (command !== "") {


            this._appendText("", "> " + toSingleLine(command));


            var index = -1;
            this._commandHistory.forEach(function (previousCommand, i) {
                if (toSingleLine(command) === toSingleLine(previousCommand)) {
                    index = i;
                }
            });
            if (index !== -1) {
                var other = this._commandHistory.splice(index, 1)[0];
                if (this._isSingleLineMode()) {
                    command = other;
                }
            }
            this._commandHistory.unshift(command);
            this._commandHistory.length = Math.min(this._commandHistory.length, 20);
            this._commandHistoryPosition = -1;
            this._saveCommandHistory();


            this._eval(
                "with (DebugJS.console._getCommands()) {\n" +
                (this._safety ? "    try {\n" : "") +
                "        dump(stash(eval(" + JSON.stringify(command) + ")));\n" +
                (this._safety ? "    } catch (ex) {\n" : "") +
                (this._safety ? "        err(ex);\n" : "") +
                (this._safety ? "    }\n" : "") +
                "}"
            );
            this._textInputElement.scrollIntoView();
        }
    } else if ((ev.key === "Up" || ev.key === "ArrowUp") && (ev.ctrlKey || this._isSingleLineMode())) { // Ctrl + Up / Down to scroll through history
        ev.preventDefault();
        if (this._commandHistoryPosition < this._commandHistory.length - 1) {
            this._setCommand(this._commandHistory[++this._commandHistoryPosition]);
        }
    } else if ((ev.key === "Down" || ev.key === "ArrowDown") && (ev.ctrlKey || this._isSingleLineMode())) {
        ev.preventDefault();
        if (this._commandHistoryPosition > 0) {
            this._setCommand(this._commandHistory[--this._commandHistoryPosition]);
        } else {
            this._commandHistoryPosition = -1;
            this._setCommand("");
        }
    } else if (ev.key === "Tab") {
        ev.preventDefault();
        this._tabComplete();
    }
};
function nub (sequence) {

    var members = {};
    sequence.forEach(function (item) { this[item] = null; }, members);
    return Object.keys(members);
}
DebugJSConsole.prototype._tabComplete = function () {
    var cursorPosition = this._textInputElement.selectionStart,
        fullText = this._textInputElement.value,
        preCursorText = fullText.slice(0, cursorPosition),
        postCursorText = fullText.slice(cursorPosition);


    var match = preCursorText.match(/[^=\s\(\){}\+\-\*\/,;&|!"']+$/);
    if (match !== null && match.length === 1 && match[0] !== ".") {
        var candidate = match[0].trim();


        var lastDot = candidate.lastIndexOf(".");
        var isGlobal = false;
        var realPart = "";
        var queryPart = "";
        if (lastDot === -1) {
            isGlobal = true;
            realPart = "window";
            queryPart = candidate;
        } else {
            isGlobal = false;
            realPart = candidate.substr(0, lastDot);
            queryPart = candidate.substr(lastDot + 1);
        }


        var realValue = this._eval(
            "var __tabCompleteResult = null;" +
            "with (DebugJS.console._getCommands()) {" +
            "    try {" +
            "        __tabCompleteResult = eval(" + JSON.stringify(realPart) + ");" +
            "    } catch (ex) { }" +
            "}" +
            "__tabCompleteResult;"
        );


        var matchingFields = {};
        for (var field in realValue) {
            if (field.substr(0, queryPart.length).toLowerCase() === queryPart.toLowerCase()) {
                matchingFields[field] = null;
            }
        }

        var matchingFieldsArray = Object.keys(matchingFields);
        var newQueryPart = null;

        if (matchingFieldsArray.length === 1) {

            newQueryPart = matchingFieldsArray[0];
        } else if (matchingFieldsArray.length > 1) {

            matchingFields.toString = function () { return matchingFieldsArray.length.toString() + " matches"; };
            var commonPrefix = matchingFieldsArray.reduce(function (prev, next) {
                var i = 0;
                for (var len = Math.min(prev.length, next.length); i < len; i++) {
                    if (prev[i].toLowerCase() !== next[i].toLowerCase()) {
                        break;
                    }
                }
                return next.substring(0, i);
            });
            var differentQuery = this._lastRealPart !== realPart || this._lastQuery.toLowerCase() !== queryPart.toLowerCase();
            if (differentQuery) {
                this._appendTreeView(new DataTreeView(candidate + "*", realValue, matchingFields, ["toString"]), true);
            } else if (commonPrefix.length === queryPart.length) {

                var trimmedFields = nub(matchingFieldsArray.map(function (s) { return s.slice(0, queryPart.length); }));
                newQueryPart = trimmedFields[(trimmedFields.indexOf(queryPart) + 1) % trimmedFields.length];
            }
            if (commonPrefix.length > queryPart.length) {
                var distance = function (s) {
                    return Array.prototype.reduce.call(queryPart, function (total, c, i) {
                        return (c === s[i] ? 0 : 1) + total;
                    }, 0);
                };
                newQueryPart = matchingFieldsArray.sort(function (a,b) { return distance(a) - distance(b); })[0].slice(0, commonPrefix.length);
            }
        }
        if (newQueryPart !== null) {
            var newPreCursorText = preCursorText.substr(0, match.index) + (isGlobal ? "" : (realPart + ".")) + newQueryPart;
            this._textInputElement.value = newPreCursorText + postCursorText;
            this._textInputElement.setSelectionRange(newPreCursorText.length, newPreCursorText.length);
        }
        this._lastQuery = newQueryPart !== null ? newQueryPart : queryPart;
        this._lastRealPart = realPart;
    }
};
DebugJSConsole.prototype._createUI = function () {

    this._styleElement = document.createElement("style");
    this._styleElement.id = "debugConsoleStyles";
    this._styleElement.type = "text/css";
    this._styleElement.innerText = DebugJSConsole.CSS;
    this._rootElement = createElement("div", "debugConsoleRoot", null);
    this._rootElement.innerHTML =
        "<div id=debugConsoleBackground>" +
            "<div id=debugConsoleLayer>" +
                "<div id=debugConsoleOutput></div>" +
                "<div>" +
                    "<span id=debugConsoleInputFlip title='Click here to switch between single and multi-line input'>&gt;</span> " +
                    "<textarea id=debugConsoleInput class=debugConsoleSingleLine></textarea>" +
                "</div>" +
            "</div>" +
        "</div>";
    this._layerElement = this._rootElement.querySelector("#debugConsoleLayer");
    this._outputElement = this._rootElement.querySelector("#debugConsoleOutput");
    this._textInputElement = this._rootElement.querySelector("#debugConsoleInput");
    this._textInputElement.spellcheck = false;
    this._lastQuery = "";
    this._lastRealPart = "";
    this._textInputFlipElement = this._rootElement.querySelector("#debugConsoleInputFlip");
};
DebugJSConsole.prototype.writeHTML = function (html) {

    var div = document.createElement("div");
    div.innerHTML = html;
    this._appendOutput(div);
};
DebugJSConsole.outputBufferLimit = 1000;
DebugJSConsole.prototype._appendOutput = function (div, parentElement) {

    if (parentElement !== this._outputElement && parentElement !== undefined) {
        parentElement.appendChild(div);
    } else {

        this._pendingOutput.push(div);
        if (this._pendingOutput.length > DebugJSConsole.outputBufferLimit) {
            this._pendingOutput.shift();
        }
        if (this._isVisible() && !this._pendingOutputTimer) {
            this._pendingOutputTimer = setTimeout(this._applyPendingOutput.bind(this), 250);
        }
    }
};
DebugJSConsole.prototype._applyPendingOutput = function () {
    this._pendingOutputTimer = null;

    var parentElement = this._outputElement;

    var maintainScrollPosition = false;
    var stuckToBottom = false;
    var scrollTop;
    if (this._rootElement.parentNode !== null) {
        maintainScrollPosition = true;
        scrollTop = this._layerElement.scrollTop;
        var scrollHeight = this._layerElement.scrollHeight;
        var clientHeight = this._layerElement.clientHeight;
        stuckToBottom = (scrollHeight - scrollTop <= clientHeight + 10);
    }

    var pendingOutput = this._pendingOutput;
    this._pendingOutput = [];
    pendingOutput.forEach(function (div) {
        parentElement.appendChild(div);
    });

    var newHeight;
    if (maintainScrollPosition && !stuckToBottom) {
        newHeight = this._layerElement.scrollHeight;
    }

    for (var excess = parentElement.childNodes.length - DebugJSConsole.outputBufferLimit; excess > 0; excess--) {
        parentElement.removeChild(parentElement.firstChild);
    }

    if (stuckToBottom) {
        this._layerElement.scrollTop = this._layerElement.scrollHeight - this._layerElement.clientHeight;
    } else if (maintainScrollPosition) {
        this._layerElement.scrollTop = scrollTop - (newHeight - this._layerElement.scrollHeight);
    }
};
DebugJSConsole.prototype._clearOutput = function () {

    this._outputElement.innerHTML = "";
};
DebugJSConsole.prototype._appendText = function (className, text, parentElement) {

    this._appendOutput(createElement("div", className, text), parentElement);
};
DebugJSConsole.prototype._appendData = function (label, data, shouldExpand) {

    this._appendTreeView(new DataTreeView(label, data, data, []), shouldExpand);
};
DebugJSConsole.prototype._appendHTML = function (node, shouldExpand) {

    this._appendTreeView(new HtmlTreeView(node), shouldExpand);
};
DebugJSConsole.prototype._appendCSS = function (element) {

    this._appendTreeView(new CssTraceTreeView(element), true);
};
DebugJSConsole.prototype._appendSheet = function (sheet, shouldExpand) {

    this._appendTreeView(new CssTreeView(sheet), shouldExpand);
};
DebugJSConsole.prototype._appendRule = function (rule, shouldExpand) {

    this._appendTreeView(new CssRuleTreeView(rule, null), shouldExpand);
};
DebugJSConsole.prototype._appendStyle = function (style, shouldExpand) {

    this._appendTreeView(new CssStyleTreeView(style, null), shouldExpand);
};
DebugJSConsole.prototype._appendTreeView = function (treeView, shouldExpand, parentElement) {

    var canExpand = treeView.length > 0;
    if (treeView.isExpanded === undefined) {
        treeView.isExpanded = canExpand && shouldExpand && treeView.length <= 20;
    }

    var div = createElement("div", "debugConsoleOutputText", null);
    var expanderRegion = createElement("span", "debugConsolePropertyName", null, div);
    var expanderElement = createElement("span", "debugConsolePropertyExpander debugConsoleOutputText", "+", expanderRegion);
    if (treeView.label) {
        createElement("span", null, treeView.label + ": ", expanderRegion);
    }

    var valueElement = createElement("span", null, treeView.value, div);
    if (treeView.html) {
        valueElement.innerHTML = treeView.html.outerHTML;
    } else if (treeView.className) {
        valueElement.className = treeView.className;
    }

    var that = this;
    var register = createElement("span", "debugConsoleRegister",
        (treeView.label !== "prototype") ? this._getRegisterName(treeView.register) : null, valueElement);
    valueElement.addEventListener("click", function (ev) {
        that._toggleRegister(treeView.register);
    }, false);
    register.onRegisterChange = function (registerValue, registerName) {
        if (registerValue === treeView.register && treeView.label !== "prototype") {
            this.innerText = registerName;
        }
    };

    var detailsElement = createElement("div", "debugConsoleObjectProperties", null, div);
    if (canExpand) {
        expanderRegion.addEventListener("click", function (ev) {
            if (detailsElement.innerHTML !== "") {
                detailsElement.innerHTML = "";
                expanderElement.innerText = "+";
                treeView.isExpanded = false;
            } else {
                expanderElement.innerText = "-";
                that._expandTreeView(treeView, detailsElement);
            }
        }, false);
        if (treeView.isExpanded) {
            expanderElement.innerText = "-";
            that._expandTreeView(treeView, detailsElement);
        }
    } else {
        expanderElement.style.visibility = "hidden";
    }

    this._appendOutput(div, parentElement);
};
DebugJSConsole.prototype._expandTreeView = function (treeView, detailsElement) {

    if (treeView.children === undefined) {
        treeView.children = [];
        for (var i = 0, len = treeView.length; i < len; i++) {
            treeView.children.push(treeView.createChild(i));
        }
    }
    treeView.isExpanded = true;
    treeView.children.forEach(function (child) {
        this._appendTreeView(child, false, detailsElement);
    }, this);
};

function TreeView() { }
TreeView.prototype.label = "";
TreeView.prototype.value = "";
TreeView.prototype.className = "";
TreeView.prototype.html = null;
TreeView.prototype.register = null;
TreeView.prototype.length = 0;
TreeView.prototype.isExpanded = false;
TreeView.prototype.children = [];
TreeView.prototype.createChild = function (index) { return null; };

function DataTreeView(label, data, proto, excluded) {

    this.label = label;
    this._data = this.register = data;


    this.value = valueToString(proto);
    if (this.value) {
        var maxLength = 1000;
        this.value = this.value.trim();
        if (label) {
            this.value = this.value.replace(/\s+/g, " ");
            maxLength = 100;
        }
        if (this.value.length > maxLength) {
            this.value = this.value.substr(0, maxLength) + "...";
        }
    }

    this._fields = getProperties(proto, true, excluded).sort(function (a, b) {

        if ((typeof data[a] === "function") !== (typeof data[b] === "function")) {
            return (typeof data[a] === "function") ? 1 : -1;
        }

        var aAsNumber = Number(a);
        var bAsNumber = Number(b);
        var aIsNumber = aAsNumber !== null && !isNaN(aAsNumber);
        var bIsNumber = bAsNumber !== null && !isNaN(bAsNumber);
        if (aIsNumber && bIsNumber) {
            return aAsNumber - bAsNumber;
        }
        if (aIsNumber !== bIsNumber) {
            return aIsNumber ? 1 : -1;
        }

        if ((a[0] === "_") !== (b[0] === "_")) {
            return (a[0] === "_") ? 1 : -1;
        }

        return a.localeCompare(b);
    });

    if (typeof data === "function" && !isEmpty(data.prototype, [])) {
        this._prototype = { data: data.prototype, proto: data.prototype, excluded: [] };
        this._fields.splice(0, 0, this._prototype);
    } else if (!isEmpty(proto, excluded)) {
        var nextPrototype = Object.getPrototypeOf(proto);
        var nextExcluded = excluded.concat(this._fields);
        if (!isEmpty(nextPrototype, nextExcluded)) {
            this._prototype = { data: data, proto: nextPrototype, excluded: nextExcluded };
            this._fields.splice(0, 0, this._prototype);
        }
    }

    this.length = this._fields.length;
}
DataTreeView.prototype.createChild = function (index) {
    if (this._prototype !== undefined && index === 0) {
        return new DataTreeView("prototype", this._prototype.data, this._prototype.proto, this._prototype.excluded);
    } else {
        var field = this._fields[index], value, className;
        try {
            value = this._data[field];
            className = "debugConsoleOutputText";
        } catch (ex) {
            value = ex;
            className = "debugConsoleErrorText";
        }
        var treeView = new DataTreeView(field, value, value, []);
        treeView.className = className;
        return treeView;
    }
};

function HtmlTreeView(node) {
    var i, len;
    this._element = this.register = node;

    if (instanceOf(node, HTMLStyleElement)) {
        var style = node;
        this._displayable = style.sheet.cssRules;
    } else if (instanceOf(node, HTMLLinkElement) && node.type === "text/css") {
        var link = node;
        this._displayable = link.sheet.cssRules;
    } else {
        this._displayable = [];
        for (i = 0, len = node.childNodes.length; i < len; i++) {
            if (isDisplayableHtmlNode(node.childNodes[i])) {
                this._displayable.push(node.childNodes[i]);
            }
        }
    }
    this.length = this._displayable.length;

    if (node.nodeType === Node.TEXT_NODE) {

        this.className = "debugConsoleHtmlText";
        var textNode = node;
        this.value = toSingleLine(textNode.textContent.trim());
    } else if (node.nodeType === Node.COMMENT_NODE) {
        this.className = "debugConsoleHtmlComment";
        this.value = toSingleLine(node.text);
    } else {
        var htmlNode = node;
        this.html = createElement("span", null, null);
        createElement("span", "debugConsoleHtmlBracket", "<", this.html);
        createElement("span", "debugConsolePropertyName", htmlNode.nodeName.toLowerCase(), this.html);


        if (htmlNode.id) {
            this._appendHtmlAttribute("id", htmlNode.id);
        }
        if (htmlNode.className) {
            this._appendHtmlAttribute("class", htmlNode.className);
        }
        for (i = 0, len = htmlNode.attributes.length; i < len; i++) {
            var attribute = htmlNode.attributes[i];
            if (attribute.name !== "id" && attribute.name !== "class") {
                this._appendHtmlAttribute(attribute.name, attribute.value);
            }
        }

        createElement("span", "debugConsoleHtmlBracket", ">", this.html);
    }
}
HtmlTreeView.prototype.createChild = function (index) {
    var child = this._displayable[index];
    if (instanceOf(child, CSSRule)) {
        return new CssRuleTreeView(this._displayable[index]);
    } else {
        return new HtmlTreeView(this._displayable[index]);
    }
};
HtmlTreeView.prototype._appendHtmlAttribute = function (attrName, attrValue) {

    createElement("span", null, " ", this.html);
    createElement("span", "debugConsoleHtmlAttrName", attrName, this.html);
    createElement("span", null, "=\"", this.html);
    createElement("span", "debugConsoleHtmlAttrValue", attrValue, this.html);
    createElement("span", null, "\"", this.html);
};

function CssTraceTreeView(element) {

    this._element = element;
    this._matches = [];


    if (element.style.length > 0) {
        this._matches.push(new CssStyleTreeView(element.style, "<inline-styles>", element));
    }

    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
        this._addMatches(sheet.cssRules, element);
    }, this);

    this.label = "trace";
    this.value = this.register = element;
    this.length = this._matches.length;
}
CssTraceTreeView.prototype._addMatches = function (rules, element, prefix) {
    Array.prototype.forEach.call(rules, function (rule) {
        if (rule.type === rule.MEDIA_RULE) {
            var mql = window.matchMedia ? window.matchMedia(rule.media) : window.msMatchMedia(rule.media);
            if (mql.matches) {
                this._addMatches(rule.cssRules, element, (prefix || "") + "@media (" + rule.media + ") ");
            }
        } else if (element.matches ? element.matches(rule.selectorText) : element.msMatchesSelector(rule.selectorText)) {
            this._matches.push(new CssRuleTreeView(rule, element, prefix));
        }
    }, this);
};
CssTraceTreeView.prototype.createChild = function (index) { // They allow to view CSS somehow?
    return this._matches[index];
};

function CssTreeView(sheet) {

    if (sheet.href) {
        this.value = sheet.href;
    } else if (sheet.id) {
        this.value = sheet.id;
    } else if (sheet.title) {
        this.value = sheet.title;
    }

    this.register = this._sheet = sheet;
    this.label = "css";
    this.length = sheet.cssRules.length;
}
CssTreeView.prototype.createChild = function (index) {
    return new CssRuleTreeView(this._sheet.cssRules[index]);
};

function CssRuleTreeView(rule, match, prefix) {

    if (rule.type === rule.STYLE_RULE) {
        var styleTree = this._styleTree = new CssStyleTreeView(rule.style, rule.selectorText, match);
        this.value = (prefix || "") + styleTree.value;
        this.label = match ? "match" : "rule";
        this.length = styleTree.length;
    } else if (rule.type === rule.IMPORT_RULE) {
        this.label = "@import";
        this.value = rule.href;
        this.length = rule.styleSheet.cssRules.length;
    } else if (rule.type === rule.MEDIA_RULE) {
        this.label = "@media";
        this.value = rule.media;
        this.length = rule.cssRules.length;
    } else {
        this.label = "rule";
        this.value = rule.cssText;
        this.length = 0;
    }

    this._rule = this.register = rule;
    this._match = match;
}
CssRuleTreeView.prototype.createChild = function (index) {
    var styleTree = this._styleTree;
    if (styleTree) {
        return styleTree.createChild(index);
    }

    var rule = this._rule;
    if (rule.type === rule.IMPORT_RULE) {
        return new CssRuleTreeView(rule.styleSheet.cssRules[index], this._match);
    }
    if (rule.type === rule.MEDIA_RULE) {
        return new CssRuleTreeView(rule.cssRules[index], this._match);
    }

    return null;
};

function CssStyleTreeView(style, value, match) {

    this._style = this.register = style;
    this._match = match;
    this.label = "style";
    this.value = value;

    this._children = [];
    for (var i = 0, len = style.length; i < len; i++) {
        if (this.cssIgnoreName[style[i]] === undefined) {
            var parts = style[i].split("-");
            if (/^-ms-/.test(style[i])) {
                parts.splice(0, 3, "-ms-" + parts[2]);
            }
            this._insertChild(parts);
        }
    }

    this.length = this._children.length;
}
CssStyleTreeView.prototype._insertChild = function (parts) {
    for (var i = 0, len = this._children.length; i < len; i++) {
        if (this._children[i].insert(parts)) {
            return;
        }
    }
    this._children.push(new CssPropertyTreeView(this._style, null, parts, this._match));
};
CssStyleTreeView.prototype.createChild = function (index) {
    return this._children[index].getLeaf();
};

CssStyleTreeView.prototype.cssIgnoreName = {};
CssStyleTreeView.prototype.cssIgnoreName["-ms-text-size-adjust"] = true;

function CssPropertyTreeView(style, base, remaining, match) {


    this._style = style;
    this._match = match;

    this.part = remaining.splice(0, 1)[0];
    this.label = base ? base + "-" + this.part : this.part;

    this._children = [];
    if (remaining.length > 0) {
        this._children.push(new CssPropertyTreeView(style, this.label, remaining, match));
    }


    var indexer = this.cssFixedName[this.label];
    if (!indexer) {

        indexer = this.label.replace(/^-ms/, "ms");
        indexer = indexer.replace(/-\w/g, function (m) { return m[1].toUpperCase(); });
    }

    this.value = this._style[indexer];
    if (this.value === undefined) {

        indexer = indexer.replace(/^ms\w/, function (m) { return m[2].toLowerCase(); });
        this.value = this._style[indexer];
    }

    if (this.value !== undefined) {
        this.register = this.value;
        if (this._match && this._match.currentStyle && !areCssValuesEqual(this.value, this._match.currentStyle[indexer])) {

            this.html = createElement("span", "debugConsoleCssOverriden", null);
            createElement("span", "debugConsoleOutputText", this.value, this.html);
        }
    }
}
CssPropertyTreeView.prototype.createChild = function (index) {
    return this._children[index].getLeaf();
};
Object.defineProperty(CssPropertyTreeView.prototype, "length", { get: function () {
    return this._children.length;
}});
CssPropertyTreeView.prototype.insert = function (parts) {
    if (this.part === parts[0]) {
        parts.splice(0, 1);
        if (parts.length > 0) {
            for (var i = 0, len = this._children.length; i < len; i++) {
                if (this._children[i].insert(parts)) {
                    return true;
                }
            }
            this._children.push(new CssPropertyTreeView(this._style, this.label, parts, this._match));
        }
        return true;
    } else {
        return false;
    }
};
CssPropertyTreeView.prototype.getLeaf = function () {
    if (this._children.length === 1) {
        return this._children[0].getLeaf();
    } else {
        return this;
    }
};
CssPropertyTreeView.prototype.cssFixedName = {
    "-ms-scrollbar-3dlight-color": "scrollbar3dLightColor",
    "scrollbar-3dlight-color": "scrollbar3dLightColor",
    "-ms-scrollbar-darkshadow-color": "scrollbarDarkShadowColor",
    "scrollbar-darkshadow-color": "scrollbarDarkShadowColor",
    "-ms-transform-origin-x": "msTransformOrigin",
    "-ms-transform-origin-y": "msTransformOrigin"
};

function ElementEvents(callback, context) {


    var domEvents = {}, body = document.body, selection = body, border = 2,
        root = createElement("div", "debugConsoleRoot", null, body),
        overlayLeft = createElement("div", "debugConsoleVerticalOverlay", null, root).style,
        overlayRight = createElement("div", "debugConsoleVerticalOverlay", null, root).style,
        overlayTop = createElement("div", "debugConsoleHorizontalOverlay", null, root).style,
        overlayBottom = createElement("div", "debugConsoleHorizontalOverlay", null, root).style;
    overlayLeft.width = overlayRight.width = overlayTop.height = overlayBottom.height = String(border) + "px";

    function restoreConsole() {
        for (var evName in domEvents) {
            document.removeEventListener(evName, domEvents[evName], true);
        }
        body.removeChild(root);
        callback.call(context, selection);
    }

    function positionOverlay() {
        var rect = selection.getBoundingClientRect(),
            offsetLeft = rect.left + body.scrollLeft - body.clientLeft,
            offsetTop = rect.top + body.scrollTop - body.clientTop,
            selectionWidth = selection.offsetWidth,
            selectionHeight = selection.offsetHeight;

        overlayLeft.left = overlayTop.left = overlayBottom.left = String(offsetLeft) + "px";
        overlayRight.left = String(offsetLeft + selectionWidth - border) + "px";
        overlayLeft.top = overlayRight.top = overlayTop.top = String(offsetTop) + "px";
        overlayBottom.top = String(offsetTop + selectionHeight - border) + "px";
        overlayLeft.height = overlayRight.height = String(selectionHeight) + "px";
        overlayTop.width = overlayBottom.width = String(selectionWidth) + "px";
    }

    domEvents.mousemove = function (ev) {
        var target = document.elementFromPoint(ev.clientX, ev.clientY);
        if (/^debugConsole/.test(target.className)) {
            return;
        }
        if (target !== selection) {
            selection = target;
            positionOverlay();
        }
    };
    domEvents.click = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        restoreConsole();
    };
    domEvents.keydown = function (ev) {
        if (ev.keyCode === 192 && ev.shiftKey) {

            restoreConsole();
        }
        if (ev.key === "Esc" || ev.key === "Escape") {
            ev.preventDefault();
            ev.stopPropagation();
            selection = null;
            restoreConsole();
        }
    };

    for (var eventName in domEvents) {
        document.addEventListener(eventName, domEvents[eventName], true);
    }


    positionOverlay();
}
DebugJSConsole.prototype.stashHtml = function (element) {

    this._rootElement.style.display = "";
    if (element) {
        this._toggleRegister(element);
        this._appendHTML(element, true);
    }
    this._textInputElement.focus();
};
DebugJSConsole.prototype._selectHtml = function () {
    this._rootElement.style.display = "none";
    new ElementEvents(this.stashHtml, this);
};
DebugJSConsole.prototype.log = function (level, text) {

    var secondsSinceStart = (Date.now() - this._startTime) / 1000;
    var messageStyle;
    switch (level) {
    case "error":
        messageStyle = "debugConsoleErrorText";
        break;
    case "warning":
        messageStyle = "debugConsoleWarningText";
        break;
    default:
        messageStyle = "debugConsoleLogText";
        break;
    }
    this._appendText(messageStyle, "Log@" + secondsSinceStart.toFixed(3) + ": " + text);
};
DebugJSConsole.prototype._isVisible = function () {

    return (this._rootElement.parentNode !== null);
};
DebugJSConsole.prototype._toggleLayerVisibility = function () {

    if (!this._isVisible()) {
        if (this._styleElement.parentNode === null) {
            document.getElementsByTagName("head")[0].appendChild(this._styleElement);
        }
        this._applyPendingOutput();
        document.body.appendChild(this._rootElement);
        this._textInputElement.focus();
    } else {

        document.body.removeChild(this._rootElement);
        clearTimeout(this._pendingOutputTimer);
        this._pendingOutputTimer = null;
    }
};
DebugJSConsole.prototype._catchErrors = function () {

    var that = this;
    window.onerror = function (msg, file, line) {
        that._appendText("debugConsoleExceptionText", "Unhandled exception: " + msg + "\n  file: " + file + "\n  line: " + line);
        return false;
    };
};
DebugJSConsole.prototype._loadCommandHistory = function () {

    this._commandHistory = DebugJS.getCookie("consoleCommandHistory", []);
};
DebugJSConsole.prototype._saveCommandHistory = function () {

    DebugJS.setCookie("consoleCommandHistory", this._commandHistory);
};
DebugJSConsole.prototype._setCommand = function (value) {

    if (this._isSingleLineMode()) {
        value = toSingleLine(value);
    } else if (this._commandHistoryPosition >= 0 && this._commandHistoryPosition < this._commandHistory.length &&
            toSingleLine(this._textInputElement.value) === toSingleLine(this._commandHistory[this._commandHistoryPosition])) {
        value = this._commandHistory[this._commandHistoryPosition];
    }
    this._textInputElement.value = value;
};
DebugJSConsole.prototype._isSingleLineMode = function () {

    return (this._textInputElement.className.split(" ").indexOf("debugConsoleSingleLine") !== -1);
};
DebugJSConsole.prototype._setSafety = function (enableSafety) {

    this._safety = enableSafety;
    this._appendText("debugConsoleOutputText", "Safety " + (enableSafety ? "enabled" : "disabled"));
};
DebugJSConsole.prototype._stash = function (value) {

    this._registers[0] = value;
};
DebugJSConsole.prototype._toggleRegister = function (value) {



    for (var i = 1, len = this._registers.length; i < len; i++) {
        if (this._registers[i] === value) {
            delete this._registers[i];
            this._updateRegisterElements(value, "");
            return;
        }
    }


    for (i = 1, len = this._registers.length; i < len; i++) {
        if (this._registers[i] === undefined) {
            break;
        }
    }
    this._registers[i] = value;
    this._updateRegisterElements(value, "$" + i.toString());
};
DebugJSConsole.prototype._getRegisterName = function (value) {

    var registerName = "";
    if (value !== undefined) {
        var registerIndex = this._registers.indexOf(value, 1);
        if (registerIndex !== -1) {
            registerName = "$" + registerIndex.toString();
        }
    }
    return registerName;
};
DebugJSConsole.prototype._updateRegisterElements = function (value, registerName) {

    var registerElements = document.querySelectorAll(".debugConsoleRegister");
    for (var i = 0, len = registerElements.length; i < len; i++) {
        registerElements[i].onRegisterChange(value, registerName);
    }
};
DebugJSConsole.prototype._loadScriptFile = function (path) {
    var scriptElement = document.createElement("script");
    var that = this;
    scriptElement.onload = function () {
        that._appendText("debugConsoleOutputText", "Script file loaded: " + path);
    };
    scriptElement.onerror = function () {
        that._appendText("debugConsoleErrorText", "Error loading script file: " + path);
    };
    scriptElement.type = "text/javascript";
    scriptElement.src = path;
    document.getElementsByTagName("head")[0].appendChild(scriptElement);
};
DebugJSConsole.prototype._getCommands = function () {

    return new ConsoleCommands(this, this._registers);
};
DebugJSConsole.prototype._startTime = Date.now();
DebugJSConsole.prototype._styleElement = null;
DebugJSConsole.prototype._rootElement = null;
DebugJSConsole.prototype._layerElement = null;
DebugJSConsole.prototype._outputElement = null;
DebugJSConsole.prototype._textInputElement = null;
DebugJSConsole.prototype._textInputFlipElement = null;
DebugJSConsole.prototype._commandHistory = null;
DebugJSConsole.prototype._commandHistoryPosition = -1;
DebugJSConsole.prototype._safety = true;

function ConsoleCommands(debugConsole, registers) {


    this._console = debugConsole;
    for (var i = 0, len = registers.length; i < len; i++) {
        Object.defineProperty(this, "$" + i.toString(), { value: registers[i] });
    }
}
ConsoleCommands.prototype.clip = function (text) {
    window.clipboardData.setData("Text", text);
};
ConsoleCommands.prototype.dump = function (data, label) {
    if (data !== undefined || label !== undefined) {
        this._console._appendData(label, data, true);
    }
};
ConsoleCommands.prototype.log = function (data) {
    if (data !== undefined) {
        this._console._appendData(null, data, true);
    }
};
ConsoleCommands.prototype.html = function (data) {
    if (data === undefined) {
        data = document.documentElement;
    }
    if (instanceOf(data, Node)) {
        this._console._appendHTML(data, true);
    } else {
        this.err("Not an HTML node");
    }
};
ConsoleCommands.prototype.css = function (data) {
    if (instanceOf(data, HTMLElement)) {
        this._console._appendCSS(data);
    } else if (instanceOf(data, CSSStyleDeclaration)) {
        this._console._appendStyle(data, true);
    } else if (instanceOf(data, CSSRule)) {
        this._console._appendRule(data, true);
    } else if (instanceOf(data, CSSStyleSheet)) {
        this._console._appendSheet(data, true);
    } else if (data === undefined) {
        Array.prototype.forEach.call(document.styleSheets, function (sheet) {
            if (sheet.id !== "debugConsoleStyles") {
                this._console._appendSheet(sheet, false);
            }
        }, this);
    } else {
        this.err("Not a valid object type");
    }
};
ConsoleCommands.prototype.err = function (msg) {
    this._console._appendText("debugConsoleErrorText", msg);
};
ConsoleCommands.prototype.load = function (path) {
    this._console._loadScriptFile(path);
};
ConsoleCommands.prototype.hook = function (source, eventName) {
    var that = this;
    function listener() {
        that.dump({source: source, eventName: eventName, args: arguments }, "Event fired");
    }
    if (source) {
        if (source.addEventListener !== undefined) {
            source.addEventListener(eventName, listener, false);
        } else if (source.addListener !== undefined) {
            source.addListener(eventName, listener);
        } else if (source.on !== undefined) {
            source.on(eventName, listener);
        }
    }
};
ConsoleCommands.prototype.promise = function (p) {

    var that = this;
    p.then(
        function () { that.dump({ promise: p, args: arguments }, "Promise complete"); },
        function () { that.dump({ promise: p, args: arguments }, "Promise error"); },
        function () { that.dump({ promise: p, args: arguments }, "Promise progress"); }
    );
};
ConsoleCommands.prototype.safety = function (enableSafety) {
    this._console._setSafety(enableSafety);
};

/* Commands right here! */
Object.defineProperty(ConsoleCommands.prototype, "cls", { get: function () {
    this._console._clearOutput();
}});
Object.defineProperty(ConsoleCommands.prototype, "select", { get: function () {
    this._console._selectHtml();
}});
Object.defineProperty(ConsoleCommands.prototype, "help", { get: function () {
    this._console._appendText(
    "debugConsoleOutputText",
        "The console command-line accepts any javascript code and dumps the result.\n" +
        "Built-in commands:\n" +
        "    cls - clears the output area\n" +
        "    log(string) - outputs a string\n" +
        "    clip(string) - copies the string to the clipboard\n" +
        "    dump(obj [, label]) - dumps an object with an optional label\n" +
        "    html([node]) - dumps the HTML tree, optionally rooted to a specific node\n" +
        "    select - stash an HTML element by selecting it in the actual UI\n" +
        "    css([element|sheet|rule|style]) - dumps CSS, optionally matching a provided object\n" +
        "    hook(obj, event) - hooks an event on an object and dumps when it fires\n" +
        "    promise(p) - listens to the complete/error/progress events on a promise\n" +
        "    load(string) - loads the specified javascript file\n" +
        "    safety(bool) - enables/disables catching errors thrown from console evaluation\n" +
        "\n" +
        "You can click the > next to the input area to toggle between single-line and multi-line input modes. The console supports a persistent command history, use the arrow keys (or Ctrl+arrow keys in multi-line mode) to repeat past commands.\n" +
        "\n" +
        "The result of the last evaluation is stored in a stash register.  You can access with the $0 symbol. Clicking on any value in the output will store that value into a numbered register, like $1 or $2. All of these registers can be used anywhere in an expression.  Note that a register is a value, not an alias to a property.  If the property that the register was created from changes, the register will not.\n" +
        "\n" +
        "In depth usage instructions can be found at http://codebox/jsconsole"
);
}});
ConsoleCommands.prototype.stash = function (value) {
    this._console._stash(value);
    return value;
};

function getProperties(data, own, excluded) {

    var props = [];
    if (data) {

        var hasProps = false;
        if (typeof data === "function") {
            hasProps = true;
            Array.prototype.push.apply(excluded, Object.getOwnPropertyNames(Function));
        } else if (typeof data === "object") {
            hasProps = true;
        }

        if (hasProps) {
            var proto = data;
            do {
                if (proto === Object.prototype || proto === Array.prototype || proto === Function.prototype) {
                    break;
                }
                var prototypeProperties;
                try {
                    prototypeProperties = Object.getOwnPropertyNames(proto);
                } catch (ex) {
                    break;
                }
                for (var i = 0, len = prototypeProperties.length; i < len; i++) {
                    var propertyName = prototypeProperties[i];
                    if (props.indexOf(propertyName) === -1 &&
                        excluded.indexOf(propertyName) === -1 &&
                        propertyName !== "constructor") {
                        props.push(propertyName);
                    }
                }
                proto = Object.getPrototypeOf(proto);
            } while (!own && proto);
        }
    }
    return props;
}

function isEmpty(data, excluded) {

    var empty = getProperties(data, false, excluded).length === 0;
    if (typeof data === "function") {
        empty = empty && isEmpty(data.prototype, []);
    }
    return empty;
}

var constructorCache = [];
function getConstructorName(constructorFunction) {


    var constructorName;


    var cached = false;
    var len = constructorCache.length;
    for (var i = 0; i < len; ++i) {
        if (constructorCache[i].fn === constructorFunction) {
            cached = true;
            constructorName = constructorCache[i].name;
            break;
        }
    }

    if (!cached) {

        constructorName = DebugJS.scanTypes(function (testConstructorFunction, testConstructorName) {
            if (testConstructorFunction === constructorFunction) {
                return testConstructorName;
            }
        });


        if (!constructorName) {
            var code = constructorFunction.toString();
            if (code.substr(0, 9) === "function ") {
                var parenthesisIndex = code.indexOf("(");
                if (parenthesisIndex !== -1) {
                    var possibleName = code.substr(9, parenthesisIndex - 9).trim();
                    if (possibleName.match(/^[\w$]+$/) !== null) {
                        constructorName = possibleName;
                    }
                }
            }
        }

        constructorCache.push({ fn: constructorFunction, name: constructorName });
    }

    return constructorName;
}

function toSingleLine(value) {

    return value.replace(/(\/\/[^\r\n]*)|(\/\*(.|[\r\n])*\*\/)/g, "$2").replace(/\s*[\r\n]\s*/g, " ");
}

function valueToString(data, isRecursive) {

    var string = "{...}";
    try {
        switch (typeof data) {
        case "undefined":
        case "string":
            string = JSON.stringify(data);
            break;
        case "number":
        case "boolean":
            string = data.toString();
            break;
        default:
            if (data === null) {
                string = "null";
            } else {
                if (Array.isArray(data)) {
                    string = "length=" + data.length.toString();
                    if (data.length < 20 && !isRecursive) {
                        string += " [" + data.map(function (item) { return valueToString(item, true); }).join(", ") + "]";
                    }
                } else {
                    if (data.toString) {
                        string = data.toString();
                    } else {
                        string = "" + data;
                    }
                }

                if (string === "[object Object]") {
                    var constructorName = getConstructorName(data.constructor);
                    if (constructorName) {
                        string = "[object " + constructorName + "]";
                    }
                }


                if (data.name) {
                    string = string + " " + data.name;
                }
                if (data._debugObjectName) {
                    string = string + " " + data._debugObjectName;
                }
                if (data.id) {
                    string = string + " #" + data.id;
                }
                if (data.className) {
                    string = string + " " + data.className.trim().split(/\s+/).map(function (className) { return "." + className; }).join(" ");
                }
                if (data.objectId) {
                    string = string + " " + data.objectId;
                }
            }
            break;
        }
    } catch (ex) { }
    return string;
}

function instanceOf(obj, proto) {
    return obj instanceof proto;


}

function isDisplayableHtmlNode(node) {

    switch (node.nodeType) {
    case Node.TEXT_NODE:
    case Node.COMMENT_NODE:
        var textNode = node;
        return textNode.textContent.trim().length > 0;
    }
    return true;
}

function createElement(nodeType, className, innerText, parentElement) {

    var element = document.createElement(nodeType);
    if (className) {
        element.className = className;
    }

    if (innerText) {
        element.innerText = innerText;
    }
    if (parentElement) {
        parentElement.appendChild(element);
    }
    return element;
}

function areCssValuesEqual(valueA, valueB) {



    if ((valueA + "").trim() === (valueB + "").trim()) {
        return true;
    }


    var aAsNumber = Number(valueA);
    var bAsNumber = Number(valueB);
    return aAsNumber !== null && !isNaN(aAsNumber) && aAsNumber === bAsNumber;
}

DebugJS.getCookie = function (valueName, defaultValue) {

    var result = defaultValue;
    try {
        document.cookie.split(";").forEach(function (cookie) {

            var split = cookie.split("=");
            var cookieName = split[0].trim();
            if (cookieName === valueName) {
                result = JSON.parse(unescape(split[1]));
            }
        });
    } catch (ex) { }
    return result;
};
DebugJS.setCookie = function (valueName, value) {

    var date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    document.cookie = valueName + "=" + escape(JSON.stringify(value)) + "; expires=" + date.toUTCString();
};
DebugJS.scanTypes = function (fn, namespace, namespaceName, alreadyChecked, depth) {

    DebugJS.scanningTypes++;
    try {
        namespace = namespace || window;
        namespaceName = namespaceName || "";
        alreadyChecked = alreadyChecked || [ window.Windows, window.Microsoft ];
        depth = depth || 0;

        if (depth < 10 && alreadyChecked.length < 1000) {
            for (var field in namespace) {
                if ((field[0] >= "A" && field[0] <= "Z") || field[0] === "$") {
                    try {
                        var objectToCheck = namespace[field];
                        var isNamespace = typeof objectToCheck === "object" && objectToCheck !== null && objectToCheck.constructor === Object;
                        var isFunction = typeof objectToCheck === "function" && objectToCheck !== Function;
                        if ((isNamespace || isFunction) && alreadyChecked.indexOf(objectToCheck) === -1) {
                            alreadyChecked.push(objectToCheck);

                            var objectName = (namespaceName ? namespaceName + "." : "") + field;
                            var result;

                            if (isFunction) {

                                result = fn(objectToCheck, objectName, namespace, field);
                            }
                            if (!result) {

                                result = DebugJS.scanTypes(fn, objectToCheck, objectName, alreadyChecked, depth + 1);
                            }

                            if (result) {
                                return result;
                            }
                        }
                    } catch (ex) {

                    }
                }
            }
        }
    } finally {
        DebugJS.scanningTypes--;
    }
};

// Wowies, this is horrible...
DebugJSConsole.CSS =
    ".debugConsoleRoot {" +
        "width:0;" +
        "height:0;" +
        "direction: ltr;" +
        "-ms-user-select: element;" +
        "cursor: text; " +
    "}" +
    "#debugConsoleBackground {" +
        "text-overflow:clip;" +
        "position:fixed;" +
        "top:0;" +
        "left:0;" +
        "width:100%;" +
        "height:100%;" +
        "z-index:2000;" +
        "background-color:rgba(0,0,0,0.8);" +
        "overflow:hidden;" +
    "}" +
    "#debugConsoleLayer {" +
        "width:98%;" +
        "height:100%;" +
        "padding:0 1%;" +
        "color:white;" +
        "font-family:'Segoe UI', 'Segoe UI Symbol';" +
        "font-size:10pt;" +
        "overflow-x:hidden;" +
        "overflow-y:scroll;" +
    "}" +
    "#debugConsoleOutput {" +
        "width:100%;" +
        "overflow-x: hidden;" +
        "white-space: nowrap;" +
    "}" +
    "#debugConsole div {" +
        "width:100%;" +
        "overflow:hidden;" +
    "}" +
    ".debugConsoleVerticalOverlay {" +
        "background-color:blue;" +
        "position:absolute;" +
        "z-index:100000;" +
    "}" +
    ".debugConsoleHorizontalOverlay {" +
        "background-color:blue;" +
        "position:absolute;" +
        "z-index:100000;" +
    "}" +
    ".debugConsoleLogText {" +
        "color:lightgreen;" +
        "font-style:italic;" +
    "}" +
    ".debugConsoleExceptionText {" +
        "color:red;" +
        "font-weight:bold;" +
    "}" +
    ".debugConsoleOutputText {" +
        "color:rgba(200,200,200,1);" +
    "}" +
    ".debugConsoleErrorText {" +
        "color:red;" +
    "}" +
    ".debugConsoleWarningText {" +
        "color:yellow;" +
    "}" +
    ".debugConsolePropertyExpander { " +
        "cursor:pointer;" +
        "margin-right:5px;" +
        "font-family:Consolas;" +
    "}" +
    ".debugConsolePropertyName {" +
        "color:rgba(200,100,200,1);" +
    "}" +
    ".debugConsoleObjectProperties {" +
        "margin-left:15px;" +
    "}" +
    "#debugConsoleInput {" +
        "font-family:inherit;" +
        "font-size:inherit;" +
        "border:none;" +
        "width:95%;" +
        "color:inherit;" +
        "padding:0px;" +
        "margin:0px;" +
    "}" +
    "#debugConsoleInput.debugConsoleSingleLine {" +
        "height: 1.5em;" +
        "overflow: hidden;" +
        "background:none;" +
    "}" +
    "#debugConsoleInput.debugConsoleMultiLine {" +
        "height: 10em;" +
        "overflow: auto;" +
        "background-color: rgba(0,0,0,0.4);" +
    "}" +
    "#debugConsoleInputFlip { " +
        "vertical-align:top;" +
        "cursor:pointer;" +
    "}" +
    ".debugConsoleRegister {" +
        "margin-left:5px;" +
        "color:cyan;" +
        "text-decoration:none;" +
    "}" +
    ".debugConsoleHtmlComment {" +
        "color:#d0d090;" +
        "font-style:italic;" +
    "}" +
    ".debugConsoleHtmlAttrName {" +
        "color:#b0d0f0;" +
    "}" +
    ".debugConsoleHtmlAttrValue {" +
        "color:#80c0e0;" +
    "}" +
    ".debugConsoleHtmlBracket {" +
        "color:#f0c0f0;" +
    "}" +
    ".debugConsoleHtmlText {" +
        "color:#d0d0d0;" +
        "font-style:italic;" +
    "}" +
    ".debugConsoleCssOverriden {" +
        "color:red;" +
        "text-decoration:line-through;" +
    "}" +
    "@media screen and (max-width:340px) {" +
        "#debugConsoleLayer {" +
            "font-size: 8pt" +
        "}" +
    "}";

DebugJS.console = new DebugJSConsole();

