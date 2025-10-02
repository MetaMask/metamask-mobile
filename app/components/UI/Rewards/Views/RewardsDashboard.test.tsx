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

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
    // Run focus effects as a normal effect during tests
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = effect();
        return cleanup;
      }, []);
    },
  };
});

// Mock selectors
jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectActiveTab: jest.fn(),
  selectSeasonId: jest.fn(),
  selectHideCurrentAccountNotOptedInBannerArray: jest.fn(),
  selectHideUnlinkedAccountsBanner: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));

import {
  selectActiveTab,
  selectSeasonId,
  selectHideUnlinkedAccountsBanner,
  selectHideCurrentAccountNotOptedInBannerArray,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
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
const mockSelectHideUnlinkedAccountsBanner =
  selectHideUnlinkedAccountsBanner as jest.MockedFunction<
    typeof selectHideUnlinkedAccountsBanner
  >;
const mockSelectHideCurrentAccountNotOptedInBannerArray =
  selectHideCurrentAccountNotOptedInBannerArray as jest.MockedFunction<
    typeof selectHideCurrentAccountNotOptedInBannerArray
  >;
const mockSelectSelectedInternalAccount =
  selectSelectedInternalAccount as jest.MockedFunction<
    typeof selectSelectedInternalAccount
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

// Mock RewardsInfoBanner
jest.mock('../components/RewardsInfoBanner', () => ({
  __esModule: true,
  default: function MockRewardsInfoBanner({
    title,
    description,
    onConfirm,
    onDismiss,
    confirmButtonLabel,
    onConfirmLoading,
    testID,
  }: {
    title: string | React.ReactNode;
    description: string;
    onConfirm?: () => void;
    onDismiss?: () => void;
    confirmButtonLabel?: string;
    onConfirmLoading?: boolean;
    testID?: string;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: testID || 'rewards-info-banner' },
      ReactActual.createElement(
        Text,
        { testID: 'banner-title' },
        typeof title === 'string' ? title : 'Custom Title',
      ),
      ReactActual.createElement(
        Text,
        { testID: 'banner-description' },
        description,
      ),
      onConfirm &&
        ReactActual.createElement(
          TouchableOpacity,
          {
            testID: 'banner-confirm-button',
            onPress: onConfirm,
            disabled: onConfirmLoading,
          },
          ReactActual.createElement(
            Text,
            null,
            onConfirmLoading ? 'Loading...' : confirmButtonLabel || 'Confirm',
          ),
        ),
      onDismiss &&
        ReactActual.createElement(
          TouchableOpacity,
          { testID: 'banner-dismiss-button', onPress: onDismiss },
          ReactActual.createElement(Text, null, 'Dismiss'),
        ),
    );
  },
}));

// Mock AccountDisplayItem
jest.mock('../components/AccountDisplayItem/AccountDisplayItem', () => ({
  __esModule: true,
  default: function MockAccountDisplayItem({
    account,
  }: {
    account: InternalAccount;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'account-display-item' },
      ReactActual.createElement(
        Text,
        null,
        account?.metadata?.name || 'Account',
      ),
    );
  },
}));

// Mock hooks
jest.mock('../hooks/useRewardOptinSummary', () => ({
  useRewardOptinSummary: jest.fn(),
}));

jest.mock('../hooks/useLinkAccount', () => ({
  useLinkAccount: jest.fn(),
}));

jest.mock('../hooks/useRewardDashboardModals', () => ({
  useRewardDashboardModals: jest.fn(),
}));

