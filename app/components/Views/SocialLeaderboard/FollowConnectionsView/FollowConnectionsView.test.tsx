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
import type {
  UseFollowersOptions,
  UseFollowersResult,
  UseTraderFollowingResult,
} from './hooks';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
const mockIsFollowing = jest.fn((id: string) => id === 'trader-1');
const mockRefreshFollowing = jest.fn().mockResolvedValue(undefined);
const mockRefreshFollowers = jest.fn().mockResolvedValue(undefined);
const mockRefreshMutuals = jest.fn().mockResolvedValue(undefined);
const mockUseFollowedTraders = jest.fn<UseFollowedTradersResult, []>();
const mockUseFollowers = jest.fn<UseFollowersResult, [UseFollowersOptions?]>();
const mockUseTraderFollowing = jest.fn<UseTraderFollowingResult, []>();
let mockRouteParams: {
  initialTab?: 'followers' | 'following' | 'mutuals';
  addressOrId?: string;
} = { initialTab: 'followers' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({
    params: mockRouteParams,
    name: 'FollowConnectionsView',
  }),
}));

jest.mock('../NotificationPreferences/hooks', () => ({
  useFollowedTraders: () => mockUseFollowedTraders(),
}));

jest.mock('./hooks', () => ({
  useFollowers: (options?: UseFollowersOptions) => mockUseFollowers(options),
  useTraderFollowing: () => mockUseTraderFollowing(),
}));

jest.mock('../../../hooks/useFollowToggle', () => ({
  useFollowToggleMany: () => ({
    isFollowing: (id: string) => mockIsFollowing(id),
    toggleFollow: mockToggleFollow,
  }),
}));

const mockUseSessionProfileId = jest.fn(() => ({
  profileId: undefined as string | undefined,
  isLoading: false,
}));

jest.mock('../../../../util/notifications/hooks/useSessionProfileId', () => ({
  useSessionProfileId: () => mockUseSessionProfileId(),
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

const emptyFollowers: UseFollowersResult = {
  followers: [],
  count: 0,
  isLoading: false,
  error: null,
  refresh: mockRefreshMutuals,
};

describe('FollowConnectionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { initialTab: 'followers' };
    mockUseSessionProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: false,
    });
    mockIsFollowing.mockImplementation((id: string) => id === 'trader-1');
    mockUseFollowedTraders.mockReturnValue({
      traders: followingTraders,
      isLoading: false,
      error: null,
      refresh: mockRefreshFollowing,
    });
    mockUseFollowers.mockImplementation((options) => {
      if (options?.mutuals) {
        return emptyFollowers;
      }
      return {
        followers: liveFollowers,
        count: 12,
        isLoading: false,
        error: null,
        refresh: mockRefreshFollowers,
      };
    });
    mockUseTraderFollowing.mockReturnValue({
      traders: followingTraders,
      count: 4,
      isLoading: false,
      error: null,
      refresh: mockRefreshFollowing,
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
      error: 'SocialService: My followers request failed: 404',
      refresh: mockRefreshFollowers,
    });

    renderWithProvider(<FollowConnectionsView />);

    expect(screen.getByText("Couldn't load this list")).toBeOnTheScreen();
    expect(
      screen.queryByText('SocialService: My followers request failed: 404'),
    ).toBeNull();

    fireEvent.press(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWERS_RETRY),
    );

    expect(mockRefreshFollowers).toHaveBeenCalledTimes(1);
  });

  it('renders live following traders on the following tab', () => {
    mockRouteParams = { initialTab: 'following' };

    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWING_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getConnectionRowTestId('trader-1')),
    ).toBeOnTheScreen();
  });

  it('navigates to trader profile from a following row', () => {
    mockRouteParams = { initialTab: 'following' };

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
    mockRouteParams = { initialTab: 'following' };

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
    mockRouteParams = { initialTab: 'following' };
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

  it('hides the mutuals tab on the owner list', () => {
    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWERS_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWING_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(FollowConnectionsViewSelectorsIDs.MUTUALS_TAB),
    ).toBeNull();
  });

  it('shows the mutuals tab for another trader', () => {
    mockRouteParams = { initialTab: 'followers', addressOrId: '0xabc' };

    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.MUTUALS_TAB),
    ).toBeOnTheScreen();
  });

  it('renders the mutuals empty state for another trader', () => {
    mockRouteParams = { initialTab: 'mutuals', addressOrId: '0xabc' };

    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.MUTUALS_EMPTY),
    ).toBeOnTheScreen();
    expect(screen.getByText('No mutual followers yet.')).toBeOnTheScreen();
  });

  it('renders trader following from fetchTraderFollowing', () => {
    mockRouteParams = { initialTab: 'following', addressOrId: '0xabc' };

    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWING_LIST),
    ).toBeOnTheScreen();
    expect(mockUseTraderFollowing).toHaveBeenCalled();
  });

  it('hides Follow on the signed-in viewer row in another trader followers list', () => {
    mockRouteParams = { initialTab: 'followers', addressOrId: '0xabc' };
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'me-profile',
      isLoading: false,
    });
    mockUseFollowers.mockImplementation((options) => {
      if (options?.mutuals) {
        return emptyFollowers;
      }
      return {
        followers: [
          {
            id: 'me-profile',
            username: 'Me',
            handle: '0xaaaa...aaaa',
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
          ...liveFollowers,
        ],
        count: 2,
        isLoading: false,
        error: null,
        refresh: mockRefreshFollowers,
      };
    });

    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.queryByTestId(getConnectionFollowButtonTestId('me-profile')),
    ).toBeNull();
    expect(
      screen.getByTestId(getConnectionFollowButtonTestId('follower-1')),
    ).toBeOnTheScreen();
  });

  it('opens owner profile chrome when the viewer row is tapped', () => {
    mockRouteParams = { initialTab: 'followers', addressOrId: '0xabc' };
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'me-profile',
      isLoading: false,
    });
    mockUseFollowers.mockImplementation((options) => {
      if (options?.mutuals) {
        return emptyFollowers;
      }
      return {
        followers: [
          {
            id: 'me-profile',
            username: 'Me',
            handle: '0xaaaa...aaaa',
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
        ],
        count: 1,
        isLoading: false,
        error: null,
        refresh: mockRefreshFollowers,
      };
    });

    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(screen.getByTestId(getConnectionRowTestId('me-profile')));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      undefined,
      {},
    );
    expect(mockToggleFollow).not.toHaveBeenCalled();
  });

  it('selects the incoming tab when the connections screen is reused', () => {
    mockRouteParams = { initialTab: 'following' };

    const { rerender } = renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWING_LIST),
    ).toBeOnTheScreen();

    mockRouteParams = { initialTab: 'followers', addressOrId: '0xabc' };
    rerender(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWERS_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.MUTUALS_TAB),
    ).toBeOnTheScreen();
  });

  it('hides Follow on the signed-in viewer row in another trader following list', () => {
    mockRouteParams = { initialTab: 'following', addressOrId: '0xabc' };
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'me-profile',
      isLoading: false,
    });
    mockUseTraderFollowing.mockReturnValue({
      traders: [
        {
          id: 'me-profile',
          username: 'Me',
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
        followingTraders[1],
      ],
      count: 2,
      isLoading: false,
      error: null,
      refresh: mockRefreshFollowing,
    });

    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.queryByTestId(getConnectionFollowButtonTestId('me-profile')),
    ).toBeNull();
    expect(
      screen.getByTestId(getConnectionFollowButtonTestId('trader-2')),
    ).toBeOnTheScreen();
  });
});
