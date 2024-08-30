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
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.unrestrictedMethods = exports.getPermissionSpecifications = exports.getCaveatSpecifications = void 0;
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
var snaps_rpc_methods_1 = require("@metamask/snaps-rpc-methods");
///: END:ONLY_INCLUDE_IF
var permission_controller_1 = require("@metamask/permission-controller");
var uuid_1 = require("uuid");
var constants_1 = require("./constants");
/**
 * This file contains the specifications of the permissions and caveats
 * that are recognized by our permission system. See the PermissionController
 * README in @metamask/snaps-controllers for details.
 */
/**
 * The "keys" of all of permissions recognized by the PermissionController.
 * Permission keys and names have distinct meanings in the permission system.
 */
var PermissionKeys = Object.freeze(__assign({}, constants_1.RestrictedMethods));
/**
 * Factory functions for all caveat types recognized by the
 * PermissionController.
 */
var CaveatFactories = Object.freeze((_a = {},
    _a[constants_1.CaveatTypes.restrictReturnedAccounts] = function (accounts) { return ({
        type: constants_1.CaveatTypes.restrictReturnedAccounts,
        value: accounts,
    }); },
    _a));
/**
 * A PreferencesController identity object.
 *
 * @typedef {Object} Identity
 * @property {string} address - The address of the identity.
 * @property {string} name - The name of the identity.
 * @property {number} [lastSelected] - Unix timestamp of when the identity was
 * last selected in the UI.
 */
/**
 * Gets the specifications for all caveats that will be recognized by the
 * PermissionController.
 *
 * @param {{
 * getInternalAccounts: () => import('@metamask/keyring-api').InternalAccount[],
 * }} options - Options bag.
 */
var getCaveatSpecifications = function (_a) {
    var _b;
    var getInternalAccounts = _a.getInternalAccounts;
    return (__assign(__assign((_b = {}, _b[constants_1.CaveatTypes.restrictReturnedAccounts] = {
        type: constants_1.CaveatTypes.restrictReturnedAccounts,
        decorator: function (method, caveat) { return function (args) { return __awaiter(void 0, void 0, void 0, function () {
            var permittedAccounts, allAccounts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        permittedAccounts = [];
                        return [4 /*yield*/, method(args)];
                    case 1:
                        allAccounts = _a.sent();
                        caveat.value.forEach(function (address) {
                            var addressToCompare = address.toLowerCase();
                            var isPermittedAccount = allAccounts.includes(addressToCompare);
                            if (isPermittedAccount) {
                                permittedAccounts.push(addressToCompare);
                            }
                        });
                        return [2 /*return*/, permittedAccounts];
                }
            });
        }); }; },
        validator: function (caveat, _origin, _target) {
            return validateCaveatAccounts(caveat.value, getInternalAccounts);
        },
    }, _b), snaps_rpc_methods_1.caveatSpecifications), snaps_rpc_methods_1.endowmentCaveatSpecifications));
};
exports.getCaveatSpecifications = getCaveatSpecifications;
/**
 * Gets the specifications for all permissions that will be recognized by the
 * PermissionController.
 *
 * @param {{
 *   getAllAccounts: () => Promise<string[]>,
 *   getInternalAccounts: () => import('@metamask/keyring-api').InternalAccount[],
 *   captureKeyringTypesWithMissingIdentities: (internalAccounts?: import('@metamask/keyring-api').InternalAccount[], accounts?: string[]) => void,
 * }} options - Options bag.
 * @param options.getAllAccounts - A function that returns all Ethereum accounts
 * in the current MetaMask instance.
 * @param options.getInternalAccounts - A function that returns the
 * `AccountsController` internalAccount objects for all accounts in the current Metamask instance
 * @param options.captureKeyringTypesWithMissingIdentities - A function that
 * captures extra error information about the "Missing identity for address"
 * error.
 * current MetaMask instance.
 */
