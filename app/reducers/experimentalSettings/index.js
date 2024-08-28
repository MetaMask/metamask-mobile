"use strict";
/* eslint-disable @typescript-eslint/default-param-last */
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
var experimental_1 = require("../../actions/experimental");
var initialState = {
    securityAlertsEnabled: true
};
var experimentalSettingsReducer = function (state, action) {
    if (state === void 0) { state = initialState; }
    switch (action.type) {
        case experimental_1.ActionType.SET_SECURITY_ALERTS_ENABLED:
            return __assign(__assign({}, state), { securityAlertsEnabled: action.securityAlertsEnabled });
        default:
            return state;
    }
};
exports["default"] = experimentalSettingsReducer;
