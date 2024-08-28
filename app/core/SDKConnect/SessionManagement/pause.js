"use strict";
exports.__esModule = true;
var sdk_1 = require("../../../../app/actions/sdk");
var DevLogger_1 = require("../utils/DevLogger");
var store_1 = require("../../../../app/store");
function pause(instance) {
    if (instance.state.paused)
        return;
    for (var id in instance.state.connected) {
        if (!instance.state.connected[id].remote.isReady()) {
            DevLogger_1["default"].log("SDKConnect::pause - SKIP - non active connection ".concat(id));
            continue;
        }
        DevLogger_1["default"].log("SDKConnect::pause - pausing ".concat(id));
        instance.state.connected[id].pause();
        // check for paused status?
        DevLogger_1["default"].log("SDKConnect::pause - done - paused=".concat(instance.state.connected[id].remote.isPaused()));
    }
    instance.state.paused = true;
    instance.state.connecting = {};
    // Set disconnected status for all connections
    store_1.store.dispatch((0, sdk_1.disconnectAll)());
}
exports["default"] = pause;
