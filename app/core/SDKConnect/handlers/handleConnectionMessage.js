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
exports.handleConnectionMessage = void 0;
var controller_utils_1 = require("@metamask/controller-utils");
var sdk_communication_layer_1 = require("@metamask/sdk-communication-layer");
var Logger_1 = require("../../../util/Logger");
var Engine_1 = require("../../Engine");
var Permissions_1 = require("../../Permissions");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
var checkPermissions_1 = require("./checkPermissions");
var handleCustomRpcCalls_1 = require("./handleCustomRpcCalls");
var handleSendMessage_1 = require("./handleSendMessage");
// eslint-disable-next-line
var version = require('../../../../package.json').version;
var lcLogguedRPCs = [
    'eth_sendTransaction',
    'eth_signTypedData',
    'eth_signTransaction',
    'personal_sign',
    'wallet_requestPermissions',
    'wallet_switchEthereumChain',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'metamask_connectSign',
    'metamask_connectWith',
    'metamask_batch',
].map(function (method) { return method.toLowerCase(); });
var handleConnectionMessage = function (_c) {
    var message = _c.message, engine = _c.engine, connection = _c.connection;
    return __awaiter(void 0, void 0, void 0, function () {
        var keyringController, accountsController, selectedInternalAccountChecksummedAddress, networkController, chainId, error_1, msg, processedRpc;
        var _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    // TODO should probably handle this in a separate EventType.TERMINATE event.
                    // handle termination message
                    if (message.type === sdk_communication_layer_1.MessageType.TERMINATE) {
                        // Delete connection from storage
                        connection.onTerminate({ channelId: connection.channelId });
                        return [2 /*return*/];
                    }
                    else if (message.type === 'ping') {
                        DevLogger_1["default"].log("Connection::ping id=".concat(connection.channelId));
                        return [2 /*return*/];
                    }
                    // ignore anything other than RPC methods
                    if (!message.method || !message.id) {
                        DevLogger_1["default"].log("Connection::onMessage invalid message", message);
                        return [2 /*return*/];
                    }
                    DevLogger_1["default"].log("Connection::onMessage id=".concat(connection.channelId, " method=").concat(message.method));
                    connection.setLoading(false);
                    if (lcLogguedRPCs.includes(message.method.toLowerCase())) {
                        // Save analytics data on tracked methods
                        (0, sdk_communication_layer_1.SendAnalytics)({
                            id: connection.channelId,
                            event: sdk_communication_layer_1.TrackingEvents.SDK_RPC_REQUEST_RECEIVED,
                            sdkVersion: (_d = connection.originatorInfo) === null || _d === void 0 ? void 0 : _d.apiVersion,
                            walletVersion: version,
                            params: {
                                method: message.method,
                                from: 'mobile_wallet'
                            }
                        }, connection.socketServerUrl)["catch"](function (error) {
                            Logger_1["default"].error(error, 'SendAnalytics failed');
                        });
                    }
                    keyringController = engine.context.KeyringController;
                    return [4 /*yield*/, (0, wait_util_1.waitForKeychainUnlocked)({
                            keyringController: keyringController,
                            context: 'connection::on_message'
                        })];
                case 1:
                    _h.sent();
                    accountsController = Engine_1["default"].context.AccountsController;
                    selectedInternalAccountChecksummedAddress = (0, controller_utils_1.toChecksumHexAddress)(accountsController.getSelectedAccount().address);
                    networkController = engine.context.NetworkController;
                    chainId = networkController.state.providerConfig.chainId;
                    _h.label = 2;
                case 2:
                    _h.trys.push([2, 7, , 8]);
                    return [4 /*yield*/, (0, checkPermissions_1["default"])({ message: message, connection: connection, engine: engine })];
                case 3:
                    _h.sent();
                    DevLogger_1["default"].log("[handleConnectionMessage] checkPermissions passed -- method=".concat(message.method, " -- hasRelayPersistence=").concat(connection.remote.hasRelayPersistence()));
                    if (!!connection.remote.hasRelayPersistence()) return [3 /*break*/, 6];
                    if (!!connection.receivedDisconnect) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, wait_util_1.waitForConnectionReadiness)({ connection: connection })];
                case 4:
                    _h.sent();
                    connection.sendAuthorized();
                    return [3 /*break*/, 6];
                case 5:
                    // Reset state to continue communication after reconnection.
                    connection.isReady = true;
                    connection.receivedDisconnect = false;
                    _h.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_1 = _h.sent();
                    msg = {
                        data: {
                            error: error_1,
                            id: message.id,
                            jsonrpc: '2.0'
                        },
                        name: 'metamask-provider'
                    };
                    (0, handleSendMessage_1["default"])({
                        msg: msg,
                        connection: connection
                    })["catch"](function () {
                        Logger_1["default"].log(error_1, "Connection approval failed");
                    });
                    connection.approvalPromise = undefined;
                    return [2 /*return*/];
                case 8: return [4 /*yield*/, (0, handleCustomRpcCalls_1["default"])({
                        batchRPCManager: connection.batchRPCManager,
                        selectedAddress: selectedInternalAccountChecksummedAddress,
                        selectedChainId: chainId,
                        connection: connection,
                        navigation: connection.navigation,
                        rpc: {
                            id: message.id,
                            method: message.method,
                            // TODO: Replace "any" with type
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            params: message.params
                        }
                    })];
                case 9:
                    processedRpc = _h.sent();
                    if (!processedRpc) return [3 /*break*/, 13];
                    DevLogger_1["default"].log("[handleConnectionMessage] processedRpc", processedRpc);
                    connection.rpcQueueManager.add({
                        id: (_e = processedRpc === null || processedRpc === void 0 ? void 0 : processedRpc.id) !== null && _e !== void 0 ? _e : message.id,
                        method: (_f = processedRpc === null || processedRpc === void 0 ? void 0 : processedRpc.method) !== null && _f !== void 0 ? _f : message.method
                    });
                    if (!!connection.backgroundBridge) return [3 /*break*/, 11];
                    return [4 /*yield*/, (0, wait_util_1.waitForCondition)({
                            fn: function () {
                                DevLogger_1["default"].log("[handleConnectionMessage] waiting for backgroundBridge", connection.backgroundBridge);
                                return connection.backgroundBridge !== undefined;
                            },
                            context: 'handleConnectionMessage',
                            waitTime: 1000
                        })];
                case 10:
                    _h.sent();
                    _h.label = 11;
                case 11: 
                // wait for accounts to be loaded
                return [4 /*yield*/, (0, wait_util_1.waitForAsyncCondition)({
                        fn: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var accounts;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0: return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(connection.channelId)];
                                    case 1:
                                        accounts = _c.sent();
                                        DevLogger_1["default"].log("handleDeeplink::waitForAsyncCondition accounts", accounts);
                                        return [2 /*return*/, accounts.length > 0];
                                }
                            });
                        }); },
                        context: 'deeplink',
                        waitTime: 500
                    })];
                case 12:
                    // wait for accounts to be loaded
                    _h.sent();
                    (_g = connection.backgroundBridge) === null || _g === void 0 ? void 0 : _g.onMessage({
                        name: 'metamask-provider',
                        data: processedRpc,
                        origin: 'sdk'
                    });
                    _h.label = 13;
                case 13:
                    // Update initial connection state
                    connection.initialConnection = false;
                    return [2 /*return*/];
            }
        });
    });
};
exports.handleConnectionMessage = handleConnectionMessage;
exports["default"] = exports.handleConnectionMessage;
