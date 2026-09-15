import type { TransactionMeta } from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { useLocalTransactionMeta } from './useLocalTransactionMeta';

const confirmedTx = {
  id: 'confirmed-id',
  hash: '0xabc',
  chainId: '0x1',
} as unknown as TransactionMeta;

const pendingTx = {
  id: 'pending-id',
  chainId: '0x89',
} as unknown as TransactionMeta;

const stateWithTransactions = {
  engine: {
    backgroundState: {
      ...backgroundState,
      TransactionController: {
        ...backgroundState.TransactionController,
        transactions: [confirmedTx, pendingTx],
      },
    },
  },
};

describe('useLocalTransactionMeta', () => {
  it('returns the transaction matching the on-chain hash', () => {
    const { result } = renderHookWithProvider(
      () => useLocalTransactionMeta('0xABC'),
      { state: stateWithTransactions },
    );

    expect(result.current).toBe(confirmedTx);
  });

  it('returns the transaction matching the meta id when no hash matches', () => {
    const { result } = renderHookWithProvider(
      () => useLocalTransactionMeta('pending-id'),
      { state: stateWithTransactions },
    );

    expect(result.current).toBe(pendingTx);
  });

  it('returns undefined when no transaction matches', () => {
    const { result } = renderHookWithProvider(
      () => useLocalTransactionMeta('0xmissing'),
      { state: stateWithTransactions },
    );

    expect(result.current).toBeUndefined();
  });
});
