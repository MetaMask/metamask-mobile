"use strict";
exports.__esModule = true;
exports.setReloadAccounts = exports.AccountsActionType = void 0;
/**
 * Deference action types available for different RPC event flow
 */
var AccountsActionType;
(function (AccountsActionType) {
    AccountsActionType["SET_RELOAD_ACCOUNTS"] = "SET_RELOAD_ACCOUNTS";
})(AccountsActionType = exports.AccountsActionType || (exports.AccountsActionType = {}));
/**
 * setReloadAccounts action creator
 * @param {boolean} reloadAccounts: true to reload accounts, false otherwise
 * @returns {iAccountActions} - the action object to set reloadAccounts
 */
function setReloadAccounts(reloadAccounts) {
    return {
        type: AccountsActionType.SET_RELOAD_ACCOUNTS,
        reloadAccounts: reloadAccounts
    };
}
exports.setReloadAccounts = setReloadAccounts;
