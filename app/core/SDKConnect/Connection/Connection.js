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
exports.__esModule = true;
exports.Connection = void 0;
var sdk_communication_layer_1 = require("@metamask/sdk-communication-layer");
var eventemitter2_1 = require("eventemitter2");
var AppConstants_1 = require("../../AppConstants");
var BatchRPCManager_1 = require("../BatchRPCManager");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var DevLogger_1 = require("../utils/DevLogger");
var sendAuthorized_1 = require("./Auth/sendAuthorized");
var ConnectionLifecycle_1 = require("./ConnectionLifecycle");
var EventListenersHandlers_1 = require("./EventListenersHandlers");
var handleClientsWaiting_1 = require("./EventListenersHandlers/handleClientsWaiting");
var setupBridge_1 = require("../handlers/setupBridge");
// eslint-disable-next-line
var version = require('../../../../package.json').version;
var Connection = /** @class */ (function (_super) {
    __extends(Connection, _super);
    function Connection(_c) {
        var id = _c.id, otherPublicKey = _c.otherPublicKey, privateKey = _c.privateKey, relayPersistence = _c.relayPersistence, protocolVersion = _c.protocolVersion, origin = _c.origin, reconnect = _c.reconnect, initialConnection = _c.initialConnection, rpcQueueManager = _c.rpcQueueManager, originatorInfo = _c.originatorInfo, socketServerUrl = _c.socketServerUrl, trigger = _c.trigger, navigation = _c.navigation, lastAuthorized = _c.lastAuthorized, approveHost = _c.approveHost, getApprovedHosts = _c.getApprovedHosts, disapprove = _c.disapprove, revalidate = _c.revalidate, isApproved = _c.isApproved, updateOriginatorInfos = _c.updateOriginatorInfos, onTerminate = _c.onTerminate;
        var _this = _super.call(this) || this;
        _this.isReady = false;
        /**
         * Sometime the dapp disconnect and reconnect automatically through socket.io which doesnt inform the wallet of the reconnection.
         * We keep track of the disconnect event to avoid waiting for ready after a message.
         */
        _this.receivedDisconnect = false;
        /**
         * receivedClientsReady is used to track when a dApp disconnects before processing the 'clients_ready' message.
         */
        _this.receivedClientsReady = false;
        /**
         * isResumed is used to manage the loading state.
         */
        _this.isResumed = false;
        /**
         * Prevent double sending 'authorized' message.
         */
        _this.authorizedSent = false;
        /**
         * Should only be accesses via getter / setter.
         */
        _this._loading = false;
        _this.isReady = relayPersistence !== null && relayPersistence !== void 0 ? relayPersistence : false;
        _this.origin = origin;
        _this.trigger = trigger;
        _this.channelId = id;
        _this.navigation = navigation;
        _this.lastAuthorized = lastAuthorized;
        _this.reconnect = reconnect || false;
        _this.isResumed = false;
        _this.originatorInfo = originatorInfo;
        _this.socketServerUrl = socketServerUrl;
        _this.initialConnection = initialConnection === true;
        _this.host = "".concat(AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN).concat(_this.channelId);
        // TODO: should be probably contained to current connection
        _this.rpcQueueManager = rpcQueueManager;
        // batchRPCManager should be contained to current connection
        _this.batchRPCManager = new BatchRPCManager_1["default"](id);
        _this.protocolVersion = protocolVersion !== null && protocolVersion !== void 0 ? protocolVersion : 1;
        _this.approveHost = approveHost;
        _this.getApprovedHosts = getApprovedHosts;
        _this.disapprove = disapprove;
        _this.revalidate = revalidate;
        _this.isApproved = isApproved;
        _this.onTerminate = onTerminate;
        DevLogger_1["default"].log("Connection::constructor() id=".concat(_this.channelId, " typeof(protocolVersion)=").concat(typeof protocolVersion, "  protocolVersion=").concat(protocolVersion, " relayPersistence=").concat(relayPersistence, " initialConnection=").concat(_this.initialConnection, " lastAuthorized=").concat(_this.lastAuthorized, " trigger=").concat(_this.trigger), socketServerUrl, originatorInfo);
        if (!_this.channelId) {
            throw new Error('Connection channelId is undefined');
        }
        _this.remote = new sdk_communication_layer_1.RemoteCommunication({
            platformType: AppConstants_1["default"].MM_SDK.PLATFORM,
            relayPersistence: relayPersistence,
            protocolVersion: _this.protocolVersion,
            communicationServerUrl: _this.socketServerUrl,
            communicationLayerPreference: sdk_communication_layer_1.CommunicationLayerPreference.SOCKET,
            otherPublicKey: otherPublicKey,
            reconnect: reconnect,
            transports: ['websocket'],
            walletInfo: {
                type: 'MetaMask Mobile',
                version: version
            },
            ecies: {
                debug: true,
                privateKey: privateKey
            },
            context: AppConstants_1["default"].MM_SDK.PLATFORM,
            analytics: true,
            logging: {
                eciesLayer: false,
                keyExchangeLayer: true,
                remoteLayer: true,
                serviceLayer: true,
                // plaintext: true doesn't do anything unless using custom socket server.
                plaintext: true
            },
            storage: {
                enabled: false
            }
        });
        // if relayPersistence is true, automatically setup background bridge
        if (originatorInfo) {
            _this.backgroundBridge = (0, setupBridge_1["default"])({
                originatorInfo: originatorInfo,
                connection: _this
            });
        }
        _this.remote.on(sdk_communication_layer_1.EventType.CLIENTS_CONNECTED, (0, EventListenersHandlers_1.handleClientsConnected)(_this));
        _this.remote.on(sdk_communication_layer_1.EventType.CLIENTS_DISCONNECTED, (0, EventListenersHandlers_1.handleClientsDisconnected)({
            instance: _this,
            disapprove: disapprove
        }));
        _this.remote.on(sdk_communication_layer_1.EventType.CLIENTS_WAITING, (0, handleClientsWaiting_1["default"])({
            instance: _this
        }));
        _this.remote.on(sdk_communication_layer_1.EventType.CLIENTS_READY, (0, EventListenersHandlers_1.handleClientsReady)({
            instance: _this,
            disapprove: disapprove,
            updateOriginatorInfos: updateOriginatorInfos,
            approveHost: approveHost
        }));
        _this.remote.on(sdk_communication_layer_1.EventType.MESSAGE, (0, EventListenersHandlers_1.handleReceivedMessage)({ instance: _this }));
        return _this;
    }
    Connection.prototype.connect = function (_c) {
        var withKeyExchange = _c.withKeyExchange, authorized = _c.authorized;
        return (0, ConnectionLifecycle_1.connect)({
            instance: this,
            withKeyExchange: withKeyExchange,
            authorized: authorized
        });
    };
    Connection.prototype.sendAuthorized = function (force) {
        return (0, sendAuthorized_1["default"])({ instance: this, force: force });
    };
    Connection.prototype.setLoading = function (loading) {
        this._loading = loading;
        DevLogger_1["default"].log("Connection::setLoading() id=".concat(this.channelId, " loading=").concat(loading));
        this.emit(SDKConnectConstants_1.CONNECTION_LOADING_EVENT, { loading: loading });
    };
    Connection.prototype.getLoading = function () {
        return this._loading;
    };
    Connection.prototype.pause = function () {
        return (0, ConnectionLifecycle_1.pause)({ instance: this });
    };
    Connection.prototype.resume = function () {
        return (0, ConnectionLifecycle_1.resume)({ instance: this });
    };
    Connection.prototype.setTrigger = function (trigger) {
        DevLogger_1["default"].log("Connection::setTrigger() id=".concat(this.channelId, " trigger=").concat(trigger));
        this.trigger = trigger;
    };
    Connection.prototype.disconnect = function (_c) {
        var terminate = _c.terminate, context = _c.context;
        return (0, ConnectionLifecycle_1.disconnect)({ instance: this, terminate: terminate, context: context });
    };
    Connection.prototype.removeConnection = function (_c) {
        var terminate = _c.terminate, context = _c.context;
        return (0, ConnectionLifecycle_1.removeConnection)({ instance: this, terminate: terminate, context: context });
    };
    return Connection;
}(eventemitter2_1.EventEmitter2));
exports.Connection = Connection;
