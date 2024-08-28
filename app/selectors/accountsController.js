"use strict";
exports.__esModule = true;
exports.selectSelectedInternalAccountChecksummedAddress = exports.selectSelectedInternalAccount = exports.selectInternalAccounts = void 0;
var controller_utils_1 = require("@metamask/controller-utils");
var react_native_1 = require("@sentry/react-native");
var reselect_1 = require("reselect");
var util_1 = require("./util");
var keyringController_1 = require("./keyringController");
/**
 *
 * @param state - Root redux state
 * @returns - AccountsController state
 */
var selectAccountsControllerState = function (state) {
    return state.engine.backgroundState.AccountsController;
};
/**
 * A memoized selector that returns internal accounts from the AccountsController, sorted by the order of KeyringController's keyring accounts
 */
exports.selectInternalAccounts = (0, util_1.createDeepEqualSelector)(selectAccountsControllerState, keyringController_1.selectFlattenedKeyringAccounts, function (accountControllerState, orderedKeyringAccounts) {
    var keyringAccountsMap = new Map(orderedKeyringAccounts.map(function (account, index) { return [
        account.toLowerCase(),
        index,
    ]; }));
    var sortedAccounts = Object.values(accountControllerState.internalAccounts.accounts).sort(function (a, b) {
        return (keyringAccountsMap.get(a.address.toLowerCase()) || 0) -
            (keyringAccountsMap.get(b.address.toLowerCase()) || 0);
    });
    return sortedAccounts;
});
/**
 * A memoized selector that returns the selected internal account from the AccountsController
 */
exports.selectSelectedInternalAccount = (0, util_1.createDeepEqualSelector)(selectAccountsControllerState, function (accountsControllerState) {
    var accountId = accountsControllerState.internalAccounts.selectedAccount;
    var account = accountsControllerState.internalAccounts.accounts[accountId];
    if (!account) {
        var err = new Error("selectSelectedInternalAccount: Account with ID ".concat(accountId, " not found."));
        (0, react_native_1.captureException)(err);
        return undefined;
    }
    return account;
});
/**
 * A memoized selector that returns the selected internal account address in checksum format
 */
exports.selectSelectedInternalAccountChecksummedAddress = (0, reselect_1.createSelector)(exports.selectSelectedInternalAccount, function (account) {
    var selectedAddress = account === null || account === void 0 ? void 0 : account.address;
    return selectedAddress ? (0, controller_utils_1.toChecksumHexAddress)(selectedAddress) : undefined;
});
