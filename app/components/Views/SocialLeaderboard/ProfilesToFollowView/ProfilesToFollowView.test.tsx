import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
/* eslint-enable import-x/no-restricted-paths */
import type { UsePopularTradersResult } from '../SocialV1View/feed/hooks/usePopularTraders';
import {
  getConnectionFollowButtonTestId,
  getConnectionRowTestId,
} from '../FollowConnectionsView/FollowConnectionsView.testIds';
import ProfilesToFollowView from './ProfilesToFollowView';
import { ProfilesToFollowViewSelectorsIDs } from './ProfilesToFollowView.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockFollowWithSetup = jest.fn(
  async (_isFollowing: boolean, performFollow: () => Promise<void>) => {
    await performFollow();
  },
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('../hooks/useFollowWithNotificationSetup', () => ({
  useFollowWithNotificationSetup: () => ({
    followWithSetup: mockFollowWithSetup,
  }),
}));

const mockTraders: TopTrader[] = [
  {
    id: 'trader-1',
    address: '0x0000000000000000000000000000000000000001',
    rank: 1,
    overallRank: 1,
    username: 'Pain',
    percentageChange: 96.2,
    pnlValue: 963000,
    winRatePercent: 92,
    pnlPerChain: { base: 963000 },
    followerCount: 65700,
    isFollowing: false,
  },
];

const mockUsePopularTraders = jest.fn<UsePopularTradersResult, []>();

jest.mock('../SocialV1View/feed/hooks/usePopularTraders', () => ({
  usePopularTraders: () => mockUsePopularTraders(),
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

const loadedResult = (): UsePopularTradersResult => ({
  traders: mockTraders,
  isLoading: false,
  isFetching: false,
  hasFetched: true,
  error: null,
  refresh: mockRefresh,
  toggleFollow: mockToggleFollow,
});

describe('ProfilesToFollowView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePopularTraders.mockReturnValue(loadedResult());
  });

  it('lists the same top traders with follower-count subtitles', () => {
    renderWithProvider(<ProfilesToFollowView />);

    expect(
      screen.getByTestId(ProfilesToFollowViewSelectorsIDs.LIST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getConnectionRowTestId('trader-1')),
    ).toBeOnTheScreen();
    expect(screen.getByText('Pain')).toBeOnTheScreen();
    expect(screen.getByText('65.7K followers')).toBeOnTheScreen();
  });

  it('navigates back from the header', () => {
    renderWithProvider(<ProfilesToFollowView />);

    fireEvent.press(
      screen.getByTestId(ProfilesToFollowViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens the trader profile from a row tap', () => {
    renderWithProvider(<ProfilesToFollowView />);

    fireEvent.press(screen.getByTestId(getConnectionRowTestId('trader-1')));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE, {
      traderId: 'trader-1',
      traderName: 'Pain',
      traderAddress: mockTraders[0].address,
      source: 'profiles_to_follow',
      traderRank: 1,
    });
  });

  it('toggles follow from a row Follow button', () => {
    renderWithProvider(<ProfilesToFollowView />);

    fireEvent.press(
      screen.getByTestId(getConnectionFollowButtonTestId('trader-1')),
    );

    expect(mockFollowWithSetup).toHaveBeenCalled();
    expect(mockToggleFollow).toHaveBeenCalledWith('trader-1', {
      source: 'profiles_to_follow',
      traderAddress: mockTraders[0].address,
      traderUsername: 'Pain',
      traderRank: 1,
      traderAvatarUri: undefined,
    });
  });

  it('shows a retry action when the leaderboard fails to load', () => {
    mockUsePopularTraders.mockReturnValue({
      ...loadedResult(),
      traders: [],
      error: 'network',
    });

    renderWithProvider(<ProfilesToFollowView />);

    expect(
      screen.getByTestId(ProfilesToFollowViewSelectorsIDs.ERROR),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('social_leaderboard.profiles_to_follow.error')),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(ProfilesToFollowViewSelectorsIDs.RETRY));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when there are no traders', () => {
    mockUsePopularTraders.mockReturnValue({
      ...loadedResult(),
      traders: [],
    });

    renderWithProvider(<ProfilesToFollowView />);

    expect(
      screen.getByTestId(ProfilesToFollowViewSelectorsIDs.EMPTY),
    ).toBeOnTheScreen();
  });
});
