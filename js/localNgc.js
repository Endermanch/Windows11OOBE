

"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var LocalNgc;
    (function (LocalNgc) {
        function createLocalPinAsync() {
            return new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                var localNgc = new CloudExperienceHostBroker.LocalNgc.LocalNgcManager();
                localNgc.createLocalPinAsync().done(function () { completeDispatch(); }, function (err) { errorDispatch(err); }, function (progress) { progressDispatch(progress); });
            });
        }
        LocalNgc.createLocalPinAsync = createLocalPinAsync;
    })(CloudExperienceHost.LocalNgc || (CloudExperienceHost.LocalNgc = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));