"use strict";
exports.__esModule = true;
exports.getSmartTransactionMetricsProperties = exports.getShouldUpdateApprovalRequest = exports.getShouldStartApprovalRequest = exports.getTransactionType = void 0;
var TransactionTypes_1 = require("../../core/TransactionTypes");
var transactions_1 = require("../transactions");
var getTransactionType = function (transactionMeta, chainId) {
    var _c;
    // Determine tx type
    // If it isn't a dapp tx, check if it's MM Swaps or Send
    // process.env.MM_FOX_CODE is from MM Swaps
    var isDapp = (transactionMeta === null || transactionMeta === void 0 ? void 0 : transactionMeta.origin) !== TransactionTypes_1["default"].MMM &&
        (transactionMeta === null || transactionMeta === void 0 ? void 0 : transactionMeta.origin) !== process.env.MM_FOX_CODE;
    var to = (_c = transactionMeta.txParams.to) === null || _c === void 0 ? void 0 : _c.toLowerCase();
    var data = transactionMeta.txParams.data; // undefined for send txs of gas tokens
    var isSwapApproveOrSwapTransaction = (0, transactions_1.getIsSwapApproveOrSwapTransaction)(data, transactionMeta.origin, to, chainId);
    var isSwapApproveTx = (0, transactions_1.getIsSwapApproveTransaction)(data, transactionMeta.origin, to, chainId);
    var isSwapTransaction = (0, transactions_1.getIsSwapTransaction)(data, transactionMeta.origin, to, chainId);
    var isNativeTokenTransferred = (0, transactions_1.getIsNativeTokenTransferred)(transactionMeta.txParams);
    var isSend = !isDapp && !isSwapApproveOrSwapTransaction;
    return {
        isDapp: isDapp,
        isSend: isSend,
        isInSwapFlow: isSwapApproveOrSwapTransaction,
        isSwapApproveTx: isSwapApproveTx,
        isSwapTransaction: isSwapTransaction,
        isNativeTokenTransferred: isNativeTokenTransferred
    };
};
exports.getTransactionType = getTransactionType;
// Status modal start, update, and close conditions
// If ERC20 if from token in swap and requires additional allowance, Swap txs are the 2nd in the swap flow, so we don't want to show another status page for that
var getShouldStartApprovalRequest = function (isDapp, isSend, isSwapApproveTx, hasPendingApprovalForSwapApproveTx) {
    return isDapp || isSend || isSwapApproveTx || !hasPendingApprovalForSwapApproveTx;
};
exports.getShouldStartApprovalRequest = getShouldStartApprovalRequest;
var getShouldUpdateApprovalRequest = function (isDapp, isSend, isSwapTransaction) { return isDapp || isSend || isSwapTransaction; };
exports.getShouldUpdateApprovalRequest = getShouldUpdateApprovalRequest;
var getSmartTransactionMetricsProperties = function (smartTransactionsController, transactionMeta) {
    if (!transactionMeta)
        return {};
    var smartTransaction = smartTransactionsController.getSmartTransactionByMinedTxHash(transactionMeta.hash);
    if (smartTransaction === null || smartTransaction === void 0 ? void 0 : smartTransaction.statusMetadata) {
        var _c = smartTransaction.statusMetadata, duplicated = _c.duplicated, timedOut = _c.timedOut, proxied = _c.proxied;
        return {
            duplicated: duplicated,
            timedOut: timedOut,
            proxied: proxied
        };
    }
    return {};
};
exports.getSmartTransactionMetricsProperties = getSmartTransactionMetricsProperties;
