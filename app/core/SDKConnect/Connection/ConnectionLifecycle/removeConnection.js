"use strict";
exports.__esModule = true;
var DevLogger_1 = require("../../utils/DevLogger");
function removeConnection(_c) {
    var _d;
    var terminate = _c.terminate, context = _c.context, instance = _c.instance;
    instance.isReady = false;
    instance.lastAuthorized = 0;
    instance.authorizedSent = false;
    DevLogger_1["default"].log("Connection::removeConnection() context=".concat(context, " id=").concat(instance.channelId));
    instance.disapprove(instance.channelId);
    instance.disconnect({ terminate: terminate, context: 'Connection::removeConnection' });
    (_d = instance.backgroundBridge) === null || _d === void 0 ? void 0 : _d.onDisconnect();
    instance.approvalPromise = undefined;
    instance.setLoading(false);
}
exports["default"] = removeConnection;
