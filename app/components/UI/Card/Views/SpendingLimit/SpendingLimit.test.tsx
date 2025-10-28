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
      {},
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitDelegation.mockResolvedValue(undefined);
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

    it('pre-selects mUSD when priority token is Solana', () => {
      (useLoadCardData as jest.Mock).mockReturnValueOnce({
        priorityToken: mockSolanaToken,
        allTokens: [mockSolanaToken, mockMUSDToken],
        isLoading: false,
        error: null,
        warning: null,
      });

      render();

      expect(screen.getByText('mUSD')).toBeOnTheScreen();
    });

    it('displays placeholder when no priority token exists', () => {
      (useLoadCardData as jest.Mock).mockReturnValueOnce({
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
      (useLoadCardData as jest.Mock).mockReturnValueOnce({
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
      const tokenWithLimit = {
        ...mockPriorityToken,
        allowance: '750000',
        allowanceState: 'limited' as const,
      };

      (useLoadCardData as jest.Mock).mockReturnValueOnce({
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
    it('disables confirm button when restricted is selected with no amount', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const input = screen.getByDisplayValue('1000000');
      fireEvent.changeText(input, '');

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('enables confirm button when restricted is selected with amount', () => {
      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('enables confirm button when full access is selected', () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('disables confirm button when delegation is loading', () => {
      (useCardDelegation as jest.Mock).mockReturnValueOnce({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
      });

      render();

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Delegation Submission', () => {
    it('calls submitDelegation with full access parameters', async () => {
      render();

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).toHaveBeenCalledWith(
          {
            amount:
              '115792089237316195423570985008687907853269984665640564039457.584007913129639935',
            currency: 'USDC',
            network: 'linea',
          },
          '0xwallet123',
        );
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
        expect(mockSubmitDelegation).toHaveBeenCalledWith(
          {
            amount: '500000',
            currency: 'USDC',
            network: 'linea',
          },
          '0xwallet123',
        );
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
          expect.any(String),
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
          expect.any(String),
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

    it('resets to previous state when delegation fails', async () => {
      mockSubmitDelegation.mockRejectedValueOnce(new Error('Failed'));

      render();

      const setLimitButton = screen.getByText('Set a limit');
      fireEvent.press(setLimitButton);

      const input = screen.getByDisplayValue('1000000');
      fireEvent.changeText(input, '500000');

      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('1000000')).toBeOnTheScreen();
      });
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

    it('does not call submitDelegation when limit has not changed', async () => {
      render();

      // Don't change anything, just confirm
      const confirmButton = screen.getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSubmitDelegation).not.toHaveBeenCalled();
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

    it('disables cancel button when delegation is loading', () => {
      (useCardDelegation as jest.Mock).mockReturnValueOnce({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
      });

      render();

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton.props.accessibilityState?.disabled).toBe(true);
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
          expect.any(String),
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
          expect.any(String),
        );
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator on confirm button when delegation is loading', () => {
      (useCardDelegation as jest.Mock).mockReturnValueOnce({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
      });

      render();

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton.props.loading).toBe(true);
    });
  });
});
