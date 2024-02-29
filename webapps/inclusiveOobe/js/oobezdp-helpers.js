//    Copyright (C) Microsoft.  All rights reserved.

define(['legacy/events'], (constants) => {
    const intervalTime = 5 * 1000, loopIntervalTime = 15 * 1000, zdpTimeout = 10 * 60 * 1000;

    // Helper class that show strings in interval, can be looped too
    class ShowStringWithInterval {
        constructor(viewModel) {
            this.viewModel = viewModel;
        }

        start(strings, interval, loop, doneCallback) {
            this.stop();
            if (strings && (strings.length > 0)) {
                // Show the first string in the array
                this.viewModel.onProgressTextChange(strings[0]);

                // Use timer to show the rest of the strings in the array
                let index = 1;
                this.timerID = setInterval(() => {
                    if (index >= strings.length) {
                        if (loop) {
                            index = 0;
                        }
                        else {
                            this.stop();
                            if (doneCallback) {
                                doneCallback(interval);
                            }
                        }
                    }

                    if (index < strings.length) {
                        this.viewModel.onProgressTextChange(strings[index++]);
                    }
                }, interval);
            }
        }

        stop() {
            if (this.timerID) {
                clearInterval(this.timerID);
                this.timerID = null;
            }
        }
    }

    class ScanningStatusHandler {
        constructor(viewModel) {
            this.viewModel = viewModel;
        }

        enter(oldStatus, newStatus) {
            this.viewModel.onProgressTextChange("Scanning");
            this.viewModel.showPage();
        }

        leave(newStatus) { }
    }

    class DownloadingAndInstallingStatusHandler {
        constructor(viewModel, showStringHelperClass) {
            if (!showStringHelperClass) {
                showStringHelperClass = ShowStringWithInterval;
            }
            this.viewModel = viewModel;
            this.showStringInLoop = new showStringHelperClass(this.viewModel);
            this.showStringWithInterval = new showStringHelperClass(this.viewModel);
        }

        enter(oldStatus, newStatus) {
            if (newStatus == CloudExperienceHostAPI.OobeZdpStatus.downloading) {
                let strings = ["DownloadingAndInstalling1"];
                this.showStringWithInterval.start(strings, intervalTime, false, (interval) => {
                    // Show string in loop
                    this.showStringInLoopTimer = setTimeout(() => {
                        let loopStrings = ["DownloadingAndInstallingLoop1", "DownloadingAndInstallingLoop2", "DownloadingAndInstallingLoop3", "DownloadingAndInstallingLoop4"];
                        this.showStringInLoop.start(loopStrings, loopIntervalTime, true);
                    }, interval);
                });
            }
        }

        leave(newStatus) {
            if (newStatus == CloudExperienceHostAPI.OobeZdpStatus.finished) {
                if (this.showStringWithInterval) {
                    this.showStringWithInterval.stop();
                }
                if (this.showStringInLoopTimer) {
                    clearTimeout(this.showStringInLoopTimer);
                }
                this.showStringInLoop.stop();
            }
        }
    }

    class FinishedStatusHandler {
        constructor(viewModel, showStringHelperClass) {
            if (!showStringHelperClass) {
                showStringHelperClass = ShowStringWithInterval;
            }
            this.viewModel = viewModel;
            this.showStringWithInterval = new showStringHelperClass(this.viewModel);
        }

        enter(oldStatus, newStatus) {
            let rebootRequired = this.viewModel.isRebootRequired();
            if (oldStatus != CloudExperienceHostAPI.OobeZdpStatus.installing) {
                // Optimization for early failure or no ZDP update case
                if (oldStatus == CloudExperienceHostAPI.OobeZdpStatus.none ||
                    oldStatus == CloudExperienceHostAPI.OobeZdpStatus.scanning) {
                    this.viewModel.exit(constants.AppResult.success);
                }
                else {
                    this.viewModel.onProgressTextChange(rebootRequired ? "FinishedReboot" : "FinishedFinal");

                    // We need to show the string for some time on the screen before exit the web app
                    setTimeout(() => {
                        this.viewModel.exit(constants.AppResult.success);
                    }, intervalTime);
                }
            }
            else {
                let strings = ["Finished1", rebootRequired ? "FinishedReboot" : "FinishedFinal"];
                this.showStringWithInterval.start(strings, intervalTime, false, () => {
                    this.viewModel.exit(constants.AppResult.success);
                });
            }
        }

        leave(newStatus) { }
    }

    class SkippedStatusHandler {
        constructor(viewModel) {
            this.viewModel = viewModel;
        }

        enter(oldStatus, newStatus) {
            this.viewModel.exit(constants.AppResult.cancel);
        }

        leave(newStatus) { }
    }
    return {
        ShowStringWithInterval: ShowStringWithInterval,
        ScanningStatusHandler: ScanningStatusHandler,
        DownloadingAndInstallingStatusHandler: DownloadingAndInstallingStatusHandler,
        FinishedStatusHandler: FinishedStatusHandler,
        SkippedStatusHandler: SkippedStatusHandler,
        constants: { interval: intervalTime, loopInterval: loopIntervalTime, zdpTimeout: zdpTimeout }
    };
});
