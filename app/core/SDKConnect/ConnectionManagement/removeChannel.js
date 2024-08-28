"use strict";
exports.__esModule = true;
var sdk_1 = require("../../../../app/actions/sdk");
var store_1 = require("../../../../app/store");
var AppConstants_1 = require("../../../core/AppConstants");
var DevLogger_1 = require("../utils/DevLogger");
function removeChannel(_c) {
    var _d, _e;
    var channelId = _c.channelId, engine = _c.engine, sendTerminate = _c.sendTerminate, instance = _c.instance;
    // check if it is an android sdk connection, if it doesn't belong to regular connections
    var isDappConnection = instance.state.connections[channelId] === undefined;
    DevLogger_1["default"].log("SDKConnect::removeChannel ".concat(channelId, " sendTerminate=").concat(sendTerminate, " isDappConnection=").concat(isDappConnection, " connectedted=").concat(instance.state.connected[channelId] !== undefined));
    if (isDappConnection) {
        (_d = instance.state.androidService) === null || _d === void 0 ? void 0 : _d.removeConnection(channelId);
        (_e = instance.state.deeplinkingService) === null || _e === void 0 ? void 0 : _e.removeConnection(channelId);
    }
    if (instance.state.connected[channelId]) {
        try {
            instance.state.connected[channelId].removeConnection({
                terminate: sendTerminate !== null && sendTerminate !== void 0 ? sendTerminate : false,
                context: 'SDKConnect::removeChannel'
            });
        }
        catch (err) {
            console.error("Can't remove connection ".concat(channelId), err);
        }
    }
    delete instance.state.connected[channelId];
    delete instance.state.connections[channelId];
    delete instance.state.approvedHosts[AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN + channelId];
    delete instance.state.disabledHosts[AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN + channelId];
    store_1.store.dispatch((0, sdk_1.removeConnection)(channelId));
    store_1.store.dispatch((0, sdk_1.removeApprovedHost)(channelId));
    delete instance.state.connecting[channelId];
    if (engine) {
        // Remove matching permissions from controller
        var permissionsController = engine.context.PermissionController;
        if (permissionsController.getPermissions(channelId)) {
            permissionsController.revokeAllPermissions(channelId);
        }
    }
}
exports["default"] = removeChannel;
