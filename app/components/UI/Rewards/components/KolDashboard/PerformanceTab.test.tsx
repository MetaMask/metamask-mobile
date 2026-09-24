import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PerformanceTab from './PerformanceTab';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../utils', () => ({
  navigateToRewardsRoute: (
    navigation: { navigate: (name: string, params: unknown) => void },
    screen: string,
    params?: unknown,
  ) => {
    navigation.navigate('RewardsFlow', { screen, params });
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('PerformanceTab', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the referrals funnel', () => {
    const { getByTestId, queryByText } = render(<PerformanceTab />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_FUNNEL),
    ).toBeOnTheScreen();
    expect(queryByText('rewards.kol.funnel_confirmed')).toBeNull();
    expect(queryByText('rewards.kol.funnel_fee_generating')).toBeNull();
  });

  it('previews five trade commissions and five trading rebates', () => {
    const { getByTestId, getAllByTestId } = render(<PerformanceTab />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_COMMISSIONS).children,
    ).toHaveLength(5);
    expect(getAllByTestId(/performance-commission-avatar-/u)).toHaveLength(5);
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_REBATES).children,
    ).toHaveLength(5);
  });

  it('opens the trading commissions list from the section header', () => {
    const { getByTestId } = render(<PerformanceTab />);

    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_COMMISSIONS_HEADER),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_TRADING_COMMISSIONS_VIEW,
      params: undefined,
    });
  });

  it('opens the trading rebates list from the section header', () => {
    const { getByTestId } = render(<PerformanceTab />);

    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_REBATES_HEADER),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_TRADING_REBATES_VIEW,
      params: undefined,
    });
  });

  it('hides the referrals funnel for invited users', () => {
    const { queryByTestId, getByTestId, queryByText } = render(
      <PerformanceTab hideReferrals />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_FUNNEL),
    ).toBeNull();
    expect(queryByText('rewards.kol.referrals')).toBeNull();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_COMMISSIONS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_REBATES),
    ).toBeOnTheScreen();
  });
});
