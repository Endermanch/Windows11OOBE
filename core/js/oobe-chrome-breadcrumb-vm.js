//
// Copyright (C) Microsoft. All rights reserved.
//
define(['lib/knockout', 'legacy/navigationManager', 'legacy/appViewManager', 'lib/text!data/oobeSections.json'], (ko, navManager, appViewManager, sectionRawData) => {
    class OOBEChromeBreadCrumbViewModel {
        constructor(params) {
            navManager.subscribeForNavigationEvent(this, CloudExperienceHost.NavigationEvent.CompletedAndVisible);

            let resourceStrings = this.getResources();
            this.resources = ko.observable(resourceStrings);
            appViewManager.subscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.Language);

            // Initialize and load section data
            this.sectiondata = JSON.parse(sectionRawData);
            this.sectionMapping = {};
            this.sections = ko.observableArray([]);
            this.currentSection = ko.observable("");
            this.currentSectionAccString = ko.pureComputed(() => {
                return this.getSectionAccString(this.currentSection(), this.sections(), this.resources());
            });
            this.reloadSections();
            document.title = this.resources().MainFrameAccName;
        }

        dispose() {
            appViewManager.unsubscribeForUpdateType(this, CloudExperienceHost.FrameViewModelUpdateType.Language);
            navManager.unsubscribeForNavigationEvent(this, CloudExperienceHost.NavigationEvent.CompletedAndVisible);
        }

        languageOverridden(updateTag) {
            this.resources(this.getResources(updateTag));
            document.title = this.resources().MainFrameAccName;
        }

        getResources(updateTag) {
            let result = CloudExperienceHost.StringResources.makeResourceObject("oobeCommon", null /* keyList */, updateTag);
            return JSON.parse(result);
        }

        update(updateType, completeDispatch, errorDispatch, updateTag) {
            switch (updateType) {
                case CloudExperienceHost.FrameViewModelUpdateType.Language:
                    this.languageOverridden(updateTag);
                    completeDispatch();
                    break;
            }
        }

        reloadSections(scenario) {
            let scenarioName = scenario ? scenario : "oobeDefault";
            this.sectionMapping = {};
            this.sections.removeAll();
            this.currentSection("");
            let tempSections = [];

            for (let section of this.sectiondata[scenarioName]) {
            // Update section binding data
                tempSections.push({ name: section.name, resID: section.resID });

            // Create node to section mapping
                for (let node of section.visibleNodes) {
                    this.sectionMapping[node.cxid] = section.name;
                }
            }
            this.sections(tempSections);
        }

        onNavigationEvent(event, cxid) {
            if (event === CloudExperienceHost.NavigationEvent.CompletedAndVisible) {
                if (cxid && (cxid in this.sectionMapping)) {
                    this.currentSection(this.sectionMapping[cxid]);
                }
            }
        }

        getSectionAccString(section, sections, resources) {
            let accString = "";
            // Find the matching section and construct the acc string
            for (let i = 0; i < sections.length; i++) {
                if (sections[i].name === section) {
                    accString = resources["SectionAccString"].replace("%1", resources[sections[i].resID]);
                    accString = accString.replace("%2", (i + 1).toString());
                    accString = accString.replace("%3", sections.length);
                    break;
                }
            }
            return accString;
        }
    }
    return OOBEChromeBreadCrumbViewModel;
});
