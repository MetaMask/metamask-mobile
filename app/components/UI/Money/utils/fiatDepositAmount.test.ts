import { TransactionMeta } from '@metamask/transaction-controller';
import { getFiatDepositAttemptedAmount } from './fiatDepositAmount';

const makeTx = (metamaskPay?: Record<string, unknown>): TransactionMeta =>
  ({ id: 'tx-1', metamaskPay }) as unknown as TransactionMeta;

describe('getFiatDepositAttemptedAmount', () => {
  it('subtracts the provider and network fees from the quoted total', () => {
    expect(
      getFiatDepositAttemptedAmount(
        makeTx({
          totalFiat: '6.14',
          bridgeFeeFiat: '1.14',
          networkFeeFiat: '0',
        }),
      ),
    ).toBe('5.00');
  });

  it('treats a missing network fee as zero', () => {
    expect(
      getFiatDepositAttemptedAmount(
        makeTx({ totalFiat: '6.14', bridgeFeeFiat: '1.14' }),
      ),
    ).toBe('5.00');
  });

  it('subtracts both fees', () => {
    expect(
      getFiatDepositAttemptedAmount(
        makeTx({
          totalFiat: '6.14',
          bridgeFeeFiat: '1.00',
          networkFeeFiat: '0.14',
        }),
      ),
    ).toBe('5.00');
  });

  it.each([
    undefined,
    {},
    { bridgeFeeFiat: '1.14' },
    { totalFiat: '0' },
    { totalFiat: 'not-a-number' },
    { totalFiat: '1.14', bridgeFeeFiat: '1.14' },
    { totalFiat: '1.00', bridgeFeeFiat: '0.50', networkFeeFiat: '0.50' },
    { totalFiat: '2.00', bridgeFeeFiat: '-1.00' },
  ])('returns undefined for %s', (metamaskPay) => {
    expect(
      getFiatDepositAttemptedAmount(
        makeTx(metamaskPay as Record<string, unknown> | undefined),
      ),
    ).toBeUndefined();
  });
});
