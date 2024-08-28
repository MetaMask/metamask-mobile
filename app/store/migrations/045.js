"use strict";
exports.__esModule = true;
var react_native_1 = require("@sentry/react-native");
var utils_1 = require("@metamask/utils");
var util_1 = require("./util");
/**
 * Migration to update state of GasFeeController
 *
 * @param state Persisted Redux state
 * @returns
 */
function migrate(state) {
    if (!(0, util_1.ensureValidState)(state, 45)) {
        return state;
    }
    var gasFeeControllerState = state.engine.backgroundState.GasFeeController;
    if (!(0, utils_1.isObject)(gasFeeControllerState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 45: Invalid GasFeeController state error: '".concat(JSON.stringify(gasFeeControllerState), "'")));
        return state;
    }
    gasFeeControllerState.nonRPCGasFeeApisDisabled = false;
    return state;
}
exports["default"] = migrate;
