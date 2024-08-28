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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
exports.__esModule = true;
var utils_1 = require("@metamask/utils");
var react_native_1 = require("@sentry/react-native");
var controller_utils_1 = require("@metamask/controller-utils");
//@ts-expect-error - This error is expected, but ethereumjs-util exports this function
var ethereumjs_util_1 = require("ethereumjs-util");
/**
 * This migration is to address the users that were impacted by the tokens missing on their wallet
 * Because the chain id was not migrated to hexadecimal format
 * And still didn't import the tokens again
 * @param state
 * @returns
 */
function migrate(stateAsync) {
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    return __awaiter(this, void 0, void 0, function () {
        var state, engine, restState, engine, restState, tokenListControllerState, newTokenListControllerState, tokenRatesControllerState, newTokenRatesControllerState, tokensControllerState, newTokensControllerState;
        return __generator(this, function (_q) {
            switch (_q.label) {
                case 0: return [4 /*yield*/, stateAsync];
                case 1:
                    state = _q.sent();
                    if (!(0, utils_1.isObject)(state)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid state: '".concat(typeof state, "'")));
                        // Force vault corruption if state is completely corrupt
                        return [2 /*return*/, {}];
                    }
                    if (!(0, utils_1.isObject)(state.engine)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid engine state: '".concat(typeof state.engine, "'")));
                        engine = state.engine, restState = __rest(state, ["engine"]);
                        return [2 /*return*/, restState];
                    }
                    if (!(0, utils_1.isObject)(state.engine.backgroundState)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid engine backgroundState: '".concat(typeof state.engine
                            .backgroundState, "'")));
                        engine = state.engine, restState = __rest(state, ["engine"]);
                        return [2 /*return*/, restState];
                    }
                    tokenListControllerState = (_d = (_c = state === null || state === void 0 ? void 0 : state.engine) === null || _c === void 0 ? void 0 : _c.backgroundState) === null || _d === void 0 ? void 0 : _d.TokenListController;
                    newTokenListControllerState = (_f = (_e = state === null || state === void 0 ? void 0 : state.engine) === null || _e === void 0 ? void 0 : _e.backgroundState) === null || _f === void 0 ? void 0 : _f.TokenListController;
                    if (!(0, utils_1.isObject)(tokenListControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid TokenListController state: '".concat(JSON.stringify(tokenListControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.hasProperty)(tokenListControllerState, 'tokensChainsCache') ||
                        !(0, utils_1.isObject)(tokenListControllerState.tokensChainsCache)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid tokenListControllerState tokensChainsCache: '".concat(JSON.stringify(tokenListControllerState.tokensChainsCache), "'")));
                        return [2 /*return*/, state];
                    }
                    if (Object.keys(tokenListControllerState.tokensChainsCache).length) {
                        Object.keys(tokenListControllerState.tokensChainsCache).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                if (!Object.prototype.hasOwnProperty.call(newTokenListControllerState.tokensChainsCache, hexChainId)) {
                                    newTokenListControllerState.tokensChainsCache[hexChainId] =
                                        //@ts-expect-error Is verified on Line 508 that tokenChainsCache is a property
                                        tokenListControllerState.tokensChainsCache[chainId];
                                }
                                if ((0, utils_1.isObject)(tokenListControllerState.tokensChainsCache)) {
                                    delete tokenListControllerState.tokensChainsCache[chainId];
                                }
                            }
                        });
                    }
                    tokenRatesControllerState = (_h = (_g = state === null || state === void 0 ? void 0 : state.engine) === null || _g === void 0 ? void 0 : _g.backgroundState) === null || _h === void 0 ? void 0 : _h.TokenRatesController;
                    newTokenRatesControllerState = (_k = (_j = state === null || state === void 0 ? void 0 : state.engine) === null || _j === void 0 ? void 0 : _j.backgroundState) === null || _k === void 0 ? void 0 : _k.TokenRatesController;
                    if (!(0, utils_1.isObject)(tokenRatesControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid TokenRatesController state: '".concat(JSON.stringify(tokenRatesControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    if ((0, utils_1.isObject)(tokenRatesControllerState.contractExchangeRatesByChainId) &&
                        Object.keys(tokenRatesControllerState.contractExchangeRatesByChainId).length) {
                        Object.keys(tokenRatesControllerState.contractExchangeRatesByChainId).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                if (!Object.prototype.hasOwnProperty.call(
                                //@ts-expect-error At the time of that migrations assets controllers version had those properties, so those users will have that property on their phone storage, the migration was casted and that where it's wrong, we shouldn't cast migrations because the structure and property names change over time.
                                newTokenRatesControllerState.contractExchangeRatesByChainId, hexChainId)) {
                                    //@ts-expect-error At the time of that migrations assets controllers version had those properties, so those users will have that property on their phone storage, the migration was casted and that where it's wrong, we shouldn't cast migrations because the structure and property names change over time.
                                    newTokenRatesControllerState.contractExchangeRatesByChainId[hexChainId] =
                                        //@ts-expect-error Is verified on Line 558 that contractExchangeRatesByChainId is a property
                                        tokenRatesControllerState.contractExchangeRatesByChainId[chainId];
                                }
                                if ((0, utils_1.isObject)(tokenRatesControllerState.contractExchangeRatesByChainId)) {
                                    delete tokenRatesControllerState.contractExchangeRatesByChainId[chainId];
                                }
                            }
                        });
                    }
                    tokensControllerState = (_m = (_l = state === null || state === void 0 ? void 0 : state.engine) === null || _l === void 0 ? void 0 : _l.backgroundState) === null || _m === void 0 ? void 0 : _m.TokensController;
                    newTokensControllerState = (_p = (_o = state === null || state === void 0 ? void 0 : state.engine) === null || _o === void 0 ? void 0 : _o.backgroundState) === null || _p === void 0 ? void 0 : _p.TokensController;
                    if (!(0, utils_1.isObject)(tokensControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid TokensController state: '".concat(JSON.stringify(tokensControllerState), "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.hasProperty)(tokensControllerState, 'allTokens') ||
                        !(0, utils_1.isObject)(tokensControllerState.allTokens)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid TokensController allTokens: '".concat(JSON.stringify(tokensControllerState.allTokens), "'")));
                        return [2 /*return*/, state];
                    }
                    if (Object.keys(tokensControllerState.allTokens).length) {
                        Object.keys(tokensControllerState.allTokens).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                if (!Object.prototype.hasOwnProperty.call(newTokensControllerState.allTokens, hexChainId)) {
                                    newTokensControllerState.allTokens[hexChainId] =
                                        //@ts-expect-error Is verified on Line 613 that allTokens is a property
                                        tokensControllerState.allTokens[chainId];
                                }
                                if ((0, utils_1.isObject)(tokensControllerState.allTokens)) {
                                    delete tokensControllerState.allTokens[chainId];
                                }
                            }
                        });
                    }
                    if (!(0, utils_1.hasProperty)(tokensControllerState, 'allIgnoredTokens') ||
                        !(0, utils_1.isObject)(tokensControllerState.allIgnoredTokens)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid TokensController allIgnoredTokens: '".concat(JSON.stringify(tokensControllerState.allIgnoredTokens), "'")));
                        return [2 /*return*/, state];
                    }
                    if (Object.keys(tokensControllerState.allIgnoredTokens).length) {
                        Object.keys(tokensControllerState.allIgnoredTokens).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                if (!Object.prototype.hasOwnProperty.call(newTokensControllerState.allIgnoredTokens, hexChainId)) {
                                    newTokensControllerState.allIgnoredTokens[hexChainId] =
                                        //@ts-expect-error Is verified on Line 643 that allIgnoredTokens is a property
                                        tokensControllerState.allIgnoredTokens[chainId];
                                }
                                if ((0, utils_1.isObject)(tokensControllerState.allIgnoredTokens)) {
                                    delete tokensControllerState.allIgnoredTokens[chainId];
                                }
                            }
                        });
                    }
                    if (!(0, utils_1.hasProperty)(tokensControllerState, 'allDetectedTokens') ||
                        !(0, utils_1.isObject)(tokensControllerState.allDetectedTokens)) {
                        (0, react_native_1.captureException)(new Error("Migration 31: Invalid TokensController allDetectedTokens: '".concat(JSON.stringify(tokensControllerState.allDetectedTokens), "'")));
                        return [2 /*return*/, state];
                    }
                    if (Object.keys(tokensControllerState.allDetectedTokens).length) {
                        Object.keys(tokensControllerState.allDetectedTokens).forEach(function (chainId) {
                            if (!(0, ethereumjs_util_1.isHexString)(chainId)) {
                                var hexChainId = (0, controller_utils_1.toHex)(chainId);
                                if (!Object.prototype.hasOwnProperty.call(newTokensControllerState.allDetectedTokens, hexChainId)) {
                                    newTokensControllerState.allDetectedTokens[hexChainId] =
                                        //@ts-expect-error Is verified on Line 671 that allIgnoredTokens is a property
                                        tokensControllerState.allDetectedTokens[chainId];
                                }
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
