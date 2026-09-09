import { TransactionType } from '@metamask/transaction-controller';
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

  it('returns null when the row has no hash and no local meta id', () => {
    expect(getActivityDetailsRoute(baseItem({ hash: undefined }))).toBeNull();
  });

  it('routes a pending EVM local tx by stable meta id', () => {
    const pendingItem = baseItem({
      status: 'pending',
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { id: 'meta-pending-1', type: 'simpleSend' },
        },
      },
    } as unknown as Partial<ActivityListItem>);

    expect(getActivityDetailsRoute(pendingItem)).toEqual({
      chainId: 'eip155:1',
      txIdentifier: 'meta-pending-1',
    });
  });

  it('routes a confirmed local tx by stable meta id', () => {
    const confirmedItem = baseItem({
      status: 'success',
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { id: 'meta-confirmed-1', type: 'simpleSend' },
        },
      },
    } as unknown as Partial<ActivityListItem>);

    expect(getActivityDetailsRoute(confirmedItem)).toEqual({
      chainId: 'eip155:1',
      txIdentifier: 'meta-confirmed-1',
    });
  });

  it('falls back to hash when a local tx has no meta id', () => {
    const localWithoutId = baseItem({
      raw: {
        type: 'localTransaction',
        data: { primaryTransaction: { type: 'simpleSend' } },
      },
    } as unknown as Partial<ActivityListItem>);

    expect(getActivityDetailsRoute(localWithoutId)?.txIdentifier).toBe('0xabc');
  });

  it('routes a bridge local transaction to ActivityDetails', () => {
    const bridgeItem = baseItem({
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: {
            id: 'bridge-meta-1',
            type: TransactionType.bridge,
          },
        },
      },
    } as unknown as Partial<ActivityListItem>);

    expect(getActivityDetailsRoute(bridgeItem)).toEqual(
      expect.objectContaining({ txIdentifier: 'bridge-meta-1' }),
    );
  });

  it('routes perps and predict rows by hash', () => {
    expect(
      getActivityDetailsRoute(
        baseItem({
          type: 'perpsOpenLong',
          raw: { type: 'perpsTransaction', data: { id: 'perps-1' } },
        } as unknown as Partial<ActivityListItem>),
      )?.txIdentifier,
    ).toBe('0xabc');
    expect(
      getActivityDetailsRoute(
        baseItem({
          type: 'predictionPlaced',
          raw: { type: 'predictActivity', data: { id: 'predict-1' } },
        } as unknown as Partial<ActivityListItem>),
      )?.txIdentifier,
    ).toBe('0xabc');
  });
});
