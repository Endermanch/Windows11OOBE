

"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var FamilyAPI;
    (function (FamilyAPI) {
        function createLocalMemberWithEmail(email, isChild, isPending) {
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var extension = new MicrosoftAccount.UserOperations.Extension();
                extension.findConnectedAccountSidAsync(email)
                    .then(function (sid) {
                    
                    var familyLocalMember = new Family.Cache.LocalMember(sid);
                    
                    if (isChild) {
                        familyLocalMember.role = Family.Cache.LocalMemberRole.child;
                    }
                    else {
                        familyLocalMember.role = Family.Cache.LocalMemberRole.parent;
                    }
                    
                    familyLocalMember.matchLevel = Family.Cache.LocalAccountMatchLevel.alias;
                    
                    familyLocalMember.isPending = isPending;
                    
                    var familyLocalMemberStoreBroker = new Family.Cache.LocalMemberStoreBroker();
                    familyLocalMemberStoreBroker.addOrUpdateLocalMember(familyLocalMember);
                    completeDispatch();
                }, errorDispatch);
            });
        }
        FamilyAPI.createLocalMemberWithEmail = createLocalMemberWithEmail;
    })(FamilyAPI = CloudExperienceHost.FamilyAPI || (CloudExperienceHost.FamilyAPI = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=family.js.map