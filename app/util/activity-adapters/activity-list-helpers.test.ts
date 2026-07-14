import type { ActivityListItem, TokenAmount } from './types';
import {
  activityMatchesAssetId,
  enrichTokenFromApi,
  formatActivityListDateHeader,
  getActivityFromTo,
  getActivityValue,
  getGroupedActivityListItemKey,
  groupActivityListItems,
  isGasTokenFeeWithAmount,
  isSpendingCapWithAmount,
  shouldShowPlusSign,
} from './activity-list-helpers';

jest.mock('../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

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
  afterEach(() => {
    jest.useRealTimers();
  });

  it('hides plus signs for spending-cap activity types', () => {
    expect(shouldShowPlusSign('approveSpendingCap')).toBe(false);
    expect(shouldShowPlusSign('increaseSpendingCap')).toBe(false);
    expect(shouldShowPlusSign('revokeSpendingCap')).toBe(false);
    expect(shouldShowPlusSign('receive')).toBe(true);
  });

  describe('isSpendingCapWithAmount', () => {
    it('is true for a spending-cap item with an explicit amount', () => {
      const item = makeItem({
        type: 'approveSpendingCap',
        data: { token: { amount: '100000', direction: 'out' } },
      });
      expect(isSpendingCapWithAmount(item)).toBe(true);
    });

    it('is true for an unlimited spending-cap approval', () => {
      const item = makeItem({
        type: 'increaseSpendingCap',
        data: { token: { direction: 'out', isUnlimitedApproval: true } },
      });
      expect(isSpendingCapWithAmount(item)).toBe(true);
    });

    it('is false for a spending-cap item without a cap amount', () => {
      const item = makeItem({
        type: 'approveSpendingCap',
        data: { token: { direction: 'out' } },
      });
      expect(isSpendingCapWithAmount(item)).toBe(false);
    });

    it('is false for a spending-cap item with no token', () => {
      const item = makeItem({ type: 'revokeSpendingCap', data: {} });
      expect(isSpendingCapWithAmount(item)).toBe(false);
    });

    it('is false for a non-spending-cap kind even with an amount', () => {
      const item = makeItem({
        type: 'send',
        data: {
          from: '0xfrom',
          to: '0xto',
          token: { amount: '100000', direction: 'out' },
        },
      });
      expect(isSpendingCapWithAmount(item)).toBe(false);
    });
  });

  describe('isGasTokenFeeWithAmount', () => {
    it('is true when fees include a gasToken fee with an amount', () => {
      const item = makeItem({
        type: 'send',
        data: {
          from: '0xfrom',
          to: '0xto',
          fees: [
            {
              type: 'gasToken',
              amount: '100',
              decimals: 6,
              symbol: 'USDC',
            },
          ],
        },
      });
      expect(isGasTokenFeeWithAmount(item)).toBe(true);
    });

    it('is false when fees only include a native base fee', () => {
      const item = makeItem({
        type: 'send',
        data: {
          from: '0xfrom',
          to: '0xto',
          fees: [
            { type: 'base', amount: '21000', decimals: 18, symbol: 'ETH' },
          ],
        },
      });
      expect(isGasTokenFeeWithAmount(item)).toBe(false);
    });

    it('is false when there are no fees', () => {
      const item = makeItem({
        type: 'send',
        data: { from: '0xfrom', to: '0xto' },
      });
      expect(isGasTokenFeeWithAmount(item)).toBe(false);
    });
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

  it('formats date headers for today, yesterday, and older dates', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 19, 12));

    expect(
      formatActivityListDateHeader(new Date(2026, 5, 19, 1).getTime()),
    ).toBe('perps.today');
    expect(
      formatActivityListDateHeader(new Date(2026, 5, 18, 1).getTime()),
    ).toBe('perps.yesterday');
    expect(
      formatActivityListDateHeader(new Date(2026, 5, 17, 1).getTime()),
    ).toBe('Jun 17, 2026');
  });

  it('extracts display value from supported token fields', () => {
    const tokenItem = makeItem({
      data: {
        token: {
          amount: '1',
          direction: 'out',
          symbol: 'ETH',
        },
      },
    });
    const destinationTokenItem = makeItem({
      data: {
        destinationToken: {
          amount: '2',
          direction: 'in',
          symbol: 'USDC',
        },
      },
      type: 'swap',
    });
    const sourceTokenItem = makeItem({
      data: {
        sourceToken: {
          amount: '3',
          direction: 'out',
          symbol: 'DAI',
        },
      },
      type: 'swapIncomplete',
    });

    expect(getActivityValue(tokenItem)).toBe('1 ETH');
    expect(getActivityValue(destinationTokenItem)).toBe('2 USDC');
    expect(getActivityValue(sourceTokenItem)).toBe('3 DAI');
    expect(getActivityValue(makeItem({ data: {} }))).toBeUndefined();
  });

  it('extracts unlimited approval display value from token metadata', () => {
    const item = makeItem({
      data: {
        token: {
          amount: '115792089237316195423570985.639935',
          direction: 'out',
          isUnlimitedApproval: true,
          symbol: 'USDT',
        },
      },
      type: 'approveSpendingCap',
    });

    expect(getActivityValue(item)).toBe('confirm.unlimited USDT');
  });

  it('extracts from and to addresses when present', () => {
    expect(
      getActivityFromTo(
        makeItem({
          data: {
            from: '0xfrom',
            to: '0xto',
          },
        }),
      ),
    ).toStrictEqual({ from: '0xfrom', to: '0xto' });
    expect(getActivityFromTo(makeItem({ data: {} }))).toStrictEqual({
      from: '',
      to: '',
    });
  });

  it('generates stable keys for grouped activity rows', () => {
    const localTransactionItem = makeItem({
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { id: 'local-tx-id' },
          initialTransaction: { id: 'initial-tx-id' },
        },
      },
    } as Partial<ActivityListItem>);
    const keyringTransactionItem = makeItem({
      hash: 'keyring-hash',
      raw: {
        type: 'keyringTransaction',
        data: { id: 'keyring-tx-id' },
      },
    } as Partial<ActivityListItem>);
    const apiTransactionItem = makeItem({
      hash: '0xapi',
      raw: {
        type: 'apiEvmTransaction',
        data: {},
      },
    } as Partial<ActivityListItem>);
    const fallbackItem = makeItem({
      hash: undefined,
      timestamp: 123,
      type: 'contractInteraction',
    });

    expect(getGroupedActivityListItemKey({ type: 'pending-header' }, 0)).toBe(
      'pending-header',
    );
    expect(
      getGroupedActivityListItemKey({ type: 'date-header', date: 456 }, 0),
    ).toBe('date-header-456');
    expect(
      getGroupedActivityListItemKey(
        { type: 'item', item: localTransactionItem },
        0,
      ),
    ).toBe('local-transaction-eip155:1-local-tx-id');
    expect(
      getGroupedActivityListItemKey(
        { type: 'item', item: keyringTransactionItem },
        0,
      ),
    ).toBe('keyring-transaction-eip155:1-keyring-tx-id');
    expect(
      getGroupedActivityListItemKey(
        { type: 'item', item: apiTransactionItem },
        0,
      ),
    ).toBe('api-evm-transaction-eip155:1-0xapi');
    expect(
      getGroupedActivityListItemKey({ type: 'item', item: fallbackItem }, 7),
    ).toBe('eip155:1-contractInteraction-123-7');
  });

  it('uses chain id and row index in fallback keys', () => {
    const firstItem = makeItem({
      chainId: 'eip155:1',
      hash: undefined,
      timestamp: 123,
      type: 'contractInteraction',
    });
    const secondItem = makeItem({
      chainId: 'eip155:137',
      hash: undefined,
      timestamp: 123,
      type: 'contractInteraction',
    });

    expect(
      getGroupedActivityListItemKey({ type: 'item', item: firstItem }, 0),
    ).toBe('eip155:1-contractInteraction-123-0');
    expect(
      getGroupedActivityListItemKey({ type: 'item', item: firstItem }, 1),
    ).toBe('eip155:1-contractInteraction-123-1');
    expect(
      getGroupedActivityListItemKey({ type: 'item', item: secondItem }, 0),
    ).toBe('eip155:137-contractInteraction-123-0');
  });
});

