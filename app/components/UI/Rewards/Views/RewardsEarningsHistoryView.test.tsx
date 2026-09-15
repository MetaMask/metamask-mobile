import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsEarningsHistoryView from './RewardsEarningsHistoryView';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';
import {
  getEarningsHistory,
  KOL_EARNINGS_FIXTURE,
} from '../components/KolDashboard/rewardsUiFixtures';
import type { RewardsEarningsHistoryParams } from '../types/navigation';

const mockGoBack = jest.fn();
const mockUseRoute = jest.fn(
  (): { params: RewardsEarningsHistoryParams | undefined } => ({
    params: undefined,
  }),
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// `moduleNameMapper` resolves every `*.svg` import to the same shared mock, so
// this single factory covers both Phosphor icons that `HistoryKindAvatar` uses.
jest.mock('../../../../images/rewards/hand-coins.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockPhosphorIcon() {
    return ReactActual.createElement(View, { testID: 'mock-phosphor-icon' });
  };
});

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

describe('RewardsEarningsHistoryView', () => {
  beforeEach(() => {
    mockUseRoute.mockReturnValue({ params: undefined });
  });

  it('renders the full history list and pops on back', () => {
    const { getByTestId, getAllByText } = render(
      <RewardsEarningsHistoryView />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.EARNINGS_HISTORY_VIEW),
    ).toBeOnTheScreen();
    expect(getAllByText(/rewards\.kol\.history_/u)).toHaveLength(
      KOL_EARNINGS_FIXTURE.history.length,
    );

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('hides referral rows when opened from the invited Claims tab', () => {
    mockUseRoute.mockReturnValue({ params: { hideReferrals: true } });

    const { getAllByText, queryByText } = render(
      <RewardsEarningsHistoryView />,
    );

    expect(queryByText('rewards.kol.history_referrals')).toBeNull();
    expect(getAllByText(/rewards\.kol\.history_/u)).toHaveLength(
      getEarningsHistory(true).length,
    );
  });
});
