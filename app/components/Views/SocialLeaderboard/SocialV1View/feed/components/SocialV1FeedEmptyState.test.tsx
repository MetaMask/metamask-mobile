import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import SocialV1FeedEmptyState from './SocialV1FeedEmptyState';
import { SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID } from './SocialV1FeedEmptyState.testIds';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('SocialV1FeedEmptyState', () => {
  it('renders the following copy', () => {
    renderWithProvider(<SocialV1FeedEmptyState tab="following" />);

    expect(
      screen.getByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.v1_empty.following.title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'social_leaderboard.feed.v1_empty.following.description',
      ),
    ).toBeOnTheScreen();
  });

  it('renders the trending copy', () => {
    renderWithProvider(<SocialV1FeedEmptyState tab="trending" />);

    expect(
      screen.getByText('social_leaderboard.feed.v1_empty.trending.title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.v1_empty.trending.description'),
    ).toBeOnTheScreen();
  });

  it('renders the Live trades copy', () => {
    renderWithProvider(<SocialV1FeedEmptyState tab="liveTrades" />);

    expect(
      screen.getByText('social_leaderboard.feed.v1_empty.liveTrades.title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'social_leaderboard.feed.v1_empty.liveTrades.description',
      ),
    ).toBeOnTheScreen();
  });
});
