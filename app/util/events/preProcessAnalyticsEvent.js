"use strict";
exports.__esModule = true;
function preProcessAnalyticsEvent(properties) {
    var nonAnonymousProperties = {};
    var anonymousProperties = {};
    if (properties) {
        Object.keys(properties).forEach(function (key) {
            var property = properties[key];
            if (property &&
                typeof property === 'object' &&
                !Array.isArray(property)) {
                if (property.anonymous) {
                    // Anonymous property - add only to anonymous properties
                    anonymousProperties[key] = property.value;
                }
                else {
                    // Non-anonymous property - add only to non-anonymous properties
                    nonAnonymousProperties[key] = property.value;
                }
            }
            else {
                // Non-anonymous properties - add only to non-anonymous properties
                nonAnonymousProperties[key] = property;
            }
        });
    }
    return [nonAnonymousProperties, anonymousProperties];
}
exports["default"] = preProcessAnalyticsEvent;
