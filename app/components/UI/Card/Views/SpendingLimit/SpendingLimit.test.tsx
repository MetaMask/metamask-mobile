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

// Mock useSpendingLimitData hook
jest.mock('../../hooks/useSpendingLimitData', () => jest.fn());

// Mock useSpendingLimit hook
const mockSubmit = jest.fn();
const mockCancel = jest.fn();
const mockSkip = jest.fn();
const mockSetSelectedToken = jest.fn();
const mockHandleQuickSelectToken = jest.fn();
const mockHandleOtherSelect = jest.fn();
const mockSetLimitType = jest.fn();
const mockSetCustomLimit = jest.fn();

jest.mock('../../hooks/useSpendingLimit', () => jest.fn());

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

// Import types after mocks but before usage
import {
  AllowanceState,
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardExternalWalletDetailsResponse,
} from '../../types';

const mockPriorityToken: CardTokenAllowance = {
  address: '0x123',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  caipChainId: 'eip155:59144' as `${string}:${string}`,
  allowanceState: AllowanceState.Limited,
  allowance: '1000000',
  walletAddress: '0xwallet123',
};

const mockSolanaToken: CardTokenAllowance = {
  address: 'solana123',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  caipChainId:
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as `${string}:${string}`,
  allowanceState: AllowanceState.Enabled,
  allowance: '500000',
  walletAddress: '0xwallet123',
};

