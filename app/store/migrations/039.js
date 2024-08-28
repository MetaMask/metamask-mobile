"use strict";
exports.__esModule = true;
var utils_1 = require("@metamask/utils");
var react_native_1 = require("@sentry/react-native");
var util_1 = require("./util");
function migrate(state) {
    if (!(0, util_1.ensureValidState)(state, 39)) {
        return state;
    }
    if (!(0, utils_1.isObject)(state.engine.backgroundState.TransactionController)) {
        (0, react_native_1.captureException)(new Error("Migration 39: Invalid TransactionController state: '".concat(state.engine.backgroundState.TransactionController, "'")));
        return state;
    }
    var transactionControllerState = state.engine.backgroundState.TransactionController;
    if (!Array.isArray(transactionControllerState.transactions)) {
        (0, react_native_1.captureException)(new Error("Migration 39: Missing transactions property from TransactionController: '".concat(typeof state
            .engine.backgroundState.TransactionController, "'")));
        return state;
    }
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactionControllerState.transactions.forEach(function (transaction) {
        if (transaction.rawTransaction) {
            transaction.rawTx = transaction.rawTransaction;
            delete transaction.rawTransaction;
        }
        if (transaction.transactionHash) {
            transaction.hash = transaction.transactionHash;
            delete transaction.transactionHash;
        }
        if (transaction.transaction) {
            transaction.txParams = transaction.transaction;
            delete transaction.transaction;
        }
    });
    return state;
}
exports["default"] = migrate;
