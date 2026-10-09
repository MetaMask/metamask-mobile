import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import StatBar from './StatBar';
import { StatBarSelectors } from './StatBar.testIds';
import { TokenStatKey, type TokenStatValues } from './StatBar.types';
import {
  STAT_EMPTY_VALUE,
  STAT_EXPLAINER_KEYS,
  STAT_KEYS_BY_VARIANT,
} from './StatBar.constants';
import { TokenDetailsVariant } from '../../../constants/constants';
import { mockTheme } from '../../../../../../util/theme';

const STATS: TokenStatValues = {
  [TokenStatKey.MarketCap]: { value: '$500.5K' },
  [TokenStatKey.Liquidity]: { value: '$2.4M' },
  [TokenStatKey.Volume24h]: { value: '$48.3M' },
  [TokenStatKey.Holders]: { value: '12.9K' },
  [TokenStatKey.Top10]: { value: '18.4%' },
  [TokenStatKey.LiquidityToMarketCap]: { value: '479.52%' },
  [TokenStatKey.Tax]: { value: '0% / 0%' },
  [TokenStatKey.HighLow24h]: { value: '$0.043120 / $0.039812' },
  [TokenStatKey.CirculatingSupply]: { value: null },
};

const MEMECOIN_KEYS = STAT_KEYS_BY_VARIANT[TokenDetailsVariant.Memecoin];
const ALL_STAT_KEYS = Object.values(TokenStatKey);

