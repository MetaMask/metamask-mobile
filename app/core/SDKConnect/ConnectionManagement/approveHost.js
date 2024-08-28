"use strict";
exports.__esModule = true;
var sdk_1 = require("../../../../app/actions/sdk");
var store_1 = require("../../../../app/store");
var AppConstants_1 = require("../../../core/AppConstants");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var DevLogger_1 = require("../utils/DevLogger");
function approveHost(_c) {
    var host = _c.host, instance = _c.instance;
    var channelId = host.replace(AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN, '');
    if (instance.state.disabledHosts[host]) {
        // Might be useful for future feature.
    }
    else {
        var approvedUntil = Date.now() + SDKConnectConstants_1.DEFAULT_SESSION_TIMEOUT_MS;
        instance.state.approvedHosts[host] = approvedUntil;
        DevLogger_1["default"].log("SDKConnect approveHost ".concat(host), instance.state.approvedHosts);
        if (instance.state.connections[channelId]) {
            instance.state.connections[channelId].lastAuthorized = approvedUntil;
        }
        if (instance.state.connected[channelId]) {
            instance.state.connected[channelId].lastAuthorized = approvedUntil;
        }
        store_1.store.dispatch((0, sdk_1.resetConnections)(instance.state.connections));
        store_1.store.dispatch((0, sdk_1.resetApprovedHosts)(instance.state.approvedHosts));
    }
}
exports["default"] = approveHost;
