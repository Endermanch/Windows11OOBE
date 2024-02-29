//
// Copyright (C) Microsoft. All rights reserved.
//
if ((typeof define === "function") && define.amd) {
    define(function () {
        return AppObjectFactory.getInstance();
    });
}
class AppObjectFactory {
    constructor() {
        // This enables swapping out the default implementation with custom implementations.
        // Set to false by default for production code. Please set this to true from your Unit Test/when running F5 deploy.
        this.enableSwap = false;
        this.registered = {};
    }
    // This ensures that both amd and non-amd code share the same singleton instance of AppObjectFactory
    static getInstance() {
        if (AppObjectFactory._instance === null) {
            AppObjectFactory._instance = new AppObjectFactory();
        }
        return AppObjectFactory._instance;
    }
    // This creates the lookup table for the registered objects (sample)
    registerModule(module, object) {
        // We register the valid Sample object in the map:
        // key : winrtclassname, value: sample class instance
        this.registered[module] = object;
    }
    getObjectFromString(className) {
        if (this.enableSwap && (className in this.registered)) {
            return this.registered[className];
        }
        // No Sample implementation for this, return default class
        return this.getContextFromString(className);
    }
    getContextFromString(className) {
        let context = window;
        let arr = className.split(".");
        try {
            for (var i = 0, len = arr.length; i < len; i++) {
                context = context[arr[i]];
            }
        }
        catch (error) {
            return null;
        }
        return context;
    }
    ;
}
AppObjectFactory._instance = null;
//# sourceMappingURL=appObjectFactory.js.map