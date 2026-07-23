import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import FollowingEmptyState from './FollowingEmptyState';
import { FeedViewSelectorsIDs } from '../FeedView.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('FollowingEmptyState', () => {
  it('renders the following-specific copy by default', () => {
    renderWithProvider(<FollowingEmptyState />);

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.empty_following.title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.empty_following.description'),
    ).toBeOnTheScreen();
  });

  it('renders the generic copy for the "all" audience', () => {
    renderWithProvider(<FollowingEmptyState audience="all" />);

    expect(
      screen.getByText('social_leaderboard.feed.empty_all.title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.empty_all.description'),
    ).toBeOnTheScreen();
  });
});
