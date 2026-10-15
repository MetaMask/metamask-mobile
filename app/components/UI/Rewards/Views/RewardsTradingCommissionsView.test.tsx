import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsTradingCommissionsView from './RewardsTradingCommissionsView';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';
import { KOL_PERFORMANCE_FIXTURE } from '../components/KolDashboard/rewardsUiFixtures';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
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

describe('RewardsTradingCommissionsView', () => {
  it('renders the full commissions list and pops on back', () => {
    const { getByTestId, getAllByTestId } = render(
      <RewardsTradingCommissionsView />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TRADING_COMMISSIONS_VIEW),
    ).toBeOnTheScreen();
    expect(getAllByTestId(/performance-commission-avatar-/u)).toHaveLength(
      KOL_PERFORMANCE_FIXTURE.commissions.length,
    );

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
