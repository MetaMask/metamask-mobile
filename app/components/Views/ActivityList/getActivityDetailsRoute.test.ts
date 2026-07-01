import { TransactionType } from '@metamask/transaction-controller';
import type { ActivityListItem } from '../../../util/activity-adapters';
import { getActivityDetailsRoute } from './getActivityDetailsRoute';
import { getPreloadedActivityItem } from './preloadedActivityItemStore';

const baseItem = (
  overrides: Partial<ActivityListItem> = {},
): ActivityListItem =>
  ({
    type: 'send',
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    hash: '0xabc',
    raw: { type: 'apiEvmTransaction', data: {} },
    data: {},
    ...overrides,
  }) as ActivityListItem;

describe('getActivityDetailsRoute', () => {
  it('returns chainId + txIdentifier for a resolvable EVM/non-EVM row', () => {
    expect(getActivityDetailsRoute(baseItem())).toEqual({
      chainId: 'eip155:1',
      txIdentifier: '0xabc',
    });
  });

  it('returns null when the row has no hash (e.g. a pending local tx)', () => {
    expect(getActivityDetailsRoute(baseItem({ hash: undefined }))).toBeNull();
  });

  it('routes a pending EVM local tx to ActivityDetails (its pending banner wires speed-up/cancel)', () => {
    const pendingItem = baseItem({
      status: 'pending',
      raw: {
        type: 'localTransaction',
        data: { primaryTransaction: { type: 'simpleSend' } },
      },
    } as unknown as Partial<ActivityListItem>);

    expect(getActivityDetailsRoute(pendingItem)).toEqual({
      chainId: 'eip155:1',
      txIdentifier: '0xabc',
    });
  });

  it('routes a confirmed local tx to ActivityDetails', () => {
    const confirmedItem = baseItem({
      status: 'success',
      raw: {
        type: 'localTransaction',
        data: { primaryTransaction: { type: 'simpleSend' } },
      },
    } as unknown as Partial<ActivityListItem>);

    expect(getActivityDetailsRoute(confirmedItem)).toEqual({
      chainId: 'eip155:1',
      txIdentifier: '0xabc',
    });
  });

  it('returns null for a bridge local transaction (keeps its dedicated screen)', () => {
    const bridgeItem = baseItem({
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { type: TransactionType.bridge },
        },
      },
    } as unknown as Partial<ActivityListItem>);

    expect(getActivityDetailsRoute(bridgeItem)).toBeNull();
  });

  it('does not stash a preload key for plain EVM/non-EVM rows', () => {
    const route = getActivityDetailsRoute(baseItem());
    expect(route?.preloadKey).toBeUndefined();
  });

  it('stashes provider-backed rows (Perps) and returns the preload key', () => {
    const perpsItem = baseItem({
      type: 'perpsOpenLong',
      raw: { type: 'perpsTransaction', data: { id: 'perps-1' } },
    } as unknown as Partial<ActivityListItem>);

    const route = getActivityDetailsRoute(perpsItem);

    expect(route?.preloadKey).toBeDefined();
    expect(getPreloadedActivityItem(route?.preloadKey)).toBe(perpsItem);
  });

  it('stashes provider-backed rows (Predict) and returns the preload key', () => {
    const predictItem = baseItem({
      type: 'predictionPlaced',
      raw: { type: 'predictActivity', data: { id: 'predict-1' } },
    } as unknown as Partial<ActivityListItem>);

    const route = getActivityDetailsRoute(predictItem);

    expect(route?.preloadKey).toBeDefined();
    expect(getPreloadedActivityItem(route?.preloadKey)).toBe(predictItem);
  });
});
