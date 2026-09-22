import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Transaction } from '@metamask/keyring-api';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { ActivityListItem } from '../../../../util/activity-adapters';
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
    const item = bridgeItem(undefined);
    const transactionMeta = { id: 'bridge-tx-meta-id' } as TransactionMeta;

    expect(
      getBridgeHistoryItem(
        item,
        {
          'bridge-tx-meta-id': bridgeHistoryItem,
        },
        transactionMeta,
      ),
    ).toBe(bridgeHistoryItem);
  });

  describe('getBridgeExplorerSheetTx', () => {
    it('hands the sheet the looked-up local transaction', () => {
      const transactionMeta = { id: 'initial' } as TransactionMeta;

      expect(getBridgeExplorerSheetTx(transactionMeta)).toEqual({
        evmTxMeta: transactionMeta,
      });
    });

    it('hands the sheet a non-EVM transaction as multiChainTx', () => {
      const data = { id: 'solana-tx' } as Transaction;

      expect(getBridgeExplorerSheetTx(undefined, data)).toEqual({
        multiChainTx: data,
      });
    });

    it('returns nothing when neither local nor keyring transaction is present', () => {
      expect(getBridgeExplorerSheetTx()).toEqual({});
    });
  });
});
