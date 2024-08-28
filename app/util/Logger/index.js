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
exports.__esModule = true;
exports.AsyncLogger = void 0;
var react_native_1 = require("@sentry/react-native");
var storage_wrapper_1 = require("../../store/storage-wrapper");
var storage_1 = require("../../constants/storage");
/**
 * Wrapper class that allows us to override
 * console.log and console.error and in the future
 * we will have flags to do different actions based on
 * the environment, for ex. log to a remote server if prod
 *
 * The previously available message function has been removed
 * favoring the use of the error or log function:
 * - error: for logging errors that you want to see in Sentry,
 * - log: for logging general information and sending breadcrumbs only with the next Sentry event.
 */
var AsyncLogger = /** @class */ (function () {
    function AsyncLogger() {
    }
    /**
     * console.log wrapper
     *
     * @param {object} args - data to be logged
     * @returns - void
     */
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AsyncLogger.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var metricsOptIn;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (__DEV__) {
                            args.unshift(storage_1.DEBUG);
                            console.log.apply(null, args); // eslint-disable-line no-console
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.METRICS_OPT_IN)];
                    case 1:
                        metricsOptIn = _c.sent();
                        if (metricsOptIn === storage_1.AGREED) {
                            (0, react_native_1.addBreadcrumb)({
                                message: JSON.stringify(args)
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * console.error wrapper
     *
     * @param {Error} error - Error object to be logged
     * @param {string|object} extra - Extra error info
     * @returns - void
     */
    AsyncLogger.error = function (error, 
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra) {
        return __awaiter(this, void 0, void 0, function () {
            var metricsOptIn, exception_1, extras_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (__DEV__) {
                            console.warn(storage_1.DEBUG, error); // eslint-disable-line no-console
                            return [2 /*return*/];
                        }
                        if (!error) {
                            return [2 /*return*/, console.warn('No error provided')];
                        }
                        return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.METRICS_OPT_IN)];
                    case 1:
                        metricsOptIn = _c.sent();
                        if (metricsOptIn === storage_1.AGREED) {
                            exception_1 = error;
                            // Continue handling non Error cases to prevent breaking changes
                            if (!(error instanceof Error)) {
                                if (typeof error === 'string') {
                                    exception_1 = new Error(error);
                                }
                                else {
                                    // error is an object but not an Error instance
                                    exception_1 = new Error(JSON.stringify(error));
                                }
                                // TODO: Replace "any" with type
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                exception_1.originalError = error;
                            }
                            if (extra) {
                                extras_1 = typeof extra === 'string' ? { message: extra } : extra;
                                (0, react_native_1.withScope)(function (scope) {
                                    scope.setExtras(extras_1);
                                    (0, react_native_1.captureException)(exception_1);
                                });
                            }
                            else {
                                (0, react_native_1.captureException)(exception_1);
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return AsyncLogger;
}());
exports.AsyncLogger = AsyncLogger;
var Logger = /** @class */ (function () {
    function Logger() {
    }
    /**
     * console.log wrapper
     *
     * @param {object} args - data to be logged
     * @returns - void
     */
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Logger.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        AsyncLogger.log.apply(AsyncLogger, args)["catch"](function () {
            // ignore error but avoid dangling promises
        });
    };
    /**
     * console.error wrapper
     *
     * @param {Error} error - Error to be logged
     * @param {string|object} extra - Extra error info
     * @returns - void
     */
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Logger.error = function (error, extra) {
        AsyncLogger.error(error, extra)["catch"](function () {
            // ignore error but avoid dangling promises
        });
    };
    return Logger;
}());
exports["default"] = Logger;
