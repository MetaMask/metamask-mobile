import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TokenDetailsFeedEmptyState from './TokenDetailsFeedEmptyState';

const mockOpenComposer = jest.fn();

jest.mock(
  '../../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer',
  () => ({
    useOpenSocialPostComposer: () => ({ openComposer: mockOpenComposer }),
  }),
);

describe('TokenDetailsFeedEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invites a trade without a button when the wallet does not hold the token', () => {
    renderWithProvider(<TokenDetailsFeedEmptyState hasBalance={false} />);

    expect(screen.getByText('Post your trade')).toBeOnTheScreen();
    expect(
      screen.getByText(
        "You'll get 15% of the fees every time someone copies your moves.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Start your first post')).toBeNull();
    expect(screen.queryByText('Create MetaMask Post')).toBeNull();
  });

  it('invites a first post when the wallet holds the token', () => {
    renderWithProvider(<TokenDetailsFeedEmptyState hasBalance />);

    expect(screen.getByText('Start your first post')).toBeOnTheScreen();
    expect(screen.queryByText('Post your trade')).toBeNull();

    fireEvent.press(screen.getByText('Create MetaMask Post'));

    expect(mockOpenComposer).toHaveBeenCalledTimes(1);
  });
});
