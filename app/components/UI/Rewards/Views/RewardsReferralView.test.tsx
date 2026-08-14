import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsReferralView from './RewardsReferralView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) =>
    key === 'rewards.referral_title' ? 'Referrals' : key,
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
    return () => (
      <View testID="referral-revenue-share-dashboard">
        <Text>Referral revenue share dashboard</Text>
      </View>
    );
  },
);

describe('RewardsReferralView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the referral dashboard in the MetaMask Rewards shell', () => {
    const { getByText, getByTestId } = render(<RewardsReferralView />);

    expect(getByText('Referrals')).toBeOnTheScreen();
    expect(getByTestId('referral-revenue-share-dashboard')).toBeOnTheScreen();
    expect(getByTestId('error-boundary-referralrewardsview')).toBeOnTheScreen();
  });

  it('navigates back from the header', () => {
    const { getByTestId } = render(<RewardsReferralView />);

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
