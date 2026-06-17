import type { ActivityListItem } from './types';
import {
  activityMatchesAssetId,
  groupActivityListItems,
  shouldShowPlusSign,
} from './activity-list-helpers';

function makeItem(overrides: Partial<ActivityListItem> = {}): ActivityListItem {
  return {
    chainId: 'eip155:1',
    data: {
      hash: '0xhash',
      token: {
        amount: '1',
        assetId: 'eip155:1/slip44:60',
        direction: 'out',
        symbol: 'ETH',
      },
    },
    isEarliestNonce: true,
    status: 'success',
    timestamp: 1,
    type: 'send',
    ...overrides,
  } as unknown as ActivityListItem;
}

function localDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

describe('activity list helpers', () => {
  it('hides plus signs for spending-cap activity types', () => {
    expect(shouldShowPlusSign('approveSpendingCap')).toBe(false);
    expect(shouldShowPlusSign('increaseSpendingCap')).toBe(false);
    expect(shouldShowPlusSign('revokeSpendingCap')).toBe(false);
    expect(shouldShowPlusSign('receive')).toBe(true);
  });

  it('matches token, source token, and destination token asset ids case-insensitively', () => {
    const item = makeItem({
      hash: '0xhash',
      data: {
        sourceToken: {
          assetId: 'eip155:1/erc20:0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
          direction: 'out',
          symbol: 'USDC',
        },
        destinationToken: {
          assetId: 'eip155:1/slip44:60',
          direction: 'in',
          symbol: 'ETH',
        },
      },
      type: 'swap',
    });

    expect(
      activityMatchesAssetId(
        item,
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      ),
    ).toBe(true);
    expect(activityMatchesAssetId(item, 'eip155:1/slip44:60')).toBe(true);
    expect(activityMatchesAssetId(item, 'eip155:137/slip44:60')).toBe(false);
  });

  it('groups pending items before date-grouped historical items', () => {
    const pending = makeItem({
      hash: '0xpending',
      status: 'pending',
      timestamp: Date.UTC(2026, 0, 2, 12),
    });
    const firstHistorical = makeItem({
      hash: '0xfirst',
      timestamp: Date.UTC(2026, 0, 2, 11),
    });
    const secondHistorical = makeItem({
      hash: '0xsecond',
      timestamp: Date.UTC(2026, 0, 1, 11),
    });

    expect(
      groupActivityListItems([pending, firstHistorical, secondHistorical]),
    ).toStrictEqual([
      { type: 'pending-header' },
      { type: 'item', item: pending },
      { type: 'date-header', date: localDay(firstHistorical.timestamp) },
      { type: 'item', item: firstHistorical },
      { type: 'date-header', date: localDay(secondHistorical.timestamp) },
      { type: 'item', item: secondHistorical },
    ]);
  });
});
