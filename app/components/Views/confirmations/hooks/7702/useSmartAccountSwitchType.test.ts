import { TransactionMeta } from '@metamask/transaction-controller';

import {
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
  mockTransaction,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSmartAccountSwitchType } from './useSmartAccountSwitchType';

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
    TransactionController: {
      getNonceLock: jest.fn().mockReturnValue({ releaseLock: jest.fn() }),
      updateTransaction: jest.fn(),
    },
  },
}));

function runHook(confirmation: TransactionMeta) {
  const { result, rerender } = renderHookWithProvider(
    () => useSmartAccountSwitchType(),
    {
      state: getAppStateForConfirmation(confirmation),
    },
  );
  return { result: result.current, rerender };
}

describe('useSmartAccountSwitchType', () => {
  it('returns correct result for downgrade account type transaction', () => {
    const { result } = runHook(downgradeAccountConfirmation);
    expect(result.isDowngrade).toBe(true);
    expect(result.isUpgrade).toBe(false);
    expect(result.isUpgradeOnly).toBe(false);
    expect(result.isAccountTypeSwitchOnly).toBe(true);
  });

  it('returns correct result for upgrade + batched account type transaction', () => {
    const { result } = runHook(upgradeAccountConfirmation);
    expect(result.isDowngrade).toBe(false);
    expect(result.isUpgrade).toBe(true);
    expect(result.isUpgradeOnly).toBe(false);
    expect(result.isAccountTypeSwitchOnly).toBe(false);
  });

  it('returns correct result for upgrade only account type transaction', () => {
    const { result } = runHook(upgradeOnlyAccountConfirmation);
    expect(result.isDowngrade).toBe(false);
    expect(result.isUpgrade).toBe(true);
    expect(result.isUpgradeOnly).toBe(true);
    expect(result.isAccountTypeSwitchOnly).toBe(true);
  });

  it('returns correct result for other transaction', () => {
    const { result } = runHook(mockTransaction);
    expect(result.isDowngrade).toBe(false);
    expect(result.isUpgrade).toBe(false);
    expect(result.isUpgradeOnly).toBe(false);
    expect(result.isAccountTypeSwitchOnly).toBe(false);
  });
});
