"use strict";
exports.__esModule = true;
function pause(_c) {
    var instance = _c.instance;
    instance.remote.pause();
    instance.isResumed = false;
}
exports["default"] = pause;
