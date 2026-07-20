import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import type { TransactionGroup } from '../../../../util/activity-adapters/adapters/transaction-group';
import { getBridgeHistoryItem } from './bridgeDetailsUtils';

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
});
