import { TransactionMeta } from '@metamask/transaction-controller';

import {
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
  mockTransaction,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { use7702TransactionType } from './use7702TransactionType';

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    TransactionController: {
      getNonceLock: jest.fn().mockReturnValue({ releaseLock: jest.fn() }),
      updateTransaction: jest.fn(),
    },
  },
}));

function runHook(confirmation: TransactionMeta) {
  const { result, rerender } = renderHookWithProvider(
    () => use7702TransactionType(),
    {
      state: getAppStateForConfirmation(confirmation),
    },
  );
  return { result: result.current, rerender };
}

describe('use7702TransactionType', () => {
  it('returns correct result for downgrade account type transaction', () => {
    const { result } = runHook(downgradeAccountConfirmation);
    expect(result.is7702transaction).toBe(true);
    expect(result.isDowngrade).toBe(true);
    expect(result.isUpgrade).toBe(false);
    expect(result.isUpgradeOnly).toBe(false);
    expect(result.isBatched).toBe(false);
    expect(result.isBatchedUpgrade).toBe(false);
  });

  it('returns correct result for upgrade + batched account type transaction', () => {
    const { result } = runHook(upgradeAccountConfirmation);
    expect(result.is7702transaction).toBe(true);
    expect(result.isDowngrade).toBe(false);
    expect(result.isUpgrade).toBe(true);
    expect(result.isUpgradeOnly).toBe(false);
    expect(result.isBatched).toBe(true);
    expect(result.isBatchedUpgrade).toBe(true);
  });

  it('returns correct result for upgrade only account type transaction', () => {
    const { result } = runHook(upgradeOnlyAccountConfirmation);
    expect(result.is7702transaction).toBe(true);
    expect(result.isDowngrade).toBe(false);
    expect(result.isUpgrade).toBe(true);
    expect(result.isUpgradeOnly).toBe(true);
    expect(result.isBatched).toBe(false);
    expect(result.isBatchedUpgrade).toBe(false);
  });

  it('returns correct result for other transaction', () => {
    const { result } = runHook(mockTransaction);
    expect(result.is7702transaction).toBe(false);
    expect(result.isDowngrade).toBe(false);
    expect(result.isUpgrade).toBe(false);
    expect(result.isUpgradeOnly).toBe(false);
    expect(result.isBatched).toBe(false);
    expect(result.isBatchedUpgrade).toBe(false);
  });
});
