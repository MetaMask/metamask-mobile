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
exports.handleBatchRpcResponse = void 0;
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
var handleBatchRpcResponse = function (_c) {
    var chainRpcs = _c.chainRpcs, batchRPCManager = _c.batchRPCManager, backgroundBridge = _c.backgroundBridge, msg = _c.msg, sendMessage = _c.sendMessage;
    return __awaiter(void 0, void 0, void 0, function () {
        var isLastRpc, hasError, origRpcId, result, data, response, data, response, nextRpc;
        var _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    isLastRpc = chainRpcs.index === chainRpcs.rpcs.length - 1;
                    hasError = !!((_d = msg === null || msg === void 0 ? void 0 : msg.data) === null || _d === void 0 ? void 0 : _d.error);
                    origRpcId = parseInt(chainRpcs.baseId);
                    result = chainRpcs.rpcs
                        .filter(function (rpc) { return rpc.response !== undefined; })
                        .map(function (rpc) { return rpc.response; });
                    result.push((_e = msg === null || msg === void 0 ? void 0 : msg.data) === null || _e === void 0 ? void 0 : _e.result);
                    DevLogger_1["default"].log("handleBatchRpcResponse origRpcId=".concat(origRpcId, " isLastRpc=").concat(isLastRpc, " hasError=").concat(hasError), chainRpcs);
                    if (!hasError) return [3 /*break*/, 2];
                    data = {
                        id: "".concat(origRpcId),
                        jsonrpc: '2.0',
                        result: result,
                        error: (_f = msg === null || msg === void 0 ? void 0 : msg.data) === null || _f === void 0 ? void 0 : _f.error
                    };
                    response = {
                        data: data,
                        name: 'metamask-provider'
                    };
                    // Delete the chain from the chainRPCManager
                    batchRPCManager.remove(chainRpcs.baseId);
                    return [4 /*yield*/, sendMessage({ msg: response })];
                case 1:
                    _h.sent();
                    return [3 /*break*/, 6];
                case 2:
                    if (!isLastRpc) return [3 /*break*/, 4];
                    // Respond to the original rpc call with the list of responses append the current response
                    DevLogger_1["default"].log("handleChainRpcResponse id=".concat(chainRpcs.baseId, " result"), result);
                    data = {
                        id: "".concat(origRpcId),
                        jsonrpc: '2.0',
                        result: result
                    };
                    response = {
                        data: data,
                        name: 'metamask-provider'
                    };
                    //  all batch have been handled can remove from the batch manager before processing it
                    batchRPCManager.remove(chainRpcs.baseId);
                    // Process the reponse as a normal rpc call
                    return [4 /*yield*/, sendMessage({ msg: response })];
                case 3:
                    // Process the reponse as a normal rpc call
                    _h.sent();
                    return [3 /*break*/, 6];
                case 4:
                    // Save response and send the next rpc method
                    batchRPCManager.addResponse({
                        id: chainRpcs.baseId,
                        index: chainRpcs.index,
                        response: (_g = msg === null || msg === void 0 ? void 0 : msg.data) === null || _g === void 0 ? void 0 : _g.result
                    });
                    // wait 500ms before sending the next rpc method To give user time to process UI feedbacks
                    return [4 /*yield*/, (0, wait_util_1.wait)(500)];
                case 5:
                    // wait 500ms before sending the next rpc method To give user time to process UI feedbacks
                    _h.sent();
                    nextRpc = chainRpcs.rpcs[chainRpcs.index + 1];
                    nextRpc.id = chainRpcs.baseId + "_".concat(chainRpcs.index + 1); // Add index to id to keep track of the order
                    nextRpc.jsonrpc = '2.0';
                    DevLogger_1["default"].log("handleChainRpcResponse method=".concat(nextRpc.method, " id=").concat(nextRpc.id), nextRpc.params);
                    backgroundBridge === null || backgroundBridge === void 0 ? void 0 : backgroundBridge.onMessage({
                        name: 'metamask-provider',
                        data: nextRpc,
                        origin: 'sdk'
                    });
                    _h.label = 6;
                case 6: return [2 /*return*/, isLastRpc || hasError];
            }
        });
    });
};
exports.handleBatchRpcResponse = handleBatchRpcResponse;
exports["default"] = exports.handleBatchRpcResponse;
