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
var AppConstants_1 = require("../../../../app/core/AppConstants");
var Logger_1 = require("../../../util/Logger");
var DevLogger_1 = require("../utils/DevLogger");
function reconnectAll(instance) {
    return __awaiter(this, void 0, void 0, function () {
        var channelIds;
        return __generator(this, function (_c) {
            DevLogger_1["default"].log("SDKConnect::reconnectAll paused=".concat(instance.state.paused, " reconnected=").concat(instance.state.reconnected));
            if (instance.state.reconnected) {
                DevLogger_1["default"].log("SDKConnect::reconnectAll - already reconnected");
                return [2 /*return*/];
            }
            channelIds = Object.keys(instance.state.connections);
            channelIds.forEach(function (channelId) {
                // Only reconnects to type 'qrcode' connections.
                var connection = instance.state.connections[channelId];
                DevLogger_1["default"].log("SDKConnect::reconnectAll - reconnecting to ".concat(channelId, " origin=").concat(connection.origin, " relayPersistence=").concat(connection.relayPersistence, " protocolVersion=").concat(connection.protocolVersion));
                if (connection.origin === AppConstants_1["default"].DEEPLINKS.ORIGIN_QR_CODE ||
                    connection.relayPersistence) {
                    instance
                        .reconnect({
                        channelId: channelId,
                        protocolVersion: connection.protocolVersion,
                        otherPublicKey: instance.state.connections[channelId].otherPublicKey,
                        initialConnection: false,
                        trigger: 'reconnect',
                        context: 'reconnectAll'
                    })["catch"](function (err) {
                        Logger_1["default"].log(err, "SDKConnect::reconnectAll error reconnecting to ".concat(channelId));
                    });
                }
            });
            instance.state.reconnected = true;
            DevLogger_1["default"].log("SDKConnect::reconnectAll - channelIds=".concat(channelIds.length, " - done"));
            return [2 /*return*/];
        });
    });
}
exports["default"] = reconnectAll;
