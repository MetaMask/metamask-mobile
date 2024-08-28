"use strict";
exports.__esModule = true;
/**
 * Clears transaction object completely
 */
function setSignatureRequestSecurityAlertResponse(securityAlertResponse) {
    return {
        type: 'SET_SIGNATURE_REQUEST_SECURITY_ALERT_RESPONSE',
        securityAlertResponse: securityAlertResponse
    };
}
exports["default"] = setSignatureRequestSecurityAlertResponse;
