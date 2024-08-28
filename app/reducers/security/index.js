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
exports.initialState = void 0;
/* eslint-disable @typescript-eslint/default-param-last */
var security_1 = require("../../actions/security");
exports.initialState = {
    allowLoginWithRememberMe: false,
    automaticSecurityChecksEnabled: false,
    hasUserSelectedAutomaticSecurityCheckOption: false,
    isAutomaticSecurityChecksModalOpen: false,
    dataCollectionForMarketing: null,
    isNFTAutoDetectionModalViewed: false
};
var securityReducer = function (state, action) {
    if (state === void 0) { state = exports.initialState; }
    switch (action.type) {
        case security_1.ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME:
            return __assign(__assign({}, state), { allowLoginWithRememberMe: action.enabled });
        case security_1.ActionType.SET_AUTOMATIC_SECURITY_CHECKS:
            return __assign(__assign({}, state), { automaticSecurityChecksEnabled: action.enabled });
        case security_1.ActionType.USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION:
            return __assign(__assign({}, state), { hasUserSelectedAutomaticSecurityCheckOption: action.selected });
        case security_1.ActionType.SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN:
            return __assign(__assign({}, state), { isAutomaticSecurityChecksModalOpen: action.open });
        case security_1.ActionType.SET_NFT_AUTO_DETECTION_MODAL_OPEN:
            return __assign(__assign({}, state), { isNFTAutoDetectionModalViewed: action.open });
        case security_1.ActionType.SET_DATA_COLLECTION_FOR_MARKETING:
            return __assign(__assign({}, state), { dataCollectionForMarketing: action.enabled });
        default:
            return state;
    }
};
exports["default"] = securityReducer;
