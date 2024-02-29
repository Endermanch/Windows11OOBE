//
// Copyright (C) Microsoft. All rights reserved.
//
define(["lib/knockout", 'corejs/knockouthelpers', "legacy/bridge", "legacy/core", "legacy/appObjectFactory"], (ko, KoHelpers, bridge, core, appObjectFactory) => {
    const retailDemoEnableTapCount = 5;
    const retailDemoEnableSpaceCount = 10;
    const retailDemoEnableTapTimeout = 2000;
    const enterpriseProvisioningEnableWinKeyCount = 5;
    class GestureManager {
        constructor() {
            this.resetTapCountAndTime();
            this.spacebarPressCount = 0;
            this.allowRetailDemoEntrypoint = true;
            this.headerVM = null;
            this.winKeyPressCount = 0;
            this.watcher = Windows.Devices.Enumeration.DeviceInformation.createWatcher(Windows.Devices.Enumeration.DeviceClass.portableStorageDevice);
        }

        reevaluateRetailDemoEntryAllowed() {
            let isRetailDemoSuppported = false;

            try {
                isRetailDemoSuppported = RetailDemo.Internal.RetailDemoSetup.isSupported;
            }
            catch (err) {
                // RetailDemo is unavailable as retailinfo dll is missing
            }

            return bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "retailDemoEnabled").then((result) => {
                this.allowRetailDemoEntrypoint = result ? false : isRetailDemoSuppported;
                return this.allowRetailDemoEntrypoint;
            }, (err) => {
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "GetSharableDataRetailDemoEnabledFailure", core.GetJsonFromError(err));
                this.allowRetailDemoEntrypoint = isRetailDemoSuppported;
                return this.allowRetailDemoEntrypoint;
            });
        }

        resetTapCountAndTime() {
            this.retailDemoTapCount = 0;
            this.retailDemoPreviousTapTime = 0;
        }

        onTitleClicked() {
            let nowTime = Date.now();
            if ((nowTime - this.retailDemoPreviousTapTime) > retailDemoEnableTapTimeout) {
                this.resetTapCountAndTime();
            }

            this.retailDemoPreviousTapTime = nowTime;
            if (++this.retailDemoTapCount === retailDemoEnableTapCount) {
                this.resetTapCountAndTime();
                this.retailDemoGestureDetected();
            }
        }

        setHeaderVM(headerVM) {
            this.headerVM = headerVM;
        }

        disableRetailDemoEntryPoint() {
            if (this.headerVM) {
                this.headerVM.disableRetailDemoEntryPoint();
            }
            this.allowRetailDemoEntrypoint = false;
        }

        retailDemoGestureDetected() {
            // Setup knockout customizations
            KoHelpers.registerDialogComponents();
            let dialogElement = document.querySelector("oobe-retaildemo-dialog");
            if (!dialogElement) {
                dialogElement = document.createElement("oobe-retaildemo-dialog");
                ko.applyBindings({}, dialogElement);
                document.body.appendChild(dialogElement);
            }
            KoHelpers.waitForDialogComponentLoadAsync().then(() => {
                dialogElement.koComponent.showDlg(false);
            });
        }

        onKeyUp(ev) {
            this.enterpriseProvisioningHandleHotKey(ev);

            if (this.allowRetailDemoEntrypoint) {
                this.retailDemoHandleHotKey(ev, true);
            }
        }

        onKeyDown(ev) {
            if (this.allowRetailDemoEntrypoint) {
                this.retailDemoHandleHotKey(ev, false);
            }
        }

        retailDemoHandleHotKey(ev, up) {
            if (up) {
                if (ev.ctrlKey && ev.altKey && ((ev.keyCode == WinJS.Utilities.Key.space) || (ev.key == "Spacebar"))) {
                    this.spacebarPressCount++;
                    ev.preventDefault();
                }
                else if (ev.keyCode != WinJS.Utilities.Key.space) {
                    this.spacebarPressCount = 0;
                }

                if (this.spacebarPressCount === retailDemoEnableSpaceCount) {
                    this.spacebarPressCount = 0;
                    this.retailDemoGestureDetected();
                }
            }
            else if ((ev.keyCode == WinJS.Utilities.Key.space) && ev.ctrlKey && ev.altKey) {
                // Disallow the space key to take the default action when both the ctrl key and the alt key are pressed.
                ev.preventDefault();
            }
        }

        enterpriseProvisioningHandleHotKey(ev) {
            if (ev.keyCode == 91) {
                // "Win" has ben changed to "Meta" by the edge team for standards compat.  Use keyCode instead
                this.winKeyPressCount++;
                if (this.winKeyPressCount === enterpriseProvisioningEnableWinKeyCount) {
                    this.winKeyPressCount = 0;
                    bridge.fireEvent(CloudExperienceHost.Events.done, "OobeEnterpriseProvisioning");
                }
            } else if (this.winKeyPressCount > 0) {
                // Key pressed other than win key, clear count
                this.winKeyPressCount = 0;
            }
        }

        initiateAutoPilotDownloadAsync() {
            // This will start an async operation to download the AutoPilot policies if there are any provisioned for this device.  If policies are already available or if this is not
            // an applicable SKU then this function will no-op and return immediately.
            // If the network is not available yet the native hosting service for AutoPilot will register for notification etc... and set corresponding WNF events.
            // Any page can register for the corresponding callback events via EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotSubscriptionManager "profileAvailable"
            // since each page may or may not care and may need to process data and transition appropriately.
            // Note that populating the cache will also be called from the ZDP page which handles the case of no network any earlier.
            // The function is safe to call multiple times and will incur no appreciable time penality on the ZDP page (< 50 ms) if we succeeded earlier.
            bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "populateAutoPilotPolicyStarted");
            let startTime = performance.now();
            let populateAutoPilotPoliciesPromise = new WinJS.Promise(EnterpriseDeviceManagement.Service.AutoPilot.AutoPilotUtilStatics.retrieveSettingsAsync().then(() => {
                let details = { timeElapsed: performance.now() - startTime };
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "populateAutoPilotPolicyReturned", JSON.stringify(details));
            }, (error) => {
                let errorJson = core.GetJsonFromError(error);
                bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "populateAutoPilotPolicyFailure", errorJson);
            }));

            setImmediate(() => { populateAutoPilotPoliciesPromise });
        }

        startPortableDeviceWatcher() {
            // The device watcher is used for Enterprise provisioning, which is related to the Enterprise AutoPilot feature. Any page registering for
            // device notification should also be aware of AutoPilot and desired state changes so go ahead and initiate the download of an
            // AutoPilot profile if one is available. This is a fire-and-forget and will only happen once per session.
            this.initiateAutoPilotDownloadAsync();

            this.watcher.addEventListener("added", this.onPortableDeviceAdded.bind(this));

            // The DeviceWatcher API requires a subscription to all of the "added", "removed", and "updated" events to be able to listen to media insertion.
            // If we only listen to "added" events, then we won't get updates for devices added to the system after the initial device enumeration completes.
            this.watcher.addEventListener("updated", this.onPortableDeviceUpdated);
            this.watcher.addEventListener("removed", this.onPortableDeviceRemoved);

            this.watcher.start();
        }

        onPortableDeviceAdded(devInfo) {
            bridge.invoke("CloudExperienceHost.Storage.SharableData.getValue", "hasProvisionedThisSession").then((hasProvisioned) => {
                // Only process the insertion if we haven't yet attempted provisioning in this session of OOBE.
                if (!hasProvisioned) {
                    let pluginManager = new CloudExperienceHostAPI.Provisioning.PluginManager();
                    pluginManager.getPackagesFromProvidersAsync().then((packages) => {
                        // Only launch the provisioning dialog if there's at least one .ppkg file in the root of the inserted drive.
                        if (packages.length == 1) {
                            this.invokeProvisioningFromPortableDrive(true);
                        }
                        else if (packages.length > 1){
                            this.invokeProvisioningFromPortableDrive(false);
                        }
                    });
                }
                else {
                    bridge.invoke("CloudExperienceHost.Telemetry.logEvent", "PortableDriveInsertedAfterProvisioning");
                }
            });
        }

        // This empty function is required for us to listen for device insertion.
        onPortableDeviceUpdated(devInfo) {
        }

        // This empty function is required for us to listen for device insertion.
        onPortableDeviceRemoved(devInfo) {
        }

        stopPortableDeviceWatcher() {
            this.watcher.removeEventListener("added", this.onPortableDeviceAdded);
            this.watcher.removeEventListener("updated", this.onPortableDeviceUpdated);
            this.watcher.removeEventListener("removed", this.onPortableDeviceRemoved);

            this.watcher.stop();
        }

        invokeProvisioningFromPortableDrive(silentNavigation) {
            if (silentNavigation) {
                bridge.fireEvent(CloudExperienceHost.Events.done, "OobeProvisioningEntry");
            }
            else {
                bridge.fireEvent(CloudExperienceHost.Events.done, "OobeEnterpriseProvisioning");
            }
        }
    }
    return new GestureManager();
});
