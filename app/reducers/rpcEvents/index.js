"use strict";
/**
 * This reducer to used to record the lifecycle stage from RPC calls so that UI can subscribe to it and display or change UI behaviour corresponding based on that stage information.
 *
 * the current available stage has been defined in RPCStageTypes enum, please extend it if you need more stages.
 *
 * Some similar RPC calls will be grouped into the same event group, for example, eth_sign, personal_sign, eth_signTypedData, eth_signTypedData_v3,
 * eth_signTypedData_v4 will be grouped into signingEvent group so that the UI can handle all similar RPC calls in the same way. Please refer to rpcToEventGroupMap for more details.
 *
 * rpcToEventGroupMap will be also used by RPCMiddleware to check whether RPC is whitelisted to track the event stage.
 * if you want to track proticular RPC event stage which is not in whitelist, please add it to rpcToEventGroupMap.
 * if your RPC didn't belong to any event group, just use RPC name as event group name for that RPC. (**Causion**: please make sure the RPC name is unique)
 */
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
exports.__esModule = true;
exports.RPCStageTypes = exports.isWhitelistedRPC = void 0;
var rpcEvents_1 = require("../../actions/rpcEvents");
/**
 * Mapping of RPC name to supported event group name
 */
var rpcToEventGroupMap = new Map([
    ['eth_sign', 'signingEvent'],
    ['personal_sign', 'signingEvent'],
    ['eth_signTypedData', 'signingEvent'],
    ['eth_signTypedData_v3', 'signingEvent'],
    ['eth_signTypedData_v4', 'signingEvent'],
]);
/**
 * check if the rpcName is whitelisted to track the event stage.
 * @param {string} rpcName - the rpc name which fires the event
 * @returns {boolean} - true if the rpcName is whitelisted
 */
var isWhitelistedRPC = function (rpcName) {
    return rpcToEventGroupMap.has(rpcName);
};
exports.isWhitelistedRPC = isWhitelistedRPC;
/**
 * Deference stage in RPC flow
 */
var RPCStageTypes;
(function (RPCStageTypes) {
    RPCStageTypes["IDLE"] = "idle";
    RPCStageTypes["REQUEST_SEND"] = "request_send";
    RPCStageTypes["COMPLETE"] = "complete";
    RPCStageTypes["ERROR"] = "error";
})(RPCStageTypes = exports.RPCStageTypes || (exports.RPCStageTypes = {}));
/**
 * Initial state of the RPC event flow
 */
var initialState = {
    signingEvent: {
        eventStage: RPCStageTypes.IDLE,
        rpcName: ''
    }
};
/**
 * Reducer to set the RPC event stage in store
 * @param {iRPCFlowStage} state - the state of the RPC event flow, default to initialState
 * @param {iEventAction} action - the action object contain type and payload to change state.
 * @returns {iRPCFlowStage} - the new state of the sign message flow
 */
var signMessageReducer = function (state, action) {
    var _c, _d, _e;
    if (state === void 0) { state = initialState; }
    if (action === void 0) { action = {
        type: '',
        rpcName: ''
    }; }
    var eventGroup = rpcToEventGroupMap.get(action.rpcName);
    if (!eventGroup || !state[eventGroup]) {
        return state;
    }
    switch (action.type) {
        case rpcEvents_1.ActionType.SET_EVENT_STAGE:
            return __assign(__assign({}, state), (_c = {}, _c[eventGroup] = {
                eventStage: action.eventStage,
                rpcName: action.rpcName,
                error: undefined
            }, _c));
        case rpcEvents_1.ActionType.RESET_EVENT_STATE:
            return __assign(__assign({}, state), (_d = {}, _d[eventGroup] = {
                eventStage: RPCStageTypes.IDLE,
                rpcName: '',
                error: undefined
            }, _d));
        case rpcEvents_1.ActionType.SET_EVENT_ERROR:
            return __assign(__assign({}, state), (_e = {}, _e[eventGroup] = {
                eventStage: RPCStageTypes.ERROR,
                rpcName: action.rpcName,
                error: action.error
            }, _e));
        default:
            return state;
    }
};
exports["default"] = signMessageReducer;
