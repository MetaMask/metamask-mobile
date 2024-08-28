"use strict";
exports.__esModule = true;
var initialState = {
    securityAlertResponse: undefined
};
var signatureRequestReducer = function (state, action) {
    if (state === void 0) { state = initialState; }
    if (action === void 0) { action = { type: 'NONE' }; }
    switch (action.type) {
        case 'SET_SIGNATURE_REQUEST_SECURITY_ALERT_RESPONSE':
            return {
                securityAlertResponse: action.securityAlertResponse
            };
        default:
            return state;
    }
};
exports["default"] = signatureRequestReducer;
