"use strict";
exports.__esModule = true;
var sdk_1 = require("../../../../app/actions/sdk");
var store_1 = require("../../../../app/store");
var AppConstants_1 = require("../../../core/AppConstants");
function invalidateChannel(_c) {
    var channelId = _c.channelId, instance = _c.instance;
    var host = AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN + channelId;
    instance.state.disabledHosts[host] = 0;
    delete instance.state.approvedHosts[host];
    delete instance.state.connecting[channelId];
    delete instance.state.connections[channelId];
    store_1.store.dispatch((0, sdk_1.resetApprovedHosts)(instance.state.approvedHosts));
    store_1.store.dispatch((0, sdk_1.resetConnections)(instance.state.connections));
}
exports["default"] = invalidateChannel;
