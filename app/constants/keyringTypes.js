"use strict";
exports.__esModule = true;
exports.HardwareDeviceTypes = void 0;
var ExtendedKeyringTypes;
(function (ExtendedKeyringTypes) {
    ExtendedKeyringTypes["simple"] = "Simple Key Pair";
    ExtendedKeyringTypes["hd"] = "HD Key Tree";
    ExtendedKeyringTypes["qr"] = "QR Hardware Wallet Device";
    ExtendedKeyringTypes["ledger"] = "Ledger Hardware";
})(ExtendedKeyringTypes || (ExtendedKeyringTypes = {}));
exports["default"] = ExtendedKeyringTypes;
var HardwareDeviceTypes;
(function (HardwareDeviceTypes) {
    HardwareDeviceTypes["LEDGER"] = "Ledger";
    HardwareDeviceTypes["QR"] = "QR Hardware";
})(HardwareDeviceTypes = exports.HardwareDeviceTypes || (exports.HardwareDeviceTypes = {}));
