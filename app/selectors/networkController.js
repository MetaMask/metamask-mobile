"use strict";
exports.__esModule = true;
exports.selectNetworkClientId = exports.selectNetworkConfigurations = exports.selectNetworkStatus = exports.selectRpcUrl = exports.selectNickname = exports.selectProviderType = exports.selectChainId = exports.selectTicker = exports.selectProviderConfig = void 0;
var reselect_1 = require("reselect");
var util_1 = require("./util");
var selectNetworkControllerState = function (state) { var _c, _d; return (_d = (_c = state === null || state === void 0 ? void 0 : state.engine) === null || _c === void 0 ? void 0 : _c.backgroundState) === null || _d === void 0 ? void 0 : _d.NetworkController; };
exports.selectProviderConfig = (0, util_1.createDeepEqualSelector)(selectNetworkControllerState, function (networkControllerState) {
    return networkControllerState === null || networkControllerState === void 0 ? void 0 : networkControllerState.providerConfig;
});
exports.selectTicker = (0, reselect_1.createSelector)(exports.selectProviderConfig, function (providerConfig) { return providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.ticker; });
exports.selectChainId = (0, reselect_1.createSelector)(exports.selectProviderConfig, function (providerConfig) { return providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.chainId; });
exports.selectProviderType = (0, reselect_1.createSelector)(exports.selectProviderConfig, function (providerConfig) { return providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.type; });
exports.selectNickname = (0, reselect_1.createSelector)(exports.selectProviderConfig, function (providerConfig) { return providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.nickname; });
exports.selectRpcUrl = (0, reselect_1.createSelector)(exports.selectProviderConfig, function (providerConfig) { return providerConfig.rpcUrl; });
exports.selectNetworkStatus = (0, reselect_1.createSelector)(selectNetworkControllerState, function (networkControllerState) {
    return networkControllerState === null || networkControllerState === void 0 ? void 0 : networkControllerState.networksMetadata[networkControllerState.selectedNetworkClientId].status;
});
exports.selectNetworkConfigurations = (0, reselect_1.createSelector)(selectNetworkControllerState, function (networkControllerState) {
    return networkControllerState.networkConfigurations;
});
exports.selectNetworkClientId = (0, reselect_1.createSelector)(selectNetworkControllerState, function (networkControllerState) {
    return networkControllerState.selectedNetworkClientId;
});
