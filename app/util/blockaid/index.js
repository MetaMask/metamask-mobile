"use strict";
exports.__esModule = true;
exports.getBlockaidTransactionMetricsParams = exports.getBlockaidMetricsParams = exports.isBlockaidFeatureEnabled = exports.isBlockaidPreferenceEnabled = exports.isBlockaidSupportedOnCurrentChain = exports.isSupportedChainId = void 0;
var Engine_1 = require("../../core/Engine");
var BlockaidBanner_types_1 = require("../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types");
var networks_1 = require("../networks");
var store_1 = require("../../store");
var networkController_1 = require("../../selectors/networkController");
var isSupportedChainId = function (chainId) {
    /**
     * Quite a number of our test cases return undefined as chainId from state.
     * In such cases, the tests don't really care about the chainId.
     * So, this treats undefined chainId as mainnet for now.
     * */
    if (chainId === undefined) {
        return true;
    }
    var isSupported = networks_1.BLOCKAID_SUPPORTED_CHAIN_IDS.some(function (id) { return (0, networks_1.getDecimalChainId)(id) === (0, networks_1.getDecimalChainId)(chainId); });
    return isSupported;
};
exports.isSupportedChainId = isSupportedChainId;
var isBlockaidSupportedOnCurrentChain = function () {
    var chainId = (0, networkController_1.selectChainId)(store_1.store.getState());
    return (0, exports.isSupportedChainId)(chainId);
};
exports.isBlockaidSupportedOnCurrentChain = isBlockaidSupportedOnCurrentChain;
var isBlockaidPreferenceEnabled = function () {
    var PreferencesController = Engine_1["default"].context.PreferencesController;
    return PreferencesController.state.securityAlertsEnabled;
};
exports.isBlockaidPreferenceEnabled = isBlockaidPreferenceEnabled;
var isBlockaidFeatureEnabled = function () {
    return (0, exports.isBlockaidSupportedOnCurrentChain)() && (0, exports.isBlockaidPreferenceEnabled)();
};
exports.isBlockaidFeatureEnabled = isBlockaidFeatureEnabled;
var getBlockaidMetricsParams = function (securityAlertResponse) {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    var additionalParams = {};
    if (securityAlertResponse && (0, exports.isBlockaidFeatureEnabled)()) {
        var result_type = securityAlertResponse.result_type, reason = securityAlertResponse.reason, providerRequestsCount_1 = securityAlertResponse.providerRequestsCount, source = securityAlertResponse.source;
        additionalParams.security_alert_response = result_type;
        additionalParams.security_alert_reason = reason;
        additionalParams.security_alert_source = source;
        if (result_type === BlockaidBanner_types_1.ResultType.Malicious) {
            additionalParams.ui_customizations = ['flagged_as_malicious'];
        }
        else if (result_type === BlockaidBanner_types_1.ResultType.RequestInProgress) {
            additionalParams.ui_customizations = ['security_alert_loading'];
            additionalParams.security_alert_response = 'loading';
        }
        // add counts of each RPC call
        if (providerRequestsCount_1) {
            Object.keys(providerRequestsCount_1).forEach(function (key) {
                var metricKey = "ppom_".concat(key, "_count");
                additionalParams[metricKey] = providerRequestsCount_1[key];
            });
        }
    }
    return additionalParams;
};
exports.getBlockaidMetricsParams = getBlockaidMetricsParams;
var getBlockaidTransactionMetricsParams = function (transaction) {
    var blockaidParams = {};
    if (!transaction) {
        return blockaidParams;
    }
    var securityAlertResponses = transaction.securityAlertResponses, id = transaction.id;
    var securityAlertResponse = securityAlertResponses === null || securityAlertResponses === void 0 ? void 0 : securityAlertResponses[id];
    if (securityAlertResponse) {
        blockaidParams = (0, exports.getBlockaidMetricsParams)(securityAlertResponse);
    }
    return blockaidParams;
};
exports.getBlockaidTransactionMetricsParams = getBlockaidTransactionMetricsParams;
