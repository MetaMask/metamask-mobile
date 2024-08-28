"use strict";
exports.__esModule = true;
var utils_1 = require("@metamask/utils");
var util_1 = require("./util");
var react_native_1 = require("@sentry/react-native");
var controller_utils_1 = require("@metamask/controller-utils");
/**
 * Migration to fix the "No network client ID was provided" bug (#9973) and "Engine does not exist" (#9958).
 *
 * This migration fixes corrupted `networkConfigurations` state, which was introduced in v7.7.0
 * in migration 20. This corrupted state did not cause an error until v7.24.0.
 *
 * The problem was that some `networkConfigurations` entries were missing an `id` property. It has
 * been restored. `selectedNetworkClientId` may have been erased as a side-effect of this invalid
 * state, so it has been normalized here to match the `providerConfig` state, or reset to the
 * default (main net).
 *
 * @param state Persisted Redux state that is potentially corrupted
 * @returns Valid persisted Redux state
 */
function migrate(state) {
    var _c, _d;
    if (!(0, util_1.ensureValidState)(state, 43)) {
        return state;
    }
    var networkControllerState = state.engine.backgroundState.NetworkController;
    if (!(0, utils_1.isObject)(networkControllerState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 43: Invalid NetworkController state: '".concat(typeof networkControllerState, "'")));
        return state;
    }
    if (!(0, utils_1.isObject)(networkControllerState.networkConfigurations) ||
        !(0, utils_1.hasProperty)(networkControllerState, 'networkConfigurations')) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 43: Invalid NetworkController networkConfigurations state: '".concat(typeof networkControllerState.networkConfigurations, "'")));
        return state;
    }
    if (Object.values(networkControllerState.networkConfigurations).some(function (networkConfiguration) { return !(0, utils_1.isObject)(networkConfiguration); })) {
        var invalidEntry = Object.entries(networkControllerState.networkConfigurations).find(function (_c) {
            var _ = _c[0], networkConfiguration = _c[1];
            return !(0, utils_1.isObject)(networkConfiguration);
        });
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 43: Invalid NetworkController network configuration entry with id: '".concat(invalidEntry === null || invalidEntry === void 0 ? void 0 : invalidEntry[0], "', type: '").concat(typeof (invalidEntry === null || invalidEntry === void 0 ? void 0 : invalidEntry[1]), "'")));
        return state;
    }
    if (!(0, utils_1.isObject)(networkControllerState.providerConfig) ||
        !(0, utils_1.hasProperty)(networkControllerState, 'providerConfig')) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 43: Invalid NetworkController providerConfig state: '".concat(typeof networkControllerState.providerConfig, "'")));
        return state;
    }
    Object.entries(networkControllerState.networkConfigurations).forEach(function (_c) {
        var networkConfigurationId = _c[0], networkConfiguration = _c[1];
        if ((0, utils_1.isObject)(networkConfiguration) && !networkConfiguration.id) {
            networkConfiguration.id = networkConfigurationId;
        }
    });
    if (!networkControllerState.selectedNetworkClientId) {
        var rpcUrl_1 = networkControllerState.providerConfig.rpcUrl;
        var selectedNetworkId = (_c = networkControllerState.providerConfig.id) !== null && _c !== void 0 ? _c : (_d = Object.entries(networkControllerState.networkConfigurations).find(function (_c) {
            var networkConfiguration = _c[1];
            return (0, utils_1.isObject)(networkConfiguration) &&
                networkConfiguration.rpcUrl === rpcUrl_1;
        })) === null || _d === void 0 ? void 0 : _d[0];
        if (selectedNetworkId) {
            networkControllerState.selectedNetworkClientId = selectedNetworkId;
            networkControllerState.providerConfig.id = selectedNetworkId;
        }
        else {
            networkControllerState.selectedNetworkClientId =
                controller_utils_1.InfuraNetworkType.mainnet;
        }
    }
    return state;
}
exports["default"] = migrate;
