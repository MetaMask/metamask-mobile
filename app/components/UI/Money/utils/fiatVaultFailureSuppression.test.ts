import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  isFiatVaultOnlyFailure,
  isRestartInterruptedFiatDeposit,
} from './fiatVaultFailureSuppression';

const baseTx = {
  id: 'tx-1',
  time: 0,
  txParams: {},
} as unknown as TransactionMeta;

function makeDepositTx(
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta {
  return {
    ...baseTx,
    type: TransactionType.moneyAccountDeposit,
    status: TransactionStatus.failed,
    metamaskPay: { fiat: { orderId: 'order-1', provider: 'transak-native' } },
    error: { name: 'forced', message: 'Post-Ramp: Direct mUSD: Vault: forced' },
    ...overrides,
  } as unknown as TransactionMeta;
}

describe('isFiatVaultOnlyFailure', () => {
  it('returns true for a failed money deposit with a fiat marker and Vault error', () => {
    const tx = makeDepositTx();

    expect(isFiatVaultOnlyFailure(tx)).toBe(true);
  });

  it('returns true when the moneyAccountDeposit type is nested in a batch', () => {
    const tx = makeDepositTx({
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
    } as Partial<TransactionMeta>);

    expect(isFiatVaultOnlyFailure(tx)).toBe(true);
  });

  it('returns false when the transaction is not failed', () => {
    const tx = makeDepositTx({ status: TransactionStatus.confirmed });

    expect(isFiatVaultOnlyFailure(tx)).toBe(false);
  });

  it('returns false when the transaction is not a money deposit', () => {
    const tx = makeDepositTx({ type: TransactionType.simpleSend });

    expect(isFiatVaultOnlyFailure(tx)).toBe(false);
  });

  it('returns false when there is no fiat marker', () => {
    const tx = makeDepositTx({ metamaskPay: undefined });

    expect(isFiatVaultOnlyFailure(tx)).toBe(false);
  });

  it('returns false when the error message has no Vault marker', () => {
    const tx = makeDepositTx({
      error: { name: 'other', message: 'Post-Ramp: order cancelled' },
    });

    expect(isFiatVaultOnlyFailure(tx)).toBe(false);
  });

  it('returns false when there is no error at all', () => {
    const tx = makeDepositTx({ error: undefined });

    expect(isFiatVaultOnlyFailure(tx)).toBe(false);
  });
});

describe('isRestartInterruptedFiatDeposit', () => {
  function makeRestartTx(
    overrides: Partial<TransactionMeta> = {},
  ): TransactionMeta {
    return makeDepositTx({
      error: {
        name: 'forced',
        message: 'Transaction incomplete at startup',
      },
      ...overrides,
    });
  }

  it('returns true for a failed money deposit with a fiat order and the startup marker', () => {
    const tx = makeRestartTx();

    expect(isRestartInterruptedFiatDeposit(tx)).toBe(true);
  });

  it('returns false when the transaction is not failed', () => {
    const tx = makeRestartTx({ status: TransactionStatus.confirmed });

    expect(isRestartInterruptedFiatDeposit(tx)).toBe(false);
  });

  it('returns false when the transaction is not a money deposit', () => {
    const tx = makeRestartTx({ type: TransactionType.simpleSend });

    expect(isRestartInterruptedFiatDeposit(tx)).toBe(false);
  });

  it('returns false when there is no fiat order id', () => {
    const tx = makeRestartTx({
      metamaskPay: { fiat: { orderId: '', provider: 'transak-native' } },
    });

    expect(isRestartInterruptedFiatDeposit(tx)).toBe(false);
  });

  it('returns false when the error message has no startup marker', () => {
    const tx = makeRestartTx({
      error: { name: 'other', message: 'Post-Ramp: Direct mUSD: Vault: x' },
    });

    expect(isRestartInterruptedFiatDeposit(tx)).toBe(false);
  });
});
