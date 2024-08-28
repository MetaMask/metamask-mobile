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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
exports.__esModule = true;
exports.initialState = void 0;
var sdk_1 = require("../../actions/sdk");
// sdk reducers
exports.initialState = {
    connections: {},
    approvedHosts: {},
    dappConnections: {},
    wc2Metadata: undefined
};
var sdkReducer = function (state, action) {
    var _c, _d, _e, _f, _g;
    if (state === void 0) { state = exports.initialState; }
    switch (action.type) {
        case sdk_1.ActionType.WC2_METADATA:
            return __assign(__assign({}, state), { wc2Metadata: action.metadata });
        case sdk_1.ActionType.DISCONNECT_ALL:
            // Set connected: false to all connections
            return __assign(__assign({}, state), { connections: Object.keys(state.connections).reduce(function (acc, channelId) {
                    var _c;
                    return (__assign(__assign({}, acc), (_c = {}, _c[channelId] = __assign(__assign({}, state.connections[channelId]), { connected: false }), _c)));
                }, {}) });
        case sdk_1.ActionType.UPDATE_CONNECTION:
            return __assign(__assign({}, state), { connections: __assign(__assign({}, state.connections), (_c = {}, _c[action.channelId] = action.connection, _c)) });
        case sdk_1.ActionType.REMOVE_CONNECTION: {
            var _h = state.connections, _j = action.channelId, _1 = _h[_j], connections = __rest(_h, [typeof _j === "symbol" ? _j : _j + ""]);
            return __assign(__assign({}, state), { connections: connections });
        }
        case sdk_1.ActionType.ADD_CONNECTION:
            return __assign(__assign({}, state), { connections: __assign(__assign({}, state.connections), (_d = {}, _d[action.channelId] = action.connection, _d)) });
        case sdk_1.ActionType.RESET_CONNECTIONS:
            return __assign(__assign({}, state), { connections: action.connections });
        case sdk_1.ActionType.SET_CONNECTED:
            if (!state.connections[action.channelId]) {
                return state;
            }
            return __assign(__assign({}, state), { connections: __assign(__assign({}, state.connections), (_e = {}, _e[action.channelId] = __assign(__assign({}, state.connections[action.channelId]), { connected: action.connected }), _e)) });
        case sdk_1.ActionType.REMOVE_APPROVED_HOST: {
            var _k = state.approvedHosts, _l = action.channelId, _2 = _k[_l], approvedHosts = __rest(_k, [typeof _l === "symbol" ? _l : _l + ""]);
            return __assign(__assign({}, state), { approvedHosts: approvedHosts });
        }
        case sdk_1.ActionType.SET_APPROVED_HOST:
            return __assign(__assign({}, state), { approvedHosts: __assign(__assign({}, state.approvedHosts), (_f = {}, _f[action.channelId] = action.validUntil, _f)) });
        case sdk_1.ActionType.UPDATE_DAPP_CONNECTION:
            return __assign(__assign({}, state), { dappConnections: __assign(__assign({}, state.dappConnections), (_g = {}, _g[action.channelId] = action.connection, _g)) });
        case sdk_1.ActionType.REMOVE_DAPP_CONNECTION: {
            var _m = state.dappConnections, _o = action.channelId, _3 = _m[_o], dappConnections = __rest(_m, [typeof _o === "symbol" ? _o : _o + ""]);
            return __assign(__assign({}, state), { dappConnections: dappConnections });
        }
        case sdk_1.ActionType.RESET_DAPP_CONNECTIONS:
            return __assign(__assign({}, state), { dappConnections: action.connections });
        default:
            return state;
    }
};
exports["default"] = sdkReducer;
