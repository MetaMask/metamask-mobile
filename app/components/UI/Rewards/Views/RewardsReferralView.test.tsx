import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import ReferralRewardsView from './RewardsReferralView';

// Mock navigation
const mockSetOptions = jest.fn();
const mockNavigation: Partial<NavigationProp<ParamListBase>> = {
  setOptions: mockSetOptions,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock theme
jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
    },
  }),
}));

// Mock strings
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral_title': 'Referral',
    };
    return translations[key] || key;
  }),
}));

// Mock getNavigationOptionsTitle
jest.mock('../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({ title: 'Referral' })),
}));

// Mock ErrorBoundary
jest.mock(
  '../../../Views/ErrorBoundary',
  () =>
    ({ children }: { children: React.ReactNode }) =>
      children,
);

// Mock ReferralDetails component
jest.mock('../components/ReferralDetails/ReferralDetails', () => () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return ReactActual.createElement(
    View,
    { testID: 'referral-details' },
    ReactActual.createElement(Text, null, 'Referral Details Component'),
  );
});

// Mock hooks
const mockUseRewardsSyncWithEngine = jest.fn();

jest.mock('../hooks/useRewardsEngineControllerSync', () => ({
  useRewardsEngineControllerSync: () => mockUseRewardsSyncWithEngine(),
}));

describe('ReferralRewardsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => render(<ReferralRewardsView />);

  it('should render without crashing', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId('referral-details')).toBeTruthy();
  });

  it('should set navigation options on mount', () => {
    renderComponent();
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Referral',
        headerTitleAlign: 'center',
      }),
    );
  });

  it('should render ReferralDetails component', () => {
    const { getByText } = renderComponent();
    expect(getByText('Referral Details Component')).toBeTruthy();
  });

  it('should sync rewards with engine on mount', () => {
    renderComponent();
    expect(mockUseRewardsSyncWithEngine).toHaveBeenCalled();
  });
});
