import { v4 as uuidv4 } from 'uuid';

export const generatePerpsId = (prefix?: string): string => {
  const id = uuidv4();
  return prefix ? `${prefix}-${id}` : id;
};

export const generateDepositId = (): string => generatePerpsId('deposit');
export const generateWithdrawalId = (): string => generatePerpsId('withdrawal');
export const generateOrderId = (): string => generatePerpsId('order');
export const generateTransactionId = (): string =>
  generatePerpsId('transaction');
