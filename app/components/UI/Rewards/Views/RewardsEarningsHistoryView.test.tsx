import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsEarningsHistoryView from './RewardsEarningsHistoryView';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';
import {
  formatSignedUsd,
  getEarningsHistory,
  KOL_EARNINGS_FIXTURE,
} from '../components/KolDashboard/rewardsUiFixtures';
import type { RewardsEarningsHistoryParams } from '../types/navigation';
import {
  markClaimsPaused,
  resetClaimsPaused,
} from '../components/KolDashboard/rewardsClaimStore';

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
    resetClaimsPaused();
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

  it('shows the paused banner above the list and opens the reward paused sheet', () => {
    const hidden = render(<RewardsEarningsHistoryView />);

    expect(
      hidden.queryByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_PAUSED_BANNER),
    ).toBeNull();
    hidden.unmount();

    markClaimsPaused();

    const {
      getByTestId,
      getByText,
      queryByTestId: queryPaused,
    } = render(<RewardsEarningsHistoryView />);

    expect(queryPaused(KOL_DASHBOARD_SELECTORS.HISTORY_PAUSED_TAG)).toBeNull();
    expect(
      StyleSheet.flatten(getByText(formatSignedUsd(9.15)).props.style).color,
    ).toBe(
      StyleSheet.flatten(getByText(formatSignedUsd(7.65)).props.style).color,
    );
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_PAUSED_BANNER),
    ).toHaveTextContent(
      'rewards.kol.claims_paused_bannerrewards.kol.claims_paused_learn_more',
    );
    expect(
      queryPaused(KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_SHEET),
    ).toBeNull();

    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_PAUSED_LEARN_MORE),
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_TITLE),
    ).toHaveTextContent('rewards.kol.history_on_hold_title');
  });
});
