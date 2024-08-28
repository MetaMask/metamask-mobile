"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.getPermittedAccounts = exports.removeAccountsFromPermissions = exports.removePermittedAccounts = exports.addPermittedAccounts = exports.switchActiveAccounts = exports.getPermittedAccountsByHostname = void 0;
var rpc_errors_1 = require("@metamask/rpc-errors");
var constants_2 = require("./constants");
var Engine_1 = require("../Engine");
var Logger_1 = require("../../util/Logger");
var general_1 = require("../../util/general");
var TransactionTypes_1 = require("../TransactionTypes");
var INTERNAL_ORIGINS = [process.env.MM_FOX_CODE, TransactionTypes_1["default"].MMM];
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var Engine = Engine_1["default"];
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAccountsCaveatFromPermission(accountsPermission) {
    if (accountsPermission === void 0) { accountsPermission = {}; }
    return (Array.isArray(accountsPermission.caveats) &&
        accountsPermission.caveats.find(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function (caveat) { return caveat.type === constants_2.CaveatTypes.restrictReturnedAccounts; }));
}
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAccountsPermissionFromSubject(subject) {
    var _c;
    if (subject === void 0) { subject = {}; }
    return ((_c = subject.permissions) === null || _c === void 0 ? void 0 : _c.eth_accounts) || {};
}
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAccountsFromPermission(accountsPermission) {
    var accountsCaveat = getAccountsCaveatFromPermission(accountsPermission);
    return accountsCaveat && Array.isArray(accountsCaveat.value)
        ? accountsCaveat.value.map(function (address) { return address.toLowerCase(); })
        : [];
}
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAccountsFromSubject(subject) {
    return getAccountsFromPermission(getAccountsPermissionFromSubject(subject));
}
var getPermittedAccountsByHostname = function (
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
state, hostname) {
    var subjects = state.subjects;
    var accountsByHostname = Object.keys(subjects).reduce(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function (acc, subjectKey) {
        var accounts = getAccountsFromSubject(subjects[subjectKey]);
        if (accounts.length > 0) {
            acc[subjectKey] = accounts;
        }
        return acc;
    }, {});
    return (accountsByHostname === null || accountsByHostname === void 0 ? void 0 : accountsByHostname[hostname]) || [];
};
exports.getPermittedAccountsByHostname = getPermittedAccountsByHostname;
var switchActiveAccounts = function (hostname, accAddress) {
    var PermissionController = Engine.context.PermissionController;
    var existingPermittedAccountAddresses = PermissionController.getCaveat(hostname, constants_2.RestrictedMethods.eth_accounts, constants_2.CaveatTypes.restrictReturnedAccounts).value;
    var accountIndex = existingPermittedAccountAddresses.findIndex(function (address) { return address === accAddress; });
    if (accountIndex === -1) {
        throw new Error("eth_accounts permission for hostname \"".concat(hostname, "\" does not permit \"").concat(accAddress, " account\"."));
    }
    var newPermittedAccountAddresses = __spreadArray([], existingPermittedAccountAddresses, true);
    newPermittedAccountAddresses.splice(accountIndex, 1);
    newPermittedAccountAddresses = (0, general_1.getUniqueList)(__spreadArray([
        accAddress
    ], newPermittedAccountAddresses, true));
    PermissionController.updateCaveat(hostname, constants_2.RestrictedMethods.eth_accounts, constants_2.CaveatTypes.restrictReturnedAccounts, newPermittedAccountAddresses);
};
exports.switchActiveAccounts = switchActiveAccounts;
var addPermittedAccounts = function (hostname, addresses) {
    var PermissionController = Engine.context.PermissionController;
    var existing = PermissionController.getCaveat(hostname, constants_2.RestrictedMethods.eth_accounts, constants_2.CaveatTypes.restrictReturnedAccounts);
    var existingPermittedAccountAddresses = existing.value;
    var newPermittedAccountsAddresses = (0, general_1.getUniqueList)(addresses, existingPermittedAccountAddresses);
    // No change in permitted account addresses
    if (newPermittedAccountsAddresses.length ===
        existingPermittedAccountAddresses.length) {
        console.error("eth_accounts permission for hostname: (".concat(hostname, ") already exists for account addresses: (").concat(existingPermittedAccountAddresses, ")."));
        return existingPermittedAccountAddresses[0];
    }
    PermissionController.updateCaveat(hostname, constants_2.RestrictedMethods.eth_accounts, constants_2.CaveatTypes.restrictReturnedAccounts, newPermittedAccountsAddresses);
    return newPermittedAccountsAddresses[0];
};
exports.addPermittedAccounts = addPermittedAccounts;
var removePermittedAccounts = function (hostname, accounts) {
    var PermissionController = Engine.context.PermissionController;
    var existing = PermissionController.getCaveat(hostname, constants_2.RestrictedMethods.eth_accounts, constants_2.CaveatTypes.restrictReturnedAccounts);
    var remainingAccounts = existing.value.filter(function (address) { return !accounts.includes(address); });
    if (remainingAccounts.length === 0) {
        PermissionController.revokePermission(hostname, constants_2.RestrictedMethods.eth_accounts);
    }
    else {
        PermissionController.updateCaveat(hostname, constants_2.RestrictedMethods.eth_accounts, constants_2.CaveatTypes.restrictReturnedAccounts, remainingAccounts);
    }
};
exports.removePermittedAccounts = removePermittedAccounts;
var removeAccountsFromPermissions = function (addresses) { return __awaiter(void 0, void 0, void 0, function () {
    var PermissionController, subject;
    return __generator(this, function (_c) {
        PermissionController = Engine.context.PermissionController;
        for (subject in PermissionController.state.subjects) {
            try {
                (0, exports.removePermittedAccounts)(subject, addresses);
            }
            catch (e) {
                Logger_1["default"].log(e, 'Failed to remove account from permissions after deleting account from wallet.');
            }
        }
        return [2 /*return*/];
    });
}); };
exports.removeAccountsFromPermissions = removeAccountsFromPermissions;
/**
 * Get permitted accounts for the given the host.
 *
 * @param hostname - Subject to check if permissions exists. Ex: A Dapp is a subject.
 * @returns An array containing permitted accounts for the specified host.
 * The active account is the first item in the returned array.
 */
var getPermittedAccounts = function (hostname) { return __awaiter(void 0, void 0, void 0, function () {
    var AccountsController, selectedAccountAddress, accounts, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                AccountsController = Engine.context.AccountsController;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                if (INTERNAL_ORIGINS.includes(hostname)) {
                    selectedAccountAddress = AccountsController.getSelectedAccount().address;
                    return [2 /*return*/, [selectedAccountAddress]];
                }
                return [4 /*yield*/, Engine.context.PermissionController.executeRestrictedMethod(hostname, constants_2.RestrictedMethods.eth_accounts)];
            case 2:
                accounts = _c.sent();
                return [2 /*return*/, accounts];
            case 3:
                error_1 = _c.sent();
                if (error_1.code === rpc_errors_1.errorCodes.provider.unauthorized) {
                    return [2 /*return*/, []];
                }
                throw error_1;
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getPermittedAccounts = getPermittedAccounts;
