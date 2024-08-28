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
exports.__esModule = true;
var axios_1 = require("axios");
var Banner_1 = require("../../component-library/components/Banners/Banner");
var i18n_1 = require("../../../locales/i18n");
var customNetworks_1 = require("../../util/networks/customNetworks");
var controller_utils_1 = require("@metamask/controller-utils");
var findPopularNetwork = function (rpcUrl, chainId) {
    return customNetworks_1.PopularList.some(function (network) {
        var origin = new URL(network.rpcUrl).origin;
        return origin === rpcUrl && network.chainId === chainId;
    });
};
var findPopularNetworkName = function (name, chainId) {
    return customNetworks_1.PopularList.some(function (network) {
        return network.nickname.toLowerCase() === (name === null || name === void 0 ? void 0 : name.toLowerCase()) &&
            network.chainId === chainId;
    });
};
var findPopularNetworkSymbol = function (symbol, chainId) {
    return customNetworks_1.PopularList.some(function (network) { return network.ticker === symbol && network.chainId === chainId; });
};
var checkSafeNetwork = function (chainIdDecimal, rpcUrl, nickname, ticker) { return __awaiter(void 0, void 0, void 0, function () {
    var alerts, EVM_NATIVE_TOKEN_DECIMALS, response, safeChainsList, matchedChain, origin_1;
    var _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                alerts = [];
                EVM_NATIVE_TOKEN_DECIMALS = 18;
                return [4 /*yield*/, axios_1["default"].get('https://chainid.network/chains.json')];
            case 1:
                response = _g.sent();
                safeChainsList = response.data;
                matchedChain = safeChainsList.find(function (chain) { return chain.chainId.toString() === chainIdDecimal; });
                if (matchedChain) {
                    origin_1 = new URL(rpcUrl).origin;
                    if (!((_c = matchedChain.rpc) === null || _c === void 0 ? void 0 : _c.map(function (rpc) { return new URL(rpc).origin; }).includes(origin_1)) &&
                        !findPopularNetwork(origin_1, (0, controller_utils_1.toHex)(chainIdDecimal))) {
                        alerts.push({
                            alertError: (0, i18n_1.strings)('add_custom_network.invalid_rpc_url'),
                            alertSeverity: Banner_1.BannerAlertSeverity.Error,
                            alertOrigin: 'rpc_url'
                        });
                    }
                    if (((_d = matchedChain.nativeCurrency) === null || _d === void 0 ? void 0 : _d.decimals) !== EVM_NATIVE_TOKEN_DECIMALS) {
                        alerts.push({
                            alertError: (0, i18n_1.strings)('add_custom_network.invalid_chain_token_decimals'),
                            alertSeverity: Banner_1.BannerAlertSeverity.Warning,
                            alertOrigin: 'decimals'
                        });
                    }
                    if (((_e = matchedChain.name) === null || _e === void 0 ? void 0 : _e.toLowerCase()) !== (nickname === null || nickname === void 0 ? void 0 : nickname.toLowerCase()) &&
                        !findPopularNetworkName(nickname, (0, controller_utils_1.toHex)(chainIdDecimal))) {
                        alerts.push({
                            alertError: (0, i18n_1.strings)('add_custom_network.unrecognized_chain_name'),
                            alertSeverity: Banner_1.BannerAlertSeverity.Warning,
                            alertOrigin: 'chain_name'
                        });
                    }
                    if (((_f = matchedChain.nativeCurrency) === null || _f === void 0 ? void 0 : _f.symbol) !== ticker &&
                        !findPopularNetworkSymbol(ticker, (0, controller_utils_1.toHex)(chainIdDecimal))) {
                        alerts.push({
                            alertError: (0, i18n_1.strings)('add_custom_network.unrecognized_chain_ticker'),
                            alertSeverity: Banner_1.BannerAlertSeverity.Warning,
                            alertOrigin: 'chain_ticker'
                        });
                    }
                }
                if (!matchedChain) {
                    alerts.push({
                        alertError: (0, i18n_1.strings)('add_custom_network.unrecognized_chain_id'),
                        alertSeverity: Banner_1.BannerAlertSeverity.Error,
                        alertOrigin: 'unknown_chain'
                    });
                }
                return [2 /*return*/, alerts];
        }
    });
}); };
exports["default"] = checkSafeNetwork;
