"use strict";
exports.__esModule = true;
var generateRandomIntegerInRange = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
/**
 * Generate random otp numbers.
 * The first number array[0] should be the actual otp answer.
 *
 * @returns {array} of the 3 number between 100 and 999
 */
var generateOTP = function () {
    var n1 = generateRandomIntegerInRange(100, 999);
    var otps = [n1];
    while (otps.length < 3) {
        var n = generateRandomIntegerInRange(100, 999);
        if (otps.indexOf(n) === -1) {
            otps.push(n);
        }
    }
    return otps;
};
exports["default"] = generateOTP;
