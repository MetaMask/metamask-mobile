import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import type { UseFollowedTradersResult } from '../NotificationPreferences/hooks/useFollowedTraders';
import FollowConnectionsView from './FollowConnectionsView';
import {
  FollowConnectionsViewSelectorsIDs,
  getConnectionFollowButtonTestId,
  getConnectionRowTestId,
} from './FollowConnectionsView.testIds';
import type { UseFollowersResult } from './hooks/useFollowers';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
const mockIsFollowing = jest.fn((id: string) => id === 'trader-1');
const mockRefreshFollowing = jest.fn().mockResolvedValue(undefined);
const mockRefreshFollowers = jest.fn().mockResolvedValue(undefined);
const mockUseFollowedTraders = jest.fn<UseFollowedTradersResult, []>();
const mockUseFollowers = jest.fn<UseFollowersResult, []>();
let mockInitialTab: 'followers' | 'following' = 'followers';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({
    params: { initialTab: mockInitialTab },
    name: 'FollowConnectionsView',
  }),
}));

jest.mock('../NotificationPreferences/hooks', () => ({
  useFollowedTraders: () => mockUseFollowedTraders(),
}));

jest.mock('./hooks', () => ({
  useFollowers: () => mockUseFollowers(),
}));

jest.mock('../../../hooks/useFollowToggle', () => ({
  useFollowToggleMany: () => ({
    isFollowing: (id: string) => mockIsFollowing(id),
    toggleFollow: mockToggleFollow,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual(
    '@metamask/design-system-react-native',
  ) as Record<string, unknown>;
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  return {
    ...actual,
    AvatarAccount: ({ testID }: { testID?: string }) => (
      <View testID={testID} />
    ),
  };
});

const followingTraders: UseFollowedTradersResult['traders'] = [
  {
    id: 'trader-1',
    username: 'Signal Scout',
    address: '0x1111111111111111111111111111111111111111',
    avatarUri: 'https://example.com/scout.png',
  },
  {
    id: 'trader-2',
    username: 'Quiet Conviction',
    address: '0x2222222222222222222222222222222222222222',
  },
];

const liveFollowers: UseFollowersResult['followers'] = [
  {
    id: 'follower-1',
    username: 'Moon Rabbit',
    handle: '0x3333...3333',
    address: '0x3333333333333333333333333333333333333333',
    avatarUri: 'https://example.com/moon.png',
  },
];

describe('FollowConnectionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialTab = 'followers';
    mockIsFollowing.mockImplementation((id: string) => id === 'trader-1');
    mockUseFollowedTraders.mockReturnValue({
      traders: followingTraders,
      isLoading: false,
      error: null,
      refresh: mockRefreshFollowing,
    });
    mockUseFollowers.mockReturnValue({
      followers: liveFollowers,
      count: 12,
      isLoading: false,
      error: null,
      refresh: mockRefreshFollowers,
    });
  });

  it('renders live followers on the followers tab', () => {
    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWERS_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getConnectionRowTestId('follower-1')),
    ).toBeOnTheScreen();
  });

  it('navigates to trader profile from a follower row', () => {
    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(screen.getByTestId(getConnectionRowTestId('follower-1')));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      {
        traderId: 'follower-1',
        traderName: 'Moon Rabbit',
        traderAddress: '0x3333333333333333333333333333333333333333',
        traderAvatarUri: 'https://example.com/moon.png',
      },
      {},
    );
  });

  it('follows from a follower row button', () => {
    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(
      screen.getByTestId(getConnectionFollowButtonTestId('follower-1')),
    );

    expect(mockToggleFollow).toHaveBeenCalledWith(
      'follower-1',
      expect.objectContaining({
        source: 'trader_profile',
        traderAddress: '0x3333333333333333333333333333333333333333',
        traderUsername: 'Moon Rabbit',
      }),
    );
  });

  it('retries followers fetch after an error', () => {
    mockUseFollowers.mockReturnValue({
      followers: [],
      count: 0,
      isLoading: false,
      error: 'Followers unavailable',
      refresh: mockRefreshFollowers,
    });

    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWERS_RETRY),
    );

    expect(mockRefreshFollowers).toHaveBeenCalledTimes(1);
  });

  it('renders live following traders on the following tab', () => {
    mockInitialTab = 'following';

    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWING_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getConnectionRowTestId('trader-1')),
    ).toBeOnTheScreen();
  });

  it('navigates to trader profile from a following row', () => {
    mockInitialTab = 'following';

    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(screen.getByTestId(getConnectionRowTestId('trader-1')));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      {
        traderId: 'trader-1',
        traderName: 'Signal Scout',
        traderAddress: '0x1111111111111111111111111111111111111111',
        traderAvatarUri: 'https://example.com/scout.png',
      },
      {},
    );
  });

  it('unfollows from a following row button', () => {
    mockInitialTab = 'following';

    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(
      screen.getByTestId(getConnectionFollowButtonTestId('trader-1')),
    );

    expect(mockToggleFollow).toHaveBeenCalledWith(
      'trader-1',
      expect.objectContaining({
        source: 'trader_profile',
        traderAddress: '0x1111111111111111111111111111111111111111',
        traderUsername: 'Signal Scout',
      }),
    );
  });

  it('retries following fetch after an error', () => {
    mockInitialTab = 'following';
    mockUseFollowedTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      error: 'Following unavailable',
      refresh: mockRefreshFollowing,
    });

    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWING_RETRY),
    );

    expect(mockRefreshFollowing).toHaveBeenCalledTimes(1);
  });

  it('returns to My Profile from the back button', () => {
    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
