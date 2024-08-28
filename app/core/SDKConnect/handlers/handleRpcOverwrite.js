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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
exports.__esModule = true;
exports.overwriteRPCWith = void 0;
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var DevLogger_1 = require("../utils/DevLogger");
var overwriteRPCWith = function (_c) {
    var rpc = _c.rpc, accountAddress = _c.accountAddress, selectedChainId = _c.selectedChainId;
    DevLogger_1["default"].log("overwriteRPCWith:: method=".concat(rpc === null || rpc === void 0 ? void 0 : rpc.method), rpc);
    // Handle
    if (rpc.method.toLowerCase() === SDKConnectConstants_1.RPC_METHODS.PERSONAL_SIGN.toLowerCase()) {
        // Replace address value with the selected address
        rpc.params = [rpc.params[0], accountAddress];
    }
    else if (rpc.method.toLowerCase() === SDKConnectConstants_1.RPC_METHODS.ETH_SENDTRANSACTION.toLowerCase()) {
        var originalParams = rpc.params[0];
        var from = originalParams.from, rest = __rest(originalParams, ["from"]);
        rpc.params = [__assign(__assign({}, rest), { from: accountAddress })];
    }
    else if (rpc.method.toLowerCase() === SDKConnectConstants_1.RPC_METHODS.ETH_SIGNTYPEDEATA.toLowerCase()) {
        var originalParams = rpc.params[1];
        // overwrite domain.chainId
        originalParams.domain.chainId = selectedChainId;
        rpc.params = [accountAddress, originalParams];
    }
    else if ([
        SDKConnectConstants_1.RPC_METHODS.ETH_SIGNTYPEDEATAV4.toLowerCase(),
        SDKConnectConstants_1.RPC_METHODS.ETH_SIGNTYPEDEATAV3.toLowerCase(),
    ].includes(rpc.method.toLowerCase())) {
        var originalParams = rpc.params[1];
        // overwrite domain.chainId
        originalParams.domain.chainId = selectedChainId;
        rpc.params = [accountAddress, JSON.stringify(originalParams)];
    }
    else {
        DevLogger_1["default"].log("overwriteRPCWith:: method=".concat(rpc.method, " not handled"));
    }
    return rpc;
};
exports.overwriteRPCWith = overwriteRPCWith;
exports["default"] = exports.overwriteRPCWith;
