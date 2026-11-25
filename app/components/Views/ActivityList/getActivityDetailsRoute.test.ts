import type { ActivityListItem } from '../../../util/activity-adapters';
import { getActivityDetailsRoute } from './getActivityDetailsRoute';

const baseItem = (
  overrides: Partial<ActivityListItem> = {},
): ActivityListItem =>
  ({
    type: 'send',
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    hash: '0xabc',
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

  it('returns null when the row has no hash', () => {
    expect(getActivityDetailsRoute(baseItem({ hash: undefined }))).toBeNull();
  });

  it('routes a pending EVM local tx by item.hash (meta id fallback)', () => {
    const pendingItem = baseItem({
      status: 'pending',
      hash: 'meta-pending-1',
    });

    const route = getActivityDetailsRoute(pendingItem);

    expect(route).toEqual({
      chainId: 'eip155:1',
      txIdentifier: 'meta-pending-1',
    });
  });

  it('routes a confirmed local tx by item.hash', () => {
    const confirmedItem = baseItem({
      status: 'success',
      hash: '0xconfirmed',
    });

    const route = getActivityDetailsRoute(confirmedItem);

    expect(route).toEqual({
      chainId: 'eip155:1',
      txIdentifier: '0xconfirmed',
    });
  });

  it('routes a bridge local transaction to ActivityDetails (BridgeDetails template)', () => {
    const bridgeItem = baseItem({
      hash: 'bridge-meta-1',
      type: 'bridge',
    });

    // Bridges used to be excluded in favour of the legacy bridge-status
    // screen, which predates the BridgeDetails template.
    expect(getActivityDetailsRoute(bridgeItem)).toEqual(
      expect.objectContaining({ txIdentifier: 'bridge-meta-1' }),
    );
  });

  it('routes perps rows by hash', () => {
    const perpsItem = baseItem({
      type: 'perpsOpenLong',
    } as Partial<ActivityListItem>);

    const route = getActivityDetailsRoute(perpsItem);

    expect(route?.txIdentifier).toBe('0xabc');
  });

  it('routes predict rows by hash', () => {
    const predictItem = baseItem({
      type: 'predictionPlaced',
    } as Partial<ActivityListItem>);

    const route = getActivityDetailsRoute(predictItem);

    expect(route?.txIdentifier).toBe('0xabc');
  });
});
