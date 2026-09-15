import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsPerformanceView from './RewardsPerformanceView';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';
import Routes from '../../../../constants/navigation/Routes';
import type { RewardsPerformanceParams } from '../types/navigation';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUseRoute = jest.fn(
  (): { params: RewardsPerformanceParams | undefined } => ({
    params: undefined,
  }),
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return function MockErrorBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return ReactActual.createElement(ReactActual.Fragment, null, children);
  };
});

describe('RewardsPerformanceView', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockNavigate.mockClear();
    mockUseRoute.mockReturnValue({ params: undefined });
  });

  it('renders the referrals funnel and pops on back', () => {
    const { getByTestId } = render(<RewardsPerformanceView />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_FUNNEL),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('previews five trade commissions and five trading rebates', () => {
    const { getByTestId, getAllByTestId } = render(<RewardsPerformanceView />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_COMMISSIONS).children,
    ).toHaveLength(5);
    expect(getAllByTestId(/performance-commission-avatar-/u)).toHaveLength(5);
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_REBATES).children,
    ).toHaveLength(5);
  });

  it('opens the trading commissions list from the section header', () => {
    const { getByTestId } = render(<RewardsPerformanceView />);

    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_COMMISSIONS_HEADER),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_TRADING_COMMISSIONS_VIEW,
    );
  });

  it('opens the trading rebates list from the section header', () => {
    const { getByTestId } = render(<RewardsPerformanceView />);

    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_REBATES_HEADER),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_TRADING_REBATES_VIEW,
    );
  });

  it('hides the referrals funnel for invited users', () => {
    mockUseRoute.mockReturnValue({ params: { hideReferrals: true } });

    const { queryByTestId, getByTestId, queryByText } = render(
      <RewardsPerformanceView />,
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