describe('StatBar', () => {
  afterEach(() => {
    STAT_KEYS_BY_VARIANT[TokenDetailsVariant.Memecoin] = MEMECOIN_KEYS;
  });

  it('renders the memecoin stats in the order ASSETS-4019 fixes', () => {
    const { queryAllByTestId } = render(
      <StatBar variant={TokenDetailsVariant.Memecoin} stats={STATS} />,
    );

    // Asserts the sequence, not just presence: the ticket makes the order
    // contractual and takes away the user's ability to reorder it.
    const rendered = queryAllByTestId(/-value$/).map(
      (node) => node.props.testID,
    );

    expect(rendered).toEqual(MEMECOIN_KEYS.map(StatBarSelectors.value));
  });

  it('renders a gray dash for a stat whose value is null', () => {
    const { getByTestId } = render(
      <StatBar variant={TokenDetailsVariant.Memecoin} stats={STATS} />,
    );

    const supply = getByTestId(
      StatBarSelectors.value(TokenStatKey.CirculatingSupply),
    );

    expect(supply).toHaveTextContent(STAT_EMPTY_VALUE);
    expect(supply).toHaveStyle({ color: mockTheme.colors.text.alternative });
  });

  it('renders a gray dash for a stat the data omits entirely', () => {
    const { getByTestId } = render(
      <StatBar variant={TokenDetailsVariant.Memecoin} stats={{}} />,
    );

    expect(
      getByTestId(StatBarSelectors.value(TokenStatKey.MarketCap)),
    ).toHaveTextContent(STAT_EMPTY_VALUE);
  });

  // The ticket is explicit that a missing value is never `0%`, which only
  // holds if a real zero survives as a zero.
  it('renders a zero value rather than treating it as missing', () => {
    const { getByTestId } = render(
      <StatBar
        variant={TokenDetailsVariant.Memecoin}
        stats={{ [TokenStatKey.Tax]: { value: '0% / 0%' } }}
      />,
    );

    const tax = getByTestId(StatBarSelectors.value(TokenStatKey.Tax));

    expect(tax).toHaveTextContent('0% / 0%');
    expect(tax).toHaveStyle({ color: mockTheme.colors.text.default });
  });

  it('renders a warning stat in amber', () => {
    const { getByTestId } = render(
      <StatBar
        variant={TokenDetailsVariant.Memecoin}
        stats={{
          [TokenStatKey.LiquidityToMarketCap]: {
            value: '0.4%',
            isWarning: true,
          },
        }}
      />,
    );

    expect(
      getByTestId(StatBarSelectors.value(TokenStatKey.LiquidityToMarketCap)),
    ).toHaveStyle({ color: mockTheme.colors.warning.default });
  });

  // `DottedUnderline` sizes the rule from its own measured width, so it only
  // appears once layout has run.
  it('draws the label underline at the measured label width', () => {
    const { getByTestId, queryByTestId } = render(
      <StatBar variant={TokenDetailsVariant.Memecoin} stats={STATS} />,
    );

    const underlineId = StatBarSelectors.underline(TokenStatKey.MarketCap);
    expect(queryByTestId(underlineId)).toBeNull();

    fireEvent(
      getByTestId(StatBarSelectors.underlineWrapper(TokenStatKey.MarketCap)),
      'layout',
      { nativeEvent: { layout: { width: 42, height: 22 } } },
    );

    expect(getByTestId(underlineId).props.width).toBe(42);
  });

  it('reports which stat was tapped', () => {
    const onStatPress = jest.fn();
    const { getByTestId } = render(
      <StatBar
        variant={TokenDetailsVariant.Memecoin}
        stats={STATS}
        onStatPress={onStatPress}
      />,
    );

    fireEvent.press(getByTestId(StatBarSelectors.label(TokenStatKey.Holders)));

    expect(onStatPress).toHaveBeenCalledWith(TokenStatKey.Holders);
  });

  it('renders a skeleton for a stat still loading', () => {
    const { getByTestId, queryByTestId } = render(
      <StatBar
        variant={TokenDetailsVariant.Memecoin}
        stats={{ [TokenStatKey.MarketCap]: { value: null, isLoading: true } }}
      />,
    );

    expect(
      getByTestId(StatBarSelectors.skeleton(TokenStatKey.MarketCap)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(StatBarSelectors.value(TokenStatKey.MarketCap)),
    ).toBeNull();
  });

  // Market-sourced cells resolve on a different schedule from security-sourced
  // ones, so the bar has to show both states at once.
  it('skeletons only the loading stats, leaving the rest readable', () => {
    const { getByTestId, queryByTestId } = render(
      <StatBar
        variant={TokenDetailsVariant.Memecoin}
        stats={{
          [TokenStatKey.MarketCap]: { value: null, isLoading: true },
          [TokenStatKey.Holders]: { value: '12.9K' },
        }}
      />,
    );

    expect(
      getByTestId(StatBarSelectors.skeleton(TokenStatKey.MarketCap)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(StatBarSelectors.value(TokenStatKey.Holders)),
    ).toHaveTextContent('12.9K');
    expect(
      queryByTestId(StatBarSelectors.skeleton(TokenStatKey.Holders)),
    ).toBeNull();
  });

  // A refresh must not replace a figure the user is already reading with a
  // placeholder.
  it('keeps showing a value that is being refreshed', () => {
    const { getByTestId, queryByTestId } = render(
      <StatBar
        variant={TokenDetailsVariant.Memecoin}
        stats={{
          [TokenStatKey.MarketCap]: { value: '$12.4M', isLoading: true },
        }}
      />,
    );

    expect(
      getByTestId(StatBarSelectors.value(TokenStatKey.MarketCap)),
    ).toHaveTextContent('$12.4M');
    expect(
      queryByTestId(StatBarSelectors.skeleton(TokenStatKey.MarketCap)),
    ).toBeNull();
  });

  it('renders only the stats its variant lists', () => {
    // Stands in for a future variant with a shorter bar, which is the whole
    // reason the stats are keyed off the variant rather than hardcoded.
    STAT_KEYS_BY_VARIANT[TokenDetailsVariant.Memecoin] = [
      TokenStatKey.MarketCap,
      TokenStatKey.Holders,
    ];

    const { getByTestId, queryByTestId } = render(
      <StatBar variant={TokenDetailsVariant.Memecoin} stats={STATS} />,
    );

    expect(
      getByTestId(StatBarSelectors.cell(TokenStatKey.MarketCap)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(StatBarSelectors.cell(TokenStatKey.Holders)),
    ).toBeOnTheScreen();
    expect(queryByTestId(StatBarSelectors.cell(TokenStatKey.Tax))).toBeNull();
  });

  // The bar renders no sheet of its own — `TokenDetailsV1` mounts the shared
  // `TokenExplainerSheet` with the copy these keys resolve to — but the map is
  // the bar's to own, so it is the bar's to guard.
  describe('explainer copy', () => {
    // A `Record` over every stat key guarantees an entry exists, but not that
    // the entry points at a real translation. Without this, a typo in a key
    // path would render the path itself on device.
    it.each(ALL_STAT_KEYS)('has resolvable copy for %s', (statKey) => {
      const { title, description } = STAT_EXPLAINER_KEYS[statKey];

      for (const key of [title, description]) {
        const resolved = strings(key);

        expect(resolved).not.toBe('');
        // An unresolved key comes back as `[missing "en.<key>" translation]`,
        // so matching the wrapper is enough — and is specific enough not to
        // trip on copy that legitimately uses the word "missing".
        expect(resolved).not.toMatch(/\[missing/iu);
        expect(resolved).not.toContain(key);
      }
    });

    it('uses a distinct title from the abbreviated bar label where they differ', () => {
      // The sheet spells the name out; the bar abbreviates to fit the cell. A
      // regression that reused the label would show "MCap" as the sheet heading.
      expect(strings(STAT_EXPLAINER_KEYS[TokenStatKey.MarketCap].title)).toBe(
        'Market capitalization',
      );
      expect(strings('token_details_v1.stats.market_cap')).toBe('MCap');
    });
  });
});
