

(function () {
    "use strict";

    
    var doNotSetOptionOnControl = {};

    
    function isPropertyEventHandler(propertyName) {
        return propertyName[0] === "o" && propertyName[1] === "n";
    }

    
    function isSameLayout(layout1, layout2) {
        if (layout1 && layout2 && layout1.type && layout2.type) {
            return objectShallowEquals(layout1, layout2);
        } else {
            return layout1 === layout2;
        }
    };

    function arrayShallowEquals(array1, array2) {
        if (array1 === array2) {
            return true;
        }
        if (!array1 || !array2 || array1.length !== array2.length) {
            return false;
        }
        for (var i in array1) {
            if (array2[i] !== array1[i]) {
                return false;
            }
        }
        return true;
    }

    
    function objectShallowEquals(object1, object2) {
        if (object1 === object2) {
            return true;
        }
        for (var prop in object1) {
            if (object1[prop] !== object2[prop]) {
                return false;
            }
        }
        for (var prop in object2) {
            if (object1[prop] !== object2[prop]) {
                return false;
            }
        }
        return true;
    }

    function addBindings(controls, eventConfig) {
        Object.keys(controls).forEach(function (name) {
            var controlConfiguration = controls[name];
            var eventsChangingProperties = eventConfig[name];
            var ctor = WinJS.Utilities.getMember("WinJS.UI." + name);
            var propertyProcessor = controlConfiguration.propertyProcessor || {};
            var delayedPropertyProcessor = controlConfiguration.postCtorPropertyProcessor || {};
            var bindDescendantsBeforeParent = controlConfiguration.bindDescendantsBeforeParent || false;
            var bindingName = "win" + name;

            ko.bindingHandlers[bindingName] = {
                init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {

                    
                    var value = valueAccessor();

                    
                    var options = {};

                    
                    if (element.children.length > 0 && bindDescendantsBeforeParent) {
                        ko.applyBindingsToDescendants(bindingContext, element);
                    }

                    
                    for (var property in value) {
                        
                        if (value.hasOwnProperty(property) && !isPropertyEventHandler(property) && (!delayedPropertyProcessor[property])) {
                            if (propertyProcessor[property]) {
                                var propertyResult = propertyProcessor[property](value[property], function () { return element });

                                
                                if (propertyResult !== doNotSetOptionOnControl) {
                                    options[property] = propertyResult;
                                }
                            } else {
                                options[property] = ko.unwrap(value[property]);
                            }
                        }
                    }

                    
                    var control = new ctor(element, options);

                    
                    if (eventConfig[name]) {
                        var events = eventConfig[name];
                        for (var event in events) {
                            ko.utils.registerEventHandler(element, event, function changed(e) {

                                
                                for (var propertyIndex in eventConfig[name][event]) {
                                    var property = eventConfig[name][event][propertyIndex];
                                    
                                    if (value && value.hasOwnProperty(property)) {
                                        
                                        if (ko.isWriteableObservable(value[property]) && value[property]() !== control[property]) {
                                            
                                            value[property](control[property]);
                                        }
                                    }
                                }
                            });
                        }
                    }

                    
                    ko.utils.domNodeDisposal.addDisposeCallback(element, function (e) {
                        if (element.winControl) {
                            element.winControl.dispose();
                        }
                    });

                    return { controlsDescendantBindings: bindDescendantsBeforeParent };
                },

                update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                    
                    var control = element.winControl;
                    var value = valueAccessor();

                    
                    for (var property in value) {
                        if (value.hasOwnProperty(property)) {
                            var unwrappedValue = ko.unwrap(value[property]);
                            if (control[property] !== unwrappedValue) {
                                if (propertyProcessor && propertyProcessor[property]) {
                                    var returnValue = propertyProcessor[property](value[property], function () { return element }, control[property]);
                                    if (returnValue !== doNotSetOptionOnControl) {
                                        control[property] = returnValue;
                                    }
                                } else if (delayedPropertyProcessor && delayedPropertyProcessor[property]) {
                                    var returnValue = delayedPropertyProcessor[property](value[property], function () { return element }, control[property]);
                                    if (returnValue !== doNotSetOptionOnControl) {
                                        control[property] = returnValue;
                                    }
                                } else {
                                    control[property] = unwrappedValue;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    
    function bindingListWatch(value, oldValue, sourceElement) {
        var unpacked = ko.unwrap(value);
        
        var retVal = doNotSetOptionOnControl;
        if (Array.isArray(unpacked) && ko.isWriteableObservable(value)) {
            if (!value._winKoChangesSubscription) {
                if (value._rateLimitedChange) {
                    throw new Error("Knockout-WinJS does not support rate limited observable arrays currently");
                }
                var bindingList = new WinJS.Binding.List(unpacked);

                value._winKoChangesSubscriptionDisabled = false;
                value._winKoBindingList = bindingList;

                
                value._winKoChangesSubscription = value.subscribe(function (newValue) {
                    if (!value._winKoChangesSubscriptionDisabled) {

                        
                        bindingList._winKoChangesSubscriptionDisabled = true;
                        var offset = 0;

                        var deletes = newValue.filter(function (item) {
                            return item.status === "deleted";
                        });
                        var adds = newValue.filter(function (item) {
                            return item.status === "added";
                        });
                        for (var deletedItem in deletes) {
                            var item = deletes[deletedItem];
                            bindingList.splice(item.index - offset, 1);
                            offset++;
                        }

                        var arrayLength = bindingList.length;
                        for (var i = 0; i < adds.length; i++) {
                            var item = adds[i];
                            if (item.index === arrayLength) {
                                bindingList.push(item.value);
                            } else if (item.index === 0) {
                                bindingList.unshift(item.value);
                            } else {
                                bindingList.push(item.value)
                                bindingList.move(arrayLength, item.index);
                            }
                            arrayLength++;
                        }
                        bindingList._winKoChangesSubscriptionDisabled = false;
                    }
                }, this, "arrayChange");

                
                var bindingListMutationEvents = ["itemchanged", "itemmoved", "itemmutated", "itemremoved", "reload"];

                var updateOriginalArray = function () {
                    if (!bindingList._winKoChangesSubscriptionDisabled) {

                        
                        value._winKoChangesSubscriptionDisabled = true;
                        value.removeAll();
                        for (var i = 0, len = bindingList.length; i < len; i++) {
                            value.push(bindingList.getAt(i));
                        }
                        value._winKoChangesSubscriptionDisabled = false;
                    }
                };

                bindingListMutationEvents.forEach(function (event) {
                    bindingList.addEventListener(event, updateOriginalArray);
                });

                
                ko.utils.domNodeDisposal.addDisposeCallback(sourceElement(), function () {
                    value._winKoChangesSubscription.dispose();
                });

            }
            
            if (!sourceElement()._winKoDataSourceBound) {
                sourceElement()._winKoDataSourceBound = true;
                retVal = value._winKoBindingList.dataSource;
            }
        } else {
            retVal = unpacked;
        }

        return retVal;
    }

    
    function itemTemplateWatch(value, oldValue, sourceElement, property) {
        var retVal = doNotSetOptionOnControl;
        value = ko.unwrap(value);
        var template = value;
        var renderer;

        sourceElement = sourceElement();
        
        if (typeof value === "string") {
            renderer = WinJS.UI.simpleItemRenderer(function (item) {
                var element = document.createElement("div");
                ko.renderTemplate(template, item.data, {}, element);
                return element;
            });
        } else {
            
            renderer = value;
        }
        var templateProp = "win" + property + "Old";
        if (!oldValue || template !== sourceElement[templateProp]) {
            sourceElement[templateProp] = template;
            retVal = renderer;
        }

        return retVal;
    }

    var controls = {
        
        AppBar: {
            bindDescendantsBeforeParent: true
        },
        AppBarCommand: {
            propertyProcessor: {
                'type': function (value, appBarCommandElement, update) {
                    if (!appBarCommandElement._winTypeInitialized) {
                        appBarCommandElement._winTypeInitialized = true;
                        return value;
                    } else {
                        console.warn("Cannot change AppBarCommand type after initializing the control");
                    }
                }
            }
        },
        AutoSuggestBox: {},
        BackButton: {},
        Command: {
            propertyProcessor: {
                'type': function (value, commandElement, update) {
                    if (!commandElement._winTypeInitialized) {
                        commandElement._winTypeInitialized = true;
                        return value;
                    } else {
                        console.warn("Cannot change Command type after initializing the control");
                    }
                }
            }
        },
        ContentDialog: {},
        DatePicker: {},
        FlipView: {
            propertyProcessor: {
                'itemTemplate': function (value, flipViewElement, current) {
                    return itemTemplateWatch(value, current, flipViewElement, 'ItemTemplate');
                },
                'itemDataSource': function (value, flipViewElement, current) {
                    return bindingListWatch(value, current, flipViewElement);
                }
            },
            bindDescendantsBeforeParent: true
        },
        Flyout: {},
        Hub: {
            bindDescendantsBeforeParent: true,
        },
        HubSection: {},
        ItemContainer: {},
        ListView: {
            propertyProcessor: {
                'groupHeaderTemplate': function (value, listViewElement, current) {
                    return itemTemplateWatch(value, current, listViewElement, 'GroupHeaderTemplate');
                },
                'groupDataSource': function (value, listViewElement, current) {
                    return bindingListWatch(value, current, listViewElement);
                },
                'itemTemplate': function (value, listViewElement, current) {
                    return itemTemplateWatch(value, current, listViewElement, 'ItemTemplate');
                },
                'itemDataSource': function (value, listViewElement, current) {
                    return bindingListWatch(value, current, listViewElement);
                },
                'layout': function (value, listViewElement, current) {
                    var retVal = doNotSetOptionOnControl;
                    var unpacked = ko.unwrap(value);
                    var listViewElement = listViewElement();

                    
                    if (!current || !isSameLayout(unpacked, listViewElement._winCachedLayout)) {
                        retVal = (unpacked && unpacked.type) ? new unpacked.type(unpacked) : unpacked;
                        listViewElement._winCachedLayout = unpacked;
                    }

                    return retVal;
                }
            },
            postCtorPropertyProcessor: {
                
                'selection': function (value, listViewElement, current) {
                    var unpacked = ko.unwrap(value);
                    listViewElement = listViewElement();

                    
                    if (Array.isArray(unpacked) && ko.isWriteableObservable(value)) {
                        if (!listViewElement._winKoSelectionChangedHandlerSet) {
                            listViewElement.winControl.addEventListener("selectionchanged", function () {
                                var currSelectionArray = listViewElement.winControl.selection.getIndices();
                                var oldSelection = ko.unwrap(value);
                                if (!arrayShallowEquals(oldSelection, currSelectionArray)) {
                                    value(listViewElement.winControl.selection.getIndices());
                                }
                            });
                            listViewElement._winKoSelectionChangedHandlerSet = true;
                        }
                    }
                    listViewElement.winControl.selection.set(unpacked);

                    return doNotSetOptionOnControl;
                }
            },
            bindDescendantsBeforeParent: true
        },
        Menu: {
            bindDescendantsBeforeParent: true
        },
        MenuCommand: {},
        Pivot: {
            bindDescendantsBeforeParent: true,
            propertyProcessor: {
                'selectedIndex': function (value, pivotElement, current) {
                    
                    if (!pivotElement._winKoSelectedIndexHandlerSet) {
                        pivotElement().addEventListener("selectionchanged", function (e) {
                            if (ko.isWriteableObservable(value)) {
                                value(e.detail.index);
                            }
                        });
                        pivotElement()._winKoSelectedIndexHandlerSet = true;
                    }
                    return ko.unwrap(value);
                },
                'selectedItem': function (value, pivotElement, current) {
                    
                    if (!pivotElement._winKoSelectedItemHandlerSet) {
                        pivotElement().addEventListener("selectionchanged", function (e) {
                            if (ko.isWriteableObservable(value)) {
                                value(pivotElement().winControl.items.getAt(e.detail.index));
                            }
                        });
                        pivotElement()._winKoSelectedItemHandlerSet = true;
                    }
                    return ko.unwrap(value);
                },
            }
        },
        PivotItem: {},
        Rating: {},
        SemanticZoom: {
            bindDescendantsBeforeParent: true
        },
        SplitView: {},
        SplitViewCommand: {},
        SplitViewPaneToggle: {},
        TimePicker: {},
        ToggleSwitch: {},
        ToolBar: {
            bindDescendantsBeforeParent: true
        },
        Tooltip: {
            propertyProcessor: {
                'contentElement': function (value, toolTipElement, current) {
                    var value = ko.unwrap(value);
                    var element = document.querySelector(value);
                    return element;
                }
            }
        },
        ViewBox: {}
    };

    
    var eventConfig = {
        AppBar: {
            "afterclose": ["opened"],
            "afteropen": ["opened"]
        },
        AutoSuggestBox: {
            "querychanged": ["queryText"]
        },
        ContentDialog: {
            "afterhide": ["hidden"],
            "aftershow": ["hidden"]
        },
        DatePicker: {
            "change": ["current"]
        },
        FlipView: {
            "pageselected": ["currentPage"]
        },
        Flyout: {
            "afterhide": ["hidden"],
            "aftershow": ["hidden"]
        },
        Hub: {
            "loadingstatechanged": ["loadingState"]
        },
        ItemContainer: {
            "selectionchanged": ["selected"]
        },
        ListView: {
            "loadingstatechanged": ["loadingState"]
        },
        Menu: {
            "afterhide": ["hidden"],
            "aftershow": ["hidden"]
        },
        NavBar: {
            "afterclose": ["opened"],
            "afteropen": ["opened"]
        },
        Pivot: null,
        
        Rating: {
            "change": ["userRating"]
        },
        SemanticZoom: {
            "zoomchanged": ["zoomedOut"]
        },
        SplitView: {
            "afterclose": ["paneOpened"],
            "afteropen": ["paneOpened"]
        },
        TimePicker: {
            "change": ["current"]
        },
        ToggleSwitch: {
            "change": ["checked"]
        },
        ToolBar: {
            "afterclose": ["opened"],
            "afteropen": ["opened"]
        }
    };

    addBindings(controls, eventConfig);

})();