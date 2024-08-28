"use strict";
exports.__esModule = true;
exports.SecurityAlertSource = exports.ResultType = exports.Reason = void 0;
var Reason;
(function (Reason) {
    Reason["approvalFarming"] = "approval_farming";
    Reason["blurFarming"] = "blur_farming";
    Reason["maliciousDomain"] = "malicious_domain";
    Reason["other"] = "other";
    Reason["permitFarming"] = "permit_farming";
    Reason["rawNativeTokenTransfer"] = "raw_native_token_transfer";
    Reason["rawSignatureFarming"] = "raw_signature_farming";
    Reason["seaportFarming"] = "seaport_farming";
    Reason["setApprovalForAllFarming"] = "set_approval_for_all_farming";
    Reason["tradeOrderFarming"] = "trade_order_farming";
    Reason["transferFarming"] = "transfer_farming";
    Reason["transferFromFarming"] = "transfer_from_farming";
    // MetaMask defined reasons
    Reason["failed"] = "failed";
    Reason["notApplicable"] = "not_applicable";
    Reason["requestInProgress"] = "request_in_progress";
})(Reason = exports.Reason || (exports.Reason = {}));
var ResultType;
(function (ResultType) {
    ResultType["Benign"] = "Benign";
    ResultType["Malicious"] = "Malicious";
    ResultType["Warning"] = "Warning";
    // MetaMask defined result types
    ResultType["Failed"] = "Failed";
    ResultType["RequestInProgress"] = "RequestInProgress";
})(ResultType = exports.ResultType || (exports.ResultType = {}));
var SecurityAlertSource;
(function (SecurityAlertSource) {
    /** Validation performed remotely using the Security Alerts API. */
    SecurityAlertSource["API"] = "api";
    /** Validation performed locally using the PPOM. */
    SecurityAlertSource["Local"] = "local";
})(SecurityAlertSource = exports.SecurityAlertSource || (exports.SecurityAlertSource = {}));
