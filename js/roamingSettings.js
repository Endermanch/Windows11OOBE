

"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var RoamingSettings;
    (function (RoamingSettings) {
        function _ensureSyncSettingsProvider() {
            var syncSettingsProvider = CloudExperienceHost.Storage.PrivateData.getItem("syncSettingsProvider");
            if ((syncSettingsProvider === null) || (syncSettingsProvider === undefined)) {
                syncSettingsProvider = new CloudExperienceHostAPI.SyncSettings.SyncSettingsProvider();
                CloudExperienceHost.Storage.PrivateData.addItem("syncSettingsProvider", syncSettingsProvider);
            }
            return syncSettingsProvider;
        }
        function _findSetting(settingId) {
            return _ensureSyncSettingsProvider().findSetting(settingId);
        }
        
        function localizedStrings() {
            
            var roamingSettingsResources = {};
            var keyList = [
                'Title',
                'LeadText',
                'nextButton'
            ];
            var i = 0;
            for (i = 0; i < keyList.length; i++) {
                var resourceId = '/roamingSettings/' + keyList[i];
                roamingSettingsResources[keyList[i]] = WinJS.Resources.getString(resourceId).value;
            }
            return JSON.stringify(roamingSettingsResources);
        }
        RoamingSettings.localizedStrings = localizedStrings;
        
        function getSettingDescription(settingId) {
            return _findSetting(settingId).description;
        }
        RoamingSettings.getSettingDescription = getSettingDescription;
        
        function getSettingValue(settingId) {
            return _findSetting(settingId).getValue("Value");
        }
        RoamingSettings.getSettingValue = getSettingValue;
        
        function setSettingValue(settingId, value) {
            return _findSetting(settingId).setValue("Value", value);
        }
        RoamingSettings.setSettingValue = setSettingValue;
        
        function getSettingProperty(settingId, propertyId) {
            return _findSetting(settingId).getProperty(propertyId);
        }
        RoamingSettings.getSettingProperty = getSettingProperty;
        
        function getSettingIsEnabled(settingId) {
            return _findSetting(settingId).isEnabled;
        }
        RoamingSettings.getSettingIsEnabled = getSettingIsEnabled;
        function initializeDisambiguationPage() {
            _ensureSyncSettingsProvider().initDisambiguationPage();
        }
        RoamingSettings.initializeDisambiguationPage = initializeDisambiguationPage;
        function getSomeGroupPolicyBlockedMessage() {
            return _ensureSyncSettingsProvider().someGroupPolicyBlockedMessage;
        }
        RoamingSettings.getSomeGroupPolicyBlockedMessage = getSomeGroupPolicyBlockedMessage;
        function initializeOptInPage() {
            return _ensureSyncSettingsProvider().initOptInPage();
        }
        RoamingSettings.initializeOptInPage = initializeOptInPage;
        function uninitialize() {
            CloudExperienceHost.Storage.PrivateData.addItem("syncSettingsProvider", null);
        }
        RoamingSettings.uninitialize = uninitialize;
    })(CloudExperienceHost.RoamingSettings || (CloudExperienceHost.RoamingSettings = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
