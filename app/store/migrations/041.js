"use strict";
exports.__esModule = true;
var react_native_1 = require("@sentry/react-native");
var utils_1 = require("@metamask/utils");
var util_1 = require("./util");
/**
 * Migration to reset state of TokenBalancesController
 *
 * @param state Persisted Redux state
 * @returns
 */
function migrate(state) {
    if (!(0, util_1.ensureValidState)(state, 41)) {
        return state;
    }
    var tokenBalancesControllerState = state.engine.backgroundState.TokenBalancesController;
    if (!(0, utils_1.isObject)(tokenBalancesControllerState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 41: Invalid TokenBalancesController state error: '".concat(JSON.stringify(tokenBalancesControllerState), "'")));
        return state;
    }
    tokenBalancesControllerState.contractBalances = {};
    return state;
}
exports["default"] = migrate;
