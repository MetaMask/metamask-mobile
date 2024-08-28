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
exports.wipeTransactions = exports.updateTransaction = exports.updateSecurityAlertResponse = exports.updateIncomingTransactions = exports.stopIncomingTransactionPolling = exports.startIncomingTransactionPolling = exports.speedUpTransaction = exports.getNonceLock = exports.handleMethodData = exports.estimateGas = exports.addTransaction = void 0;
var Engine_1 = require("../../core/Engine");
// Keeping this export as function to put more logic in the future
function addTransaction(transaction, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var TransactionController;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    TransactionController = Engine_1["default"].context.TransactionController;
                    return [4 /*yield*/, TransactionController.addTransaction(transaction, opts)];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
exports.addTransaction = addTransaction;
// Keeping this export as function to put more logic in the future
function estimateGas(transaction) {
    return __awaiter(this, void 0, void 0, function () {
        var TransactionController;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    TransactionController = Engine_1["default"].context.TransactionController;
                    return [4 /*yield*/, TransactionController.estimateGas(transaction)];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
exports.estimateGas = estimateGas;
// Proxy methods
function handleMethodData() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var TransactionController = Engine_1["default"].context.TransactionController;
    return TransactionController.handleMethodData.apply(TransactionController, args);
}
exports.handleMethodData = handleMethodData;
function getNonceLock() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var TransactionController = Engine_1["default"].context.TransactionController;
    return TransactionController.getNonceLock.apply(TransactionController, args);
}
exports.getNonceLock = getNonceLock;
function speedUpTransaction() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var TransactionController = Engine_1["default"].context.TransactionController;
    return TransactionController.speedUpTransaction.apply(TransactionController, args);
}
exports.speedUpTransaction = speedUpTransaction;
function startIncomingTransactionPolling() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var TransactionController = Engine_1["default"].context.TransactionController;
    return TransactionController.startIncomingTransactionPolling.apply(TransactionController, args);
}
exports.startIncomingTransactionPolling = startIncomingTransactionPolling;
function stopIncomingTransactionPolling() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var TransactionController = Engine_1["default"].context.TransactionController;
    return TransactionController.stopIncomingTransactionPolling.apply(TransactionController, args);
}
exports.stopIncomingTransactionPolling = stopIncomingTransactionPolling;
function updateIncomingTransactions() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var TransactionController = Engine_1["default"].context.TransactionController;
    return TransactionController.updateIncomingTransactions.apply(TransactionController, args);
}
exports.updateIncomingTransactions = updateIncomingTransactions;
function updateSecurityAlertResponse() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var TransactionController = Engine_1["default"].context.TransactionController;
    return TransactionController.updateSecurityAlertResponse.apply(TransactionController, args);
}
exports.updateSecurityAlertResponse = updateSecurityAlertResponse;
function updateTransaction() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var TransactionController = Engine_1["default"].context.TransactionController;
    return TransactionController.updateTransaction.apply(TransactionController, args);
}
exports.updateTransaction = updateTransaction;
function wipeTransactions() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var TransactionController = Engine_1["default"].context.TransactionController;
    return TransactionController.wipeTransactions.apply(TransactionController, args);
}
exports.wipeTransactions = wipeTransactions;
