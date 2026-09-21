import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import type { TopTrader } from '../../../../Homepage/Sections/TopTraders/types';
/* eslint-enable import-x/no-restricted-paths */
import type { UsePopularTradersResult } from '../hooks/usePopularTraders';
import PopularTradersCarousel from './PopularTradersCarousel';
import { PopularTradersCarouselSelectorsIDs } from './PopularTradersCarousel.testIds';
import {
  getPopularTraderCardFollowTestId,
  getPopularTraderCardTestId,
} from './PopularTraderCard.testIds';

const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
const mockFollowWithSetup = jest.fn(
  async (isFollowing: boolean, performFollow: () => Promise<void>) => {
    await performFollow();
    return isFollowing;
  },
);
const mockRefresh = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../hooks/useFollowWithNotificationSetup', () => ({
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

jest.mock('../hooks/usePopularTraders', () => ({
  POPULAR_TRADERS_DISPLAY_COUNT: 10,
  usePopularTraders: () => mockUsePopularTraders(),
}));

const loadedResult = (): UsePopularTradersResult => ({
  traders: mockTraders,
  isLoading: false,
  isFetching: false,
  hasFetched: true,
  error: null,
  refresh: mockRefresh,
  toggleFollow: mockToggleFollow,
});

describe('PopularTradersCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePopularTraders.mockReturnValue(loadedResult());
  });

  it('renders a card for each trader plus View more', () => {
    renderWithProvider(<PopularTradersCarousel />);

    expect(
      screen.getByTestId(PopularTradersCarouselSelectorsIDs.SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('social_leaderboard.popular_traders')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getPopularTraderCardTestId('trader-1')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PopularTradersCarouselSelectorsIDs.VIEW_MORE),
    ).toBeOnTheScreen();
  });

  it('navigates to Profiles to follow when the header is pressed', () => {
    renderWithProvider(<PopularTradersCarousel />);

    fireEvent.press(
      screen.getByTestId(PopularTradersCarouselSelectorsIDs.HEADER),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILES_TO_FOLLOW);
  });

  it('navigates to Profiles to follow when View more is pressed', () => {
    renderWithProvider(<PopularTradersCarousel />);

    fireEvent.press(
      screen.getByTestId(PopularTradersCarouselSelectorsIDs.VIEW_MORE),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILES_TO_FOLLOW);
  });

  it('opens the trader profile from a card tap', () => {
    renderWithProvider(<PopularTradersCarousel />);

    fireEvent.press(screen.getByText('Pain'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE, {
      traderId: 'trader-1',
      traderName: 'Pain',
      traderAddress: mockTraders[0].address,
      source: 'trending_carousel',
      traderRank: 1,
    });
  });

  it('toggles follow from a card Follow button', () => {
    renderWithProvider(<PopularTradersCarousel />);

    fireEvent.press(
      screen.getByTestId(getPopularTraderCardFollowTestId('trader-1')),
    );

    expect(mockFollowWithSetup).toHaveBeenCalled();
    expect(mockToggleFollow).toHaveBeenCalledWith('trader-1', {
      source: 'trending_carousel',
      traderAddress: mockTraders[0].address,
      traderUsername: 'Pain',
      traderRank: 1,
      traderAvatarUri: undefined,
    });
  });

  it('renders nothing when the leaderboard returns no traders', () => {
    mockUsePopularTraders.mockReturnValue({
      ...loadedResult(),
      traders: [],
    });

    const { toJSON } = renderWithProvider(<PopularTradersCarousel />);

    expect(toJSON()).toBeNull();
  });

  it('renders skeleton cards while the leaderboard is loading', () => {
    mockUsePopularTraders.mockReturnValue({
      ...loadedResult(),
      traders: [],
      isLoading: true,
      isFetching: true,
      hasFetched: false,
    });

    renderWithProvider(<PopularTradersCarousel />);

    expect(
      screen.getAllByTestId(PopularTradersCarouselSelectorsIDs.SKELETON).length,
    ).toBeGreaterThan(0);
  });
});
