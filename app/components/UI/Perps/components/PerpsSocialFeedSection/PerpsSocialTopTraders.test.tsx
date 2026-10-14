import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import type { RankedTrader } from '../../../SocialLeaderboard';
import { getTraderRowTestId } from '../../../../Views/Homepage/Sections/TopTraders/components/TraderRow.testIds';
import { SocialV1TraderRowSkeleton } from '../../../../Views/SocialLeaderboard/TopTradersView/components';
import {
  usePerpsTopTraders,
  type UsePerpsTopTradersResult,
} from '../../hooks/usePerpsTopTraders';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import PerpsSocialTopTraders from './PerpsSocialTopTraders';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/usePerpsTopTraders', () => ({
  ...jest.requireActual('../../hooks/usePerpsTopTraders'),
  usePerpsTopTraders: jest.fn(),
}));

const mockUsePerpsTopTraders = jest.mocked(usePerpsTopTraders);
const mockRefresh = jest.fn();
const mockOnSeeMorePress = jest.fn();

const buildTrader = (id: string, rank: number): RankedTrader => ({
  id,
  address: `0x${id}`,
  rank,
  overallRank: rank,
  username: `${id}.eth`,
  percentageChange: 0,
  pnlValue: 1000 * (6 - rank),
  winRatePercent: null,
  pnlPerChain: {},
  followerCount: 0,
  isFollowing: false,
  displayMetric: { label: `+$${1000 * (6 - rank)}`, isPositive: true },
});

const traders = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map((id, i) =>
  buildTrader(id, i + 1),
);

const mockHookResult = (overrides: Partial<UsePerpsTopTradersResult> = {}) => {
  mockUsePerpsTopTraders.mockReturnValue({
    traders,
    showSkeleton: false,
    showError: false,
    refresh: mockRefresh,
    ...overrides,
  });
};

const renderTopTraders = () =>
  renderWithProvider(
    <PerpsSocialTopTraders onSeeMorePress={mockOnSeeMorePress} />,
  );

describe('PerpsSocialTopTraders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookResult();
  });

  it('requests the top 5 perps traders', () => {
    renderTopTraders();

    expect(mockUsePerpsTopTraders).toHaveBeenCalledWith({ limit: 5 });
  });

  it('renders one row per trader with the PnL metric and no Follow button', () => {
    renderTopTraders();

    traders.forEach((trader) => {
      expect(
        screen.getByTestId(getTraderRowTestId(trader.id)),
      ).toBeOnTheScreen();
      expect(screen.getByText(trader.displayMetric.label)).toBeOnTheScreen();
    });
    expect(screen.queryByText('Follow')).toBeNull();
  });

  it('renders skeleton rows while loading', () => {
    mockHookResult({ traders: [], showSkeleton: true });

    renderTopTraders();

    expect(screen.UNSAFE_getAllByType(SocialV1TraderRowSkeleton)).toHaveLength(
      5,
    );
    expect(
      screen.queryByTestId(PerpsHomeViewSelectorsIDs.SOCIAL_FEED_SEE_MORE),
    ).toBeNull();
  });

  it('renders the error state and retries on press', () => {
    mockHookResult({ traders: [], showError: true });

    renderTopTraders();

    expect(screen.getByText('Unable to load top traders')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when there are no traders', () => {
    mockHookResult({ traders: [] });

    renderTopTraders();

    expect(
      screen.queryByTestId(PerpsHomeViewSelectorsIDs.SOCIAL_FEED_SEE_MORE),
    ).toBeNull();
  });

  it('opens the Social V1 trader profile when a row is pressed', () => {
    renderTopTraders();

    fireEvent.press(screen.getByTestId(getTraderRowTestId('beta')));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      {
        traderId: 'beta',
        traderName: 'beta.eth',
        traderAddress: '0xbeta',
        source: 'perps_home',
        traderRank: 2,
      },
      {},
    );
  });

  it('calls onSeeMorePress when See more is pressed', () => {
    renderTopTraders();

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.SOCIAL_FEED_SEE_MORE),
    );

    expect(mockOnSeeMorePress).toHaveBeenCalledTimes(1);
  });
});
