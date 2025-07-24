import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PerpsWithdrawalMonitor from './PerpsWithdrawalMonitor';
import Engine from '../../../../../core/Engine';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';
import { ToastContext } from '../../../../../component-library/components/Toast';

// Mock only the essential dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      state: {
        pendingWithdrawals: [],
      },
      monitorPendingWithdrawals: jest.fn(),
      startWithdrawalMonitoring: jest.fn(),
      stopWithdrawalMonitoring: jest.fn(),
    },
  },
}));

jest.mock('../../hooks', () => ({
  usePerpsPendingWithdrawals: jest.fn(),
}));

jest.mock('../../../../../util/number', () => ({
  renderFromTokenMinimalUnit: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.withdrawal.completed': 'Withdrawal Completed',
    };
    return translations[key] || key;
  }),
}));

import { usePerpsPendingWithdrawals } from '../../hooks';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { useSelector } from 'react-redux';

describe('PerpsWithdrawalMonitor', () => {
  const mockShowToast = jest.fn();
  const mockToastRef = {
    current: {
      showToast: mockShowToast,
      closeToast: jest.fn(),
    },
  };

  const defaultProps = {
    isConnected: true,
    isInitialized: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (renderFromTokenMinimalUnit as jest.Mock).mockReturnValue('100');
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue([]);

    // Mock useSelector to return appropriate values based on selector
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectContractBalances) {
        return {
          '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': '0x5f5e100', // 100 USDC in hex
        };
      }
      if (selector === selectSelectedInternalAccountAddress) {
        return '0x1234567890123456789012345678901234567890';
      }
      return null;
    });
  });

  const renderComponent = (props = {}) =>
    render(
      <ToastContext.Provider value={{ toastRef: mockToastRef }}>
        <PerpsWithdrawalMonitor {...defaultProps} {...props} />
      </ToastContext.Provider>,
    );

  it('should not render when there are no pending withdrawals', () => {
    const { queryByText } = renderComponent();
    expect(queryByText(/withdrawal/i)).toBeNull();
  });

  it('should render single withdrawal correctly', () => {
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue([
      {
        withdrawalId: '123',
        amount: '50',
        status: 'pending',
      },
    ]);

    const { getByText } = renderComponent();

    expect(getByText('Withdrawal of 50 USDC pending...')).toBeTruthy();
    expect(getByText('HyperLiquid validators signing...')).toBeTruthy();
    expect(getByText(/Current USDC: 100/)).toBeTruthy();
  });

  it('should render processing withdrawal correctly', () => {
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue([
      {
        withdrawalId: '123',
        amount: '50',
        status: 'processing',
      },
    ]);

    const { getByText } = renderComponent();

    expect(getByText('Withdrawal of 50 USDC processing...')).toBeTruthy();
    expect(getByText('Finalizing on Arbitrum...')).toBeTruthy();
  });

  it('should render multiple withdrawals correctly', () => {
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue([
      { withdrawalId: '123', amount: '50', status: 'pending' },
      { withdrawalId: '456', amount: '30', status: 'processing' },
    ]);

    const { getByText } = renderComponent();

    expect(getByText('2 withdrawals in progress...')).toBeTruthy();
  });

  it('should handle check status button click', async () => {
    const mockWithdrawals = [
      {
        withdrawalId: '123',
        amount: '50',
        status: 'pending',
      },
    ];
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue(mockWithdrawals);

    // Set initial state as pending
    Engine.context.PerpsController.state.pendingWithdrawals = [
      {
        withdrawalId: '123',
        amount: '50',
        status: 'pending',
      },
    ];

    // Mock monitorPendingWithdrawals to update the state to completed
    (
      Engine.context.PerpsController.monitorPendingWithdrawals as jest.Mock
    ).mockImplementation(() => {
      Engine.context.PerpsController.state.pendingWithdrawals = [
        {
          withdrawalId: '123',
          amount: '50',
          status: 'completed',
        },
      ];
    });

    const { getByText } = renderComponent();

    const checkButton = getByText('Check');
    fireEvent.press(checkButton);

    await waitFor(() => {
      expect(
        Engine.context.PerpsController.monitorPendingWithdrawals,
      ).toHaveBeenCalled();
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      variant: 'Icon',
      iconName: 'Confirmation',
      hasNoTimeout: false,
      labelOptions: [
        { label: 'Withdrawal Completed', isBold: true },
        { label: 'USDC has arrived in your wallet' },
      ],
    });
  });

  it('should handle Arbiscan link click', () => {
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue([
      {
        withdrawalId: '123',
        amount: '50',
        status: 'pending',
      },
    ]);

    const { getByText } = renderComponent();

    const arbiscanLink = getByText('🔗 View on Arbiscan');
    fireEvent.press(arbiscanLink);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://arbiscan.io/token/0xaf88d065e77c8cC2239327C5EDb3A432268e5831?a=0x1234567890123456789012345678901234567890',
    );
  });

  it('should start and stop monitoring on mount/unmount', () => {
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue([
      {
        withdrawalId: '123',
        amount: '50',
        status: 'pending',
      },
    ]);

    const { unmount } = renderComponent();

    expect(
      Engine.context.PerpsController.startWithdrawalMonitoring,
    ).toHaveBeenCalled();

    unmount();

    expect(
      Engine.context.PerpsController.stopWithdrawalMonitoring,
    ).toHaveBeenCalled();
  });

  it('should not start monitoring when not connected', () => {
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue([
      {
        withdrawalId: '123',
        amount: '50',
        status: 'pending',
      },
    ]);

    renderComponent({ isConnected: false });

    expect(
      Engine.context.PerpsController.startWithdrawalMonitoring,
    ).not.toHaveBeenCalled();
  });

  it('should not start monitoring when not initialized', () => {
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue([
      {
        withdrawalId: '123',
        amount: '50',
        status: 'pending',
      },
    ]);

    renderComponent({ isInitialized: false });

    expect(
      Engine.context.PerpsController.startWithdrawalMonitoring,
    ).not.toHaveBeenCalled();
  });

  it('should handle missing USDC balance', () => {
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue([
      {
        withdrawalId: '123',
        amount: '50',
        status: 'pending',
      },
    ]);

    // Mock useSelector to return empty contract balances
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectContractBalances) {
        return {};
      }
      if (selector === selectSelectedInternalAccountAddress) {
        return '0x1234567890123456789012345678901234567890';
      }
      return null;
    });

    (renderFromTokenMinimalUnit as jest.Mock).mockReturnValue('0');

    const { getByText } = renderComponent();

    expect(getByText(/Current USDC: 0/)).toBeTruthy();
  });

  it('should not show toast if no withdrawals completed', async () => {
    const mockWithdrawals = [
      {
        withdrawalId: '123',
        amount: '50',
        status: 'pending',
      },
    ];
    (usePerpsPendingWithdrawals as jest.Mock).mockReturnValue(mockWithdrawals);

    // Set initial state as pending
    Engine.context.PerpsController.state.pendingWithdrawals = mockWithdrawals;

    // Mock monitorPendingWithdrawals to keep the state unchanged (still pending)
    (
      Engine.context.PerpsController.monitorPendingWithdrawals as jest.Mock
    ).mockImplementation(() => {
      // State remains the same - no completion
      Engine.context.PerpsController.state.pendingWithdrawals = mockWithdrawals;
    });

    const { getByText } = renderComponent();

    const checkButton = getByText('Check');
    fireEvent.press(checkButton);

    await waitFor(() => {
      expect(
        Engine.context.PerpsController.monitorPendingWithdrawals,
      ).toHaveBeenCalled();
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
