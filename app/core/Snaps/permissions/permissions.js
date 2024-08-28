"use strict";
exports.__esModule = true;
exports.EndowmentPermissions = exports.ExcludedSnapEndowments = exports.ExcludedSnapPermissions = void 0;
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
// TODO: Figure out which permissions should be disabled at this point
exports.ExcludedSnapPermissions = Object.freeze([]);
exports.ExcludedSnapEndowments = Object.freeze([]);
exports.EndowmentPermissions = Object.freeze({
    'endowment:network-access': 'endowment:network-access',
    'endowment:transaction-insight': 'endowment:transaction-insight',
    'endowment:cronjob': 'endowment:cronjob',
    'endowment:ethereum-provider': 'endowment:ethereum-provider',
    'endowment:rpc': 'endowment:rpc'
});
///: END:ONLY_INCLUDE_IF
