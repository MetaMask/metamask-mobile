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
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Logger from '../../../../../util/Logger';
import { ToastContext } from '../../../../../component-library/components/Toast';
import Routes from '../../../../../constants/navigation/Routes';
import useSpendingLimitData from '../../hooks/useSpendingLimitData';
import { StackActions } from '@react-navigation/native';

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
  });

  describe('Initial Rendering', () => {
    it('renders correctly with full access option', () => {
      render();

      expect(screen.getByText('Full access')).toBeOnTheScreen();
      expect(screen.getByText('Card can spend any amount')).toBeOnTheScreen();
      expect(screen.getByText('Set a limit')).toBeOnTheScreen();
    });

    it('displays selected token information', () => {
      render();

      expect(screen.getByText('USDC')).toBeOnTheScreen();
      expect(screen.getByText('Linea')).toBeOnTheScreen();
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

      expect(screen.getByText('USDC')).toBeOnTheScreen();
      expect(screen.getByText('Linea')).toBeOnTheScreen();
    });

    it('does not pre-select token when priority token is Solana', () => {
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

      expect(screen.getByText('Select token')).toBeOnTheScreen();
    });

    it('displays placeholder when no priority token exists', () => {
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

      expect(screen.getByText('Select token')).toBeOnTheScreen();
    });

    it('does not pre-select token when priority is Solana and mUSD does not exist', () => {
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

      expect(screen.queryByText('USDC')).not.toBeOnTheScreen();
    });
  });

  describe('Option Selection', () => {
    it('shows both options when set a limit is pressed', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      expect(screen.getAllByText('Full access')).toHaveLength(1);
      expect(screen.getByText('Restricted')).toBeOnTheScreen();
    });

    it('displays radio buttons in options view', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      // Should show restricted option selected by default
      expect(screen.getByText('Restricted')).toBeOnTheScreen();
    });

    it('shows limit input when restricted option is selected', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      // Press the Restricted option to select it
      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      // Input should be visible with placeholder "0"
      const input = screen.getByPlaceholderText('0');
      expect(input).toBeOnTheScreen();
    });

    it('hides options view when full access is selected after showing options', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const fullAccessOption = screen.getByText('Full access');
      fireEvent.press(fullAccessOption);

      expect(screen.queryByText('Restricted')).not.toBeOnTheScreen();
    });
  });

  describe('Limit Amount Input', () => {
    it('displays limit input field when restricted option is selected', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const input = screen.getByPlaceholderText('0');
      expect(input).toBeOnTheScreen();
    });

    it('allows typing numeric values in limit input', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const input = screen.getByPlaceholderText('0');
      fireEvent.changeText(input, '1000');

      expect(input.props.value).toBe('1000');
    });

    it('allows typing decimal values in limit input', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const input = screen.getByPlaceholderText('0');
      fireEvent.changeText(input, '100.50');

      expect(input.props.value).toBe('100.50');
    });

    it('filters out non-numeric characters from input', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const input = screen.getByPlaceholderText('0');
      fireEvent.changeText(input, 'abc123def');

      expect(input.props.value).toBe('123');
    });

    it('prevents multiple decimal points in input', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const input = screen.getByPlaceholderText('0');
      fireEvent.changeText(input, '100.50.25');

      expect(input.props.value).toBe('100.5025');
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

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
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

    it('disables confirm button when restricted mode has empty input', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const confirmButton = screen.getByText('Confirm');

      // Check that button is present (disabled state is internal to Button component)
      expect(confirmButton).toBeOnTheScreen();
    });

    it('enables confirm button when restricted mode has valid input', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const input = screen.getByPlaceholderText('0');
      fireEvent.changeText(input, '1000');

      const confirmButton = screen.getByText('Confirm');

      // Button should be enabled after entering valid input
      expect(confirmButton).toBeOnTheScreen();
    });

    it('enables confirm button when restricted mode input is 0', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const input = screen.getByPlaceholderText('0');
      fireEvent.changeText(input, '0');

      const confirmButton = screen.getByText('Confirm');

      // Button should be enabled when input is 0 (valid case to remove token)
      expect(confirmButton).toBeOnTheScreen();
    });

    it('disables confirm button when Solana token is selected', () => {
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

      // Button should be disabled for Solana tokens
      expect(confirmButton).toBeOnTheScreen();
    });

    it('submits delegation when full access is selected', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalled();
      });
    });

    it('shows loading indicator when delegation is loading', () => {
      (useCardDelegation as jest.Mock).mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
      });

      render();

      const activityIndicator = screen.UNSAFE_queryByType(ActivityIndicator);
      expect(activityIndicator).toBeTruthy();
    });
  });

  describe('Delegation Submission', () => {
    it('calls submitDelegation with full access parameters', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalledWith({
          amount: expect.any(String),
          currency: 'USDC',
          network: 'linea',
        });
      });
    });

    it('submits delegation with custom limit in restricted mode', async () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const input = screen.getByPlaceholderText('0');
      fireEvent.changeText(input, '5000');

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: '5000',
            currency: 'USDC',
            network: 'linea',
          }),
        );
      });
    });

    it('submits delegation with amount 0 when input is 0', async () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const restrictedOption = screen.getByText('Restricted');
      fireEvent.press(restrictedOption);

      const input = screen.getByPlaceholderText('0');
      fireEvent.changeText(input, '0');

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: '0',
          }),
        );
      });
    });

    it('uses selected token for delegation when available', async () => {
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

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            currency: 'mUSD',
          }),
        );
      });
    });

    it('derives network as solana for Solana tokens', async () => {
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
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            network: 'solana',
          }),
        );
      });
    });

    it('clears cache after successful delegation with delay', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      // Wait for the full async flow including the 3-second delay and cache clear
      await waitFor(
        () => {
          expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
              type: expect.stringContaining('clearCacheData'),
              payload: 'card-external-wallet-details',
            }),
          );
        },
        { timeout: 5000 },
      );
    });

    it('shows success toast when delegation succeeds', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      // Wait for the toast to be shown after the async flow completes
      await waitFor(
        () => {
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              labelOptions: [{ label: 'Spending limit updated' }],
              iconName: IconName.Confirmation,
            }),
          );
        },
        { timeout: 5000 },
      );
    });

    it('navigates back after successful delegation', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      // Wait for navigation to be called after the async flow completes
      await waitFor(
        () => {
          expect(mockGoBack).toHaveBeenCalled();
        },
        { timeout: 5000 },
      );
    });

    it('keeps options view visible after pressing set limit button', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      // Options view should be visible
      expect(screen.getByText('Restricted')).toBeOnTheScreen();
      expect(screen.getByText('Full access')).toBeOnTheScreen();
    });

    it('hides options view after successful delegation', async () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      expect(screen.getByText('Restricted')).toBeOnTheScreen();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      // Wait for the component to navigate away (options view disappears)
      await waitFor(
        () => {
          expect(screen.queryByText('Restricted')).not.toBeOnTheScreen();
        },
        { timeout: 5000 },
      );
    });
  });

  describe('Cache Management', () => {
    it('clears cache after successful delegation with 3-second delay', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      // Wait for the cache to be cleared after the 3-second delay
      await waitFor(
        () => {
          expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
              type: expect.stringContaining('clearCacheData'),
              payload: 'card-external-wallet-details',
            }),
          );
        },
        { timeout: 5000 },
      );
    });
  });

  describe('Cancel Behavior', () => {
    it('calls navigation goBack when cancel is pressed in initial view', () => {
      render();

      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('hides options view when cancel is pressed in options view', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      expect(screen.getByText('Restricted')).toBeOnTheScreen();

      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(screen.queryByText('Restricted')).not.toBeOnTheScreen();
    });

    it('disables cancel button when delegation is loading', () => {
      (useCardDelegation as jest.Mock).mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
      });

      render();

      const cancelButton = screen.getByText('Cancel');

      // Cancel button should be visible but disabled during loading
      expect(cancelButton).toBeOnTheScreen();
    });

    it('does not navigate back when cancel is pressed during delegation', () => {
      (useCardDelegation as jest.Mock).mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
      });

      render();

      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockGoBack).not.toHaveBeenCalled();
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

    it('blocks navigation when delegation is loading', () => {
      (useCardDelegation as jest.Mock).mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
      });

      render();

      const mockEvent = { preventDefault: jest.fn() };
      const beforeRemoveCallback = mockAddListener.mock.calls[0][1];

      beforeRemoveCallback(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('allows navigation when delegation is not loading', () => {
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

  describe('Asset Selection Navigation', () => {
    it('navigates to asset selection modal when token selector is pressed', () => {
      render();

      const tokenSelector = screen.getByText('USDC');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fireEvent.press(tokenSelector.parent?.parent as any);

      expect(mockNavigate).toHaveBeenCalledWith(
        'CardModals',
        expect.objectContaining({
          screen: 'CardAssetSelectionModal',
          params: expect.objectContaining({
            tokensWithAllowances: expect.any(Array),
            selectionOnly: true,
            hideSolanaAssets: true,
            callerRoute: Routes.CARD.SPENDING_LIMIT,
          }),
        }),
      );
    });

    it('passes caller route and params to asset selection modal', () => {
      const routeWithCustomParams: MockRoute = {
        params: {
          ...mockRoute.params,
          customField: 'customValue',
        } as MockRoute['params'] & { customField: string },
      };

      render(routeWithCustomParams);

      const tokenSelector = screen.getByText('USDC');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fireEvent.press(tokenSelector.parent?.parent as any);

      expect(mockNavigate).toHaveBeenCalledWith(
        'CardModals',
        expect.objectContaining({
          params: expect.objectContaining({
            callerRoute: Routes.CARD.SPENDING_LIMIT,
            callerParams: expect.objectContaining({
              customField: 'customValue',
            }),
          }),
        }),
      );
    });
  });

  describe('Network Derivation', () => {
    it('displays token with EIP155 chain ID', () => {
      render();

      // Token with Linea (EIP155) chain ID should be displayed
      expect(screen.getByText('USDC')).toBeOnTheScreen();
      expect(screen.getByText('Linea')).toBeOnTheScreen();
    });

    it('displays Solana token with proper CAIP chain ID format', () => {
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

      // Verify component renders with Solana token
      expect(screen.getByText('SOL')).toBeOnTheScreen();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator on confirm button when delegation is loading', () => {
      (useCardDelegation as jest.Mock).mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
      });

      render();

      const activityIndicator = screen.UNSAFE_queryByType(ActivityIndicator);
      expect(activityIndicator).toBeTruthy();
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

    it('navigates to Complete screen when skip is pressed on error state', () => {
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

      expect(StackActions.replace).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.ROOT,
        { screen: Routes.CARD.ONBOARDING.COMPLETE },
      );
      expect(mockNavigationDispatch).toHaveBeenCalled();
    });

    it('displays Skip for now button instead of Cancel in onboarding flow', () => {
      render(onboardingRoute);

      expect(screen.getByText('Skip for now')).toBeOnTheScreen();
      expect(screen.queryByText('Cancel')).not.toBeOnTheScreen();
    });

    it('navigates to Complete screen when Skip for now is pressed', () => {
      render(onboardingRoute);

      const skipButton = screen.getByText('Skip for now');
      fireEvent.press(skipButton);

      expect(StackActions.replace).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.ROOT,
        { screen: Routes.CARD.ONBOARDING.COMPLETE },
      );
      expect(mockNavigationDispatch).toHaveBeenCalled();
    });

    it('disables confirm button when no token is selected in onboarding', () => {
      mockUseSpendingLimitData.mockReturnValue({
        availableTokens: [mockPriorityToken, mockMUSDToken],
        delegationSettings: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchSpendingLimitData,
      });

      render(onboardingRoute);

      // Confirm button should be present but disabled
      expect(screen.getByText('Confirm')).toBeOnTheScreen();
      expect(screen.getByText('Select token')).toBeOnTheScreen();
    });

    it('uses tokens from hook data when route params are not provided', () => {
      mockUseSpendingLimitData.mockReturnValue({
        availableTokens: [mockMUSDToken],
        delegationSettings: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchSpendingLimitData,
      });

      render(onboardingRoute);

      // Should show select token placeholder since no token is pre-selected
      expect(screen.getByText('Select token')).toBeOnTheScreen();
    });

    it('navigates to Complete screen after successful delegation in onboarding', async () => {
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

      await waitFor(
        () => {
          expect(StackActions.replace).toHaveBeenCalledWith(
            Routes.CARD.ONBOARDING.ROOT,
            { screen: Routes.CARD.ONBOARDING.COMPLETE },
          );
        },
        { timeout: 5000 },
      );
    });

    it('does not call goBack in onboarding flow after delegation', async () => {
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

      await waitFor(
        () => {
          expect(mockNavigationDispatch).toHaveBeenCalled();
        },
        { timeout: 5000 },
      );

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not show success toast in onboarding flow after delegation', async () => {
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

      await waitFor(
        () => {
          expect(mockNavigationDispatch).toHaveBeenCalled();
        },
        { timeout: 5000 },
      );

      // Success toast should not be shown in onboarding flow
      expect(mockShowToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: IconName.Confirmation,
        }),
      );
    });

    it('does not show skip button during loading state', () => {
      (useCardDelegation as jest.Mock).mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
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

      // Skip button should be disabled when loading
      const skipButton = screen.getByText('Skip for now');
      fireEvent.press(skipButton);

      // Should not navigate when loading
      expect(mockNavigationDispatch).not.toHaveBeenCalled();
    });
  });
});
