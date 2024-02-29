//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
/// <reference path="error.ts" />
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    class XboxTcuiContext {
        constructor(context) {
            this._context = context;
        }
        reportCompleted(valueSet) {
            this._context.asyncOperation.complete(valueSet);
        }
    }
    CloudExperienceHost.XboxTcuiContext = XboxTcuiContext;
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=xboxTcuiContext.js.map