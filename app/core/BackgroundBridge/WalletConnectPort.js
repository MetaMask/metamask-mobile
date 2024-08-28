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
var Engine_1 = require("../Engine");
var AppConstants_1 = require("../AppConstants");
var networkController_1 = require("../../selectors/networkController");
var store_1 = require("../../store");
// eslint-disable-next-line import/no-nodejs-modules, import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
var EventEmitter = require('events').EventEmitter;
var NOTIFICATION_NAMES = AppConstants_1["default"].NOTIFICATION_NAMES;
var WalletConnectPort = /** @class */ (function (_super) {
    __extends(WalletConnectPort, _super);
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function WalletConnectPort(wcRequestActions) {
        var _this = _super.call(this) || this;
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _this.postMessage = function (msg) {
            var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
            try {
                if (((_c = msg === null || msg === void 0 ? void 0 : msg.data) === null || _c === void 0 ? void 0 : _c.method) === NOTIFICATION_NAMES.chainChanged) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    var selectedAddress = Engine_1["default"].datamodel.flatState.selectedAddress;
                    (_e = (_d = _this._wcRequestActions) === null || _d === void 0 ? void 0 : _d.updateSession) === null || _e === void 0 ? void 0 : _e.call(_d, {
                        chainId: parseInt(msg.data.params.chainId, 16),
                        accounts: [selectedAddress]
                    });
                }
                else if (((_f = msg === null || msg === void 0 ? void 0 : msg.data) === null || _f === void 0 ? void 0 : _f.method) === NOTIFICATION_NAMES.accountsChanged) {
                    var chainId = (0, networkController_1.selectChainId)(store_1.store.getState());
                    (_h = (_g = _this._wcRequestActions) === null || _g === void 0 ? void 0 : _g.updateSession) === null || _h === void 0 ? void 0 : _h.call(_g, {
                        chainId: parseInt(chainId),
                        accounts: msg.data.params
                    });
                }
                else if (((_j = msg === null || msg === void 0 ? void 0 : msg.data) === null || _j === void 0 ? void 0 : _j.method) === NOTIFICATION_NAMES.unlockStateChanged) {
                    // WC DOESN'T NEED THIS EVENT
                }
                else if ((_k = msg === null || msg === void 0 ? void 0 : msg.data) === null || _k === void 0 ? void 0 : _k.error) {
                    (_m = (_l = _this._wcRequestActions) === null || _l === void 0 ? void 0 : _l.rejectRequest) === null || _m === void 0 ? void 0 : _m.call(_l, {
                        id: msg.data.id,
                        error: msg.data.error
                    });
                }
                else {
                    (_p = (_o = _this._wcRequestActions) === null || _o === void 0 ? void 0 : _o.approveRequest) === null || _p === void 0 ? void 0 : _p.call(_o, {
                        id: msg.data.id,
                        result: msg.data.result
                    });
                }
            }
            catch (e) {
                console.warn(e);
            }
        };
        _this._wcRequestActions = wcRequestActions;
        return _this;
    }
    return WalletConnectPort;
}(EventEmitter));
exports["default"] = WalletConnectPort;
