"use strict";
exports.__esModule = true;
exports.processOriginThrottlingRejection = exports.validateOriginThrottling = exports.SPAM_FILTER_ACTIVATED = exports.BLOCKABLE_SPAM_RPC_METHODS = void 0;
var rpc_errors_1 = require("@metamask/rpc-errors");
var middlewares_1 = require("../../util/middlewares");
var Routes_1 = require("../../constants/navigation/Routes");
var SDKConnectConstants_1 = require("../SDKConnect/SDKConnectConstants");
var originThrottling_1 = require("../redux/slices/originThrottling");
exports.BLOCKABLE_SPAM_RPC_METHODS = new Set([
    SDKConnectConstants_1.RPC_METHODS.ETH_SENDTRANSACTION,
    SDKConnectConstants_1.RPC_METHODS.ETH_SIGN,
    SDKConnectConstants_1.RPC_METHODS.ETH_SIGNTYPEDEATA,
    SDKConnectConstants_1.RPC_METHODS.ETH_SIGNTYPEDEATAV3,
    SDKConnectConstants_1.RPC_METHODS.ETH_SIGNTYPEDEATAV4,
    SDKConnectConstants_1.RPC_METHODS.METAMASK_CONNECTSIGN,
    SDKConnectConstants_1.RPC_METHODS.METAMASK_BATCH,
    SDKConnectConstants_1.RPC_METHODS.PERSONAL_SIGN,
    SDKConnectConstants_1.RPC_METHODS.WALLET_WATCHASSET,
    SDKConnectConstants_1.RPC_METHODS.WALLET_ADDETHEREUMCHAIN,
    SDKConnectConstants_1.RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
]);
exports.SPAM_FILTER_ACTIVATED = rpc_errors_1.providerErrors.unauthorized('Request blocked due to spam filter.');
function validateOriginThrottling(_c) {
    var req = _c.req, store = _c.store;
    var isBlockableRPCMethod = exports.BLOCKABLE_SPAM_RPC_METHODS.has(req.method);
    if (!isBlockableRPCMethod) {
        return;
    }
    var appState = store.getState();
    var isDappBlocked = (0, originThrottling_1.selectIsOriginBlockedForRPCRequests)(appState, req.origin);
    if (isDappBlocked) {
        throw exports.SPAM_FILTER_ACTIVATED;
    }
}
exports.validateOriginThrottling = validateOriginThrottling;
function processOriginThrottlingRejection(_c) {
    var req = _c.req, error = _c.error, store = _c.store, navigation = _c.navigation;
    var isBlockableRPCMethod = exports.BLOCKABLE_SPAM_RPC_METHODS.has(req.method);
    if (!isBlockableRPCMethod) {
        return;
    }
    if (!(0, middlewares_1.containsUserRejectedError)(error.message, error === null || error === void 0 ? void 0 : error.code)) {
        return;
    }
    store.dispatch((0, originThrottling_1.onRPCRequestRejectedByUser)(req.origin));
    if ((0, originThrottling_1.selectIsOriginBlockedForRPCRequests)(store.getState(), req.origin)) {
        navigation.navigate(Routes_1["default"].MODAL.ROOT_MODAL_FLOW, {
            screen: Routes_1["default"].SHEET.ORIGIN_SPAM_MODAL,
            params: { origin: req.origin }
        });
    }
}
exports.processOriginThrottlingRejection = processOriginThrottlingRejection;
