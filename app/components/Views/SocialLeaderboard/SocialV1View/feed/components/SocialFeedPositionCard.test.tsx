import React from 'react';
import { lightTheme } from '@metamask/design-tokens';
import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
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
import { MINUTE } from '../../../../../../constants/time';

jest.mock('../../../components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

// The real avatar falls back to a Maskicon, which loads its SVG asynchronously
// and reports un-acted state updates. Stand in for it while keeping the testID
// so the header assertions still cover the avatar slot.
jest.mock(
  '../../../../Homepage/Sections/TopTraders/components/TraderAvatar',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ testID }: { testID?: string }) => <View testID={testID} />,
    };
  },
);

jest.mock('../../../../../../../locales/i18n', () => ({
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
      screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getSocialFeedPositionCardSectionDividerTestId(item.id),
      ),
    ).toBeOnTheScreen();
    expect(statValue(item.id, 'entry')).toBe('$107,675');
    expect(statValue(item.id, 'autoClose')).toBe('TP $101,214 / SL $110,905');
    expect(statValue(item.id, 'cost')).toBe('$212,000.00');
  });

  // One line, two figures: the title carries the leverage it qualifies, and the
  // right-hand column carries the percent over the USD.
  describe('open card header', () => {
    it('joins the symbol, leverage and direction into one title', () => {
      const item = mockOpenPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.getByText(
          'BTC \u00b7 40X social_leaderboard.trader_position.short',
        ),
      ).toBeOnTheScreen();
    });

    it('leads the P&L column with the percent and follows it with the USD', () => {
      const item = mockOpenPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('+128.6%')).toBeOnTheScreen();
      expect(screen.getByText('+$256.96K')).toBeOnTheScreen();
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

    it('joins the symbol, leverage and direction into one title', () => {
      const item = mockClosedPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.getByText(
          'ETH \u00b7 15x social_leaderboard.trader_position.short',
        ),
      ).toBeOnTheScreen();
    });

    it('merges the realized P&L and its percent into one line', () => {
      const item = mockClosedPerpsFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('+$96,378.60 (+38.2%)')).toBeOnTheScreen();
    });

    it('shows whichever half it has when the other is missing', () => {
      const item = mockClosedPerpsFeedItem({ pnlLabel: '' });

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(screen.getByText('+$96,378.60')).toBeOnTheScreen();
    });

    // `Sell` describes an action; a closed position describes what happened.
    it('names a closed spot position in the past tense', () => {
      const item = mockClosedSpotFeedItem();

      renderWithProvider(<SocialFeedPositionCard item={item} />);

      expect(
        screen.getByText(
          'AAPL \u00b7 social_leaderboard.feed.position_card.sold',
        ),
      ).toBeOnTheScreen();
    });
  });

  it('renders the open spot card with entry, hold time, cost and copy trade', () => {
    const item = mockOpenSpotFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.getByText('PUMP \u00b7 social_leaderboard.feed.position_card.buy'),
    ).toBeOnTheScreen();
    expect(statValue(item.id, 'entry')).toBeTruthy();
    expect(statValue(item.id, 'holdTime')).toBe('1d 20h');
    expect(statValue(item.id, 'cost')).toBe('$73,800.00');
    expect(
      screen.getByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    ).toBeOnTheScreen();
  });

  // Spot carries no leverage bracket, so the perps-only row must not appear.
  it('omits auto-close from the open spot card', () => {
    const item = mockOpenSpotFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.queryByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'autoClose'),
      ),
    ).toBeNull();
  });

  it('renders the closed spot card with entry, exit and cost but no copy trade', () => {
    const item = mockClosedSpotFeedItem();

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
    const item = mockOpenPerpsFeedItem({ autoCloseLabel: undefined });

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    const row = screen.getByTestId(
      getSocialFeedPositionCardStatTestId(item.id, 'autoClose'),
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

  // The card's wash is the fastest read of the outcome while scrolling, so it
  // has to follow the position's state rather than only its numbers.
  describe('card tone', () => {
    const cardTintOf = (item: Parameters<typeof PositionCardBody>[0]['item']) =>
      renderWithProvider(<PositionCardBody item={item} />).UNSAFE_getAllByType(
        LinearGradient,
      )[0].props.colors[0];

    it('leaves an open position neutral, whichever way it is running', () => {
      expect(cardTintOf(mockOpenPerpsFeedItem())).toContain(
        lightTheme.colors.icon.default,
      );
      expect(
        cardTintOf(mockOpenSpotFeedItem({ isPnlPositive: false })),
      ).toContain(lightTheme.colors.icon.default);
    });

    it('washes a closed winner green', () => {
      expect(
        cardTintOf(mockClosedPerpsFeedItem({ isPnlPositive: true })),
      ).toContain(lightTheme.colors.success.default);
    });

    it('washes a closed loser red', () => {
      expect(
        cardTintOf(mockClosedSpotFeedItem({ isPnlPositive: false })),
      ).toContain(lightTheme.colors.error.default);
    });
  });

  it('renders the position body without the post author header', () => {
    const item = mockOpenPerpsFeedItem();

    renderWithProvider(<PositionCardBody item={item} />);

    expect(
      screen.queryByTestId(getSocialFeedPostAuthorTestId(item.id)),
    ).toBeNull();
    expect(
      screen.getByText(
        'BTC \u00b7 40X social_leaderboard.trader_position.short',
      ),
    ).toBeOnTheScreen();
  });
});
