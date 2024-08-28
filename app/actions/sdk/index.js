"use strict";
exports.__esModule = true;
exports.setConnected = exports.resetDappConnections = exports.removeDappConnection = exports.updateDappConnection = exports.resetApprovedHosts = exports.setApprovedHost = exports.removeApprovedHost = exports.resetConnections = exports.addConnection = exports.removeConnection = exports.updateConnection = exports.updateWC2Metadata = exports.disconnectAll = exports.ActionType = void 0;
var ActionType;
(function (ActionType) {
    ActionType["WC2_METADATA"] = "WC2_METADATA";
    ActionType["RESET_CONNECTIONS"] = "RESET_CONNECTIONS";
    ActionType["UPDATE_CONNECTION"] = "UPDATE_CONNECTION";
    ActionType["REMOVE_CONNECTION"] = "REMOVE_CONNECTION";
    ActionType["ADD_CONNECTION"] = "ADD_CONNECTION";
    ActionType["DISCONNECT_ALL"] = "DISCONNECT_ALL";
    ActionType["REMOVE_APPROVED_HOST"] = "REMOVE_APPROVWED_HOST";
    ActionType["SET_APPROVED_HOST"] = "SET_APPROVED_HOST";
    ActionType["RESET_APPROVED_HOSTS"] = "RESET_APPROVED_HOSTS";
    ActionType["SET_CONNECTED"] = "SET_CONNECTED";
    ActionType["UPDATE_DAPP_CONNECTION"] = "UPDATE_DAPP_CONNECTION";
    ActionType["REMOVE_DAPP_CONNECTION"] = "REMOVE_DAPP_CONNECTION";
    ActionType["RESET_DAPP_CONNECTIONS"] = "RESET_DAPP_CONNECTIONS";
})(ActionType = exports.ActionType || (exports.ActionType = {}));
var disconnectAll = function () { return ({
    type: ActionType.DISCONNECT_ALL
}); };
exports.disconnectAll = disconnectAll;
var updateWC2Metadata = function (metadata) { return ({
    type: ActionType.WC2_METADATA,
    metadata: metadata
}); };
exports.updateWC2Metadata = updateWC2Metadata;
var updateConnection = function (channelId, connection) { return ({
    type: ActionType.UPDATE_CONNECTION,
    channelId: channelId,
    connection: connection
}); };
exports.updateConnection = updateConnection;
var removeConnection = function (channelId) { return ({
    type: ActionType.REMOVE_CONNECTION,
    channelId: channelId
}); };
exports.removeConnection = removeConnection;
var addConnection = function (channelId, connection) { return ({
    type: ActionType.ADD_CONNECTION,
    channelId: channelId,
    connection: connection
}); };
exports.addConnection = addConnection;
var resetConnections = function (connections) { return ({
    type: ActionType.RESET_CONNECTIONS,
    connections: connections
}); };
exports.resetConnections = resetConnections;
var removeApprovedHost = function (channelId) { return ({
    type: ActionType.REMOVE_APPROVED_HOST,
    channelId: channelId
}); };
exports.removeApprovedHost = removeApprovedHost;
var setApprovedHost = function (channelId, validUntil) { return ({
    type: ActionType.SET_APPROVED_HOST,
    channelId: channelId,
    validUntil: validUntil
}); };
exports.setApprovedHost = setApprovedHost;
var resetApprovedHosts = function (approvedHosts) { return ({
    type: ActionType.RESET_APPROVED_HOSTS,
    approvedHosts: approvedHosts
}); };
exports.resetApprovedHosts = resetApprovedHosts;
var updateDappConnection = function (channelId, connection) { return ({
    type: ActionType.UPDATE_DAPP_CONNECTION,
    channelId: channelId,
    connection: connection
}); };
exports.updateDappConnection = updateDappConnection;
var removeDappConnection = function (channelId) { return ({
    type: ActionType.REMOVE_DAPP_CONNECTION,
    channelId: channelId
}); };
exports.removeDappConnection = removeDappConnection;
var resetDappConnections = function (connections) { return ({
    type: ActionType.RESET_DAPP_CONNECTIONS,
    connections: connections
}); };
exports.resetDappConnections = resetDappConnections;
var setConnected = function (channelId, connected) { return ({
    type: ActionType.SET_CONNECTED,
    channelId: channelId,
    connected: connected
}); };
exports.setConnected = setConnected;
