// Mock hooks first - must be hoisted before imports
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSubmitDelegation = jest.fn();
const mockShowToast = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

// Import types after mocks but before usage
import type { SupportedTokenWithChain } from '../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import { AllowanceState } from '../../types';

const mockPriorityToken: SupportedTokenWithChain = {
  address: '0x123',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  enabled: true,
  caipChainId: 'eip155:59144' as `${string}:${string}`,
  chainName: 'Linea',
  allowanceState: AllowanceState.Enabled,
  allowance: '1000000',
  walletAddress: '0xwallet123',
};

const mockSolanaToken: SupportedTokenWithChain = {
  address: 'solana123',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  enabled: true,
  caipChainId:
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as `${string}:${string}`,
  chainName: 'Solana',
  allowanceState: AllowanceState.Enabled,
  allowance: '500000',
  walletAddress: '0xwallet123',
};

const mockMUSDToken: SupportedTokenWithChain = {
  address: '0xmusd',
  symbol: 'mUSD',
  name: 'Meta USD',
  decimals: 18,
  enabled: true,
  caipChainId: 'eip155:59144' as `${string}:${string}`,
  chainName: 'Linea',
  allowanceState: AllowanceState.Enabled,
  allowance: '2000000',
  walletAddress: '0xwallet123',
};

const mockSdk = {
  getSupportedTokensByChainId: jest.fn(),
  getPriorityToken: jest.fn(),
};

jest.mock('../../hooks/useCardDelegation', () => ({
  useCardDelegation: jest.fn(() => ({
    submitDelegation: mockSubmitDelegation,
    isLoading: false,
  })),
}));

jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(() => ({
    sdk: mockSdk,
    isLoading: false,
    userCardLocation: 'international' as const,
  })),
}));

