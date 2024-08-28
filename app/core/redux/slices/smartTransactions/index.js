"use strict";
exports.__esModule = true;
exports.updateOptInModalAppVersionSeen = exports.initialState = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
exports.initialState = {
    optInModalAppVersionSeen: null
};
var name = 'smartTransactions';
var slice = (0, toolkit_1.createSlice)({
    name: name,
    initialState: exports.initialState,
    reducers: {
        /**
         * Updates the the app version seen for the opt in modal.
         * @param state - The current state of the smartTransactions slice.
         * @param action - An action with the new app version seen as payload.
         */
        updateOptInModalAppVersionSeen: function (state, action) {
            state.optInModalAppVersionSeen = action.payload;
        }
    }
});
var actions = slice.actions, reducer = slice.reducer;
exports["default"] = reducer;
// Actions / action-creators
exports.updateOptInModalAppVersionSeen = actions.updateOptInModalAppVersionSeen;
