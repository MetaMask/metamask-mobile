import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsTradingRebatesView from './RewardsTradingRebatesView';
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

describe('RewardsTradingRebatesView', () => {
  it('renders the full rebates list and pops on back', () => {
    const { getByTestId, getAllByText } = render(<RewardsTradingRebatesView />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TRADING_REBATES_VIEW),
    ).toBeOnTheScreen();
    expect(getAllByText(/rewards\.kol\.rebate_/u).length).toBe(
      KOL_PERFORMANCE_FIXTURE.rebates.length,
    );

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
