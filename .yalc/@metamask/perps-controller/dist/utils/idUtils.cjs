"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTransactionId = exports.generateOrderId = exports.generateWithdrawalId = exports.generateDepositId = exports.generatePerpsId = void 0;
const uuid_1 = require("uuid");
const generatePerpsId = (prefix) => {
    const id = (0, uuid_1.v4)();
    return prefix ? `${prefix}-${id}` : id;
};
exports.generatePerpsId = generatePerpsId;
const generateDepositId = () => (0, exports.generatePerpsId)('deposit');
exports.generateDepositId = generateDepositId;
const generateWithdrawalId = () => (0, exports.generatePerpsId)('withdrawal');
exports.generateWithdrawalId = generateWithdrawalId;
const generateOrderId = () => (0, exports.generatePerpsId)('order');
exports.generateOrderId = generateOrderId;
const generateTransactionId = () => (0, exports.generatePerpsId)('transaction');
exports.generateTransactionId = generateTransactionId;
//# sourceMappingURL=idUtils.cjs.map