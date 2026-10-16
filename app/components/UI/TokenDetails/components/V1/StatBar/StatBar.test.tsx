import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import StatBar from './StatBar';
import { StatBarSelectors } from './StatBar.testIds';
import { TokenStatKey, type TokenStatValues } from './StatBar.types';
import { STAT_EMPTY_VALUE, STAT_KEYS_BY_VARIANT } from './StatBar.constants';
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
});
