"use strict";
exports.__esModule = true;
var react_native_1 = require("@sentry/react-native");
var utils_1 = require("@metamask/utils");
var util_1 = require("./util");
var controller_utils_1 = require("@metamask/controller-utils");
/**
 * Migration to add importTime property to accounts metadata of accounts controller
 * This migration is needed due to the update of Accounts Controller to version 14
 * @param state Persisted Redux state
 * @returns Valid persisted Redux state
 */
function migrate(state) {
    if (!(0, util_1.ensureValidState)(state, 47)) {
        return state;
    }
    var accountsControllerState = state.engine.backgroundState.AccountsController;
    if (!(0, utils_1.isObject)(accountsControllerState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 47: Invalid AccountsController state error: '".concat(typeof accountsControllerState, "'")));
        return state;
    }
    if (!(0, utils_1.hasProperty)(accountsControllerState, 'internalAccounts') ||
        !(0, utils_1.isObject)(accountsControllerState.internalAccounts)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 47: Invalid AccountsController internalAccounts state error: '".concat(typeof accountsControllerState.internalAccounts, "'")));
        return state;
    }
    if (!(0, utils_1.hasProperty)(accountsControllerState.internalAccounts, 'accounts') ||
        !(0, utils_1.isObject)(accountsControllerState.internalAccounts.accounts)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 47: Invalid AccountsController internalAccounts accounts state error: '".concat(typeof accountsControllerState
            .internalAccounts.accounts, "'")));
        return state;
    }
    if (Object.values(accountsControllerState.internalAccounts.accounts).some(function (account) { return !(0, utils_1.isObject)(account); })) {
        var invalidEntry = Object.entries(accountsControllerState.internalAccounts.accounts).find(function (_c) {
            var _ = _c[0], account = _c[1];
            return !(0, utils_1.isObject)(account);
        });
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 47: Invalid AccountsController entry with id: '".concat(invalidEntry === null || invalidEntry === void 0 ? void 0 : invalidEntry[0], "', type: '").concat(typeof (invalidEntry === null || invalidEntry === void 0 ? void 0 : invalidEntry[1]), "'")));
        return state;
    }
    var preferencesControllerState = state.engine.backgroundState
        .PreferencesController;
    if (!(0, utils_1.isObject)(preferencesControllerState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 47: Invalid PreferencesController state error: '".concat(JSON.stringify(preferencesControllerState), "'")));
        return state;
    }
    if (!(0, utils_1.hasProperty)(preferencesControllerState, 'identities') ||
        !(0, utils_1.isObject)(preferencesControllerState.identities)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 47: Invalid PreferencesController identities state error: '".concat(preferencesControllerState.identities, "'")));
        return state;
    }
    var accounts = accountsControllerState.internalAccounts.accounts;
    Object.keys(accountsControllerState.internalAccounts.accounts).forEach(function (accountId) {
        var account = accounts[accountId];
        if ((0, utils_1.isObject)(account) &&
            (0, utils_1.isObject)(account.metadata) &&
            !account.metadata.importTime) {
            if (Object.keys(preferencesControllerState.identities).length) {
                Object.keys(preferencesControllerState.identities).forEach(function (identityAddress) {
                    var _c;
                    if ((0, controller_utils_1.toChecksumHexAddress)(identityAddress) ===
                        (0, controller_utils_1.toChecksumHexAddress)(account.address)) {
                        accountsControllerState.internalAccounts.accounts[accountId].metadata.importTime =
                            (_c = preferencesControllerState.identities[identityAddress]
                                .importTime) !== null && _c !== void 0 ? _c : Date.now();
                    }
                });
            }
            else {
                accountsControllerState.internalAccounts.accounts[accountId].metadata.importTime =
                    Date.now();
            }
        }
    });
    return state;
}
exports["default"] = migrate;
