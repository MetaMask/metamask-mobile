"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var eventemitter2_1 = require("eventemitter2");
var react_native_1 = require("react-native");
var Engine_1 = require("../../Engine");
var NativeModules_1 = require("../../NativeModules");
var RPCQueueManager_1 = require("../RPCQueueManager");
var sdk_communication_layer_1 = require("@metamask/sdk-communication-layer");
var Logger_1 = require("../../../util/Logger");
var AppConstants_1 = require("../../AppConstants");
var wait_util_1 = require("../utils/wait.util");
var BackgroundBridge_1 = require("../../BackgroundBridge/BackgroundBridge");
var SDKConnect_1 = require("../SDKConnect");
var deeplinks_1 = require("../../../constants/deeplinks");
var BatchRPCManager_1 = require("../BatchRPCManager");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var handleCustomRpcCalls_1 = require("../handlers/handleCustomRpcCalls");
var DevLogger_1 = require("../utils/DevLogger");
var AndroidNativeSDKEventHandler_1 = require("./AndroidNativeSDKEventHandler");
var sendMessage_1 = require("./AndroidService/sendMessage");
var getDefaultBridgeParams_1 = require("./getDefaultBridgeParams");
var controller_utils_1 = require("@metamask/controller-utils");
var AndroidService = /** @class */ (function (_super) {
    __extends(AndroidService, _super);
    function AndroidService() {
        var _this = _super.call(this) || this;
        _this.communicationClient = react_native_1.NativeModules.CommunicationClient;
        _this.connections = {};
        _this.rpcQueueManager = new RPCQueueManager_1.RPCQueueManager();
        _this.bridgeByClientId = {};
        _this.batchRPCManager = new BatchRPCManager_1["default"]('android');
        _this.eventHandler = new AndroidNativeSDKEventHandler_1["default"]();
        _this.setupEventListeners()
            .then(function () {
            DevLogger_1["default"].log("AndroidService::constructor event listeners setup completed");
            //
        })["catch"](function (err) {
            Logger_1["default"].log(err, "AndroidService:: error setting up event listeners");
        });
        return _this;
    }
    AndroidService.prototype.setupEventListeners = function () {
        return __awaiter(this, void 0, void 0, function () {
            var keyringController, rawConnections, err_1;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        keyringController = Engine_1["default"].context.KeyringController;
                        return [4 /*yield*/, (0, wait_util_1.waitForKeychainUnlocked)({
                                keyringController: keyringController,
                                context: 'AndroidService::setupEventListener'
                            })];
                    case 1:
                        _c.sent();
                        DevLogger_1["default"].log("AndroidService::setupEventListeners loading connections");
                        return [4 /*yield*/, SDKConnect_1.SDKConnect.getInstance().loadDappConnections()];
                    case 2:
                        rawConnections = _c.sent();
                        if (rawConnections) {
                            Object.values(rawConnections).forEach(function (connection) {
                                DevLogger_1["default"].log("AndroidService::setupEventListeners recover client: ".concat(connection.id));
                                _this.connections[connection.id] = {
                                    connected: false,
                                    clientId: connection.id,
                                    originatorInfo: connection.originatorInfo,
                                    validUntil: connection.validUntil
                                };
                            });
                        }
                        else {
                            DevLogger_1["default"].log("AndroidService::setupEventListeners no previous connections found");
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _c.sent();
                        console.error("AndroidService::setupEventListeners error", err_1);
                        return [3 /*break*/, 4];
                    case 4:
                        this.restorePreviousConnections();
                        this.setupOnClientsConnectedListener();
                        this.setupOnMessageReceivedListener();
                        // Bind native module to client
                        return [4 /*yield*/, SDKConnect_1.SDKConnect.getInstance().bindAndroidSDK()];
                    case 5:
                        // Bind native module to client
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AndroidService.prototype.getConnections = function () {
        DevLogger_1["default"].log("AndroidService::getConnections", JSON.stringify(this.connections, null, 2));
        return Object.values(this.connections).filter(function (connection) { var _c; return ((_c = connection === null || connection === void 0 ? void 0 : connection.clientId) === null || _c === void 0 ? void 0 : _c.length) > 0; });
    };
    AndroidService.prototype.setupOnClientsConnectedListener = function () {
        var _this = this;
        this.eventHandler.onClientsConnected(function (sClientInfo) { return __awaiter(_this, void 0, void 0, function () {
            var clientInfo, handleEventAsync;
            var _this = this;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        clientInfo = JSON.parse(sClientInfo);
                        DevLogger_1["default"].log("AndroidService::clients_connected", clientInfo);
                        if ((_c = this.connections) === null || _c === void 0 ? void 0 : _c[clientInfo.clientId]) {
                            // Skip existing client -- bridge has been setup
                            Logger_1["default"].log("AndroidService::clients_connected - existing client, sending ready");
                            // Update connected state
                            this.connections[clientInfo.clientId] = __assign(__assign({}, this.connections[clientInfo.clientId]), { connected: true });
                            this.sendMessage({
                                type: sdk_communication_layer_1.MessageType.READY,
                                data: {
                                    id: clientInfo === null || clientInfo === void 0 ? void 0 : clientInfo.clientId
                                }
                            }, false)["catch"](function (err) {
                                Logger_1["default"].log("AndroidService::clients_connected - error sending ready message to client ".concat(clientInfo.clientId), err);
                            });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, SDKConnect_1.SDKConnect.getInstance().addDappConnection({
                                id: clientInfo.clientId,
                                lastAuthorized: Date.now(),
                                origin: AppConstants_1["default"].MM_SDK.ANDROID_SDK,
                                originatorInfo: clientInfo.originatorInfo,
                                otherPublicKey: '',
                                validUntil: Date.now() + SDKConnectConstants_1.DEFAULT_SESSION_TIMEOUT_MS
                            })];
                    case 1:
                        _d.sent();
                        handleEventAsync = function () { return __awaiter(_this, void 0, void 0, function () {
                            var keyringController, error_1;
                            var _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        keyringController = Engine_1["default"].context.KeyringController;
                                        return [4 /*yield*/, (0, wait_util_1.waitForKeychainUnlocked)({
                                                keyringController: keyringController,
                                                context: 'AndroidService::setupOnClientsConnectedListener'
                                            })];
                                    case 1:
                                        _d.sent();
                                        _d.label = 2;
                                    case 2:
                                        _d.trys.push([2, 6, , 7]);
                                        if (!!((_c = this.connections) === null || _c === void 0 ? void 0 : _c[clientInfo.clientId])) return [3 /*break*/, 5];
                                        DevLogger_1["default"].log("AndroidService::clients_connected - new client ".concat(clientInfo.clientId, "}"), this.connections);
                                        // Ask for account permissions
                                        return [4 /*yield*/, this.checkPermission({
                                                originatorInfo: clientInfo.originatorInfo,
                                                channelId: clientInfo.clientId
                                            })];
                                    case 3:
                                        // Ask for account permissions
                                        _d.sent();
                                        this.setupBridge(clientInfo);
                                        // Save session to SDKConnect
                                        // Save to local connections
                                        this.connections[clientInfo.clientId] = {
                                            connected: true,
                                            clientId: clientInfo.clientId,
                                            originatorInfo: clientInfo.originatorInfo,
                                            validUntil: clientInfo.validUntil
                                        };
                                        return [4 /*yield*/, SDKConnect_1.SDKConnect.getInstance().addDappConnection({
                                                id: clientInfo.clientId,
                                                lastAuthorized: Date.now(),
                                                origin: AppConstants_1["default"].MM_SDK.ANDROID_SDK,
                                                originatorInfo: clientInfo.originatorInfo,
                                                otherPublicKey: '',
                                                validUntil: Date.now() + SDKConnectConstants_1.DEFAULT_SESSION_TIMEOUT_MS
                                            })];
                                    case 4:
                                        _d.sent();
                                        _d.label = 5;
                                    case 5:
                                        this.sendMessage({
                                            type: sdk_communication_layer_1.MessageType.READY,
                                            data: {
                                                id: clientInfo === null || clientInfo === void 0 ? void 0 : clientInfo.clientId
                                            }
                                        }, false)["catch"](function (err) {
                                            Logger_1["default"].log(err, "AndroidService::clients_connected error sending READY message to client");
                                        });
                                        return [3 /*break*/, 7];
                                    case 6:
                                        error_1 = _d.sent();
                                        Logger_1["default"].log(error_1, "AndroidService::clients_connected sending jsonrpc error to client - connection rejected");
                                        this.sendMessage({
                                            data: {
                                                error: error_1,
                                                jsonrpc: '2.0'
                                            },
                                            name: 'metamask-provider'
                                        })["catch"](function (err) {
                                            Logger_1["default"].log(err, "AndroidService::clients_connected error failed sending jsonrpc error to client");
                                        });
                                        NativeModules_1.Minimizer.goBack();
                                        return [2 /*return*/];
                                    case 7:
                                        this.emit(sdk_communication_layer_1.EventType.CLIENTS_CONNECTED);
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        handleEventAsync()["catch"](function (err) {
                            Logger_1["default"].log(err, "AndroidService::clients_connected error handling event");
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    };
    AndroidService.prototype.checkPermission = function (_c) {
        var channelId = _c.channelId;
        return __awaiter(this, void 0, void 0, function () {
            var permissionsController;
            return __generator(this, function (_d) {
                permissionsController = Engine_1["default"].context.PermissionController;
                return [2 /*return*/, permissionsController.requestPermissions({ origin: channelId }, { eth_accounts: {} })];
            });
        });
    };
    AndroidService.prototype.setupOnMessageReceivedListener = function () {
        var _this = this;
        this.eventHandler.onMessageReceived(function (jsonMessage) {
            var handleEventAsync = function () { return __awaiter(_this, void 0, void 0, function () {
                var parsedMsg, keyringController, error_2, sessionId, message, 
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data, bridge, err_2, accountsController, selectedInternalAccountChecksummedAddress, networkController, chainId, processedRpc;
                var _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            DevLogger_1["default"].log("AndroidService::onMessageReceived", jsonMessage);
                            _g.label = 1;
                        case 1:
                            _g.trys.push([1, 5, , 6]);
                            return [4 /*yield*/, (0, wait_util_1.wait)(200)];
                        case 2:
                            _g.sent(); // Extra wait to make sure ui is ready
                            return [4 /*yield*/, (0, wait_util_1.waitForAndroidServiceBinding)()];
                        case 3:
                            _g.sent();
                            keyringController = Engine_1["default"].context.KeyringController;
                            return [4 /*yield*/, (0, wait_util_1.waitForKeychainUnlocked)({
                                    keyringController: keyringController,
                                    context: 'AndroidService::setupOnMessageReceivedListener'
                                })];
                        case 4:
                            _g.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            error_2 = _g.sent();
                            Logger_1["default"].log(error_2, "AndroidService::onMessageReceived error");
                            return [3 /*break*/, 6];
                        case 6:
                            try {
                                parsedMsg = JSON.parse(jsonMessage); // handle message and redirect to corresponding bridge
                                sessionId = parsedMsg.id;
                                message = parsedMsg.message;
                                data = JSON.parse(message);
                                // Update connected state
                                this.connections[sessionId] = __assign(__assign({}, this.connections[sessionId]), { connected: true });
                            }
                            catch (error) {
                                Logger_1["default"].log(error, "AndroidService::onMessageReceived invalid json param");
                                this.sendMessage({
                                    data: {
                                        error: error,
                                        jsonrpc: '2.0'
                                    },
                                    name: 'metamask-provider'
                                })["catch"](function (err) {
                                    Logger_1["default"].log(err, "AndroidService::onMessageReceived error sending jsonrpc error message to client ".concat(sessionId));
                                });
                                return [2 /*return*/];
                            }
                            bridge = this.bridgeByClientId[sessionId];
                            if (!!bridge) return [3 /*break*/, 10];
                            console.warn("AndroidService:: Bridge not found for client", "sessionId=".concat(sessionId, " data.id=").concat(data.id));
                            _g.label = 7;
                        case 7:
                            _g.trys.push([7, 9, , 10]);
                            // Ask users permissions again - it probably means the channel was removed
                            return [4 /*yield*/, this.checkPermission({
                                    originatorInfo: (_d = (_c = this.connections[sessionId]) === null || _c === void 0 ? void 0 : _c.originatorInfo) !== null && _d !== void 0 ? _d : {},
                                    channelId: sessionId
                                })];
                        case 8:
                            // Ask users permissions again - it probably means the channel was removed
                            _g.sent();
                            // Create new bridge
                            this.setupBridge(this.connections[sessionId]);
                            bridge = this.bridgeByClientId[sessionId];
                            return [3 /*break*/, 10];
                        case 9:
                            err_2 = _g.sent();
                            Logger_1["default"].log(err_2, "AndroidService::onMessageReceived error checking permissions");
                            return [2 /*return*/];
                        case 10:
                            accountsController = Engine_1["default"].context.AccountsController;
                            selectedInternalAccountChecksummedAddress = (0, controller_utils_1.toChecksumHexAddress)(accountsController.getSelectedAccount().address);
                            networkController = Engine_1["default"].context.NetworkController;
                            chainId = networkController.state.providerConfig.chainId;
                            this.currentClientId = sessionId;
                            return [4 /*yield*/, (0, handleCustomRpcCalls_1["default"])({
                                    batchRPCManager: this.batchRPCManager,
                                    selectedChainId: chainId,
                                    selectedAddress: selectedInternalAccountChecksummedAddress,
                                    rpc: { id: data.id, method: data.method, params: data.params }
                                })];
                        case 11:
                            processedRpc = _g.sent();
                            DevLogger_1["default"].log("AndroidService::onMessageReceived processedRpc", processedRpc);
                            this.rpcQueueManager.add({
                                id: (_e = processedRpc === null || processedRpc === void 0 ? void 0 : processedRpc.id) !== null && _e !== void 0 ? _e : data.id,
                                method: (_f = processedRpc === null || processedRpc === void 0 ? void 0 : processedRpc.method) !== null && _f !== void 0 ? _f : data.method
                            });
                            bridge.onMessage({ name: 'metamask-provider', data: processedRpc });
                            return [2 /*return*/];
                    }
                });
            }); };
            handleEventAsync()["catch"](function (err) {
                Logger_1["default"].log(err, "AndroidService::onMessageReceived error handling event");
            });
        });
    };
    AndroidService.prototype.restorePreviousConnections = function () {
        var _this = this;
        var _c;
        if (Object.keys((_c = this.connections) !== null && _c !== void 0 ? _c : {}).length) {
            Object.values(this.connections).forEach(function (clientInfo) {
                try {
                    _this.setupBridge(clientInfo);
                    _this.sendMessage({
                        type: sdk_communication_layer_1.MessageType.READY,
                        data: {
                            id: clientInfo === null || clientInfo === void 0 ? void 0 : clientInfo.clientId
                        }
                    }, false)["catch"](function (err) {
                        Logger_1["default"].log(err, "AndroidService:: error sending jsonrpc error to client ".concat(clientInfo.clientId));
                    });
                }
                catch (error) {
                    Logger_1["default"].log(error, "AndroidService:: error setting up bridge for client ".concat(clientInfo.clientId));
                }
            });
        }
    };
    AndroidService.prototype.setupBridge = function (clientInfo) {
        DevLogger_1["default"].log("AndroidService::setupBridge for id=".concat(clientInfo.clientId, " exists=").concat(!!this
            .bridgeByClientId[clientInfo.clientId], "}"));
        if (this.bridgeByClientId[clientInfo.clientId]) {
            return;
        }
        var defaultBridgeParams = (0, getDefaultBridgeParams_1["default"])(clientInfo);
        var bridge = new BackgroundBridge_1["default"](__assign({ webview: null, channelId: clientInfo.clientId, isMMSDK: true, url: deeplinks_1.PROTOCOLS.METAMASK + '://' + AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN, isRemoteConn: true, sendMessage: this.sendMessage.bind(this) }, defaultBridgeParams));
        this.bridgeByClientId[clientInfo.clientId] = bridge;
    };
    AndroidService.prototype.removeConnection = function (channelId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                try {
                    if (this.connections[channelId]) {
                        DevLogger_1["default"].log("AndroidService::remove client ".concat(channelId, " exists --- remove bridge"));
                        delete this.bridgeByClientId[channelId];
                    }
                    delete this.connections[channelId];
                }
                catch (err) {
                    Logger_1["default"].log(err, "AndroidService::remove error");
                }
                return [2 /*return*/];
            });
        });
    };
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AndroidService.prototype.sendMessage = function (message, forceRedirect) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, sendMessage_1["default"])(this, message, forceRedirect)];
            });
        });
    };
    return AndroidService;
}(eventemitter2_1.EventEmitter2));
exports["default"] = AndroidService;
