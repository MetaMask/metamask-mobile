import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import { validateDepositTransactions } from './validateTransactions';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockLoggerError = Logger.error as jest.Mock;

const VALID_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Hex;
const VALID_DATA = '0x095ea7b3000000000000000000000000' as Hex;

function createValidTransaction(overrides = {}) {
  return {
    params: {
      to: VALID_ADDRESS,
      data: VALID_DATA,
    },
    type: TransactionType.contractInteraction,
    ...overrides,
  };
}

describe('validateDepositTransactions', () => {
  const context = { providerId: 'polymarket' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes validation for valid transactions', () => {
    const transactions = [createValidTransaction(), createValidTransaction()];

    expect(() =>
      validateDepositTransactions(transactions, context),
    ).not.toThrow();
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('throws error when transaction is null', () => {
    const transactions = [null as never];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      'Invalid transaction: transaction at index 0 is null or undefined',
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('throws error when transaction is undefined', () => {
    const transactions = [undefined as never];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      'Invalid transaction: transaction at index 0 is null or undefined',
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('throws error when params object is missing', () => {
    const transactions = [
      { type: TransactionType.contractInteraction } as never,
    ];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      'Invalid transaction: transaction at index 0 is missing params object',
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('throws error when to address is missing', () => {
    const transactions = [
      createValidTransaction({ params: { data: VALID_DATA } }),
    ];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      "Invalid transaction: transaction at index 0 is missing 'to' address",
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('throws error when to address is too short', () => {
    const transactions = [
      createValidTransaction({ params: { to: '0xshort', data: VALID_DATA } }),
    ];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      "Invalid transaction: transaction at index 0 has invalid 'to' address format",
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('throws error when to address does not start with 0x', () => {
    const transactions = [
      createValidTransaction({
        params: {
          to: '1234567890123456789012345678901234567890ab',
          data: VALID_DATA,
        },
      }),
    ];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      "Invalid transaction: transaction at index 0 has invalid 'to' address format",
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('throws error when data is missing', () => {
    const transactions = [
      createValidTransaction({ params: { to: VALID_ADDRESS } }),
    ];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      'Invalid transaction: transaction at index 0 is missing data',
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('throws error when data does not start with 0x', () => {
    const transactions = [
      createValidTransaction({
        params: { to: VALID_ADDRESS, data: 'not-hex-data' },
      }),
    ];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      'Invalid transaction: transaction at index 0 has invalid data format (must be hex string starting with 0x)',
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('throws error when data is too short', () => {
    const transactions = [
      createValidTransaction({ params: { to: VALID_ADDRESS, data: '0x1234' } }),
    ];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      'Invalid transaction: transaction at index 0 has insufficient data (length: 6, minimum: 10)',
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('validates all transactions in array', () => {
    const transactions = [
      createValidTransaction(),
      createValidTransaction({ params: { to: VALID_ADDRESS, data: '0x1234' } }),
    ];

    expect(() => validateDepositTransactions(transactions, context)).toThrow(
      'Invalid transaction: transaction at index 1 has insufficient data (length: 6, minimum: 10)',
    );
  });

  it('logs error with correct context', () => {
    const transactions = [
      { type: TransactionType.contractInteraction } as never,
    ];

    expect(() => validateDepositTransactions(transactions, context)).toThrow();

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: 'Predict',
          provider: 'polymarket',
        }),
        context: expect.objectContaining({
          name: 'PredictController',
          data: expect.objectContaining({
            method: 'depositWithConfirmation',
            providerId: 'polymarket',
            transactionIndex: 0,
          }),
        }),
      }),
    );
  });
});
