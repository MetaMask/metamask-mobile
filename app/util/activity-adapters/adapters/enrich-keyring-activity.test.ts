import { StatusTypes } from '@metamask/bridge-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  TransactionStatus,
  TransactionType,
  type Transaction,
} from '@metamask/keyring-api';
import { mapKeyringTransaction } from '@metamask/client-utils';
import { enrichKeyringActivityWithBridge } from './enrich-keyring-activity';
import type { ActivityListItem } from '../types';

const solanaChainId =
  'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ' as Transaction['chain'];

describe('enrichKeyringActivityWithBridge', () => {
  const makeKeyringTx = (
    overrides: Partial<Transaction> = {},
  ): Transaction =>
    ({
      id: 'bridge-id',
      chain: solanaChainId,
      account: '00000000-0000-4000-8000-000000000000',
      status: TransactionStatus.Confirmed,
      timestamp: 1716367781,
      type: TransactionType.Send,
      from: [
        {
          address: 'from-address',
          asset: {
            fungible: true,
            type: `${solanaChainId}/slip44:501`,
            unit: 'SOL',
            amount: '1',
          },
        },
      ],
      to: [{ address: 'to-address', asset: null }],
      fees: [],
      events: [],
      ...overrides,
    }) as Transaction;

  const makeBridgeHistory = ({
    destChainId = 1,
    bridgeStatus = StatusTypes.PENDING,
    destChainAmount,
  }: {
    destChainId?: string | number;
    bridgeStatus?: StatusTypes;
    destChainAmount?: string;
  } = {}): BridgeHistoryItem =>
    ({
      quote: {
        srcChainId: solanaChainId,
        destChainId,
        srcAsset: {
          assetId: `${solanaChainId}/slip44:501`,
          decimals: 9,
          symbol: 'SOL',
        },
        srcTokenAmount: '1000000000',
        destAsset: {
          assetId: 'eip155:1/slip44:60',
          decimals: 18,
          symbol: 'ETH',
        },
        destTokenAmount: '5000000000000000',
      },
      status: {
        status: bridgeStatus,
        srcChain: { txHash: 'bridge-id' },
        ...(destChainAmount
          ? { destChain: { txHash: '0xdest', amount: destChainAmount } }
          : {}),
      },
    }) as unknown as BridgeHistoryItem;

  const mapWithRaw = (transaction: Transaction): ActivityListItem =>
    ({
      ...mapKeyringTransaction({ transaction }),
      raw: { type: 'keyringTransaction', data: transaction },
    }) as ActivityListItem;

  it('maps a cross-chain bridge to a pending bridge item with quote-derived tokens', () => {
    const item = enrichKeyringActivityWithBridge(
      mapWithRaw(makeKeyringTx()),
      makeBridgeHistory(),
      'from-address',
    );

    expect(item).toMatchObject({
      type: 'bridge',
      status: 'pending',
      data: {
        from: 'from-address',
        sourceToken: { symbol: 'SOL', direction: 'out' },
        destinationToken: { symbol: 'ETH', direction: 'in' },
      },
    });
  });

  it('marks the bridge successful once the destination leg lands', () => {
    const item = enrichKeyringActivityWithBridge(
      mapWithRaw(makeKeyringTx({ type: TransactionType.Swap })),
      makeBridgeHistory({
        bridgeStatus: StatusTypes.COMPLETE,
        destChainAmount: '4990000000000000',
      }),
    );

    expect(item).toMatchObject({
      type: 'bridge',
      status: 'success',
      data: {
        destinationToken: { amount: '4990000000000000' },
      },
    });
  });

  it('leaves same-chain swaps with bridge history on the regular keyring mapping', () => {
    const item = enrichKeyringActivityWithBridge(
      mapWithRaw(makeKeyringTx({ type: TransactionType.Swap })),
      makeBridgeHistory({ destChainId: solanaChainId }),
    );

    expect(item).toMatchObject({ type: 'swap', status: 'success' });
  });
});
