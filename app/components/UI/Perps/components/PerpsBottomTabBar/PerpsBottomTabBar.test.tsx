import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import PerpsBottomTabBar from './PerpsBottomTabBar';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsHomeViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    const translations: Record<string, string> = {
      'bottom_nav.home': 'Home',
      'bottom_nav.browser': 'Browser',
      'bottom_nav.activity': 'Activity',
      'bottom_nav.rewards': 'Rewards',
      'bottom_nav.settings': 'Settings',
    };
    return translations[key] || key;
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 20, top: 0, left: 0, right: 0 })),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((className) => ({ className })),
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      style?: object;
    }) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
  };
});

jest.mock(
  '../../../../../component-library/components/Navigation/TabBarItem',
  () => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        onPress,
        testID,
        label,
      }: {
        onPress: () => void;
        testID: string;
        label: string;
      }) => (
        <TouchableOpacity testID={testID} onPress={onPress}>
          <Text>{label}</Text>
        </TouchableOpacity>
      ),
    };
  },
);

describe('PerpsBottomTabBar', () => {
  const mockNavigate = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as ReturnType<typeof useNavigation>);
    mockUseSelector.mockReturnValue(false); // isRewardsEnabled = false
  });

  describe('Rendering', () => {
    it('renders all tab items', () => {
      const { getByText } = render(<PerpsBottomTabBar />);

      expect(getByText('Home')).toBeTruthy();
      expect(getByText('Browser')).toBeTruthy();
      expect(getByText('Trade')).toBeTruthy();
      expect(getByText('Activity')).toBeTruthy();
      expect(getByText('Settings')).toBeTruthy(); // When rewards disabled
    });

    it('renders Rewards tab when rewards feature is enabled', () => {
      mockUseSelector.mockReturnValue(true); // isRewardsEnabled = true
      const { getByText } = render(<PerpsBottomTabBar />);

      expect(getByText('Rewards')).toBeTruthy();
    });

    it('renders Settings tab when rewards feature is disabled', () => {
      mockUseSelector.mockReturnValue(false); // isRewardsEnabled = false
      const { getByText } = render(<PerpsBottomTabBar />);

      expect(getByText('Settings')).toBeTruthy();
    });

    it('highlights active tab when activeTab prop is provided', () => {
      const { getByTestId } = render(<PerpsBottomTabBar activeTab="wallet" />);

      const walletTab = getByTestId(PerpsHomeViewSelectorsIDs.TAB_BAR_WALLET);
      expect(walletTab).toBeTruthy();
      // TabBarItem handles isActive internally, we just verify it's rendered
    });
  });

  describe('Default Navigation', () => {
    it('navigates to wallet view when Home tab is pressed', () => {
      const { getByTestId } = render(<PerpsBottomTabBar />);

      const homeTab = getByTestId(PerpsHomeViewSelectorsIDs.TAB_BAR_WALLET);
      fireEvent.press(homeTab);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    });

    it('navigates to browser view when Browser tab is pressed', () => {
      const { getByTestId } = render(<PerpsBottomTabBar />);

      const browserTab = getByTestId(PerpsHomeViewSelectorsIDs.TAB_BAR_BROWSER);
      fireEvent.press(browserTab);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
      });
    });

    it('navigates to actions modal when Trade tab is pressed', () => {
      const { getByTestId } = render(<PerpsBottomTabBar />);

      const tradeTab = getByTestId(PerpsHomeViewSelectorsIDs.TAB_BAR_ACTIONS);
      fireEvent.press(tradeTab);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.WALLET_ACTIONS,
      });
    });

    it('navigates to transactions view when Activity tab is pressed', () => {
      const { getByTestId } = render(<PerpsBottomTabBar />);

      const activityTab = getByTestId(
        PerpsHomeViewSelectorsIDs.TAB_BAR_ACTIVITY,
      );
      fireEvent.press(activityTab);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('navigates to settings view when Settings tab is pressed (rewards disabled)', () => {
      mockUseSelector.mockReturnValue(false);
      const { getByTestId } = render(<PerpsBottomTabBar />);

      const settingsTab = getByTestId('tab-bar-item-settings');
      fireEvent.press(settingsTab);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
        screen: 'Settings',
      });
    });

    it('navigates to rewards view when Rewards tab is pressed (rewards enabled)', () => {
      mockUseSelector.mockReturnValue(true);
      const { getByTestId } = render(<PerpsBottomTabBar />);

      const rewardsTab = getByTestId('tab-bar-item-rewards');
      fireEvent.press(rewardsTab);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });
  });

  describe('Custom Navigation Handlers', () => {
    it('uses custom onWalletPress handler when provided', () => {
      const customHandler = jest.fn();
      const { getByTestId } = render(
        <PerpsBottomTabBar onWalletPress={customHandler} />,
      );

      const homeTab = getByTestId(PerpsHomeViewSelectorsIDs.TAB_BAR_WALLET);
      fireEvent.press(homeTab);

      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('uses custom onBrowserPress handler when provided', () => {
      const customHandler = jest.fn();
      const { getByTestId } = render(
        <PerpsBottomTabBar onBrowserPress={customHandler} />,
      );

      const browserTab = getByTestId(PerpsHomeViewSelectorsIDs.TAB_BAR_BROWSER);
      fireEvent.press(browserTab);

      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('uses custom onActionsPress handler when provided', () => {
      const customHandler = jest.fn();
      const { getByTestId } = render(
        <PerpsBottomTabBar onActionsPress={customHandler} />,
      );

      const tradeTab = getByTestId(PerpsHomeViewSelectorsIDs.TAB_BAR_ACTIONS);
      fireEvent.press(tradeTab);

      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('uses custom onActivityPress handler when provided', () => {
      const customHandler = jest.fn();
      const { getByTestId } = render(
        <PerpsBottomTabBar onActivityPress={customHandler} />,
      );

      const activityTab = getByTestId(
        PerpsHomeViewSelectorsIDs.TAB_BAR_ACTIVITY,
      );
      fireEvent.press(activityTab);

      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('uses custom onRewardsOrSettingsPress handler when provided', () => {
      const customHandler = jest.fn();
      const { getByTestId } = render(
        <PerpsBottomTabBar onRewardsOrSettingsPress={customHandler} />,
      );

      const settingsTab = getByTestId('tab-bar-item-settings');
      fireEvent.press(settingsTab);

      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Test ID', () => {
    it('applies custom testID to container when provided', () => {
      const { getByTestId } = render(
        <PerpsBottomTabBar testID="custom-tab-bar" />,
      );

      expect(getByTestId('custom-tab-bar')).toBeTruthy();
    });
  });
});
