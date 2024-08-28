"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
exports.__esModule = true;
var utils_1 = require("@metamask/utils");
var _029_1 = require("./029");
var _030_1 = require("./030");
var react_native_1 = require("@sentry/react-native");
/**
 * Enable security alerts by default.
 * @param {any} state - Redux state.
 * @returns Migrated Redux state.
 */
function migrate(stateAsync) {
    var _c;
    return __awaiter(this, void 0, void 0, function () {
        var state, engine, restState, engine, restState, networkControllerState, state29, state30;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, stateAsync];
                case 1:
                    state = _d.sent();
                    if (!(0, utils_1.isObject)(state)) {
                        (0, react_native_1.captureException)(new Error("Migration 32: Invalid state: '".concat(typeof state, "'")));
                        return [2 /*return*/, {}];
                    }
                    if (!(0, utils_1.isObject)(state.engine)) {
                        (0, react_native_1.captureException)(new Error("Migration 32: Invalid engine state: '".concat(typeof state.engine, "'")));
                        engine = state.engine, restState = __rest(state, ["engine"]);
                        return [2 /*return*/, restState];
                    }
                    if (!(0, utils_1.isObject)(state.engine.backgroundState)) {
                        (0, react_native_1.captureException)(new Error("Migration 32: Invalid engine backgroundState: '".concat(typeof state.engine
                            .backgroundState, "'")));
                        engine = state.engine, restState = __rest(state, ["engine"]);
                        return [2 /*return*/, restState];
                    }
                    networkControllerState = state.engine.backgroundState.NetworkController;
                    if (!(0, utils_1.isObject)(networkControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 32: Invalid NetworkController state: '".concat(typeof networkControllerState, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.hasProperty)(networkControllerState, 'providerConfig') ||
                        !(0, utils_1.isObject)(networkControllerState.providerConfig)) {
                        (0, react_native_1.captureException)(new Error("Migration 32: Invalid NetworkController providerConfig: '".concat(typeof networkControllerState.providerConfig, "'")));
                        return [2 /*return*/, state];
                    }
                    if ((_c = networkControllerState === null || networkControllerState === void 0 ? void 0 : networkControllerState.providerConfig) === null || _c === void 0 ? void 0 : _c.rpcUrl) {
                        return [2 /*return*/, state];
                    }
                    state29 = (0, _029_1["default"])(state);
                    state30 = (0, _030_1["default"])(state29);
                    return [2 /*return*/, state30];
            }
        });
    });
}
exports["default"] = migrate;
