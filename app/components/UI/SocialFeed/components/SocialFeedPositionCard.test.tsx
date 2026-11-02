import React from 'react';
import { darkTheme } from '@metamask/design-tokens';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';
import SocialFeedPositionCard, {
  PositionCardBody,
} from './SocialFeedPositionCard';
import {
  mockClosedPerpsFeedItem,
  mockClosedSpotFeedItem,
  mockOpenSpotFeedItem,
  mockOpenPerpsFeedItem,
} from '../mocks/socialV1Feed.mock';
import {
  getSocialFeedPositionCardCommentTestId,
  getSocialFeedPositionCardCopyTradeTestId,
  getSocialFeedPositionCardSectionDividerTestId,
  getSocialFeedPositionCardStatTestId,
  getSocialFeedPositionCardTestId,
  getSocialFeedPostAgeTestId,
  getSocialFeedPostAuthorTestId,
  getSocialFeedPostAvatarTestId,
  getSocialFeedPostWinRateTestId,
} from './SocialFeedPositionCard.testIds';
import { HOUR, MINUTE } from '../../../../constants/time';
import Routes from '../../../../constants/navigation/Routes';
import { SOCIAL_FEED_COPY_TRADE_GEO_BLOCK_TEST_ID } from '../hooks/useCopyTradeToPerps';
import { SocialLivePricesContext } from '../live/SocialLivePricesContext';
import { SocialLivePriceStore } from '../live/SocialLivePriceStore';
import type { SocialLivePriceSource } from '../live/types';

const mockNavigate = jest.fn();
const mockGate = jest.fn((action: () => Promise<void> | void) =>
  Promise.resolve(action()),
);
const mockSelectPerpsEligibility = jest.fn(() => true);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../Compliance', () => ({
  useComplianceGate: () => ({ gate: mockGate }),
}));

jest.mock('../../Perps/selectors/perpsController', () => ({
  selectPerpsEligibility: () => mockSelectPerpsEligibility(),
}));

