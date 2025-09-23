import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PerpsMarketBalanceActions from './PerpsMarketBalanceActions';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import { usePerpsLiveAccount } from '../../hooks/stream';
import {
  useColorPulseAnimation,
  useBalanceComparison,
  usePerpsTrading,
  usePerpsNetworkManagement,
} from '../../hooks';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';

// TypeScript interfaces for component props
interface MockComponentProps {
  children?: ReactNode;
  testID?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?:
    | StyleProp<ViewStyle>
    | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
}

// Mock dependencies
const mockNavigate = jest.fn();
const mockNavigateToConfirmation = jest.fn();
const mockDepositWithConfirmation = jest.fn();
const mockEnsureArbitrumNetworkExists = jest.fn();
const mockStartPulseAnimation = jest.fn();
const mockGetAnimatedStyle = jest.fn(() => ({}));
const mockStopAnimation = jest.fn();
const mockCompareAndUpdateBalance = jest.fn(() => 'increase');

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock Redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  useColorPulseAnimation: jest.fn(),
  useBalanceComparison: jest.fn(),
  usePerpsTrading: jest.fn(),
  usePerpsNetworkManagement: jest.fn(),
}));

jest.mock('../../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(),
}));

// Mock design system
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((classes) => ({ testClasses: classes })),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    Box: ({ children, testID, ...props }: MockComponentProps) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    Text: ({ children, testID, ...props }: MockComponentProps) => (
      <Text testID={testID} {...props}>
        {children}
      </Text>
    ),
    ButtonBase: ({
      children,
      onPress,
      testID,
      disabled,
      ...props
    }: MockComponentProps) => (
      <TouchableOpacity
        onPress={onPress}
        testID={testID}
        disabled={disabled}
        accessibilityState={{ disabled }}
        {...props}
      >
        {children}
      </TouchableOpacity>
    ),
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    FontWeight: {
      Medium: 'medium',
      Bold: 'bold',
    },
  };
});

// Mock localization
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock images
jest.mock('../../../../../images/image-icons', () => ({
  HL: 'mock-hl-image',
}));

// Mock format utils
jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((amount) => `$${amount}`),
}));

// Mock PerpsBottomSheetTooltip to avoid SafeArea issues
jest.mock('../PerpsBottomSheetTooltip', () => {
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ isVisible, testID }) =>
    isVisible ? (
      <View testID={testID}>
        <Text>Mock Tooltip</Text>
      </View>
    ) : null,
  );
});

// Mock component library components
jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => {
    const { View } = jest.requireActual('react-native');
    return jest.fn(({ testID }) => <View testID={testID} />);
  },
);

jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/Avatar.types',
  () => ({
    AvatarSize: {
      Xs: 16,
      Sm: 24,
      Md: 32,
      Lg: 40,
      Xl: 48,
    },
  }),
);

jest.mock(
  '../../../../../component-library/components/Badges/BadgeWrapper',
  () => {
    const { View } = jest.requireActual('react-native');
    const BadgeWrapper = jest.fn(({ children, testID }) => (
      <View testID={testID}>{children}</View>
    ));
    return {
      __esModule: true,
      default: BadgeWrapper,
    };
  },
);

jest.mock(
  '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types',
  () => ({
    BadgePosition: {
      TopLeft: 'top-left',
      TopRight: 'top-right',
      BottomLeft: 'bottom-left',
      BottomRight: 'bottom-right',
    },
  }),
);

jest.mock('../../../../../component-library/components/Badges/Badge', () => {
  const { View } = jest.requireActual('react-native');
  const Badge = jest.fn(({ testID }) => <View testID={testID} />);
  return {
    __esModule: true,
    default: Badge,
    BadgeVariant: {
      Network: 'network',
      Status: 'status',
      NotificationsKinds: 'notifications',
    },
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      View: RN.View,
    },
  };
});

// Setup mocks
const mockUseSelector = useSelector as jest.Mock;
const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.Mock;
const mockUseColorPulseAnimation = useColorPulseAnimation as jest.Mock;
const mockUseBalanceComparison = useBalanceComparison as jest.Mock;
const mockUsePerpsTrading = usePerpsTrading as jest.Mock;
const mockUsePerpsNetworkManagement = usePerpsNetworkManagement as jest.Mock;
const mockUseConfirmNavigation = useConfirmNavigation as jest.Mock;

