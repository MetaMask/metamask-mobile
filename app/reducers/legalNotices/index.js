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
exports.shouldShowNewPrivacyToastSelector = exports.storePrivacyPolicyClickedOrClosed = exports.storePrivacyPolicyShownDate = exports.isPastPrivacyPolicyDate = void 0;
var types_1 = require("./types");
var currentDate = new Date(Date.now());
var newPrivacyPolicyDate = new Date('2024-06-18T12:00:00Z');
exports.isPastPrivacyPolicyDate = currentDate >= newPrivacyPolicyDate;
var initialState = {
    newPrivacyPolicyToastClickedOrClosed: false,
    newPrivacyPolicyToastShownDate: null
};
var storePrivacyPolicyShownDate = function (timestamp) { return ({
    type: types_1["default"].STORE_PRIVACY_POLICY_SHOWN_DATE,
    payload: timestamp
}); };
exports.storePrivacyPolicyShownDate = storePrivacyPolicyShownDate;
var storePrivacyPolicyClickedOrClosed = function () { return ({
    type: types_1["default"].STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED
}); };
exports.storePrivacyPolicyClickedOrClosed = storePrivacyPolicyClickedOrClosed;
var shouldShowNewPrivacyToastSelector = function (state) {
    var _c = state.legalNotices, newPrivacyPolicyToastShownDate = _c.newPrivacyPolicyToastShownDate, newPrivacyPolicyToastClickedOrClosed = _c.newPrivacyPolicyToastClickedOrClosed;
    if (newPrivacyPolicyToastClickedOrClosed)
        return false;
    var shownDate = new Date(newPrivacyPolicyToastShownDate);
    var oneDayInMilliseconds = 24 * 60 * 60 * 1000;
    var isRecent = currentDate.getTime() - shownDate.getTime() < oneDayInMilliseconds;
    return (currentDate.getTime() >= newPrivacyPolicyDate.getTime() &&
        (!newPrivacyPolicyToastShownDate ||
            (isRecent && !newPrivacyPolicyToastClickedOrClosed)));
};
exports.shouldShowNewPrivacyToastSelector = shouldShowNewPrivacyToastSelector;
var legalNoticesReducer = function (state, action) {
    if (state === void 0) { state = initialState; }
    if (action === void 0) { action = {
        type: '',
        newPrivacyPolicyToastShownDate: false,
        payload: 0
    }; }
    switch (action.type) {
        case types_1["default"].STORE_PRIVACY_POLICY_SHOWN_DATE: {
            if (state.newPrivacyPolicyToastShownDate !== null) {
                return state;
            }
            return __assign(__assign({}, state), { newPrivacyPolicyToastShownDate: action.payload });
        }
        case types_1["default"].STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED: {
            return __assign(__assign({}, state), { newPrivacyPolicyToastClickedOrClosed: true });
        }
        default:
            return state;
    }
};
exports["default"] = legalNoticesReducer;
