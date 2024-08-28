"use strict";
exports.__esModule = true;
exports.createSellNavigationDetails = exports.createBuyNavigationDetails = void 0;
var types_1 = require("../types");
var Routes_1 = require("../../../../constants/navigation/Routes");
function createRampNavigationDetails(rampType, intent) {
    var route = rampType === types_1.RampType.BUY ? Routes_1["default"].RAMP.BUY : Routes_1["default"].RAMP.SELL;
    if (!intent) {
        return [route];
    }
    return [route, { screen: Routes_1["default"].RAMP.GET_STARTED, params: intent }];
}
function createBuyNavigationDetails(intent) {
    return createRampNavigationDetails(types_1.RampType.BUY, intent);
}
exports.createBuyNavigationDetails = createBuyNavigationDetails;
function createSellNavigationDetails(intent) {
    return createRampNavigationDetails(types_1.RampType.SELL, intent);
}
exports.createSellNavigationDetails = createSellNavigationDetails;
