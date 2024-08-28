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
exports.ExtendedControllerMessenger = void 0;
var base_controller_1 = require("@metamask/base-controller");
// eslint-disable-next-line import/prefer-default-export
var ExtendedControllerMessenger = /** @class */ (function (_super) {
    __extends(ExtendedControllerMessenger, _super);
    function ExtendedControllerMessenger() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ExtendedControllerMessenger.prototype.subscribeOnceIf = function (eventType, handler, criteria) {
        var _this = this;
        var internalHandler = (function () {
            var data = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                data[_i] = arguments[_i];
            }
            if (!criteria || criteria.apply(void 0, data)) {
                _this.tryUnsubscribe(eventType, internalHandler);
                handler.apply(void 0, data);
            }
        });
        this.subscribe(eventType, internalHandler);
        return internalHandler;
    };
    ExtendedControllerMessenger.prototype.tryUnsubscribe = function (eventType, handler) {
        if (!handler) {
            return;
        }
        try {
            this.unsubscribe(eventType, handler);
        }
        catch (e) {
            // Ignore
        }
    };
    return ExtendedControllerMessenger;
}(base_controller_1.ControllerMessenger));
exports.ExtendedControllerMessenger = ExtendedControllerMessenger;
