"use strict";
exports.__esModule = true;
var Logger_1 = require("../../../../util/Logger");
var sdk_communication_layer_1 = require("@metamask/sdk-communication-layer");
var DevLogger_1 = require("../../utils/DevLogger");
function disconnect(_c) {
    var terminate = _c.terminate, context = _c.context, instance = _c.instance;
    DevLogger_1["default"].log("Connection::disconnect() context=".concat(context, " id=").concat(instance.channelId, " terminate=").concat(terminate));
    instance.receivedClientsReady = false;
    if (terminate) {
        instance.remote
            .sendMessage({
            type: sdk_communication_layer_1.MessageType.TERMINATE
        })["catch"](function (err) {
            Logger_1["default"].log(err, "Connection failed to send terminate");
        });
    }
    instance.remote.disconnect();
}
exports["default"] = disconnect;
