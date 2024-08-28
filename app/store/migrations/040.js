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
var react_native_1 = require("@sentry/react-native");
var utils_1 = require("@metamask/utils");
var util_1 = require("./util");
/**
 * Migration to remove metadata from Permissioned accounts
 *
 * @param state Persisted Redux state
 * @returns
 */
function migrate(state) {
    if (!(0, util_1.ensureValidState)(state, 40)) {
        return state;
    }
    var permissionControllerState = state.engine.backgroundState.PermissionController;
    if (!(0, utils_1.isObject)(permissionControllerState)) {
        (0, react_native_1.captureException)(new Error("Migration 40: Invalid PermissionController state error: '".concat(JSON.stringify(permissionControllerState), "'")));
        return state;
    }
    if ((0, utils_1.hasProperty)(permissionControllerState, 'subjects') &&
        (0, utils_1.isObject)(permissionControllerState.subjects)) {
        for (var origin_1 in permissionControllerState.subjects) {
            var subject = permissionControllerState.subjects[origin_1];
            if ((0, utils_1.isObject)(subject) && (0, utils_1.hasProperty)(subject, 'permissions')) {
                var permissions = subject.permissions;
                if ((0, utils_1.isObject)(permissions) && (0, utils_1.hasProperty)(permissions, 'eth_accounts')) {
                    var ethAccounts = permissions.eth_accounts;
                    if ((0, utils_1.isObject)(ethAccounts) &&
                        (0, utils_1.hasProperty)(ethAccounts, 'caveats') &&
                        Array.isArray(ethAccounts.caveats)) {
                        ethAccounts.caveats = ethAccounts.caveats.map(function (caveat) { return (__assign(__assign({}, caveat), { value: caveat.value.map(function (_c) {
                                var address = _c.address;
                                return address;
                            }) })); });
                    }
                }
            }
        }
    }
    return state;
}
exports["default"] = migrate;
