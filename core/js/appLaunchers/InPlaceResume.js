//
// Copyright (C) Microsoft. All rights reserved.
//

define(() => {
    class InPlaceResume {
        launchAsync() {
            return new WinJS.Promise(function (completeDispatch /*, errorDispatch, progressDispatch */) {
                // Get the volatile ResumeCxid after reconnecting to network
                let volatileResumeCxid = CloudExperienceHost.Storage.VolatileSharableData.getItem("InPlaceResumeValues", "volatileResumeCxid");
                if (volatileResumeCxid) {
                    // Delete volatile ResumeCxid in VolatileSharableData
                    CloudExperienceHost.Storage.VolatileSharableData.removeItem("InPlaceResumeValues", "volatileResumeCxid");

                    // Write the reconnection handled count to Volatile SharableData
                    let reconnectionHandledCount = CloudExperienceHost.Storage.VolatileSharableData.getItem("InPlaceResumeValues", "reconnectionHandledCount");
                    if (reconnectionHandledCount && (typeof(reconnectionHandledCount) === "number")) {
                        CloudExperienceHost.Storage.VolatileSharableData.addItem("InPlaceResumeValues", "reconnectionHandledCount", reconnectionHandledCount + 1);
                    } else {
                        CloudExperienceHost.Storage.VolatileSharableData.addItem("InPlaceResumeValues", "reconnectionHandledCount", 1);
                    }
                    completeDispatch(volatileResumeCxid);
                }
                else {
                    // If the volatile ResumeCxid was not retrived successfully, go to failID
                    completeDispatch(CloudExperienceHost.AppResult.fail);
                }
            });
        }
    }
    return InPlaceResume;
});
