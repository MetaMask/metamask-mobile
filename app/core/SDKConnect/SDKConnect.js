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
exports.SDKConnect = void 0;
var Logger_1 = require("../../util/Logger");
var AppConstants_1 = require("../AppConstants");
var Engine_1 = require("../../core/Engine");
var addDappConnection_1 = require("./AndroidSDK/addDappConnection");
var bindAndroidSDK_1 = require("./AndroidSDK/bindAndroidSDK");
var loadDappConnections_1 = require("./AndroidSDK/loadDappConnections");
var ConnectionManagement_1 = require("./ConnectionManagement");
var InitializationManagement_1 = require("./InitializationManagement");
var RPCQueueManager_1 = require("./RPCQueueManager");
var SDKConnectConstants_1 = require("./SDKConnectConstants");
var SessionManagement_1 = require("./SessionManagement");
var StateManagement_1 = require("./StateManagement");
var DevLogger_1 = require("./utils/DevLogger");
var SDKConnect = /** @class */ (function () {
    function SDKConnect() {
        this.state = {
            navigation: undefined,
            reconnected: false,
            _initialized: false,
            _initializing: undefined,
            _postInitialized: false,
            _postInitializing: false,
            timeout: undefined,
            initTimeout: undefined,
            paused: false,
            appState: undefined,
            connected: {},
            connections: {},
            dappConnections: {},
            androidSDKStarted: false,
            androidSDKBound: false,
            deeplinkingServiceStarted: false,
            androidService: undefined,
            deeplinkingService: undefined,
            connecting: {},
            approvedHosts: {},
            sdkLoadingState: {},
            disabledHosts: {},
            rpcqueueManager: new RPCQueueManager_1["default"](),
            appStateListener: undefined,
            socketServerUrl: AppConstants_1["default"].MM_SDK.SERVER_URL
        };
    }
    SDKConnect.prototype.SDKConnect = function () {
        // Keep empty to manage singleton
    };
    SDKConnect.prototype.connectToChannel = function (_c) {
        var id = _c.id, trigger = _c.trigger, otherPublicKey = _c.otherPublicKey, origin = _c.origin, protocolVersion = _c.protocolVersion, originatorInfo = _c.originatorInfo, initialConnection = _c.initialConnection, _d = _c.validUntil, validUntil = _d === void 0 ? Date.now() + SDKConnectConstants_1.DEFAULT_SESSION_TIMEOUT_MS : _d;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_e) {
                return [2 /*return*/, (0, ConnectionManagement_1.connectToChannel)({
                        id: id,
                        trigger: trigger,
                        otherPublicKey: otherPublicKey,
                        protocolVersion: protocolVersion,
                        origin: origin,
                        originatorInfo: originatorInfo,
                        validUntil: validUntil,
                        initialConnection: initialConnection,
                        instance: this
                    })];
            });
        });
    };
    SDKConnect.prototype.watchConnection = function (connection) {
        return (0, ConnectionManagement_1.watchConnection)(connection, this);
    };
    SDKConnect.prototype.updateSDKLoadingState = function (_c) {
        var channelId = _c.channelId, loading = _c.loading;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_d) {
                return [2 /*return*/, (0, StateManagement_1.updateSDKLoadingState)({ channelId: channelId, loading: loading, instance: this })];
            });
        });
    };
    SDKConnect.prototype.hideLoadingState = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, StateManagement_1.hideLoadingState)({ instance: this })];
            });
        });
    };
    SDKConnect.prototype.updateOriginatorInfos = function (_c) {
        var channelId = _c.channelId, originatorInfo = _c.originatorInfo;
        return (0, StateManagement_1.updateOriginatorInfos)({ channelId: channelId, originatorInfo: originatorInfo, instance: this });
    };
    SDKConnect.prototype.resume = function (_c) {
        var channelId = _c.channelId;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_d) {
                return [2 /*return*/, (0, SessionManagement_1.resume)({ channelId: channelId, instance: this })];
            });
        });
    };
    SDKConnect.prototype.reconnect = function (_c) {
        var channelId = _c.channelId, otherPublicKey = _c.otherPublicKey, initialConnection = _c.initialConnection, protocolVersion = _c.protocolVersion, trigger = _c.trigger, updateKey = _c.updateKey, context = _c.context;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_d) {
                return [2 /*return*/, (0, ConnectionManagement_1.reconnect)({
                        channelId: channelId,
                        otherPublicKey: otherPublicKey,
                        context: context,
                        protocolVersion: protocolVersion,
                        updateKey: updateKey,
                        trigger: trigger,
                        initialConnection: initialConnection,
                        instance: this
                    })];
            });
        });
    };
    SDKConnect.prototype.reconnectAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, ConnectionManagement_1.reconnectAll)(this)];
            });
        });
    };
    SDKConnect.prototype.setSDKSessions = function (sdkSessions) {
        this.state.connections = sdkSessions;
    };
    SDKConnect.prototype.pause = function () {
        return (0, SessionManagement_1.pause)(this);
    };
    SDKConnect.prototype.bindAndroidSDK = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, bindAndroidSDK_1["default"])(this)];
            });
        });
    };
    SDKConnect.prototype.isAndroidSDKBound = function () {
        return this.state.androidSDKBound;
    };
    SDKConnect.prototype.loadDappConnections = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, loadDappConnections_1["default"])()];
            });
        });
    };
    SDKConnect.prototype.getAndroidConnections = function () {
        var _c;
        return (_c = this.state.androidService) === null || _c === void 0 ? void 0 : _c.getConnections();
    };
    SDKConnect.prototype.addDappConnection = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, addDappConnection_1["default"])(connection, this)];
            });
        });
    };
    SDKConnect.prototype.refreshChannel = function (_c) {
        var _d;
        var channelId = _c.channelId;
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_e) {
                session = this.state.connected[channelId];
                if (!session) {
                    DevLogger_1["default"].log("SDKConnect::refreshChannel - session not found");
                    return [2 /*return*/];
                }
                DevLogger_1["default"].log("SDKConnect::refreshChannel channelId=".concat(channelId));
                // Force enitting updated accounts
                (_d = session.backgroundBridge) === null || _d === void 0 ? void 0 : _d.notifySelectedAddressChanged();
                return [2 /*return*/];
            });
        });
    };
    /**
     * Invalidate a channel/session by preventing future connection to be established.
     * Instead of removing the channel, it sets the session to timeout on next
     * connection which will remove it while conitnuing current session.
     *
     * @param channelId
     */
    SDKConnect.prototype.invalidateChannel = function (_c) {
        var channelId = _c.channelId;
        return (0, ConnectionManagement_1.invalidateChannel)({ channelId: channelId, instance: this });
    };
    SDKConnect.prototype.removeChannel = function (_c) {
        var channelId = _c.channelId, sendTerminate = _c.sendTerminate;
        return (0, ConnectionManagement_1.removeChannel)({
            channelId: channelId,
            engine: Engine_1["default"],
            sendTerminate: sendTerminate,
            instance: this
        });
    };
    SDKConnect.prototype.removeAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var removeAllPromise;
            var _this = this;
            return __generator(this, function (_c) {
                removeAllPromise = (0, ConnectionManagement_1.removeAll)(this);
                // Force close loading status
                removeAllPromise["finally"](function () { return _this.hideLoadingState(); });
                return [2 /*return*/, removeAllPromise];
            });
        });
    };
    SDKConnect.prototype.getConnected = function () {
        return this.state.connected;
    };
    SDKConnect.prototype.getConnections = function () {
        return this.state.connections;
    };
    SDKConnect.prototype.getConnection = function (_c) {
        var _d;
        var channelId = _c.channelId;
        return ((_d = this.state.connections[channelId]) !== null && _d !== void 0 ? _d : this.state.dappConnections[channelId]);
    };
    SDKConnect.prototype.getApprovedHosts = function (_context) {
        return this.state.approvedHosts || {};
    };
    SDKConnect.prototype.disapproveChannel = function (channelId) {
        return (0, ConnectionManagement_1.disapproveChannel)({ channelId: channelId, instance: this });
    };
    SDKConnect.prototype.getSockerServerUrl = function () {
        return this.state.socketServerUrl;
    };
    SDKConnect.prototype.setSocketServerUrl = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        this.state.socketServerUrl = url;
                        return [4 /*yield*/, this.removeAll()];
                    case 1:
                        _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _c.sent();
                        Logger_1["default"].log(err_1, "SDKConnect::setSocketServerUrl - error ");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SDKConnect.prototype.revalidateChannel = function (_c) {
        var channelId = _c.channelId;
        var hostname = AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN + channelId;
        this._approveHost({
            host: hostname,
            hostname: hostname,
            context: 'revalidateChannel'
        });
    };
    SDKConnect.prototype.isApproved = function (_c) {
        var channelId = _c.channelId;
        var hostname = AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN + channelId;
        var isApproved = this.state.approvedHosts[hostname] !== undefined;
        // possible future feature to add multiple approval parameters per channel.
        return isApproved;
    };
    SDKConnect.prototype._approveHost = function (_c) {
        var host = _c.host;
        return (0, ConnectionManagement_1.approveHost)({ host: host, instance: this });
    };
    SDKConnect.prototype._handleAppState = function (appState) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, StateManagement_1.handleAppState)({ appState: appState, instance: this })];
            });
        });
    };
    SDKConnect.prototype.unmount = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, SessionManagement_1.unmount)(this)];
            });
        });
    };
    SDKConnect.prototype.getSessionsStorage = function () {
        return this.state.connections;
    };
    SDKConnect.prototype.init = function (_c) {
        var navigation = _c.navigation, context = _c.context;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_d) {
                return [2 /*return*/, (0, InitializationManagement_1.init)({ navigation: navigation, context: context, instance: this })];
            });
        });
    };
    SDKConnect.prototype.postInit = function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, InitializationManagement_1.postInit)(this, callback)];
            });
        });
    };
    SDKConnect.prototype.hasInitialized = function () {
        return this.state._initialized;
    };
    SDKConnect.getInstance = function () {
        if (!SDKConnect.instance) {
            SDKConnect.instance = new SDKConnect();
        }
        return SDKConnect.instance;
    };
    return SDKConnect;
}());
exports.SDKConnect = SDKConnect;
exports["default"] = SDKConnect;
