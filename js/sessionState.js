//
// Copyright (C) Microsoft. All rights reserved.
//
/// <disable>JS2085.EnableStrictMode</disable>
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var SessionState;
    (function (SessionState) {
        class Container {
            static getAppContainer() {
                var appContainer;
                var cxid = CloudExperienceHost.getCurrentNode().cxid;
                if (Container._container.hasOwnProperty(cxid)) {
                    appContainer = Container._container[cxid];
                }
                else {
                    appContainer = new Object;
                    Container._container[cxid] = appContainer;
                }
                return appContainer;
            }
        }
        Container._container = new Object;
        function addItem(name, value) {
            Container.getAppContainer()[name] = value;
        }
        SessionState.addItem = addItem;
        function getItem(name) {
            return Container.getAppContainer()[name];
        }
        SessionState.getItem = getItem;
    })(SessionState = CloudExperienceHost.SessionState || (CloudExperienceHost.SessionState = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=sessionState.js.map