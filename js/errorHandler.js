
(function () {
    "use strict";
    
    var originalOnError;

    WinJS.UI.Pages.define("/views/errorHandler.html", {
        init: function (element, options) {
            originalOnError = WinJS.Application.onerror;
            return new WinJS.Promise(function (completeDispatch, errorDispatch) {
                var cssList = CloudExperienceHost.GetCssList("..", CloudExperienceHost.getContext());
                for (var i = 0; i < cssList.length; i++) {
                    CloudExperienceHost.AddCssToHead(document.head, cssList[i]);
                }
                completeDispatch();
            });
        },
        ready: function (element, accountErrorPage) {
            _retryButton.addEventListener("click", function () {
                _retryButton.disabled = true;
                WinJS.Application.onerror = originalOnError;
                WinJS.Application.restart();
            });
            _retryButton.focus();

            _cancelButton.addEventListener("click", function () {
                _cancelButton.disabled = true;
                CloudExperienceHost.fail();
            });

            _localAccountButton.addEventListener("click", function () {
                _localAccountButton.disabled = true;
                WinJS.Application.onerror = originalOnError;
                WinJS.Application.restart("ms-cxh://LOCALONLY");
            });

            
            if (accountErrorPage === true) {
                _cancelButton.style.display = 'none';
                _errorText.style.display = 'none';
            } else {
                _localAccountButton.style.display = 'none';
                _accountErrorText.style.display = 'none';
            }

            
            var show = CloudExperienceHost.shouldShowEaseOfAccessControl();
            EaseOfAccess.style.visibility = (show) ? 'inline' : 'hidden';
            if (show) {
                var label = CloudExperienceHost.Resources.getString("oobecommon", "EaseOfAccessAccName");
                EaseOfAccess.setAttribute("aria-label", label);

                
                EaseOfAccess.setAttribute("title", label);
                EaseOfAccess.addEventListener("click", function () {
                    var rect = EaseOfAccess.getBoundingClientRect();
                    CloudExperienceHost.showEaseOfAccessFlyout(new CloudExperienceHost.ShowEaseOfAccessArgs(rect));
                });
            }

            WinJS.Resources.processAll().done();
        },
        error: function (e) {
            
            var data = e.detail;
            var logData = new Object;
            logData["errorCode"] = data && (data.number || (data.exception && (data.exception.number || data.exception.code)) || (data.error && data.error.number) || data.errorCode || 0);
            logData["message"] = data && (data.message || data.errorMessage || (data.error && data.error.message) || (data.exception && data.exception.message) || null);
            logData["stack"] = data && (data.stack || (data.exception && (data.exception.stack || data.exception.message)) || (data.error && data.error.stack) || null);
            CloudExperienceHost.Telemetry.AppTelemetry.getInstance().logEvent("UnhandledException on error page", JSON.stringify(logData));
            WinJS.Application.onerror = function () {
                return null;
            };
            throw e;
        },
    });
})();
