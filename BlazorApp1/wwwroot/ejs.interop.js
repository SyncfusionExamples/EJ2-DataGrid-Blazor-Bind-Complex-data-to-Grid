(function (ejs) {
    window.ejsBase = ejs;
})({
    getElement: function (elementID, id, xPath) {
        var dom = (elementID != null && window[elementID] != null) ? window[elementID][id] : null;
        return (dom != null ? dom : getElementByXpath(xPath));
    },
    getAttribute: function (elementID, dom, xPath, propName) {
        var element = window.ejsBase.getElement(elementID, dom, xPath);
        if (element != null)
            return element.getAttribute(propName);
    },
    setAttribute: function (elementID, dom, xPath, propName, value) {
        (window.ejsBase.getElement(elementID, dom, xPath)).setAttribute(propName, value);
    },
    addClass: function (elementID, dom, xPath, classList) {
        ejs.base.addClass([window.ejsBase.getElement(elementID, dom, xPath)], classList);
    },
    removeClass: function (elementID, dom, xPath, classList) {
        ejs.base.removeClass([window.ejsBase.getElement(elementID, dom, xPath)], classList);
    },
    getClassList: function (elementID, dom, xPath) {
        return Array.prototype.slice.call((window.ejsBase.getElement(elementID, dom, xPath)).classList);
    },
    enableRipple: function (isRipple) {
        ejs.base.enableRipple(isRipple);
    },
    enableRtl: function (status) {
        ejs.base.enableRtl(status);
    },
    loadCldr: function (...cultureData) {
        for (var i = 0; i < cultureData.length; i++) {
            ejs.base.loadCldr(JSON.parse(cultureData[i]));
        }
    },
    setCulture: function (cultureName) {
        ejs.base.setCulture(cultureName);
    },
    setCurrencyCode: function (currencyCode) {
        ejs.base.setCurrencyCode(currencyCode);
    },
    load: function (localeObject) {
        ejs.base.L10n.load(JSON.parse(localeObject));
    }
});

