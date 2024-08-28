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
exports.getCurrentBottomNavRoute = exports.getCurrentRoute = exports.SET_CURRENT_BOTTOM_NAV_ROUTE = exports.SET_CURRENT_ROUTE = void 0;
/**
 * Constants
 */
exports.SET_CURRENT_ROUTE = 'SET_CURRENT_ROUTE';
exports.SET_CURRENT_BOTTOM_NAV_ROUTE = 'SET_CURRENT_TAB_BAR_ROUTE';
var initialState = {
    currentRoute: 'WalletView',
    currentBottomNavRoute: 'Wallet'
};
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var navigationReducer = function (state, action) {
    if (state === void 0) { state = initialState; }
    if (action === void 0) { action = {}; }
    switch (action.type) {
        case exports.SET_CURRENT_ROUTE:
            return __assign(__assign({}, state), { currentRoute: action.payload.route });
        case exports.SET_CURRENT_BOTTOM_NAV_ROUTE:
            return __assign(__assign({}, state), { currentBottomNavRoute: action.payload.route });
        default:
            return state;
    }
};
/**
 * Selectors
 */
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var getCurrentRoute = function (state) { return state.navigation.currentRoute; };
exports.getCurrentRoute = getCurrentRoute;
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var getCurrentBottomNavRoute = function (state) {
    return state.navigation.currentBottomNavRoute;
};
exports.getCurrentBottomNavRoute = getCurrentBottomNavRoute;
exports["default"] = navigationReducer;
