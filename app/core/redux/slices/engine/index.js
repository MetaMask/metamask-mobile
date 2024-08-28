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
exports.__esModule = true;
exports.counter = exports.updateBgState = exports.initBgState = void 0;
var lodash_1 = require("lodash");
var Engine_1 = require("../../../Engine");
var toolkit_1 = require("@reduxjs/toolkit");
var initialState = {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    backgroundState: {}
};
var legacyControllers = ['TransactionController'];
// Create an action to initialize the background state
exports.initBgState = (0, toolkit_1.createAction)('INIT_BG_STATE');
// Create an action to update the background state
exports.updateBgState = (0, toolkit_1.createAction)('UPDATE_BG_STATE', function (key) { return ({
    payload: key
}); });
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.counter = {};
var engineReducer = function (
// eslint-disable-next-line @typescript-eslint/default-param-last
state, 
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
action) {
    var _c;
    if (state === void 0) { state = initialState; }
    switch (action.type) {
        case exports.initBgState.type: {
            return { backgroundState: Engine_1["default"].state };
        }
        case exports.updateBgState.type: {
            var newState = __assign({}, state);
            if (action.payload) {
                var newControllerState = Engine_1["default"].state[action.payload.key];
                // The BaseControllerV1 controllers modify the original state object on update,
                // rather than replacing it as done in BaseControllerV2.
                // This introduces two issues:
                // - Memoized selectors do not fire on nested objects since the references don't change.
                // - Deep comparison selectors do not fire since the cached objects are references to the original
                //  state object which has been mutated.
                // This is resolved by doing a deep clone in this scenario to force an entirely new object.
                newState.backgroundState[(_c = action.payload) === null || _c === void 0 ? void 0 : _c.key] =
                    legacyControllers.includes(action.payload.key)
                        ? (0, lodash_1.cloneDeep)(newControllerState)
                        : newControllerState;
            }
            return newState;
        }
        default:
            return state;
    }
};
exports["default"] = engineReducer;
