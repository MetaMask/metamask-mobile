"use strict";
exports.__esModule = true;
exports.selectUseTransactionSimulations = exports.selectSmartTransactionsOptInStatus = exports.selectIsSecurityAlertsEnabled = exports.selectIsIpfsGatewayEnabled = exports.selectShowIncomingTransactionNetworks = exports.selectShowTestNetworks = exports.selectIsMultiAccountBalancesEnabled = exports.selectDisabledRpcMethodPreferences = exports.selectUseSafeChainsListValidation = exports.selectDisplayNftMedia = exports.selectUseTokenDetection = exports.selectUseNftDetection = exports.selectIpfsGateway = void 0;
var reselect_1 = require("reselect");
var selectPreferencesControllerState = function (state) {
    return state.engine.backgroundState.PreferencesController;
};
exports.selectIpfsGateway = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.ipfsGateway;
});
exports.selectUseNftDetection = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.useNftDetection;
});
exports.selectUseTokenDetection = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.useTokenDetection;
});
exports.selectDisplayNftMedia = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.displayNftMedia;
});
exports.selectUseSafeChainsListValidation = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.useSafeChainsListValidation;
});
exports.selectDisabledRpcMethodPreferences = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.disabledRpcMethodPreferences;
});
// isMultiAccountBalancesEnabled is a patched property - ref patches/@metamask+preferences-controller+2.1.0.patch
exports.selectIsMultiAccountBalancesEnabled = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.isMultiAccountBalancesEnabled;
});
// showTestNetworks is a patched property - ref patches/@metamask+preferences-controller+2.1.0.patch
exports.selectShowTestNetworks = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.showTestNetworks;
});
exports.selectShowIncomingTransactionNetworks = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.showIncomingTransactions;
});
exports.selectIsIpfsGatewayEnabled = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.isIpfsGatewayEnabled;
});
exports.selectIsSecurityAlertsEnabled = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.securityAlertsEnabled;
});
exports.selectSmartTransactionsOptInStatus = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.smartTransactionsOptInStatus;
});
exports.selectUseTransactionSimulations = (0, reselect_1.createSelector)(selectPreferencesControllerState, function (preferencesControllerState) {
    return preferencesControllerState.useTransactionSimulations;
});
