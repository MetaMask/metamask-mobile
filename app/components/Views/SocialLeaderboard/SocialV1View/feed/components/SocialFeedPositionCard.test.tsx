import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import SocialFeedPositionCard from './SocialFeedPositionCard';
import {
  mockClosedPerpsFeedItem,
  mockCompactSpotFeedItem,
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
      const item = mockCompactSpotFeedItem();

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

  it('omits a stats row when the optional field is missing', () => {
    const item = mockOpenPerpsFeedItem({ autoCloseLabel: undefined });

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.queryByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'autoClose'),
      ),
    ).toBeNull();
    expect(
      screen.getByTestId(
        getSocialFeedPositionCardStatTestId(item.id, 'leverage'),
      ),
    ).toBeOnTheScreen();
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

  it('renders the compact spot card without comment or copy trade', () => {
    const item = mockCompactSpotFeedItem();

    renderWithProvider(<SocialFeedPositionCard item={item} />);

    expect(
      screen.getByTestId(getSocialFeedPositionCardTestId(item.id)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getSocialFeedPositionCardCommentTestId(item.id)),
    ).toBeNull();
    expect(
      screen.queryByTestId(getSocialFeedPositionCardCopyTradeTestId(item.id)),
    ).toBeNull();
    expect(screen.getByText('PEPE')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.position_card.buy'),
    ).toBeOnTheScreen();
  });
});
