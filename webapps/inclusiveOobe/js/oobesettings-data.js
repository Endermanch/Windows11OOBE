//
// Copyright (C) Microsoft. All rights reserved.
//
define(["lib/knockout", 'legacy/bridge', 'legacy/events', 'legacy/core', 'corejs/knockouthelpers'], (ko, bridge, constants, core, KoHelpers) => {
    class OobeSettingsData {
        // Takes in a list of settings and commits them, then logs associated telemetry and completes the webapp
        commitSettings(settings, privacyConsentPresentationVersion) {
            try {
                // Show the progress ring while committing async.
                bridge.fireEvent(CloudExperienceHost.Events.showProgressWhenPageIsBusy);

                bridge.invoke("CloudExperienceHost.UserManager.getUserId").then((userId) => {
                    let userObj = null;
                    if (userId) {
                        userObj = Windows.System.User.getFromId(userId);
                    }
                    this.commitSettingsForUser(userObj, settings, privacyConsentPresentationVersion);
                }, (err) => {
                    this.commitSettingsForUser(null, settings, privacyConsentPresentationVersion);
                });
            }
            catch (err) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommitSettingsFailure", core.GetJsonFromError(err));
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            }
        }

        commitSettingsForUser(userObj, settings, privacyConsentPresentationVersion) {
            CloudExperienceHostAPI.OobeSettingsStaticsCore.commitSettingsAsyncForUser(userObj, settings, privacyConsentPresentationVersion).done(function () {
                for (let setting of settings) {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", setting.canonicalName, setting.value);
                }
                bridge.fireEvent(constants.Events.done, constants.AppResult.success);
            },
            function (err) {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "CommitSettingsAsyncWorkerFailure", core.GetJsonFromError(err));
                bridge.fireEvent(constants.Events.done, constants.AppResult.error);
            });
        }

        initializeLearnMoreContentAsync() {
            return CloudExperienceHostAPI.OobeSettingsManagerStaticsCore.getLearnMorePlainTextAsync().then((result) => {
                this.learnMoreContent = result;
            });
        }

        getLearnMoreContent() {
            return this.learnMoreContent;
        }

        updateLearnMoreContentForRender(doc, dirVal, isInternetAvailable, errorMessage, targetPersonality, elementToAnchor) {
            let cssOverride = this.getCssOverride(targetPersonality);

            if (cssOverride && (cssOverride !== "")) {
                let fileRef = doc.head.ownerDocument.createElement("link");
                fileRef.setAttribute("rel", "stylesheet");
                fileRef.setAttribute("href", cssOverride);
                if (elementToAnchor) {
                    // If we're overriding CSS and elementToAnchor is provided (e.g. in the Multi-page OOBE privacy settings scenario),
                    // only anchor the Learn More content to that element once the stylesheet has loaded
                    fileRef.onload = function() {
                        doc.location.href = "#" + elementToAnchor;
                    }
                }
                doc.head.appendChild(fileRef);
            }
            else if (elementToAnchor) {
                // If we're not overriding CSS and elementToAnchor is provided, anchor the Learn More content to that element right away
                doc.location.href = "#" + elementToAnchor;
            }

            let privacyLinks = doc.querySelectorAll("a");
            for (let i = 0; i < privacyLinks.length; i++) {
                let link = privacyLinks[i];
                link.onclick = (e) => {
                    this.showLearnMoreContent(doc, e.target.href, dirVal, isInternetAvailable, errorMessage, targetPersonality);
                    e.preventDefault();
                };
            }
        }

        getCssOverride(targetPersonality) {
            if (targetPersonality === CloudExperienceHost.TargetPersonality.InclusiveBlue) {
                return "/webapps/inclusiveOobe/css/inclusive-mseula.css";
            }
            else if (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite) {
                return "/webapps/inclusiveOobe/css/light-iframe-content.css";
            }
            return "";
        }

        showLearnMoreContent(doc, href, dirVal, isInternetAvailable, errorMessage, targetPersonality) {
            let cssOverride = this.getCssOverride(targetPersonality);

            if (isInternetAvailable) {
                // Styling on the local resource html content is managed by applying cssOverride, but the deep-linked server-side Privacy content
                // is statically hosted with its own styles. It is TargetPersonality.InclusiveBlue by default (the initial existing personality)
                // and supports other personalities via QueryString "profile" argument.
                // Profile values must match the server-side value set.
                let personalityQSParam = (targetPersonality === CloudExperienceHost.TargetPersonality.LiteWhite) ? "&profile=transparentLight" : "";
                let url = href + personalityQSParam;
                WinJS.xhr({ url: url }).then((response) => {
                    doc.location.href = url;
                    doc.body.focus();
                }, (error) => {
                    let html = "<html><head>";
                    if (cssOverride && (cssOverride !== "")) {
                        html = html + "<link href=\"" + cssOverride + "\" rel=\"stylesheet\">";
                    }
                    html = html + "</head><body><p>" + errorMessage + "</p></body></html>";
                    KoHelpers.loadIframeContent(doc, { content: html, dir: dirVal });
                });
            }
            else {
                let innerHTML = "<html><head>";
                if (cssOverride && (cssOverride !== "")) {
                    innerHTML = innerHTML + "<link href=\"" + cssOverride + "\" rel=\"stylesheet\">";
                }
                innerHTML = innerHTML + "</head><body><p>" + errorMessage + "</p></body></html>";
                doc.body.innerHTML = innerHTML;
            }
        }
    }
    return new OobeSettingsData();
});