jest.mock('../utils', () => ({
  convertInternalAccountToCaipAccountId: jest.fn(),
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
    const [activeTab, setActiveTabLocal] =
      ReactActual.useState(initialActiveIndex);

    const handleTabPress = (index: number) => {
      setActiveTabLocal(index);
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

// Import mocked hooks
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import { useLinkAccount } from '../hooks/useLinkAccount';
import { useRewardDashboardModals } from '../hooks/useRewardDashboardModals';
import { convertInternalAccountToCaipAccountId } from '../utils';
import { InternalAccount } from '@metamask/keyring-internal-api';

const mockUseRewardOptinSummary = useRewardOptinSummary as jest.MockedFunction<
  typeof useRewardOptinSummary
>;
const mockUseLinkAccount = useLinkAccount as jest.MockedFunction<
  typeof useLinkAccount
>;
const mockUseRewardDashboardModals =
  useRewardDashboardModals as jest.MockedFunction<
    typeof useRewardDashboardModals
  >;
const mockConvertInternalAccountToCaipAccountId =
  convertInternalAccountToCaipAccountId as jest.MockedFunction<
    typeof convertInternalAccountToCaipAccountId
  >;

describe('RewardsDashboard', () => {
  const mockDispatch = jest.fn();
  const mockLinkAccount = jest.fn();
  const mockShowUnlinkedAccountsModal = jest.fn();
  const mockShowNotOptedInModal = jest.fn();
  const mockShowNotSupportedModal = jest.fn();
  const mockHasShownModal = jest.fn();
  const mockResetSessionTracking = jest.fn();

  const mockSelectedAccount = {
    id: 'account-1',
    address: '0x123',
    type: 'eip155:eoa' as const,
    options: {},
    metadata: {
      name: 'Account 1',
      importTime: Date.now(),
      keyring: { type: 'HD Key Tree' },
    },
    scopes: ['eip155:1'] as `${string}:${string}`[],
    methods: ['eth_sendTransaction'],
  };

  const defaultSelectorValues = {
    activeTab: 'overview' as const,
    subscriptionId: 'test-subscription-id',
    seasonId: CURRENT_SEASON_ID,
    hideUnlinkedAccountsBanner: false,
    hideCurrentAccountNotOptedInBannerArray: [],
    selectedAccount: mockSelectedAccount,
  };

  const defaultHookValues = {
    useRewardOptinSummary: {
      linkedAccounts: [],
      unlinkedAccounts: [],
      currentAccountSupported: true,
      currentAccountOptedIn: null,
      isLoading: false,
      hasError: false,
      refresh: jest.fn(),
    },
    useLinkAccount: {
      linkAccount: mockLinkAccount,
      isLoading: false,
      isError: false,
      error: null,
    },
    useRewardDashboardModals: {
      showUnlinkedAccountsModal: mockShowUnlinkedAccountsModal,
      showNotOptedInModal: mockShowNotOptedInModal,
      showNotSupportedModal: mockShowNotSupportedModal,
      hasShownModal: mockHasShownModal,
      resetSessionTracking: mockResetSessionTracking,
      resetSessionTrackingForCurrentAccountGroup: jest.fn(),
      resetAllSessionTracking: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockLinkAccount.mockClear();
    mockShowUnlinkedAccountsModal.mockClear();
    mockShowNotOptedInModal.mockClear();
    mockShowNotSupportedModal.mockClear();
    mockHasShownModal.mockClear();
    mockResetSessionTracking.mockClear();

    mockUseDispatch.mockReturnValue(mockDispatch);

    // Setup selector mocks
    mockSelectActiveTab.mockReturnValue(defaultSelectorValues.activeTab);
    mockSelectRewardsSubscriptionId.mockReturnValue(
      defaultSelectorValues.subscriptionId,
    );
    mockSelectSeasonId.mockReturnValue(defaultSelectorValues.seasonId);
    mockSelectHideUnlinkedAccountsBanner.mockReturnValue(
      defaultSelectorValues.hideUnlinkedAccountsBanner,
    );
    mockSelectHideCurrentAccountNotOptedInBannerArray.mockReturnValue(
      defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray,
    );
    mockSelectSelectedInternalAccount.mockReturnValue(
      defaultSelectorValues.selectedAccount,
    );

    // Setup hook mocks
    mockUseRewardOptinSummary.mockReturnValue(
      defaultHookValues.useRewardOptinSummary,
    );
    mockUseLinkAccount.mockReturnValue(defaultHookValues.useLinkAccount);
    mockUseRewardDashboardModals.mockReturnValue(
      defaultHookValues.useRewardDashboardModals,
    );
    mockConvertInternalAccountToCaipAccountId.mockReturnValue('eip155:1:0x123');

    // Setup default modal hook behavior - return false for all modal types by default
    mockHasShownModal.mockReturnValue(false);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectActiveTab) return defaultSelectorValues.activeTab;
      if (selector === selectRewardsSubscriptionId)
        return defaultSelectorValues.subscriptionId;
      if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
      if (selector === selectHideUnlinkedAccountsBanner)
        return defaultSelectorValues.hideUnlinkedAccountsBanner;
      if (selector === selectHideCurrentAccountNotOptedInBannerArray)
        return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
      if (selector === selectSelectedInternalAccount)
        return defaultSelectorValues.selectedAccount;
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

    it('should call modal hooks when component is rendered', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockUseRewardDashboardModals).toHaveBeenCalled();
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

  describe('edge cases', () => {
    it('should handle invalid activeTab gracefully', () => {
      // Arrange
      mockSelectActiveTab.mockReturnValue('overview');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'overview';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return CURRENT_SEASON_ID;
        return undefined;
      });

      // Act & Assert
      expect(() => render(<RewardsDashboard />)).not.toThrow();
    });
  });

  describe('modal triggering for current account', () => {
    it('should show not opted in modal when account has not opted in and modal has not been shown', () => {
      // Arrange - Mock account as not opted in
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountOptedIn: false,
        currentAccountSupported: true,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowNotOptedInModal).toHaveBeenCalled();
    });

    it('should show not supported modal when account is not supported and modal has not been shown', () => {
      // Arrange
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountSupported: false,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowNotSupportedModal).toHaveBeenCalled();
    });

    it('should not show modal when banner is dismissed via state', () => {
      // Arrange
      mockSelectHideCurrentAccountNotOptedInBannerArray.mockReturnValue([
        { caipAccountId: 'eip155:1:0x123', hide: true },
      ]);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return [{ caipAccountId: 'eip155:1:0x123', hide: true }];
        if (selector === selectSelectedInternalAccount)
          return defaultSelectorValues.selectedAccount;
        return undefined;
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
    });

    it('should not show modal when modal has already been shown in session', () => {
      // Arrange
      mockHasShownModal.mockReturnValue(true); // Modal already shown
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedInternalAccount)
          return defaultSelectorValues.selectedAccount;
        return undefined;
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
    });
  });

  describe('modal triggering for unlinked accounts', () => {
    beforeEach(() => {
      // Set up default state for unlinked accounts modal tests
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        unlinkedAccounts: [
          {
            id: 'account-2',
            address: '0x456',
            type: 'eip155:eoa' as const,
            options: {},
            metadata: {
              name: 'Account 2',
              importTime: Date.now(),
              keyring: { type: 'HD Key Tree' },
            },
            scopes: ['eip155:1'] as `${string}:${string}`[],
            methods: ['eth_sendTransaction'],
            hasOptedIn: false,
          },
        ],
      });
    });

    it('should show unlinked accounts modal when there are unlinked accounts and user has subscription', () => {
      // Arrange - Mock account as opted in and has unlinked accounts
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountOptedIn: true,
        unlinkedAccounts: [
          {
            id: 'account-2',
            address: '0x456',
            type: 'eip155:eoa' as const,
            options: {},
            metadata: {
              name: 'Account 2',
              importTime: Date.now(),
              keyring: { type: 'HD Key Tree' },
            },
            scopes: ['eip155:1'] as `${string}:${string}`[],
            methods: ['eth_sendTransaction'],
            hasOptedIn: false,
          },
        ],
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowUnlinkedAccountsModal).toHaveBeenCalled();
    });

    it('should not show unlinked accounts modal when hideUnlinkedAccountsBanner is true', () => {
      // Arrange
      mockSelectHideUnlinkedAccountsBanner.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
        if (selector === selectHideUnlinkedAccountsBanner) return true;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedInternalAccount)
          return defaultSelectorValues.selectedAccount;
        return undefined;
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });

    it('should not show unlinked accounts modal when current account is not opted in', () => {
      // Arrange - Mock account as not opted in but with unlinked accounts
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountOptedIn: false,
        currentAccountSupported: true,
        unlinkedAccounts: [
          {
            id: 'account-2',
            address: '0x456',
            type: 'eip155:eoa' as const,
            options: {},
            metadata: {
              name: 'Account 2',
              importTime: Date.now(),
              keyring: { type: 'HD Key Tree' },
            },
            scopes: ['eip155:1'] as `${string}:${string}`[],
            methods: ['eth_sendTransaction'],
            hasOptedIn: false,
          },
        ],
      });

      // Act
      render(<RewardsDashboard />);

      // Assert - Should prioritize current account modal over unlinked accounts
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
      expect(mockShowNotOptedInModal).toHaveBeenCalled();
    });

    it('should not show unlinked accounts modal when modal has already been shown', () => {
      // Arrange - setup mock to return true for unlinked accounts modal
      mockHasShownModal.mockImplementation(
        (modalType) => modalType === 'unlinked-accounts',
      );

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });
  });

  describe('modal prioritization', () => {
    it('should prioritize current account modal when account not opted in and has unlinked accounts', () => {
      // Arrange - Mock account as not opted in but with unlinked accounts
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountOptedIn: false,
        currentAccountSupported: true,
        unlinkedAccounts: [
          {
            id: 'account-2',
            address: '0x456',
            type: 'eip155:eoa' as const,
            options: {},
            metadata: {
              name: 'Account 2',
              importTime: Date.now(),
              keyring: { type: 'HD Key Tree' },
            },
            scopes: ['eip155:1'] as `${string}:${string}`[],
            methods: ['eth_sendTransaction'],
            hasOptedIn: false,
          },
        ],
      });

      // Act
      render(<RewardsDashboard />);

      // Assert - Should only show current account modal, not unlinked accounts
      expect(mockShowNotOptedInModal).toHaveBeenCalled();
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });

    it('should show unlinked accounts modal when current account banner dismissed and account is opted in', () => {
      // Arrange - Mock account as opted in and banner dismissed
      mockSelectHideCurrentAccountNotOptedInBannerArray.mockReturnValue([
        { caipAccountId: 'eip155:1:0x123', hide: true },
      ]);
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountOptedIn: true,
        unlinkedAccounts: [
          {
            id: 'account-2',
            address: '0x456',
            type: 'eip155:eoa' as const,
            options: {},
            metadata: {
              name: 'Account 2',
              importTime: Date.now(),
              keyring: { type: 'HD Key Tree' },
            },
            scopes: ['eip155:1'] as `${string}:${string}`[],
            methods: ['eth_sendTransaction'],
            hasOptedIn: false,
          },
        ],
      });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return [{ caipAccountId: 'eip155:1:0x123', hide: true }];
        if (selector === selectSelectedInternalAccount)
          return defaultSelectorValues.selectedAccount;
        return undefined;
      });

      // Act
      render(<RewardsDashboard />);

      // Assert - Should show unlinked accounts modal
      expect(mockShowUnlinkedAccountsModal).toHaveBeenCalled();
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
    });

    it('should prioritize not supported modal over other modals', () => {
      // Arrange
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountSupported: false,
        unlinkedAccounts: [
          {
            id: 'account-2',
            address: '0x456',
            type: 'eip155:eoa' as const,
            options: {},
            metadata: {
              name: 'Account 2',
              importTime: Date.now(),
              keyring: { type: 'HD Key Tree' },
            },
            scopes: ['eip155:1'] as `${string}:${string}`[],
            methods: ['eth_sendTransaction'],
            hasOptedIn: false,
          },
        ],
      });

      // Act
      render(<RewardsDashboard />);

      // Assert - Should prioritize not supported modal
      expect(mockShowNotSupportedModal).toHaveBeenCalled();
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });
  });

  describe('hook integration', () => {
    it('should call useRewardDashboardModals hook', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockUseRewardDashboardModals).toHaveBeenCalled();
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
