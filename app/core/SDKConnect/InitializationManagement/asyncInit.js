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
var store_1 = require("../../../store");
var Logger_1 = require("../../../util/Logger");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
var AppConstants_1 = require("../../../../app/core/AppConstants");
var asyncInit = function (_c) {
    var navigation = _c.navigation, instance = _c.instance, context = _c.context;
    return __awaiter(void 0, void 0, void 0, function () {
        var sdk, validConnections, validHosts, now, connectionsLength, approvedHostsLength, id, connInfo, sdkHostId, ttl;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    instance.state.navigation = navigation;
                    DevLogger_1["default"].log("SDKConnect::init()[".concat(context, "] - starting"));
                    // Ignore initial call to _handleAppState since it is first initialization.
                    instance.state.appState = 'active';
                    // When restarting from being killed, keyringController might be mistakenly restored on unlocked=true so we need to wait for it to get correct state.
                    return [4 /*yield*/, (0, wait_util_1.wait)(1000)];
                case 1:
                    // When restarting from being killed, keyringController might be mistakenly restored on unlocked=true so we need to wait for it to get correct state.
                    _f.sent();
                    DevLogger_1["default"].log("SDKConnect::init() - waited 1000ms - keep initializing");
                    sdk = store_1.store.getState().sdk;
                    validConnections = {};
                    validHosts = {};
                    try {
                        now = Date.now();
                        connectionsLength = Object.keys(sdk.connections).length;
                        approvedHostsLength = Object.keys(sdk.approvedHosts).length;
                        DevLogger_1["default"].log("SDKConnect::init() - connections length=".concat(connectionsLength, " approvedHosts length=").concat(approvedHostsLength));
                        for (id in sdk.connections) {
                            connInfo = sdk.connections[id];
                            sdkHostId = AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN + id;
                            ttl = ((_d = connInfo.validUntil) !== null && _d !== void 0 ? _d : 0) - now;
                            DevLogger_1["default"].log("Checking connection ".concat(id, " sdkHostId=").concat(sdkHostId, " TTL=").concat(ttl, " validUntil=").concat((_e = connInfo.validUntil) !== null && _e !== void 0 ? _e : 0, " hostValue:").concat(sdk.approvedHosts[sdkHostId], " now: ").concat(now), sdk.approvedHosts);
                            if (ttl > 0) {
                                DevLogger_1["default"].log("Connection ".concat(id, " / ").concat(sdkHostId, " is still valid, TTL: ").concat(ttl));
                                // Only keep connections that are not expired.
                                validConnections[id] = sdk.connections[id];
                                validHosts[sdkHostId] = sdk.approvedHosts[sdkHostId];
                            }
                            else {
                                // Remove expired connections
                                DevLogger_1["default"].log("SDKConnect::init() - removing expired connection ".concat(id, " ").concat(sdkHostId), connInfo);
                            }
                        }
                        DevLogger_1["default"].log("SDKConnect::init() - valid connections length=".concat(Object.keys(validConnections).length), validConnections);
                        instance.state.connections = validConnections;
                        instance.state.approvedHosts = validHosts;
                        instance.state.dappConnections = sdk.dappConnections;
                        // Update store with valid connection
                        store_1.store.dispatch((0, sdk_1.resetConnections)(validConnections));
                        store_1.store.dispatch((0, sdk_1.resetApprovedHosts)(validHosts));
                        // All connectectiions are disconnected on start
                        store_1.store.dispatch((0, sdk_1.disconnectAll)());
                        DevLogger_1["default"].log("SDKConnect::init() - done");
                        instance.state._initialized = true;
                    }
                    catch (err) {
                        Logger_1["default"].log(err, "SDKConnect::init() - error loading connections");
                    }
                    return [2 /*return*/];
            }
        });
    });
};
exports["default"] = asyncInit;
