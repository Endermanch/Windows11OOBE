"use strict";
function requireAsync(modules) {
    /// <summary>Asynchronously loads modules using RequireJs and returns a promise</summary>
    /// <param name="modules" type="Array">Array of one or more module names</param>
    /// <returns type="WinJS.Promise">A promise which when fulfilled provides an object where the keys are module names (with "/" squashed to "_") and the values are the loaded module references</returns>
    return new WinJS.Promise((reportComplete, reportError, reportProgress) => {
        require(modules, (...loadedModules) => {
            var result = {};
            for (let i = 0; i < modules.length; i++) {                
                result[modules[i].replace("/", "_").replace("-", "_")] = loadedModules[i];
            }
            reportComplete(result);
        }, (error) => {
            reportError(error);
        });
    });
}

// For now, treat F5 deployments as "debug mode"
// Eventually we should have a minifier set up to strip all Debug calls from call sites in release builds
(function () {
    let isDebugBuild = self.Windows && Windows.ApplicationModel.Package.current.isDevelopmentMode;
    if (isDebugBuild) {
        function _getCallerInfo() {
            let caller = null;
            try {
                let errorObj = new Error();
                caller = errorObj.stack.split("\n")[3];
            }
            catch (ex) { }
            return caller;
        }

        self.Debug = {
            assert: function (predicate, msg) {
                if (!predicate) {
                    let caller = _getCallerInfo();
                    console.log(`Assertion hit: ${msg || ""} ${caller || "" }`);
                    debugger;
                }
            },
            break: function (msg) {
                let caller = _getCallerInfo();
                console.log(`Assertion hit: ${msg || ""} ${caller || "" }`);
                debugger;
            },
            log: function (msg) {
                let caller = _getCallerInfo();
                console.log(msg + (caller || ""));
            },
        };
    }
    else {
        self.Debug = {
            assert: function () { },
            break: function () { },
            log: function () { },
        };
    }
})();