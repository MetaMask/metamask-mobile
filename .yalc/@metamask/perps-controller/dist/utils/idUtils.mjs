import { v4 as uuidv4 } from "uuid";
export const generatePerpsId = (prefix) => {
    const id = uuidv4();
    return prefix ? `${prefix}-${id}` : id;
};
export const generateDepositId = () => generatePerpsId('deposit');
export const generateWithdrawalId = () => generatePerpsId('withdrawal');
export const generateOrderId = () => generatePerpsId('order');
export const generateTransactionId = () => generatePerpsId('transaction');
//# sourceMappingURL=idUtils.mjs.map