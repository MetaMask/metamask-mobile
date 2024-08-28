"use strict";
exports.__esModule = true;
exports.selectFlattenedKeyringAccounts = exports.selectKeyrings = void 0;
var util_1 = require("../util");
/**
 *
 * @param state - Root Redux state
 * @returns - KeyringController state
 */
var selectKeyringControllerState = function (state) {
    return state.engine.backgroundState.KeyringController;
};
/**
 * A memoized selector that retrieves keyrings from the KeyringController
 */
exports.selectKeyrings = (0, util_1.createDeepEqualSelector)(selectKeyringControllerState, function (keyringControllerState) { return keyringControllerState.keyrings; });
/**
 * A memoized selector that returns the list of accounts from all keyrings in the form of a flattened array of strings.
 */
exports.selectFlattenedKeyringAccounts = (0, util_1.createDeepEqualSelector)(exports.selectKeyrings, function (keyrings) {
    var flattenedKeyringAccounts = keyrings.flatMap(function (keyring) { return keyring.accounts; });
    return flattenedKeyringAccounts;
});