var getPermissionSpecifications = function (_a) {
    var _b;
    var getAllAccounts = _a.getAllAccounts, getInternalAccounts = _a.getInternalAccounts, captureKeyringTypesWithMissingIdentities = _a.captureKeyringTypesWithMissingIdentities;
    return (_b = {},
        _b[PermissionKeys.eth_accounts] = {
            permissionType: permission_controller_1.PermissionType.RestrictedMethod,
            targetName: PermissionKeys.eth_accounts,
            allowedCaveats: [constants_1.CaveatTypes.restrictReturnedAccounts],
            factory: function (permissionOptions, requestData) {
                if (Array.isArray(permissionOptions.caveats)) {
                    throw new Error("".concat(PermissionKeys.eth_accounts, " error: Received unexpected caveats. Any permitted caveats will be added automatically."));
                }
                // This value will be further validated as part of the caveat.
                if (!requestData.approvedAccounts) {
                    throw new Error("".concat(PermissionKeys.eth_accounts, " error: No approved accounts specified."));
                }
                return (0, permission_controller_1.constructPermission)(__assign(__assign({ id: (0, uuid_1.v1)() }, permissionOptions), { caveats: [
                        CaveatFactories[constants_1.CaveatTypes.restrictReturnedAccounts](requestData.approvedAccounts),
                    ] }));
            },
            methodImplementation: function (_args) { return __awaiter(void 0, void 0, void 0, function () {
                var accounts, internalAccounts;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, getAllAccounts()];
                        case 1:
                            accounts = _a.sent();
                            internalAccounts = getInternalAccounts();
                            return [2 /*return*/, accounts.sort(function (firstAddress, secondAddress) {
                                    var lowerCaseFirstAddress = firstAddress.toLowerCase();
                                    var firstAccount = internalAccounts.find(function (internalAccount) {
                                        return internalAccount.address.toLowerCase() === lowerCaseFirstAddress;
                                    });
                                    var lowerCaseSecondAddress = secondAddress.toLowerCase();
                                    var secondAccount = internalAccounts.find(function (internalAccount) {
                                        return internalAccount.address.toLowerCase() === lowerCaseSecondAddress;
                                    });
                                    if (!firstAccount) {
                                        captureKeyringTypesWithMissingIdentities(internalAccounts, accounts);
                                        throw new Error("Missing identity for address: \"".concat(firstAddress, "\"."));
                                    }
                                    else if (!secondAccount) {
                                        captureKeyringTypesWithMissingIdentities(internalAccounts, accounts);
                                        throw new Error("Missing identity for address: \"".concat(secondAddress, "\"."));
                                    }
                                    else if (firstAccount.metadata.lastSelected ===
                                        secondAccount.metadata.lastSelected) {
                                        return 0;
                                    }
                                    else if (firstAccount.metadata.lastSelected === undefined) {
                                        return 1;
                                    }
                                    else if (secondAccount.metadata.lastSelected === undefined) {
                                        return -1;
                                    }
                                    return (secondAccount.metadata.lastSelected -
                                        firstAccount.metadata.lastSelected);
                                })];
                    }
                });
            }); },
            validator: function (permission, _origin, _target) {
                var caveats = permission.caveats;
                if (!caveats ||
                    caveats.length !== 1 ||
                    caveats[0].type !== constants_1.CaveatTypes.restrictReturnedAccounts) {
                    throw new Error("".concat(PermissionKeys.eth_accounts, " error: Invalid caveats. There must be a single caveat of type \"").concat(constants_1.CaveatTypes.restrictReturnedAccounts, "\"."));
                }
            },
        },
        _b);
};
exports.getPermissionSpecifications = getPermissionSpecifications;
/**
 * Validates the accounts associated with a caveat. In essence, ensures that
 * the accounts value is an array of non-empty strings, and that each string
 * corresponds to a PreferencesController identity.
 *
 * @param {string[]} accounts - The accounts associated with the caveat.
 * @param {() => import('@metamask/keyring-api').InternalAccount[]} getInternalAccounts -
 * Gets all AccountsController InternalAccounts.
 */
