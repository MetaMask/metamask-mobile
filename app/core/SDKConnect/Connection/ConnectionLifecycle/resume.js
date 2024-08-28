"use strict";
exports.__esModule = true;
var DevLogger_1 = require("../../utils/DevLogger");
function resume(_c) {
    var instance = _c.instance;
    DevLogger_1["default"].log("Connection::resume() id=".concat(instance.channelId));
    instance.remote.resume();
    instance.isResumed = true;
    instance.setLoading(false);
}
exports["default"] = resume;
