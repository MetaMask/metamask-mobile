import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import RewardsDashboard from './RewardsDashboard';
import { setActiveTab } from '../../../../actions/rewards';
import Routes from '../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock navigation
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

// Mock selectors
jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectActiveTab: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

import { selectActiveTab } from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

const mockSelectActiveTab = selectActiveTab as jest.MockedFunction<
  typeof selectActiveTab
>;
const mockSelectRewardsSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;

// Mock theme
jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      background: '#fff',
    },
  }),
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.main_title': 'Rewards',
      'rewards.tab_overview_title': 'Overview',
      'rewards.tab_levels_title': 'Levels',
      'rewards.tab_activity_title': 'Activity',
      'rewards.not_implemented': 'Not implemented yet',
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
jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: function MockErrorBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  },
}));

// Mock hooks
const mockUseSeasonStatus = jest.fn();
jest.mock('../hooks/useSeasonStatus', () => ({
  useSeasonStatus: () => mockUseSeasonStatus(),
}));

// Mock child components
jest.mock('../components/SeasonStatus/SeasonStatus', () => ({
  __esModule: true,
  default: function MockSeasonStatus() {
    const React = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return React.createElement(
      View,
      { testID: 'season-status' },
      React.createElement(Text, null, 'Season Status'),
    );
  },
}));

jest.mock(
  '../../../../component-library/components-temp/SegmentedControl',
  () => ({
    __esModule: true,
    default: function MockSegmentedControl({
      options,
      selectedValue,
      onValueChange,
      isDisabled,
      testID,
    }: {
      options: { value: string; label: string }[];
      selectedValue: string;
      onValueChange: (value: string) => void;
      isDisabled: boolean;
      testID: string;
    }) {
      const React = jest.requireActual('react');
      const { View, Text, TouchableOpacity } =
        jest.requireActual('react-native');
      return React.createElement(
        View,
        {
          testID,
          // Pass through props so tests can access them
          selectedValue,
          isDisabled,
        },
        options.map((option) =>
          React.createElement(
            TouchableOpacity,
            {
              key: option.value,
              testID: `${testID}-${option.value}`,
              onPress: () => !isDisabled && onValueChange(option.value),
              disabled: isDisabled,
            },
            React.createElement(
              Text,
              {
                style: {
                  fontWeight:
                    selectedValue === option.value ? 'bold' : 'normal',
                },
              },
              option.label,
            ),
          ),
        ),
      );
    },
  }),
);

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    ...jest.requireActual('@metamask/design-system-react-native'),
    ButtonIcon: ({
      iconName,
      disabled,
      testID,
      onPress,
    }: {
      iconName: string;
      size: string;
      disabled: boolean;
      testID: string;
      onPress: () => void;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          testID,
          disabled,
          onPress,
        },
        ReactActual.createElement(Text, null, `Icon: ${iconName}`),
      ),
  };
});

// Mock Alert
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

