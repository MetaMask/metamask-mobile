"use strict";
exports.__esModule = true;
exports.selectTransactionMetrics = exports.updateTransactionMetrics = exports.initialState = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var lodash_1 = require("lodash");
exports.initialState = {
    metricsByTransactionId: {}
};
var name = 'transactionMetrics';
var slice = (0, toolkit_1.createSlice)({
    name: name,
    initialState: exports.initialState,
    reducers: {
        updateTransactionMetrics: function (state, action) {
            var _c = action.payload, transactionId = _c.transactionId, params = _c.params;
            if (state.metricsByTransactionId[transactionId] === undefined) {
                state.metricsByTransactionId[transactionId] = {
                    properties: {},
                    sensitiveProperties: {}
                };
            }
            state.metricsByTransactionId[transactionId] = (0, lodash_1.merge)(state.metricsByTransactionId[transactionId], params);
        }
    }
});
var actions = slice.actions, reducer = slice.reducer;
exports["default"] = reducer;
// Actions
exports.updateTransactionMetrics = actions.updateTransactionMetrics;
// Selectors
var selectTransactionMetrics = function (state) {
    return state[name].metricsByTransactionId;
};
exports.selectTransactionMetrics = selectTransactionMetrics;
