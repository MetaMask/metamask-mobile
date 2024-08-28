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
exports.handleSendMessage = void 0;
var react_native_1 = require("react-native");
var Routes_1 = require("../../../../app/constants/navigation/Routes");
var AppConstants_1 = require("../../../../app/core/AppConstants");
var Logger_1 = require("../../../util/Logger");
var device_1 = require("../../../util/device");
var NativeModules_1 = require("../../NativeModules");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
var handleBatchRpcResponse_1 = require("./handleBatchRpcResponse");
var handleSendMessage = function (_c) {
    var msg = _c.msg, connection = _c.connection;
    return __awaiter(void 0, void 0, void 0, function () {
        var msgId, method, chainRPCs, isLastRpcOrError, canRedirect, err_1;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 8, , 9]);
                    DevLogger_1["default"].log("[handleSendMessage] msg", msg);
                    connection.setLoading(false);
                    msgId = ((_d = msg === null || msg === void 0 ? void 0 : msg.data) === null || _d === void 0 ? void 0 : _d.id) + '';
                    method = connection.rpcQueueManager.getId(msgId);
                    chainRPCs = connection.batchRPCManager.getById(msgId);
                    DevLogger_1["default"].log("[handleSendMessage] chainRPCs", chainRPCs);
                    if (!chainRPCs) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, handleBatchRpcResponse_1["default"])({
                            chainRpcs: chainRPCs,
                            msg: msg,
                            batchRPCManager: connection.batchRPCManager,
                            backgroundBridge: connection.backgroundBridge,
                            // TODO: Replace "any" with type
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            sendMessage: function (_c) {
                                var newmsg = _c.msg;
                                return (0, exports.handleSendMessage)({ msg: newmsg, connection: connection });
                            }
                        })];
                case 1:
                    isLastRpcOrError = _f.sent();
                    // check if lastrpc or if an error occured during the chain
                    if (!isLastRpcOrError) {
                        // Only continue processing the message and goback if all rpcs in the batch have been handled
                        DevLogger_1["default"].log("[handleSendMessage] chainRPCs=".concat(chainRPCs, " NOT COMPLETED!"));
                        return [2 /*return*/];
                    }
                    // Always set the method to metamask_batch otherwise it may not have been set correctly because of the batch rpc flow.
                    method = SDKConnectConstants_1.RPC_METHODS.METAMASK_BATCH;
                    DevLogger_1["default"].log("[handleSendMessage] chainRPCs=".concat(chainRPCs, " COMPLETED!"));
                    _f.label = 2;
                case 2:
                    if (msgId && method) {
                        connection.rpcQueueManager.remove(msgId);
                    }
                    canRedirect = connection.rpcQueueManager.canRedirect({ method: method });
                    DevLogger_1["default"].log("[handleSendMessage] method=".concat(method, " trigger=").concat(connection.trigger, " id=").concat(msgId, " origin=").concat(connection.origin, " canRedirect=").concat(canRedirect), msg);
                    connection.remote.sendMessage(msg)["catch"](function (err) {
                        Logger_1["default"].log(err, "Connection::sendMessage failed to send");
                    });
                    if (connection.origin === AppConstants_1["default"].DEEPLINKS.ORIGIN_QR_CODE) {
                        DevLogger_1["default"].log("[handleSendMessage] origin=".concat(connection.origin, " --- skip goBack()"));
                        return [2 /*return*/];
                    }
                    if (!canRedirect) {
                        DevLogger_1["default"].log("[handleSendMessage] canRedirect=false method=".concat(method, " --- skip goBack()"), connection.rpcQueueManager);
                        connection.setLoading(false);
                        return [2 /*return*/];
                        // const currentRoute = connection.navigation?.getCurrentRoute()?.name;
                        // if (!method && currentRoute === 'AccountConnect') {
                        //   DevLogger.log(`[handleSendMessage] remove modal`);
                        //   if (
                        //     Device.isIos() &&
                        //     parseInt(Platform.Version as string) >= 17 &&
                        //     connection.navigation?.canGoBack()
                        //   ) {
                        //     const isLastPendingRequest = connection.rpcQueueManager.isEmpty();
                        //     if (!isLastPendingRequest) {
                        //       DevLogger.log(
                        //         `[handleSendMessage] pending request --- skip goback`,
                        //       );
                        //       return;
                        //     }
                        //     try {
                        //       DevLogger.log(
                        //         `[handleSendMessage] goBack()`,
                        //         connection.navigation.getCurrentRoute(),
                        //       );
                        //       connection.navigation?.goBack();
                        //       // Make sure there are no pending permissions requests before redirecting
                        //       await wait(200); // delay to allow modal to close
                        //       DevLogger.log(
                        //         `[handleSendMessage] navigate to ROOT_MODAL_FLOW from ${currentRoute}`,
                        //       );
                        //     } catch (_e) {
                        //       // Ignore temporarily until next stage of permissions system implementation
                        //       DevLogger.log(`[handleSendMessage] error goBack()`, _e);
                        //     }
                        //     connection.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                        //       screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
                        //     });
                        //   }
                        // }
                        // return;
                    }
                    if (connection.trigger !== 'deeplink' &&
                        connection.origin !== AppConstants_1["default"].DEEPLINKS.ORIGIN_DEEPLINK) {
                        DevLogger_1["default"].log("[handleSendMessage] NOT deeplink --- skip goBack()");
                        return [2 /*return*/];
                    }
                    if (!SDKConnectConstants_1.METHODS_TO_DELAY[method]) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, wait_util_1.wait)(1200)];
                case 3:
                    _f.sent();
                    _f.label = 4;
                case 4:
                    DevLogger_1["default"].log("[handleSendMessage] method=".concat(method, " trigger=").concat(connection.trigger, " origin=").concat(connection.origin, " id=").concat(msgId, " goBack()"));
                    // Trigger should be removed after redirect so we don't redirect the dapp next time and go back to nothing.
                    connection.trigger = 'resume';
                    if (!(device_1["default"].isIos() && parseInt(react_native_1.Platform.Version) >= 17)) return [3 /*break*/, 5];
                    (_e = connection.navigation) === null || _e === void 0 ? void 0 : _e.navigate(Routes_1["default"].MODAL.ROOT_MODAL_FLOW, {
                        screen: Routes_1["default"].SHEET.RETURN_TO_DAPP_MODAL
                    });
                    return [3 /*break*/, 7];
                case 5:
                    DevLogger_1["default"].log("[handleSendMessage] goBack()");
                    return [4 /*yield*/, NativeModules_1.Minimizer.goBack()];
                case 6:
                    _f.sent();
                    _f.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    err_1 = _f.sent();
                    Logger_1["default"].log(err_1, "Connection::sendMessage error while waiting for empty rpc queue");
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
};
exports.handleSendMessage = handleSendMessage;
exports["default"] = exports.handleSendMessage;
