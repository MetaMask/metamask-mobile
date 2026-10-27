import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TokenDetailsFeedEmptyState from './TokenDetailsFeedEmptyState';

jest.mock('@rive-app/react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Alignment: { Center: 'center' },
    Fit: { Contain: 'contain' },
    RiveView: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
    useRiveFile: () => ({ riveFile: { mock: true }, error: undefined }),
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: jest.fn(() => false),
  };
});

const mockUseReducedMotion = jest.mocked(useReducedMotion);

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
    mockUseReducedMotion.mockReturnValue(false);
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
    expect(
      screen.getByTestId('token-details-feed-empty-megaphone'),
    ).toBeOnTheScreen();
  });

  it('invites a first post when the wallet holds the token', () => {
    renderWithProvider(<TokenDetailsFeedEmptyState hasBalance />);

    expect(screen.getByText('Start your first post')).toBeOnTheScreen();
    expect(screen.queryByText('Post your trade')).toBeNull();

    fireEvent.press(screen.getByText('Create MetaMask Post'));

    expect(mockOpenComposer).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId('token-details-feed-empty-megaphone'),
    ).toBeOnTheScreen();
  });

  it('shows the static megaphone when Reduce Motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);

    renderWithProvider(<TokenDetailsFeedEmptyState hasBalance={false} />);

    expect(
      screen.getByTestId('token-details-feed-empty-megaphone-fallback', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('token-details-feed-empty-megaphone'),
    ).toBeNull();
  });
});
