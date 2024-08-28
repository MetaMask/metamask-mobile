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
var react_native_1 = require("react-native");
var deeplinks_1 = require("../../../constants/deeplinks");
var AppConstants_1 = require("../../../core/AppConstants");
var Engine_1 = require("../../../core/Engine");
var Logger_1 = require("../../../util/Logger");
var BackgroundBridge_1 = require("../../BackgroundBridge/BackgroundBridge");
var getDefaultBridgeParams_1 = require("../AndroidSDK/getDefaultBridgeParams");
var BatchRPCManager_1 = require("../BatchRPCManager");
var RPCQueueManager_1 = require("../RPCQueueManager");
var SDKConnect_1 = require("../SDKConnect");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var handleBatchRpcResponse_1 = require("../handlers/handleBatchRpcResponse");
var handleCustomRpcCalls_1 = require("../handlers/handleCustomRpcCalls");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
var controller_utils_1 = require("@metamask/controller-utils");
var DeeplinkProtocolService = /** @class */ (function () {
    function DeeplinkProtocolService() {
        var _this = this;
        this.connections = {};
        this.bridgeByClientId = {};
        this.rpcQueueManager = new RPCQueueManager_1["default"]();
        this.batchRPCManager = new BatchRPCManager_1["default"]('deeplink');
        this.dappPublicKeyByClientId = {};
        this.isInitialized = false;
        if (!this.isInitialized) {
            this.init()
                .then(function () {
                _this.isInitialized = true;
                DevLogger_1["default"].log('DeeplinkProtocolService:: initialized');
            })["catch"](function (err) {
                _this.isInitialized = false;
                Logger_1["default"].log(err, 'DeeplinkProtocolService:: error initializing');
            });
        }
    }
    DeeplinkProtocolService.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var rawConnections;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (this.isInitialized) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, SDKConnect_1["default"].getInstance().loadDappConnections()];
                    case 1:
                        rawConnections = _c.sent();
                        if (rawConnections) {
                            Object.values(rawConnections).forEach(function (connection) {
                                var clientInfo = {
                                    connected: false,
                                    clientId: connection.id,
                                    originatorInfo: connection.originatorInfo,
                                    validUntil: connection.validUntil,
                                    scheme: connection.scheme
                                };
                                _this.connections[connection.id] = clientInfo;
                                _this.setupBridge(clientInfo);
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    DeeplinkProtocolService.prototype.setupBridge = function (clientInfo) {
        var _this = this;
        DevLogger_1["default"].log("DeeplinkProtocolService::setupBridge for id=".concat(clientInfo.clientId, " exists=").concat(!!this.bridgeByClientId[clientInfo.clientId], "} originatorInfo=").concat(clientInfo.originatorInfo.url, "\n").concat(clientInfo.originatorInfo.title));
        if (this.bridgeByClientId[clientInfo.clientId]) {
            return;
        }
        var defaultBridgeParams = (0, getDefaultBridgeParams_1["default"])(clientInfo);
        var bridge = new BackgroundBridge_1["default"](__assign({ webview: null, channelId: clientInfo.clientId, isMMSDK: true, url: deeplinks_1.PROTOCOLS.METAMASK + '://' + AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN, isRemoteConn: true, 
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sendMessage: function (msg) { return _this.sendMessage(msg); } }, defaultBridgeParams));
        this.bridgeByClientId[clientInfo.clientId] = bridge;
    };
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DeeplinkProtocolService.prototype.sendMessage = function (message, forceRedirect) {
        var _c, _d, _e, _f, _g, _h;
        return __awaiter(this, void 0, void 0, function () {
            var messageWithMetadata, id, rpcMethod, chainRPCs, isLastRpcOrError, hasError, shouldSkipGoBack, shouldDelay, isRpcQueueEmpty, origRpcId, isPartOfBatchRequest, error_1;
            var _this = this;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        messageWithMetadata = __assign(__assign({}, message), { data: __assign(__assign({}, message.data), { chainId: this.getChainId(), accounts: this.getSelectedAccounts() }) });
                        id = (_c = message === null || message === void 0 ? void 0 : message.data) === null || _c === void 0 ? void 0 : _c.id;
                        DevLogger_1["default"].log("DeeplinkProtocolService::sendMessage id=".concat(id));
                        rpcMethod = this.rpcQueueManager.getId(id);
                        DevLogger_1["default"].log("DeeplinkProtocolService::sendMessage method=".concat(rpcMethod), messageWithMetadata);
                        chainRPCs = this.batchRPCManager.getById(id);
                        if (!chainRPCs) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, handleBatchRpcResponse_1["default"])({
                                chainRpcs: chainRPCs,
                                msg: messageWithMetadata,
                                backgroundBridge: this.bridgeByClientId[(_d = this.currentClientId) !== null && _d !== void 0 ? _d : ''],
                                batchRPCManager: this.batchRPCManager,
                                sendMessage: function (_c) {
                                    var msg = _c.msg;
                                    return _this.sendMessage(msg);
                                }
                            })];
                    case 1:
                        isLastRpcOrError = _j.sent();
                        hasError = !!((_e = message === null || message === void 0 ? void 0 : message.data) === null || _e === void 0 ? void 0 : _e.error);
                        if (!isLastRpcOrError) {
                            DevLogger_1["default"].log("DeeplinkProtocolService::sendMessage NOT last rpc --- skip goBack()", chainRPCs);
                            this.rpcQueueManager.remove(id);
                            // Only continue processing the message and goback if all rpcs in the batch have been handled
                            if (hasError) {
                                this.openDeeplink({
                                    message: messageWithMetadata,
                                    clientId: (_f = this.currentClientId) !== null && _f !== void 0 ? _f : ''
                                });
                                return [2 /*return*/];
                            }
                        }
                        // Always set the method to metamask_batch otherwise it may not have been set correctly because of the batch rpc flow.
                        rpcMethod = SDKConnectConstants_1.RPC_METHODS.METAMASK_BATCH;
                        _j.label = 2;
                    case 2:
                        this.rpcQueueManager.remove(id);
                        shouldSkipGoBack = !rpcMethod && forceRedirect !== true;
                        if (shouldSkipGoBack) {
                            DevLogger_1["default"].log("DeeplinkProtocolService::sendMessage no rpc method --- rpcMethod=".concat(rpcMethod, " forceRedirect=").concat(forceRedirect, " --- skip goBack()"));
                            return [2 /*return*/];
                        }
                        _j.label = 3;
                    case 3:
                        _j.trys.push([3, 6, , 7]);
                        shouldDelay = SDKConnectConstants_1.METHODS_TO_DELAY[rpcMethod];
                        if (!shouldDelay) return [3 /*break*/, 5];
                        // Add delay to see the feedback modal
                        return [4 /*yield*/, (0, wait_util_1.wait)(1000)];
                    case 4:
                        // Add delay to see the feedback modal
                        _j.sent();
                        _j.label = 5;
                    case 5:
                        isRpcQueueEmpty = this.rpcQueueManager.isEmpty();
                        if (!isRpcQueueEmpty) {
                            DevLogger_1["default"].log("DeeplinkProtocolService::sendMessage NOT empty --- skip goBack()", this.rpcQueueManager.get());
                            return [2 /*return*/];
                        }
                        DevLogger_1["default"].log("DeeplinkProtocolService::sendMessage empty --- goBack()");
                        DevLogger_1["default"].log("DeeplinkProtocolService::sendMessage sending deeplink message=".concat(JSON.stringify(messageWithMetadata)));
                        origRpcId = (_g = messageWithMetadata === null || messageWithMetadata === void 0 ? void 0 : messageWithMetadata.data) === null || _g === void 0 ? void 0 : _g.id;
                        isPartOfBatchRequest = origRpcId === null || origRpcId === void 0 ? void 0 : origRpcId.includes('_');
                        if (isPartOfBatchRequest) {
                            DevLogger_1["default"].log("DeeplinkProtocolService::sendMessage skip openDeeplink for origRpcId=".concat(origRpcId));
                            return [2 /*return*/];
                        }
                        this.openDeeplink({
                            message: messageWithMetadata,
                            clientId: (_h = this.currentClientId) !== null && _h !== void 0 ? _h : ''
                        });
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _j.sent();
                        Logger_1["default"].log(error_1, "DeeplinkProtocolService:: error waiting for empty rpc queue");
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    DeeplinkProtocolService.prototype.openDeeplink = function (_c) {
        var _d, _e;
        var message = _c.message, clientId = _c.clientId, scheme = _c.scheme;
        return __awaiter(this, void 0, void 0, function () {
            var jsonMessage, base64Message, dappScheme, deeplink, error_2;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 2, , 3]);
                        jsonMessage = JSON.stringify(message);
                        base64Message = Buffer.from(jsonMessage).toString('base64');
                        dappScheme = (_e = (_d = this.connections[clientId]) === null || _d === void 0 ? void 0 : _d.scheme) !== null && _e !== void 0 ? _e : scheme;
                        DevLogger_1["default"].log("DeeplinkProtocolService::openDeeplink scheme=".concat(scheme, " dappScheme=").concat(dappScheme, " clientId=").concat(clientId));
                        DevLogger_1["default"].log("DeeplinkProtocolService::openDeeplink message=".concat(message));
                        deeplink = "".concat(dappScheme, "://mmsdk?message=").concat(base64Message);
                        DevLogger_1["default"].log("DeeplinkProtocolService::openDeeplink deeplink=".concat(deeplink, " clientId=").concat(clientId));
                        return [4 /*yield*/, react_native_1.Linking.openURL(deeplink)];
                    case 1:
                        _f.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _f.sent();
                        Logger_1["default"].error(error_2, "DeeplinkProtocolService::openDeeplink error opening deeplink");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DeeplinkProtocolService.prototype.checkPermission = function (_c) {
        var channelId = _c.channelId;
        return __awaiter(this, void 0, void 0, function () {
            var permissionsController;
            return __generator(this, function (_d) {
                permissionsController = Engine_1["default"].context.PermissionController;
                return [2 /*return*/, permissionsController.requestPermissions({ origin: channelId }, { eth_accounts: {} })];
            });
        });
    };
    DeeplinkProtocolService.prototype.handleConnectionEventAsync = function (_c) {
        var _d, _e;
        var clientInfo = _c.clientInfo, params = _c.params;
        return __awaiter(this, void 0, void 0, function () {
            var keyringController, error_3, message;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        keyringController = Engine_1["default"].context.KeyringController;
                        return [4 /*yield*/, (0, wait_util_1.waitForKeychainUnlocked)({
                                keyringController: keyringController,
                                context: 'DeeplinkProtocolService::setupOnClientsConnectedListener'
                            })];
                    case 1:
                        _f.sent();
                        _f.label = 2;
                    case 2:
                        _f.trys.push([2, 8, , 9]);
                        if (!!((_d = this.connections) === null || _d === void 0 ? void 0 : _d[clientInfo.clientId])) return [3 /*break*/, 5];
                        DevLogger_1["default"].log("DeeplinkProtocolService::clients_connected - new client ".concat(clientInfo.clientId, "}"), this.connections);
                        return [4 /*yield*/, this.checkPermission({
                                channelId: clientInfo.clientId,
                                originatorInfo: clientInfo.originatorInfo
                            })];
                    case 3:
                        _f.sent();
                        this.setupBridge(clientInfo);
                        this.connections[clientInfo.clientId] = {
                            clientId: clientInfo.clientId,
                            connected: true,
                            validUntil: clientInfo.validUntil,
                            scheme: clientInfo.scheme,
                            originatorInfo: clientInfo.originatorInfo
                        };
                        return [4 /*yield*/, SDKConnect_1["default"].getInstance().addDappConnection({
                                id: clientInfo.clientId,
                                origin: AppConstants_1["default"].MM_SDK.IOS_SDK,
                                lastAuthorized: Date.now(),
                                otherPublicKey: this.dappPublicKeyByClientId[clientInfo.clientId],
                                originatorInfo: clientInfo.originatorInfo,
                                scheme: clientInfo.scheme,
                                validUntil: Date.now() + SDKConnectConstants_1.DEFAULT_SESSION_TIMEOUT_MS
                            })];
                    case 4:
                        _f.sent();
                        _f.label = 5;
                    case 5:
                        if (!params.request) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.processDappRpcRequest(params)];
                    case 6:
                        _f.sent();
                        return [2 /*return*/];
                    case 7:
                        this.sendMessage({
                            data: {}
                        }, true)["catch"](function (err) {
                            Logger_1["default"].log(err, "DeeplinkProtocolService::clients_connected error sending READY message to client");
                        });
                        return [3 /*break*/, 9];
                    case 8:
                        error_3 = _f.sent();
                        Logger_1["default"].log(error_3, "DeeplinkProtocolService::clients_connected sending jsonrpc error to client - connection rejected");
                        this.sendMessage({
                            data: {
                                error: error_3,
                                jsonrpc: '2.0'
                            },
                            name: 'metamask-provider'
                        })["catch"](function (err) {
                            Logger_1["default"].log(err, "DeeplinkProtocolService::clients_connected error failed sending jsonrpc error to client");
                        });
                        message = {
                            data: {
                                error: error_3,
                                jsonrpc: '2.0'
                            },
                            name: 'metamask-provider'
                        };
                        this.openDeeplink({
                            message: message,
                            clientId: (_e = this.currentClientId) !== null && _e !== void 0 ? _e : '',
                            scheme: clientInfo.scheme
                        });
                        return [2 /*return*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    DeeplinkProtocolService.prototype.handleConnection = function (params) {
        var _c;
        return __awaiter(this, void 0, void 0, function () {
            var deepLinkError, decodedOriginatorInfo, originatorInfoJson, originatorInfo, clientInfo, isSessionExists;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!params.originatorInfo) {
                            deepLinkError = new Error('DeeplinkProtocolService::handleConnection no originatorInfo');
                            Logger_1["default"].error(deepLinkError, params);
                            return [2 /*return*/];
                        }
                        this.dappPublicKeyByClientId[params.channelId] = params.dappPublicKey;
                        decodedOriginatorInfo = Buffer.from(params.originatorInfo, 'base64').toString('utf-8');
                        originatorInfoJson = JSON.parse(decodedOriginatorInfo);
                        originatorInfo = originatorInfoJson.originatorInfo;
                        clientInfo = {
                            clientId: params.channelId,
                            originatorInfo: originatorInfo,
                            connected: true,
                            validUntil: Date.now() + SDKConnectConstants_1.DEFAULT_SESSION_TIMEOUT_MS,
                            scheme: params.scheme
                        };
                        this.currentClientId = params.channelId;
                        isSessionExists = (_c = this.connections) === null || _c === void 0 ? void 0 : _c[clientInfo.clientId];
                        if (!isSessionExists) return [3 /*break*/, 4];
                        // Skip existing client -- bridge has been setup
                        // Update connected state
                        this.connections[clientInfo.clientId] = __assign(__assign({}, this.connections[clientInfo.clientId]), { connected: true });
                        if (!params.request) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.processDappRpcRequest(params)];
                    case 1:
                        _d.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        this.sendMessage({
                            data: {}
                        }, true)["catch"](function (err) {
                            Logger_1["default"].log("DeeplinkProtocolService::clients_connected - error sending ready message to client ".concat(clientInfo.clientId), err);
                        });
                        _d.label = 3;
                    case 3: return [2 /*return*/];
                    case 4: return [4 /*yield*/, SDKConnect_1["default"].getInstance().addDappConnection({
                            id: clientInfo.clientId,
                            lastAuthorized: Date.now(),
                            origin: AppConstants_1["default"].MM_SDK.IOS_SDK,
                            originatorInfo: clientInfo.originatorInfo,
                            otherPublicKey: this.dappPublicKeyByClientId[clientInfo.clientId],
                            validUntil: Date.now() + SDKConnectConstants_1.DEFAULT_SESSION_TIMEOUT_MS,
                            scheme: clientInfo.scheme
                        })];
                    case 5:
                        _d.sent();
                        this.handleConnectionEventAsync({
                            clientInfo: clientInfo,
                            params: params
                        })["catch"](function (err) {
                            Logger_1["default"].log(err, "DeeplinkProtocolService::clients_connected error handling event");
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    DeeplinkProtocolService.prototype.processDappRpcRequest = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var bridge, requestObject, processedRpc;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        bridge = this.bridgeByClientId[params.channelId];
                        requestObject = JSON.parse(params.request);
                        return [4 /*yield*/, (0, handleCustomRpcCalls_1["default"])({
                                batchRPCManager: this.batchRPCManager,
                                selectedChainId: this.getChainId(),
                                selectedAddress: this.getSelectedAddress(),
                                rpc: {
                                    id: requestObject.id,
                                    method: requestObject.method,
                                    params: requestObject.params
                                }
                            })];
                    case 1:
                        processedRpc = _c.sent();
                        DevLogger_1["default"].log("DeeplinkProtocolService::onMessageReceived processedRpc", processedRpc);
                        this.rpcQueueManager.add({
                            id: requestObject.id,
                            method: requestObject.method
                        });
                        bridge.onMessage({ name: 'metamask-provider', data: processedRpc });
                        return [2 /*return*/];
                }
            });
        });
    };
    DeeplinkProtocolService.prototype.getChainId = function () {
        var _c;
        var networkController = Engine_1["default"].context.NetworkController;
        var hexChainId = (_c = networkController.state.providerConfig.chainId) !== null && _c !== void 0 ? _c : '0x'; // default to mainnet
        DevLogger_1["default"].log("DeeplinkProtocolService::clients_connected hexChainId", hexChainId);
        return hexChainId;
    };
    DeeplinkProtocolService.prototype.getSelectedAccounts = function () {
        var _c, _d, _e, _f;
        var permissionController = Engine_1["default"].context.PermissionController;
        var permissions = permissionController.getPermissions((_c = this.currentClientId) !== null && _c !== void 0 ? _c : '');
        var accountsController = Engine_1["default"].context.AccountsController;
        var selectedInternalAccountChecksummedAddress = (0, controller_utils_1.toChecksumHexAddress)(accountsController.getSelectedAccount().address);
        var connectedAddresses = (_f = (_e = (_d = permissions === null || permissions === void 0 ? void 0 : permissions.eth_accounts) === null || _d === void 0 ? void 0 : _d.caveats) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value;
        DevLogger_1["default"].log("DeeplinkProtocolService::clients_connected connectedAddresses", connectedAddresses);
        if (!Array.isArray(connectedAddresses)) {
            return [];
        }
        var lowerCaseConnectedAddresses = connectedAddresses.map(function (address) {
            return address.toLowerCase();
        });
        var isPartOfConnectedAddresses = lowerCaseConnectedAddresses.includes(selectedInternalAccountChecksummedAddress.toLowerCase());
        if (isPartOfConnectedAddresses) {
            // Create a new array with selectedAddress at the first position
            connectedAddresses = __spreadArray([
                selectedInternalAccountChecksummedAddress
            ], connectedAddresses.filter(function (address) {
                return address.toLowerCase() !==
                    selectedInternalAccountChecksummedAddress.toLowerCase();
            }), true);
        }
        return connectedAddresses;
    };
    DeeplinkProtocolService.prototype.getSelectedAddress = function () {
        var accountsController = Engine_1["default"].context.AccountsController;
        var selectedInternalAccountChecksummedAddress = (0, controller_utils_1.toChecksumHexAddress)(accountsController.getSelectedAccount().address);
        DevLogger_1["default"].log("DeeplinkProtocolService::clients_connected selectedAddress", selectedInternalAccountChecksummedAddress);
        return selectedInternalAccountChecksummedAddress;
    };
    DeeplinkProtocolService.prototype.handleMessage = function (params) {
        var _this = this;
        var _c;
        var walletSelectedAddress = '';
        var walletSelectedChainId = '';
        var dappAccountChainId = '';
        var dappAccountAddress = '';
        if (!((_c = params.account) === null || _c === void 0 ? void 0 : _c.includes('@'))) {
            DevLogger_1["default"].log("DeeplinkProtocolService:: handleMessage invalid params.account format ".concat(params.account));
        }
        else {
            var account = params.account.split('@');
            walletSelectedAddress = this.getSelectedAddress();
            walletSelectedChainId = this.getChainId();
            dappAccountChainId = account[1];
            dappAccountAddress = account[0];
        }
        DevLogger_1["default"].log('DeeplinkProtocolService:: handleMessage params from deeplink', params);
        DevLogger_1["default"].log('DeeplinkProtocolService:: message', params.message);
        var parsedMessage = Buffer.from(params.message, 'base64').toString('utf-8');
        DevLogger_1["default"].log('DeeplinkProtocolService:: parsedMessage', parsedMessage);
        var handleEventAsync = function () { return __awaiter(_this, void 0, void 0, function () {
            var data, sessionId, keyringController, error_4, message, isAccountChanged, isChainChanged, rpcMethod_1, RPC_METHODS_TO_SKIP_1, checkForRpcMethodToSkip, isRpcMethodToSkip, dynamicErrorMessage, isSessionExists, message, bridge, err_1, processedRpc;
            var _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        sessionId = params.channelId;
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, (0, wait_util_1.wait)(200)];
                    case 2:
                        _f.sent(); // Extra wait to make sure ui is ready
                        keyringController = Engine_1["default"].context.KeyringController;
                        return [4 /*yield*/, (0, wait_util_1.waitForKeychainUnlocked)({
                                keyringController: keyringController,
                                context: 'DeeplinkProtocolService::setupOnMessageReceivedListener'
                            })];
                    case 3:
                        _f.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_4 = _f.sent();
                        Logger_1["default"].log(error_4, "DeeplinkProtocolService::onMessageReceived error");
                        return [3 /*break*/, 5];
                    case 5:
                        try {
                            message = JSON.parse(parsedMessage);
                            DevLogger_1["default"].log('DeeplinkProtocolService:: parsed message:-', message);
                            data = message;
                            isAccountChanged = dappAccountAddress !== walletSelectedAddress;
                            isChainChanged = dappAccountChainId !== walletSelectedChainId;
                            rpcMethod_1 = data.method;
                            RPC_METHODS_TO_SKIP_1 = [
                                SDKConnectConstants_1.RPC_METHODS.WALLET_ADDETHEREUMCHAIN,
                                SDKConnectConstants_1.RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
                            ];
                            checkForRpcMethodToSkip = function () {
                                var isBatchRequest = rpcMethod_1 === SDKConnectConstants_1.RPC_METHODS.METAMASK_BATCH;
                                if (isBatchRequest) {
                                    var batchRpcMethods = data.params.map(function (rpc) { return rpc.method; });
                                    var shouldSkip = batchRpcMethods.some(function (r) {
                                        return RPC_METHODS_TO_SKIP_1.includes(r);
                                    });
                                    return shouldSkip;
                                }
                                return RPC_METHODS_TO_SKIP_1.includes(rpcMethod_1);
                            };
                            isRpcMethodToSkip = checkForRpcMethodToSkip();
                            if (isAccountChanged || (!isRpcMethodToSkip && isChainChanged)) {
                                dynamicErrorMessage = "The selected ".concat(isAccountChanged ? 'account' : 'chain', " has changed. Please try again.");
                                this.sendMessage({
                                    data: {
                                        id: data.id,
                                        error: {
                                            code: -32602,
                                            message: dynamicErrorMessage
                                        },
                                        jsonrpc: '2.0'
                                    },
                                    name: 'metamask-provider'
                                }, true)["catch"](function (err) {
                                    Logger_1["default"].log(err, "DeeplinkProtocolService::onMessageReceived error sending jsonrpc error message to client ".concat(sessionId));
                                });
                                return [2 /*return*/];
                            }
                        }
                        catch (error) {
                            Logger_1["default"].log(error, "DeeplinkProtocolService::onMessageReceived invalid json param");
                            this.sendMessage({
                                data: {
                                    error: error,
                                    jsonrpc: '2.0'
                                },
                                name: 'metamask-provider'
                            })["catch"](function (err) {
                                Logger_1["default"].log(err, "DeeplinkProtocolService::onMessageReceived error sending jsonrpc error message to client ".concat(sessionId));
                            });
                            return [2 /*return*/];
                        }
                        isSessionExists = (_c = this.connections) === null || _c === void 0 ? void 0 : _c[sessionId];
                        DevLogger_1["default"].log("DeeplinkProtocolService::onMessageReceived connections=", this.connections);
                        DevLogger_1["default"].log("DeeplinkProtocolService::onMessageReceived sessionId=".concat(sessionId));
                        DevLogger_1["default"].log("DeeplinkProtocolService::onMessageReceived isSessionExists", isSessionExists);
                        if (!isSessionExists) {
                            message = {
                                data: {
                                    id: data.id,
                                    error: {
                                        code: 4100,
                                        message: 'Unauthorized request'
                                    },
                                    jsonrpc: '2.0'
                                },
                                name: 'metamask-provider'
                            };
                            this.openDeeplink({
                                message: message,
                                clientId: sessionId,
                                scheme: params.scheme
                            });
                            return [2 /*return*/];
                        }
                        // Update connected state
                        this.connections[sessionId] = __assign(__assign({}, this.connections[sessionId]), { connected: true });
                        bridge = this.bridgeByClientId[sessionId];
                        if (!!bridge) return [3 /*break*/, 9];
                        _f.label = 6;
                    case 6:
                        _f.trys.push([6, 8, , 9]);
                        // Ask users permissions again - it probably means the channel was removed
                        return [4 /*yield*/, this.checkPermission({
                                originatorInfo: (_e = (_d = this.connections[sessionId]) === null || _d === void 0 ? void 0 : _d.originatorInfo) !== null && _e !== void 0 ? _e : {},
                                channelId: sessionId
                            })];
                    case 7:
                        // Ask users permissions again - it probably means the channel was removed
                        _f.sent();
                        // Create new bridge
                        this.setupBridge(this.connections[sessionId]);
                        bridge = this.bridgeByClientId[sessionId];
                        return [3 /*break*/, 9];
                    case 8:
                        err_1 = _f.sent();
                        Logger_1["default"].log(err_1, "DeeplinkProtocolService::onMessageReceived error checking permissions");
                        return [2 /*return*/];
                    case 9:
                        this.currentClientId = sessionId;
                        return [4 /*yield*/, (0, handleCustomRpcCalls_1["default"])({
                                batchRPCManager: this.batchRPCManager,
                                selectedChainId: this.getChainId(),
                                selectedAddress: this.getSelectedAddress(),
                                rpc: { id: data.id, method: data.method, params: data.params }
                            })];
                    case 10:
                        processedRpc = _f.sent();
                        DevLogger_1["default"].log("DeeplinkProtocolService::onMessageReceived processedRpc", processedRpc);
                        this.rpcQueueManager.add({
                            id: data.id,
                            method: data.method
                        });
                        bridge.onMessage({ name: 'metamask-provider', data: processedRpc });
                        return [2 /*return*/];
                }
            });
        }); };
        handleEventAsync()["catch"](function (err) {
            Logger_1["default"].log(err, "DeeplinkProtocolService::onMessageReceived error handling event");
        });
    };
    DeeplinkProtocolService.prototype.removeConnection = function (channelId) {
        try {
            if (this.connections[channelId]) {
                DevLogger_1["default"].log("DeeplinkProtocolService::remove client ".concat(channelId, " exists --- remove bridge"));
                delete this.bridgeByClientId[channelId];
            }
            delete this.connections[channelId];
        }
        catch (err) {
            Logger_1["default"].log(err, "DeeplinkProtocolService::remove error");
        }
    };
    return DeeplinkProtocolService;
}());
exports["default"] = DeeplinkProtocolService;
