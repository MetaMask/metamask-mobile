"use strict";
exports.__esModule = true;
var react_native_1 = require("@sentry/react-native");
var utils_1 = require("@metamask/utils");
var util_1 = require("./util");
/**
 * Migration to remove contractExchangeRates and contractExchangeRatesByChainId from the state of TokenRatesController
 *
 * @param state Persisted Redux state
 * @returns
 */
function migrate(state) {
    if (!(0, util_1.ensureValidState)(state, 48)) {
        return state;
    }
    var tokenRatesControllerState = state.engine.backgroundState.TokenRatesController;
    if (!(0, utils_1.isObject)(tokenRatesControllerState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 48: Invalid TokenRatesController state error: '".concat(typeof tokenRatesControllerState, "'")));
        return state;
    }
    delete tokenRatesControllerState.contractExchangeRates;
    delete tokenRatesControllerState.contractExchangeRatesByChainId;
    return state;
}
exports["default"] = migrate;