const mockMUSDToken: CardTokenAllowance = {
  address: '0xmusd',
  symbol: 'mUSD',
  name: 'Meta USD',
  decimals: 18,
  caipChainId: 'eip155:59144' as `${string}:${string}`,
  allowanceState: AllowanceState.Enabled,
  allowance: '2000000',
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

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      success: { default: '#00ff00', muted: '#00ff0033' },
      error: { default: '#ff0000', muted: '#ff000033' },
      background: { default: '#ffffff' },
      text: { default: '#000000' },
      border: { default: '#cccccc' },
    },
  })),
}));

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
      'card.card_spending_limit.full_access_title': 'Full access',
      'card.card_spending_limit.full_access_description':
        'Card can spend any amount',
      'card.card_spending_limit.set_new_limit': 'Set a limit',
      'card.card_spending_limit.restricted_limit_title': 'Restricted',
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
    selectedToken?: CardTokenAllowance;
    priorityToken?: CardTokenAllowance | null;
    allTokens?: CardTokenAllowance[];
    delegationSettings?: DelegationSettingsResponse | null;
    externalWalletDetailsData?:
      | {
          walletDetails: never[];
          mappedWalletDetails: never[];
          priorityWalletDetail: null;
        }
      | {
          walletDetails: CardExternalWalletDetailsResponse;
          mappedWalletDetails: CardTokenAllowance[];
          priorityWalletDetail: CardTokenAllowance | undefined;
        }
      | null;
    returnedSelectedToken?: CardTokenAllowance;
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
    priorityToken: mockPriorityToken,
    allTokens: [mockPriorityToken, mockMUSDToken],
    delegationSettings: null,
    externalWalletDetailsData: null,
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
    mockUseSpendingLimit.mockReturnValue({
      selectedToken: mockPriorityToken,
      limitType: 'full',
      customLimit: '',
      quickSelectTokens: [
        { symbol: 'mUSD', token: mockMUSDToken },
        { symbol: 'USDC', token: mockPriorityToken },
      ],
      isOtherSelected: false,
      isLoading: false,
      setSelectedToken: mockSetSelectedToken,
      handleQuickSelectToken: mockHandleQuickSelectToken,
      handleOtherSelect: mockHandleOtherSelect,
      setLimitType: mockSetLimitType,
      setCustomLimit: mockSetCustomLimit,
      submit: mockSubmit,
      cancel: mockCancel,
      skip: mockSkip,
      isValid: true,
      needsFaucet: false,
      isFaucetCheckLoading: false,
    });
  });

  describe('Initial Rendering', () => {
    it('renders correctly with full access option', () => {
      render();

      expect(screen.getByText('Full access')).toBeOnTheScreen();
      expect(screen.getByText('Card can spend any amount')).toBeOnTheScreen();
      expect(screen.getByTestId('limit-option-restricted')).toBeOnTheScreen();
    });

    it('displays selected token information', () => {
      render();

      // Token symbols are displayed in asset cards
      expect(screen.getByText('USDC')).toBeOnTheScreen();
      expect(screen.getByText('mUSD')).toBeOnTheScreen();
    });

    it('renders confirm and cancel buttons', () => {
      render();

      expect(screen.getByText('Confirm')).toBeOnTheScreen();
      expect(screen.getByText('Cancel')).toBeOnTheScreen();
    });
  });

  describe('Token Selection - Enable Flow', () => {
    it('uses token from route params when flow is enable', () => {
      const enableRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockMUSDToken,
          priorityToken: mockPriorityToken,
          allTokens: [mockPriorityToken, mockMUSDToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(enableRoute);

      expect(screen.getByText('mUSD')).toBeOnTheScreen();
    });
  });

  describe('Token Selection - Manage Flow', () => {
    it('pre-selects priority token when it is not Solana', () => {
      render();

      // Token symbols are displayed in asset cards
      expect(screen.getByText('USDC')).toBeOnTheScreen();
      expect(screen.getByTestId('asset-card-usdc')).toBeOnTheScreen();
    });

    it('renders asset cards for Solana route', () => {
      const solanaRoute: MockRoute = {
        params: {
          flow: 'manage' as const,
          selectedToken: undefined,
          priorityToken: mockSolanaToken,
          allTokens: [mockSolanaToken, mockMUSDToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(solanaRoute);

      // Asset cards are always rendered
      expect(screen.getByTestId('asset-card-musd')).toBeOnTheScreen();
    });

    it('renders asset cards when no priority token exists', () => {
      const emptyRoute: MockRoute = {
        params: {
          flow: 'manage' as const,
          selectedToken: undefined,
          priorityToken: null,
          allTokens: [],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(emptyRoute);

      // Asset cards are always rendered from quickSelectTokens
      expect(screen.getByTestId('asset-card-musd')).toBeOnTheScreen();
    });

    it('renders asset cards when priority is Solana', () => {
      const solanaOnlyRoute: MockRoute = {
        params: {
          flow: 'manage' as const,
          selectedToken: undefined,
          priorityToken: mockSolanaToken,
          allTokens: [mockSolanaToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(solanaOnlyRoute);

      // USDC is always shown in quick select tokens
      expect(screen.getByText('USDC')).toBeOnTheScreen();
    });
  });

  describe('Option Selection', () => {
    it('shows both limit options on initial render', () => {
      render();

      // Both options are always visible
      expect(screen.getByTestId('limit-option-full')).toBeOnTheScreen();
      expect(screen.getByTestId('limit-option-restricted')).toBeOnTheScreen();
    });

    it('displays radio buttons for limit options', () => {
      render();

      // Both options are always visible
      expect(screen.getByTestId('limit-option-full')).toBeOnTheScreen();
      expect(screen.getByTestId('limit-option-restricted')).toBeOnTheScreen();
    });

    it('calls setLimitType when restricted option is pressed', () => {
      render();

      // Press the Restricted option using testID
      const restrictedOption = screen.getByTestId('limit-option-restricted');
      fireEvent.press(restrictedOption);

      expect(mockSetLimitType).toHaveBeenCalledWith('restricted');
    });

    it('calls setLimitType when full access option is pressed', () => {
      render();

      const fullAccessOption = screen.getByText('Full access');
      fireEvent.press(fullAccessOption);

      expect(mockSetLimitType).toHaveBeenCalledWith('full');
    });
  });

  describe('Limit Amount Input', () => {
    it('calls setLimitType when restricted option is pressed', () => {
      render();

      const restrictedOption = screen.getByTestId('limit-option-restricted');
      fireEvent.press(restrictedOption);

      expect(mockSetLimitType).toHaveBeenCalledWith('restricted');
    });

    it('shows restricted option for token with limited allowance', () => {
      const tokenWithLimit: CardTokenAllowance = {
        ...mockPriorityToken,
        allowance: '750000',
        allowanceState: AllowanceState.Limited,
      };

      const limitedRoute: MockRoute = {
        params: {
          flow: 'manage' as const,
          selectedToken: undefined,
          priorityToken: tokenWithLimit,
          allTokens: [tokenWithLimit],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(limitedRoute);

      const restrictedOption = screen.getByTestId('limit-option-restricted');
      expect(restrictedOption).toBeOnTheScreen();
    });
  });

  describe('Confirm Button State', () => {
    it('enables confirm button for full access mode', () => {
      render();

      const confirmButton = screen.getByText('Confirm');

      // Button is enabled when not disabled
      expect(confirmButton).toBeOnTheScreen();
    });

    it('renders confirm button when restricted mode is selected', () => {
      render();

      const restrictedOption = screen.getByTestId('limit-option-restricted');
      fireEvent.press(restrictedOption);

      const confirmButton = screen.getByText('Confirm');

      // Check that button is present
      expect(confirmButton).toBeOnTheScreen();
    });

    it('renders confirm button for Solana token route', () => {
      const solanaRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockSolanaToken,
          priorityToken: mockPriorityToken,
          allTokens: [mockSolanaToken, mockPriorityToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(solanaRoute);

      const confirmButton = screen.getByText('Confirm');

      // Button should be present for Solana tokens
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
        selectedToken: mockPriorityToken,
        limitType: 'full',
        customLimit: '',
        quickSelectTokens: [
          { symbol: 'mUSD', token: mockMUSDToken },
          { symbol: 'USDC', token: mockPriorityToken },
        ],
        isOtherSelected: false,
        isLoading: true,
        setSelectedToken: mockSetSelectedToken,
        handleQuickSelectToken: mockHandleQuickSelectToken,
        handleOtherSelect: mockHandleOtherSelect,
        setLimitType: mockSetLimitType,
        setCustomLimit: mockSetCustomLimit,
        submit: mockSubmit,
        cancel: mockCancel,
        skip: mockSkip,
        isValid: true,
        needsFaucet: false,
        isFaucetCheckLoading: false,
      });

      render();

      // Loading state shows ActivityIndicator instead of text
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

    it('calls setLimitType when restricted option is pressed', async () => {
      render();

      const restrictedOption = screen.getByTestId('limit-option-restricted');
      fireEvent.press(restrictedOption);

      expect(mockSetLimitType).toHaveBeenCalledWith('restricted');
    });

    it('renders mUSD token in enable flow', () => {
      const enableRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockMUSDToken,
          priorityToken: mockPriorityToken,
          allTokens: [mockPriorityToken, mockMUSDToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(enableRoute);

      expect(screen.getByText('mUSD')).toBeOnTheScreen();
    });

    it('renders Solana token route', () => {
      const solanaRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockSolanaToken,
          priorityToken: mockPriorityToken,
          allTokens: [mockSolanaToken, mockPriorityToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(solanaRoute);

      // Component should render
      expect(screen.getByText('Confirm')).toBeOnTheScreen();
    });

    it('renders both limit options', () => {
      render();

      // Options view should be visible (using testIDs to avoid duplicate text issues)
      expect(screen.getByTestId('limit-option-restricted')).toBeOnTheScreen();
      expect(screen.getByTestId('limit-option-full')).toBeOnTheScreen();
    });

    it('renders limit options after pressing restricted', () => {
      render();

      const restrictedOption = screen.getByTestId('limit-option-restricted');
      fireEvent.press(restrictedOption);

      expect(mockSetLimitType).toHaveBeenCalledWith('restricted');
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
        selectedToken: mockPriorityToken,
        limitType: 'full',
        customLimit: '',
        quickSelectTokens: [
          { symbol: 'mUSD', token: mockMUSDToken },
          { symbol: 'USDC', token: mockPriorityToken },
        ],
        isOtherSelected: false,
        isLoading: true,
        setSelectedToken: mockSetSelectedToken,
        handleQuickSelectToken: mockHandleQuickSelectToken,
        handleOtherSelect: mockHandleOtherSelect,
        setLimitType: mockSetLimitType,
        setCustomLimit: mockSetCustomLimit,
        submit: mockSubmit,
        cancel: mockCancel,
        skip: mockSkip,
        isValid: true,
        needsFaucet: false,
        isFaucetCheckLoading: false,
      });

      render();

      const cancelButton = screen.getByText('Cancel');

      // Cancel button should be visible
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
        selectedToken: mockPriorityToken,
        limitType: 'full',
        customLimit: '',
        quickSelectTokens: [
          { symbol: 'mUSD', token: mockMUSDToken },
          { symbol: 'USDC', token: mockPriorityToken },
        ],
        isOtherSelected: false,
        isLoading: true,
        setSelectedToken: mockSetSelectedToken,
        handleQuickSelectToken: mockHandleQuickSelectToken,
        handleOtherSelect: mockHandleOtherSelect,
        setLimitType: mockSetLimitType,
        setCustomLimit: mockSetCustomLimit,
        submit: mockSubmit,
        cancel: mockCancel,
        skip: mockSkip,
        isValid: true,
        needsFaucet: false,
        isFaucetCheckLoading: false,
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

  describe('Asset Selection', () => {
    it('calls handleOtherSelect when other asset card is pressed', () => {
      render();

      const otherCard = screen.getByTestId('asset-card-other');
      fireEvent.press(otherCard);

      expect(mockHandleOtherSelect).toHaveBeenCalled();
    });

    it('calls handleQuickSelectToken when mUSD asset card is pressed', () => {
      render();

      const musdCard = screen.getByTestId('asset-card-musd');
      fireEvent.press(musdCard);

      expect(mockHandleQuickSelectToken).toHaveBeenCalledWith('mUSD');
    });

    it('calls handleQuickSelectToken when USDC asset card is pressed', () => {
      render();

      const usdcCard = screen.getByTestId('asset-card-usdc');
      fireEvent.press(usdcCard);

      expect(mockHandleQuickSelectToken).toHaveBeenCalledWith('USDC');
    });
  });

  describe('Network Derivation', () => {
    it('displays token with EIP155 chain ID', () => {
      render();

      // Token with Linea (EIP155) chain ID should be displayed in asset cards
      expect(screen.getByText('USDC')).toBeOnTheScreen();
      expect(screen.getByTestId('asset-card-usdc')).toBeOnTheScreen();
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
          priorityToken: mockPriorityToken,
          allTokens: [solanaTokenWithFullChainId, mockPriorityToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(solanaRoute);

      // Verify component renders
      expect(screen.getByText('Confirm')).toBeOnTheScreen();
    });
  });

  describe('Loading States', () => {
    it('renders loading indicator when isLoading is true', () => {
      mockUseSpendingLimit.mockReturnValue({
        selectedToken: mockPriorityToken,
        limitType: 'full',
        customLimit: '',
        quickSelectTokens: [
          { symbol: 'mUSD', token: mockMUSDToken },
          { symbol: 'USDC', token: mockPriorityToken },
        ],
        isOtherSelected: false,
        isLoading: true,
        setSelectedToken: mockSetSelectedToken,
        handleQuickSelectToken: mockHandleQuickSelectToken,
        handleOtherSelect: mockHandleOtherSelect,
        setLimitType: mockSetLimitType,
        setCustomLimit: mockSetCustomLimit,
        submit: mockSubmit,
        cancel: mockCancel,
        skip: mockSkip,
        isValid: true,
        needsFaucet: false,
        isFaucetCheckLoading: false,
      });

      render();

      // Loading state shows ActivityIndicator instead of text
      expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe('Onboarding Flow', () => {
    const onboardingRoute: MockRoute = {
      params: {
        flow: 'onboarding' as const,
        selectedToken: undefined,
        priorityToken: null,
        allTokens: undefined,
        delegationSettings: undefined,
        externalWalletDetailsData: null,
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

      // The skip button in error state calls the skip function from the hook
      expect(mockSkip).toHaveBeenCalled();
    });

    it('renders Cancel button in onboarding flow (skip is handled internally)', () => {
      render(onboardingRoute);

      // In the new UI, the cancel button is always shown as "Cancel"
      // The skip behavior is handled internally by the hook
      expect(screen.getByText('Cancel')).toBeOnTheScreen();
    });

    it('calls skip when cancel is pressed in onboarding flow', () => {
      render(onboardingRoute);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      // In onboarding flow, cancel calls skip
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

      // Confirm button should be present
      expect(screen.getByText('Confirm')).toBeOnTheScreen();
    });

    it('renders asset cards in onboarding flow', () => {
      mockUseSpendingLimitData.mockReturnValue({
        availableTokens: [mockMUSDToken],
        delegationSettings: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchSpendingLimitData,
      });

      render(onboardingRoute);

      // Asset cards should be rendered
      expect(screen.getByTestId('asset-card-musd')).toBeOnTheScreen();
    });

    it('calls submit when confirm is pressed in onboarding flow', async () => {
      const onboardingWithToken: MockRoute = {
        params: {
          flow: 'onboarding' as const,
          selectedToken: mockPriorityToken,
          priorityToken: mockPriorityToken,
          allTokens: [mockPriorityToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
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
          priorityToken: mockPriorityToken,
          allTokens: [mockPriorityToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(onboardingWithToken);

      // Component should render
      expect(screen.getByText('Confirm')).toBeOnTheScreen();
    });

    it('renders cancel button during loading state in onboarding', () => {
      mockUseSpendingLimit.mockReturnValue({
        selectedToken: mockPriorityToken,
        limitType: 'full',
        customLimit: '',
        quickSelectTokens: [
          { symbol: 'mUSD', token: mockMUSDToken },
          { symbol: 'USDC', token: mockPriorityToken },
        ],
        isOtherSelected: false,
        isLoading: true,
        setSelectedToken: mockSetSelectedToken,
        handleQuickSelectToken: mockHandleQuickSelectToken,
        handleOtherSelect: mockHandleOtherSelect,
        setLimitType: mockSetLimitType,
        setCustomLimit: mockSetCustomLimit,
        submit: mockSubmit,
        cancel: mockCancel,
        skip: mockSkip,
        isValid: true,
        needsFaucet: false,
        isFaucetCheckLoading: false,
      });

      const onboardingWithToken: MockRoute = {
        params: {
          flow: 'onboarding' as const,
          selectedToken: mockPriorityToken,
          priorityToken: mockPriorityToken,
          allTokens: [mockPriorityToken],
          delegationSettings: null,
          externalWalletDetailsData: null,
        },
      };

      render(onboardingWithToken);

      // Cancel button should be present
      expect(screen.getByText('Cancel')).toBeOnTheScreen();
    });
  });
});
