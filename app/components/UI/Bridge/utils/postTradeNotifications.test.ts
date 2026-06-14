import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { NotificationSkipPredicate } from '../../../../core/notificationSkipPredicates';

const mockRegisterNotificationSkipPredicate = jest.fn();
const mockGetIsBridgeTransaction = jest.fn();

jest.mock('../../../../core/notificationSkipPredicates', () => ({
  __esModule: true,
  registerNotificationSkipPredicate: mockRegisterNotificationSkipPredicate,
}));

jest.mock('./transaction', () => ({
  __esModule: true,
  getIsBridgeTransaction: mockGetIsBridgeTransaction,
}));

const loadPostTradeNotifications = () => {
  jest.resetModules();
  mockRegisterNotificationSkipPredicate.mockReset();
  mockGetIsBridgeTransaction.mockReset();

  return jest.requireActual(
    './postTradeNotifications',
  ) as typeof import('./postTradeNotifications');
};

const getRegisteredPredicate = (): NotificationSkipPredicate => {
  expect(mockRegisterNotificationSkipPredicate).toHaveBeenCalledTimes(1);
  return mockRegisterNotificationSkipPredicate.mock
    .calls[0][0] as NotificationSkipPredicate;
};

const transactionMeta = (
  txMeta: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({
    id: 'tx-1',
    type: TransactionType.contractInteraction,
    ...txMeta,
  }) as TransactionMeta;

describe('postTradeNotifications', () => {
  it('registers once and suppresses tracked submissions only while a surface is visible', async () => {
    const {
      showPostTradeNotificationSurface,
      hidePostTradeNotificationSurface,
      withPostTradeNotificationSuppression,
    } = loadPostTradeNotifications();

    showPostTradeNotificationSurface();
    showPostTradeNotificationSurface();

    expect(mockRegisterNotificationSkipPredicate).toHaveBeenCalledTimes(1);

    await expect(
      withPostTradeNotificationSuppression(() =>
        Promise.resolve({ id: 'submitted-tx' }),
      ),
    ).resolves.toEqual({ id: 'submitted-tx' });

    const predicate = getRegisteredPredicate();

    expect(predicate(transactionMeta({ id: 'submitted-tx' }))).toBe(true);
    expect(predicate(transactionMeta({ id: 'untracked-tx' }))).toBe(false);

    hidePostTradeNotificationSurface();
    hidePostTradeNotificationSurface();
    hidePostTradeNotificationSurface();

    expect(predicate(transactionMeta({ id: 'submitted-tx' }))).toBe(false);
  });

  it('suppresses in-flight Bridge and batch transactions while a surface is visible', async () => {
    const {
      showPostTradeNotificationSurface,
      withPostTradeNotificationSuppression,
    } = loadPostTradeNotifications();
    const bridgeTxMeta = transactionMeta({ id: 'bridge-tx' });
    const batchTxMeta = transactionMeta({
      id: 'batch-tx',
      type: TransactionType.batch,
    });

    showPostTradeNotificationSurface();

    await withPostTradeNotificationSuppression(async () => {
      const predicate = getRegisteredPredicate();

      mockGetIsBridgeTransaction.mockReturnValueOnce(true);
      expect(predicate(bridgeTxMeta)).toBe(true);
      expect(mockGetIsBridgeTransaction).toHaveBeenCalledWith(bridgeTxMeta);

      mockGetIsBridgeTransaction.mockReturnValueOnce(false);
      expect(predicate(batchTxMeta)).toBe(true);

      return { id: 'submitted-batch-tx' };
    });
  });

  it('does not suppress missing or unrelated transaction metadata', async () => {
    const {
      showPostTradeNotificationSurface,
      withPostTradeNotificationSuppression,
    } = loadPostTradeNotifications();

    showPostTradeNotificationSurface();
    mockGetIsBridgeTransaction.mockReturnValue(false);

    await withPostTradeNotificationSuppression(async () => {
      const predicate = getRegisteredPredicate();

      expect(predicate(undefined)).toBe(false);
      expect(predicate(transactionMeta({ id: 'unrelated-tx' }))).toBe(false);

      return undefined;
    });
  });

  it('clears pending submission state when submit fails', async () => {
    const {
      showPostTradeNotificationSurface,
      withPostTradeNotificationSuppression,
    } = loadPostTradeNotifications();
    const bridgeTxMeta = transactionMeta({ id: 'bridge-tx' });
    const error = new Error('submit failed');

    showPostTradeNotificationSurface();
    mockGetIsBridgeTransaction.mockReturnValue(true);

    await expect(
      withPostTradeNotificationSuppression(async () => {
        const predicate = getRegisteredPredicate();

        expect(predicate(bridgeTxMeta)).toBe(true);

        throw error;
      }),
    ).rejects.toThrow(error);

    const predicate = getRegisteredPredicate();

    expect(predicate(bridgeTxMeta)).toBe(false);
  });
});
