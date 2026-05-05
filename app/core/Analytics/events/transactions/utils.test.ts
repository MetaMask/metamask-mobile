import { TransactionType } from '@metamask/transaction-controller';
import { MonetizedPrimitive } from '../../MetaMetrics.types';
import { getMonetizedPrimitive } from './utils';

describe('getMonetizedPrimitive', () => {
  it.each([
    [TransactionType.swap, MonetizedPrimitive.Swaps],
    [TransactionType.swapApproval, MonetizedPrimitive.Swaps],
    [TransactionType.swapAndSend, MonetizedPrimitive.Swaps],
    [TransactionType.bridge, MonetizedPrimitive.Swaps],
    [TransactionType.bridgeApproval, MonetizedPrimitive.Swaps],
    [TransactionType.perpsDeposit, MonetizedPrimitive.Perps],
    [TransactionType.perpsDepositAndOrder, MonetizedPrimitive.Perps],
    [TransactionType.perpsWithdraw, MonetizedPrimitive.Perps],
    [TransactionType.predictDeposit, MonetizedPrimitive.Predict],
    [TransactionType.predictWithdraw, MonetizedPrimitive.Predict],
    [TransactionType.predictClaim, MonetizedPrimitive.Predict],
    [TransactionType.moneyAccountDeposit, MonetizedPrimitive.MoneyAccount],
    [TransactionType.moneyAccountWithdraw, MonetizedPrimitive.MoneyAccount],
  ])('returns %s for %s', (transactionType, expected) => {
    expect(getMonetizedPrimitive(transactionType)).toBe(expected);
  });

  it('returns undefined for unrelated transaction types', () => {
    expect(getMonetizedPrimitive(TransactionType.simpleSend)).toBeUndefined();
    expect(
      getMonetizedPrimitive(TransactionType.contractInteraction),
    ).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(getMonetizedPrimitive(undefined)).toBeUndefined();
  });

  it('returns undefined for unknown string input', () => {
    expect(getMonetizedPrimitive('not_a_real_type')).toBeUndefined();
  });
});
