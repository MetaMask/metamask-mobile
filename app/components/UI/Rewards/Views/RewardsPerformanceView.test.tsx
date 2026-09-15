import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsPerformanceView from './RewardsPerformanceView';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';

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

describe('RewardsPerformanceView', () => {
  it('renders the referrals funnel and pops on back', () => {
    const { getByTestId } = render(<RewardsPerformanceView />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PERFORMANCE_FUNNEL),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
