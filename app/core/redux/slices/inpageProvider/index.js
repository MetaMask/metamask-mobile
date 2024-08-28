"use strict";
exports.__esModule = true;
exports.networkIdWillUpdate = exports.networkIdUpdated = exports.initialState = exports.NETWORK_ID_LOADING = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
exports.NETWORK_ID_LOADING = 'loading';
exports.initialState = {
    networkId: exports.NETWORK_ID_LOADING
};
var name = 'inpageProvider';
var slice = (0, toolkit_1.createSlice)({
    name: name,
    initialState: exports.initialState,
    reducers: {
        /**
         * Updates the network ID.
         * @param state - The current state of the inpageProvider slice.
         * @param action - An action with the new network ID as payload.
         */
        networkIdUpdated: function (state, action) {
            state.networkId = action.payload;
        },
        /**
         * Sets the network ID to 'loading' indicating that a network ID update will happen soon.
         * @param state - The current state of the inpageProvider slice.
         */
        networkIdWillUpdate: function (state) {
            state.networkId = exports.NETWORK_ID_LOADING;
        }
    }
});
var actions = slice.actions, reducer = slice.reducer;
exports["default"] = reducer;
// Actions / action-creators
exports.networkIdUpdated = actions.networkIdUpdated, exports.networkIdWillUpdate = actions.networkIdWillUpdate;
