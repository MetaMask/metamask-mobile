const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ event: 'built' }),
};

jest.mock('../../../../../component-library/components/Toast', () => {
  const React = jest.requireActual('react');
  const ToastContext = React.createContext({ toastRef: null });
  return {
    ToastContext,
    ToastVariants: { Icon: 'Icon' },
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('../../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    CARD_BUTTON_CLICKED: 'CARD_BUTTON_CLICKED',
  },
}));

jest.mock('../../util/metrics', () => ({
  CardActions: {
    CASHBACK_BUTTON: 'CASHBACK_BUTTON',
  },
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      icon: { default: '#000' },
      success: { default: '#00ff00' },
      error: { default: '#ff0000' },
      background: { default: '#fff' },
    },
  })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'card.cashback_screen.available_cashback': 'Available cashback',
      'card.cashback_screen.network_fee': 'Network fee',
      'card.cashback_screen.expected_to_receive': 'Expected to receive',
      'card.cashback_screen.withdraw': 'Withdraw',
      'card.cashback_screen.withdraw_unavailable': 'Withdrawal unavailable',
      'card.cashback_screen.withdrawal_initiated':
        'Withdrawal has been initiated',
      'card.cashback_screen.withdrawal_success':
        'Withdrawal completed successfully',
      'card.cashback_screen.withdrawal_failed':
        'Withdrawal failed. Please try again.',
      'card.cashback_screen.loading_error':
        'Failed to load cashback. Please try again.',
    };
    return translations[key] ?? key;
  },
}));

const mockWithdraw = jest.fn();
const mockFetchEstimation = jest.fn().mockResolvedValue(undefined);
const mockResetWithdraw = jest.fn();

let mockHookReturn = {
  cashbackWallet: null as {
    id: string;
    balance: string;
    currency: string;
    isWithdrawable: boolean;
    type: string;
  } | null,
  isLoading: false,
  error: null as Error | null,
  estimation: null as {
    wei: string;
    eth: string;
    price: string;
  } | null,
  isEstimating: false,
  fetchEstimation: mockFetchEstimation,
  withdraw: mockWithdraw,
  isWithdrawing: false,
  monitoringStatus: 'idle' as string,
  monitoringError: null as Error | null,
  resetWithdraw: mockResetWithdraw,
};

jest.mock('../../hooks/useCashbackWallet', () => ({
  __esModule: true,
  default: jest.fn(() => mockHookReturn),
}));

import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import Cashback from './Cashback';
import { CashbackSelectors } from './Cashback.testIds';

const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

const CashbackWithToast = () => (
  <ToastContext.Provider value={{ toastRef: mockToastRef }}>
    <Cashback />
  </ToastContext.Provider>
);

