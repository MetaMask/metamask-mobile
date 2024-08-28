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
var browserScripts_1 = require("../../util/browserScripts");
// eslint-disable-next-line import/no-nodejs-modules, import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
var EventEmitter = require('events').EventEmitter;
/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage for in-app browser
 */
var Port = /** @class */ (function (_super) {
    __extends(Port, _super);
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function Port(browserWindow, isMainFrame) {
        var _this = _super.call(this) || this;
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _this.postMessage = function (msg, origin) {
            var _c;
            if (origin === void 0) { origin = '*'; }
            var js = _this._isMainFrame
                ? (0, browserScripts_1.JS_POST_MESSAGE_TO_PROVIDER)(msg, origin)
                : (0, browserScripts_1.JS_IFRAME_POST_MESSAGE_TO_PROVIDER)(msg, origin);
            (_c = _this._window) === null || _c === void 0 ? void 0 : _c.injectJavaScript(js);
        };
        _this._window = browserWindow;
        _this._isMainFrame = isMainFrame;
        return _this;
    }
    return Port;
}(EventEmitter));
exports["default"] = Port;