describe('RewardsDashboard', () => {
  const mockDispatch = jest.fn();

  const defaultSelectorValues = {
    activeTab: 'overview' as const,
    subscriptionId: 'test-subscription-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();

    mockUseDispatch.mockReturnValue(mockDispatch);

    // Setup selector mocks
    mockSelectActiveTab.mockReturnValue(defaultSelectorValues.activeTab);
    mockSelectRewardsSubscriptionId.mockReturnValue(
      defaultSelectorValues.subscriptionId,
    );

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectActiveTab) return defaultSelectorValues.activeTab;
      if (selector === selectRewardsSubscriptionId)
        return defaultSelectorValues.subscriptionId;
      return undefined;
    });
  });

  describe('rendering', () => {
    it('should render main title', () => {
      // Act
      const { getByText } = render(<RewardsDashboard />);

      // Assert
      expect(getByText('Rewards')).toBeTruthy();
    });

    it('should render all child components when user is opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId('season-status')).toBeTruthy();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.SEGMENTED_CONTROL),
      ).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT)).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON)).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON)).toBeTruthy();
    });

    it('should render not opted in overlay when user has no subscription', () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        return undefined;
      });

      // Act
      const { getByTestId, getByText } = render(<RewardsDashboard />);

      // Assert
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.NOT_OPTED_IN_OVERLAY),
      ).toBeTruthy();
      expect(getByText('Not opted in to rewards')).toBeTruthy();
    });

    it('should not render overlay when user has subscription', () => {
      // Act
      const { queryByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.NOT_OPTED_IN_OVERLAY),
      ).toBeNull();
    });
  });

  describe('navigation', () => {
    it('should set navigation options on mount', async () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });
    });

    it('should navigate to referral view when referral button is pressed', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );
      fireEvent.press(referralButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REFERRAL_REWARDS_VIEW);
    });
  });

  describe('tab functionality', () => {
    it('should dispatch setActiveTab with overview on mount', async () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(setActiveTab('overview'));
      });
    });

    it('should handle tab change when user selects different tab', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const levelsTab = getByTestId(
        `${REWARDS_VIEW_SELECTORS.SEGMENTED_CONTROL}-levels`,
      );
      fireEvent.press(levelsTab);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(setActiveTab('levels'));
    });

    it('should render all tab options', () => {
      // Act
      const { getByText } = render(<RewardsDashboard />);

      // Assert
      expect(getByText('Overview')).toBeTruthy();
      expect(getByText('Levels')).toBeTruthy();
      expect(getByText('Activity')).toBeTruthy();
    });

    it('should show not implemented content for all tabs', () => {
      // Act
      const { getByText } = render(<RewardsDashboard />);

      // Assert
      expect(getByText('Not implemented yet')).toBeTruthy();
    });
  });

  describe('button states when not opted in', () => {
    beforeEach(() => {
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        return undefined;
      });
    });

    it('should disable referral button when user is not opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );

      // Assert
      expect(referralButton.props.disabled).toBe(true);
    });

    it('should disable settings button when user is not opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );

      // Assert
      expect(settingsButton.props.disabled).toBe(true);
    });

    it('should disable segmented control when user is not opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const segmentedControl = getByTestId(
        REWARDS_VIEW_SELECTORS.SEGMENTED_CONTROL,
      );

      // Assert
      expect(segmentedControl.props.isDisabled).toBe(true);
    });
  });

  describe('button states when opted in', () => {
    it('should enable referral button when user is opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );

      // Assert
      expect(referralButton.props.disabled).toBe(false);
    });

    it('should enable settings button when user is opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );

      // Assert
      expect(settingsButton.props.disabled).toBe(false);
    });

    it('should enable segmented control when user is opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const segmentedControl = getByTestId(
        REWARDS_VIEW_SELECTORS.SEGMENTED_CONTROL,
      );

      // Assert
      expect(segmentedControl.props.isDisabled).toBe(false);
    });
  });

  describe('hooks integration', () => {
    it('should call useSeasonStatus hook', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle null activeTab gracefully', () => {
      // Arrange
      mockSelectActiveTab.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return null;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        return undefined;
      });

      // Act & Assert
      expect(() => render(<RewardsDashboard />)).not.toThrow();
    });

    it('should use overview as default when activeTab is null', () => {
      // Arrange
      mockSelectActiveTab.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return null;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        return undefined;
      });

      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const segmentedControl = getByTestId(
        REWARDS_VIEW_SELECTORS.SEGMENTED_CONTROL,
      );

      // Assert
      expect(segmentedControl.props.selectedValue).toBe('overview');
    });
  });

  describe('component lifecycle', () => {
    it('should render without crashing', () => {
      // Act & Assert
      expect(() => render(<RewardsDashboard />)).not.toThrow();
    });

    it('should cleanup properly when unmounted', () => {
      // Act
      const { unmount } = render(<RewardsDashboard />);

      // Assert
      expect(() => unmount()).not.toThrow();
    });
  });
});
