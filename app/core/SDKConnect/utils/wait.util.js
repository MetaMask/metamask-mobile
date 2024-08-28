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
exports.waitForEmptyRPCQueue = exports.waitForAndroidServiceBinding = exports.waitForUserLoggedIn = exports.waitForKeychainUnlocked = exports.waitForConnectionReadiness = exports.waitForAsyncCondition = exports.waitForCondition = exports.waitForReadyClient = exports.wait = exports.MAX_QUEUE_LOOP = void 0;
var SDKConnect_1 = require("../SDKConnect");
var DevLogger_1 = require("./DevLogger");
var utils_1 = require("../../../util/test/utils");
var index_1 = require("../../../../app/store/index");
exports.MAX_QUEUE_LOOP = Infinity;
var wait = function (ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
};
exports.wait = wait;
var waitForReadyClient = function (id, connectedClients, waitTime) {
    if (waitTime === void 0) { waitTime = 200; }
    return __awaiter(void 0, void 0, void 0, function () {
        var i;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    i = 0;
                    _c.label = 1;
                case 1:
                    if (!!connectedClients[id]) return [3 /*break*/, 3];
                    i += 1;
                    if (i++ > exports.MAX_QUEUE_LOOP) {
                        console.warn("RPC queue not empty after ".concat(exports.MAX_QUEUE_LOOP, " seconds"));
                        return [3 /*break*/, 3];
                    }
                    return [4 /*yield*/, (0, exports.wait)(waitTime)];
                case 2:
                    _c.sent();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.waitForReadyClient = waitForReadyClient;
/**
 * Asynchronously waits for a given condition to return true by periodically executing
 * a provided function. This can be useful for delaying subsequent code execution until
 * a certain condition is met, such as waiting for a resource to become available.
 *
 * @param {Object} params - Configuration object for the wait condition.
 * @param {Function} params.fn - A function that returns a boolean, indicating whether the desired condition is met.
 * This function is polled repeatedly until it returns true.
 * @param {number} [params.waitTime=1000] - The time to wait between each poll of `fn`, in milliseconds.
 * Defaults to 1000ms (1 second) if not specified.
 * @param {string} [params.context] - Optional context information to be used in logging messages.
 * If provided, it will be included in log outputs for diagnostic purposes, particularly when the
 * function has been polled more than 5 times and on every tenth poll thereafter without the condition being met.
 */
var waitForCondition = function (_c) {
    var fn = _c.fn, context = _c.context, _d = _c.waitTime, waitTime = _d === void 0 ? 1000 : _d;
    return __awaiter(void 0, void 0, void 0, function () {
        var i;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    i = 0;
                    _e.label = 1;
                case 1:
                    if (!!fn()) return [3 /*break*/, 3];
                    i += 1;
                    if (i > 5 && i % 10 === 0) {
                        DevLogger_1["default"].log("Waiting for fn context=".concat(context, " to return true"));
                    }
                    return [4 /*yield*/, (0, exports.wait)(waitTime)];
                case 2:
                    _e.sent();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.waitForCondition = waitForCondition;
/**
 * Similar to `waitForCondition`, but for asynchronous conditions that return a promise.
 */
var waitForAsyncCondition = function (_c) {
    var fn = _c.fn, context = _c.context, _d = _c.waitTime, waitTime = _d === void 0 ? 1000 : _d;
    return __awaiter(void 0, void 0, void 0, function () {
        var i;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    i = 0;
                    _e.label = 1;
                case 1: return [4 /*yield*/, fn()];
                case 2:
                    if (!!(_e.sent())) return [3 /*break*/, 4];
                    i += 1;
                    if (i > 5 && i % 10 === 0) {
                        DevLogger_1["default"].log("Waiting for fn context=".concat(context, " to return true"));
                    }
                    return [4 /*yield*/, (0, exports.wait)(waitTime)];
                case 3:
                    _e.sent();
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
};
exports.waitForAsyncCondition = waitForAsyncCondition;
var waitForConnectionReadiness = function (_c) {
    var connection = _c.connection, _d = _c.waitTime, waitTime = _d === void 0 ? 1000 : _d;
    return __awaiter(void 0, void 0, void 0, function () {
        var i;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    i = 0;
                    _e.label = 1;
                case 1:
                    if (!!connection.isReady) return [3 /*break*/, 3];
                    i += 1;
                    if (i > exports.MAX_QUEUE_LOOP) {
                        throw new Error('Connection timeout - ready state not received');
                    }
                    return [4 /*yield*/, (0, exports.wait)(waitTime)];
                case 2:
                    _e.sent();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.waitForConnectionReadiness = waitForConnectionReadiness;
var waitForKeychainUnlocked = function (_c) {
    var context = _c.context, keyringController = _c.keyringController, _d = _c.waitTime, waitTime = _d === void 0 ? 1000 : _d;
    return __awaiter(void 0, void 0, void 0, function () {
        var i, unlocked;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    // Disable during e2e tests otherwise Detox fails
                    if (utils_1.isE2E) {
                        return [2 /*return*/, true];
                    }
                    i = 1;
                    if (!keyringController) {
                        console.warn('Keyring controller not found');
                    }
                    unlocked = keyringController.isUnlocked();
                    DevLogger_1["default"].log("wait:: waitForKeyChainUnlocked[".concat(context, "] unlocked: ").concat(unlocked));
                    _e.label = 1;
                case 1:
                    if (!!unlocked) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, exports.wait)(waitTime)];
                case 2:
                    _e.sent();
                    if (i % 5 === 0) {
                        DevLogger_1["default"].log("SDKConnect [".concat(context, "] Waiting for keychain unlock... attempt ").concat(i));
                    }
                    unlocked = keyringController.isUnlocked();
                    i += 1;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, unlocked];
            }
        });
    });
};
exports.waitForKeychainUnlocked = waitForKeychainUnlocked;
var waitForUserLoggedIn = function (_c) {
    var context = _c.context, _d = _c.waitTime, waitTime = _d === void 0 ? 1000 : _d;
    return __awaiter(void 0, void 0, void 0, function () {
        var i, state, isLoggedIn;
        var _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    i = 1;
                    // Disable during e2e tests otherwise Detox fails
                    if (utils_1.isE2E) {
                        return [2 /*return*/, true];
                    }
                    state = index_1.store.getState();
                    isLoggedIn = (_e = state.user.userLoggedIn) !== null && _e !== void 0 ? _e : false;
                    DevLogger_1["default"].log("wait:: waitForUserLoggedIn[".concat(context, "] isLoggedIn: ").concat(isLoggedIn));
                    _g.label = 1;
                case 1:
                    if (!!isLoggedIn) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, exports.wait)(waitTime)];
                case 2:
                    _g.sent();
                    if (i % 60 === 0) {
                        DevLogger_1["default"].log("[wait.util] [".concat(context, "] Waiting for userLoggedIn... attempt ").concat(i));
                    }
                    isLoggedIn = (_f = state.user.userLoggedIn) !== null && _f !== void 0 ? _f : false;
                    i += 1;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, isLoggedIn];
            }
        });
    });
};
exports.waitForUserLoggedIn = waitForUserLoggedIn;
var waitForAndroidServiceBinding = function (waitTime) {
    if (waitTime === void 0) { waitTime = 500; }
    return __awaiter(void 0, void 0, void 0, function () {
        var i;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    i = 1;
                    _c.label = 1;
                case 1:
                    if (!(SDKConnect_1.SDKConnect.getInstance().isAndroidSDKBound() === false)) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, exports.wait)(waitTime)];
                case 2:
                    _c.sent();
                    i += 1;
                    if (i > 5 && i % 10 === 0) {
                        console.warn("Waiting for Android service binding...");
                    }
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.waitForAndroidServiceBinding = waitForAndroidServiceBinding;
var waitForEmptyRPCQueue = function (manager, waitTime) {
    if (waitTime === void 0) { waitTime = 1000; }
    return __awaiter(void 0, void 0, void 0, function () {
        var i, queue;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    i = 0;
                    queue = Object.keys(manager.get());
                    _c.label = 1;
                case 1:
                    if (!(queue.length > 0)) return [3 /*break*/, 3];
                    queue = Object.keys(manager.get());
                    if (i++ > exports.MAX_QUEUE_LOOP) {
                        console.warn("RPC queue not empty after ".concat(exports.MAX_QUEUE_LOOP, " seconds"));
                        return [3 /*break*/, 3];
                    }
                    return [4 /*yield*/, (0, exports.wait)(waitTime)];
                case 2:
                    _c.sent();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.waitForEmptyRPCQueue = waitForEmptyRPCQueue;
