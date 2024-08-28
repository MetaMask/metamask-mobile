"use strict";
exports.__esModule = true;
var AppConstants_1 = require("../../../AppConstants");
var DevLogger_1 = require("../../utils/DevLogger");
function handleClientsDisconnected(_c) {
    var instance = _c.instance, disapprove = _c.disapprove;
    return function () {
        instance.setLoading(false);
        DevLogger_1["default"].log("Connection::CLIENTS_DISCONNECTED id=".concat(instance.channelId, " paused=").concat(instance.remote.isPaused(), " ready=").concat(instance.isReady, " origin=").concat(instance.origin));
        // Disapprove a given host everytime there is a disconnection to prevent hijacking.
        if (!instance.remote.isPaused()) {
            // don't disapprove on deeplink
            if (instance.origin !== AppConstants_1["default"].DEEPLINKS.ORIGIN_DEEPLINK) {
                disapprove(instance.channelId);
            }
            instance.initialConnection = false;
            instance.otps = undefined;
        }
        // detect interruption of connection (can happen on mobile browser ios) - We need to warm the user to redo the connection.
        if (!instance.receivedClientsReady && !instance.remote.isPaused()) {
            // Only disconnect on deeplinks
            if (instance.origin === AppConstants_1["default"].DEEPLINKS.ORIGIN_DEEPLINK) {
                // SOCKET CONNECTION WAS INTERRUPTED
                console.warn("Connected::clients_disconnected dApp connection disconnected before ready");
                // Terminate to prevent bypassing initial approval when auto-reconnect on deeplink.
                instance.disconnect({
                    terminate: true,
                    context: 'CLIENTS_DISCONNECTED'
                });
            }
        }
        instance.receivedDisconnect = true;
        if (!instance.remote.hasRelayPersistence()) {
            // Reset connection state
            instance.isReady = false;
            instance.approvalPromise = undefined;
            instance.receivedClientsReady = false;
            DevLogger_1["default"].log("Connection::CLIENTS_DISCONNECTED id=".concat(instance.channelId, " switch isReady ==> false"));
        }
    };
}
exports["default"] = handleClientsDisconnected;
