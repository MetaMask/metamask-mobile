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
exports.BackgroundBridge = void 0;
var url_parse_1 = require("url-parse");
var controller_utils_1 = require("@metamask/controller-utils");
var json_rpc_engine_1 = require("json-rpc-engine");
var MobilePortStream_1 = require("../MobilePortStream");
var streams_1 = require("../../util/streams");
var middlewares_1 = require("../../util/middlewares");
var Engine_1 = require("../Engine");
var SanitizationMiddleware_1 = require("../SanitizationMiddleware");
var networks_1 = require("../../util/networks");
var Logger_1 = require("../../util/Logger");
var AppConstants_1 = require("../AppConstants");
var json_rpc_middleware_stream_1 = require("json-rpc-middleware-stream");
var RemotePort_1 = require("./RemotePort");
var WalletConnectPort_1 = require("./WalletConnectPort");
var Port_1 = require("./Port");
var networkController_1 = require("../../selectors/networkController");
var store_1 = require("../../store");
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
var SnapsMethodMiddleware_1 = require("../Snaps/SnapsMethodMiddleware");
var permission_controller_2 = require("@metamask/permission-controller");
///: END:ONLY_INCLUDE_IF
var eth_json_rpc_filters_1 = require("eth-json-rpc-filters");
var subscriptionManager_1 = require("eth-json-rpc-filters/subscriptionManager");
var providerAsMiddleware_1 = require("eth-json-rpc-middleware/providerAsMiddleware");
var pump_1 = require("pump");
var events_1 = require("events");
var DevLogger_1 = require("../SDKConnect/utils/DevLogger");
var Permissions_1 = require("../Permissions");
var inpageProvider_1 = require("../redux/slices/inpageProvider");
var createUnsupportedMethodMiddleware_1 = require("../RPCMethods/createUnsupportedMethodMiddleware");
var createLegacyMethodMiddleware_1 = require("../RPCMethods/createLegacyMethodMiddleware");
var NOTIFICATION_NAMES = AppConstants_1["default"].NOTIFICATION_NAMES;
var legacyNetworkId = function () {
    var _c;
    var _d = store_1.store.getState().engine.backgroundState.NetworkController, networksMetadata = _d.networksMetadata, selectedNetworkClientId = _d.selectedNetworkClientId;
    var networkId = store_1.store.getState().inpageProvider.networkId;
    return ((_c = networksMetadata === null || networksMetadata === void 0 ? void 0 : networksMetadata[selectedNetworkClientId]) === null || _c === void 0 ? void 0 : _c.isAvailable) === false
        ? inpageProvider_1.NETWORK_ID_LOADING
        : networkId;
};
var BackgroundBridge = /** @class */ (function (_super) {
    __extends(BackgroundBridge, _super);
    function BackgroundBridge(_c) {
        var webview = _c.webview, url = _c.url, getRpcMethodMiddleware = _c.getRpcMethodMiddleware, isMainFrame = _c.isMainFrame, isRemoteConn = _c.isRemoteConn, sendMessage = _c.sendMessage, isWalletConnect = _c.isWalletConnect, wcRequestActions = _c.wcRequestActions, getApprovedHosts = _c.getApprovedHosts, remoteConnHost = _c.remoteConnHost, isMMSDK = _c.isMMSDK, channelId = _c.channelId;
        var _this = _super.call(this) || this;
        _this.sendStateUpdate = function () {
            _this.emit('update');
        };
        _this.onMessage = function (msg) {
            _this.port.emit('message', { name: msg.name, data: msg.data });
        };
        _this.onDisconnect = function () {
            _this.disconnected = true;
            Engine_1["default"].controllerMessenger.unsubscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, _this.sendStateUpdate);
            Engine_1["default"].controllerMessenger.unsubscribe('PreferencesController:stateChange', _this.sendStateUpdate);
            _this.port.emit('disconnect', { name: _this.port.name, data: null });
        };
        _this.url = url;
        // TODO - When WalletConnect and MMSDK uses the Permission System, URL does not apply in all conditions anymore since hosts may not originate from web. This will need to change!
        _this.hostname = new url_parse_1["default"](url).hostname;
        _this.remoteConnHost = remoteConnHost;
        _this.isMainFrame = isMainFrame;
        _this.isWalletConnect = isWalletConnect;
        _this.isMMSDK = isMMSDK;
        _this.isRemoteConn = isRemoteConn;
        _this._webviewRef = webview && webview.current;
        _this.disconnected = false;
        _this.getApprovedHosts = getApprovedHosts;
        _this.channelId = channelId;
        _this.createMiddleware = getRpcMethodMiddleware;
        _this.port = isRemoteConn
            ? new RemotePort_1["default"](sendMessage)
            : _this.isWalletConnect
                ? new WalletConnectPort_1["default"](wcRequestActions)
                : new Port_1["default"](_this._webviewRef, isMainFrame);
        _this.engine = new json_rpc_engine_1.JsonRpcEngine();
        _this.chainIdSent = (0, networkController_1.selectChainId)(store_1.store.getState());
        _this.networkVersionSent = store_1.store.getState().inpageProvider.networkId;
        // This will only be used for WalletConnect for now
        _this.addressSent =
            Engine_1["default"].context.AccountsController.getSelectedAccount().address.toLowerCase();
        var portStream = new MobilePortStream_1["default"](_this.port, url);
        // setup multiplexing
        var mux = (0, streams_1.setupMultiplex)(portStream);
        // connect features
        _this.setupProviderConnection(mux.createStream(isWalletConnect ? 'walletconnect-provider' : 'metamask-provider'));
        Engine_1["default"].controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, _this.sendStateUpdate);
        Engine_1["default"].controllerMessenger.subscribe('PreferencesController:stateChange', _this.sendStateUpdate);
        Engine_1["default"].controllerMessenger.subscribe('KeyringController:lock', _this.onLock.bind(_this));
        Engine_1["default"].controllerMessenger.subscribe('KeyringController:unlock', _this.onUnlock.bind(_this));
        try {
            var pc = Engine_1["default"].context.PermissionController;
            var controllerMessenger = Engine_1["default"].controllerMessenger;
            controllerMessenger.subscribe("".concat(pc.name, ":stateChange"), function (subjectWithPermission) {
                DevLogger_1["default"].log("PermissionController:stateChange event", subjectWithPermission);
                // Inform dapp about updated permissions
                var selectedAddress = _this.getState().selectedAddress;
                _this.notifySelectedAddressChanged(selectedAddress);
            }, function (state) { return state.subjects[_this.channelId]; });
        }
        catch (err) {
            DevLogger_1["default"].log("Error in BackgroundBridge: ".concat(err));
        }
        _this.on('update', _this.onStateUpdate);
        if (_this.isRemoteConn) {
            var memState = _this.getState();
            var publicState = _this.getProviderNetworkState();
            var selectedAddress = memState.selectedAddress;
            _this.notifyChainChanged(publicState);
            _this.notifySelectedAddressChanged(selectedAddress);
        }
        return _this;
    }
    BackgroundBridge.prototype.onUnlock = function () {
        // TODO UNSUBSCRIBE EVENT INSTEAD
        if (this.disconnected)
            return;
        if (this.isRemoteConn) {
            // Not sending the lock event in case of a remote connection as this is handled correctly already by the SDK
            // In case we want to send, use  new structure
            /*const memState = this.getState();
            const selectedAddress = memState.selectedAddress;
      
            this.sendNotification({
              method: NOTIFICATION_NAMES.unlockStateChanged,
              params: {
                isUnlocked: true,
                accounts: [selectedAddress],
              },
            });*/
            return;
        }
        this.sendNotification({
            method: NOTIFICATION_NAMES.unlockStateChanged,
            params: true
        });
    };
    BackgroundBridge.prototype.onLock = function () {
        // TODO UNSUBSCRIBE EVENT INSTEAD
        if (this.disconnected)
            return;
        if (this.isRemoteConn) {
            // Not sending the lock event in case of a remote connection as this is handled correctly already by the SDK
            // In case we want to send, use  new structure
            /*this.sendNotification({
              method: NOTIFICATION_NAMES.unlockStateChanged,
              params: {
                isUnlocked: false,
              },
            });*/
            return;
        }
        this.sendNotification({
            method: NOTIFICATION_NAMES.unlockStateChanged,
            params: false
        });
    };
    BackgroundBridge.prototype.getProviderNetworkState = function () {
        var providerConfig = (0, networkController_1.selectProviderConfig)(store_1.store.getState());
        var networkType = providerConfig.type;
        var isInitialNetwork = networkType && (0, networks_1.getAllNetworks)().includes(networkType);
        var chainId;
        if (isInitialNetwork && networkType in controller_utils_1.ChainId) {
            chainId = controller_utils_1.ChainId[networkType];
        }
        else if (networkType === 'rpc') {
            chainId = providerConfig.chainId || '';
        }
        else {
            chainId = '';
        }
        if (chainId && !chainId.startsWith('0x')) {
            // Convert to hex
            chainId = "0x".concat(parseInt(chainId, 10).toString(16));
        }
        var result = {
            networkVersion: legacyNetworkId(),
            chainId: chainId || '0x0'
        };
        return result;
    };
    BackgroundBridge.prototype.notifyChainChanged = function (params) {
        DevLogger_1["default"].log("notifyChainChanged: ", params);
        this.sendNotification({
            method: NOTIFICATION_NAMES.chainChanged,
            params: params
        });
    };
    BackgroundBridge.prototype.notifySelectedAddressChanged = function (selectedAddress) {
        var _c;
        return __awaiter(this, void 0, void 0, function () {
            var approvedAccounts, found, err_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 5, , 6]);
                        approvedAccounts = [];
                        DevLogger_1["default"].log("notifySelectedAddressChanged: ".concat(selectedAddress, " wc=").concat(this.isWalletConnect, " url=").concat(this.url));
                        if (!this.isWalletConnect) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(this.url)];
                    case 1:
                        approvedAccounts = _d.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)((_c = this.channelId) !== null && _c !== void 0 ? _c : this.hostname)];
                    case 3:
                        approvedAccounts = _d.sent();
                        _d.label = 4;
                    case 4:
                        found = approvedAccounts
                            .map(function (addr) { return addr.toLowerCase(); })
                            .includes(selectedAddress.toLowerCase());
                        if (found) {
                            // Set selectedAddress as first value in array
                            approvedAccounts = __spreadArray([
                                selectedAddress
                            ], approvedAccounts.filter(function (addr) { return addr.toLowerCase() !== selectedAddress.toLowerCase(); }), true);
                        }
                        DevLogger_1["default"].log("notifySelectedAddressChanged url: ".concat(this.url, " hostname: ").concat(this.hostname, ": ").concat(selectedAddress), approvedAccounts);
                        this.sendNotification({
                            method: NOTIFICATION_NAMES.accountsChanged,
                            params: approvedAccounts
                        });
                        return [3 /*break*/, 6];
                    case 5:
                        err_1 = _d.sent();
                        console.error("notifySelectedAddressChanged: ".concat(err_1));
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    BackgroundBridge.prototype.onStateUpdate = function (memState) {
        var _c, _d;
        if (!memState) {
            memState = this.getState();
        }
        var publicState = this.getProviderNetworkState();
        // Check if update already sent
        if (this.chainIdSent !== publicState.chainId ||
            (this.networkVersionSent !== publicState.networkVersion &&
                publicState.networkVersion !== inpageProvider_1.NETWORK_ID_LOADING)) {
            this.chainIdSent = publicState.chainId;
            this.networkVersionSent = publicState.networkVersion;
            this.notifyChainChanged(publicState);
        }
        // ONLY NEEDED FOR WC FOR NOW, THE BROWSER HANDLES THIS NOTIFICATION BY ITSELF
        if (this.isWalletConnect || this.isRemoteConn) {
            if (((_c = this.addressSent) === null || _c === void 0 ? void 0 : _c.toLowerCase()) !==
                ((_d = memState.selectedAddress) === null || _d === void 0 ? void 0 : _d.toLowerCase())) {
                this.addressSent = memState.selectedAddress;
                this.notifySelectedAddressChanged(memState.selectedAddress);
            }
        }
    };
    BackgroundBridge.prototype.isUnlocked = function () {
        return Engine_1["default"].context.KeyringController.isUnlocked();
    };
    BackgroundBridge.prototype.getProviderState = function () {
        return __assign({ isUnlocked: this.isUnlocked() }, this.getProviderNetworkState());
    };
    /**
     * A method for serving our ethereum provider over a given stream.
     * @param outStream - The stream to provide over.
     */
    BackgroundBridge.prototype.setupProviderConnection = function (outStream) {
        var _this = this;
        this.engine = this.setupProviderEngine();
        // setup connection
        var providerStream = (0, json_rpc_middleware_stream_1.createEngineStream)({ engine: this.engine });
        (0, pump_1["default"])(outStream, providerStream, outStream, function (err) {
            // handle any middleware cleanup
            _this.engine._middleware.forEach(function (mid) {
                if (mid.destroy && typeof mid.destroy === 'function') {
                    mid.destroy();
                }
            });
            if (err)
                Logger_1["default"].log('Error with provider stream conn', err);
        });
    };
    /**
     * A method for creating a provider that is safely restricted for the requesting domain.
     **/
    BackgroundBridge.prototype.setupProviderEngine = function () {
        var _this = this;
        var _c;
        var origin = this.hostname;
        // setup json rpc engine stack
        var engine = new json_rpc_engine_1.JsonRpcEngine();
        var _d = Engine_1["default"].context.NetworkController.getProviderAndBlockTracker(), blockTracker = _d.blockTracker, provider = _d.provider;
        // create filter polyfill middleware
        var filterMiddleware = (0, eth_json_rpc_filters_1["default"])({ provider: provider, blockTracker: blockTracker });
        // create subscription polyfill middleware
        var subscriptionManager = (0, subscriptionManager_1["default"])({
            provider: provider,
            blockTracker: blockTracker
        });
        subscriptionManager.events.on('notification', function (message) {
            return engine.emit('notification', message);
        });
        // metadata
        engine.push((0, middlewares_1.createOriginMiddleware)({ origin: origin }));
        engine.push((0, middlewares_1.createLoggerMiddleware)({ origin: origin }));
        // filter and subscription polyfills
        engine.push(filterMiddleware);
        engine.push(subscriptionManager.middleware);
        // Handle unsupported RPC Methods
        engine.push((0, createUnsupportedMethodMiddleware_1["default"])());
        // Legacy RPC methods that need to be implemented ahead of the permission middleware
        engine.push((0, createLegacyMethodMiddleware_1["default"])({
            getAccounts: function () { return __awaiter(_this, void 0, void 0, function () {
                var accountOrigin;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            accountOrigin = this.isMMSDK && this.channelId ? this.channelId : origin;
                            return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(accountOrigin)];
                        case 1: return [2 /*return*/, _c.sent()];
                    }
                });
            }); }
        }));
        // Append PermissionController middleware
        engine.push(Engine_1["default"].context.PermissionController.createPermissionMiddleware({
            // FIXME: This condition exists so that both WC and SDK are compatible with the permission middleware.
            // This is not a long term solution. BackgroundBridge should be not contain hardcoded logic pertaining to WC, SDK, or browser.
            origin: this.isMMSDK ? (_c = this.channelId) !== null && _c !== void 0 ? _c : '' : origin
        }));
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        // Snaps middleware
        engine.push((0, SnapsMethodMiddleware_1["default"])(Engine_1["default"].context, Engine_1["default"].controllerMessenger, origin, 
        // We assume that origins connecting through the BackgroundBridge are websites
        permission_controller_2.SubjectType.Website));
        ///: END:ONLY_INCLUDE_IF
        // user-facing RPC methods
        engine.push(this.createMiddleware({
            hostname: this.hostname,
            getProviderState: this.getProviderState.bind(this)
        }));
        engine.push((0, SanitizationMiddleware_1.createSanitizationMiddleware)());
        // forward to metamask primary provider
        engine.push((0, providerAsMiddleware_1["default"])(provider));
        return engine;
    };
    BackgroundBridge.prototype.sendNotification = function (payload) {
        DevLogger_1["default"].log("BackgroundBridge::sendNotification: ", payload);
        this.engine && this.engine.emit('notification', payload);
    };
    /**
     * The metamask-state of the various controllers, made available to the UI
     *
     * TODO: Use controller state instead of flattened state for better auditability
     *
     * @returns {Object} status
     */
    BackgroundBridge.prototype.getState = function () {
        var vault = Engine_1["default"].context.KeyringController.state.vault;
        var selectedAddress = Engine_1["default"].datamodel.flatState.selectedAddress;
        return {
            isInitialized: !!vault,
            isUnlocked: true,
            network: legacyNetworkId(),
            selectedAddress: selectedAddress
        };
    };
    return BackgroundBridge;
}(events_1.EventEmitter));
exports.BackgroundBridge = BackgroundBridge;
exports["default"] = BackgroundBridge;
