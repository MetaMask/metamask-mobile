"use strict";
var _c;
exports.__esModule = true;
exports.PREFIXES = exports.ACTIONS = exports.PROTOCOLS = exports.ETH_ACTIONS = void 0;
var ETH_ACTIONS;
(function (ETH_ACTIONS) {
    ETH_ACTIONS["TRANSFER"] = "transfer";
    ETH_ACTIONS["APPROVE"] = "approve";
})(ETH_ACTIONS = exports.ETH_ACTIONS || (exports.ETH_ACTIONS = {}));
var PROTOCOLS;
(function (PROTOCOLS) {
    PROTOCOLS["HTTP"] = "http";
    PROTOCOLS["HTTPS"] = "https";
    PROTOCOLS["WC"] = "wc";
    PROTOCOLS["ETHEREUM"] = "ethereum";
    PROTOCOLS["DAPP"] = "dapp";
    PROTOCOLS["METAMASK"] = "metamask";
})(PROTOCOLS = exports.PROTOCOLS || (exports.PROTOCOLS = {}));
var ACTIONS;
(function (ACTIONS) {
    ACTIONS["DAPP"] = "dapp";
    ACTIONS["SEND"] = "send";
    ACTIONS["APPROVE"] = "approve";
    ACTIONS["PAYMENT"] = "payment";
    ACTIONS["FOCUS"] = "focus";
    ACTIONS["WC"] = "wc";
    ACTIONS["CONNECT"] = "connect";
    ACTIONS["MMSDK"] = "mmsdk";
    ACTIONS["ANDROID_SDK"] = "bind";
    ACTIONS["BUY"] = "buy";
    ACTIONS["BUY_CRYPTO"] = "buy-crypto";
    ACTIONS["SELL"] = "sell";
    ACTIONS["SELL_CRYPTO"] = "sell-crypto";
    ACTIONS["EMPTY"] = "";
})(ACTIONS = exports.ACTIONS || (exports.ACTIONS = {}));
exports.PREFIXES = (_c = {},
    _c[ACTIONS.DAPP] = 'https://',
    _c[ACTIONS.SEND] = 'ethereum:',
    _c[ACTIONS.APPROVE] = 'ethereum:',
    _c[ACTIONS.FOCUS] = '',
    _c[ACTIONS.EMPTY] = '',
    _c[ACTIONS.PAYMENT] = '',
    _c[ACTIONS.WC] = '',
    _c[ACTIONS.CONNECT] = '',
    _c[ACTIONS.ANDROID_SDK] = '',
    _c[ACTIONS.BUY] = '',
    _c[ACTIONS.SELL] = '',
    _c[ACTIONS.BUY_CRYPTO] = '',
    _c[ACTIONS.SELL_CRYPTO] = '',
    _c.METAMASK = 'metamask://',
    _c);
