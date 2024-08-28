"use strict";
exports.__esModule = true;
var AppConstants_1 = require("../../AppConstants");
var RPCMethodMiddleware_1 = require("../../RPCMethods/RPCMethodMiddleware");
var getDefaultBridgeParams = function (clientInfo) {
    var _c;
    return ({
        getApprovedHosts: function (host) {
            var _c;
            return (_c = {},
                _c[host] = true,
                _c);
        },
        remoteConnHost: (_c = clientInfo.originatorInfo.url) !== null && _c !== void 0 ? _c : clientInfo.originatorInfo.title,
        getRpcMethodMiddleware: function (_c) {
            var _d, _e, _f, _g, _h;
            var getProviderState = _c.getProviderState;
            return (0, RPCMethodMiddleware_1["default"])({
                hostname: (_d = clientInfo.originatorInfo.url) !== null && _d !== void 0 ? _d : clientInfo.originatorInfo.title,
                channelId: clientInfo.clientId,
                getProviderState: getProviderState,
                isMMSDK: true,
                navigation: null,
                getApprovedHosts: function (host) {
                    var _c;
                    return (_c = {},
                        _c[host] = true,
                        _c);
                },
                setApprovedHosts: function () { return true; },
                approveHost: function () { return ({}); },
                // Website info
                url: {
                    current: (_e = clientInfo.originatorInfo) === null || _e === void 0 ? void 0 : _e.url
                },
                title: {
                    current: (_f = clientInfo.originatorInfo) === null || _f === void 0 ? void 0 : _f.title
                },
                icon: {
                    current: (_g = clientInfo.originatorInfo) === null || _g === void 0 ? void 0 : _g.icon
                },
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
                    platform: (_h = clientInfo.originatorInfo.platform) !== null && _h !== void 0 ? _h : AppConstants_1["default"].MM_SDK.UNKNOWN_PARAM
                },
                toggleUrlModal: function () { return null; },
                injectHomePageScripts: function () { return null; }
            });
        },
        isMainFrame: true,
        isWalletConnect: false,
        wcRequestActions: undefined
    });
};
exports["default"] = getDefaultBridgeParams;
