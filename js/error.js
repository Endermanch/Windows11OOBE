//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    class ErrorNames {
    }
    ErrorNames.Unexpected = "Unexpected";
    ErrorNames.InvalidExperience = "InvalidExperience";
    ErrorNames.CannotConnect = "CannotConnect";
    ErrorNames.Timeout = "Timeout";
    ErrorNames.InvalidArgument = "InvalidArgument";
    ErrorNames.ActivationNotSupported = "ActivationNotSupported";
    ErrorNames.NodeNotFound = "NodeNotFound";
    CloudExperienceHost.ErrorNames = ErrorNames;
    class InvalidExperienceError {
        constructor(message) {
            this.name = ErrorNames.InvalidExperience;
            this.message = message;
        }
    }
    CloudExperienceHost.InvalidExperienceError = InvalidExperienceError;
    class InvalidArgumentError {
        constructor(message) {
            this.name = ErrorNames.InvalidArgument;
            this.message = message;
        }
    }
    CloudExperienceHost.InvalidArgumentError = InvalidArgumentError;
    class NodeNotFoundError {
        constructor(message) {
            this.name = ErrorNames.NodeNotFound;
            this.message = message;
        }
    }
    CloudExperienceHost.NodeNotFoundError = NodeNotFoundError;
    class NavigationError {
        constructor(status, uri, node, message) {
            this.status = status;
            this.message = message;
            this.uri = uri;
            this.name = this._getName();
            this.node = node;
        }
        _getName() {
            var name;
            switch (this.status) {
                case Windows.Web.WebErrorStatus.cannotConnect: // FALLTHROUGH
                case Windows.Web.WebErrorStatus.serverUnreachable: // FALLTHROUGH
                case Windows.Web.WebErrorStatus.notFound: // FALLTHROUGH
                case Windows.Web.WebErrorStatus.serviceUnavailable:
                    name = ErrorNames.CannotConnect;
                    break;
                case Windows.Web.WebErrorStatus.timeout: // FALLTHROUGH
                case Windows.Web.WebErrorStatus.requestTimeout:
                    name = ErrorNames.Timeout;
                    break;
                default:
                    name = ErrorNames.Unexpected;
                    break;
            }
            return name;
        }
    }
    CloudExperienceHost.NavigationError = NavigationError;
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=error.js.map