"use strict";
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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SmartTransactionHook_approvalEnded, _SmartTransactionHook_approvalId, _SmartTransactionHook_chainId, _SmartTransactionHook_featureFlags, _SmartTransactionHook_shouldUseSmartTransaction, _SmartTransactionHook_smartTransactionsController, _SmartTransactionHook_transactionController, _SmartTransactionHook_approvalController, _SmartTransactionHook_transactionMeta, _SmartTransactionHook_txParams, _SmartTransactionHook_isDapp, _SmartTransactionHook_isSend, _SmartTransactionHook_isInSwapFlow, _SmartTransactionHook_isSwapApproveTx, _SmartTransactionHook_isSwapTransaction, _SmartTransactionHook_isNativeTokenTransferred, _SmartTransactionHook_shouldStartApprovalRequest, _SmartTransactionHook_shouldUpdateApprovalRequest, _SmartTransactionHook_getFees, _SmartTransactionHook_getApprovalIdForPendingSwapApproveTx, _SmartTransactionHook_getTransactionHash, _SmartTransactionHook_applyFeeToTransaction, _SmartTransactionHook_createSignedTransactions, _SmartTransactionHook_signAndSubmitTransactions, _SmartTransactionHook_addApprovalRequest, _SmartTransactionHook_updateApprovalRequest, _SmartTransactionHook_addListenerToUpdateStatusPage, _SmartTransactionHook_waitForTransactionHash, _SmartTransactionHook_cleanup, _SmartTransactionHook_updateSwapsTransactions;
exports.__esModule = true;
exports.submitSmartTransactionHook = exports.STX_NO_HASH_ERROR = void 0;
var index_1 = require("./index");
var Logger_1 = require("../Logger");
var types_1 = require("@metamask/smart-transactions-controller/dist/types");
var uuid_2 = require("uuid");
var conversions_1 = require("../conversions");
var RPCMethodMiddleware_1 = require("../../core/RPCMethods/RPCMethodMiddleware");
var constants_2 = require("../../components/UI/Ramp/constants");
var LOG_PREFIX = 'STX publishHook';
// It has to be 21000 for cancel transactions, otherwise the API would reject it.
var CANCEL_GAS = 21000;
exports.STX_NO_HASH_ERROR = 'Smart Transaction does not have a transaction hash, there was a problem';
var SmartTransactionHook = /** @class */ (function () {
    function SmartTransactionHook(request) {
        var _this = this;
        _SmartTransactionHook_approvalEnded.set(this, void 0);
        _SmartTransactionHook_approvalId.set(this, void 0);
        _SmartTransactionHook_chainId.set(this, void 0);
        _SmartTransactionHook_featureFlags.set(this, void 0);
        _SmartTransactionHook_shouldUseSmartTransaction.set(this, void 0);
        _SmartTransactionHook_smartTransactionsController.set(this, void 0);
        _SmartTransactionHook_transactionController.set(this, void 0);
        _SmartTransactionHook_approvalController.set(this, void 0);
        _SmartTransactionHook_transactionMeta.set(this, void 0);
        _SmartTransactionHook_txParams.set(this, void 0);
        _SmartTransactionHook_isDapp.set(this, void 0);
        _SmartTransactionHook_isSend.set(this, void 0);
        _SmartTransactionHook_isInSwapFlow.set(this, void 0);
        _SmartTransactionHook_isSwapApproveTx.set(this, void 0);
        _SmartTransactionHook_isSwapTransaction.set(this, void 0);
        _SmartTransactionHook_isNativeTokenTransferred.set(this, void 0);
        _SmartTransactionHook_shouldStartApprovalRequest.set(this, void 0);
        _SmartTransactionHook_shouldUpdateApprovalRequest.set(this, void 0);
        _SmartTransactionHook_getFees.set(this, function () { return __awaiter(_this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_smartTransactionsController, "f").getFees(__assign(__assign({}, __classPrivateFieldGet(this, _SmartTransactionHook_txParams, "f")), { chainId: __classPrivateFieldGet(this, _SmartTransactionHook_chainId, "f") }), undefined)];
                    case 1: return [2 /*return*/, _c.sent()];
                    case 2:
                        error_1 = _c.sent();
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        _SmartTransactionHook_getApprovalIdForPendingSwapApproveTx.set(this, function () {
            var pendingApprovalsForSwapApproveTxs = Object.values(__classPrivateFieldGet(_this, _SmartTransactionHook_approvalController, "f").state.pendingApprovals).filter(function (_c) {
                var pendingApprovalOrigin = _c.origin, type = _c.type, requestState = _c.requestState;
                // MM_FOX_CODE is the origin for MM Swaps
                return pendingApprovalOrigin === process.env.MM_FOX_CODE &&
                    type === RPCMethodMiddleware_1.ApprovalTypes.SMART_TRANSACTION_STATUS &&
                    (requestState === null || requestState === void 0 ? void 0 : requestState.isInSwapFlow) &&
                    (requestState === null || requestState === void 0 ? void 0 : requestState.isSwapApproveTx);
            });
            var pendingApprovalsForSwapApproveTx = pendingApprovalsForSwapApproveTxs[0];
            return pendingApprovalsForSwapApproveTx && __classPrivateFieldGet(_this, _SmartTransactionHook_isSwapTransaction, "f")
                ? pendingApprovalsForSwapApproveTx.id
                : null;
        });
        _SmartTransactionHook_getTransactionHash.set(this, function (
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        submitTransactionResponse, uuid) { return __awaiter(_this, void 0, void 0, function () {
            var transactionHash, returnTxHashAsap;
            var _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        returnTxHashAsap = (_d = (_c = __classPrivateFieldGet(this, _SmartTransactionHook_featureFlags, "f")) === null || _c === void 0 ? void 0 : _c.smartTransactions) === null || _d === void 0 ? void 0 : _d.returnTxHashAsap;
                        if (!(returnTxHashAsap && (submitTransactionResponse === null || submitTransactionResponse === void 0 ? void 0 : submitTransactionResponse.txHash))) return [3 /*break*/, 1];
                        transactionHash = submitTransactionResponse.txHash;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_waitForTransactionHash, "f").call(this, {
                            uuid: uuid
                        })];
                    case 2:
                        transactionHash = _e.sent();
                        _e.label = 3;
                    case 3:
                        if (transactionHash === null) {
                            throw new Error(exports.STX_NO_HASH_ERROR);
                        }
                        return [2 /*return*/, transactionHash];
                }
            });
        }); });
        _SmartTransactionHook_applyFeeToTransaction.set(this, function (fee, isCancel) {
            var _c;
            var unsignedTransactionWithFees = __assign(__assign({}, __classPrivateFieldGet(_this, _SmartTransactionHook_txParams, "f")), { maxFeePerGas: "0x".concat((0, conversions_1.decimalToHex)(fee.maxFeePerGas)), maxPriorityFeePerGas: "0x".concat((0, conversions_1.decimalToHex)(fee.maxPriorityFeePerGas)), gas: isCancel
                    ? "0x".concat((0, conversions_1.decimalToHex)(CANCEL_GAS))
                    : (_c = __classPrivateFieldGet(_this, _SmartTransactionHook_txParams, "f").gas) === null || _c === void 0 ? void 0 : _c.toString(), value: __classPrivateFieldGet(_this, _SmartTransactionHook_txParams, "f").value });
            if (isCancel) {
                unsignedTransactionWithFees.to = unsignedTransactionWithFees.from;
                unsignedTransactionWithFees.data = '0x';
            }
            return unsignedTransactionWithFees;
        });
        _SmartTransactionHook_createSignedTransactions.set(this, function (fees, isCancel) { return __awaiter(_this, void 0, void 0, function () {
            var unsignedTransactions, transactionsWithChainId;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        unsignedTransactions = fees.map(function (fee) {
                            return __classPrivateFieldGet(_this, _SmartTransactionHook_applyFeeToTransaction, "f").call(_this, fee, isCancel);
                        });
                        transactionsWithChainId = unsignedTransactions.map(function (tx) { return (__assign(__assign({}, tx), { chainId: tx.chainId || __classPrivateFieldGet(_this, _SmartTransactionHook_chainId, "f") })); });
                        return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_transactionController, "f").approveTransactionsWithSameNonce(transactionsWithChainId, { hasNonce: true })];
                    case 1: return [2 /*return*/, (_c.sent())];
                }
            });
        }); });
        _SmartTransactionHook_signAndSubmitTransactions.set(this, function (_c) {
            var getFeesResponse = _c.getFeesResponse;
            return __awaiter(_this, void 0, void 0, function () {
                var signedTransactions, signedCanceledTransactions;
                var _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0: return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_createSignedTransactions, "f").call(this, (_e = (_d = getFeesResponse.tradeTxFees) === null || _d === void 0 ? void 0 : _d.fees) !== null && _e !== void 0 ? _e : [], false)];
                        case 1:
                            signedTransactions = _g.sent();
                            return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_createSignedTransactions, "f").call(this, ((_f = getFeesResponse.tradeTxFees) === null || _f === void 0 ? void 0 : _f.cancelFees) || [], true)];
                        case 2:
                            signedCanceledTransactions = _g.sent();
                            return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_smartTransactionsController, "f").submitSignedTransactions({
                                    signedTransactions: signedTransactions,
                                    signedCanceledTransactions: signedCanceledTransactions,
                                    txParams: __classPrivateFieldGet(this, _SmartTransactionHook_txParams, "f"),
                                    transactionMeta: __classPrivateFieldGet(this, _SmartTransactionHook_transactionMeta, "f")
                                })];
                        case 3: return [2 /*return*/, _g.sent()];
                    }
                });
            });
        });
        _SmartTransactionHook_addApprovalRequest.set(this, function (_c) {
            var uuid = _c.uuid;
            var origin = __classPrivateFieldGet(_this, _SmartTransactionHook_transactionMeta, "f").origin;
            if (!origin)
                throw new Error('Origin is required');
            __classPrivateFieldSet(_this, _SmartTransactionHook_approvalId, (0, uuid_2.v1)(), "f");
            // Do not await on this, since it will not progress any further if so
            __classPrivateFieldGet(_this, _SmartTransactionHook_approvalController, "f").addAndShowApprovalRequest({
                id: __classPrivateFieldGet(_this, _SmartTransactionHook_approvalId, "f"),
                origin: origin,
                type: RPCMethodMiddleware_1.ApprovalTypes.SMART_TRANSACTION_STATUS,
                // requestState gets passed to app/components/Views/confirmations/components/Approval/TemplateConfirmation/Templates/SmartTransactionStatus.ts
                // can also be read from approvalController.state.pendingApprovals[approvalId].requestState
                requestState: {
                    smartTransaction: {
                        status: types_1.SmartTransactionStatuses.PENDING,
                        creationTime: Date.now(),
                        uuid: uuid
                    },
                    isDapp: __classPrivateFieldGet(_this, _SmartTransactionHook_isDapp, "f"),
                    isInSwapFlow: __classPrivateFieldGet(_this, _SmartTransactionHook_isInSwapFlow, "f"),
                    isSwapApproveTx: __classPrivateFieldGet(_this, _SmartTransactionHook_isSwapApproveTx, "f"),
                    isSwapTransaction: __classPrivateFieldGet(_this, _SmartTransactionHook_isSwapTransaction, "f")
                }
            });
            Logger_1["default"].log(LOG_PREFIX, 'Added approval', __classPrivateFieldGet(_this, _SmartTransactionHook_approvalId, "f"));
        });
        _SmartTransactionHook_updateApprovalRequest.set(this, function (_c) {
            var smartTransaction = _c.smartTransaction;
            return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!__classPrivateFieldGet(this, _SmartTransactionHook_approvalId, "f")) return [3 /*break*/, 2];
                            return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_approvalController, "f").updateRequestState({
                                    id: __classPrivateFieldGet(this, _SmartTransactionHook_approvalId, "f"),
                                    requestState: {
                                        // TODO: Replace "any" with type
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        smartTransaction: smartTransaction,
                                        isDapp: __classPrivateFieldGet(this, _SmartTransactionHook_isDapp, "f"),
                                        isInSwapFlow: __classPrivateFieldGet(this, _SmartTransactionHook_isInSwapFlow, "f"),
                                        isSwapApproveTx: __classPrivateFieldGet(this, _SmartTransactionHook_isSwapApproveTx, "f"),
                                        isSwapTransaction: __classPrivateFieldGet(this, _SmartTransactionHook_isSwapTransaction, "f")
                                    }
                                })];
                        case 1:
                            _d.sent();
                            _d.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        });
        _SmartTransactionHook_addListenerToUpdateStatusPage.set(this, function (_c) {
            var uuid = _c.uuid;
            return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_d) {
                    __classPrivateFieldGet(this, _SmartTransactionHook_smartTransactionsController, "f").eventEmitter.on("".concat(uuid, ":smartTransaction"), function (smartTransaction) { return __awaiter(_this, void 0, void 0, function () {
                        var status;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    status = smartTransaction.status;
                                    if (!status || status === types_1.SmartTransactionStatuses.PENDING) {
                                        return [2 /*return*/];
                                    }
                                    if (!(__classPrivateFieldGet(this, _SmartTransactionHook_shouldUpdateApprovalRequest, "f") && !__classPrivateFieldGet(this, _SmartTransactionHook_approvalEnded, "f"))) return [3 /*break*/, 2];
                                    return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_updateApprovalRequest, "f").call(this, {
                                            smartTransaction: smartTransaction
                                        })];
                                case 1:
                                    _c.sent();
                                    _c.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
                });
            });
        });
        _SmartTransactionHook_waitForTransactionHash.set(this, function (_c) {
            var uuid = _c.uuid;
            return new Promise(function (resolve) {
                __classPrivateFieldGet(_this, _SmartTransactionHook_smartTransactionsController, "f").eventEmitter.on("".concat(uuid, ":smartTransaction"), function (smartTransaction) { return __awaiter(_this, void 0, void 0, function () {
                    var status, statusMetadata;
                    return __generator(this, function (_c) {
                        status = smartTransaction.status, statusMetadata = smartTransaction.statusMetadata;
                        Logger_1["default"].log(LOG_PREFIX, 'Smart Transaction: ', smartTransaction);
                        if (!status || status === types_1.SmartTransactionStatuses.PENDING) {
                            return [2 /*return*/];
                        }
                        if (statusMetadata === null || statusMetadata === void 0 ? void 0 : statusMetadata.minedHash) {
                            Logger_1["default"].log(LOG_PREFIX, 'Smart Transaction - Received tx hash: ', statusMetadata === null || statusMetadata === void 0 ? void 0 : statusMetadata.minedHash);
                            resolve(statusMetadata.minedHash);
                        }
                        else {
                            // cancelled status will have statusMetadata?.minedHash === ''
                            resolve(null);
                        }
                        return [2 /*return*/];
                    });
                }); });
            });
        });
        _SmartTransactionHook_cleanup.set(this, function () {
            if (__classPrivateFieldGet(_this, _SmartTransactionHook_approvalEnded, "f")) {
                return;
            }
            __classPrivateFieldSet(_this, _SmartTransactionHook_approvalEnded, true, "f");
        });
        _SmartTransactionHook_updateSwapsTransactions.set(this, function (id) {
            // We do this so we can show the Swap data (e.g. ETH to USDC, fiat values) in the app/components/Views/TransactionsView/index.js
            var newSwapsTransactions = 
            // @ts-expect-error This is not defined on the type, but is a field added in app/components/UI/Swaps/QuotesView.js
            __classPrivateFieldGet(_this, _SmartTransactionHook_transactionController, "f").state.swapsTransactions || {};
            newSwapsTransactions[id] = newSwapsTransactions[__classPrivateFieldGet(_this, _SmartTransactionHook_transactionMeta, "f").id];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            __classPrivateFieldGet(_this, _SmartTransactionHook_transactionController, "f").update(function (state) {
                state.swapsTransactions = newSwapsTransactions;
            });
        });
        var transactionMeta = request.transactionMeta, smartTransactionsController = request.smartTransactionsController, transactionController = request.transactionController, shouldUseSmartTransaction = request.shouldUseSmartTransaction, approvalController = request.approvalController, featureFlags = request.featureFlags;
        __classPrivateFieldSet(this, _SmartTransactionHook_approvalId, undefined, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_approvalEnded, false, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_transactionMeta, transactionMeta, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_smartTransactionsController, smartTransactionsController, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_transactionController, transactionController, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_approvalController, approvalController, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_shouldUseSmartTransaction, shouldUseSmartTransaction, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_featureFlags, featureFlags, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_chainId, transactionMeta.chainId, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_txParams, transactionMeta.txParams, "f");
        var _c = (0, index_1.getTransactionType)(__classPrivateFieldGet(this, _SmartTransactionHook_transactionMeta, "f"), __classPrivateFieldGet(this, _SmartTransactionHook_chainId, "f")), isDapp = _c.isDapp, isSend = _c.isSend, isInSwapFlow = _c.isInSwapFlow, isSwapApproveTx = _c.isSwapApproveTx, isSwapTransaction = _c.isSwapTransaction, isNativeTokenTransferred = _c.isNativeTokenTransferred;
        __classPrivateFieldSet(this, _SmartTransactionHook_isDapp, isDapp, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_isSend, isSend, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_isInSwapFlow, isInSwapFlow, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_isSwapApproveTx, isSwapApproveTx, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_isSwapTransaction, isSwapTransaction, "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_isNativeTokenTransferred, isNativeTokenTransferred, "f");
        var approvalIdForPendingSwapApproveTx = __classPrivateFieldGet(this, _SmartTransactionHook_getApprovalIdForPendingSwapApproveTx, "f").call(this);
        if (approvalIdForPendingSwapApproveTx) {
            __classPrivateFieldSet(this, _SmartTransactionHook_approvalId, approvalIdForPendingSwapApproveTx, "f");
        }
        __classPrivateFieldSet(this, _SmartTransactionHook_shouldStartApprovalRequest, (0, index_1.getShouldStartApprovalRequest)(__classPrivateFieldGet(this, _SmartTransactionHook_isDapp, "f"), __classPrivateFieldGet(this, _SmartTransactionHook_isSend, "f"), __classPrivateFieldGet(this, _SmartTransactionHook_isSwapApproveTx, "f"), Boolean(approvalIdForPendingSwapApproveTx)), "f");
        __classPrivateFieldSet(this, _SmartTransactionHook_shouldUpdateApprovalRequest, (0, index_1.getShouldUpdateApprovalRequest)(__classPrivateFieldGet(this, _SmartTransactionHook_isDapp, "f"), __classPrivateFieldGet(this, _SmartTransactionHook_isSend, "f"), __classPrivateFieldGet(this, _SmartTransactionHook_isSwapTransaction, "f")), "f");
    }
    SmartTransactionHook.prototype.submit = function () {
        return __awaiter(this, void 0, void 0, function () {
            var useRegularTransactionSubmit, getFeesResponse, submitTransactionResponse, uuid, transactionHash, error_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Will cause TransactionController to publish to the RPC provider as normal.
                        Logger_1["default"].log(LOG_PREFIX, 'shouldUseSmartTransaction', __classPrivateFieldGet(this, _SmartTransactionHook_shouldUseSmartTransaction, "f"));
                        useRegularTransactionSubmit = { transactionHash: undefined };
                        if (!__classPrivateFieldGet(this, _SmartTransactionHook_shouldUseSmartTransaction, "f") ||
                            __classPrivateFieldGet(this, _SmartTransactionHook_transactionMeta, "f").origin === constants_2.RAMPS_SEND) {
                            return [2 /*return*/, useRegularTransactionSubmit];
                        }
                        Logger_1["default"].log(LOG_PREFIX, 'Started submit hook', __classPrivateFieldGet(this, _SmartTransactionHook_transactionMeta, "f").id, 'transactionMeta.type', __classPrivateFieldGet(this, _SmartTransactionHook_transactionMeta, "f").type);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, 6, 7]);
                        return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_getFees, "f").call(this)];
                    case 2:
                        getFeesResponse = _c.sent();
                        // In the event that STX health check passes, but for some reason /getFees fails, we fallback to a regular transaction
                        if (!getFeesResponse) {
                            return [2 /*return*/, useRegularTransactionSubmit];
                        }
                        return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_signAndSubmitTransactions, "f").call(this, {
                                getFeesResponse: getFeesResponse
                            })];
                    case 3:
                        submitTransactionResponse = _c.sent();
                        uuid = submitTransactionResponse === null || submitTransactionResponse === void 0 ? void 0 : submitTransactionResponse.uuid;
                        if (!uuid) {
                            throw new Error('No smart transaction UUID');
                        }
                        // We do this so we can show the Swap data (e.g. ETH to USDC, fiat values) in the app/components/Views/TransactionsView/index.js
                        if (__classPrivateFieldGet(this, _SmartTransactionHook_isSwapTransaction, "f") || __classPrivateFieldGet(this, _SmartTransactionHook_isSwapApproveTx, "f")) {
                            __classPrivateFieldGet(this, _SmartTransactionHook_updateSwapsTransactions, "f").call(this, uuid);
                        }
                        if (__classPrivateFieldGet(this, _SmartTransactionHook_shouldStartApprovalRequest, "f")) {
                            __classPrivateFieldGet(this, _SmartTransactionHook_addApprovalRequest, "f").call(this, {
                                uuid: uuid
                            });
                        }
                        if (__classPrivateFieldGet(this, _SmartTransactionHook_shouldUpdateApprovalRequest, "f")) {
                            __classPrivateFieldGet(this, _SmartTransactionHook_addListenerToUpdateStatusPage, "f").call(this, {
                                uuid: uuid
                            });
                        }
                        return [4 /*yield*/, __classPrivateFieldGet(this, _SmartTransactionHook_getTransactionHash, "f").call(this, submitTransactionResponse, uuid)];
                    case 4:
                        transactionHash = _c.sent();
                        return [2 /*return*/, { transactionHash: transactionHash }];
                    case 5:
                        error_2 = _c.sent();
                        Logger_1["default"].error(error_2, "".concat(LOG_PREFIX, " Error in smart transaction publish hook"));
                        throw error_2;
                    case 6:
                        __classPrivateFieldGet(this, _SmartTransactionHook_cleanup, "f").call(this);
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return SmartTransactionHook;
}());
_SmartTransactionHook_approvalEnded = new WeakMap(), _SmartTransactionHook_approvalId = new WeakMap(), _SmartTransactionHook_chainId = new WeakMap(), _SmartTransactionHook_featureFlags = new WeakMap(), _SmartTransactionHook_shouldUseSmartTransaction = new WeakMap(), _SmartTransactionHook_smartTransactionsController = new WeakMap(), _SmartTransactionHook_transactionController = new WeakMap(), _SmartTransactionHook_approvalController = new WeakMap(), _SmartTransactionHook_transactionMeta = new WeakMap(), _SmartTransactionHook_txParams = new WeakMap(), _SmartTransactionHook_isDapp = new WeakMap(), _SmartTransactionHook_isSend = new WeakMap(), _SmartTransactionHook_isInSwapFlow = new WeakMap(), _SmartTransactionHook_isSwapApproveTx = new WeakMap(), _SmartTransactionHook_isSwapTransaction = new WeakMap(), _SmartTransactionHook_isNativeTokenTransferred = new WeakMap(), _SmartTransactionHook_shouldStartApprovalRequest = new WeakMap(), _SmartTransactionHook_shouldUpdateApprovalRequest = new WeakMap(), _SmartTransactionHook_getFees = new WeakMap(), _SmartTransactionHook_getApprovalIdForPendingSwapApproveTx = new WeakMap(), _SmartTransactionHook_getTransactionHash = new WeakMap(), _SmartTransactionHook_applyFeeToTransaction = new WeakMap(), _SmartTransactionHook_createSignedTransactions = new WeakMap(), _SmartTransactionHook_signAndSubmitTransactions = new WeakMap(), _SmartTransactionHook_addApprovalRequest = new WeakMap(), _SmartTransactionHook_updateApprovalRequest = new WeakMap(), _SmartTransactionHook_addListenerToUpdateStatusPage = new WeakMap(), _SmartTransactionHook_waitForTransactionHash = new WeakMap(), _SmartTransactionHook_cleanup = new WeakMap(), _SmartTransactionHook_updateSwapsTransactions = new WeakMap();
var submitSmartTransactionHook = function (request) {
    var smartTransactionHook = new SmartTransactionHook(request);
    return smartTransactionHook.submit();
};
exports.submitSmartTransactionHook = submitSmartTransactionHook;
