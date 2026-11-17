import {
  SolScope,
  type Transaction,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { MonetizedPrimitive } from '../../../core/Analytics/MetaMetrics.types';
import { getMultichainTransactionDetailEventProperties } from './MultichainAssetDetailsActivityListItem.utils';

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
  it('builds transaction detail event properties with asset details location', () => {
    const transaction = createTransaction();

    expect(
      getMultichainTransactionDetailEventProperties({
        transaction,
        chainId: SolScope.Mainnet,
        location: TransactionDetailLocation.AssetDetails,
      }),
    ).toEqual(
      expect.objectContaining({
        location: TransactionDetailLocation.AssetDetails,
        chain_id_source: SolScope.Mainnet,
        chain_id_destination: SolScope.Mainnet,
        transaction_type: 'send',
      }),
    );
  });

  it('reports the quote chains as CAIP ids and the swaps primitive when a bridge history entry exists', () => {
    const transaction = createTransaction();

    expect(
      getMultichainTransactionDetailEventProperties({
        transaction,
        chainId: SolScope.Mainnet,
        bridgeHistoryItem: {
          status: { status: 'COMPLETE' },
          quote: {
            srcChainId: SolScope.Mainnet,
            destChainId: 'eip155:1',
            srcAsset: { chainId: SolScope.Mainnet },
            destAsset: { chainId: 'eip155:1' },
          },
        } as never,
      }),
    ).toEqual(
      expect.objectContaining({
        transaction_type: 'bridge',
        monetized_primitive: MonetizedPrimitive.Swaps,
        chain_id_source: SolScope.Mainnet,
        chain_id_destination: 'eip155:1',
      }),
    );
  });

  it('classifies a same-chain bridge history entry as a swap', () => {
    const transaction = createTransaction();

    expect(
      getMultichainTransactionDetailEventProperties({
        transaction,
        chainId: SolScope.Mainnet,
        bridgeHistoryItem: {
          status: { status: 'COMPLETE' },
          quote: {
            srcChainId: SolScope.Mainnet,
            destChainId: SolScope.Mainnet,
            srcAsset: { chainId: SolScope.Mainnet },
            destAsset: { chainId: SolScope.Mainnet },
          },
        } as never,
      }),
    ).toEqual(
      expect.objectContaining({
        transaction_type: 'swap',
        monetized_primitive: MonetizedPrimitive.Swaps,
      }),
    );
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
