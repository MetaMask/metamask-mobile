import {
  SolScope,
  type Transaction,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import {
  getMultichainTransactionDetailEventProperties,
  mapMultichainTransactionToActivityItem,
} from './MultichainAssetDetailsActivityListItem.utils';

const createTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 'tx-1',
    account: 'from',
    chain: SolScope.Mainnet,
    events: [],
    fees: [],
    status: TransactionStatus.Confirmed,
    timestamp: 1,
    type: TransactionType.Send,
    from: [
      {
        address: 'from',
        asset: {
          fungible: true,
          amount: '1',
          unit: 'SOL',
          type: `${SolScope.Mainnet}/slip44:501`,
        },
      },
    ],
    to: [{ address: 'to', asset: null }],
    ...overrides,
  }) as Transaction;

describe('MultichainAssetDetailsActivityListItem utils', () => {
  it('maps keyring transaction to activity item with fallback chain id', () => {
    const transaction = createTransaction({ chain: undefined });

    const item = mapMultichainTransactionToActivityItem({
      transaction,
      chainId: SolScope.Mainnet,
    });

    expect(item).toEqual(
      expect.objectContaining({
        chainId: SolScope.Mainnet,
        hash: 'tx-1',
        raw: expect.objectContaining({
          type: 'keyringTransaction',
        }),
        type: 'send',
      }),
    );
  });

  it('builds transaction detail event properties with asset details location', () => {
    const transaction = createTransaction();

    expect(
      getMultichainTransactionDetailEventProperties({
        transaction,
        chainId: SolScope.Mainnet,
        location: TransactionDetailLocation.AssetDetails,
      }),
    ).toStrictEqual({
      transaction_type: TransactionType.Send,
      transaction_status: TransactionStatus.Confirmed,
      location: TransactionDetailLocation.AssetDetails,
      chain_id_source: SolScope.Mainnet,
      chain_id_destination: SolScope.Mainnet,
    });
  });

  it('defaults transaction detail event location to home', () => {
    const transaction = createTransaction({ status: undefined });

    expect(
      getMultichainTransactionDetailEventProperties({
        transaction,
        chainId: SolScope.Mainnet,
      }),
    ).toEqual(
      expect.objectContaining({
        location: TransactionDetailLocation.Home,
        transaction_status: 'unknown',
      }),
    );
  });
});