function validateCaveatAccounts(accounts, getInternalAccounts) {
    if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error("".concat(PermissionKeys.eth_accounts, " error: Expected non-empty array of Ethereum addresses."));
    }
    var internalAccounts = getInternalAccounts();
    accounts.forEach(function (address) {
        if (!address || typeof address !== 'string') {
            throw new Error("".concat(PermissionKeys.eth_accounts, " error: Expected an array of objects that contains an Ethereum addresses. Received: \"").concat(address, "\"."));
        }
        var lowerCaseAddress = address.toLowerCase();
        if (!internalAccounts.some(function (internalAccount) {
            return internalAccount.address.toLowerCase() === lowerCaseAddress;
        })) {
            throw new Error("".concat(PermissionKeys.eth_accounts, " error: Received unrecognized address: \"").concat(address, "\"."));
        }
    });
}
/**
 * All unrestricted methods recognized by the PermissionController.
 * Unrestricted methods are ignored by the permission system, but every
 * JSON-RPC request seen by the permission system must correspond to a
 * restricted or unrestricted method, or the request will be rejected with a
 * "method not found" error.
 */
exports.unrestrictedMethods = Object.freeze([
    'eth_blockNumber',
    'eth_call',
    'eth_decrypt',
    'eth_estimateGas',
    'eth_feeHistory',
    'eth_gasPrice',
    'eth_getBalance',
    'eth_getBlockByHash',
    'eth_getBlockByNumber',
    'eth_getBlockTransactionCountByHash',
    'eth_getBlockTransactionCountByNumber',
    'eth_getCode',
    'eth_getEncryptionPublicKey',
    'eth_getFilterChanges',
    'eth_getFilterLogs',
    'eth_getLogs',
    'eth_getProof',
    'eth_getStorageAt',
    'eth_getTransactionCount',
    'eth_getTransactionReceipt',
    'eth_getUncleByBlockHashAndIndex',
    'eth_getUncleByBlockNumberAndIndex',
    'eth_getUncleCountByBlockHash',
    'eth_getUncleCountByBlockNumber',
    'eth_getWork',
    'eth_newBlockFilter',
    'eth_newFilter',
    'eth_newPendingTransactionFilter',
    'eth_protocolVersion',
    'eth_sendRawTransaction',
    'eth_signTypedData_v1',
    'eth_submitHashrate',
    'eth_submitWork',
    'eth_syncing',
    'eth_uninstallFilter',
    'metamask_watchAsset',
    'net_peerCount',
    'web3_sha3',
    // Define unrestricted methods below to bypass PermissionController. These are eventually handled by RPCMethodMiddleware (User facing RPC methods)
    'wallet_getPermissions',
    'wallet_requestPermissions',
    'eth_getTransactionByHash',
    'eth_getTransactionByBlockHashAndIndex',
    'eth_getTransactionByBlockNumberAndIndex',
    'eth_chainId',
    'eth_hashrate',
    'eth_mining',
    'net_listening',
    'net_version',
    'eth_requestAccounts',
    'eth_coinbase',
    'parity_defaultAccount',
    'eth_sendTransaction',
    'eth_sign',
    'personal_sign',
    'personal_ecRecover',
    'parity_checkRequest',
    'eth_signTypedData',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'web3_clientVersion',
    'wallet_scanQRCode',
    'wallet_watchAsset',
    'metamask_removeFavorite',
    'metamask_showTutorial',
    'metamask_showAutocomplete',
    'metamask_injectHomepageScripts',
    'metamask_getProviderState',
    'metamask_logWeb3ShimUsage',
    'wallet_switchEthereumChain',
    'wallet_addEthereumChain',
    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    'wallet_getAllSnaps',
    'wallet_getSnaps',
    'wallet_requestSnaps',
    'wallet_invokeSnap',
    'wallet_invokeKeyring',
    'snap_getClientStatus',
    'snap_getFile',
    'snap_createInterface',
    'snap_updateInterface',
    'snap_getInterfaceState',
    ///: END:ONLY_INCLUDE_IF
]);
