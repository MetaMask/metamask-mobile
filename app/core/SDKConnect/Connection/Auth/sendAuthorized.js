"use strict";
exports.__esModule = true;
var sdk_communication_layer_1 = require("@metamask/sdk-communication-layer");
var Logger_1 = require("../../../../util/Logger");
function sendAuthorized(_c) {
    var force = _c.force, instance = _c.instance;
    if (instance.authorizedSent && force !== true) {
        // Prevent double sending authorized event.
        return;
    }
    instance.remote
        .sendMessage({ type: sdk_communication_layer_1.MessageType.AUTHORIZED })
        .then(function () {
        instance.authorizedSent = true;
    })["catch"](function (err) {
        Logger_1["default"].log(err, "sendAuthorized() failed to send 'authorized'");
    });
}
exports["default"] = sendAuthorized;