function render() {
  return renderScreen(
    CashbackWithToast,
    {
      name: 'Cashback',
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
}

describe('Cashback Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);

    mockHookReturn = {
      cashbackWallet: null,
      isLoading: false,
      error: null,
      estimation: null,
      isEstimating: false,
      fetchEstimation: mockFetchEstimation,
      withdraw: mockWithdraw,
      isWithdrawing: false,
      monitoringStatus: 'idle',
      monitoringError: null,
      resetWithdraw: mockResetWithdraw,
    };
  });

  describe('loading state', () => {
    it('renders skeleton when loading', () => {
      mockHookReturn.isLoading = true;

      render();

      expect(screen.getByTestId(CashbackSelectors.CONTAINER)).toBeOnTheScreen();
      expect(screen.queryByText('Available cashback')).toBeOnTheScreen();
    });
  });

  describe('error state', () => {
    it('renders error message when wallet query fails', () => {
      mockHookReturn.error = new Error('Network error');

      render();

      expect(
        screen.getByText('Failed to load cashback. Please try again.'),
      ).toBeOnTheScreen();
    });

    it('does not render details card when error exists', () => {
      mockHookReturn.error = new Error('Network error');

      render();

      expect(
        screen.queryByTestId(CashbackSelectors.DETAILS_CARD),
      ).not.toBeOnTheScreen();
    });
  });

  describe('wallet data display', () => {
    it('renders balance and currency', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.50',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.estimation = {
        wei: '100000',
        eth: '0.0001',
        price: '0.50',
      };

      render();

      expect(screen.getByText(/10\.50/)).toBeOnTheScreen();
      expect(screen.getAllByText(/mUSD/)[0]).toBeOnTheScreen();
    });

    it('formats unknown currency to uppercase', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '5.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.estimation = {
        wei: '100000',
        eth: '0.0001',
        price: '0.01',
      };

      render();

      expect(screen.getAllByText(/mUSD/)[0]).toBeOnTheScreen();
    });

    it('renders details card with fee and expected receive', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.estimation = {
        wei: '100000',
        eth: '0.0001',
        price: '0.50',
      };

      render();

      expect(
        screen.getByTestId(CashbackSelectors.DETAILS_CARD),
      ).toBeOnTheScreen();
      expect(screen.getByText('Network fee')).toBeOnTheScreen();
      expect(screen.getByText('Expected to receive')).toBeOnTheScreen();
    });
  });

  describe('button states', () => {
    it('shows withdraw button when withdrawable', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.estimation = {
        wei: '100000',
        eth: '0.0001',
        price: '0.50',
      };

      render();

      expect(screen.getByText('Withdraw')).toBeOnTheScreen();
    });

    it('shows unavailable label when not withdrawable', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: false,
        type: 'reward',
      };

      render();

      expect(screen.getByText('Withdrawal unavailable')).toBeOnTheScreen();
    });

    it('shows unavailable label when balance is insufficient', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '0.50',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.estimation = {
        wei: '100000',
        eth: '0.0001',
        price: '1.00',
      };

      render();

      expect(screen.getByText('Withdrawal unavailable')).toBeOnTheScreen();
    });

    it('shows unavailable label when balance is zero', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '0',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };

      render();

      expect(screen.getByText('Withdrawal unavailable')).toBeOnTheScreen();
    });
  });

  describe('withdraw action', () => {
    it('calls withdraw with balance on button press', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.estimation = {
        wei: '100000',
        eth: '0.0001',
        price: '0.50',
      };

      render();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).toHaveBeenCalledWith('10.00');
    });

    it('tracks analytics event on withdraw', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.estimation = {
        wei: '100000',
        eth: '0.0001',
        price: '0.50',
      };

      render();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'CARD_BUTTON_CLICKED',
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        action: 'CASHBACK_BUTTON',
        type: 'withdraw',
      });
    });
  });

  describe('toast notifications', () => {
    it('does not show a toast when status is monitoring', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.monitoringStatus = 'monitoring';

      render();

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows success toast when monitoring completes', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.monitoringStatus = 'success';

      render();

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          hasNoTimeout: false,
          labelOptions: [{ label: 'Withdrawal completed successfully' }],
        }),
      );
    });

    it('shows failure toast when monitoring fails', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.monitoringStatus = 'failed';

      render();

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          hasNoTimeout: false,
          labelOptions: [{ label: 'Withdrawal failed. Please try again.' }],
        }),
      );
    });

    it('shows failure toast on monitoring error', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.monitoringError = new Error('Timeout');

      render();

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Withdrawal failed. Please try again.' }],
        }),
      );
    });
  });

  describe('estimation fetch', () => {
    it('fetches estimation when wallet data loads', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };

      render();

      expect(mockFetchEstimation).toHaveBeenCalled();
    });

    it('does not fetch estimation when wallet data is null', () => {
      mockHookReturn.cashbackWallet = null;

      render();

      expect(mockFetchEstimation).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('calls resetWithdraw on unmount', () => {
      mockHookReturn.cashbackWallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };

      const { unmount } = render();

      unmount();

      expect(mockResetWithdraw).toHaveBeenCalled();
    });
  });
});
