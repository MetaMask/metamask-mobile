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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SnapBridge_mux, _SnapBridge_providerProxy, _SnapBridge_blockTrackerProxy, _SnapBridge_setProvider, _SnapBridge_setBlockTracker;
exports.__esModule = true;
var swappable_obj_proxy_1 = require("@metamask/swappable-obj-proxy");
var json_rpc_engine_1 = require("json-rpc-engine");
var json_rpc_middleware_stream_1 = require("json-rpc-middleware-stream");
var controller_utils_1 = require("@metamask/controller-utils");
var Engine_1 = require("../Engine");
var streams_1 = require("../../util/streams");
var Logger_1 = require("../../util/Logger");
var networks_1 = require("../../util/networks");
var SnapsMethodMiddleware_1 = require("./SnapsMethodMiddleware");
var permission_controller_2 = require("@metamask/permission-controller");
var ObjectMultiplex = require('@metamask/object-multiplex');
var createFilterMiddleware = require('eth-json-rpc-filters');
var createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
var providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware');
var pump = require('pump');
var SnapBridge = /** @class */ (function () {
    function SnapBridge(_c) {
        var snapId = _c.snapId, connectionStream = _c.connectionStream, getRPCMethodMiddleware = _c.getRPCMethodMiddleware;
        var _this = this;
        _SnapBridge_mux.set(this, void 0);
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _SnapBridge_providerProxy.set(this, void 0);
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _SnapBridge_blockTrackerProxy.set(this, void 0);
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _SnapBridge_setProvider.set(this, function (provider) {
            if (__classPrivateFieldGet(_this, _SnapBridge_providerProxy, "f")) {
                __classPrivateFieldGet(_this, _SnapBridge_providerProxy, "f").setTarget(provider);
            }
            else {
                __classPrivateFieldSet(_this, _SnapBridge_providerProxy, (0, swappable_obj_proxy_1.createSwappableProxy)(provider), "f");
            }
            _this.provider = provider;
        });
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _SnapBridge_setBlockTracker.set(this, function (blockTracker) {
            if (__classPrivateFieldGet(_this, _SnapBridge_blockTrackerProxy, "f")) {
                __classPrivateFieldGet(_this, _SnapBridge_blockTrackerProxy, "f").setTarget(blockTracker);
            }
            else {
                __classPrivateFieldSet(_this, _SnapBridge_blockTrackerProxy, (0, swappable_obj_proxy_1.createEventEmitterProxy)(blockTracker, {
                    eventFilter: 'skipInternal'
                }), "f");
            }
            _this.blockTracker = blockTracker;
        });
        this.setupProviderConnection = function () {
            Logger_1["default"].log('[SNAP BRIDGE LOG] Engine+setupProviderConnection');
            var outStream = __classPrivateFieldGet(_this, _SnapBridge_mux, "f").createStream('metamask-provider');
            var engine = _this.setupProviderEngine();
            var providerStream = (0, json_rpc_middleware_stream_1.createEngineStream)({ engine: engine });
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pump(outStream, providerStream, outStream, function (err) {
                // handle any middleware cleanup
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                engine._middleware.forEach(function (mid) {
                    if (mid.destroy && typeof mid.destroy === 'function') {
                        mid.destroy();
                    }
                });
                if (err)
                    Logger_1["default"].log('Error with provider stream conn', err);
            });
        };
        this.setupProviderEngine = function () {
            var engine = new json_rpc_engine_1.JsonRpcEngine();
            // create filter polyfill middleware
            var filterMiddleware = createFilterMiddleware({
                provider: __classPrivateFieldGet(_this, _SnapBridge_providerProxy, "f"),
                blockTracker: __classPrivateFieldGet(_this, _SnapBridge_blockTrackerProxy, "f")
            });
            // create subscription polyfill middleware
            var subscriptionManager = createSubscriptionManager({
                provider: __classPrivateFieldGet(_this, _SnapBridge_providerProxy, "f"),
                blockTracker: __classPrivateFieldGet(_this, _SnapBridge_blockTrackerProxy, "f")
            });
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            subscriptionManager.events.on('notification', function (message) {
                return engine.emit('notification', message);
            });
            // Filter and subscription polyfills
            engine.push(filterMiddleware);
            engine.push(subscriptionManager.middleware);
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var _c = Engine_1["default"], context = _c.context, controllerMessenger = _c.controllerMessenger;
            var PermissionController = context.PermissionController;
            engine.push(PermissionController.createPermissionMiddleware({
                origin: _this.snapId
            }));
            engine.push((0, SnapsMethodMiddleware_1["default"])(context, controllerMessenger, _this.snapId, permission_controller_2.SubjectType.Snap));
            // User-Facing RPC methods
            engine.push(_this.getRPCMethodMiddleware({
                hostname: _this.snapId,
                getProviderState: _this.getProviderState.bind(_this)
            }));
            // Forward to metamask primary provider
            engine.push(providerAsMiddleware(__classPrivateFieldGet(_this, _SnapBridge_providerProxy, "f")));
            return engine;
        };
        this.getNetworkState = function (_c) {
            var network = _c.network;
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var NetworkController = Engine_1["default"].context.NetworkController;
            var networkType = NetworkController.state.providerConfig.type;
            var networkProvider = NetworkController.state.providerConfig;
            var isInitialNetwork = networkType && (0, networks_1.getAllNetworks)().includes(networkType);
            var chainId;
            if (isInitialNetwork) {
                chainId = controller_utils_1.NetworksChainId[networkType];
            }
            else if (networkType === 'rpc') {
                chainId = networkProvider.chainId;
            }
            if (chainId && !chainId.startsWith('0x')) {
                // Convert to hex
                chainId = "0x".concat(parseInt(chainId, 10).toString(16));
            }
            var result = {
                networkVersion: network,
                chainId: chainId
            };
            return result;
        };
        this.isUnlocked = function () {
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var KeyringController = Engine_1["default"].context.KeyringController;
            return KeyringController.isUnlocked();
        };
        this.getState = function () {
            var context = Engine_1["default"].context, datamodel = Engine_1["default"].datamodel;
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var KeyringController = context.KeyringController;
            var vault = KeyringController.state.vault;
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var _c = datamodel.flatState, network = _c.network, selectedAddress = _c.selectedAddress;
            return {
                isInitialized: !!vault,
                isUnlocked: true,
                network: network,
                selectedAddress: selectedAddress
            };
        };
        Logger_1["default"].log('[SNAP BRIDGE LOG] Engine+setupSnapProvider: Setup bridge for Snap', snapId);
        this.snapId = snapId;
        this.stream = connectionStream;
        this.getRPCMethodMiddleware = getRPCMethodMiddleware;
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var NetworkController = Engine_1["default"].context.NetworkController;
        var _d = NetworkController.getProviderAndBlockTracker(), provider = _d.provider, blockTracker = _d.blockTracker;
        __classPrivateFieldSet(this, _SnapBridge_providerProxy, null, "f");
        __classPrivateFieldSet(this, _SnapBridge_blockTrackerProxy, null, "f");
        __classPrivateFieldGet(this, _SnapBridge_setProvider, "f").call(this, provider);
        __classPrivateFieldGet(this, _SnapBridge_setBlockTracker, "f").call(this, blockTracker);
        __classPrivateFieldSet(this, _SnapBridge_mux, (0, streams_1.setupMultiplex)(this.stream), "f");
    }
    SnapBridge.prototype.getProviderState = function () {
        var memState = this.getState();
        return __assign({ isUnlocked: this.isUnlocked() }, this.getProviderNetworkState(memState));
    };
    SnapBridge.prototype.getProviderNetworkState = function (_c) {
        var network = _c.network;
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var NetworkController = Engine_1["default"].context.NetworkController;
        var networkType = NetworkController.state.providerConfig.type;
        var networkProvider = NetworkController.state.providerConfig;
        var isInitialNetwork = networkType && (0, networks_1.getAllNetworks)().includes(networkType);
        var chainId;
        if (isInitialNetwork) {
            chainId = controller_utils_1.NetworksChainId[networkType];
        }
        else if (networkType === 'rpc') {
            chainId = networkProvider.chainId;
        }
        if (chainId && !chainId.startsWith('0x')) {
            // Convert to hex
            chainId = "0x".concat(parseInt(chainId, 10).toString(16));
        }
        var result = {
            networkVersion: network,
            chainId: chainId
        };
        return result;
    };
    return SnapBridge;
}());
exports["default"] = SnapBridge;
_SnapBridge_mux = new WeakMap(), _SnapBridge_providerProxy = new WeakMap(), _SnapBridge_blockTrackerProxy = new WeakMap(), _SnapBridge_setProvider = new WeakMap(), _SnapBridge_setBlockTracker = new WeakMap();
///: END:ONLY_INCLUDE_IF
