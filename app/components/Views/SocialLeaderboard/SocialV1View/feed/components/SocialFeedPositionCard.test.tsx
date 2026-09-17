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
} from './SocialFeedPositionCard.testIds';

jest.mock('../../../components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('SocialFeedPositionCard', () => {
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

  it('renders a share spot card with entry, hold time, and copy trade', () => {
    const item = {
      ...mockCompactSpotFeedItem({
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
});
