import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsReferralPerformanceView from './RewardsReferralPerformanceView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: ({
    children,
    view,
  }: {
    children: React.ReactNode;
    view: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return (
      <View testID={`error-boundary-${view.toLowerCase()}`}>{children}</View>
    );
  },
}));

jest.mock(
  '../components/ReferralRevenueShareDashboard/ReferralRevenueShareDashboard',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return ({ mode }: { mode?: string }) => (
      <View testID="referral-revenue-share-dashboard">
        <Text>{`dashboard-mode-${mode}`}</Text>
      </View>
    );
  },
);

describe('RewardsReferralPerformanceView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dashboard in performance mode with the Earnings header', () => {
    const { getByText, getByTestId } = render(
      <RewardsReferralPerformanceView />,
    );

    expect(getByText('Earnings')).toBeOnTheScreen();
    expect(getByText('dashboard-mode-performance')).toBeOnTheScreen();
    expect(
      getByTestId('error-boundary-rewardsreferralperformanceview'),
    ).toBeOnTheScreen();
  });

  it('navigates back from the header back button', () => {
    const { getByTestId } = render(<RewardsReferralPerformanceView />);

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
