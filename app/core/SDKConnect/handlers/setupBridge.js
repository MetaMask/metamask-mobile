"use strict";
exports.__esModule = true;
exports.setupBridge = void 0;
var AppConstants_1 = require("../../AppConstants");
var BackgroundBridge_1 = require("../../BackgroundBridge/BackgroundBridge");
var RPCMethodMiddleware_1 = require("../../RPCMethods/RPCMethodMiddleware");
var deeplinks_1 = require("../../../constants/deeplinks");
var Logger_1 = require("../../../util/Logger");
var DevLogger_1 = require("../utils/DevLogger");
var handleSendMessage_1 = require("./handleSendMessage");
var setupBridge = function (_c) {
    var originatorInfo = _c.originatorInfo, connection = _c.connection;
    if (connection.backgroundBridge) {
        DevLogger_1["default"].log("setupBridge:: backgroundBridge already exists");
        return connection.backgroundBridge;
    }
    var backgroundBridge = new BackgroundBridge_1["default"]({
        webview: null,
        isMMSDK: true,
        channelId: connection.channelId,
        url: deeplinks_1.PROTOCOLS.METAMASK + '://' + originatorInfo.url || originatorInfo.title,
        isRemoteConn: true,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sendMessage: function (msg) {
            DevLogger_1["default"].log("setupBride::sendMessage", msg);
            (0, handleSendMessage_1["default"])({
                msg: msg,
                connection: connection
            })["catch"](function (err) {
                Logger_1["default"].error(err, 'Connection::sendMessage failed to send');
            });
        },
        getApprovedHosts: function () { return connection.getApprovedHosts('backgroundBridge'); },
        remoteConnHost: connection.host,
        getRpcMethodMiddleware: function (_c) {
            var _d;
            var getProviderState = _c.getProviderState;
            DevLogger_1["default"].log("getRpcMethodMiddleware hostname=".concat(connection.host, " url=").concat(originatorInfo.url, " "));
            return (0, RPCMethodMiddleware_1["default"])({
                hostname: connection.host,
                channelId: connection.channelId,
                getProviderState: getProviderState,
                isMMSDK: true,
                navigation: null,
                getApprovedHosts: function () {
                    return connection.getApprovedHosts('rpcMethodMiddleWare');
                },
                setApprovedHosts: function (hostname) {
                    connection.approveHost({
                        host: hostname,
                        hostname: hostname,
                        context: 'setApprovedHosts'
                    });
                },
                approveHost: function (approveHostname) {
                    return connection.approveHost({
                        host: connection.host,
                        hostname: approveHostname,
                        context: 'rpcMethodMiddleWare'
                    });
                },
                // Website info
                url: {
                    current: originatorInfo === null || originatorInfo === void 0 ? void 0 : originatorInfo.url
                },
                title: {
                    current: originatorInfo === null || originatorInfo === void 0 ? void 0 : originatorInfo.title
                },
                icon: { current: undefined },
                // Bookmarks
                isHomepage: function () { return false; },
                // Show autocomplete
                fromHomepage: { current: false },
                // Wizard
                wizardScrollAdjusted: { current: false },
                tabId: '',
                isWalletConnect: false,
                analytics: {
                    isRemoteConn: true,
                    platform: (_d = originatorInfo === null || originatorInfo === void 0 ? void 0 : originatorInfo.platform) !== null && _d !== void 0 ? _d : AppConstants_1["default"].MM_SDK.UNKNOWN_PARAM
                },
                toggleUrlModal: function () { return null; },
                injectHomePageScripts: function () { return null; }
            });
        },
        isMainFrame: true,
        isWalletConnect: false,
        wcRequestActions: undefined
    });
    return backgroundBridge;
};
exports.setupBridge = setupBridge;
exports["default"] = exports.setupBridge;
