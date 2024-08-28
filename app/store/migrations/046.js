"use strict";
exports.__esModule = true;
var transaction_controller_1 = require("@metamask/transaction-controller");
var react_native_1 = require("@sentry/react-native");
var utils_1 = require("@metamask/utils");
var controller_utils_1 = require("@metamask/controller-utils");
var urls_1 = require("../../../app/constants/urls");
var util_1 = require("./util");
var network_1 = require("../../constants/network");
function migrate(state) {
    if (!(0, util_1.ensureValidState)(state, 46)) {
        return state;
    }
    if (!(0, utils_1.isObject)(state.engine)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 46: Invalid engine state error: '".concat(typeof state.engine, "'")));
        return state;
    }
    if (!(0, utils_1.isObject)(state.engine.backgroundState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 46: Invalid engine backgroundState error: '".concat(typeof state
            .engine.backgroundState, "'")));
        return state;
    }
    var networkControllerState = state.engine.backgroundState
        .NetworkController;
    if (!(0, utils_1.isObject)(networkControllerState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 46: Invalid NetworkController state error: '".concat(typeof networkControllerState, "'")));
        return state;
    }
    if (!networkControllerState.providerConfig) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 46: NetworkController providerConfig not found: '".concat(JSON.stringify(networkControllerState.providerConfig), "'")));
        return state;
    }
    if (!networkControllerState.providerConfig.chainId) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 46: NetworkController providerConfig chainId not found: '".concat(JSON.stringify(networkControllerState.providerConfig.chainId), "'")));
        return state;
    }
    var chainId = networkControllerState.providerConfig.chainId;
    // If user on linea goerli, fallback to linea Sepolia
    if (chainId === transaction_controller_1.CHAIN_IDS.LINEA_GOERLI) {
        networkControllerState.providerConfig = {
            chainId: transaction_controller_1.CHAIN_IDS.LINEA_SEPOLIA,
            ticker: network_1.CHAINLIST_CURRENCY_SYMBOLS_MAP.LINEA_GOERLI,
            rpcPrefs: {
                blockExplorerUrl: urls_1.LINEA_SEPOLIA_BLOCK_EXPLORER
            },
            type: controller_utils_1.NetworkType['linea-sepolia']
        };
        networkControllerState.selectedNetworkClientId =
            controller_utils_1.NetworkType['linea-sepolia'];
    }
    return state;
}
exports["default"] = migrate;
