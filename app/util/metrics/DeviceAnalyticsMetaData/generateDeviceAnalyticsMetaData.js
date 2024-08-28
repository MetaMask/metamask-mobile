"use strict";
exports.__esModule = true;
var react_native_1 = require("react-native");
var react_native_device_info_1 = require("react-native-device-info");
var generateDeviceAnalyticsMetaData = function () { return ({
    platform: react_native_1.Platform.OS,
    currentBuildNumber: (0, react_native_device_info_1.getBuildNumber)(),
    applicationVersion: (0, react_native_device_info_1.getVersion)(),
    operatingSystemVersion: react_native_1.Platform.Version.toString(),
    deviceBrand: (0, react_native_device_info_1.getBrand)()
}); };
exports["default"] = generateDeviceAnalyticsMetaData;
