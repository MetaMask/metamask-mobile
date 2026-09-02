import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { getBridgeHistoryItem } from './bridgeDetailsUtils';

function bridgeItem(
  overrides: Partial<Extract<ActivityListItem, { type: 'bridge' }>> = {},
): Extract<ActivityListItem, { type: 'bridge' }> {
  return {
    type: 'bridge',
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    hash: '0xsourcehash',
    data: {},
    ...overrides,
  };
}

describe('bridgeDetailsUtils', () => {
  it('finds bridge history by local transaction meta id before source hash', () => {
    const bridgeHistoryItem = {
      txMetaId: 'bridge-tx-meta-id',
      status: {
        srcChain: {
          txHash: '0xotherhash',
        },
      },
    } as BridgeHistoryItem;
    const item = bridgeItem({
      localTransactionInitialMetaId: 'bridge-tx-meta-id',
      localTransactionMetaId: 'primary-meta-id',
    });

    expect(
      getBridgeHistoryItem(
        item,
        { 'bridge-tx-meta-id': bridgeHistoryItem },
        'bridge-tx-meta-id',
      ),
    ).toBe(bridgeHistoryItem);
  });

  it('finds bridge history by transaction action id', () => {
    const bridgeHistoryItem = {
      txMetaId: 'bridge-action-id',
      status: {
        srcChain: {
          txHash: '0xotherhash',
        },
      },
    } as BridgeHistoryItem;
    const item = bridgeItem({
      localTransactionActionId: 'bridge-action-id',
    });

    expect(
      getBridgeHistoryItem(
        item,
        { 'bridge-action-id': bridgeHistoryItem },
        undefined,
        'bridge-action-id',
      ),
    ).toBe(bridgeHistoryItem);
  });

  it('falls back to source hash when meta identifiers miss', () => {
    const bridgeHistoryItem = {
      status: {
        srcChain: {
          txHash: '0xsourcehash',
        },
      },
    } as BridgeHistoryItem;
    const item = bridgeItem();

    expect(
      getBridgeHistoryItem(item, { unused: bridgeHistoryItem }),
    ).toBe(bridgeHistoryItem);
  });
});
