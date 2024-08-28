"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var react_native_1 = require("react-native");
var sdk_communication_layer_1 = require("@metamask/sdk-communication-layer");
var AndroidSDKEventHandler = /** @class */ (function (_super) {
    __extends(AndroidSDKEventHandler, _super);
    function AndroidSDKEventHandler() {
        return _super.call(this, react_native_1.NativeModules.RCTDeviceEventEmitter) || this;
    }
    AndroidSDKEventHandler.prototype.onMessageReceived = function (callback) {
        return this.addListener(sdk_communication_layer_1.EventType.MESSAGE, function (message) {
            callback(message);
        });
    };
    AndroidSDKEventHandler.prototype.onClientsConnected = function (callback) {
        return this.addListener(sdk_communication_layer_1.EventType.CLIENTS_CONNECTED, function (clientInfo) {
            callback(clientInfo);
        });
    };
    AndroidSDKEventHandler.prototype.onClientsDisconnected = function (callback) {
        return this.addListener(sdk_communication_layer_1.EventType.CLIENTS_DISCONNECTED, function (id) {
            callback(id);
        });
    };
    return AndroidSDKEventHandler;
}(react_native_1.NativeEventEmitter));
exports["default"] = AndroidSDKEventHandler;
