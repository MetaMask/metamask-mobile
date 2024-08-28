"use strict";
exports.__esModule = true;
exports.RPCQueueManager = void 0;
var SDKConnectConstants_1 = require("./SDKConnectConstants");
var DevLogger_1 = require("./utils/DevLogger");
var RPCQueueManager = /** @class */ (function () {
    function RPCQueueManager() {
        this.rpcQueue = {};
    }
    RPCQueueManager.prototype.add = function (_c) {
        var id = _c.id, method = _c.method;
        DevLogger_1["default"].log("RPCQueueManager::add id=".concat(id, " method=").concat(method));
        this.rpcQueue[id] = method;
    };
    RPCQueueManager.prototype.reset = function () {
        var queuLength = Object.keys(this.rpcQueue).length;
        if (queuLength > 0) {
            console.warn("RPCQueueManager: ".concat(queuLength, " RPCs still in the queue"), this.rpcQueue);
        }
        this.rpcQueue = {};
    };
    RPCQueueManager.prototype.isEmpty = function () {
        return Object.keys(this.rpcQueue).length === 0;
    };
    /**
     * Check if the queue doesn't contains a redirectable RPC
     * if it does, we can't redirect the user to the app
     *
     * We also pass the current rpc method as a prameters because not all message are saved inside the rpcqueue.
     * For example metamask_getProviderState is sent directly to the backgroundBridge.
     */
    RPCQueueManager.prototype.canRedirect = function (_c) {
        var _this = this;
        var method = _c.method;
        var redirect = SDKConnectConstants_1.METHODS_TO_REDIRECT[method];
        Object.keys(this.rpcQueue).forEach(function (id) {
            var rpcMethod = _this.rpcQueue[id];
            if (SDKConnectConstants_1.METHODS_TO_REDIRECT[rpcMethod]) {
                return false;
            }
        });
        return redirect;
    };
    RPCQueueManager.prototype.remove = function (id) {
        delete this.rpcQueue[id];
    };
    RPCQueueManager.prototype.get = function () {
        return this.rpcQueue;
    };
    RPCQueueManager.prototype.getId = function (id) {
        var _c;
        return (_c = this.rpcQueue) === null || _c === void 0 ? void 0 : _c[id];
    };
    return RPCQueueManager;
}());
exports.RPCQueueManager = RPCQueueManager;
exports["default"] = RPCQueueManager;
