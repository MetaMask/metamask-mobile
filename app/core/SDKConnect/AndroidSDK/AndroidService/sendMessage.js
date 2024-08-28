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
/* eslint-disable @typescript-eslint/no-explicit-any */
var Engine_1 = require("../../../Engine");
var NativeModules_1 = require("../../../NativeModules");
var Logger_1 = require("../../../../util/Logger");
var wait_util_1 = require("../../utils/wait.util");
var SDKConnectConstants_1 = require("../../SDKConnectConstants");
var handleBatchRpcResponse_1 = require("../../handlers/handleBatchRpcResponse");
var DevLogger_1 = require("../../utils/DevLogger");
function sendMessage(instance, message, forceRedirect) {
    var _c, _d;
    return __awaiter(this, void 0, void 0, function () {
        var id, rpcMethod, isConnectionResponse, accountsController, selectedAddress_1, lowercaseAccounts, isPartOfConnectedAddresses, remainingAccounts, reorderedAccounts, chainRPCs, isLastRpcOrError, error_1;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    id = (_c = message === null || message === void 0 ? void 0 : message.data) === null || _c === void 0 ? void 0 : _c.id;
                    rpcMethod = instance.rpcQueueManager.getId(id);
                    isConnectionResponse = rpcMethod === SDKConnectConstants_1.RPC_METHODS.ETH_REQUESTACCOUNTS;
                    if (isConnectionResponse) {
                        accountsController = Engine_1["default"].context.AccountsController;
                        selectedAddress_1 = accountsController
                            .getSelectedAccount()
                            .address.toLowerCase();
                        lowercaseAccounts = message.data.result.map(function (a) { return a.toLowerCase(); });
                        isPartOfConnectedAddresses = lowercaseAccounts.includes(selectedAddress_1);
                        if (isPartOfConnectedAddresses) {
                            remainingAccounts = lowercaseAccounts.filter(function (account) { return account !== selectedAddress_1; });
                            reorderedAccounts = __spreadArray([
                                selectedAddress_1
                            ], remainingAccounts, true);
                            message = __assign(__assign({}, message), { data: __assign(__assign({}, message.data), { result: reorderedAccounts }) });
                        }
                    }
                    instance.communicationClient.sendMessage(JSON.stringify(message));
                    DevLogger_1["default"].log("AndroidService::sendMessage method=".concat(rpcMethod), message);
                    chainRPCs = instance.batchRPCManager.getById(id);
                    if (!chainRPCs) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, handleBatchRpcResponse_1["default"])({
                            chainRpcs: chainRPCs,
                            msg: message,
                            backgroundBridge: instance.bridgeByClientId[(_d = instance.currentClientId) !== null && _d !== void 0 ? _d : ''],
                            batchRPCManager: instance.batchRPCManager,
                            sendMessage: function (_c) {
                                var msg = _c.msg;
                                return instance.sendMessage(msg);
                            }
                        })];
                case 1:
                    isLastRpcOrError = _e.sent();
                    DevLogger_1["default"].log("AndroidService::sendMessage isLastRpc=".concat(isLastRpcOrError), chainRPCs);
                    if (!isLastRpcOrError) {
                        DevLogger_1["default"].log("AndroidService::sendMessage NOT last rpc --- skip goBack()", chainRPCs);
                        instance.rpcQueueManager.remove(id);
                        // Only continue processing the message and goback if all rpcs in the batch have been handled
                        return [2 /*return*/];
                    }
                    // Always set the method to metamask_batch otherwise it may not have been set correctly because of the batch rpc flow.
                    rpcMethod = SDKConnectConstants_1.RPC_METHODS.METAMASK_BATCH;
                    DevLogger_1["default"].log("AndroidService::sendMessage chainRPCs=".concat(chainRPCs, " COMPLETED!"));
                    _e.label = 2;
                case 2:
                    instance.rpcQueueManager.remove(id);
                    if (!rpcMethod && forceRedirect !== true) {
                        DevLogger_1["default"].log("AndroidService::sendMessage no rpc method --- rpcMethod=".concat(rpcMethod, " forceRedirect=").concat(forceRedirect, " --- skip goBack()"));
                        return [2 /*return*/];
                    }
                    _e.label = 3;
                case 3:
                    _e.trys.push([3, 6, , 7]);
                    if (!SDKConnectConstants_1.METHODS_TO_DELAY[rpcMethod]) return [3 /*break*/, 5];
                    // Add delay to see the feedback modal
                    return [4 /*yield*/, (0, wait_util_1.wait)(1000)];
                case 4:
                    // Add delay to see the feedback modal
                    _e.sent();
                    _e.label = 5;
                case 5:
                    if (!instance.rpcQueueManager.isEmpty()) {
                        DevLogger_1["default"].log("AndroidService::sendMessage NOT empty --- skip goBack()", instance.rpcQueueManager.get());
                        return [2 /*return*/];
                    }
                    DevLogger_1["default"].log("AndroidService::sendMessage empty --- goBack()");
                    NativeModules_1.Minimizer.goBack();
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _e.sent();
                    Logger_1["default"].log(error_1, "AndroidService:: error waiting for empty rpc queue");
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports["default"] = sendMessage;
