
(function () {
    "use strict";

    var bridge = new CloudExperienceHost.Bridge();
    var resources;

    WinJS.UI.Pages.define("/RetailDemo/retailDemoMsaInclusive.html", {
        init: function (element, options) {
            require.config(new RequirePathConfig('/webapps/inclusiveOobe'));
            var pagePromise = new WinJS.Promise(function (completeDispatch, errorDispatch, progressDispatch) {
                bridge.invoke("CloudExperienceHost.StringResources.getRetailDemoStrings").done(function (result) {
                    resources = JSON.parse(result);
                    completeDispatch();
                }, errorDispatch, progressDispatch);
            });
            var cssPromise = uiHelpers.LoadCssPromise(document.head, "..", bridge);
            var languagePromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getPreferredLang").then(function (preferredLang) {
                _rdxHtmlRoot.setAttribute("lang", preferredLang);
            }, function () { });
            var dirPromise = bridge.invoke("CloudExperienceHost.Globalization.Language.getReadingDirection").then(function (dirVal) {
                _rdxHtmlRoot.setAttribute("dir", dirVal);
            }, function () { });
            return WinJS.Promise.join({ pagePromise: pagePromise, cssPromise: cssPromise, languagePromise: languagePromise, dirPromise: dirPromise });
        },

        ready: function (element, options) {
            
            document.title = resources.rdxTitle;
            msaTitle.textContent = resources.msaTitle;
            msaText.textContent = resources.msaText;
            signInLink.textContent = resources.signInLink;
            finishButton.textContent = resources.finishButton;

            bridge.invoke("CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled", "RDX_OOBE_Keyboard_Focus_Accessibility").done(function (result) {
                if (result) {
                    signInLink.setAttribute("href", "#");
                }
            });

            bridge.invoke("CloudExperienceHost.FeatureStaging.isOobeFeatureEnabled", "RDX_OOBE_Link_Hover_Accessibility").done(function (result) {
                if (result) {
                    signInLink.className += " button_secondary";
                }
            });
            
            
            signInLink.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.cancel);
            });

            
            finishButton.addEventListener("click", function (eventInfo) {
                eventInfo.preventDefault();
                bridge.fireEvent(CloudExperienceHost.Events.done, CloudExperienceHost.AppResult.success);
            });
        }
    });
})();