function getElementByXpath(xPath) {
    return document.evaluate(xPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

window.ejsInterop = {
    createXPathFromElement: function (elm) {
        var allNodes = document.getElementsByTagName('*');
        for (var segs = []; elm && elm.nodeType === 1; elm = elm.parentNode) {
            if (elm.hasAttribute('id')) {
                var uniqueIdCount = 0;
                for (var n = 0; n < allNodes.length; n++) {
                    if (allNodes[n].hasAttribute('id') && allNodes[n].id === elm.id) uniqueIdCount++;
                    if (uniqueIdCount > 1) break;
                };
                if (uniqueIdCount === 1) {
                    segs.unshift('id("' + elm.getAttribute('id') + '")');
                    return segs.join('/');
                } else {
                    segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]');
                }
            } else {
                for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
                    if (sib.localName === elm.localName) i++;
                }
                segs.unshift(elm.localName.toLowerCase() + '[' + i + ']');
            }
            // else if (elm.hasAttribute('class')) {
            //     segs.unshift(elm.localName.toLowerCase() + '[@class="' + elm.getAttribute('class') + '"]');
            // } 
        }
        return segs.length ? '/' + segs.join('/') : null;
    },
    dotnetInstance: null,
    tempCallBacks: [],
    dataSourceProperties: ["dataSource", "dataSource_custom", "shapeData"],
    convertOptions: function (options, isInitialRendering = false) {
        var output = {};
        for (var prop in options) {
            var props = prop.trim().split('.'), nestedObj = output;
            for (var i = 0; i < props.length - 1; i++) {
                var isArray = props[i].match(/^(\w+)\[(\d+)\]$/); // is array 
                if (isArray) {
                    var arr = nestedObj[isArray[1]];
                    if (!arr) arr = nestedObj[isArray[1]] = [];
                    nestedObj = arr[isArray[2]] = arr[isArray[2]] || {};
                } else {
                    nestedObj = nestedObj[props[i]] = nestedObj[props[i]] || {};
                }
            }
            nestedObj[props[i]] = options[prop];
            if (isInitialRendering) delete options[prop];
        }
        return output;
    },
    convertInitialOptions: function (options) {
        options = ejsInterop.convertOptions(JSON.parse(options), true);
        return JSON.stringify(options);
    },
    invokeEJS: function (id, options, events, namespace, dotnet, bindableProps, htmlAttributes, templateRefs) {
        try {
            ejsInterop.dotnetInstance = dotnet;
            if (!window.BlazorAdaptor) {
                ejsInterop.initBlazorAdaptor();
            }
            options = ejsInterop.convertInitialOptions(options);
            options = JSON.parse(options, ejsInterop.parseRevive.bind(templateRefs));
            options["elementID"] = "_ejs" + id;
            var type = ejs.base.getValue(namespace, window);
            ejsInterop.bindEvents(options, events, dotnet, namespace);
            var comp = new type(options);
            comp._dotnetInstance = dotnet;
            comp.templateDotnetInstance = templateRefs;
            var change = comp.saveChanges;
            comp._saveChanges = change.bind(comp);
            comp.bindableProps = bindableProps = JSON.parse(bindableProps);
            comp.saveChanges = ejsInterop.updateModel.bind(comp);
            if (htmlAttributes) {
                var element = document.getElementById(id);
                for (var attr in htmlAttributes) {
                    element.setAttribute(attr, htmlAttributes[attr]);
                }
            }
            if (namespace == 'ejs.pdfviewer.PdfViewer') {
                if (comp.serviceUrl == null) {
                    ej.pdfviewer.AjaxHandler.prototype.send = ejsInterop.requestHandler.bind(comp);
                }
            }
            if (namespace == 'ejs.documenteditor.DocumentEditorContainer' || namespace == 'ejs.documenteditor.DocumentEditor') {
                if (comp.serviceUrl == null) {
                    ej.documenteditor.XmlHttpRequestHandler.prototype.send = ejsInterop.docEditRequestHandler.bind(comp);
                }
            }
            comp.appendTo("#" + id);
            ejsInterop.dotnetInstance = null;
        }
        catch (e) {
            ejsInterop.throwError(e, comp);
        }
    },
    renderComplete: function (element, wrapperElement) {
        if (element != null) {
            delete window[element.id];
            element.classList.remove("e-blazor-hidden");
            var placeholderElement = ej.base.closest(element, ".e-content-placeholder");
            if (placeholderElement) {
                if (!element.querySelector("iframe")) {
                    placeholderElement.replaceWith(...placeholderElement.childNodes);
                } else {
                    placeholderElement.classList = [];
                }
            }
        }
    },
    copyObject: function () {
        var options, key, src, copy, isArray, clone,
            result = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        if (typeof result === "boolean") {
            deep = result;
            result = arguments[i] || {};
            i++;
        }
        if (i === length) {
            result = this;
            i--;
        }
        for (; i < length; i++) {
            options = arguments[i];
            for (key in options) {
                copy = options[key];
                if (key === "__proto__" || result === copy) {
                    continue;
                }
                if (deep && copy && (ej.base.isObject(copy) ||
                    (isArray = Array.isArray(copy)))) {
                    src = result[key];
                    if (!isArray && !ej.base.isObject(src)) {
                        clone = src ? src : {};
                    } else {
                        clone = src ? src : [];
                    }
                    isArray = false;
                    result[key] = ejsInterop.copyObject(deep, clone, copy);
                } else if (copy !== undefined) {
                    result[key] = copy;
                }
            }
        }
        return result;
    },
    convertPropToJSON: function (compObj, updatedObj, templateRefs) {
        var dataOutput = null;
        var output = ejsInterop.convertOptions(updatedObj);
        compObj["bindablePropKeys"] = [];
        for (var key in output) {
            if (ejsInterop.isDataSourceProperty(key)) {
                dataOutput = ejsInterop.retrieveDataProperty(compObj[key], output, templateRefs);
                if (dataOutput[key]) {
                    compObj[key] = dataOutput[key];
                }
            } else if (output[key] !== null && Array.isArray(output[key])) {
                for (var j = 0; j < output[key].length; j++) {
                    var outputValue = output[key][j];
                    if (outputValue) {
                        if (Array.isArray(output[key]) && (typeof outputValue !== "object" || outputValue instanceof Date)) {
                            compObj[key][j] = outputValue;
                        } else {
                            compObj[key][j] = compObj[key][j] ? compObj[key][j] : {};
                            dataOutput = ejsInterop.retrieveDataProperty(compObj[key][j], outputValue);
                            compObj[key][j] = ejsInterop.copyObject(true, compObj[key][j], dataOutput);
                        }
                    }
                }
            } else if (output[key] !== null && typeof output[key] === "object" && !(output[key] instanceof Date)) {
                var dataObj = compObj[key] && compObj[key].dataSource ? compObj[key].dataSource : compObj[key];
                if (!dataObj) {
                    compObj[key] = output[key];
                } else {
                    ejsInterop.copyObject(true, compObj[key], ejsInterop.retrieveDataProperty(dataObj, output[key]));
                }
            }
            else {
                compObj[key] = output[key];
            }
            compObj["bindablePropKeys"].push(key);
        }
        return compObj;
    },
    getModelProps: function (component) {
        var updatedModel = {};
        for (var i = 0; i < component["bindablePropKeys"].length; i++) {
            var key = component["bindablePropKeys"][i];
            var value = component[key];
            updatedModel[key] = ejsInterop.isDataSourceProperty(key) ? (!(value instanceof ejs.data.DataManager) ?
                ejsInterop.parseRevive(key, value) : value) : value;
        }
        if (updatedModel.dataSource_custom) {
            updatedModel.dataSource_custom.key = component.dataSource.key;
            Object.defineProperty(updatedModel, "dataSource", Object.getOwnPropertyDescriptor(updatedModel, 'dataSource_custom'));
            delete updatedModel["dataSource_custom"];
        }
        return updatedModel;
    },
    isDataSourceProperty: function (key) {
        return ejsInterop.dataSourceProperties.indexOf(key) !== -1;
    },
    retrieveDataProperty: function (compObj, object, templateRefs) {
        var hasDataSource = false, finalOutput = {};
        for (var i = 0; i < ejsInterop.dataSourceProperties.length; i++) {
            if (object.hasOwnProperty(ejsInterop.dataSourceProperties[i])) {
                hasDataSource = true;
                break;
            }
        }
        if (hasDataSource) {
            for (var key in object) {
                if (ejsInterop.isDataSourceProperty(key)) {
                    if (!(compObj instanceof ejs.data.DataManager) || compObj != object[key]) {
                        finalOutput[key] = ejsInterop.parseRevive(key, object[key], templateRefs);
                    }
                    continue;
                }
                finalOutput[key] = object[key];
            }
            return finalOutput;
        }
        return object;
    },
    setModel: function (id, options, events, namespace, dotnet, bindableProps, templateRefs) {
        try {
            ejsInterop.dotnetInstance = dotnet;
            var convertedProperties = ejsInterop.convertInitialOptions(bindableProps);
            this.bindableProps = bindableProps = JSON.parse(convertedProperties, ejsInterop.parseRevive);
            var comp = document.getElementById(id).ej2_instances[0];
            ejsInterop.bindEvents(options, events, dotnet, comp);
            var updatedOptions = ejsInterop.convertPropToJSON(ejsInterop.copyObject(true, {}, comp), bindableProps, templateRefs);
            comp.preventUpdate = true;
            options = ejsInterop.getModelProps(updatedOptions);
            comp.setProperties(options);
            comp.dataBind();
            comp.preventUpdate = false;
            ejsInterop.dotnetInstance = null;
        }
        catch (e) {
            window.ejsInterop.throwError(e, comp);
        }
    },

    updateModel: async function (key, newValue, oldValue) {
        try {
            this._saveChanges(key, newValue, oldValue);
            var ignoreKeys = ["query", "formatter"];
            if (this.isRendered && !this.preventUpdate && ejsInterop.compareValues(newValue, oldValue) && ignoreKeys.indexOf(key) === -1) {
                var newObj = {};
                if (typeof newValue === "object" && newValue !== null && !(newValue instanceof Date) && !(Array.isArray(newValue) && (newValue[0]) instanceof Date)) {
                    newValue = JSON.stringify(newValue);
                }
                newObj[key] = newValue;
                await this._dotnetInstance.invokeMethodAsync('UpdateModel', ejsInterop.copyWithoutCircularReferences([newObj], newObj), false);
            }
            this.preventUpdate = false;
        }
        catch (e) {
            window.ejsInterop.throwError(e, this);
        }
    },

    childSaveChanges: async function (key, newValue, oldValue) {
        try {
            var parent = this.controlParent;
            if (parent.isRendered && !parent.preventUpdate && ejsInterop.compareValues(newValue, oldValue)) {
                var newObj = {};
                if (typeof newValue === "object" && newValue !== null && !(newValue instanceof Date) && !(Array.isArray(newValue) && (newValue[0]) instanceof Date)) {
                    newValue = JSON.stringify(ejsInterop.copyWithoutCircularReferences([newValue], newValue));
                }
                newObj[key] = newValue;
                var currentObject = this;
                while (currentObject.parentObj) {
                    newObj = ejsInterop.getParentProperty(currentObject, newObj);
                    currentObject = currentObject.parentObj;
                }
                // await parent._dotnetInstance.invokeMethodAsync('UpdateModel', ejsInterop.copyWithoutCircularReferences([newObj], newObj), true);
            }
        }
        catch (e) {
            window.ejsInterop.throwError(e, this);
        }
    },

    getParentProperty: function (currentObject, newObj) {
        try {
            var parentProperty = {};
            parentProperty[currentObject.propName] = newObj;
            if (currentObject.isParentArray) {
                parentProperty["ejsIndex"] = currentObject.parentObj[currentObject.propName].indexOf(currentObject);
            }
            return parentProperty;
        }
        catch (e) {
            window.ejsInterop.throwError(e, this);
        }
    },

    updateTemplate: function (name, templateData, templateId, comp, promise) {
        if (comp === undefined) {
            comp = {};
        }
        if (promise) {
            window.ejsInterop.tempCallBacks.push({ Id: templateId, Promise: promise });
        }
        setTimeout(function () {
            var cloneTemplateData = []; var blazIds = []; var innerTemplates = [];
            if (!ej.base.isNullOrUndefined(templateData) && (templateData.length && !ej.base.isNullOrUndefined(templateData[0].BlazId))) {
                for (var i = 0; i < templateData.length; i++) {
                    blazIds.push(templateData[i].BlazId);
                    innerTemplates.push(templateData[i].BlazorTemplateId);
                }
            } else if (!ej.base.isNullOrUndefined(templateData)) {
                for (var i = 0; i < templateData.length; i++) {
                    innerTemplates.push(templateData[i].BlazorTemplateId);
                    innerTemplate = document.getElementById(innerTemplates[i]);
                    cloneTemplateData.push(JSON.parse(window.ejsInterop.cleanStringify(templateData[i])));
                    delete cloneTemplateData[i].BlazorTemplateId;
                }
            }
            var templateInstance = comp.templateDotnetInstance ? comp.templateDotnetInstance[name] || window.ejsInterop.templateDotnetInstance[comp.guid || name] : window.ejsInterop.templateDotnetInstance ? window.ejsInterop.templateDotnetInstance[comp.guid || name] : null;
            if (!templateInstance) {
                return;
            }
            templateInstance.invokeMethodAsync("UpdateTemplate", name, JSON.stringify(cloneTemplateData), templateId, innerTemplates, blazIds);
        }, 10);
    },

    setTemplateInstance: function (namespace, dotnetInstance, guid) {
        if (!ejsInterop.templateDotnetInstance) {
            ejsInterop.templateDotnetInstance = [];
        }
        ejsInterop.templateDotnetInstance[guid || namespace] = dotnetInstance;
    },

    setTemplate: function (templateId, name) {
        setTimeout(function () {
            if (templateId != null) {
                var template = document.getElementById(templateId);
                var innerTemplates = template.getElementsByClassName("blazor-inner-template");
                for (var i = 0; i < innerTemplates.length; i++) {

                    var tempId = innerTemplates[i].getAttribute("data-templateid");
                    var tempElement = document.getElementById(tempId);
                    if (tempElement && innerTemplates[i].childNodes) {
                        var length = innerTemplates[i].childNodes.length;
                        for (var j = 0; j < length; j++) {
                            tempElement.appendChild(innerTemplates[i].childNodes[0]);
                        }
                    } else if (tempElement) {
                        tempElement.innerHTML = innerTemplates[i].innerHTML;
                    }
                }
                if (window.ejsInterop.tempCallBacks.length) {
                    for (var p = 0; p < window.ejsInterop.tempCallBacks.length; p++) {
                        if (window.ejsInterop.tempCallBacks[p].Id == templateId) {
                            window.ejsInterop.tempCallBacks[p].Promise(window.ejsInterop.tempCallBacks[p].Id);
                            window.ejsInterop.tempCallBacks.splice(p, 1);
                        }
                    }
                }
            }
        }, 100);
    },
    invokeMethod: async function (elementId, methodName, moduleName, args) {
        try {
            var returnValue = null;
            args = JSON.parse(args, ejsInterop.parseRevive);
            var comp = document.getElementById(elementId) && document.getElementById(elementId).ej2_instances[0];
            if (comp) {
                if (moduleName === null) {
                    returnValue = comp[methodName].apply(comp, args);
                }
                else {
                    comp = ejsInterop.getDocEditor(comp, moduleName);
                    comp = window.ejsInterop.getChildModule(comp, moduleName);
                    returnValue = comp[methodName].apply(comp, args);
                    returnValue = await ejsInterop.promiseHandler(returnValue);
                }
                if (returnValue && typeof returnValue === "object" && !(returnValue instanceof Promise)) {
                    returnValue = ejsInterop.cleanStringify(returnValue);
                }
                if (comp.getModuleName() == 'PdfViewer' && methodName == 'saveAsBlob' && returnValue instanceof Promise) {
                    returnValue = await ejsInterop.promiseHandler(returnValue);
                }
                return returnValue;
            }
        }
        catch (e) {
            return window.ejsInterop.throwError(e, comp);
        }
    },
    promiseHandler: async function (returnValue) {
        if (returnValue instanceof Promise) {
            await returnValue.then(async function (data) {
                if (data instanceof Blob) {
                    await window.ejsInterop.docEditFileReader(data).then(function (dataUrl) {
                        returnValue = JSON.stringify({ "data": dataUrl.substr(dataUrl.indexOf(',') + 1) });
                    });
                } else {
                    returnValue = data;
                }
            });
        }
        return returnValue;
    },
    getDocEditor: function (comp, moduleName) {
        return (comp.getModuleName() === "DocumentEditorContainer" && moduleName !== "documentEditor") ? comp.documentEditor : comp;
    },
    getChildModule: function (comp, moduleName) {
        try {
            var path = moduleName.split(',');
            for (var i = 0; i < path.length; i++) {
                comp = comp[path[i]];
            }
            return comp;
        } catch (e) {
            window.ejsInterop.throwError(e, comp);
        }
    },
    getMethodCall: function (elementId, moduleName, methodName) {
        try {
            var comp = document.getElementById(elementId) && document.getElementById(elementId).ej2_instances[0];
            comp = ejsInterop.getDocEditor(comp);
            if (moduleName == null || moduleName == "null") {
                return comp[methodName];
            }
            else {
                comp = window.ejsInterop.getChildModule(comp, moduleName);
                return comp[methodName];
            }
        }
        catch (e) {
            window.ejsInterop.throwError(e, comp);
        }
    },
    setMethodCall: function (elementId, moduleName, methodName, args) {
        try {
            var comp = document.getElementById(elementId) && document.getElementById(elementId).ej2_instances[0];
            comp = ejsInterop.getDocEditor(comp);
            comp = window.ejsInterop.getChildModule(comp, moduleName);
            comp[methodName] = args[0];
        }
        catch (e) {
            window.ejsInterop.throwError(e, comp);
        }
    },
    parseRevive: function (key, value, templateRefs) {
        var dateRegex = new RegExp(/(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2}).*/);
        var arrayRegex = new RegExp(/^\[.*?\]$/);
        var objectRegex = new RegExp(/^\{.*?\}$/);
        if (key === "" && value && value.dataSource_custom) {
            value.dataSource_custom.key = value.dataSource.key;
            value.dataSource = value.dataSource_custom;
        }
        if (typeof value === "string" && (key === "query" || key === "formatter")) {
            return eval(value);
        }
        else if (ejsInterop.isDataSourceProperty(key)) {
            if (value === null) return;
            value = typeof value === "string" ? JSON.parse(value) : value;
            if (!value.adaptor || value instanceof ejs.data.DataManager) {
                return value;
            }
            value.adaptor = ejsInterop.getAdaptor(value.adaptor);
            var dataManager = new ej.data.DataManager(value);
            if (ejsInterop.dotnetInstance) {
                dataManager["dotnetInstance"] = ejsInterop.dotnetInstance;
                dataManager["key"] = value.key;
                if (dataManager.adaptor instanceof BlazorAdaptor) {
                    dataManager["adaptorName"] = "BlazorAdaptor";
                    dataManager.dataSource.offline = false;
                }
            }
            if (this[value.guid] || (templateRefs && templateRefs[value.guid])) {
                dataManager["baseAdaptorInstance"] = this[value.guid] || templateRefs[value.guid];
                dataManager["adaptorName"] = "CustomAdaptor";
            }
            return dataManager;
        }
        else if (typeof value === "string" && dateRegex.test(value)) {
            if (!arrayRegex.test(value)) {
                return new Date(value);
            } else {
                var values = JSON.parse(value);
                var val = []
                for (i = 0; i < values.length; i++) {
                    val.push(new Date(values[i]));
                }
                return val;
            }
        }
        else if (typeof value === "string" && (arrayRegex.test(value) || objectRegex.test(value)) && ejsInterop.isJson(value)) {
            return JSON.parse(value);
        }
        else if (typeof value === "string") {
            return ejsInterop.escapeChar(value);
        }
        return value;
    },

    escapeChar: function (str) {
        return str.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
    },

    triggerEJEvents: function (arg) {
        var data;
        try {
            if (arg) {
                arg["elementID"] = this["elementID"];
                data = this.dotnet.invokeMethodAsync("Trigger", this.eventName, window.ejsInterop.cleanStringify(arg));
            } else {
                data = this.dotnet.invokeMethodAsync("Trigger", this.eventName, '');
            }
        }
        catch (e) {
            window.ejsInterop.throwError(e, this);
        }
        return data;
    },

    getDomValue: function (object, key, value) {
        var elementID = object["elementID"];
        if (elementID && ej.base.isNullOrUndefined(window[elementID])) {
            window[elementID] = {};
        }
        var nodeValue = value.cloneNode();
        delete nodeValue.ej2_instances;
        var uuid = key + ej.base.getUniqueID(key);
        if (elementID) {
            window[elementID][uuid] = value;
        }
        return {
            id: value.id,
            class: value.className,
            ele: nodeValue,
            xPath: window.ejsInterop.createXPathFromElement(value),
            domUUID: uuid,
            elementID: elementID
        }
    },

    copyWithoutCircularReferences: function (references, object) {
        try {
            var isArray = object && Array.isArray(object);
            var cleanObject = isArray ? [] : {};
            var keys = isArray ? object : (object instanceof Node ? [object] : ejsInterop.getObjectKeys(object));
            keys.forEach(async function (key) {
                var value = isArray ? key : object[key];
                if (isArray && (typeof value === "string" || typeof value === "number")) {
                    cleanObject.push(value);
                }
                else if (value instanceof Node) {
                    var elementID = object["elementID"];
                    if (elementID && ej.base.isNullOrUndefined(window[elementID]))
                        window[elementID] = {};
                    var nodeValue = value.cloneNode();
                    if (nodeValue && Array.isArray(nodeValue)) {
                        nodeValue = window.ejsInterop.copyWithoutCircularReferences(references, nodeValue);
                    }
                    delete nodeValue.ej2_instances;
                    var uuid = key + ej.base.getUniqueID(key);
                    if (elementID) window[elementID][uuid] = value;
                    var domObject = {
                        id: value.id,
                        class: value.className,
                        ele: nodeValue,
                        xPath: window.ejsInterop.createXPathFromElement(value),
                        domUUID: uuid,
                        elementID: elementID
                    };
                    if (isArray) {
                        cleanObject.push(domObject);
                    }
                    else {
                        cleanObject[key] = domObject;
                    }
                }

                else if (value && Array.isArray(value)) {
                    for (var i = 0; i < value.length; i++) {
                        if (!cleanObject[key]) cleanObject[key] = [];
                        if (key !== 'ej2_instances') {
                            if (value[i] && typeof value[i] === 'object' && !(value[i] instanceof Date)) {
                                cleanObject[key].push(window.ejsInterop.copyWithoutCircularReferences(references, value[i]));
                            }
                            else {
                                cleanObject[key].push(value[i]);
                            }
                        }
                    }
                }
                else if (value && window.ejsInterop.isJson(value) && (new RegExp(/^\[.*?\]$/).test(value))) {
                    var arrValues = JSON.parse(value);
                    if (!cleanObject[key]) cleanObject[key] = [];
                    for (var ij = 0; ij < arrValues.length; ij++) {
                        cleanObject[key].push(arrValues[ij]);
                    }
                }
                else if (value && value instanceof Event) {
                    var eventObj = {};
                    for (var propKey in value) {
                        var eventValue = value[propKey];
                        if (!(eventValue instanceof Node || eventValue instanceof Window) && propKey !== "path") {
                            eventObj[propKey] = eventValue;
                        }
                    }
                    cleanObject[key] = eventObj;
                }
                else if (value && typeof value === 'object') {
                    if (value instanceof File) {
                        cleanObject[key] = value;
                    } else if (references.indexOf(value) < 0) {
                        references.push(value);
                        if (value && value instanceof Date) {
                            cleanObject[key] = value;
                        } else if (ejsInterop.isJsonStringfy(value) && !ejsInterop.doesHaveFileObject(value)) {
                            isArray ? cleanObject.push(value) : cleanObject[key] = value;
                        }
                        else {
                            if (!ejsInterop.isIgnoreProperty(key.toString())) {
                                cleanObject[key] = window.ejsInterop.copyWithoutCircularReferences(references, value);
                            }
                            else {
                                cleanObject[key] = '###_Circular_###';
                            }
                        }
                        references.pop();
                    } else {
                        cleanObject[key] = '###_Circular_###';
                    }
                }
                else if (typeof value !== 'function') {
                    cleanObject[key] = value;
                }
            });
            return cleanObject;
        }
        catch (e) {
            console.log(e);
            return {};
        }
    },
    doesHaveFileObject: function (obj) {
        var keys = Object.keys(obj);
        for (var m = 0; m < keys.length; m++) {
            if (obj[keys[m]] instanceof File) {
                return true;
            }
        }
        return false;
    },
    isJsonStringfy: function (args) {
        try {
            return JSON.stringify(args) && true;
        } catch (e) {
            return false;
        }
    },
    getObjectKeys: function (obj) {
        var objectKeys = [];
        if (obj instanceof Event) {
            objectKeys = Object.keys(obj);
        } else {
            for (var key in obj) {
                objectKeys.push(key);
            }
        }
        return objectKeys;
    },
    isIgnoreProperty: function (key) {
        return ['parentObj', 'controlParent', 'modelObserver', 'localObserver', 'moduleLoader'].indexOf(key) >= 0;
    },
    isJson: function (value) {
        try {
            return JSON.parse(value);
        } catch (e) {
            return false;
        }
    },
    cleanStringify: function (object) {
        try {
            if (object && typeof object === 'object') {
                object = window.ejsInterop.copyWithoutCircularReferences([object], object);
            }
            return JSON.stringify(object);
        }
        catch (e) {
            console.log(e);
            return '';
        }
    },
    bindEvents: function (modelObj, events, dotnet, namespace) {
        if (events) {
            for (var i = 0; i < events.length; i = i + 1) {
                var curEvent = events[i];
                var scope = { dotnet: dotnet, eventName: curEvent, elementID: modelObj["elementID"], namespace: namespace };
                if (curEvent.indexOf('.') > 0) {
                    var items = curEvent.split('.');
                    var currentObject = modelObj;
                    for (var j = 0; j < items.length - 1; j++) {
                        var arrayIndex = new RegExp(/\[.*?\]/);
                        if (arrayIndex.test(items[j])) {
                            var index = items[j].match(arrayIndex)[0];
                            var prop = items[j].replace(index, "");
                            index = index.match(/\[(.*?)\]/)[1];
                            j += 1;
                            currentObject = currentObject[prop][index];
                        } else {
                            currentObject = currentObject[items[j]];
                        }
                    }
                    currentObject[items[items.length - 1]] = window.ejsInterop.triggerEJEvents.bind(scope);
                } else {
                    modelObj[curEvent] = window.ejsInterop.triggerEJEvents.bind(scope);
                }
            }
        }
    },
    tryParseInt: function (val) {
        var numRegex = /^-?\d+\.?\d*$/;
        return numRegex.test(val);
    },
    throwError: function (e, comp) {
        // comp._dotnetInstance.invokeMethodAsync("ErrorHandling", e.message, e.stack);
        console.error(e.message + "\n" + e.stack);
    },
    compareValues: function (newValue, oldValue) {
        if (newValue instanceof Date && oldValue instanceof Date) {
            return +newValue !== +oldValue;
        }
        else if (Array.isArray(newValue) && newValue[0] instanceof Date && Array.isArray(oldValue) && oldValue[0] instanceof Date) {
            for (var i = 0; i < newValue.length; i++) {
                return +newValue[i] !== +oldValue[i];
            }
        }
        else if (typeof newValue === "object" || typeof oldValue === "object") {
            if ((newValue && newValue.dotnetInstance) && (oldValue && oldValue.dotnetInstance)) return false;
            newValue = typeof newValue === "string" ? newValue : ejsInterop.cleanStringify(newValue);
            oldValue = typeof oldValue === "string" ? oldValue : ejsInterop.cleanStringify(oldValue);
            return newValue !== oldValue;
        }
        return newValue !== oldValue;
    },
    getAdaptor: function (adaptor) {
        var adaptorObject;
        switch (adaptor) {
            case "ODataAdaptor":
                adaptorObject = new ejs.data.ODataAdaptor();
                break;
            case "ODataV4Adaptor":
                adaptorObject = new ejs.data.ODataV4Adaptor();
                break;
            case "UrlAdaptor":
                adaptorObject = new ejs.data.UrlAdaptor();
                break;
            case "WebApiAdaptor":
                adaptorObject = new ejs.data.WebApiAdaptor();
                break;
            case "JsonAdaptor":
                adaptorObject = new ejs.data.JsonAdaptor();
                break;
            case "RemoteSaveAdaptor":
                adaptorObject = new ejs.data.RemoteSaveAdaptor();
                break;
            case "CustomAdaptor":
                ejsInterop.initCustomAdaptor();
                adaptorObject = new window.CustomAdaptor();
                break;
            default:
                adaptorObject = new window.BlazorAdaptor();
                break;
        }
        return adaptorObject;
    },
	spinnerUtility: function (action, options, target, type) {
        try {
            ejs.popups.blazorSpinner(action, options, target, type);
        }
        catch (e) {
            return window.ejsInterop.throwError(e);
        }
    },
    initBlazorAdaptor: function () {
        window.BlazorAdaptor = class BlazorAdaptor extends ejs.data.UrlAdaptor {
            processQuery(dm, query, hierarchyFilters) {
                var request = ej.data.UrlAdaptor.prototype.processQuery.apply(this, arguments);
                request.dotnetInstance = dm.dotnetInstance;
                request.key = dm.key;
                return request;
            }
            makeRequest(request, deffered, args, query) {
                var process = function (data, aggregates, virtualSelectRecords) {
                    var args = {};
                    args.count = data.count ? parseInt(data.count.toString(), 10) : 0;
                    args.result = data.result ? data.result : data;
                    args.aggregates = data.aggregates;
                    args.virtualSelectRecords = virtualSelectRecords;
                    deffered.resolve(args);
                };
                var dm = JSON.parse(request.data);
                var proxy = this;
                request.dotnetInstance.invokeMethodAsync("DataProcess", JSON.stringify(dm), request.key).then(data => {
                    data = ej.data.DataUtil.parse.parseJson(data);
                    if (data === null) {
                        data = [];
                    } else if (data.result === null) {
                        data.result = [];
                    }
                    var pResult = proxy.processResponse(data, {}, query, null, request);
                    process(pResult);
                    return;
                });
            }
            insert(dm, data, tableName, query, position) {
                var args = {};
                args.dm = dm;
                args.data = data;
                args.tableName = tableName;
                args.query = query;
                args.requestType = "insert";
                args.position = position;
                return args;
            }
            remove(dm, keyField, value, tableName, query) {
                var args = {};
                args.dm = dm;
                args.data = value;
                args.keyField = keyField;
                args.tableName = tableName;
                args.query = query;
                args.requestType = "remove";
                return args;
            }
            update(dm, keyField, value, tableName, query) {
                var args = {};
                args.dm = dm;
                args.data = value;
                args.keyField = keyField;
                args.tableName = tableName;
                args.query = query;
                args.requestType = "update";
                return args;
            }
            batchRequest(dm, changes, e, query, original) {
                var args = {};
                args.dm = dm;
                args.changed = changes.changedRecords;
                args.added = changes.addedRecords;
                args.deleted = changes.deletedRecords;
                args.requestType = "batchsave";
                args.keyField = e.key
                args.dropIndex = !ej.base.isNullOrUndefined(query) ? query.dragDropDestinationIndex : 0;
                return args;
            }
            doAjaxRequest(args) {
                var defer = new ej.data.Deferred();
                var dm = args.dm;
                if (args.requestType === "insert") {
                    dm.dotnetInstance.invokeMethodAsync('Insert', JSON.stringify(args.data), dm.key, args.position ? args.position : 0).then(data => {
                        defer.resolve(data);
                    });
                }
                if (args.requestType === "remove") {
                    dm.dotnetInstance.invokeMethodAsync('Remove', JSON.stringify(args.data), args.keyField, dm.key).then(data => {
                        defer.resolve();
                    });
                }
                if (args.requestType === "update") {
                    dm.dotnetInstance.invokeMethodAsync('Update', JSON.stringify(args.data), args.keyField, dm.key).then(data => {
                        var record = ej.data.DataUtil.parse.parseJson(data);
                        defer.resolve(record);
                    });
                }
                if (args.requestType === "batchsave") {
                    dm.dotnetInstance.invokeMethodAsync('BatchUpdate', JSON.stringify(args.changed), JSON.stringify(args.added), JSON.stringify(args.deleted), args.keyField, dm.key, args.dropIndex ? args.dropIndex : 0).then(data => {
                        defer.resolve(data);
                    });
                }
                return defer.promise;
            }
        };
    },
    initCustomAdaptor: function () {
        window.CustomAdaptor = class CustomAdaptor extends window.BlazorAdaptor {
            processQuery(dm, query, hierarchyFilters) {
                var request = ej.data.UrlAdaptor.prototype.processQuery.apply(this, arguments);
                request.dotnetInstance = dm.dotnetInstance;
                request.baseAdaptorInstance = dm.baseAdaptorInstance;
                request.key = dm.key;
                return request;
            }
            makeRequest(request, deffered, args, query) {
                var process = function (data, aggregates, virtualSelectRecords) {
                    var args = {};
                    args.count = data.count ? parseInt(data.count.toString(), 10) : 0;
                    args.result = data.result ? data.result : data;
                    args.aggregates = aggregates;
                    args.virtualSelectRecords = virtualSelectRecords;
                    deffered.resolve(args);
                };
                var dm = JSON.parse(request.data);
                var proxy = this;
                request["baseAdaptorInstance"].invokeMethodAsync("BaseRead", JSON.stringify(dm), request.key).then(data => {
                    data = ej.data.DataUtil.parse.parseJson(data);
                    if (data.result === null) {
                        data.result = [];
                    }
                    var pResult = proxy.processResponse(data, {}, query, null, request);
                    process(pResult);
                    return;
                });
            }
            doAjaxRequest(args) {
                var defer = new ej.data.Deferred();
                var dm = args.dm;
                if (args.requestType === "insert") {
                    dm.baseAdaptorInstance.invokeMethodAsync('BaseInsert', JSON.stringify(args.data), dm.key).then(data => {
                        data = ej.data.DataUtil.parse.parseJson(data);
                        defer.resolve(data);
                    });
                }
                if (args.requestType === "remove") {
                    dm.baseAdaptorInstance.invokeMethodAsync('BaseRemove', JSON.stringify(args.data), args.keyField, dm.key).then(data => {
                        data = ej.data.DataUtil.parse.parseJson(data);
                        defer.resolve(data);
                    });
                }
                if (args.requestType === "update") {
                    dm.baseAdaptorInstance.invokeMethodAsync('BaseUpdate', JSON.stringify(args.data), args.keyField, dm.key).then(data => {
                        data = ej.data.DataUtil.parse.parseJson(data);
                        defer.resolve(data);
                    });
                }
                if (args.requestType === "batchsave") {
                    dm.baseAdaptorInstance.invokeMethodAsync('BaseBatchUpdate', JSON.stringify(args.changed), JSON.stringify(args.added), JSON.stringify(args.deleted), args.keyField, dm.key).then(data => {
                        data = ej.data.DataUtil.parse.parseJson(data);
                        defer.resolve(data);
                    });
                }
                return defer.promise;
            }
        };
    },
    requestHandler: function (jsonObject) {
        try {
            this._dotnetInstance.invokeMethodAsync('GetPDFInfo', jsonObject);
        }
        catch (e) {
            window.ejsInterop.throwError(e, this);
        }
    },
    ioSuccessHandler: function (id, namespace, action, jsonResult) {
        try {
            var comp = document.getElementById(id).ej2_instances[0];
            var result = { data: jsonResult };
            if (namespace == 'ejs.pdfviewer.PdfViewer') {
                switch (action) {
                    case 'Load':
                        comp.viewerBase.loadRequestHandler.successHandler(result);
                        break;
                    case "RenderPdfPages":
                        comp.viewerBase.pageRequestHandler.successHandler(result);
                        break;
                    case "VirtualLoad":
                        comp.viewerBase.virtualLoadRequestHandler.successHandler(result);
                        break;
                    case "Download":
                        comp.viewerBase.dowonloadRequestHandler.successHandler(result);
                        break;
                    case "PrintImages":
                        comp.printModule.printRequestHandler.successHandler(result);
                        break;
                    case "Search":
                        comp.textSearchModule.searchRequestHandler.successHandler(result);
                        break;
                    case "Bookmarks":
                        comp.bookmarkViewModule.bookmarkRequestHandler.successHandler(result);
                        break;
                    case "RenderThumbnailImages":
                        comp.thumbnailViewModule.thumbnailRequestHandler.successHandler(result);
                        break;
                    case "RenderAnnotationComments":
                        comp.annotationModule.stickyNotesAnnotationModule.commentsRequestHandler.successHandler(result);
                        break;
                    case "ImportAnnotations":
                        comp.viewerBase.importAnnotationRequestHandler.successHandler(result);
                        break;
                    case "ExportAnnotations":
                        comp.viewerBase.exportAnnotationRequestHandler.successHandler(result);
                        break;
                }
            }
            if (namespace == 'ejs.documenteditor.DocumentEditorContainer' || namespace == 'ejs.documenteditor.DocumentEditor') {
                var docEditorComp = ejsInterop.getDocEditor(comp);
                switch (action) {
                    case 'SystemClipboard':
                        result.data = JSON.parse(result.data);
                        docEditorComp.editor.pasteRequestHandler.successHandler(result);
                        break;
                    case 'Import':
                        comp.toolbarModule.importHandler.successHandler(result);
                        break;
                    case 'EnforceProtection':
                        docEditorComp.viewer.restrictEditingPane.enforceProtectionDialog.enforceProtection(result)
                        break;
                    case 'UnprotectDocument':
                        docEditorComp.viewer.restrictEditingPane.unProtectDialog.onUnProtectionSuccess(result)
                        break;
                }
            }
        }
        catch (e) {
            window.ejsInterop.throwError(e, this);
        }
    },
    docEditRequestHandler: async function (jsonObject) {
        try {
            if (jsonObject instanceof FormData) {
                var file = jsonObject.get('files');
                var dataUrl = "";
                await window.ejsInterop.docEditFileReader(file).then(function (data) {
                    dataUrl = data;
                });
                var fileInfo = {
                    "documentData": dataUrl.substr(dataUrl.indexOf(',') + 1),
                    "fileName": file.name,
                    "action": 'Import'
                };
                this._dotnetInstance.invokeMethodAsync('GetDocumentInfo', fileInfo);
            } else {
                if (jsonObject.hasOwnProperty('saltBase64')) {
                    jsonObject['action'] = jsonObject.saltBase64 === '' ? 'EnforceProtection' : 'UnprotectDocument';
                } else if (jsonObject.hasOwnProperty('type') && jsonObject.hasOwnProperty('content')) {
                    jsonObject['action'] = 'SystemClipboard';
                }
                this._dotnetInstance.invokeMethodAsync('GetDocumentInfo', jsonObject);
            }
        }
        catch (e) {
            window.ejsInterop.throwError(e, this);
        }
    },
    docEditFileReader: function (file) {
        try {
            return new Promise(function (resolve, reject) {
                var fileReader = new FileReader();
                fileReader.onload = function () {
                    resolve(fileReader.result)
                };
                fileReader.readAsDataURL(file);
            });
        } catch (e) {
            window.ejsInterop.throwError(e, this);
        }
    }
};