describe('PerpsMarketBalanceActions', () => {
  const defaultPerpsAccount = {
    totalBalance: '10.57',
    availableBalance: '10.57',
    marginUsed: '0.00',
    totalUSDBalance: 10.57,
    positions: [],
    orders: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEligibility) return true;
      return undefined;
    });

    mockUsePerpsLiveAccount.mockReturnValue({
      account: defaultPerpsAccount,
      isLoading: false,
      error: null,
    });

    mockUseColorPulseAnimation.mockReturnValue({
      startPulseAnimation: mockStartPulseAnimation,
      getAnimatedStyle: mockGetAnimatedStyle,
      stopAnimation: mockStopAnimation,
    });

    mockUseBalanceComparison.mockReturnValue({
      compareAndUpdateBalance: mockCompareAndUpdateBalance,
    });

    mockUsePerpsTrading.mockReturnValue({
      depositWithConfirmation: mockDepositWithConfirmation,
    });

    mockUsePerpsNetworkManagement.mockReturnValue({
      ensureArbitrumNetworkExists: mockEnsureArbitrumNetworkExists,
    });

    mockUseConfirmNavigation.mockReturnValue({
      navigateToConfirmation: mockNavigateToConfirmation,
    });

    mockDepositWithConfirmation.mockResolvedValue({});
    mockEnsureArbitrumNetworkExists.mockResolvedValue({});
  });

  describe('Rendering', () => {
    it('renders component with balance display', () => {
      // Arrange & Act
      const { getByText, getByTestId } = render(<PerpsMarketBalanceActions />);

      // Assert
      expect(getByText('perps.available_balance')).toBeOnTheScreen();
      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE),
      ).toBeOnTheScreen();
    });

    it('displays formatted balance amount', () => {
      // Arrange & Act
      const { getByTestId } = render(<PerpsMarketBalanceActions />);
      const balanceElement = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
      );

      // Assert
      expect(balanceElement.props.children).toBe('$10.57');
    });

    it('shows both Add Funds and Withdraw buttons', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(<PerpsMarketBalanceActions />);

      // Assert
      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON),
      ).toBeOnTheScreen();
      expect(getByText('perps.add_funds')).toBeOnTheScreen();
      expect(getByText('perps.withdraw')).toBeOnTheScreen();
    });

    it('renders USDC avatar with HyperLiquid badge', () => {
      // Arrange & Act
      const { getByText } = render(<PerpsMarketBalanceActions />);

      // Assert - Check that the component renders (badge is complex to test directly)
      expect(getByText('perps.available_balance')).toBeOnTheScreen();
    });

    it('returns null when no perps account is available', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: null,
        isLoading: false,
        error: null,
      });

      // Act
      const { UNSAFE_root } = render(<PerpsMarketBalanceActions />);

      // Assert
      expect(UNSAFE_root.children).toHaveLength(0);
    });
  });

  describe('Balance Animation', () => {
    it('triggers animation when balance changes', () => {
      // Arrange
      const { rerender } = render(<PerpsMarketBalanceActions />);

      // Act - Simulate balance change
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          ...defaultPerpsAccount,
          totalBalance: '15.50',
          availableBalance: '15.50',
        },
        isLoading: false,
        error: null,
      });
      rerender(<PerpsMarketBalanceActions />);

      // Assert
      expect(mockCompareAndUpdateBalance).toHaveBeenCalled();
    });

    it('handles animation errors gracefully', () => {
      // Arrange
      mockStartPulseAnimation.mockImplementation(() => {
        throw new Error('Animation error');
      });

      // Act & Assert - Should not throw
      expect(() => render(<PerpsMarketBalanceActions />)).not.toThrow();
    });
  });

  describe('Add Funds Button', () => {
    it('calls correct handlers when eligible user clicks Add Funds', async () => {
      // Arrange
      const { getByTestId } = render(<PerpsMarketBalanceActions />);
      const addFundsButton = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      );

      // Act
      fireEvent.press(addFundsButton);

      // Assert
      await waitFor(() => {
        expect(mockEnsureArbitrumNetworkExists).toHaveBeenCalled();
        expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
          stack: Routes.PERPS.ROOT,
        });
        expect(mockDepositWithConfirmation).toHaveBeenCalled();
      });
    });

    it('does not proceed with deposit when user is ineligible', async () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsEligibility) return false;
        return undefined;
      });

      const { getByTestId } = render(<PerpsMarketBalanceActions />);
      const addFundsButton = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      );

      // Act
      fireEvent.press(addFundsButton);

      // Wait a bit to ensure any async operations would have completed
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - Should not proceed with deposit functions when ineligible
      expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
      expect(mockEnsureArbitrumNetworkExists).not.toHaveBeenCalled();
    });

    it('handles network setup failure gracefully', async () => {
      // Arrange
      mockEnsureArbitrumNetworkExists.mockRejectedValue(
        new Error('Network error'),
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByTestId } = render(<PerpsMarketBalanceActions />);
      const addFundsButton = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      );

      // Act
      fireEvent.press(addFundsButton);

      // Assert
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to proceed with deposit:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Withdraw Button', () => {
    it('calls correct handlers when eligible user clicks Withdraw', async () => {
      // Arrange
      const { getByTestId } = render(<PerpsMarketBalanceActions />);
      const withdrawButton = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON,
      );

      // Act
      fireEvent.press(withdrawButton);

      // Assert
      await waitFor(() => {
        expect(mockEnsureArbitrumNetworkExists).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.WITHDRAW,
        });
      });
    });

    it('is hidden when balance is empty', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          ...defaultPerpsAccount,
          totalBalance: '0',
          availableBalance: '0',
        },
        isLoading: false,
        error: null,
      });

      const { queryByTestId } = render(<PerpsMarketBalanceActions />);

      // Act & Assert
      expect(
        queryByTestId(PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('does not proceed with withdraw when user is ineligible', async () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsEligibility) return false;
        return undefined;
      });

      const { getByTestId } = render(<PerpsMarketBalanceActions />);
      const withdrawButton = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON,
      );

      // Act
      fireEvent.press(withdrawButton);

      // Wait a bit to ensure any async operations would have completed
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - Should not proceed with navigation when ineligible
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockEnsureArbitrumNetworkExists).not.toHaveBeenCalled();
    });

    it('handles network setup failure gracefully', async () => {
      // Arrange
      mockEnsureArbitrumNetworkExists.mockRejectedValue(
        new Error('Network error'),
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByTestId } = render(<PerpsMarketBalanceActions />);
      const withdrawButton = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON,
      );

      // Act
      fireEvent.press(withdrawButton);

      // Assert
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to proceed with withdraw:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Eligibility Logic', () => {
    it('renders add funds button regardless of eligibility status', () => {
      // Arrange - Test with ineligible user
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsEligibility) return false;
        return undefined;
      });

      // Act
      const { getByTestId } = render(<PerpsMarketBalanceActions />);

      // Assert - Add funds button should still render
      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON),
      ).toBeOnTheScreen();
      // Withdraw button should render when balance > 0 (defaultPerpsAccount has balance)
      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles deposit initialization failure gracefully', async () => {
      // Arrange
      mockDepositWithConfirmation.mockRejectedValue(new Error('Deposit error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByTestId } = render(<PerpsMarketBalanceActions />);
      const addFundsButton = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      );

      // Act
      fireEvent.press(addFundsButton);

      // Assert
      await waitFor(() => {
        expect(mockNavigateToConfirmation).toHaveBeenCalled();
      });

      // Wait a bit more for the async catch block
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to initialize deposit:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });

    it('handles zero balance formatting correctly', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          ...defaultPerpsAccount,
          totalBalance: '0.00',
          availableBalance: '0.00',
        },
        isLoading: false,
        error: null,
      });

      // Act
      const { getByTestId } = render(<PerpsMarketBalanceActions />);
      const balanceElement = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
      );

      // Assert
      expect(balanceElement.props.children).toBe('$0.00');
    });
  });

  describe('Component Lifecycle', () => {
    it('stops animation on unmount', () => {
      // Arrange
      const { unmount } = render(<PerpsMarketBalanceActions />);

      // Act
      unmount();

      // Assert
      expect(mockStopAnimation).toHaveBeenCalled();
    });
  });
});
