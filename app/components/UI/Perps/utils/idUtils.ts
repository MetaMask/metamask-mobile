import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique ID for Perps-related entities
 * Uses UUID v4 for consistency and uniqueness across the application
 *
 * @param prefix - Optional prefix to add to the ID (e.g., 'deposit', 'withdrawal', 'order')
 * @returns A unique ID string
 *
 * @example
 * generatePerpsId() // "550e8400-e29b-41d4-a716-446655440000"
 * generatePerpsId('deposit') // "deposit-550e8400-e29b-41d4-a716-446655440000"
 * generatePerpsId('withdrawal') // "withdrawal-550e8400-e29b-41d4-a716-446655440000"
 */
export const generatePerpsId = (prefix?: string): string => {
  const id = uuidv4();
  return prefix ? `${prefix}-${id}` : id;
};

/**
 * Generates a unique ID for deposit requests
 * @returns A unique deposit ID string
 */
export const generateDepositId = (): string => generatePerpsId('deposit');

/**
 * Generates a unique ID for withdrawal requests
 * @returns A unique withdrawal ID string
 */
export const generateWithdrawalId = (): string => generatePerpsId('withdrawal');

/**
 * Generates a unique ID for orders
 * @returns A unique order ID string
 */
export const generateOrderId = (): string => generatePerpsId('order');

/**
 * Generates a unique ID for transactions
 * @returns A unique transaction ID string
 */
export const generateTransactionId = (): string =>
  generatePerpsId('transaction');
