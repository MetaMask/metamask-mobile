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
import { PLACEHOLDER_FOLLOWERS } from './hooks/placeholderFollowers';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
const mockRefreshFollowing = jest.fn().mockResolvedValue(undefined);
const mockUseFollowedTraders = jest.fn<UseFollowedTradersResult, []>();
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

jest.mock('../../../hooks/useFollowToggle', () => ({
  useFollowToggleMany: () => ({
    isFollowing: () => true,
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

describe('FollowConnectionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialTab = 'followers';
    mockUseFollowedTraders.mockReturnValue({
      traders: followingTraders,
      isLoading: false,
      error: null,
      refresh: mockRefreshFollowing,
    });
  });

  it('renders mocked followers on the followers tab', () => {
    renderWithProvider(<FollowConnectionsView />);

    expect(
      screen.getByTestId(FollowConnectionsViewSelectorsIDs.FOLLOWERS_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getConnectionRowTestId(PLACEHOLDER_FOLLOWERS[0].id)),
    ).toBeOnTheScreen();
  });

  it('does not navigate when a mocked follower row is pressed', () => {
    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(
      screen.getByTestId(getConnectionRowTestId(PLACEHOLDER_FOLLOWERS[0].id)),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not follow when a mocked follower Follow button is pressed', () => {
    renderWithProvider(<FollowConnectionsView />);

    fireEvent.press(
      screen.getByTestId(
        getConnectionFollowButtonTestId(PLACEHOLDER_FOLLOWERS[0].id),
      ),
    );

    expect(mockToggleFollow).not.toHaveBeenCalled();
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE, {
      traderId: 'trader-1',
      traderName: 'Signal Scout',
      traderAddress: '0x1111111111111111111111111111111111111111',
    });
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
