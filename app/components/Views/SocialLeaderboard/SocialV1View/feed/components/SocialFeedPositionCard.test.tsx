import React from 'react';
import { screen, within } from '@testing-library/react-native';
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
    expect(
      screen.getByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'leverage'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'autoClose'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialFeedPositionCardStatTestId(item.id, 'entry')),
    ).toBeOnTheScreen();
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
    expect(
      screen.getByTestId(getSocialFeedPositionCardStatTestId(item.id, 'exit')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'status'),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the open spot card with entry, hold time and copy trade', () => {
    const item = mockOpenSpotFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(screen.getByText('PUMP')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.position_card.buy'),
    ).toBeOnTheScreen();
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

  // Spot carries no leverage, so those rows must not appear on a spot card.
  it('omits leverage and auto-close from the open spot card', () => {
    const item = mockOpenSpotFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.queryByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'leverage'),
      ),
    ).toBeNull();
    expect(
      screen.queryByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'autoClose'),
      ),
    ).toBeNull();
  });

  it('renders the closed spot card with exit, hold time and status', () => {
    const item = mockClosedSpotFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(screen.getByText('AAPL')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.position_card.sell'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialFeedPositionCardStatTestId(item.id, 'exit')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'status'),
      ),
    ).toBeOnTheScreen();
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

  it('renders the position body without the post author header', () => {
    const item = mockOpenPerpsFeedItem();

    renderWithProvider(<PositionCardBody item={item} />);

    expect(
      screen.queryByTestId(getSocialFeedPostAuthorTestId(item.id)),
    ).toBeNull();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });
});
