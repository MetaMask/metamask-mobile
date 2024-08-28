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
exports.__esModule = true;
var sdk_1 = require("../../../../app/actions/sdk");
var store_1 = require("../../../../app/store");
var DevLogger_1 = require("../utils/DevLogger");
function updateOriginatorInfos(_c) {
    var channelId = _c.channelId, originatorInfo = _c.originatorInfo, instance = _c.instance;
    if (!instance.state.connections[channelId]) {
        console.warn("SDKConnect::updateOriginatorInfos - no connection");
        return;
    }
    // update originatorInfo
    instance.state.connections[channelId] = __assign(__assign({}, instance.state.connections[channelId]), { originatorInfo: originatorInfo, connected: true });
    DevLogger_1["default"].log("SDKConnect::updateOriginatorInfos", instance.state.connections);
    store_1.store.dispatch((0, sdk_1.resetConnections)(instance.state.connections));
}
exports["default"] = updateOriginatorInfos;
