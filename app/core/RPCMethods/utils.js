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
exports.polyfillGasPrice = exports.makeMethodMiddlewareMaker = exports.UNSUPPORTED_RPC_METHODS = void 0;
var controller_utils_1 = require("@metamask/controller-utils");
var Engine_1 = require("../Engine");
var snaps_rpc_methods_2 = require("@metamask/snaps-rpc-methods");
var rpc_errors_1 = require("@metamask/rpc-errors");
var utils_1 = require("@metamask/utils");
exports.UNSUPPORTED_RPC_METHODS = new Set([
    // This is implemented later in our middleware stack – specifically, in
    // eth-json-rpc-middleware – but our UI does not support it.
    'eth_signTransaction',
]);
/**
 * Asserts that the specified hooks object only has all expected hooks and no extraneous ones.
 *
 * @param hooks - Required "hooks" into our controllers.
 * @param - The expected hook names.
 */
function assertExpectedHook(hooks, expectedHookNames) {
    var missingHookNames = [];
    expectedHookNames.forEach(function (hookName) {
        if (!(0, utils_1.hasProperty)(hooks, hookName)) {
            missingHookNames.push(hookName);
        }
    });
    if (missingHookNames.length > 0) {
        throw new Error("Missing expected hooks:\n\n".concat(missingHookNames.join('\n'), "\n"));
    }
    var extraneousHookNames = Object.getOwnPropertyNames(hooks).filter(function (hookName) { return !expectedHookNames.has(hookName); });
    if (extraneousHookNames.length > 0) {
        throw new Error("Received unexpected hooks:\n\n".concat(extraneousHookNames.join('\n'), "\n"));
    }
}
/**
 * Creates a method middleware factory function given a set of method handlers.
 *
 * @param handlers - The RPC method handler implementations.
 * @returns The method middleware factory function.
 */
function makeMethodMiddlewareMaker(handlers) {
    var _this = this;
    var handlerMap = handlers.reduce(function (map, handler) {
        for (var _i = 0, _c = handler.methodNames; _i < _c.length; _i++) {
            var methodName = _c[_i];
            map[methodName] = handler;
        }
        return map;
    }, {});
    var expectedHookNames = new Set(handlers.flatMap(function (_c) {
        var hookNames = _c.hookNames;
        return Object.getOwnPropertyNames(hookNames);
    }));
    /**
     * Creates a json-rpc-engine middleware of RPC method implementations.
     *
     * Handlers consume functions that hook into the background, and only depend
     * on their signatures, not e.g. controller internals.
     *
     * @param hooks - Required "hooks" into our controllers.
     * @returns - The method middleware function.
     */
    var makeMethodMiddleware = function (hooks) {
        assertExpectedHook(hooks, expectedHookNames);
        var methodMiddleware = function (req, res, next, end) { return __awaiter(_this, void 0, void 0, function () {
            var handler, implementation, hookNames, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        handler = handlerMap[req.method];
                        if (!handler) return [3 /*break*/, 4];
                        implementation = handler.implementation, hookNames = handler.hookNames;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, implementation(
                            // @ts-expect-error JsonRpcId (number | string | void) doesn't match the permission middleware's id, which is (string | number | null)
                            req, res, next, end, (0, snaps_rpc_methods_2.selectHooks)(hooks, hookNames))];
                    case 2: 
                    // Implementations may or may not be async, so we must await them.
                    return [2 /*return*/, _c.sent()];
                    case 3:
                        error_1 = _c.sent();
                        if (process.env.METAMASK_DEBUG) {
                            console.error(error_1);
                        }
                        return [2 /*return*/, end(error_1 instanceof Error
                                ? error_1
                                : rpc_errors_1.rpcErrors.internal({
                                    data: error_1
                                }))];
                    case 4: return [2 /*return*/, next()];
                }
            });
        }); };
        return methodMiddleware;
    };
    return makeMethodMiddleware;
}
exports.makeMethodMiddlewareMaker = makeMethodMiddlewareMaker;
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var polyfillGasPrice = function (method, params) {
    if (params === void 0) { params = []; }
    return __awaiter(void 0, void 0, void 0, function () {
        var ethQuery, data;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    ethQuery = Engine_1["default"].controllerMessenger.call('NetworkController:getEthQuery');
                    return [4 /*yield*/, (0, controller_utils_1.query)(ethQuery, method, params)];
                case 1:
                    data = _c.sent();
                    if ((data === null || data === void 0 ? void 0 : data.maxFeePerGas) && !data.gasPrice) {
                        data.gasPrice = data.maxFeePerGas;
                    }
                    return [2 /*return*/, data];
            }
        });
    });
};
exports.polyfillGasPrice = polyfillGasPrice;
exports["default"] = {
    polyfillGasPrice: exports.polyfillGasPrice
};