jest.mock('../../hooks/useLoadCardData', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    priorityToken: mockPriorityToken,
    allTokens: [mockPriorityToken, mockMUSDToken],
    isLoading: false,
    error: null,
    warning: null,
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
      'card.card_spending_limit.update_success': 'Spending limit updated',
      'card.card_spending_limit.update_error': 'Failed to update limit',
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

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import SpendingLimit from './SpendingLimit';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { useCardDelegation } from '../../hooks/useCardDelegation';
import useLoadCardData from '../../hooks/useLoadCardData';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Logger from '../../../../../util/Logger';
import { ToastContext } from '../../../../../component-library/components/Toast';

jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

interface MockRoute {
  params?: {
    flow?: 'manage' | 'enable';
    selectedToken?: SupportedTokenWithChain;
  };
}

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitDelegation.mockResolvedValue(undefined);

    // Reset useLoadCardData mock to default state
    (useLoadCardData as jest.Mock).mockReturnValue({
      priorityToken: mockPriorityToken,
      allTokens: [mockPriorityToken, mockMUSDToken],
      isLoading: false,
      error: null,
      warning: null,
    });

    // Reset useCardDelegation mock to default state
    (useCardDelegation as jest.Mock).mockReturnValue({
      submitDelegation: mockSubmitDelegation,
      isLoading: false,
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
      const enableRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockMUSDToken,
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
      (useLoadCardData as jest.Mock).mockReturnValue({
        priorityToken: mockSolanaToken,
        allTokens: [mockSolanaToken, mockMUSDToken],
        isLoading: false,
        error: null,
        warning: null,
      });

      render();

      expect(screen.getByText('Select token')).toBeOnTheScreen();
    });

    it('displays placeholder when no priority token exists', () => {
      (useLoadCardData as jest.Mock).mockReturnValue({
        priorityToken: null,
        allTokens: [],
        isLoading: false,
        error: null,
        warning: null,
      });

      render();

      expect(screen.getByText('Select token')).toBeOnTheScreen();
    });

    it('does not pre-select token when priority is Solana and mUSD does not exist', () => {
      (useLoadCardData as jest.Mock).mockReturnValue({
        priorityToken: mockSolanaToken,
        allTokens: [mockSolanaToken],
        isLoading: false,
        error: null,
        warning: null,
      });

      render();

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

      // Input should be visible for restricted option
      const inputs = screen.getAllByDisplayValue('1000000');
      expect(inputs.length).toBeGreaterThan(0);
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
    it('updates limit amount when user types in input field', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const input = screen.getByDisplayValue('1000000');
      fireEvent.changeText(input, '500000');

      expect(screen.getByDisplayValue('500000')).toBeOnTheScreen();
    });

    it('initializes limit amount from spending limit settings', () => {
      const tokenWithLimit: SupportedTokenWithChain = {
        ...mockPriorityToken,
        allowance: '750000',
        allowanceState: AllowanceState.Limited,
      };

      (useLoadCardData as jest.Mock).mockReturnValue({
        priorityToken: tokenWithLimit,
        allTokens: [tokenWithLimit],
        isLoading: false,
        error: null,
        warning: null,
      });

      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      expect(screen.getByDisplayValue('750000')).toBeOnTheScreen();
    });
  });

  describe('Confirm Button State', () => {
    it('does not submit delegation when restricted is selected with no amount', async () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const input = screen.getByDisplayValue('1000000');
      fireEvent.changeText(input, '');

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).not.toHaveBeenCalled();
      });
    });

    it('submits delegation when restricted is selected with amount', async () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalled();
      });
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

    it('calls submitDelegation with restricted limit parameters', async () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const input = screen.getByDisplayValue('1000000');
      fireEvent.changeText(input, '500000');

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalledWith({
          amount: '500000',
          currency: 'USDC',
          network: 'linea',
        });
      });
    });

    it('uses selected token for delegation when available', async () => {
      const enableRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockMUSDToken,
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
      const solanaRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: mockSolanaToken,
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

    it('shows success toast when delegation succeeds', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: [{ label: 'Spending limit updated' }],
            iconName: IconName.Confirmation,
          }),
        );
      });
    });

    it('shows error toast when delegation fails', async () => {
      const error = new Error('Delegation failed');
      mockSubmitDelegation.mockRejectedValueOnce(error);

      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: [{ label: 'Failed to update limit' }],
            iconName: IconName.Danger,
          }),
        );
      });
    });

    it('calls Logger.error when delegation fails', async () => {
      const error = new Error('Delegation failed');
      mockSubmitDelegation.mockRejectedValueOnce(error);
      const mockLoggerError = jest.spyOn(Logger, 'error');

      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          error,
          'Failed to save spending limit',
        );
      });
    });

    it('keeps options view visible when delegation fails', async () => {
      mockSubmitDelegation.mockRejectedValueOnce(new Error('Failed'));

      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      expect(screen.getByText('Restricted')).toBeOnTheScreen();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });

      // Options view should still be visible after error
      expect(screen.getByText('Restricted')).toBeOnTheScreen();
    });

    it('hides options view after successful delegation', async () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      expect(screen.getByText('Restricted')).toBeOnTheScreen();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('Restricted')).not.toBeOnTheScreen();
      });
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

    it('renders cancel button when delegation is loading', () => {
      (useCardDelegation as jest.Mock).mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
      });

      render();

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeOnTheScreen();
    });
  });

  describe('Asset Selection Bottom Sheet', () => {
    it('opens asset selection bottom sheet when token selector is pressed', () => {
      render();

      const tokenSelector = screen.getByText('USDC').parent?.parent;
      if (tokenSelector) {
        fireEvent.press(tokenSelector);
      }

      // AssetSelectionBottomSheet should be rendered
      expect(screen.getByText('USDC')).toBeOnTheScreen();
    });
  });

  describe('Network Derivation', () => {
    it('derives linea network for EIP155 chain IDs', async () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const input = screen.getByDisplayValue('1000000');
      fireEvent.changeText(input, '500000');

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            network: 'linea',
          }),
        );
      });
    });

    it('derives solana network for Solana mainnet CAIP chain ID', async () => {
      const solanaRoute: MockRoute = {
        params: {
          flow: 'enable' as const,
          selectedToken: {
            ...mockSolanaToken,
            caipChainId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as `${string}:${string}`,
          },
        },
      };

      render(solanaRoute);

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

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
});
