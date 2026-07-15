import { RootState } from '../../../../reducers';
import { selectMerklClaimTransactions } from './merklClaimTransactions';
import { MERKL_CLAIM_ORIGIN } from '../components/MerklRewards/constants';

const createState = (transactions: unknown[]): RootState =>
  ({
    engine: {
      backgroundState: {
        TransactionController: {
          transactions,
        },
      },
    },
  }) as unknown as RootState;

describe('selectMerklClaimTransactions', () => {
  it('returns only transactions with Merkl claim origin', () => {
    const transactions = [
      { id: 'tx-1', origin: MERKL_CLAIM_ORIGIN },
      { id: 'tx-2', origin: 'other-origin' },
      { id: 'tx-3', origin: MERKL_CLAIM_ORIGIN },
    ];
    const state = createState(transactions);

    const result = selectMerklClaimTransactions(state);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'tx-1', origin: MERKL_CLAIM_ORIGIN });
    expect(result[1]).toMatchObject({ id: 'tx-3', origin: MERKL_CLAIM_ORIGIN });
  });

  it('returns empty array when no Merkl claim transactions exist', () => {
    const transactions = [
      { id: 'tx-1', origin: 'metamask' },
      { id: 'tx-2', origin: 'dapp-origin' },
    ];
    const state = createState(transactions);

    const result = selectMerklClaimTransactions(state);

    expect(result).toEqual([]);
  });

  it('returns empty array when transactions array is empty', () => {
    const state = createState([]);

    const result = selectMerklClaimTransactions(state);

    expect(result).toEqual([]);
  });

  it('filters out transactions with undefined origin', () => {
    const transactions = [
      { id: 'tx-1' },
      { id: 'tx-2', origin: MERKL_CLAIM_ORIGIN },
    ];
    const state = createState(transactions);

    const result = selectMerklClaimTransactions(state);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'tx-2' });
  });
});
