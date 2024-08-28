"use strict";
exports.__esModule = true;
exports.isString = exports.gt = exports.lt = exports.gte = exports.lte = exports.isZero = void 0;
/**
 * Function that checks if value is zero
 *
 * @param value number | any
 * @returns
 */
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var isZero = function (value) {
    var _c;
    if ((value === null || value === void 0 ? void 0 : value.toString) && ((_c = value === null || value === void 0 ? void 0 : value.toString) === null || _c === void 0 ? void 0 : _c.call(value)) === '0') {
        return true;
    }
    return false;
};
exports.isZero = isZero;
/**
 * Function that checks if value is less than or equal to other
 *
 * @param value number
 * @param other number
 * @returns
 */
var lte = function (value, other) {
    return Number(value) <= Number(other);
};
exports.lte = lte;
/**
 * Function that checks if value is greater than or equal to other
 *
 * @param value number
 * @param other number
 * @returns
 */
var gte = function (value, other) {
    return Number(value) >= Number(other);
};
exports.gte = gte;
/**
 * Function that checks if value is less than other
 *
 * @param value number
 * @param other number
 * @returns
 */
var lt = function (value, other) {
    return Number(value) < Number(other);
};
exports.lt = lt;
/**
 * Function that checks if value is greater than other
 *
 * @param value number
 * @param other number
 * @returns
 */
var gt = function (value, other) {
    return Number(value) > Number(other);
};
exports.gt = gt;
/**
 * Gets the `toStringTag` of `value`.
 *
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTag(value) {
    var objToString = Object.prototype.toString;
    if (value === null) {
        return value === undefined ? '[object Undefined]' : '[object Null]';
    }
    return objToString.call(value);
}
/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a string, else `false`.
 */
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isString(value) {
    var type = typeof value;
    return (type === 'string' ||
        (type === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            getTag(value) === '[object String]'));
}
exports.isString = isString;
