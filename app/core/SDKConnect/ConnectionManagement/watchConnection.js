"use strict";
exports.__esModule = true;
var sdk_communication_layer_1 = require("@metamask/sdk-communication-layer");
var sdk_1 = require("../../../../app/actions/sdk");
var store_1 = require("../../../../app/store");
var Logger_1 = require("../../../util/Logger");
var AppConstants_1 = require("../../AppConstants");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var DevLogger_1 = require("../utils/DevLogger");
function watchConnection(connection, instance) {
    connection.remote.on(sdk_communication_layer_1.EventType.CONNECTION_STATUS, function (connectionStatus) {
        if (connectionStatus === sdk_communication_layer_1.ConnectionStatus.TERMINATED) {
            instance.removeChannel({
                channelId: connection.channelId,
                sendTerminate: false
            });
            if (instance.state.connections[connection.channelId]) {
                instance.state.connections[connection.channelId].connected = false;
            }
        }
        else if (connectionStatus === sdk_communication_layer_1.ConnectionStatus.DISCONNECTED) {
            instance.updateSDKLoadingState({
                channelId: connection.channelId,
                loading: false
            });
            if (instance.state.connections[connection.channelId]) {
                instance.state.connections[connection.channelId].connected = false;
            }
        }
        else if (connectionStatus === sdk_communication_layer_1.ConnectionStatus.WAITING) {
            if (instance.state.connections[connection.channelId]) {
                instance.state.connections[connection.channelId].connected = false;
            }
        }
        store_1.store.dispatch((0, sdk_1.resetConnections)(instance.state.connections));
        DevLogger_1["default"].log("SDKConnect::watchConnection CONNECTION_STATUS ".concat(connection.channelId, " ").concat(connectionStatus));
    });
    connection.remote.on(sdk_communication_layer_1.EventType.CHANNEL_PERSISTENCE, function () {
        DevLogger_1["default"].log("SDKConnect::watchConnection CHANNEL_PERSISTENCE ".concat(connection.channelId));
        if (instance.state.connections[connection.channelId]) {
            instance.state.connections[connection.channelId].relayPersistence = true;
            store_1.store.dispatch((0, sdk_1.resetConnections)(instance.state.connections));
        }
    });
    connection.remote.on(sdk_communication_layer_1.EventType.CLIENTS_DISCONNECTED, function () {
        var host = AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN + connection.channelId;
        // Prevent disabled connection ( if user chose do not remember session )
        var isDisabled = instance.state.disabledHosts[host]; // should be 0 when disabled.
        DevLogger_1["default"].log("SDKConnect::watchConnection CLIENTS_DISCONNECTED channel=".concat(connection.channelId, " origin=").concat(connection.origin, " isDisabled=").concat(isDisabled));
        // update initialConnection state
        if (instance.state.connections[connection.channelId]) {
            instance.state.connections[connection.channelId].initialConnection =
                false;
        }
        if (isDisabled !== undefined) {
            instance
                .updateSDKLoadingState({
                channelId: connection.channelId,
                loading: false
            })["catch"](function (err) {
                Logger_1["default"].log(err, "SDKConnect::watchConnection can't update SDK loading state");
            });
            // Force terminate connection since it was disabled (do not remember)
            instance.removeChannel({
                channelId: connection.channelId,
                sendTerminate: true
            });
        }
    });
    connection.on(SDKConnectConstants_1.CONNECTION_LOADING_EVENT, function (event) {
        var channelId = connection.channelId;
        var loading = event.loading;
        instance.updateSDKLoadingState({ channelId: channelId, loading: loading })["catch"](function (err) {
            Logger_1["default"].log(err, "SDKConnect::watchConnection can't update SDK loading state");
        });
    });
}
exports["default"] = watchConnection;
