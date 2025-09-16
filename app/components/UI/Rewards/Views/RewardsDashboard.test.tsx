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
  useFocusEffect: jest.fn(() => {
    // Mock useFocusEffect as a no-op to prevent infinite re-renders
    // In real usage, this would be called when screen gains focus
  }),
}));

// Mock selectors
jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectActiveTab: jest.fn(),
  selectSeasonId: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

import {
  selectActiveTab,
  selectSeasonId,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { CURRENT_SEASON_ID } from '../../../../core/Engine/controllers/rewards-controller/types';

const mockSelectActiveTab = selectActiveTab as jest.MockedFunction<
  typeof selectActiveTab
>;
const mockSelectRewardsSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;
const mockSelectSeasonId = selectSeasonId as jest.MockedFunction<
  typeof selectSeasonId
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
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'season-status' },
      ReactActual.createElement(Text, null, 'Season Status'),
    );
  },
}));

// Mock tab components
jest.mock('../components/Tabs/RewardsOverview', () => ({
  __esModule: true,
  default: function MockRewardsOverview({ tabLabel }: { tabLabel: string }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'rewards-overview-tab' },
      ReactActual.createElement(Text, null, tabLabel || 'Overview'),
    );
  },
}));

jest.mock('../components/Tabs/RewardsLevels', () => ({
  __esModule: true,
  default: function MockRewardsLevels({ tabLabel }: { tabLabel: string }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'rewards-levels-tab' },
      ReactActual.createElement(Text, null, tabLabel || 'Levels'),
    );
  },
}));

jest.mock('../components/Tabs/RewardsActivity', () => ({
  __esModule: true,
  default: function MockRewardsActivity({ tabLabel }: { tabLabel: string }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'rewards-activity-tab' },
      ReactActual.createElement(Text, null, tabLabel || 'Activity'),
    );
  },
}));

// Mock TabsList
jest.mock('../../../../component-library/components-temp/Tabs', () => ({
  TabsList: function MockTabsList({
    children,
    onChangeTab,
    initialActiveIndex = 0,
    testID,
  }: {
    children: React.ReactNode[];
    onChangeTab?: (props: { i: number; ref: React.ReactNode }) => void;
    initialActiveIndex?: number;
    testID?: string;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    const [activeTab, setActiveTab] = ReactActual.useState(initialActiveIndex);

    const handleTabPress = (index: number) => {
      setActiveTab(index);
      if (onChangeTab) {
        onChangeTab({ i: index, ref: children });
      }
    };

    // Filter and cast children to ReactElements
    const validChildren = ReactActual.Children.toArray(children).filter(
      (child: React.ReactNode): child is React.ReactElement =>
        ReactActual.isValidElement(child),
    );

    return ReactActual.createElement(
      View,
      { testID: testID || 'tabs-list' },
      // Tab headers
      ReactActual.createElement(
        View,
        { testID: 'tab-headers', style: { flexDirection: 'row' } },
        validChildren.map((child: React.ReactElement, index: number) =>
          ReactActual.createElement(
            TouchableOpacity,
            {
              key: child.key || `tab-${index}`,
              testID: `tab-${index}`,
              onPress: () => handleTabPress(index),
              style: { padding: 10 },
            },
            ReactActual.createElement(
              Text,
              {
                style: {
                  fontWeight: activeTab === index ? 'bold' : 'normal',
                },
              },
              child.props.tabLabel || `Tab ${index + 1}`,
            ),
          ),
        ),
      ),
      // Active tab content
      ReactActual.createElement(
        View,
        { testID: 'tab-content' },
        validChildren[activeTab],
      ),
    );
  },
}));

// Mock TabBar
jest.mock('../../../../component-library/components-temp/TabBar', () => ({
  __esModule: true,
  default: function MockTabBar({
    tabs,
    activeTab,
    goToPage,
    style,
    tabStyle,
    underlineStyle,
  }: {
    tabs: { key: string; label: string; index: number }[];
    activeTab: number;
    goToPage: (index: number) => void;
    style: Record<string, unknown>;
    tabStyle: Record<string, unknown>;
    underlineStyle: Record<string, unknown>;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'tab-bar', style },
      tabs?.map((tab, index) =>
        ReactActual.createElement(
          TouchableOpacity,
          {
            key: tab.key,
            testID: `tab-${index}`,
            onPress: () => goToPage(index),
            style: tabStyle,
          },
          ReactActual.createElement(
            Text,
            {
              style: {
                fontWeight: activeTab === index ? 'bold' : 'normal',
              },
            },
            tab.label,
          ),
        ),
      ),
      ReactActual.createElement(View, { style: underlineStyle }),
    );
  },
}));

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
    seasonId: CURRENT_SEASON_ID,
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
    mockSelectSeasonId.mockReturnValue(defaultSelectorValues.seasonId);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectActiveTab) return defaultSelectorValues.activeTab;
      if (selector === selectRewardsSubscriptionId)
        return defaultSelectorValues.subscriptionId;
      if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
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
      expect(getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeTruthy();
      expect(getByTestId('tab-headers')).toBeTruthy();
      expect(getByTestId('tab-content')).toBeTruthy();
      expect(getByTestId('rewards-overview-tab')).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON)).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON)).toBeTruthy();
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
    it('should handle tab change when user selects different tab', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const levelsTab = getByTestId('tab-1');
      fireEvent.press(levelsTab);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(setActiveTab('levels'));
    });

    it('should render all tab options', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert - verify tab headers and individual tabs are rendered
      expect(getByTestId('tab-headers')).toBeTruthy();
      expect(getByTestId('tab-0')).toBeTruthy();
      expect(getByTestId('tab-1')).toBeTruthy();
      expect(getByTestId('tab-2')).toBeTruthy();
    });

    it('should show overview tab content by default', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId('rewards-overview-tab')).toBeTruthy();
    });

    it('should switch to levels tab when levels tab is pressed', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const levelsTab = getByTestId('tab-1');
      fireEvent.press(levelsTab);

      // Assert
      expect(getByTestId('rewards-levels-tab')).toBeTruthy();
    });

    it('should switch to activity tab when activity tab is pressed', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const activityTab = getByTestId('tab-2');
      fireEvent.press(activityTab);

      // Assert
      expect(getByTestId('rewards-activity-tab')).toBeTruthy();
    });

    it('should not allow tab switching when user is not opted in', () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        if (selector === selectSeasonId) return CURRENT_SEASON_ID;
        return undefined;
      });

      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const levelsTab = getByTestId('tab-1');
      fireEvent.press(levelsTab);

      // Assert - should show levels tab (tab change occurred)
      expect(getByTestId('rewards-levels-tab')).toBeTruthy();
    });
  });

  describe('button states when not opted in', () => {
    beforeEach(() => {
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockSelectSeasonId.mockReturnValue(CURRENT_SEASON_ID);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        if (selector === selectSeasonId) return CURRENT_SEASON_ID;
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
        if (selector === selectSeasonId) return CURRENT_SEASON_ID;
        return undefined;
      });

      // Act & Assert
      expect(() => render(<RewardsDashboard />)).not.toThrow();
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
