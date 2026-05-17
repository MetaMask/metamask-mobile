// Mock hooks first - must be hoisted before imports
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockAddListener = jest.fn();
const mockSetParams = jest.fn();
const mockSubmitDelegation = jest.fn();
const mockShowToast = jest.fn();
const mockDispatch = jest.fn();
const mockUseFocusEffect = jest.fn();
const mockNavigationDispatch = jest.fn();
const mockFetchSpendingLimitData = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    addListener: mockAddListener,
    setParams: mockSetParams,
    dispatch: mockNavigationDispatch,
  }),
  useFocusEffect: (callback: () => void) => mockUseFocusEffect(callback),
  StackActions: {
    replace: jest.fn((routeName, params) => ({
      type: 'REPLACE',
      payload: { name: routeName, params },
    })),
  },
}));

// Mock useCardHomeData hook (SpendingLimit now reads from it)
jest.mock('../../hooks/useCardHomeData', () => ({
  useCardHomeData: jest.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    primaryToken: null,
    availableTokens: [],
    fundingTokens: [],
    balanceMap: new Map(),
  })),
}));

// Mock useSpendingLimitData hook
jest.mock('../../hooks/useSpendingLimitData', () => jest.fn());

// Mock useSpendingLimit hook
const mockSubmit = jest.fn();
const mockCancel = jest.fn();
const mockSkip = jest.fn();
const mockSetSelectedToken = jest.fn();
const mockHandleAccountSelect = jest.fn();
const mockHandleOtherSelect = jest.fn();
const mockHandleLimitSelect = jest.fn();
const mockSetLimitType = jest.fn();
const mockSetCustomLimit = jest.fn();

jest.mock('../../hooks/useSpendingLimit', () => jest.fn());

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

// Import types after mocks but before usage
import { FundingStatus, CardFundingToken } from '../../types';

const mockPriorityToken: CardFundingToken = {
  address: '0x123',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  caipChainId: 'eip155:59144' as `${string}:${string}`,
  fundingStatus: FundingStatus.Limited,
  spendableBalance: '1000000',
  walletAddress: '0xwallet123',
};

const mockSolanaToken: CardFundingToken = {
  address: 'solana123',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  caipChainId:
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as `${string}:${string}`,
  fundingStatus: FundingStatus.Enabled,
  spendableBalance: '500000',
  walletAddress: '0xwallet123',
};

const mockMUSDToken: CardFundingToken = {
  address: '0xmusd',
  symbol: 'mUSD',
  name: 'Meta USD',
  decimals: 18,
  caipChainId: 'eip155:59144' as `${string}:${string}`,
  fundingStatus: FundingStatus.Enabled,
  spendableBalance: '2000000',
  walletAddress: '0xwallet123',
};

const mockSdk = {
  getSupportedTokensByChainId: jest.fn(),
  getPriorityToken: jest.fn(),
};

// Mock UserCancelledError
class MockUserCancelledError extends Error {
  constructor(message = 'User cancelled the transaction') {
    super(message);
    this.name = 'UserCancelledError';
  }
}

jest.mock('../../hooks/useCardDelegation', () => ({
  useCardDelegation: jest.fn(() => ({
    submitDelegation: mockSubmitDelegation,
    isLoading: false,
  })),
  UserCancelledError: MockUserCancelledError,
}));

jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(() => ({
    sdk: mockSdk,
    isLoading: false,
    userCardLocation: 'international' as const,
  })),
}));

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: jest.fn(),
  },
};

jest.mock('../../../../../component-library/components/Toast', () => {
  const React = jest.requireActual('react');
  const ToastContext = React.createContext({ toastRef: null });
  return {
    ToastContext,
    ToastVariants: {
      Icon: 'Icon',
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const strings: { [key: string]: string } = {
      'card.card_spending_limit.setup_title': 'Set up your card',
      'card.card_spending_limit.setup_description':
        "Select the token you'd like to use and set a limit.",
      'card.card_spending_limit.account_label': 'Account',
      'card.card_spending_limit.token_label': 'Token',
      'card.card_spending_limit.full_access_title': 'Full access',
      'card.card_spending_limit.full_access_description':
        'Card can spend any amount',
      'card.card_spending_limit.set_new_limit': 'Set a limit',
      'card.card_spending_limit.restricted_limit_title': 'Spending limit',
      'card.card_spending_limit.restricted_limit_description':
        'Set a spending limit',
      'card.card_spending_limit.confirm_new_limit': 'Confirm',
      'card.card_spending_limit.cancel': 'Cancel',
      'card.card_spending_limit.skip': 'Skip for now',
      'card.card_spending_limit.update_success': 'Spending limit updated',
      'card.card_spending_limit.update_error': 'Failed to update limit',
      'card.card_spending_limit.select_token': 'Select token',
      'card.card_spending_limit.loading': 'Loading available tokens...',
      'card.card_spending_limit.load_error':
        'Unable to load tokens. Please try again.',
      'card.card_spending_limit.retry': 'Try again',
    };
    return strings[key] || key;
  },
}));

