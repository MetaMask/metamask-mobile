import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import FeedTypeEmptyState from './FeedTypeEmptyState';
import { FeedViewSelectorsIDs } from '../FeedView.testIds';

const mockOnLoadMore = jest.fn();

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('FeedTypeEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the tokens-specific copy with a Load more button while pages remain', () => {
    renderWithProvider(
      <FeedTypeEmptyState
        typeFilter="tokens"
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={mockOnLoadMore}
      />,
    );

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.TYPE_EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.empty_type.tokens.title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.empty_type.description'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(FeedViewSelectorsIDs.LOAD_MORE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(FeedViewSelectorsIDs.LOAD_MORE_BUTTON));
    expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
  });

  it('renders a spinner instead of the Load more button while fetching', () => {
    renderWithProvider(
      <FeedTypeEmptyState
        typeFilter="perps"
        hasNextPage
        isFetchingNextPage
        onLoadMore={mockOnLoadMore}
      />,
    );

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.TYPE_EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(FeedViewSelectorsIDs.LOAD_MORE_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('renders the perps-specific terminal copy when no pages remain', () => {
    renderWithProvider(
      <FeedTypeEmptyState
        typeFilter="perps"
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={mockOnLoadMore}
      />,
    );

    expect(
      screen.getByText('social_leaderboard.feed.empty_type.perps.title'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(FeedViewSelectorsIDs.LOAD_MORE_BUTTON),
    ).not.toBeOnTheScreen();
  });
});
