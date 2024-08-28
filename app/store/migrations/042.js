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
var utils_1 = require("@metamask/utils");
var react_native_1 = require("@sentry/react-native");
var util_1 = require("./util");
var accounts_controller_1 = require("@metamask/accounts-controller");
var ENSUtils_1 = require("../../util/ENSUtils");
var eth_methods_1 = require("../../constants/eth-methods");
function migrate(state) {
    if (!(0, util_1.ensureValidState)(state, 42)) {
        return state;
    }
    if (!(0, utils_1.isObject)(state.engine.backgroundState.AccountsController)) {
        (0, react_native_1.captureException)(new Error("Migration 42: Invalid AccountsController state: '".concat(typeof state.engine
            .backgroundState.AccountsController, "'")));
        return state;
    }
    if (!(0, utils_1.hasProperty)(state.engine.backgroundState.AccountsController, 'internalAccounts')) {
        (0, react_native_1.captureException)(new Error("Migration 42: Missing internalAccounts property from AccountsController: '".concat(typeof state
            .engine.backgroundState.AccountsController, "'")));
        return state;
    }
    mergeInternalAccounts(state);
    return state;
}
exports["default"] = migrate;
function deriveAccountName(existingName, currentName) {
    var isExistingNameDefault = (0, ENSUtils_1.isDefaultAccountName)(existingName);
    var isCurrentNameDefault = (0, ENSUtils_1.isDefaultAccountName)(currentName);
    return isExistingNameDefault && !isCurrentNameDefault
        ? currentName
        : existingName;
}
function mergeInternalAccounts(state) {
    var _c;
    var accountsController = state.engine
        .backgroundState.AccountsController;
    var internalAccounts = accountsController.internalAccounts.accounts;
    var selectedAccountId = accountsController.internalAccounts.selectedAccount;
    var selectedAddress = (_c = internalAccounts[selectedAccountId]) === null || _c === void 0 ? void 0 : _c.address.toLowerCase();
    var mergedAccounts = {};
    var addressMap = {};
    for (var _i = 0, _d = Object.entries(internalAccounts); _i < _d.length; _i++) {
        var _e = _d[_i], account = _e[1];
        var lowerCaseAddress = account.address.toLowerCase();
        var accountID = addressMap[lowerCaseAddress];
        if (accountID) {
            var existingAccount = mergedAccounts[accountID];
            existingAccount.metadata = __assign(__assign(__assign({}, existingAccount.metadata), account.metadata), { name: deriveAccountName(existingAccount.metadata.name, account.metadata.name) });
            existingAccount.methods = eth_methods_1.ETH_EOA_METHODS;
        }
        else {
            var newId = (0, accounts_controller_1.getUUIDFromAddressOfNormalAccount)(lowerCaseAddress);
            addressMap[lowerCaseAddress] = newId;
            mergedAccounts[newId] = __assign(__assign({}, account), { address: lowerCaseAddress, id: newId });
        }
    }
    var newSelectedAccountId = addressMap[selectedAddress] || Object.keys(mergedAccounts)[0]; // Default to the first account in the list
    accountsController.internalAccounts.accounts = mergedAccounts;
    accountsController.internalAccounts.selectedAccount = newSelectedAccountId;
}