jest.mock('../../util/buildTokenIconUrl', () => ({
  buildTokenIconUrl: jest.fn(
    (caipChainId: string, address: string) =>
      `https://icon.url/${caipChainId}/${address}`,
  ),
}));

jest.mock('../../components/AssetSelectionBottomSheet', () => ({
  createAssetSelectionModalNavigationDetails: jest.fn((params) => [
    'CardModals',
    { screen: 'CardAssetSelectionModal', params },
  ]),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator: RNActivityIndicator,
  } = jest.requireActual('react-native');

  return {
    ...actual,
    Box: ({
      children,
      testID,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactActual.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      testID,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactActual.createElement(Text, { testID, ...props }, children),
    Button: ({
      children,
      testID,
      onPress,
      label,
      isDisabled,
      isLoading,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactActual.createElement(
        TouchableOpacity,
        { testID, onPress, disabled: isDisabled || isLoading, ...props },
        isLoading
          ? ReactActual.createElement(RNActivityIndicator, {})
          : ReactActual.createElement(Text, {}, children || label),
      ),
  };
});

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import SpendingLimit from './SpendingLimit';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { useCardDelegation } from '../../hooks/useCardDelegation';
import Logger from '../../../../../util/Logger';
import { ToastContext } from '../../../../../component-library/components/Toast';
import useSpendingLimitData from '../../hooks/useSpendingLimitData';
import useSpendingLimit from '../../hooks/useSpendingLimit';

jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

interface MockRoute {
  params?: {
    flow?: 'manage' | 'enable' | 'onboarding';
    selectedToken?: CardFundingToken;
    returnedSelectedToken?: CardFundingToken;
  };
}

const mockUseSpendingLimitData = useSpendingLimitData as jest.MockedFunction<
  typeof useSpendingLimitData
>;

const mockUseSpendingLimit = useSpendingLimit as jest.MockedFunction<
  typeof useSpendingLimit
>;

const mockRoute: MockRoute = {
  params: {
    flow: 'manage' as const,
    selectedToken: undefined,
  },
};

describe('SpendingLimit Component', () => {
  // Wrapper component to provide ToastContext
  const SpendingLimitWithToast = (props: { route?: MockRoute }) => (
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <SpendingLimit route={props.route} />
    </ToastContext.Provider>
  );

  const render = (route: MockRoute = mockRoute) => {
    const Component = () => <SpendingLimitWithToast route={route} />;
    return renderScreen(
      Component,
      {
        name: 'SpendingLimit',
        options: {},
      },
      {
        state: {
          engine: {
            backgroundState: {
              PreferencesController: {
                isIpfsGatewayEnabled: true,
              },
            },
          },
        },
      },
    );
  };

  /** Default mock return for the settings-list UI. */
  const getDefaultUseSpendingLimitMock = () => ({
    selectedToken: mockPriorityToken,
    limitType: 'full' as const,
    customLimit: '',
    isLoading: false,
    setSelectedToken: mockSetSelectedToken,
    handleAccountSelect: mockHandleAccountSelect,
    handleOtherSelect: mockHandleOtherSelect,
    handleLimitSelect: mockHandleLimitSelect,
    setLimitType: mockSetLimitType,
    setCustomLimit: mockSetCustomLimit,
    submit: mockSubmit,
    cancel: mockCancel,
    skip: mockSkip,
    isValid: true,
    needsFaucet: false,
    isFaucetCheckLoading: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitDelegation.mockResolvedValue(undefined);

    // Mock addListener to return an unsubscribe function
    mockAddListener.mockReturnValue(jest.fn());

    // Mock useFocusEffect - store the callback but don't execute automatically
    // to avoid infinite render loops in tests
    mockUseFocusEffect.mockImplementation(() => {
      // No-op in tests - the hook will be called but won't execute the callback
    });

    // Reset useCardDelegation mock to default state
    (useCardDelegation as jest.Mock).mockReturnValue({
      submitDelegation: mockSubmitDelegation,
      isLoading: false,
    });

    // Reset useSpendingLimitData mock to default state
    mockUseSpendingLimitData.mockReturnValue({
      availableTokens: [mockPriorityToken, mockMUSDToken],
      delegationSettings: null,
      isLoading: false,
      error: null,
      fetchData: mockFetchSpendingLimitData,
    });

    // Reset useSpendingLimit mock to default state
    mockUseSpendingLimit.mockReturnValue(getDefaultUseSpendingLimitMock());
  });

  describe('Initial Rendering', () => {
    it('renders settings card with three rows', () => {
      render();

      expect(screen.getByTestId('account-row')).toBeOnTheScreen();
      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
      expect(screen.getByTestId('spending-limit-row')).toBeOnTheScreen();
    });

    it('shows "Full access" in spending limit row when limitType is full', () => {
      render();

      expect(screen.getByText('Full access')).toBeOnTheScreen();
    });

    it('renders confirm and cancel buttons', () => {
      render();

      expect(screen.getByText('Confirm')).toBeOnTheScreen();
      expect(screen.getByText('Cancel')).toBeOnTheScreen();
    });

    it('displays token label in "SYMBOL on NETWORK" format', () => {
      render();

      expect(screen.getByText('USDC on Linea')).toBeOnTheScreen();
    });
  });

  describe('Token Row', () => {
    it('displays selected token in "SYMBOL on NETWORK" format', () => {
      render();

      expect(screen.getByText('USDC on Linea')).toBeOnTheScreen();
      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });

    it('displays mUSD token label when mUSD is selected', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        selectedToken: mockMUSDToken,
      });

      render();

      expect(screen.getByText('mUSD on Linea')).toBeOnTheScreen();
    });

    it('renders token row with no icon when token has no iconUrl', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        selectedToken: null,
      });

      render();

      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });

    it('calls handleOtherSelect when token row is pressed', () => {
      render();

      fireEvent.press(screen.getByTestId('token-row'));

      expect(mockHandleOtherSelect).toHaveBeenCalled();
    });
  });

  describe('Account Row', () => {
    it('renders account row', () => {
      render();

      expect(screen.getByTestId('account-row')).toBeOnTheScreen();
    });

    it('calls handleAccountSelect when account row is pressed', () => {
      render();

      fireEvent.press(screen.getByTestId('account-row'));

      expect(mockHandleAccountSelect).toHaveBeenCalled();
    });
  });

  describe('Spending Limit Row', () => {
    it('shows "Full access" when limitType is full', () => {
      render();

      expect(screen.getByText('Full access')).toBeOnTheScreen();
    });

    it('shows custom amount when limitType is restricted', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        limitType: 'restricted',
        customLimit: '500',
      });

      render();

      expect(screen.getByText('500')).toBeOnTheScreen();
    });

    it('shows "0" when limitType is restricted with empty customLimit', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        limitType: 'restricted',
        customLimit: '',
      });

      render();

      expect(screen.getByText('0')).toBeOnTheScreen();
    });

    it('calls handleLimitSelect when spending limit row is pressed', () => {
      render();

      fireEvent.press(screen.getByTestId('spending-limit-row'));

      expect(mockHandleLimitSelect).toHaveBeenCalled();
    });
  });

  describe('Token Selection - Enable Flow', () => {
    it('uses token from route params when flow is enable', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        selectedToken: mockMUSDToken,
      });

      const enableRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockMUSDToken,
        },
      };

      render(enableRoute);

      expect(screen.getByText('mUSD on Linea')).toBeOnTheScreen();
      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });
  });

  describe('Token Selection - Manage Flow', () => {
    it('shows selected token in token row', () => {
      render();

      expect(screen.getByText('USDC on Linea')).toBeOnTheScreen();
      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });

    it('renders token row for Solana route', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        selectedToken: mockSolanaToken,
      });

      const solanaRoute: MockRoute = {
        params: {
          flow: 'manage' as const,
        },
      };

      render(solanaRoute);

      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });

    it('renders token row when no token is selected', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        selectedToken: null,
      });

      const emptyRoute: MockRoute = {
        params: {
          flow: 'manage' as const,
        },
      };

      render(emptyRoute);

      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });

    it('renders Solana token in token row', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        selectedToken: mockSolanaToken,
      });

      const solanaOnlyRoute: MockRoute = {
        params: {
          flow: 'manage' as const,
        },
      };

      render(solanaOnlyRoute);

      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });
  });

  describe('Confirm Button State', () => {
    it('enables confirm button for full access mode', () => {
      render();

      const confirmButton = screen.getByText('Confirm');

      expect(confirmButton).toBeOnTheScreen();
    });

    it('renders confirm button when restricted mode is selected', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        limitType: 'restricted',
        customLimit: '100',
      });

      render();

      const confirmButton = screen.getByText('Confirm');

      expect(confirmButton).toBeOnTheScreen();
    });

    it('renders confirm button for Solana token route', () => {
      const solanaRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockSolanaToken,
        },
      };

      render(solanaRoute);

      const confirmButton = screen.getByText('Confirm');

      expect(confirmButton).toBeOnTheScreen();
    });

    it('calls submit when confirm button is pressed', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });
    });

    it('renders loading state when isLoading is true', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        isLoading: true,
      });

      render();

      expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe('Delegation Submission', () => {
    it('calls submit when confirm button is pressed', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });
    });

    it('calls handleLimitSelect when spending limit row is pressed', () => {
      render();

      fireEvent.press(screen.getByTestId('spending-limit-row'));

      expect(mockHandleLimitSelect).toHaveBeenCalled();
    });

    it('renders mUSD token in enable flow', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        selectedToken: mockMUSDToken,
      });

      const enableRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockMUSDToken,
        },
      };

      render(enableRoute);

      expect(screen.getByText('mUSD on Linea')).toBeOnTheScreen();
      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });

    it('renders Solana token route', () => {
      const solanaRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockSolanaToken,
        },
      };

      render(solanaRoute);

      expect(screen.getByText('Confirm')).toBeOnTheScreen();
    });

    it('renders spending limit row', () => {
      render();

      expect(screen.getByTestId('spending-limit-row')).toBeOnTheScreen();
      expect(screen.getByText('Full access')).toBeOnTheScreen();
    });

    it('pressing spending limit row opens limit selector', () => {
      render();

      fireEvent.press(screen.getByTestId('spending-limit-row'));

      expect(mockHandleLimitSelect).toHaveBeenCalled();
    });
  });

  describe('Cancel Behavior', () => {
    it('calls cancel when cancel button is pressed', () => {
      render();

      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockCancel).toHaveBeenCalled();
    });

    it('renders cancel button when loading', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        isLoading: true,
      });

      render();

      const cancelButton = screen.getByText('Cancel');

      expect(cancelButton).toBeOnTheScreen();
    });
  });

  describe('Navigation Blocking', () => {
    it('registers navigation listener on mount', () => {
      render();

      expect(mockAddListener).toHaveBeenCalledWith(
        'beforeRemove',
        expect.any(Function),
      );
    });

    it('blocks navigation when isLoading is true', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        isLoading: true,
      });

      render();

      const mockEvent = { preventDefault: jest.fn() };
      const beforeRemoveCallback = mockAddListener.mock.calls[0][1];

      beforeRemoveCallback(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('allows navigation when isLoading is false', () => {
      render();

      const mockEvent = { preventDefault: jest.fn() };
      const beforeRemoveCallback = mockAddListener.mock.calls[0][1];

      beforeRemoveCallback(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('unsubscribes from navigation listener on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockAddListener.mockReturnValue(mockUnsubscribe);

      const { unmount } = render();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Network Derivation', () => {
    it('displays token with EIP155 chain ID in "SYMBOL on NETWORK" format', () => {
      render();

      expect(screen.getByText('USDC on Linea')).toBeOnTheScreen();
      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });

    it('renders component with Solana token route', () => {
      const solanaTokenWithFullChainId = {
        ...mockSolanaToken,
        caipChainId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as `${string}:${string}`,
      };

      const solanaRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: solanaTokenWithFullChainId,
        },
      };

      render(solanaRoute);

      expect(screen.getByText('Confirm')).toBeOnTheScreen();
    });
  });

  describe('Loading States', () => {
    it('renders loading indicator when isLoading is true', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        isLoading: true,
      });

      render();

      expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe('Onboarding Flow', () => {
    const onboardingRoute: MockRoute = {
      params: {
        flow: 'onboarding' as const,
      },
    };

    it('fetches data on mount when flow is onboarding', () => {
      render(onboardingRoute);

      expect(mockFetchSpendingLimitData).toHaveBeenCalledTimes(1);
    });

    it('does not fetch data on mount when flow is manage', () => {
      render();

      expect(mockFetchSpendingLimitData).not.toHaveBeenCalled();
    });

    it('displays loading state while fetching data in onboarding flow', () => {
      mockUseSpendingLimitData.mockReturnValue({
        availableTokens: [],
        delegationSettings: null,
        isLoading: true,
        error: null,
        fetchData: mockFetchSpendingLimitData,
      });

      render(onboardingRoute);

      expect(screen.getByText('Loading available tokens...')).toBeOnTheScreen();
      expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
    });

    it('displays error state with retry and skip buttons when fetch fails', () => {
      mockUseSpendingLimitData.mockReturnValue({
        availableTokens: [],
        delegationSettings: null,
        isLoading: false,
        error: new Error('Network error'),
        fetchData: mockFetchSpendingLimitData,
      });

      render(onboardingRoute);

      expect(
        screen.getByText('Unable to load tokens. Please try again.'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Try again')).toBeOnTheScreen();
      expect(screen.getByText('Skip for now')).toBeOnTheScreen();
    });

    it('calls fetchData when retry button is pressed on error state', () => {
      mockUseSpendingLimitData.mockReturnValue({
        availableTokens: [],
        delegationSettings: null,
        isLoading: false,
        error: new Error('Network error'),
        fetchData: mockFetchSpendingLimitData,
      });

      render(onboardingRoute);

      const retryButton = screen.getByText('Try again');
      fireEvent.press(retryButton);

      // fetchData is called once on mount, and once when retry is pressed
      expect(mockFetchSpendingLimitData).toHaveBeenCalledTimes(2);
    });

    it('calls skip when skip button is pressed on error state', () => {
      mockUseSpendingLimitData.mockReturnValue({
        availableTokens: [],
        delegationSettings: null,
        isLoading: false,
        error: new Error('Network error'),
        fetchData: mockFetchSpendingLimitData,
      });

      render(onboardingRoute);

      const skipButton = screen.getByText('Skip for now');
      fireEvent.press(skipButton);

      expect(mockSkip).toHaveBeenCalled();
    });

    it('renders Cancel button in onboarding flow', () => {
      render(onboardingRoute);

      expect(screen.getByText('Cancel')).toBeOnTheScreen();
    });

    it('calls skip when cancel is pressed in onboarding flow', () => {
      render(onboardingRoute);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockSkip).toHaveBeenCalled();
    });

    it('renders confirm button in onboarding flow', () => {
      mockUseSpendingLimitData.mockReturnValue({
        availableTokens: [mockPriorityToken, mockMUSDToken],
        delegationSettings: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchSpendingLimitData,
      });

      render(onboardingRoute);

      expect(screen.getByText('Confirm')).toBeOnTheScreen();
    });

    it('renders token row with selected token in onboarding flow', () => {
      mockUseSpendingLimitData.mockReturnValue({
        availableTokens: [mockMUSDToken],
        delegationSettings: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchSpendingLimitData,
      });

      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        selectedToken: mockMUSDToken,
      });

      render(onboardingRoute);

      expect(screen.getByText('mUSD on Linea')).toBeOnTheScreen();
      expect(screen.getByTestId('token-row')).toBeOnTheScreen();
    });

    it('calls submit when confirm is pressed in onboarding flow', async () => {
      const onboardingWithToken: MockRoute = {
        params: {
          flow: 'onboarding' as const,
          selectedToken: mockPriorityToken,
        },
      };

      render(onboardingWithToken);

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });
    });

    it('renders onboarding route with token', () => {
      const onboardingWithToken: MockRoute = {
        params: {
          flow: 'onboarding' as const,
          selectedToken: mockPriorityToken,
        },
      };

      render(onboardingWithToken);

      expect(screen.getByText('Confirm')).toBeOnTheScreen();
    });

    it('renders cancel button during loading state in onboarding', () => {
      mockUseSpendingLimit.mockReturnValue({
        ...getDefaultUseSpendingLimitMock(),
        isLoading: true,
      });

      const onboardingWithToken: MockRoute = {
        params: {
          flow: 'onboarding' as const,
          selectedToken: mockPriorityToken,
        },
      };

      render(onboardingWithToken);

      expect(screen.getByText('Cancel')).toBeOnTheScreen();
    });
  });
});
