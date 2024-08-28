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
var react_native_1 = require("react-native");
var valid_url_1 = require("valid-url");
var controller_utils_1 = require("@metamask/controller-utils");
var jsonRpcRequest_1 = require("../../util/jsonRpcRequest");
var Engine_1 = require("../Engine");
var rpc_errors_1 = require("@metamask/rpc-errors");
var networks_1 = require("../../util/networks");
var Analytics_1 = require("../../core/Analytics");
var networkController_1 = require("../../selectors/networkController");
var store_1 = require("../../store");
var networkChecker_util_1 = require("./networkChecker.util");
var EVM_NATIVE_TOKEN_DECIMALS = 18;
var waitForInteraction = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_c) {
        return [2 /*return*/, new Promise(function (resolve) {
                react_native_1.InteractionManager.runAfterInteractions(function () {
                    resolve();
                });
            })];
    });
}); };
var wallet_addEthereumChain = function (_c) {
    var req = _c.req, res = _c.res, requestUserApproval = _c.requestUserApproval, analytics = _c.analytics, startApprovalFlow = _c.startApprovalFlow, endApprovalFlow = _c.endApprovalFlow;
    return __awaiter(void 0, void 0, void 0, function () {
        var _d, CurrencyRateController, NetworkController, ApprovalController, params, chainId, _e, rawChainName, _f, blockExplorerUrls, _g, nativeCurrency, rpcUrls, allowedKeys, extraKeys, dirtyFirstValidRPCUrl, firstValidRPCUrl, firstValidBlockExplorerUrl, _chainId, actualChains, networkConfigurations, existingEntry, networkConfigurationId, networkConfiguration, currentChainId, analyticsParams, e_1, endpointChainId, err_1, chainName, ticker, requestData, alerts, analyticsParamsAdd, approvalFlowId, e_2, networkConfigurationId;
        var _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    _d = Engine_1["default"].context, CurrencyRateController = _d.CurrencyRateController, NetworkController = _d.NetworkController, ApprovalController = _d.ApprovalController;
                    if (!((_h = req.params) === null || _h === void 0 ? void 0 : _h[0]) || typeof req.params[0] !== 'object') {
                        throw rpc_errors_1.rpcErrors.invalidParams({
                            message: "Expected single, object parameter. Received:\n".concat(JSON.stringify(req.params))
                        });
                    }
                    params = req.params[0];
                    chainId = params.chainId, _e = params.chainName, rawChainName = _e === void 0 ? null : _e, _f = params.blockExplorerUrls, blockExplorerUrls = _f === void 0 ? null : _f, _g = params.nativeCurrency, nativeCurrency = _g === void 0 ? null : _g, rpcUrls = params.rpcUrls;
                    allowedKeys = {
                        chainId: true,
                        chainName: true,
                        blockExplorerUrls: true,
                        nativeCurrency: true,
                        rpcUrls: true,
                        iconUrls: true
                    };
                    extraKeys = Object.keys(params).filter(function (key) { return !allowedKeys[key]; });
                    if (extraKeys.length) {
                        throw rpc_errors_1.rpcErrors.invalidParams("Received unexpected keys on object parameter. Unsupported keys:\n".concat(extraKeys));
                    }
                    dirtyFirstValidRPCUrl = Array.isArray(rpcUrls)
                        ? rpcUrls.find(function (rpcUrl) { return valid_url_1["default"].isHttpsUri(rpcUrl); })
                        : null;
                    firstValidRPCUrl = dirtyFirstValidRPCUrl
                        ? // https://github.com/MetaMask/mobile-planning/issues/1589
                            dirtyFirstValidRPCUrl.replace(/([^/])\/+$/g, '$1')
                        : dirtyFirstValidRPCUrl;
                    firstValidBlockExplorerUrl = blockExplorerUrls !== null && Array.isArray(blockExplorerUrls)
                        ? blockExplorerUrls.find(function (blockExplorerUrl) {
                            return valid_url_1["default"].isHttpsUri(blockExplorerUrl);
                        })
                        : null;
                    if (!firstValidRPCUrl) {
                        throw rpc_errors_1.rpcErrors.invalidParams("Expected an array with at least one valid string HTTPS url 'rpcUrls', Received:\n".concat(rpcUrls));
                    }
                    if (blockExplorerUrls !== null && !firstValidBlockExplorerUrl) {
                        throw rpc_errors_1.rpcErrors.invalidParams("Expected null or array with at least one valid string HTTPS URL 'blockExplorerUrl'. Received: ".concat(blockExplorerUrls));
                    }
                    _chainId = typeof chainId === 'string' && chainId.toLowerCase();
                    if (!(0, networks_1.isPrefixedFormattedHexString)(_chainId)) {
                        throw rpc_errors_1.rpcErrors.invalidParams("Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n".concat(chainId));
                    }
                    if (!_chainId || !(0, controller_utils_1.isSafeChainId)(_chainId)) {
                        throw rpc_errors_1.rpcErrors.invalidParams("Invalid chain ID \"".concat(_chainId, "\": numerical value greater than max safe value. Received:\n").concat(chainId));
                    }
                    actualChains = __assign(__assign({}, controller_utils_1.ChainId), { aurora: undefined });
                    if (Object.values(actualChains).find(function (value) { return value === _chainId; })) {
                        throw rpc_errors_1.rpcErrors.invalidParams("May not specify default MetaMask chain.");
                    }
                    networkConfigurations = (0, networkController_1.selectNetworkConfigurations)(store_1.store.getState());
                    existingEntry = Object.entries(networkConfigurations).find(function (_c) {
                        var networkConfiguration = _c[1];
                        return networkConfiguration.chainId === _chainId;
                    });
                    if (!existingEntry) return [3 /*break*/, 5];
                    networkConfigurationId = existingEntry[0], networkConfiguration = existingEntry[1];
                    currentChainId = (0, networkController_1.selectChainId)(store_1.store.getState());
                    if (currentChainId === _chainId) {
                        res.result = null;
                        return [2 /*return*/];
                    }
                    analyticsParams = __assign({ chain_id: (0, networks_1.getDecimalChainId)(_chainId), source: 'Custom Network API', symbol: networkConfiguration.ticker }, analytics);
                    _j.label = 1;
                case 1:
                    _j.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, requestUserApproval({
                            type: 'SWITCH_ETHEREUM_CHAIN',
                            requestData: {
                                rpcUrl: networkConfiguration.rpcUrl,
                                chainId: _chainId,
                                chainName: networkConfiguration.nickname,
                                ticker: networkConfiguration.ticker,
                                type: 'switch'
                            }
                        })];
                case 2:
                    _j.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _j.sent();
                    Analytics_1.MetaMetrics.getInstance().trackEvent(Analytics_1.MetaMetricsEvents.NETWORK_REQUEST_REJECTED, analyticsParams);
                    throw rpc_errors_1.providerErrors.userRejectedRequest();
                case 4:
                    CurrencyRateController.updateExchangeRate(networkConfiguration.ticker);
                    NetworkController.setActiveNetwork(networkConfigurationId);
                    Analytics_1.MetaMetrics.getInstance().trackEvent(Analytics_1.MetaMetricsEvents.NETWORK_SWITCHED, analyticsParams);
                    res.result = null;
                    return [2 /*return*/];
                case 5:
                    _j.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, (0, jsonRpcRequest_1.jsonRpcRequest)(firstValidRPCUrl, 'eth_chainId')];
                case 6:
                    endpointChainId = (_j.sent());
                    return [3 /*break*/, 8];
                case 7:
                    err_1 = _j.sent();
                    throw rpc_errors_1.rpcErrors.internal({
                        message: "Request for method 'eth_chainId on ".concat(firstValidRPCUrl, " failed"),
                        data: { networkErr: err_1 }
                    });
                case 8:
                    if (_chainId !== endpointChainId) {
                        throw rpc_errors_1.rpcErrors.invalidParams({
                            message: "Chain ID returned by RPC URL ".concat(firstValidRPCUrl, " does not match ").concat(_chainId),
                            data: { chainId: endpointChainId }
                        });
                    }
                    if (typeof rawChainName !== 'string' || !rawChainName) {
                        throw rpc_errors_1.rpcErrors.invalidParams({
                            message: "Expected non-empty string 'chainName'. Received:\n".concat(rawChainName)
                        });
                    }
                    chainName = rawChainName.length > 100 ? rawChainName.substring(0, 100) : rawChainName;
                    if (nativeCurrency !== null) {
                        if (typeof nativeCurrency !== 'object' || Array.isArray(nativeCurrency)) {
                            throw rpc_errors_1.rpcErrors.invalidParams({
                                message: "Expected null or object 'nativeCurrency'. Received:\n".concat(nativeCurrency)
                            });
                        }
                        if (nativeCurrency.decimals !== EVM_NATIVE_TOKEN_DECIMALS) {
                            throw rpc_errors_1.rpcErrors.invalidParams({
                                message: "Expected the number 18 for 'nativeCurrency.decimals' when 'nativeCurrency' is provided. Received: ".concat(nativeCurrency.decimals)
                            });
                        }
                        if (!nativeCurrency.symbol || typeof nativeCurrency.symbol !== 'string') {
                            throw rpc_errors_1.rpcErrors.invalidParams({
                                message: "Expected a string 'nativeCurrency.symbol'. Received: ".concat(nativeCurrency.symbol)
                            });
                        }
                    }
                    ticker = (nativeCurrency === null || nativeCurrency === void 0 ? void 0 : nativeCurrency.symbol) || 'ETH';
                    if (typeof ticker !== 'string' || ticker.length < 2 || ticker.length > 6) {
                        throw rpc_errors_1.rpcErrors.invalidParams({
                            message: "Expected 2-6 character string 'nativeCurrency.symbol'. Received:\n".concat(ticker)
                        });
                    }
                    requestData = {
                        chainId: _chainId,
                        blockExplorerUrl: firstValidBlockExplorerUrl,
                        chainName: chainName,
                        rpcUrl: firstValidRPCUrl,
                        ticker: ticker
                    };
                    return [4 /*yield*/, (0, networkChecker_util_1["default"])((0, networks_1.getDecimalChainId)(_chainId), requestData.rpcUrl, requestData.chainName, requestData.ticker)];
                case 9:
                    alerts = _j.sent();
                    requestData.alerts = alerts;
                    analyticsParamsAdd = __assign({ chain_id: (0, networks_1.getDecimalChainId)(_chainId), source: 'Custom Network API', symbol: ticker }, analytics);
                    Analytics_1.MetaMetrics.getInstance().trackEvent(Analytics_1.MetaMetricsEvents.NETWORK_REQUESTED, analyticsParamsAdd);
                    // Remove all existing approvals, including other add network requests.
                    ApprovalController.clear(rpc_errors_1.providerErrors.userRejectedRequest());
                    // If existing approval request was an add network request, wait for
                    // it to be rejected and for the corresponding approval flow to be ended.
                    return [4 /*yield*/, waitForInteraction()];
                case 10:
                    // If existing approval request was an add network request, wait for
                    // it to be rejected and for the corresponding approval flow to be ended.
                    _j.sent();
                    approvalFlowId = startApprovalFlow().id;
                    _j.label = 11;
                case 11:
                    _j.trys.push([11, , 19, 20]);
                    _j.label = 12;
                case 12:
                    _j.trys.push([12, 14, , 15]);
                    return [4 /*yield*/, requestUserApproval({
                            type: 'ADD_ETHEREUM_CHAIN',
                            requestData: requestData
                        })];
                case 13:
                    _j.sent();
                    return [3 /*break*/, 15];
                case 14:
                    e_2 = _j.sent();
                    Analytics_1.MetaMetrics.getInstance().trackEvent(Analytics_1.MetaMetricsEvents.NETWORK_REQUEST_REJECTED, analyticsParamsAdd);
                    throw rpc_errors_1.providerErrors.userRejectedRequest();
                case 15: return [4 /*yield*/, NetworkController.upsertNetworkConfiguration({
                        rpcUrl: firstValidRPCUrl,
                        chainId: _chainId,
                        ticker: ticker,
                        nickname: chainName,
                        rpcPrefs: {
                            blockExplorerUrl: firstValidBlockExplorerUrl || undefined
                        }
                    }, {
                        // Metrics-related properties required, but the metric event is a no-op
                        // TODO: Use events for controller metric events
                        referrer: 'ignored',
                        source: 'ignored'
                    })];
                case 16:
                    networkConfigurationId = _j.sent();
                    Analytics_1.MetaMetrics.getInstance().trackEvent(Analytics_1.MetaMetricsEvents.NETWORK_ADDED, analyticsParamsAdd);
                    return [4 /*yield*/, waitForInteraction()];
                case 17:
                    _j.sent();
                    return [4 /*yield*/, requestUserApproval({
                            type: 'SWITCH_ETHEREUM_CHAIN',
                            requestData: __assign(__assign({}, requestData), { type: 'new' })
                        })];
                case 18:
                    _j.sent();
                    CurrencyRateController.updateExchangeRate(ticker);
                    NetworkController.setActiveNetwork(networkConfigurationId);
                    return [3 /*break*/, 20];
                case 19:
                    endApprovalFlow({ id: approvalFlowId });
                    return [7 /*endfinally*/];
                case 20:
                    res.result = null;
                    return [2 /*return*/];
            }
        });
    });
};
exports["default"] = wallet_addEthereumChain;
