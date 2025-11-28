import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import PerpsMarketBalanceActions from './PerpsMarketBalanceActions';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { usePerpsLiveAccount } from '../../hooks/stream';
import {
  useColorPulseAnimation,
  useBalanceComparison,
  usePerpsTrading,
  usePerpsNetworkManagement,
} from '../../hooks';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { getDefaultPerpsControllerState } from '../../controllers';

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

// Mock Redux - we'll use renderWithProvider instead

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      // Mock controller methods that might be called
      getWithdrawals: jest.fn().mockResolvedValue([]),
      getDeposits: jest.fn().mockResolvedValue([]),
      getActiveProvider: jest.fn().mockReturnValue({
        getCompletedWithdrawals: jest.fn().mockResolvedValue([]),
        getCompletedDeposits: jest.fn().mockResolvedValue([]),
      }),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

// Mock strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'perps.available_balance': 'Available balance',
      'perps.add_funds': 'Add Funds',
      'perps.withdraw': 'Withdraw',
    };
    return mockStrings[key] || key;
  }),
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
  usePerpsHomeActions: jest.fn(() => ({
    handleAddFunds: jest.fn(),
    handleWithdraw: jest.fn(),
    isEligibilityModalVisible: false,
    closeEligibilityModal: jest.fn(),
    isEligible: true,
    isProcessing: false,
    error: null,
  })),
}));

jest.mock('../../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(),
}));

jest.mock('../../hooks/usePerpsDepositProgress', () => ({
  usePerpsDepositProgress: jest.fn(() => ({
    isDepositInProgress: false,
  })),
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
    Button: ({
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
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    ButtonSize: {
      Sm: 'sm',
      Md: 'md',
      Lg: 'lg',
    },
    ButtonVariant: {
      Primary: 'primary',
      Secondary: 'secondary',
      Link: 'link',
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

jest.mock('../../../../../component-library/components/Skeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: jest.fn(({ testID, width, height }) => (
      <View testID={testID} style={{ width, height }} />
    )),
  };
});

jest.mock('../../../../../contexts/FeatureFlagOverrideContext', () => ({
  FeatureFlagOverrideProvider: jest.fn(({ children }) => children),
}));

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

  // Helper function to create mock state
  const createMockState = (
    perpsControllerOverrides: Partial<
      ReturnType<typeof getDefaultPerpsControllerState>
    > = {},
  ) => ({
    engine: {
      backgroundState: {
        PerpsController: {
          ...getDefaultPerpsControllerState(),
          ...perpsControllerOverrides,
        },
        MultichainNetworkController: {
          multichainNetworkConfigurationsByChainId: {},
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined, // EVM selected, non-EVM chain field is undefined
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePerpsLiveAccount.mockReturnValue({
      account: defaultPerpsAccount,
      isInitialLoading: false,
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
      const { getByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Assert
      expect(
        getByTestId(
          PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_TEXT,
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE),
      ).toBeOnTheScreen();
    });

    it('displays formatted balance amount', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );
      const balanceElement = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
      );

      // Assert
      expect(balanceElement.props.children).toBe('$10.57');
    });

    it('shows both Add Funds and Withdraw buttons', () => {
      // Arrange & Act
      const { getByTestId, getByText } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

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

    it('renders available balance text with funded state', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Assert - Check that available balance text is rendered
      expect(
        getByTestId(
          PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_TEXT,
        ),
      ).toBeOnTheScreen();
    });

    it('returns null when no perps account is available', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: null,
        isInitialLoading: false,
        isLoading: false,
        error: null,
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Assert - Component should not render any elements when account is null
      expect(
        queryByTestId(PerpsMarketBalanceActionsSelectorsIDs.CONTAINER),
      ).toBeNull();
    });

    it('shows skeleton when initially loading account data', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: null,
        isInitialLoading: true,
        isLoading: true,
        error: null,
      });

      // Act
      const { getByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Assert
      expect(
        getByTestId(
          `${PerpsMarketBalanceActionsSelectorsIDs.CONTAINER}_skeleton`,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Balance Animation', () => {
    it('triggers animation when balance changes', () => {
      // Arrange
      const { rerender } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Act - Simulate balance change
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          ...defaultPerpsAccount,
          totalBalance: '15.50',
          availableBalance: '15.50',
        },
        isInitialLoading: false,
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
      expect(() =>
        renderWithProvider(
          <PerpsMarketBalanceActions />,
          { state: createMockState() },
          false, // Disable NavigationContainer
        ),
      ).not.toThrow();
    });
  });

  describe('Add Funds Button', () => {
    it('renders Add Funds button when user is eligible', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Assert
      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('Withdraw Button', () => {
    it('renders Withdraw button when balance is not empty', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Assert
      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON),
      ).toBeOnTheScreen();
    });

    it('is hidden when balance is empty', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          ...defaultPerpsAccount,
          totalBalance: '0',
          availableBalance: '0',
        },
        isInitialLoading: false,
        isLoading: false,
        error: null,
      });

      const { queryByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Act & Assert
      expect(
        queryByTestId(PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Eligibility Logic', () => {
    it('renders add funds button regardless of eligibility status', () => {
      // Arrange - Test with ineligible user
      const { getByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState({ isEligible: false }) },
        false, // Disable NavigationContainer
      );

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
    it('shows empty state when balance is zero', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          ...defaultPerpsAccount,
          totalBalance: '0.00',
          availableBalance: '0.00',
        },
        isInitialLoading: false,
        isLoading: false,
        error: null,
      });

      // Act
      const { getByText, getByTestId, queryByTestId } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Assert - Should show empty state UI instead of balance display
      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.EMPTY_STATE_TITLE),
      ).toBeOnTheScreen();
      expect(getByText('perps.add_funds')).toBeOnTheScreen();
      expect(
        queryByTestId(PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE),
      ).toBeNull();
    });
  });

  describe('Component Lifecycle', () => {
    it('stops animation on unmount', () => {
      // Arrange
      const { unmount } = renderWithProvider(
        <PerpsMarketBalanceActions />,
        { state: createMockState() },
        false, // Disable NavigationContainer
      );

      // Act
      unmount();

      // Assert
      expect(mockStopAnimation).toHaveBeenCalled();
    });
  });
});
