"use strict";
exports.__esModule = true;
var AppConstants_1 = require("../../../core/AppConstants");
var DevLogger_1 = require("../utils/DevLogger");
function disapproveChannel(_c) {
    var channelId = _c.channelId, instance = _c.instance;
    var hostname = AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN + channelId;
    DevLogger_1["default"].log("SDKConnect::disapproveChannel - ".concat(hostname, " - channelId=").concat(channelId), instance.state.connections);
    if (instance.state.connections[channelId]) {
        instance.state.connections[channelId].lastAuthorized = 0;
    }
    delete instance.state.approvedHosts[hostname];
}
exports["default"] = disapproveChannel;
