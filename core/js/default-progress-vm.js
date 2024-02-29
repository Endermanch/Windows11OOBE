//
// Copyright (C) Microsoft. All rights reserved.
//
define(() => {
    class DefaultProgressViewModel {
        constructor(params) {
            let res = new Windows.ApplicationModel.Resources.ResourceLoader("resources");
            this.progressText = res.getString("Progress");
        }
    }
    return DefaultProgressViewModel;
});