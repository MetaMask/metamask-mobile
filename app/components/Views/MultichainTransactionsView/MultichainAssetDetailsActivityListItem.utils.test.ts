import {
  SolScope,
  type Transaction,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import { mapKeyringTransaction } from '@metamask/client-utils';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { MonetizedPrimitive } from '../../../core/Analytics/MetaMetrics.types';
import {
  enrichKeyringActivityWithBridge,
  type ActivityListItem,
} from '../../../util/activity-adapters';
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
  it('maps a keyring transaction to an activity item on its own chain', () => {
    const transaction = createTransaction();

    const item = {
      ...mapKeyringTransaction({ transaction }),
      raw: { type: 'keyringTransaction' as const, data: transaction },
    } as ActivityListItem;

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

  it('maps a keyring swap that carries cross-chain bridge history to a bridge item', () => {
    const transaction = createTransaction({ type: TransactionType.Swap });

    const item = enrichKeyringActivityWithBridge(
      {
        ...mapKeyringTransaction({ transaction }),
        raw: { type: 'keyringTransaction' as const, data: transaction },
      } as ActivityListItem,
      {
        status: { status: 'COMPLETE' },
        quote: {
          srcChainId: SolScope.Mainnet,
          destChainId: 'eip155:1',
          srcTokenAmount: '1000000000',
          destTokenAmount: '1000000',
          srcAsset: {
            chainId: SolScope.Mainnet,
            assetId: `${SolScope.Mainnet}/slip44:501`,
            decimals: 9,
            symbol: 'SOL',
          },
          destAsset: {
            chainId: 'eip155:1',
            assetId: 'eip155:1/slip44:60',
            decimals: 6,
            symbol: 'USDC',
          },
        },
      } as never,
    );

    expect(item.type).toBe('bridge');
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
