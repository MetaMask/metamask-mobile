"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var Connection_1 = require("../Connection");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
function reconnect(_c) {
    var _d, _e;
    var channelId = _c.channelId, otherPublicKey = _c.otherPublicKey, initialConnection = _c.initialConnection, trigger = _c.trigger, updateKey = _c.updateKey, context = _c.context, instance = _c.instance;
    return __awaiter(this, void 0, void 0, function () {
        var existingConnection, currentOtherPublicKey, wasPaused, connecting, socketConnected, interruptReason, connected, ready, connection, afterConnected;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    existingConnection = instance.state.connected[channelId];
                    // Check if already connected
                    if (existingConnection === null || existingConnection === void 0 ? void 0 : existingConnection.remote.isReady()) {
                        DevLogger_1["default"].log("SDKConnect::reconnect[".concat(context, "] - already ready - ignore"));
                        if (trigger) {
                            instance.state.connected[channelId].setTrigger('deeplink');
                        }
                        instance.updateSDKLoadingState({ channelId: channelId, loading: false });
                        return [2 /*return*/];
                    }
                    if (instance.state.paused && updateKey) {
                        instance.state.connections[channelId].otherPublicKey = otherPublicKey;
                        currentOtherPublicKey = instance.state.connections[channelId].otherPublicKey;
                        if (currentOtherPublicKey !== otherPublicKey) {
                            console.warn("SDKConnect::reconnect[".concat(context, "] existing=").concat(existingConnection !== undefined, " - update otherPublicKey -  ").concat(currentOtherPublicKey, " --> ").concat(otherPublicKey));
                            if (existingConnection) {
                                existingConnection.remote.setOtherPublicKey(otherPublicKey);
                            }
                        }
                        else {
                            DevLogger_1["default"].log("SDKConnect::reconnect[".concat(context, "] - same otherPublicKey"));
                        }
                    }
                    // Update initial connection state
                    instance.state.connections[channelId].initialConnection = initialConnection;
                    wasPaused = existingConnection === null || existingConnection === void 0 ? void 0 : existingConnection.remote.isPaused();
                    // Make sure the connection has resumed from pause before reconnecting.
                    return [4 /*yield*/, (0, wait_util_1.waitForCondition)({
                            fn: function () { return !instance.state.paused; },
                            context: 'reconnect_from_pause'
                        })];
                case 1:
                    // Make sure the connection has resumed from pause before reconnecting.
                    _f.sent();
                    if (wasPaused) {
                        DevLogger_1["default"].log("SDKConnect::reconnect[".concat(context, "] - not paused anymore"));
                    }
                    connecting = instance.state.connecting[channelId] === true;
                    socketConnected = (_d = existingConnection === null || existingConnection === void 0 ? void 0 : existingConnection.remote.isConnected()) !== null && _d !== void 0 ? _d : false;
                    DevLogger_1["default"].log("SDKConnect::reconnect[".concat(context, "][").concat(trigger, "] - channel=").concat(channelId, " paused=").concat(instance.state.paused, " connecting=").concat(connecting, " socketConnected=").concat(socketConnected, " existingConnection=").concat(existingConnection !== undefined), otherPublicKey);
                    interruptReason = '';
                    if (connecting && trigger !== 'deeplink') {
                        // Prioritize deeplinks -- interrup other connection attempts.
                        interruptReason = 'already connecting';
                    }
                    else if (connecting && trigger === 'deeplink') {
                        // Keep comment for future reference in case android issue re-surface
                        // special case on android where the socket was not updated
                        // if (Platform.OS === 'android') {
                        //   interruptReason = 'already connecting';
                        // } else {
                        //   console.warn(`Priotity to deeplink - overwrite previous connection`);
                        //   instance.removeChannel(channelId, true);
                        // }
                        // issue can happen during dev because bundle takes too long to load via metro.
                        // should not happen but keeping it for reference / debug purpose.
                        console.warn("BUNDLE WARNING: Already connecting --- Priotity to deeplink");
                        // instance.removeChannel({ channelId, sendTerminate: true });
                    }
                    if (!instance.state.connections[channelId]) {
                        interruptReason = 'no connection';
                    }
                    if (interruptReason) {
                        DevLogger_1["default"].log("SDKConnect::reconnect - interrupting reason=".concat(interruptReason));
                        return [2 /*return*/];
                    }
                    if (existingConnection) {
                        connected = existingConnection === null || existingConnection === void 0 ? void 0 : existingConnection.remote.isConnected();
                        ready = existingConnection === null || existingConnection === void 0 ? void 0 : existingConnection.isReady;
                        if (trigger) {
                            instance.state.connected[channelId].setTrigger(trigger);
                            DevLogger_1["default"].log("SDKConnect::reconnect - connected=".concat(connected, " -- trigger updated to '").concat(trigger, "'"));
                            instance.updateSDKLoadingState({ channelId: channelId, loading: false });
                        }
                        if (ready) {
                            DevLogger_1["default"].log("SDKConnect::reconnect - already connected [ready=".concat(ready, "] -- ignoring"));
                            instance.updateSDKLoadingState({ channelId: channelId, loading: false });
                            return [2 /*return*/];
                        }
                        else if (connected) {
                            // disconnect socket before reconnecting to avoid room being full
                            DevLogger_1["default"].log("SDKConnect::reconnect - disconnecting socket before reconnecting");
                            existingConnection.remote.disconnect();
                        }
                    }
                    DevLogger_1["default"].log("SDKConnect::reconnect - starting reconnection channel=".concat(channelId));
                    connection = instance.state.connections[channelId];
                    DevLogger_1["default"].log("SDKConnect::reconnect - connection", connection);
                    instance.state.connecting[channelId] = true;
                    instance.state.connected[channelId] = new Connection_1.Connection(__assign(__assign({}, connection), { socketServerUrl: instance.state.socketServerUrl, otherPublicKey: otherPublicKey, reconnect: true, trigger: trigger, initialConnection: initialConnection, rpcQueueManager: instance.state.rpcqueueManager, navigation: instance.state.navigation, approveHost: instance._approveHost.bind(instance), disapprove: instance.disapproveChannel.bind(instance), getApprovedHosts: instance.getApprovedHosts.bind(instance), revalidate: instance.revalidateChannel.bind(instance), isApproved: instance.isApproved.bind(instance), updateOriginatorInfos: instance.updateOriginatorInfos.bind(instance), 
                        // eslint-disable-next-line @typescript-eslint/no-shadow
                        onTerminate: function (_c) {
                            var channelId = _c.channelId;
                            instance.removeChannel({ channelId: channelId });
                        } }));
                    instance.state.connected[channelId].connect({
                        withKeyExchange: true,
                        authorized: connection.originatorInfo !== undefined
                    });
                    instance.watchConnection(instance.state.connected[channelId]);
                    afterConnected = (_e = instance.state.connected[channelId].remote.isConnected()) !== null && _e !== void 0 ? _e : false;
                    instance.state.connecting[channelId] = !afterConnected; // If not connected, it means it's connecting.
                    return [2 /*return*/];
            }
        });
    });
}
exports["default"] = reconnect;
