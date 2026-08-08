import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import type { TransactionGroup } from '../../../../util/activity-adapters/adapters/transaction-group';
import {
  getBridgeExplorerSheetTx,
  getBridgeHistoryItem,
} from './bridgeDetailsUtils';

function bridgeItem(
  raw: ActivityListItem['raw'],
): Extract<ActivityListItem, { type: 'bridge' }> {
  return {
    type: 'bridge',
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    hash: '0xsourcehash',
    raw,
    data: {},
  };
}

describe('bridgeDetailsUtils', () => {
  it('finds bridge history by local transaction meta id before source hash', () => {
    const bridgeHistoryItem = {
      txMetaId: 'bridge-tx-meta-id',
      status: {
        srcChain: {
          txHash: '0xsourcehash',
        },
      },
    } as BridgeHistoryItem;
    const item: Extract<ActivityListItem, { type: 'bridge' }> = {
      type: 'bridge',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1,
      hash: '0xsourcehash',
      raw: {
        type: 'localTransaction',
        data: {
          initialTransaction: {
            id: 'bridge-tx-meta-id',
          },
          primaryTransaction: {
            id: 'bridge-tx-meta-id',
          },
        } as TransactionGroup,
      },
      data: {},
    };

    expect(
      getBridgeHistoryItem(item, {
        'bridge-tx-meta-id': bridgeHistoryItem,
      }),
    ).toBe(bridgeHistoryItem);
  });

  describe('getBridgeExplorerSheetTx', () => {
    it('hands the sheet the initial transaction, matching the history lookup', () => {
      const initialTransaction = {
        id: 'initial',
      } as TransactionGroup['initialTransaction'];

      expect(
        getBridgeExplorerSheetTx(
          bridgeItem({
            type: 'localTransaction',
            data: {
              initialTransaction,
              primaryTransaction: { id: 'primary' },
            } as TransactionGroup,
          }),
        ),
      ).toEqual({ evmTxMeta: initialTransaction });
    });

    it('hands the sheet a non-EVM transaction as multiChainTx', () => {
      const data = { id: 'solana-tx' };

      expect(
        getBridgeExplorerSheetTx(
          bridgeItem({
            type: 'keyringTransaction',
            data,
          } as ActivityListItem['raw']),
        ),
      ).toEqual({ multiChainTx: data });
    });

    it.each([
      ['an indexer-only row', { type: 'apiEvmTransaction', data: {} }],
      ['a row with no raw transaction', undefined],
    ])('returns nothing for %s', (_name, raw) => {
      expect(
        getBridgeExplorerSheetTx(bridgeItem(raw as ActivityListItem['raw'])),
      ).toEqual({});
    });
  });
});