jest.mock('../../Perps/components/PerpsBottomSheetTooltip', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

jest.mock('./PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

// The real avatar falls back to a Maskicon, which loads its SVG asynchronously
// and reports un-acted state updates. Stand in for it while keeping the testID
// so the header assertions still cover the avatar slot.
jest.mock('./TraderAvatar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

/**
 * The rendered value of one stat, read past its label. Both sit inside the stat's
 * own box, so an assertion on the box would have to spell the label out too.
 */
const statValue = (cardId: string, key: string): string => {
  const stat = screen.getByTestId(
    getSocialFeedPositionCardStatTestId(cardId, key),
  );
  const [, value] = within(stat).getAllByRole('text');
  return value.props.children as string;
};

describe('SocialFeedPositionCard', () => {
  describe('post header', () => {
    it('renders the author identity, win-rate badge and post age', () => {
      const item = mockOpenPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.getByTestId(getSocialFeedPostAvatarTestId(item.id)),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(getSocialFeedPostAuthorTestId(item.id)),
      ).toHaveTextContent('Doji');
      expect(
        screen.getByTestId(getSocialFeedPostWinRateTestId(item.id)),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(getSocialFeedPostAgeTestId(item.id)),
      ).toBeOnTheScreen();
    });

    it('omits the win-rate badge when the author has no win rate', () => {
      const item = mockOpenSpotFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.getByTestId(getSocialFeedPostAuthorTestId(item.id)),
      ).toHaveTextContent('frogwater');
      expect(
        screen.queryByTestId(getSocialFeedPostWinRateTestId(item.id)),
      ).not.toBeOnTheScreen();
    });

    it('formats the post age against the supplied instant', () => {
      const now = new Date('2026-07-09T12:00:00Z').getTime();
      const item = mockOpenPerpsFeedItem({ timestamp: now - 40 * MINUTE });

      renderWithProvider(<SocialFeedPositionCard item={item} now={now} />);

      expect(
        screen.getByTestId(getSocialFeedPostAgeTestId(item.id)),
      ).toHaveTextContent('social_leaderboard.feed.age.minutes');
    });
  });

  it('renders open perps comment, stats, and copy trade', () => {
    const item = mockOpenPerpsFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.getByTestId(getSocialFeedPositionCardTestId(item.id)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialFeedPositionCardCommentTestId(item.id)),
    ).toHaveTextContent('Leverage is a lifestyle.');
    expect(
      StyleSheet.flatten(
        screen.getByTestId(getSocialFeedPositionCardCommentTestId(item.id))
          .props.style,
      ),
    ).toEqual(
      expect.objectContaining({
        fontSize: 14,
        lineHeight: 22,
        fontFamily: 'Inter-Regular',
      }),
    );
    expect(
      screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getSocialFeedPositionCardSectionDividerTestId(item.id),
      ),
    ).toBeOnTheScreen();
    expect(statValue(item.id, 'entry')).toBe('$107,675');
    expect(statValue(item.id, 'holdTime')).toBe('1d 18h');
    expect(statValue(item.id, 'cost')).toBe('$212,000.00');
    expect(
      StyleSheet.flatten(
        screen.getByText('social_leaderboard.feed.position_card.copy_trade')
          .props.style,
      ),
    ).toEqual(
      expect.objectContaining({
        fontSize: 14,
        lineHeight: 22,
      }),
    );
  });

  it('drops the auto-close row from the open perps card', () => {
    const item = mockOpenPerpsFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.queryByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'autoClose'),
      ),
    ).toBeNull();
  });

  it('forwards the open spot item when Copy trade is pressed', () => {
    const item = mockOpenSpotFeedItem({ comment: 'Buying the dip' });
    const onCopyTrade = jest.fn();

    renderWithProvider(
      <PositionCardBody item={item} onCopyTrade={onCopyTrade} />,
    );

    fireEvent.press(
      screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    );

    expect(onCopyTrade).toHaveBeenCalledWith(item);
  });

  it('forwards the open perp item when Copy trade is pressed', () => {
    const item = mockOpenPerpsFeedItem();
    const onCopyTrade = jest.fn();

    renderWithProvider(
      <PositionCardBody item={item} onCopyTrade={onCopyTrade} />,
    );

    fireEvent.press(
      screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    );

    expect(onCopyTrade).toHaveBeenCalledWith(item);
  });

  // The symbol stands alone and the leverage rides in a side tag beside it;
  // the right-hand column carries the USD over the percent.
  describe('open card header', () => {
    it('tags the symbol with its leverage and direction', () => {
      const item = mockOpenPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(
        screen.getByText('40X social_leaderboard.trader_position.short'),
      ).toBeOnTheScreen();
    });

    it('leads the P&L column with the USD and follows it with the percent', () => {
      const item = mockOpenPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('+$256.96K')).toBeOnTheScreen();
      expect(screen.getByText('+128.6%')).toBeOnTheScreen();
    });

    it('omits the USD line when the row reported no P&L value', () => {
      const item = mockOpenPerpsFeedItem({ pnlValueLabel: undefined });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('+128.6%')).toBeOnTheScreen();
      expect(screen.queryByText('+$256.96K')).toBeNull();
    });

    // Leverage rides in the title now, so it must not also be a row.
    it('drops the leverage row', () => {
      const item = mockOpenPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.queryByTestId(
          getSocialFeedPositionCardStatTestId(item.id, 'leverage'),
        ),
      ).toBeNull();
    });
  });

  it('omits the comment when the open perps item has none', () => {
    const item = mockOpenPerpsFeedItem({ comment: undefined });

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.queryByTestId(getSocialFeedPositionCardCommentTestId(item.id)),
    ).toBeNull();
  });

  it('renders closed perps fields without copy trade', () => {
    const item = mockClosedPerpsFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.getByTestId(getSocialFeedPositionCardCommentTestId(item.id)),
    ).toHaveTextContent('Risk managed. Mostly.');
    expect(
      screen.queryByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    ).toBeNull();
    expect(
      screen.getByTestId(
        getSocialFeedPositionCardSectionDividerTestId(item.id),
      ),
    ).toBeOnTheScreen();
  });

  // Three short values side by side, replacing the stacked label/value rows the
  // closed card used to share with the open one.
  describe('closed card stats', () => {
    it('reads entry, exit and cost', () => {
      const item = mockClosedPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(statValue(item.id, 'entry')).toBe('$1,890');
      expect(statValue(item.id, 'exit')).toBe('$1,842');
      expect(statValue(item.id, 'cost')).toBe('$252,300.00');
    });

    // The card's own red/green already says the position is settled, so the old
    // "Closed" status row and its hold time are gone.
    it('drops the hold time and status rows', () => {
      const item = mockClosedPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.queryByTestId(
          getSocialFeedPositionCardStatTestId(item.id, 'holdTime'),
        ),
      ).toBeNull();
      expect(
        screen.queryByTestId(
          getSocialFeedPositionCardStatTestId(item.id, 'status'),
        ),
      ).toBeNull();
    });

    it('falls back to an em dash for a cost the row never reported', () => {
      const item = mockClosedPerpsFeedItem({ costLabel: undefined });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      const cost = screen.getByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'cost'),
      );
      expect(within(cost).getByText('\u2014')).toBeOnTheScreen();
    });
  });

  // One line, one colour: the result carries the green/red, not the title.
  describe('closed card header', () => {
    // The shell is a content-sized column. `flex-1` there is a zero height
    // basis, so the title collapses and overflow-hidden clips the avatar.
    it('does not flex the header against the card height', () => {
      const item = mockClosedPerpsFeedItem();

      renderWithProvider(<PositionCardBody item={item} />);

      const style = StyleSheet.flatten(
        screen.getByTestId('position-card-header-closed').props.style,
      );
      expect(style?.flex).toBeUndefined();
      expect(style?.flexGrow).toBeUndefined();
      expect(style?.width).toBe('100%');
    });

    it('keeps the leverage tag beside the symbol', () => {
      const item = mockClosedPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(
        screen.getByText('15x social_leaderboard.trader_position.short'),
      ).toBeOnTheScreen();
    });

    it('stacks the realized P&L and its percent', () => {
      const item = mockClosedPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('+$96,378.60')).toBeOnTheScreen();
      expect(screen.getByText('+38.2%')).toBeOnTheScreen();
    });

    it('shows whichever half it has when the other is missing', () => {
      const item = mockClosedPerpsFeedItem({ pnlLabel: '' });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('+$96,378.60')).toBeOnTheScreen();
      expect(screen.queryByText('+38.2%')).toBeNull();
    });

    // The side is spent once the position closes; the toned border says how.
    it('titles a closed spot position with the bare symbol', () => {
      const item = mockClosedSpotFeedItem({ closedAtMs: Date.now() });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('AAPL')).toBeOnTheScreen();
      expect(
        screen.queryByText('social_leaderboard.feed.position_card.sell'),
      ).toBeNull();
      expect(
        screen.getByText('social_leaderboard.feed.position_card.sold_ago'),
      ).toBeOnTheScreen();
    });

    it('shows how long ago the position closed', () => {
      const item = mockClosedPerpsFeedItem({ closedAtMs: Date.now() });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.getByText('social_leaderboard.feed.position_card.closed_ago'),
      ).toBeOnTheScreen();
    });

    it('omits the close time when the row did not report one', () => {
      const item = mockClosedPerpsFeedItem({ closedAtMs: undefined });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.queryByText('social_leaderboard.feed.position_card.closed_ago'),
      ).toBeNull();
    });
  });

  it('renders the open spot card with entry, hold time, cost and copy trade', () => {
    const item = mockOpenSpotFeedItem({ comment: 'Buying the dip' });

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(screen.getByText('PUMP')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.position_card.buy'),
    ).toBeOnTheScreen();
    expect(statValue(item.id, 'entry')).toBeTruthy();
    expect(statValue(item.id, 'holdTime')).toBe('1d 20h');
    expect(statValue(item.id, 'cost')).toBe('$73,800.00');
    expect(
      screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    ).toBeOnTheScreen();
  });

  // Spot quotes its price as market cap once the fills recorded one.
  describe('spot market cap', () => {
    it('quotes the open spot card in market cap', () => {
      const item = mockOpenSpotFeedItem({
        comment: 'Buying the dip',
        marketCapLabel: '$1.2M',
        entryMarketCapLabel: '$800K',
      });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.getByText(
          '$1.2M social_leaderboard.position_sheet.market_cap_suffix',
        ),
      ).toBeOnTheScreen();
      expect(statValue(item.id, 'entry')).toBe('$800K');
    });

    it('falls back to price when the fills recorded no market cap', () => {
      const item = mockOpenSpotFeedItem({
        comment: 'Buying the dip',
        marketCapLabel: undefined,
        entryMarketCapLabel: undefined,
      });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('$0.0\u20868618')).toBeOnTheScreen();
      expect(statValue(item.id, 'entry')).toBe('$0.0\u20844947');
    });

    it('quotes the closed spot card entry and exit in market cap', () => {
      const item = mockClosedSpotFeedItem({
        comment: 'Took profit',
        entryMarketCapLabel: '$800K',
        exitMarketCapLabel: '$1.1M',
      });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(statValue(item.id, 'entry')).toBe('$800K');
      expect(statValue(item.id, 'exit')).toBe('$1.1M');
    });
  });

  it('renders the closed spot card with entry, exit and cost but no copy trade', () => {
    const item = mockClosedSpotFeedItem({ comment: 'Took profit' });

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(statValue(item.id, 'entry')).toBe('$207.57');
    expect(statValue(item.id, 'exit')).toBe('$237.88');
    expect(statValue(item.id, 'cost')).toBe('$64,200.00');
    expect(
      screen.queryByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    ).toBeNull();
  });

  // The whole point of the em dash: a card keeps its height when the API is
  // missing a figure, instead of silently shedding a row.
  it('renders an em dash for a missing stat value rather than dropping the row', () => {
    const item = mockOpenPerpsFeedItem({ holdTimeLabel: undefined });

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    const row = screen.getByTestId(
      getSocialFeedPositionCardStatTestId(item.id, 'holdTime'),
    );
    expect(within(row).getByText('\u2014')).toBeOnTheScreen();
  });

  it('renders a share spot card with entry, hold time, and copy trade', () => {
    const item = {
      ...mockOpenSpotFeedItem({
        id: 'v1-feed-eth-share',
        comment: 'this is alpha',
      }),
      variant: 'spotShare' as const,
      markPriceLabel: '$1,842',
      entryPriceLabel: '$1,842',
      holdTimeLabel: '2d 2h',
      showCopyTrade: true,
    };

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.getByTestId(getSocialFeedPositionCardCommentTestId(item.id)),
    ).toHaveTextContent('this is alpha');
    expect(
      screen.getByTestId(getSocialFeedPositionCardStatTestId(item.id, 'entry')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'holdTime'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    ).toBeOnTheScreen();
  });

  describe('display modes', () => {
    it('expands an open card without a comment when expanded', () => {
      const item = mockOpenPerpsFeedItem({ comment: undefined });

      renderWithProvider(<PositionCardBody item={item} expanded />);

      expect(
        screen.getByTestId(
          getSocialFeedPositionCardSectionDividerTestId(item.id),
        ),
      ).toBeOnTheScreen();
      expect(statValue(item.id, 'entry')).toBe('$107,675');
    });

    it('expands a closed card without a comment when expanded', () => {
      const item = mockClosedPerpsFeedItem({ comment: undefined });

      renderWithProvider(<PositionCardBody item={item} expanded />);

      expect(statValue(item.id, 'exit')).toBe('$1,842');
      expect(
        StyleSheet.flatten(
          screen.getByTestId('position-card-shell').props.style,
        )?.borderWidth,
      ).toBe(2);
    });

    it('hides copy trade on an open card when showCopyTrade is false', () => {
      const item = mockOpenPerpsFeedItem();

      renderWithProvider(
        <PositionCardBody item={item} showCopyTrade={false} />,
      );

      expect(
        screen.queryByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
      ).toBeNull();
    });

    it('keeps the compact layout on a feed post without a comment', () => {
      const item = mockOpenPerpsFeedItem({ comment: undefined });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.queryByTestId(
          getSocialFeedPositionCardSectionDividerTestId(item.id),
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getSocialFeedPositionCardStatTestId(item.id, 'entry'),
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders the divider, stats and copy trade on an open card with a comment', () => {
      const item = mockOpenPerpsFeedItem();

      renderWithProvider(<PositionCardBody item={item} />);

      expect(
        screen.getByTestId(
          getSocialFeedPositionCardSectionDividerTestId(item.id),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          getSocialFeedPositionCardStatTestId(item.id, 'entry'),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
      ).toBeOnTheScreen();
    });

    it('keeps only the symbol and P&L on an open card without a comment', () => {
      const item = mockOpenPerpsFeedItem({ comment: undefined });

      renderWithProvider(<PositionCardBody item={item} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('+$256.96K')).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getSocialFeedPositionCardSectionDividerTestId(item.id),
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getSocialFeedPositionCardStatTestId(item.id, 'entry'),
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
      ).not.toBeOnTheScreen();
    });

    it('keeps the entry, exit and cost columns on a closed card with a comment', () => {
      const item = mockClosedPerpsFeedItem();

      renderWithProvider(<PositionCardBody item={item} />);

      expect(
        screen.getByTestId(
          getSocialFeedPositionCardSectionDividerTestId(item.id),
        ),
      ).toBeOnTheScreen();
      expect(statValue(item.id, 'entry')).toBe('$1,890');
      expect(statValue(item.id, 'exit')).toBe('$1,842');
      expect(
        StyleSheet.flatten(
          screen.getByTestId('position-card-shell').props.style,
        )?.borderWidth,
      ).toBe(2);
    });

    it('keeps only the header on a closed card without a comment', () => {
      const item = mockClosedPerpsFeedItem({
        comment: undefined,
        closedAtMs: Date.now() - HOUR,
      });

      renderWithProvider(<PositionCardBody item={item} />);

      expect(
        screen.getByText('social_leaderboard.feed.position_card.closed_ago'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getSocialFeedPositionCardSectionDividerTestId(item.id),
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getSocialFeedPositionCardStatTestId(item.id, 'exit'),
        ),
      ).not.toBeOnTheScreen();
      expect(
        StyleSheet.flatten(
          screen.getByTestId('position-card-shell').props.style,
        )?.borderWidth,
      ).toBe(2);
    });

    it('captions a closed spot card without a comment as sold and keeps no side tag', () => {
      const item = mockClosedSpotFeedItem({
        comment: undefined,
        closedAtMs: Date.now() - HOUR,
      });

      renderWithProvider(<PositionCardBody item={item} />);

      expect(
        screen.getByText('social_leaderboard.feed.position_card.sold_ago'),
      ).toBeOnTheScreen();
      expect(screen.getByText('AAPL')).toBeOnTheScreen();
      expect(
        screen.queryByText('social_leaderboard.feed.position_card.buy'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText('social_leaderboard.feed.position_card.sell'),
      ).not.toBeOnTheScreen();
    });
  });

  // The wash follows the P&L in dark mode. Light mode keeps the border only.
  describe('card tone', () => {
    const cardTintOf = (item: Parameters<typeof PositionCardBody>[0]['item']) =>
      renderWithProvider(<PositionCardBody item={item} />, {
        theme: {
          ...mockTheme,
          colors: darkTheme.colors,
          typography: darkTheme.typography,
          shadows: darkTheme.shadows,
          themeAppearance: AppThemeKey.dark,
        },
      }).UNSAFE_getAllByType(LinearGradient)[0].props.colors[0];

    it('washes an open winner green and an open loser red', () => {
      expect(cardTintOf(mockOpenPerpsFeedItem())).toBe(
        darkTheme.colors.success.muted,
      );
      expect(cardTintOf(mockOpenSpotFeedItem({ isPnlPositive: false }))).toBe(
        darkTheme.colors.error.muted,
      );
    });

    it('washes a closed winner green', () => {
      expect(cardTintOf(mockClosedPerpsFeedItem({ isPnlPositive: true }))).toBe(
        darkTheme.colors.success.muted,
      );
    });

    it('washes a closed loser red', () => {
      expect(cardTintOf(mockClosedSpotFeedItem({ isPnlPositive: false }))).toBe(
        darkTheme.colors.error.muted,
      );
    });

    it('does not wash an open card that has a price but no P&L', () => {
      const utils = renderWithProvider(
        <PositionCardBody
          item={mockOpenPerpsFeedItem({
            valueLabel: '$212,000.00',
            pnlLabel: '',
            pnlValueLabel: undefined,
            isPnlPositive: false,
          })}
        />,
        {
          theme: {
            ...mockTheme,
            colors: darkTheme.colors,
            typography: darkTheme.typography,
            shadows: darkTheme.shadows,
            themeAppearance: AppThemeKey.dark,
          },
        },
      );

      expect(utils.UNSAFE_queryAllByType(LinearGradient)).toHaveLength(0);
    });

    it('washes a closed card from its realized P&L when the percent is missing', () => {
      expect(
        cardTintOf(
          mockClosedPerpsFeedItem({
            valueLabel: '+$96,378.60',
            pnlLabel: '',
            isPnlPositive: true,
          }),
        ),
      ).toBe(darkTheme.colors.success.muted);
    });

    it('leaves a closed position without a wash when no PnL is available', () => {
      const utils = renderWithProvider(
        <PositionCardBody
          item={mockClosedSpotFeedItem({
            valueLabel: '',
            pnlLabel: '',
            isPnlPositive: false,
          })}
        />,
      );

      expect(utils.UNSAFE_queryAllByType(LinearGradient)).toHaveLength(0);
    });
  });

  describe('copy trade', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
      mockGate.mockImplementation((action: () => Promise<void> | void) =>
        Promise.resolve(action()),
      );
      mockSelectPerpsEligibility.mockReturnValue(true);
    });

    it('opens the perps order redirect as a bottom sheet when the trader is eligible', async () => {
      const item = mockOpenPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);
      fireEvent.press(
        screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
          screen: Routes.PERPS.ORDER_REDIRECT,
          params: {
            direction: 'short',
            asset: 'BTC',
            leverage: 40,
            source: 'trader_feed',
            useBottomSheet: true,
            stayOnCurrentScreen: true,
          },
        });
      });
    });

    it('opens copy trade with the HIP-3 market id, not the display ticker', async () => {
      const item = mockOpenPerpsFeedItem({
        tradeSymbol: 'xyz:TSLA',
        asset: {
          symbol: 'TSLA',
          avatar: {
            positionId: 'v1-pos-tsla-open',
            chain: 'hyperliquid',
            tokenAddress: '',
            tokenImageUrl: null,
            tokenSymbol: 'xyz:TSLA',
          },
        },
      });

      renderWithProvider(<SocialFeedPositionCard item={item} />);
      fireEvent.press(
        screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PERPS.MODALS.ROOT,
          expect.objectContaining({
            params: expect.objectContaining({ asset: 'xyz:TSLA' }),
          }),
        );
      });
    });

    it('does not navigate when compliance blocks the action', async () => {
      const item = mockOpenPerpsFeedItem();
      mockGate.mockImplementation(() => Promise.resolve());

      renderWithProvider(<SocialFeedPositionCard item={item} />);
      fireEvent.press(
        screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
      );

      await waitFor(() => {
        expect(mockGate).toHaveBeenCalled();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId(SOCIAL_FEED_COPY_TRADE_GEO_BLOCK_TEST_ID),
      ).toBeNull();
    });

    it('shows the geo block and does not navigate when the trader is ineligible', async () => {
      const item = mockOpenPerpsFeedItem();
      mockSelectPerpsEligibility.mockReturnValue(false);

      renderWithProvider(<SocialFeedPositionCard item={item} />);
      fireEvent.press(
        screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(SOCIAL_FEED_COPY_TRADE_GEO_BLOCK_TEST_ID),
        ).toBeOnTheScreen();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('shows the snapshot mark price on any surface', () => {
    const item = mockOpenPerpsFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(screen.getByText('$104,213')).toBeOnTheScreen();
  });

  describe('live prices', () => {
    const liveSource: SocialLivePriceSource = {
      key: 'perp:BTC',
      kind: 'perp',
      symbol: 'BTC',
      positionAmount: 2,
      direction: 1,
      snapshotPrice: 100_000,
      snapshotPnlUsd: 1_000,
      entryPrice: 99_500,
      pnlBaseUsd: 10_000,
      marketCapPerPrice: null,
    };

    const renderLive = (store: SocialLivePriceStore) => {
      const item = mockOpenPerpsFeedItem({
        markPriceLabel: '$100,000',
        live: liveSource,
      });
      renderWithProvider(
        <SocialLivePricesContext.Provider
          value={{
            store,
            register: () => () => undefined,
            requestVisibilityCheck: () => undefined,
            reduceMotion: true,
          }}
        >
          <SocialFeedPositionCard item={item} />
        </SocialLivePricesContext.Provider>,
      );
    };

    it('keeps the snapshot until the first tick', () => {
      renderLive(new SocialLivePriceStore(0));

      expect(screen.getByText('$100,000')).toBeOnTheScreen();
    });

    it('ticks a composer spot share once a live price arrives', () => {
      const spotKey =
        'spot:eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';
      const store = new SocialLivePriceStore(0);
      const item = {
        ...mockOpenSpotFeedItem({
          id: 'v1-feed-eth-share',
          markPriceLabel: '$3,000',
          live: {
            key: spotKey,
            kind: 'spot',
            positionAmount: 1,
            direction: 1,
            snapshotPrice: 3_000,
            snapshotPnlUsd: 1_000,
            entryPrice: 2_500,
            pnlBaseUsd: 2_500,
            marketCapPerPrice: null,
          },
        }),
        variant: 'spotShare' as const,
        showCopyTrade: false,
      };
      renderWithProvider(
        <SocialLivePricesContext.Provider
          value={{
            store,
            register: () => () => undefined,
            requestVisibilityCheck: () => undefined,
            reduceMotion: true,
          }}
        >
          <SocialFeedPositionCard item={item} />
        </SocialLivePricesContext.Provider>,
      );

      act(() => {
        store.publish(spotKey, 3_300);
      });

      expect(screen.getByLabelText('$3,300')).toBeOnTheScreen();
    });

    it('moves the wash with the live P&L sign', () => {
      const store = new SocialLivePriceStore(0);
      const item = mockOpenPerpsFeedItem({
        markPriceLabel: '$100,000',
        isPnlPositive: true,
        live: liveSource,
      });
      const utils = renderWithProvider(
        <SocialLivePricesContext.Provider
          value={{
            store,
            register: () => () => undefined,
            requestVisibilityCheck: () => undefined,
            reduceMotion: true,
          }}
        >
          <PositionCardBody item={item} />
        </SocialLivePricesContext.Provider>,
        {
          theme: {
            ...mockTheme,
            colors: darkTheme.colors,
            typography: darkTheme.typography,
            shadows: darkTheme.shadows,
            themeAppearance: AppThemeKey.dark,
          },
        },
      );

      expect(utils.UNSAFE_getAllByType(LinearGradient)[0].props.colors[0]).toBe(
        darkTheme.colors.success.muted,
      );

      act(() => {
        store.publish('perp:BTC', 99_000);
      });

      expect(utils.UNSAFE_getAllByType(LinearGradient)[0].props.colors[0]).toBe(
        darkTheme.colors.error.muted,
      );
    });

    it('re-derives the mark price and P&L from a streamed price', () => {
      const store = new SocialLivePriceStore(0);
      renderLive(store);

      act(() => {
        store.publish('perp:BTC', 101_000);
      });

      // 1,000 + 2 * (101,000 - 100,000) on a 10,000 basis.
      expect(screen.getByLabelText('$101,000')).toBeOnTheScreen();
      expect(screen.getByLabelText('+$3K')).toBeOnTheScreen();
      expect(screen.getByLabelText('+30.00%')).toBeOnTheScreen();
    });

    it('lays out the live P&L by glyph so trailing units follow the digits', () => {
      const store = new SocialLivePriceStore(0);
      const item = mockOpenPerpsFeedItem({
        markPriceLabel: '$100,000',
        live: liveSource,
      });
      renderWithProvider(
        <SocialLivePricesContext.Provider
          value={{
            store,
            register: () => () => undefined,
            requestVisibilityCheck: () => undefined,
            reduceMotion: false,
          }}
        >
          <SocialFeedPositionCard item={item} />
        </SocialLivePricesContext.Provider>,
      );

      act(() => {
        store.publish('perp:BTC', 101_000);
      });

      expect(
        within(screen.getByLabelText('+$3K')).getByText('K'),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByLabelText('+30.00%')).getByText('3'),
      ).toBeOnTheScreen();
    });
  });

  it('renders the position body without the post author header', () => {
    const item = mockOpenPerpsFeedItem();

    renderWithProvider(<PositionCardBody item={item} />);

    expect(
      screen.queryByTestId(getSocialFeedPostAuthorTestId(item.id)),
    ).toBeNull();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });
});
