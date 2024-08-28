"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.selectPendingSmartTransactionsBySender = exports.selectShouldUseSmartTransaction = exports.selectSmartTransactionsEnabled = void 0;
var network_1 = require("../constants/network");
var preferencesController_1 = require("./preferencesController");
var swaps_1 = require("../reducers/swaps");
var address_1 = require("../util/address");
var networkController_1 = require("./networkController");
var types_1 = require("@metamask/smart-transactions-controller/dist/types");
var accountsController_1 = require("./accountsController");
var smartTransactions_1 = require("../../app/constants/smartTransactions");
var selectSmartTransactionsEnabled = function (state) {
    var _c;
    var selectedAddress = (0, accountsController_1.selectSelectedInternalAccountChecksummedAddress)(state);
    var addrIshardwareAccount = selectedAddress
        ? (0, address_1.isHardwareAccount)(selectedAddress)
        : false;
    var chainId = (0, networkController_1.selectChainId)(state);
    var providerConfigRpcUrl = (0, networkController_1.selectProviderConfig)(state).rpcUrl;
    var isAllowedNetwork = (0, smartTransactions_1.getAllowedSmartTransactionsChainIds)().includes(chainId);
    // E.g. if a user has a Mainnet Flashbots RPC, we do not want to bypass it
    // Only want to bypass on default mainnet RPC
    var canBypassRpc = chainId === network_1.NETWORKS_CHAIN_ID.MAINNET
        ? providerConfigRpcUrl === undefined
        : true;
    var smartTransactionsFeatureFlagEnabled = (0, swaps_1.swapsSmartTxFlagEnabled)(state);
    var smartTransactionsLiveness = (_c = state.engine.backgroundState.SmartTransactionsController
        .smartTransactionsState) === null || _c === void 0 ? void 0 : _c.liveness;
    return Boolean(isAllowedNetwork &&
        canBypassRpc &&
        !addrIshardwareAccount &&
        smartTransactionsFeatureFlagEnabled &&
        smartTransactionsLiveness);
};
exports.selectSmartTransactionsEnabled = selectSmartTransactionsEnabled;
var selectShouldUseSmartTransaction = function (state) {
    var isSmartTransactionsEnabled = (0, exports.selectSmartTransactionsEnabled)(state);
    var smartTransactionsOptInStatus = (0, preferencesController_1.selectSmartTransactionsOptInStatus)(state);
    return isSmartTransactionsEnabled && smartTransactionsOptInStatus;
};
exports.selectShouldUseSmartTransaction = selectShouldUseSmartTransaction;
var selectPendingSmartTransactionsBySender = function (state) {
    var _c, _d, _e, _f;
    var selectedAddress = (0, accountsController_1.selectSelectedInternalAccountChecksummedAddress)(state);
    var chainId = (0, networkController_1.selectChainId)(state);
    var smartTransactions = ((_e = (_d = (_c = state.engine.backgroundState.SmartTransactionsController) === null || _c === void 0 ? void 0 : _c.smartTransactionsState) === null || _d === void 0 ? void 0 : _d.smartTransactions) === null || _e === void 0 ? void 0 : _e[chainId]) || [];
    var pendingSmartTransactions = (_f = smartTransactions === null || smartTransactions === void 0 ? void 0 : smartTransactions.filter(function (stx) {
        var txParams = stx.txParams;
        return ((txParams === null || txParams === void 0 ? void 0 : txParams.from.toLowerCase()) === (selectedAddress === null || selectedAddress === void 0 ? void 0 : selectedAddress.toLowerCase()) &&
            ![
                types_1.SmartTransactionStatuses.SUCCESS,
                types_1.SmartTransactionStatuses.CANCELLED,
            ].includes(stx.status));
    }).map(function (stx) {
        var _c;
        return (__assign(__assign({}, stx), { 
            // stx.uuid is one from sentinel API, not the same as tx.id which is generated client side
            // Doesn't matter too much because we only care about the pending stx, confirmed txs are handled like normal
            // However, this does make it impossible to read Swap data from TxController.swapsTransactions as that relies on client side tx.id
            // To fix that we do transactionController.update({ swapsTransactions: newSwapsTransactions }) in app/util/smart-transactions/smart-tx.ts
            id: stx.uuid, status: ((_c = stx.status) === null || _c === void 0 ? void 0 : _c.startsWith(types_1.SmartTransactionStatuses.CANCELLED))
                ? types_1.SmartTransactionStatuses.CANCELLED
                : stx.status, isSmartTransaction: true }));
    })) !== null && _f !== void 0 ? _f : [];
    return pendingSmartTransactions;
};
exports.selectPendingSmartTransactionsBySender = selectPendingSmartTransactionsBySender;
