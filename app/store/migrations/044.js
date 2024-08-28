"use strict";
exports.__esModule = true;
var utils_1 = require("@metamask/utils");
var util_1 = require("./util");
var react_native_1 = require("@sentry/react-native");
/**
 * Synchronize `AccountsController` names with `PreferencesController` identities.
 *
 * There was a bug in versions below v7.23.0 that resulted in the account `name` state in the
 * `AccountsController` being reset. However, users account names were preserved in the
 * `identities` state in the `PreferencesController`. This migration restores the names to the
 * `AccountsController` if they are found.
 *
 * @param state Persisted Redux state that is potentially corrupted
 * @returns Valid persisted Redux state
 */
function migrate(state) {
    if (!(0, util_1.ensureValidState)(state, 44)) {
        return state;
    }
    var accountsControllerState = state.engine.backgroundState.AccountsController;
    if (!(0, utils_1.isObject)(accountsControllerState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 44: Invalid AccountsController state error: '".concat(typeof accountsControllerState, "'")));
        return state;
    }
    if (!(0, utils_1.hasProperty)(accountsControllerState, 'internalAccounts') ||
        !(0, utils_1.isObject)(accountsControllerState.internalAccounts)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 44: Invalid AccountsController internalAccounts state error: '".concat(typeof accountsControllerState.internalAccounts, "'")));
        return state;
    }
    if (!(0, utils_1.hasProperty)(accountsControllerState.internalAccounts, 'accounts') ||
        !(0, utils_1.isObject)(accountsControllerState.internalAccounts.accounts)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 44: Invalid AccountsController internalAccounts accounts state error: '".concat(typeof accountsControllerState
            .internalAccounts.accounts, "'")));
        return state;
    }
    if (Object.values(accountsControllerState.internalAccounts.accounts).some(function (account) { return !(0, utils_1.isObject)(account); })) {
        var invalidEntry = Object.entries(accountsControllerState.internalAccounts.accounts).find(function (_c) {
            var _ = _c[0], account = _c[1];
            return !(0, utils_1.isObject)(account);
        });
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 44: Invalid AccountsController account entry with id: '".concat(invalidEntry === null || invalidEntry === void 0 ? void 0 : invalidEntry[0], "', type: '").concat(typeof (invalidEntry === null || invalidEntry === void 0 ? void 0 : invalidEntry[1]), "'")));
        return state;
    }
    if (Object.values(accountsControllerState.internalAccounts.accounts).some(function (account) { return (0, utils_1.isObject)(account) && !(0, utils_1.isObject)(account.metadata); })) {
        var invalidEntry = Object.entries(accountsControllerState.internalAccounts.accounts).find(function (_c) {
            var _ = _c[0], account = _c[1];
            return (0, utils_1.isObject)(account) && !(0, utils_1.isObject)(account.metadata);
        });
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 44: Invalid AccountsController account metadata entry with id: '".concat(invalidEntry === null || invalidEntry === void 0 ? void 0 : invalidEntry[0], "', type: '").concat(typeof (invalidEntry === null || invalidEntry === void 0 ? void 0 : invalidEntry[1]), "'")));
        return state;
    }
    var preferencesControllerState = state.engine.backgroundState.PreferencesController;
    if (!(0, utils_1.isObject)(preferencesControllerState)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 44: Invalid PreferencesController state error: '".concat(typeof preferencesControllerState, "'")));
        return state;
    }
    if (!(0, utils_1.hasProperty)(preferencesControllerState, 'identities') ||
        !(0, utils_1.isObject)(preferencesControllerState.identities)) {
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 44: Invalid PreferencesController identities state error: '".concat(typeof preferencesControllerState.identities, "'")));
        return state;
    }
    if (Object.values(preferencesControllerState.identities).some(function (identity) { return !(0, utils_1.isObject)(identity); })) {
        var invalidEntry = Object.entries(preferencesControllerState.identities).find(function (_c) {
            var _ = _c[0], identity = _c[1];
            return !(0, utils_1.isObject)(identity);
        });
        (0, react_native_1.captureException)(new Error("FATAL ERROR: Migration 44: Invalid PreferencesController identity entry with type: '".concat(typeof (invalidEntry === null || invalidEntry === void 0 ? void 0 : invalidEntry[1]), "'")));
        return state;
    }
    var accounts = accountsControllerState.internalAccounts.accounts;
    var identities = preferencesControllerState.identities;
    Object.entries(accounts).forEach(function (_c) {
        var accountId = _c[0], account = _c[1];
        if ((0, utils_1.isObject)(account) &&
            (0, utils_1.isObject)(account.metadata) &&
            typeof account.address === 'string') {
            if (Object.keys(identities).length) {
                Object.entries(identities).forEach(function (_c) {
                    var identityAddress = _c[0], identity = _c[1];
                    if (identityAddress.toLowerCase() ===
                        account.address.toLowerCase()) {
                        if ((0, utils_1.isObject)(identity) &&
                            (0, utils_1.isObject)(account.metadata) &&
                            (identity === null || identity === void 0 ? void 0 : identity.name) !== account.metadata.name) {
                            accountsControllerState.internalAccounts.accounts[accountId].metadata.name =
                                identity.name;
                        }
                    }
                });
            }
        }
    });
    return state;
}
exports["default"] = migrate;
