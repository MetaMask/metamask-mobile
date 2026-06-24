import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { ActivityListItem } from '../../../../util/activity-adapters';
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
    const item = {
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
        },
      },
      data: {},
    } as ActivityListItem;

    expect(
      getBridgeHistoryItem(
        item as Extract<ActivityListItem, { type: 'bridge' }>,
        {
          'bridge-tx-meta-id': bridgeHistoryItem,
        },
      ),
    ).toBe(bridgeHistoryItem);
  });
});
