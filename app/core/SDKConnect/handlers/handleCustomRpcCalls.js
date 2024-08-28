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
exports.handleCustomRpcCalls = void 0;
var react_native_1 = require("react-native");
var Logger_1 = require("../../../util/Logger");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
var handleRpcOverwrite_1 = require("./handleRpcOverwrite");
var Routes_1 = require("../../../constants/navigation/Routes");
var handleSendMessage_1 = require("./handleSendMessage");
var utils_1 = require("../../../components/UI/Ramp/routes/utils");
var handleCustomRpcCalls = function (_c) {
    var rpc = _c.rpc, batchRPCManager = _c.batchRPCManager, selectedAddress = _c.selectedAddress, selectedChainId = _c.selectedChainId, connection = _c.connection, navigation = _c.navigation;
    return __awaiter(void 0, void 0, void 0, function () {
        var id, method, params, lcMethod, processedMessage, targetRpc, wrapedRpc, rpcs, batchRpc, target, targetToken, targetAmount, msg;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    id = rpc.id, method = rpc.method, params = rpc.params;
                    lcMethod = method.toLowerCase();
                    processedMessage = { method: method, id: id, params: params, jsonrpc: '2.0' };
                    DevLogger_1["default"].log("handleCustomRpcCalls selectedAddress=".concat(selectedAddress, " selectedChainId=").concat(selectedChainId), processedMessage);
                    if (!(lcMethod === SDKConnectConstants_1.RPC_METHODS.METAMASK_CONNECTWITH.toLowerCase())) return [3 /*break*/, 3];
                    if (!(Array.isArray(params) && params.length > 0)) {
                        throw new Error('Invalid message format');
                    }
                    if (!(react_native_1.Platform.OS === 'ios')) return [3 /*break*/, 2];
                    // TODO: why does ios (older devices) requires a delay after request is initially approved?
                    return [4 /*yield*/, (0, wait_util_1.wait)(1000)];
                case 1:
                    // TODO: why does ios (older devices) requires a delay after request is initially approved?
                    _d.sent();
                    _d.label = 2;
                case 2:
                    targetRpc = params[0];
                    wrapedRpc = (0, handleRpcOverwrite_1["default"])({
                        // TODO: Replace "any" with type
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        rpc: targetRpc,
                        accountAddress: selectedAddress,
                        selectedChainId: selectedChainId
                    });
                    processedMessage.params = wrapedRpc.params;
                    processedMessage.method = wrapedRpc.method;
                    return [3 /*break*/, 7];
                case 3:
                    if (!(lcMethod === SDKConnectConstants_1.RPC_METHODS.METAMASK_CONNECTSIGN.toLowerCase())) return [3 /*break*/, 6];
                    if (!(Array.isArray(params) && params.length > 0)) {
                        throw new Error('Invalid message format');
                    }
                    if (!(react_native_1.Platform.OS === 'ios')) return [3 /*break*/, 5];
                    // TODO: why does ios (older devices) requires a delay after request is initially approved?
                    return [4 /*yield*/, (0, wait_util_1.wait)(1000)];
                case 4:
                    // TODO: why does ios (older devices) requires a delay after request is initially approved?
                    _d.sent();
                    _d.label = 5;
                case 5:
                    processedMessage.method = SDKConnectConstants_1.RPC_METHODS.PERSONAL_SIGN;
                    processedMessage.params = __spreadArray(__spreadArray([], params, true), [selectedAddress], false);
                    DevLogger_1["default"].log("metamask_connectSign selectedAddress=".concat(selectedAddress, " id=").concat(id), processedMessage);
                    Logger_1["default"].log("metamask_connectSign selectedAddress=".concat(selectedAddress), params);
                    return [3 /*break*/, 7];
                case 6:
                    if (lcMethod === SDKConnectConstants_1.RPC_METHODS.METAMASK_BATCH.toLowerCase()) {
                        if (!(Array.isArray(params) && params.length > 0)) {
                            throw new Error('Invalid message format');
                        }
                        rpcs = params;
                        // Add rpcs to the batch manager
                        batchRPCManager.add({ id: id, rpcs: rpcs });
                        batchRpc = rpcs[0];
                        processedMessage.id = id + "_0"; // Add index to id to keep track of the order
                        processedMessage.jsonrpc = '2.0';
                        processedMessage.method = batchRpc.method;
                        processedMessage.params = batchRpc.params;
                        DevLogger_1["default"].log("handleCustomRpcCalls method=".concat(method, " id=").concat(id), processedMessage);
                    }
                    else if (lcMethod === SDKConnectConstants_1.RPC_METHODS.METAMASK_OPEN.toLowerCase()) {
                        if (!(Array.isArray(params) && params.length > 0)) {
                            throw new Error('Invalid message format');
                        }
                        target = params[0].target;
                        DevLogger_1["default"].log("handleCustomRpcCalls method=".concat(method, " id=").concat(id, " target=").concat(target), navigation);
                        if (target === 'swap') {
                            targetToken = params[0].token;
                            targetAmount = params[0].amount;
                            DevLogger_1["default"].log("[handleCustomRpcCalls] targetToken=".concat(targetToken, " amount=").concat(targetAmount));
                            navigation === null || navigation === void 0 ? void 0 : navigation.navigate(Routes_1["default"].SWAPS);
                        }
                        else {
                            navigation === null || navigation === void 0 ? void 0 : navigation.navigate.apply(navigation, (0, utils_1.createBuyNavigationDetails)());
                        }
                        if (connection) {
                            msg = {
                                data: {
                                    result: null,
                                    id: processedMessage.id,
                                    jsonrpc: '2.0'
                                },
                                name: 'metamask-provider'
                            };
                            (0, handleSendMessage_1["default"])({
                                msg: msg,
                                connection: connection
                            })["catch"](function (error) {
                                Logger_1["default"].log(error, "Failed to send message");
                            });
                            return [2 /*return*/, undefined];
                        }
                    }
                    _d.label = 7;
                case 7: return [2 /*return*/, processedMessage];
            }
        });
    });
};
exports.handleCustomRpcCalls = handleCustomRpcCalls;
exports["default"] = exports.handleCustomRpcCalls;
