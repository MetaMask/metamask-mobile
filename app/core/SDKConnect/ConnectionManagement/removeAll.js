"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var sdk_1 = require("../../../../app/actions/sdk");
var store_1 = require("../../../../app/store");
function removeAll(instance) {
    return __awaiter(this, void 0, void 0, function () {
        var id, _c, _d, _i, id;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    for (id in instance.state.connections) {
                        instance.removeChannel({
                            channelId: id,
                            sendTerminate: true
                        });
                    }
                    _c = [];
                    return [4 /*yield*/, instance.loadDappConnections()];
                case 1:
                    for (_d in _e.sent())
                        _c.push(_d);
                    _i = 0;
                    _e.label = 2;
                case 2:
                    if (!(_i < _c.length)) return [3 /*break*/, 4];
                    id = _c[_i];
                    instance.removeChannel({
                        channelId: id,
                        sendTerminate: true
                    });
                    _e.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 2];
                case 4:
                    // Also remove approved hosts that may have been skipped.
                    instance.state.approvedHosts = {};
                    instance.state.disabledHosts = {};
                    instance.state.connections = {};
                    instance.state.dappConnections = {};
                    instance.state.connected = {};
                    instance.state.connecting = {};
                    instance.state.paused = false;
                    store_1.store.dispatch((0, sdk_1.resetConnections)({}));
                    store_1.store.dispatch((0, sdk_1.resetApprovedHosts)({}));
                    store_1.store.dispatch((0, sdk_1.resetDappConnections)({}));
                    return [2 /*return*/];
            }
        });
    });
}
exports["default"] = removeAll;
