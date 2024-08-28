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
var signatureRequest_1 = require("../../actions/signatureRequest");
var transaction_1 = require("../../actions/transaction");
var BlockaidBanner_types_1 = require("../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types");
var Engine_1 = require("../../core/Engine");
var store_1 = require("../../store");
var blockaid_1 = require("../../util/blockaid");
var Logger_1 = require("../../util/Logger");
var transaction_controller_1 = require("../../util/transaction-controller");
var transaction_controller_2 = require("@metamask/transaction-controller");
var walletconnect_1 = require("../../util/walletconnect");
var AppConstants_1 = require("../../core/AppConstants");
var security_alerts_api_1 = require("./security-alerts-api");
var networks_1 = require("../../util/networks");
var TRANSACTION_METHOD = 'eth_sendTransaction';
var TRANSACTION_METHODS = [TRANSACTION_METHOD, 'eth_sendRawTransaction'];
var CONFIRMATION_METHODS = Object.freeze([
    'eth_sendRawTransaction',
    TRANSACTION_METHOD,
    'eth_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'personal_sign',
]);
var SECURITY_ALERT_RESPONSE_FAILED = {
    result_type: BlockaidBanner_types_1.ResultType.Failed,
    reason: BlockaidBanner_types_1.Reason.failed,
    description: 'Validating the confirmation failed by throwing error.'
};
var SECURITY_ALERT_RESPONSE_IN_PROGRESS = {
    result_type: BlockaidBanner_types_1.ResultType.RequestInProgress,
    reason: BlockaidBanner_types_1.Reason.requestInProgress,
    description: 'Validating the confirmation in progress.'
};
function validateRequest(req, transactionId) {
    var _c;
    return __awaiter(this, void 0, void 0, function () {
        var _d, AccountsController, NetworkController, ppomController, chainId, isConfirmationMethod, isSupportedChain, internalAccounts, toAddress_1, isTransaction, securityAlertResponse, normalizedRequest, _e, e_1;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _d = Engine_1["default"].context, AccountsController = _d.AccountsController, NetworkController = _d.NetworkController, ppomController = _d.PPOMController;
                    chainId = NetworkController.state.providerConfig.chainId;
                    isConfirmationMethod = CONFIRMATION_METHODS.includes(req.method);
                    return [4 /*yield*/, isChainSupported(chainId)];
                case 1:
                    isSupportedChain = _f.sent();
                    if (!ppomController ||
                        !(0, blockaid_1.isBlockaidFeatureEnabled)() ||
                        !isConfirmationMethod ||
                        !isSupportedChain) {
                        return [2 /*return*/];
                    }
                    if (req.method === 'eth_sendTransaction') {
                        internalAccounts = AccountsController.listAccounts();
                        toAddress_1 = ((_c = req === null || req === void 0 ? void 0 : req.params) === null || _c === void 0 ? void 0 : _c[0]).to;
                        if (internalAccounts.some(function (_c) {
                            var address = _c.address;
                            return (address === null || address === void 0 ? void 0 : address.toLowerCase()) === (toAddress_1 === null || toAddress_1 === void 0 ? void 0 : toAddress_1.toLowerCase());
                        })) {
                            return [2 /*return*/];
                        }
                    }
                    isTransaction = isTransactionRequest(req);
                    _f.label = 2;
                case 2:
                    _f.trys.push([2, 7, 8, 9]);
                    if (isTransaction && !transactionId) {
                        securityAlertResponse = SECURITY_ALERT_RESPONSE_FAILED;
                        return [2 /*return*/];
                    }
                    setSecurityAlertResponse(req, SECURITY_ALERT_RESPONSE_IN_PROGRESS, transactionId);
                    normalizedRequest = normalizeRequest(req);
                    if (!(0, security_alerts_api_1.isSecurityAlertsAPIEnabled)()) return [3 /*break*/, 4];
                    return [4 /*yield*/, validateWithAPI(ppomController, chainId, normalizedRequest)];
                case 3:
                    _e = _f.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, validateWithController(ppomController, normalizedRequest)];
                case 5:
                    _e = _f.sent();
                    _f.label = 6;
                case 6:
                    securityAlertResponse = _e;
                    securityAlertResponse = __assign(__assign({}, securityAlertResponse), { req: req, chainId: chainId });
                    return [3 /*break*/, 9];
                case 7:
                    e_1 = _f.sent();
                    Logger_1["default"].log("Error validating JSON RPC using PPOM: ".concat(e_1));
                    return [3 /*break*/, 9];
                case 8:
                    if (!securityAlertResponse) {
                        securityAlertResponse = SECURITY_ALERT_RESPONSE_FAILED;
                    }
                    setSecurityAlertResponse(req, securityAlertResponse, transactionId, {
                        updateControllerState: true
                    });
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    });
}
function isChainSupported(chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var supportedChainIds, e_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    supportedChainIds = networks_1.BLOCKAID_SUPPORTED_CHAIN_IDS;
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, , 5]);
                    if (!(0, security_alerts_api_1.isSecurityAlertsAPIEnabled)()) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, security_alerts_api_1.getSecurityAlertsAPISupportedChainIds)()];
                case 2:
                    supportedChainIds = _c.sent();
                    _c.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    e_2 = _c.sent();
                    Logger_1["default"].log("Error fetching supported chains from security alerts API: ".concat(e_2));
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, supportedChainIds.includes(chainId)];
            }
        });
    });
}
function validateWithController(ppomController, request) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, ppomController.usePPOM(function (ppom) {
                        return ppom.validateJsonRpc(request);
                    })];
                case 1:
                    response = (_c.sent());
                    return [2 /*return*/, __assign(__assign({}, response), { source: BlockaidBanner_types_1.SecurityAlertSource.Local })];
            }
        });
    });
}
function validateWithAPI(ppomController, chainId, request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, e_3;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 4]);
                    return [4 /*yield*/, (0, security_alerts_api_1.validateWithSecurityAlertsAPI)(chainId, request)];
                case 1:
                    response = _c.sent();
                    return [2 /*return*/, __assign(__assign({}, response), { source: BlockaidBanner_types_1.SecurityAlertSource.API })];
                case 2:
                    e_3 = _c.sent();
                    Logger_1["default"].log("Error validating request with security alerts API: ".concat(e_3));
                    return [4 /*yield*/, validateWithController(ppomController, request)];
                case 3: return [2 /*return*/, _c.sent()];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function setSecurityAlertResponse(request, response, transactionId, _c) {
    var _d = _c === void 0 ? {} : _c, updateControllerState = _d.updateControllerState;
    if (isTransactionRequest(request)) {
        store_1.store.dispatch((0, transaction_1.setTransactionSecurityAlertResponse)(transactionId, response));
        if (updateControllerState) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (0, transaction_controller_1.updateSecurityAlertResponse)(transactionId, response);
        }
    }
    else {
        store_1.store.dispatch((0, signatureRequest_1["default"])(response));
    }
}
function isTransactionRequest(request) {
    return TRANSACTION_METHODS.includes(request.method);
}
function normalizeRequest(request) {
    var _c, _d, _e;
    if (request.method !== TRANSACTION_METHOD) {
        return request;
    }
    request.origin = (_d = (_c = request.origin) === null || _c === void 0 ? void 0 : _c.replace(walletconnect_1.WALLET_CONNECT_ORIGIN, '')) === null || _d === void 0 ? void 0 : _d.replace(AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN, '');
    var transactionParams = (((_e = request.params) === null || _e === void 0 ? void 0 : _e[0]) || {});
    var normalizedParams = (0, transaction_controller_2.normalizeTransactionParams)(transactionParams);
    return __assign(__assign({}, request), { params: [normalizedParams] });
}
exports["default"] = { validateRequest: validateRequest };
