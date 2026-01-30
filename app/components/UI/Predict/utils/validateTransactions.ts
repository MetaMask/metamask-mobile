import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import Logger, { type LoggerErrorOptions } from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';

const MIN_VALID_DATA_LENGTH = 10;
const VALID_ADDRESS_LENGTH = 42;

interface DepositTransaction {
  params?: {
    to?: Hex;
    data?: Hex;
  };
  type?: TransactionType;
}

interface ValidationContext {
  providerId: string;
}

function getErrorContext(
  method: string,
  additionalData: Record<string, unknown>,
): LoggerErrorOptions {
  return {
    tags: {
      feature: PREDICT_CONSTANTS.FEATURE_NAME,
      provider: 'polymarket',
    },
    context: {
      name: 'PredictController',
      data: {
        method,
        ...additionalData,
      },
    },
  };
}

export function validateDepositTransactions(
  transactions: DepositTransaction[],
  context: ValidationContext,
): void {
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    if (!tx) {
      Logger.error(
        new Error(
          `Invalid transaction at index ${i}: transaction is null or undefined`,
        ),
        getErrorContext('depositWithConfirmation', {
          providerId: context.providerId,
          transactionIndex: i,
        }),
      );
      throw new Error(
        `Invalid transaction: transaction at index ${i} is null or undefined`,
      );
    }

    if (!tx.params) {
      Logger.error(
        new Error(
          `Invalid transaction at index ${i}: params object is missing`,
        ),
        getErrorContext('depositWithConfirmation', {
          providerId: context.providerId,
          transactionIndex: i,
          transactionType: tx.type,
        }),
      );
      throw new Error(
        `Invalid transaction: transaction at index ${i} is missing params object`,
      );
    }

    if (!tx.params.to) {
      Logger.error(
        new Error(`Invalid transaction at index ${i}: 'to' address is missing`),
        getErrorContext('depositWithConfirmation', {
          providerId: context.providerId,
          transactionIndex: i,
          transactionType: tx.type,
        }),
      );
      throw new Error(
        `Invalid transaction: transaction at index ${i} is missing 'to' address`,
      );
    }

    if (
      typeof tx.params.to !== 'string' ||
      !tx.params.to.startsWith('0x') ||
      tx.params.to.length !== VALID_ADDRESS_LENGTH
    ) {
      Logger.error(
        new Error(
          `Invalid transaction at index ${i}: 'to' address has invalid format (${tx.params.to})`,
        ),
        getErrorContext('depositWithConfirmation', {
          providerId: context.providerId,
          transactionIndex: i,
          transactionType: tx.type,
          toAddress: tx.params.to,
        }),
      );
      throw new Error(
        `Invalid transaction: transaction at index ${i} has invalid 'to' address format`,
      );
    }

    if (!tx.params.data) {
      Logger.error(
        new Error(`Invalid transaction at index ${i}: data is missing`),
        getErrorContext('depositWithConfirmation', {
          providerId: context.providerId,
          transactionIndex: i,
          transactionType: tx.type,
        }),
      );
      throw new Error(
        `Invalid transaction: transaction at index ${i} is missing data`,
      );
    }

    if (
      typeof tx.params.data !== 'string' ||
      !tx.params.data.startsWith('0x')
    ) {
      Logger.error(
        new Error(
          `Invalid transaction at index ${i}: data has invalid hex format`,
        ),
        getErrorContext('depositWithConfirmation', {
          providerId: context.providerId,
          transactionIndex: i,
          transactionType: tx.type,
          dataPrefix: tx.params.data?.slice?.(0, 10),
        }),
      );
      throw new Error(
        `Invalid transaction: transaction at index ${i} has invalid data format (must be hex string starting with 0x)`,
      );
    }

    if (tx.params.data.length < MIN_VALID_DATA_LENGTH) {
      Logger.error(
        new Error(
          `Invalid transaction at index ${i}: data length ${tx.params.data.length} is less than minimum ${MIN_VALID_DATA_LENGTH}`,
        ),
        getErrorContext('depositWithConfirmation', {
          providerId: context.providerId,
          transactionIndex: i,
          transactionType: tx.type,
          dataLength: tx.params.data.length,
        }),
      );
      throw new Error(
        `Invalid transaction: transaction at index ${i} has insufficient data (length: ${tx.params.data.length}, minimum: ${MIN_VALID_DATA_LENGTH})`,
      );
    }
  }
}
