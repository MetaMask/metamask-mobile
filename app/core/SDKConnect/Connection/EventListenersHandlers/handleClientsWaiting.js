"use strict";
exports.__esModule = true;
var DevLogger_1 = require("../../utils/DevLogger");
function handleClientsWaiting(_c) {
    var instance = _c.instance;
    return function () {
        DevLogger_1["default"].log("handleClientsWaiting:: dapp not connected", instance.channelId);
        instance.setLoading(false);
        // TODO - validate connection behavior if disconnect or maintain. Keeping it for now
        // instance.disconnect({ terminate: false, context: 'CLIENTS_WAITING' });
    };
}
exports["default"] = handleClientsWaiting;
