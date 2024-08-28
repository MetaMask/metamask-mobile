"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var preProcessAnalyticsEvent_1 = require("./preProcessAnalyticsEvent");
function isEventProperties(properties) {
    return (properties &&
        typeof properties === 'object' &&
        ('properties' in properties || 'sensitiveProperties' in properties));
}
/**
 * Convert legacy properties to the new EventProperties type if needed
 *
 * There are two types of legacy properties:
 * - properties with the new structure (properties and sensitiveProperties) but with anonymous properties inside properties
 * - properties with the old structure (just a JsonMap) and possibly anonymous properties inside
 *
 * If the properties are already of the new type, they are returned as is
 * @param propertiesParam the properties to check for conversion and convert if needed
 */
function convertLegacyProperties(propertiesParam) {
    if (isEventProperties(propertiesParam)) {
        // EventProperties non-anonymous properties could have anonymous properties inside
        // so we need to process them separately
        if (propertiesParam.properties &&
            Object.keys(propertiesParam.properties).length) {
            var _c = (0, preProcessAnalyticsEvent_1["default"])(propertiesParam.properties), nonAnonymousProperties_1 = _c[0], anonymousProperties_1 = _c[1];
            return {
                properties: nonAnonymousProperties_1,
                // and concatenate all the anon props in sensitiveProperties
                sensitiveProperties: __assign(__assign({}, anonymousProperties_1), propertiesParam.sensitiveProperties)
            };
        }
        // If there are no non-anonymous properties, we don't need to process them
        // and we can return the object as is
        return propertiesParam;
    }
    // if the properties are not of the new type, we need to process them
    var _d = (0, preProcessAnalyticsEvent_1["default"])(propertiesParam), nonAnonymousProperties = _d[0], anonymousProperties = _d[1];
    return {
        properties: nonAnonymousProperties,
        sensitiveProperties: anonymousProperties
    };
}
exports["default"] = convertLegacyProperties;
