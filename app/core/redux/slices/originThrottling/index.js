"use strict";
exports.__esModule = true;
exports.selectIsOriginBlockedForRPCRequests = exports.resetOriginSpamState = exports.onRPCRequestRejectedByUser = exports.initialState = exports.REJECTION_THRESHOLD_IN_MS = exports.NUMBER_OF_REJECTIONS_THRESHOLD = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
exports.NUMBER_OF_REJECTIONS_THRESHOLD = 3;
exports.REJECTION_THRESHOLD_IN_MS = 30000;
var BLOCKING_THRESHOLD_IN_MS = 60000;
exports.initialState = {
    origins: {}
};
var name = 'originThrottling';
var slice = (0, toolkit_1.createSlice)({
    name: name,
    initialState: exports.initialState,
    reducers: {
        onRPCRequestRejectedByUser: function (state, action) {
            var origin = action.payload;
            var currentState = state.origins[origin] || {
                rejections: 0,
                lastRejection: 0
            };
            var currentTime = Date.now();
            var newRejections = currentState.rejections;
            var isUnderThreshold = currentTime - currentState.lastRejection < exports.REJECTION_THRESHOLD_IN_MS;
            newRejections = isUnderThreshold ? newRejections + 1 : 1;
            state.origins[origin] = {
                rejections: newRejections,
                lastRejection: currentTime
            };
        },
        resetOriginSpamState: function (state, action) {
            var origin = action.payload;
            delete state.origins[origin];
        }
    }
});
// Actions
var actions = slice.actions, reducer = slice.reducer;
exports["default"] = reducer;
exports.onRPCRequestRejectedByUser = actions.onRPCRequestRejectedByUser, exports.resetOriginSpamState = actions.resetOriginSpamState;
// Selectors
var selectOriginState = function (state, origin) {
    return state[name].origins[origin];
};
var selectIsOriginBlockedForRPCRequests = function (state, origin) {
    var originState = selectOriginState(state, origin);
    if (!originState) {
        return false;
    }
    var currentTime = Date.now();
    var rejections = originState.rejections, lastRejection = originState.lastRejection;
    var isWithinOneMinute = currentTime - lastRejection <= BLOCKING_THRESHOLD_IN_MS;
    return rejections >= exports.NUMBER_OF_REJECTIONS_THRESHOLD && isWithinOneMinute;
};
exports.selectIsOriginBlockedForRPCRequests = selectIsOriginBlockedForRPCRequests;
