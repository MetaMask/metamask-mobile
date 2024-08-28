"use strict";
exports.__esModule = true;
exports.BatchRPCManager = void 0;
var DevLogger_1 = require("./utils/DevLogger");
var BatchRPCManager = /** @class */ (function () {
    // Each rpc method depends on the previous one, so we need to keep track of the order
    // As soon as an error occur in any of the rpcs, we need to cancel the whole chain
    function BatchRPCManager(channelId) {
        this.rpcChain = {}; // initial rpc method id as key and list of linked rpcs as value
        this.channelId = channelId;
    }
    BatchRPCManager.prototype.add = function (_c) {
        var id = _c.id, rpcs = _c.rpcs;
        DevLogger_1["default"].log("BatchRPCManager::add id=".concat(id, " rpcs="), rpcs);
        this.rpcChain[id] = rpcs;
    };
    BatchRPCManager.prototype.addResponse = function (_c) {
        var id = _c.id, index = _c.index, response = _c.response;
        if (this.rpcChain[id]) {
            this.rpcChain[id][index].response = response;
        }
        else {
            throw new Error("RPC method ".concat(id, " not found in chain"));
        }
    };
    BatchRPCManager.prototype.reset = function () {
        this.rpcChain = {};
    };
    BatchRPCManager.prototype.remove = function (id) {
        delete this.rpcChain[id];
    };
    BatchRPCManager.prototype.getAll = function () {
        return this.rpcChain;
    };
    BatchRPCManager.prototype.getById = function (id) {
        if (id === null || id === void 0 ? void 0 : id.includes('_')) {
            // id format is baseId_index
            // extract index from base id
            var _c = id.split('_'), baseId = _c[0], index = _c[1];
            if (this.rpcChain[baseId]) {
                return {
                    baseId: baseId,
                    rpcs: this.rpcChain[baseId],
                    index: parseInt(index, 10)
                };
            }
        }
        return undefined;
    };
    return BatchRPCManager;
}());
exports.BatchRPCManager = BatchRPCManager;
exports["default"] = BatchRPCManager;
