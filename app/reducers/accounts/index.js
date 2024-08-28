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
var accounts_1 = require("../../actions/accounts");
/**
 * Initial state of the Accounts event flow
 */
var initialState = {
    reloadAccounts: false
};
/**
 * Reducer to Account relative event
 * @param {iAccountEvent} state: the state of the Accounts event flow, default to initialState
 * @param {iAccountActions} action: the action object contain type and payload to change state.
 * @returns {iAccountEvent}: the new state of the Accounts event flow
 */
var accountReducer = function (state, action) {
    if (state === void 0) { state = initialState; }
    if (action === void 0) { action = {
        type: '',
        reloadAccounts: false
    }; }
    switch (action.type) {
        case accounts_1.AccountsActionType.SET_RELOAD_ACCOUNTS:
            return __assign(__assign({}, state), { reloadAccounts: action.reloadAccounts });
        default:
            return state;
    }
};
exports["default"] = accountReducer;
