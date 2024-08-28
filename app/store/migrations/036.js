"use strict";
exports.__esModule = true;
var keyring_api_1 = require("@metamask/keyring-api");
var utils_1 = require("@metamask/utils");
var react_native_1 = require("@sentry/react-native");
var accounts_controller_1 = require("@metamask/accounts-controller");
var keyring_controller_1 = require("@metamask/keyring-controller");
var eth_methods_1 = require("../../constants/eth-methods");
function migrate(state) {
    if (!(0, utils_1.isObject)(state)) {
        (0, react_native_1.captureException)(new Error("Migration 36: Invalid root state: '".concat(typeof state, "'")));
        return state;
    }
    if (!(0, utils_1.isObject)(state.engine)) {
        (0, react_native_1.captureException)(new Error("Migration 36: Invalid root engine state: '".concat(typeof state.engine, "'")));
        return state;
    }
    if (!(0, utils_1.isObject)(state.engine.backgroundState)) {
        (0, react_native_1.captureException)(new Error("Migration 36: Invalid root engine backgroundState: '".concat(typeof state
            .engine.backgroundState, "'")));
        return state;
    }
    var keyringControllerState = state.engine.backgroundState.KeyringController;
    if (!(0, utils_1.isObject)(keyringControllerState)) {
        (0, react_native_1.captureException)(new Error("Migration 36: Invalid vault in KeyringController: '".concat(typeof keyringControllerState, "'")));
    }
    if (!(0, utils_1.isObject)(state.engine.backgroundState.PreferencesController)) {
        (0, react_native_1.captureException)(new Error("Migration 36: Invalid PreferencesController state: '".concat(typeof state
            .engine.backgroundState.PreferencesController, "'")));
        return state;
    }
    if (!(0, utils_1.hasProperty)(state.engine.backgroundState.PreferencesController, 'identities')) {
        (0, react_native_1.captureException)(new Error("Migration 36: Missing identities property from PreferencesController: '".concat(typeof state
            .engine.backgroundState.PreferencesController, "'")));
        return state;
    }
    createDefaultAccountsController(state);
    createInternalAccountsForAccountsController(state);
    createSelectedAccountForAccountsController(state);
    return state;
}
exports["default"] = migrate;
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createDefaultAccountsController(state) {
    state.engine.backgroundState.AccountsController = {
        internalAccounts: {
            accounts: {},
            selectedAccount: ''
        }
    };
}
function createInternalAccountsForAccountsController(
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
state) {
    var _c, _d, _e;
    var identities = ((_c = state.engine.backgroundState.PreferencesController) === null || _c === void 0 ? void 0 : _c.identities) || {};
    if (Object.keys(identities).length === 0) {
        (0, react_native_1.captureException)(new Error("Migration 36: PreferencesController?.identities are empty'"));
        return;
    }
    var accounts = {};
    for (var _i = 0, _f = Object.values(identities); _i < _f.length; _i++) {
        var identity = _f[_i];
        var lowerCaseAddress = identity.address.toLocaleLowerCase();
        var expectedId = (0, accounts_controller_1.getUUIDFromAddressOfNormalAccount)(lowerCaseAddress);
        accounts[expectedId] = {
            address: identity.address,
            id: expectedId,
            options: {},
            metadata: {
                name: identity.name,
                importTime: (_d = identity.importTime) !== null && _d !== void 0 ? _d : Date.now(),
                lastSelected: (_e = identity.lastSelected) !== null && _e !== void 0 ? _e : undefined,
                keyring: {
                    // This is default HD Key Tree type because the keyring is encrypted
                    // during migration, the type will get updated when the during the
                    // initial updateAccounts call.
                    type: keyring_controller_1.KeyringTypes.hd
                }
            },
            methods: eth_methods_1.ETH_EOA_METHODS,
            type: keyring_api_1.EthAccountType.Eoa
        };
    }
    state.engine.backgroundState.AccountsController.internalAccounts.accounts =
        accounts;
}
function findInternalAccountByAddress(
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
state, address) {
    return Object.values(state.engine.backgroundState.AccountsController.internalAccounts.accounts).find(function (account) {
        return account.address.toLowerCase() === address.toLowerCase();
    });
}
function createSelectedAccountForAccountsController(
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
state) {
    var _c, _d;
    var selectedAddress = (_c = state.engine.backgroundState.PreferencesController) === null || _c === void 0 ? void 0 : _c.selectedAddress;
    // Handle the case where the selectedAddress from preferences controller is either not defined or not a string
    if (!selectedAddress || typeof selectedAddress !== 'string') {
        (0, react_native_1.captureException)(new Error("Migration 36: Invalid selectedAddress. state.engine.backgroundState.PreferencesController?.selectedAddress is not a string:'".concat(typeof selectedAddress, "'. Setting selectedAddress to the first account.")));
        // Get the first account if selectedAddress is not a string
        var firstAddress = Object.keys((_d = state.engine.backgroundState.PreferencesController) === null || _d === void 0 ? void 0 : _d.identities)[0];
        var internalAccount = findInternalAccountByAddress(state, firstAddress);
        if (internalAccount) {
            state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
                internalAccount.id;
            state.engine.backgroundState.PreferencesController.selectedAddress =
                internalAccount.address;
        }
        return;
    }
    var selectedAccount = findInternalAccountByAddress(state, selectedAddress);
    if (selectedAccount) {
        state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
            selectedAccount.id;
    }
}
