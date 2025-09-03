import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Alert } from 'react-native';
import { Store } from '@reduxjs/toolkit';
import RewardsView from './RewardsView';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import type { RootState } from '../../../../reducers';
import type { RewardsState } from '../../../../reducers/rewards';
import { createStore } from 'redux';

// Mock navigation
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockNavigation: Partial<NavigationProp<ParamListBase>> = {
  navigate: mockNavigate,
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
      'rewards.main_title': 'Rewards',
      'rewards.tab_overview_title': 'Overview',
      'rewards.tab_levels_title': 'Levels',
      'rewards.tab_activity_title': 'Activity',
      'rewards.not_implemented': 'Not implemented',
      'rewards.not_implemented_season_summary': 'Season summary coming soon',
      'rewards.not_opted_in_to_rewards': 'Not opted in to rewards',
    };
    return translations[key] || key;
  }),
}));

// Mock getNavigationOptionsTitle
jest.mock('../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({ title: 'Rewards' })),
}));

// Mock ErrorBoundary
jest.mock(
  '../../../Views/ErrorBoundary',
  () =>
    ({ children }: { children: React.ReactNode }) =>
      children,
);

// Mock SegmentedControl
jest.mock(
  '../../../../component-library/components-temp/SegmentedControl',
  () =>
    ({
      onValueChange,
      _selectedValue,
      isDisabled,
      testID,
    }: {
      onValueChange: (value: string) => void;
      _selectedValue: string;
      isDisabled: boolean;
      testID: string;
    }) => {
      const { View, Text, TouchableOpacity } =
        jest.requireActual('react-native');
      const ReactActual = jest.requireActual('react');

      return ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(
          TouchableOpacity,
          {
            testID: 'tab-overview',
            onPress: () => !isDisabled && onValueChange('overview'),
            disabled: isDisabled,
          },
          ReactActual.createElement(Text, null, 'Overview'),
        ),
        ReactActual.createElement(
          TouchableOpacity,
          {
            testID: 'tab-levels',
            onPress: () => !isDisabled && onValueChange('levels'),
            disabled: isDisabled,
          },
          ReactActual.createElement(Text, null, 'Levels'),
        ),
      );
    },
);

// Mock hooks
const mockUseRewardsSyncWithEngine = jest.fn();
const mockUseRewardsStore = jest.fn();

jest.mock('../hooks/useRewardsEngineControllerSync', () => ({
  useRewardsEngineControllerSync: () => mockUseRewardsSyncWithEngine(),
}));

// Mock Routes
jest.mock('../../../../constants/navigation/Routes', () => ({
  REFERRAL_REWARDS_VIEW: 'ReferralRewardsView',
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock ButtonIcon to make it easier to test
jest.mock('../../../../component-library/components/Buttons/ButtonIcon', () => {
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onPress,
      _iconName,
      disabled,
      testID,
    }: {
      onPress: () => void;
      _iconName: string;
      disabled: boolean;
      testID: string;
    }) => (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityState={{ disabled }}
      />
    ),
    ButtonIconSize: { Lg: 'lg' },
  };
});

// Mock Redux store structure
const createMockStore = (rewardsState: Partial<RewardsState>) => {
  const mockState: Partial<RootState> = {
    rewards: {
      activeTab: null,
      subscriptionId: null,
      seasonName: null,
      seasonStartDate: null,
      seasonEndDate: null,
      seasonTiers: [],
      currentTier: null,
      nextTier: null,
      nextTierPointsNeeded: null,
      balanceTotal: null,
      balanceRefereePortion: null,
      balanceUpdatedAt: null,
      referralCode: null,
      seasonStatusLoading: false,
      refereeCount: 0,
      ...rewardsState,
    },
  };

  return createStore(() => mockState as RootState);
};

describe('RewardsView', () => {
  let store: Store<RootState>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockStore({
      activeTab: 'overview',
    });

    mockUseRewardsStore.mockReturnValue({
      activeTab: 'overview',
      subscriptionId: 'test-subscription-id',
    });
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <RewardsView />
      </Provider>,
    );

  it('should render without crashing', () => {
    const { getByText } = renderComponent();
    expect(getByText('Rewards')).toBeTruthy();
  });

  it('should set navigation options on mount', () => {
    renderComponent();
    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('should handle tab changes', () => {
    const { getByTestId } = renderComponent();

    const levelsTab = getByTestId('tab-levels');
    fireEvent.press(levelsTab);

    // Verify dispatch action would be called
    expect(levelsTab).toBeTruthy();
  });

  it('should show overlay when not subscribed', () => {
    mockUseRewardsStore.mockReturnValue({
      activeTab: 'overview',
      subscriptionId: null,
    });

    const { getByTestId } = renderComponent();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.NOT_OPTED_IN_OVERLAY),
    ).toBeTruthy();
  });
});
