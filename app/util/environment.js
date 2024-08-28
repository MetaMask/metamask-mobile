"use strict";
/* eslint-disable import/prefer-default-export */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.isProduction = void 0;
var isProduction = function () { var _c; 
// TODO: process.env.NODE_ENV === 'production' doesn't work with tests yet. Once we make it work,
// we can remove the following line and use the code above instead.
return (((_c = __assign({}, process.env)) === null || _c === void 0 ? void 0 : _c.NODE_ENV) === 'production'); };
exports.isProduction = isProduction;