describe('enrichTokenFromApi', () => {
  const USDT_ASSET_ID =
    'eip155:42161/erc20:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
  const apiData = {
    [USDT_ASSET_ID]: { symbol: 'USDT', decimals: 6 },
  };

  it('fills missing decimals and symbol from the tokens API', () => {
    // Raw base-unit amount with no decimals — without enrichment a formatter
    // would render "10000" instead of 0.01.
    const token: TokenAmount = {
      direction: 'out',
      amount: '10000',
      assetId: USDT_ASSET_ID,
    };

    expect(enrichTokenFromApi(token, apiData)).toStrictEqual({
      direction: 'out',
      amount: '10000',
      assetId: USDT_ASSET_ID,
      symbol: 'USDT',
      decimals: 6,
    });
  });

  it('matches the asset id case-insensitively', () => {
    const token: TokenAmount = {
      direction: 'out',
      amount: '10000',
      assetId: USDT_ASSET_ID.toUpperCase(),
    };

    expect(enrichTokenFromApi(token, apiData)?.decimals).toBe(6);
  });

  it('keeps existing symbol and decimals (adapter values win)', () => {
    const token: TokenAmount = {
      direction: 'out',
      amount: '10000',
      assetId: USDT_ASSET_ID,
      symbol: 'aUSDT',
      decimals: 8,
    };

    const result = enrichTokenFromApi(token, apiData);
    expect(result?.symbol).toBe('aUSDT');
    expect(result?.decimals).toBe(8);
  });

  it('preserves a zero-decimals value rather than treating it as missing', () => {
    const token: TokenAmount = {
      direction: 'out',
      amount: '5',
      assetId: USDT_ASSET_ID,
      decimals: 0,
    };

    expect(enrichTokenFromApi(token, apiData)?.decimals).toBe(0);
  });

  it('returns the token unchanged when it has no asset id', () => {
    const token: TokenAmount = { direction: 'out', amount: '10000' };
    expect(enrichTokenFromApi(token, apiData)).toBe(token);
  });

  it('returns the token unchanged when the api has no matching entry', () => {
    const token: TokenAmount = {
      direction: 'out',
      amount: '10000',
      assetId: 'eip155:1/erc20:0xunknown',
    };
    expect(enrichTokenFromApi(token, apiData)).toBe(token);
  });

  it('returns undefined when given no token', () => {
    expect(enrichTokenFromApi(undefined, apiData)).toBeUndefined();
  });
});
