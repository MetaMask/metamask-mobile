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
exports.__esModule = true;
var controller_utils_1 = require("@metamask/controller-utils");
var utils_1 = require("@metamask/utils");
var regex_1 = require("../../../app/util/regex");
//@ts-expect-error - This error is expected, but ethereumjs-util exports this function
var ethereumjs_util_1 = require("ethereumjs-util");
var react_native_1 = require("@sentry/react-native");
/**
 * Converting chain id on decimal format to hexadecimal format
 * Replacing rpcTarget property for the rpcUrl new property on providerConfig
 * Converting keys of networkOnboardedState for hexadecimal for not repeat showing the new network modal
 * Addressing networkDetails property change
 * Addressing networkConfigurations chainId property change to ehxadecimal
 * Swaps on the state initial state key chain id changed for hexadecimal
 * Address book controller chain id identifier changed for hexadecimal
 * Swaps controller chain cache property now is on hexadecimal format
 * NftController allNfts, allNftsContracts chain Id now is on hexadecimal format
 * Transaction Controller transactions object chain id property to hexadecimal
 * decided here https://github.com/MetaMask/core/pull/1367
 * @param {any} state - Redux state.
 * @returns Migrated Redux state.
 */
function migrate(stateAsync) {
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
    return __awaiter(this, void 0, void 0, function () {
        var state, networkControllerState, newNetworkControllerState, networkControllerChainId, networkControllerRpcTarget, isEIP1559Compatible, networkOnboardedState_1, newNetworkOnboardedState, chainId, hexChainId, swapsState, addressBookControllerState, newAddressBookControllerState, addressBook_1, swapsControllerState, nftControllerState, newNftControllerState, allNfts_1, transactionControllerState, tokenListControllerState, newTokenListControllerState, tokenRatesControllerState, newTokenRatesControllerState, tokensControllerState, newTokensControllerState;
        return __generator(this, function (_2) {
            switch (_2.label) {
                case 0: return [4 /*yield*/, stateAsync];
                case 1:
                    state = _2.sent();
                    // Chaning chain id to hexadecimal chain Id on the networks already on the local state
                    if (!(0, utils_1.isObject)(state)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid state: '".concat(typeof state, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.isObject)(state.engine)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid engine state: '".concat(typeof state.engine, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.isObject)(state.engine.backgroundState)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid engine backgroundState: '".concat(typeof state.engine
                            .backgroundState, "'")));
                        return [2 /*return*/, state];
                    }
                    networkControllerState = state.engine.backgroundState.NetworkController;
                    newNetworkControllerState = state.engine.backgroundState
                        .NetworkController;
                    if (!(0, utils_1.isObject)(networkControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid NetworkController state: '".concat(typeof networkControllerState, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.hasProperty)(networkControllerState, 'providerConfig') ||
                        !(0, utils_1.isObject)(networkControllerState.providerConfig)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid NetworkController providerConfig: '".concat(typeof networkControllerState.providerConfig, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!networkControllerState.providerConfig.chainId) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid NetworkController providerConfig chainId: '".concat(JSON.stringify(networkControllerState.providerConfig.chainId), "'")));
                        return [2 /*return*/, state];
                    }
                    if (networkControllerState.providerConfig.chainId) {
                        networkControllerChainId = networkControllerState.providerConfig
                            .chainId;
                        networkControllerState.providerConfig.chainId = (0, controller_utils_1.toHex)(networkControllerChainId);
                    }
                    // Changing rcpTarget property for the new rpcUrl
                    if (networkControllerState.providerConfig.rpcTarget) {
                        networkControllerRpcTarget = networkControllerState.providerConfig.rpcTarget;
                        networkControllerState.providerConfig.rpcUrl = networkControllerRpcTarget;
                        delete networkControllerState.providerConfig.rpcTarget;
                    }
                    if (!(0, utils_1.hasProperty)(networkControllerState, 'networkDetails') ||
                        !(0, utils_1.isObject)(networkControllerState.networkDetails)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid NetworkController networkDetails: '".concat(JSON.stringify(networkControllerState.networkDetails), "'")));
                        return [2 /*return*/, state];
                    }
                    isEIP1559Compatible = !!networkControllerState.networkDetails.isEIP1559Compatible;
                    networkControllerState.networkDetails = {
                        EIPS: {
                            1559: isEIP1559Compatible
                        }
                    };
                    if ((0, utils_1.isObject)(networkControllerState.networkDetails)) {
                        delete networkControllerState.networkDetails.isEIP1559Compatible;
                    }
                    if (!(0, utils_1.hasProperty)(networkControllerState, 'networkConfigurations') ||
                        !(0, utils_1.isObject)(networkControllerState.networkConfigurations)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid NetworkController networkConfigurations: '".concat(JSON.stringify(networkControllerState.networkConfigurations), "'")));
                        return [2 /*return*/, state];
                    }
                    // Addressing networkConfigurations chainId property change to hexadecimal
                    if (networkControllerState.networkConfigurations) {
                        Object.entries(networkControllerState.networkConfigurations).forEach(function (_c) {
                            var key = _c[0], networkConfiguration = _c[1];
                            if ((0, utils_1.isObject)(networkConfiguration) && networkConfiguration.chainId) {
                                var newHexChainId = (0, controller_utils_1.toHex)(networkConfiguration.chainId);
                                newNetworkControllerState.networkConfigurations[key].chainId =
                                    newHexChainId;
                            }
                        });
                    }
                    // Validating if the networks were already onboarded
                    // This property can be undefined
                    if ((0, utils_1.isObject)(state.networkOnboarded) &&
                        (0, utils_1.isObject)(state.networkOnboarded.networkOnboardedState)) {
                        networkOnboardedState_1 = state.networkOnboarded.networkOnboardedState;
                        newNetworkOnboardedState = {};
                        for (chainId in networkOnboardedState_1) {
                            hexChainId = (0, controller_utils_1.toHex)(chainId);
                            newNetworkOnboardedState[hexChainId] = networkOnboardedState_1[chainId];
                        }
                        state.networkOnboarded.networkOnboardedState = newNetworkOnboardedState;
                    }
                    swapsState = state.swaps;
                    // Swaps on the state initial state key chain id changed for hexadecimal
                    // This property can be undefined
                    if ((0, utils_1.isObject)(swapsState)) {
                        Object.keys(swapsState).forEach(function (key) {
                            var _c;
                            // To match keys that are composed entirely of digits
                            if (regex_1.regex.decimalStringMigrations.test(key)) {
                                var hexadecimalChainId = (0, controller_utils_1.toHex)(key);
                                state.swaps = __assign(__assign({}, swapsState), (_c = {}, _c[hexadecimalChainId] = swapsState[key], _c));
                                if ((0, utils_1.isObject)(state.swaps)) {
                                    delete state.swaps[key];
                                }
                            }
                        });
                    }
                    addressBookControllerState = (_d = (_c = state === null || state === void 0 ? void 0 : state.engine) === null || _c === void 0 ? void 0 : _c.backgroundState) === null || _d === void 0 ? void 0 : _d.AddressBookController;
                    newAddressBookControllerState = (_f = (_e = state === null || state === void 0 ? void 0 : state.engine) === null || _e === void 0 ? void 0 : _e.backgroundState) === null || _f === void 0 ? void 0 : _f.AddressBookController;
                    if (!(0, utils_1.isObject)(addressBookControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid AddressBookController state: '".concat(JSON.stringify(addressBookControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.hasProperty)(addressBookControllerState, 'addressBook') ||
                        !(0, utils_1.isObject)(addressBookControllerState.addressBook)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid AddressBookController addressBook: '".concat(JSON.stringify(addressBookControllerState.addressBook), "'")));
                        return [2 /*return*/, state];
                    }
                    // Address book controller chain id identifier changed for hexadecimal
                    if (addressBookControllerState.addressBook) {
                        addressBook_1 = addressBookControllerState.addressBook;
                        Object.keys(addressBook_1).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId_1 = (0, controller_utils_1.toHex)(chainId);
                                var tempNewAddressBook_1 = {};
                                var newAddress_1;
                                if ((0, utils_1.isObject)(addressBook_1) && typeof chainId === 'string') {
                                    var addressBookChainId_1 = addressBook_1[chainId];
                                    if ((0, utils_1.isObject)(addressBookChainId_1)) {
                                        Object.keys(addressBookChainId_1).forEach(function (address) {
                                            var _c;
                                            var addressBookChainIdAddress = addressBookChainId_1[address];
                                            if (addressBookChainIdAddress) {
                                                newAddress_1 = addressBookChainIdAddress;
                                                if ((0, utils_1.isObject)(addressBookChainIdAddress)) {
                                                    newAddress_1.chainId = (0, controller_utils_1.toHex)(addressBookChainIdAddress.chainId);
                                                }
                                                tempNewAddressBook_1[hexChainId_1] = __assign(__assign({}, tempNewAddressBook_1[hexChainId_1]), (_c = {}, _c[address] = newAddress_1, _c));
                                            }
                                        });
                                    }
                                }
                                newAddressBookControllerState.addressBook[hexChainId_1] =
                                    tempNewAddressBook_1[hexChainId_1];
                                if ((0, utils_1.isObject)(addressBookControllerState.addressBook)) {
                                    delete addressBookControllerState.addressBook[chainId];
                                }
                            }
                        });
                    }
                    swapsControllerState = (_h = (_g = state === null || state === void 0 ? void 0 : state.engine) === null || _g === void 0 ? void 0 : _g.backgroundState) === null || _h === void 0 ? void 0 : _h.SwapsController;
                    if (!(0, utils_1.isObject)(swapsControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid SwapsController state: '".concat(JSON.stringify(swapsControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    // Swaps controller chain cache property now is on hexadecimal format
                    if (swapsControllerState.chainCache) {
                        Object.keys(swapsControllerState.chainCache).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                if ((0, utils_1.isObject)(swapsControllerState.chainCache)) {
                                    swapsControllerState.chainCache[hexChainId] =
                                        swapsControllerState.chainCache[chainId];
                                }
                                if ((0, utils_1.isObject)(swapsControllerState) &&
                                    (0, utils_1.isObject)(swapsControllerState.chainCache)) {
                                    delete swapsControllerState.chainCache[chainId];
                                }
                            }
                        });
                    }
                    nftControllerState = (_k = (_j = state === null || state === void 0 ? void 0 : state.engine) === null || _j === void 0 ? void 0 : _j.backgroundState) === null || _k === void 0 ? void 0 : _k.NftController;
                    newNftControllerState = (_m = (_l = state === null || state === void 0 ? void 0 : state.engine) === null || _l === void 0 ? void 0 : _l.backgroundState) === null || _m === void 0 ? void 0 : _m.NftController;
                    if (!(0, utils_1.isObject)(nftControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid NftController state: '".concat(JSON.stringify(nftControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.hasProperty)(nftControllerState, 'allNftContracts') ||
                        !(0, utils_1.isObject)(nftControllerState.allNftContracts)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid nftControllerState allNftsContracts: '".concat(JSON.stringify(nftControllerState.allNftContracts), "'")));
                        return [2 /*return*/, state];
                    }
                    // NftController allNfts, allNftsContracts chain Id now is on hexadecimal format
                    if (nftControllerState.allNftContracts) {
                        Object.keys(nftControllerState.allNftContracts).forEach(function (nftContractsAddress) {
                            if ((0, utils_1.isObject)(nftControllerState.allNftContracts)) {
                                var nftContractAddress_1 = nftControllerState.allNftContracts[nftContractsAddress];
                                if ((0, utils_1.isObject)(nftContractAddress_1)) {
                                    Object.keys(nftContractAddress_1).forEach(function (chainId) {
                                        if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                            var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                            if (Array.isArray(nftContractAddress_1[chainId])) {
                                                var nftsChainId = nftContractAddress_1[chainId];
                                                newNftControllerState.allNftContracts[nftContractsAddress][hexChainId] = nftsChainId;
                                            }
                                            if ((0, utils_1.isObject)(nftControllerState.allNftContracts) &&
                                                (0, utils_1.isObject)(nftControllerState.allNftContracts[nftContractsAddress])) {
                                                // Need to type cast because typescript is static typed
                                                // and typescript is
                                                delete nftControllerState.allNftContracts[nftContractsAddress][chainId];
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }
                    if (!(0, utils_1.hasProperty)(nftControllerState, 'allNfts') ||
                        !(0, utils_1.isObject)(nftControllerState.allNfts)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid nftControllerState allNfts: '".concat(JSON.stringify(nftControllerState.allNfts), "'")));
                        return [2 /*return*/, state];
                    }
                    if (nftControllerState.allNfts) {
                        allNfts_1 = nftControllerState.allNfts;
                        Object.keys(nftControllerState.allNfts).forEach(function (allNftsByAddress) {
                            var nftsByAddress = allNfts_1[allNftsByAddress];
                            if ((0, utils_1.isObject)(nftsByAddress)) {
                                Object.keys(nftsByAddress).forEach(function (chainId) {
                                    if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                        var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                        if (Array.isArray(nftsByAddress[chainId])) {
                                            var nftsChainId = nftsByAddress[chainId];
                                            newNftControllerState.allNfts[allNftsByAddress][hexChainId] =
                                                nftsChainId;
                                        }
                                        if ((0, utils_1.isObject)(nftControllerState.allNfts) &&
                                            (0, utils_1.isObject)(nftControllerState.allNfts[allNftsByAddress])) {
                                            // Need to type cast because typescript is static typed
                                            // and typescript is
                                            delete nftControllerState.allNfts[allNftsByAddress][chainId];
                                        }
                                    }
                                });
                            }
                        });
                    }
                    transactionControllerState = (_p = (_o = state === null || state === void 0 ? void 0 : state.engine) === null || _o === void 0 ? void 0 : _o.backgroundState) === null || _p === void 0 ? void 0 : _p.TransactionController;
                    if (!(0, utils_1.isObject)(transactionControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid TransactionController state: '".concat(JSON.stringify(transactionControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    // Transaction Controller transactions object chain id property to hexadecimal
                    if (Array.isArray(transactionControllerState.transactions)) {
                        transactionControllerState.transactions.forEach(function (transaction, index) {
                            if (transaction && !(0, ethereumjs_util_1.isHexString)(transaction.chainId)) {
                                if (Array.isArray(transactionControllerState.transactions) &&
                                    (0, utils_1.isObject)(transactionControllerState.transactions[index])) {
                                    transactionControllerState.transactions[index].chainId = (0, controller_utils_1.toHex)(transaction.chainId);
                                }
                            }
                        });
                    }
                    tokenListControllerState = (_r = (_q = state === null || state === void 0 ? void 0 : state.engine) === null || _q === void 0 ? void 0 : _q.backgroundState) === null || _r === void 0 ? void 0 : _r.TokenListController;
                    newTokenListControllerState = (_t = (_s = state === null || state === void 0 ? void 0 : state.engine) === null || _s === void 0 ? void 0 : _s.backgroundState) === null || _t === void 0 ? void 0 : _t.TokenListController;
                    if (!(0, utils_1.isObject)(tokenListControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid TokenListController state: '".concat(JSON.stringify(tokenListControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.hasProperty)(tokenListControllerState, 'tokensChainsCache') ||
                        !(0, utils_1.isObject)(tokenListControllerState.tokensChainsCache)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid tokenListControllerState tokensChainsCache: '".concat(JSON.stringify(tokenListControllerState.tokensChainsCache), "'")));
                        return [2 /*return*/, state];
                    }
                    if (Object.keys(tokenListControllerState.tokensChainsCache).length) {
                        Object.keys(tokenListControllerState.tokensChainsCache).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                newTokenListControllerState.tokensChainsCache[hexChainId] =
                                    //@ts-expect-error Is verified on Line 508 that tokenChainsCache is a property
                                    tokenListControllerState.tokensChainsCache[chainId];
                                if ((0, utils_1.isObject)(tokenListControllerState.tokensChainsCache)) {
                                    delete tokenListControllerState.tokensChainsCache[chainId];
                                }
                            }
                        });
                    }
                    tokenRatesControllerState = (_v = (_u = state === null || state === void 0 ? void 0 : state.engine) === null || _u === void 0 ? void 0 : _u.backgroundState) === null || _v === void 0 ? void 0 : _v.TokenRatesController;
                    newTokenRatesControllerState = (_x = (_w = state === null || state === void 0 ? void 0 : state.engine) === null || _w === void 0 ? void 0 : _w.backgroundState) === null || _x === void 0 ? void 0 : _x.TokenRatesController;
                    if (!(0, utils_1.isObject)(tokenRatesControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid TokenRatesController state: '".concat(JSON.stringify(tokenRatesControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    if ((0, utils_1.isObject)(tokenRatesControllerState.contractExchangeRatesByChainId) &&
                        Object.keys(tokenRatesControllerState.contractExchangeRatesByChainId).length) {
                        Object.keys(tokenRatesControllerState.contractExchangeRatesByChainId).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                //@ts-expect-error At the time of that migrations assets controllers version had those properties, so those users will have that property on their phone storage, the migration was casted and that where it's wrong, we shouldn't cast migrations because the structure and property names change over time.
                                newTokenRatesControllerState.contractExchangeRatesByChainId[hexChainId] =
                                    //@ts-expect-error Is verified on Line 558 that contractExchangeRatesByChainId is a property
                                    tokenRatesControllerState.contractExchangeRatesByChainId[chainId];
                                if ((0, utils_1.isObject)(tokenRatesControllerState.contractExchangeRatesByChainId)) {
                                    delete tokenRatesControllerState.contractExchangeRatesByChainId[chainId];
                                }
                            }
                        });
                    }
                    tokensControllerState = (_z = (_y = state === null || state === void 0 ? void 0 : state.engine) === null || _y === void 0 ? void 0 : _y.backgroundState) === null || _z === void 0 ? void 0 : _z.TokensController;
                    newTokensControllerState = (_1 = (_0 = state === null || state === void 0 ? void 0 : state.engine) === null || _0 === void 0 ? void 0 : _0.backgroundState) === null || _1 === void 0 ? void 0 : _1.TokensController;
                    if (!(0, utils_1.isObject)(tokensControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid TokensController state: '".concat(JSON.stringify(tokensControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.hasProperty)(tokensControllerState, 'allTokens') ||
                        !(0, utils_1.isObject)(tokensControllerState.allTokens)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid TokensController allTokens: '".concat(JSON.stringify(tokensControllerState.allTokens), "'")));
                        return [2 /*return*/, state];
                    }
                    if (Object.keys(tokensControllerState.allTokens).length) {
                        Object.keys(tokensControllerState.allTokens).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                newTokensControllerState.allTokens[hexChainId] =
                                    //@ts-expect-error Is verified on Line 613 that allTokens is a property
                                    tokensControllerState.allTokens[chainId];
                                if ((0, utils_1.isObject)(tokensControllerState.allTokens)) {
                                    delete tokensControllerState.allTokens[chainId];
                                }
                            }
                        });
                    }
                    if (!(0, utils_1.hasProperty)(tokensControllerState, 'allIgnoredTokens') ||
                        !(0, utils_1.isObject)(tokensControllerState.allIgnoredTokens)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid TokensController allIgnoredTokens: '".concat(JSON.stringify(tokensControllerState.allIgnoredTokens), "'")));
                        return [2 /*return*/, state];
                    }
                    if (Object.keys(tokensControllerState.allIgnoredTokens).length) {
                        Object.keys(tokensControllerState.allIgnoredTokens).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                newTokensControllerState.allIgnoredTokens[hexChainId] =
                                    //@ts-expect-error Is verified on Line 643 that allIgnoredTokens is a property
                                    tokensControllerState.allIgnoredTokens[chainId];
                                if ((0, utils_1.isObject)(tokensControllerState.allIgnoredTokens)) {
                                    delete tokensControllerState.allIgnoredTokens[chainId];
                                }
                            }
                        });
                    }
                    if (!(0, utils_1.hasProperty)(tokensControllerState, 'allDetectedTokens') ||
                        !(0, utils_1.isObject)(tokensControllerState.allDetectedTokens)) {
                        (0, react_native_1.captureException)(new Error("Migration 29: Invalid TokensController allDetectedTokens: '".concat(JSON.stringify(tokensControllerState.allDetectedTokens), "'")));
                        return [2 /*return*/, state];
                    }
                    if (Object.keys(tokensControllerState.allDetectedTokens).length) {
                        Object.keys(tokensControllerState.allDetectedTokens).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                newTokensControllerState.allDetectedTokens[hexChainId] =
                                    //@ts-expect-error Is verified on Line 671 that allIgnoredTokens is a property
                                    tokensControllerState.allDetectedTokens[chainId];
                                if ((0, utils_1.isObject)(tokensControllerState.allDetectedTokens)) {
                                    delete tokensControllerState.allDetectedTokens[chainId];
                                }
                            }
                        });
                    }
                    return [2 /*return*/, state];
            }
        });
    });
}
exports["default"] = migrate;
