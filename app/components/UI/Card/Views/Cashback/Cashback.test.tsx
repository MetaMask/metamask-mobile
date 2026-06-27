const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockNavigate = jest.fn();

const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ event: 'built' }),
};

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '99.0.0'),
}));

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
    CREDIT_BUTTON: 'CREDIT_BUTTON',
  },
  CardEntryPoint: {
    CASHBACK: 'CASHBACK',
    CREDIT: 'CREDIT',
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'card.cashback_screen.available_cashback': 'Available mUSD',
      'card.cashback_screen.network_fee': 'Network fee',
      'card.cashback_screen.expected_to_receive': 'Expected to receive',
      'card.cashback_screen.to': 'To',
      'card.card_spending_limit.money_account_label': 'Money account',
      'card.cashback_screen.withdraw': 'Withdraw',
      'card.cashback_screen.withdraw_unavailable': 'Withdrawal unavailable',
      'card.cashback_screen.withdrawal_success':
        'Withdrawal completed successfully',
      'card.cashback_screen.withdrawal_failed':
        'Withdrawal failed. Please try again.',
      'card.cashback_screen.loading_error':
        'Failed to load cashback. Please try again.',
      'card.cashback_screen.funding_required.title': 'Set up Linea funding',
      'card.cashback_screen.funding_required.description':
        'You need at least one approved funding source on Linea before redeeming cashback.',
      'card.cashback_screen.funding_required.confirm_button_label':
        'Set up funding',
      'card.cashback_screen.money_account_required.title':
        'Set up Money Account',
      'card.cashback_screen.money_account_required.description':
        'You need a linked Money Account before redeeming cashback.',
      'card.cashback_screen.money_account_required.confirm_button_label':
        'Set up Money Account',
    };
    return translations[key] ?? key;
  },
}));

const mockWithdraw = jest.fn();
const mockFetchEstimation = jest.fn().mockResolvedValue(undefined);
const mockResetWithdraw = jest.fn();
const mockStartLinkFlow = jest.fn();

let mockLinkageReturn = {
  startLinkFlow: mockStartLinkFlow,
  canLink: true,
};

jest.mock('../../hooks/useMoneyAccountCardLinkage', () => ({
  useMoneyAccountCardLinkage: jest.fn(() => mockLinkageReturn),
}));

const mockSelectCardHomeDataStatus = jest.fn();

jest.mock('../../../../../selectors/cardController', () => ({
  selectCardHomeDataStatus: () => mockSelectCardHomeDataStatus(),
  selectIsCardAuthenticated: jest.fn(() => true),
}));

const MOCK_LINEA_USDC_TOKEN = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xusdc000000000000000000000000000000000001',
  decimals: 6,
  caipChainId: 'eip155:59144',
  walletAddress: '0x1111111111111111111111111111111111111111',
};

interface DestinationReturn {
  caipChainId: string | undefined;
  symbol: string | undefined;
  isResolved: boolean;
  isMoneyAccountDestination: boolean;
  hasApprovedDestination: boolean;
  delegationToken: unknown;
  receivingAddress?: string;
}

const defaultDestination = (): DestinationReturn => ({
  caipChainId: 'eip155:59144',
  symbol: 'musd',
  isResolved: true,
  isMoneyAccountDestination: false,
  hasApprovedDestination: true,
  delegationToken: MOCK_LINEA_USDC_TOKEN,
  receivingAddress: '0x1111111111111111111111111111111111111111',
});

let mockDestination: DestinationReturn = defaultDestination();

jest.mock('../../hooks/useRedeemDestination', () => ({
  __esModule: true,
  default: () => mockDestination,
}));

let mockHookReturn = {
  wallet: null as {
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
    network?: string;
  } | null,
  isEstimating: false,
  fetchWallet: jest.fn(),
  estimationError: null as Error | null,
  fetchEstimation: mockFetchEstimation,
  withdraw: mockWithdraw,
  isWithdrawing: false,
  withdrawError: null as Error | null,
  txHash: null as string | null,
  monitoringStatus: 'idle' as string,
  monitoringError: null as Error | null,
  resetWithdraw: mockResetWithdraw,
};

jest.mock('../../hooks/useRedeemableWallet', () => ({
  __esModule: true,
  default: jest.fn(() => mockHookReturn),
}));

import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import Cashback from './Cashback';
import { CashbackSelectors } from './Cashback.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { CASHBACK_MONEY_ACCOUNT_ORIGIN } from '../../hooks/useCardPostAuthRedirect';

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

interface RenderOverrides {
  cardHomeDataStatus?: string;
  destination?: Partial<DestinationReturn>;
}

function render(overrides: RenderOverrides = {}) {
  if (overrides.cardHomeDataStatus !== undefined) {
    mockSelectCardHomeDataStatus.mockReturnValue(overrides.cardHomeDataStatus);
  }
  if (overrides.destination) {
    mockDestination = { ...defaultDestination(), ...overrides.destination };
  }

  return renderScreen(
    CashbackWithToast,
    { name: 'Cashback' },
    { state: { engine: { backgroundState } } },
  );
}

describe('Cashback Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
    mockStartLinkFlow.mockReset();
    mockLinkageReturn = {
      startLinkFlow: mockStartLinkFlow,
      canLink: true,
    };

    mockSelectCardHomeDataStatus.mockReturnValue('success');
    mockDestination = defaultDestination();

    mockHookReturn = {
      wallet: null,
      isLoading: false,
      error: null,
      estimation: null,
      isEstimating: false,
      fetchWallet: jest.fn(),
      estimationError: null,
      fetchEstimation: mockFetchEstimation,
      withdraw: mockWithdraw,
      isWithdrawing: false,
      withdrawError: null,
      txHash: null,
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
      expect(screen.queryByText('Available mUSD')).toBeOnTheScreen();
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
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '0',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };

      render();

      expect(screen.getByText('Withdrawal unavailable')).toBeOnTheScreen();
    });

    it('shows unavailable label when expected receive floors to zero', () => {
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '0.50005',
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

      expect(screen.getByText('Withdrawal unavailable')).toBeOnTheScreen();
    });
  });

  describe('funding destination requirement (funding flow)', () => {
    it('shows a warning when the destination has no approved funding', () => {
      render({
        destination: {
          isMoneyAccountDestination: false,
          hasApprovedDestination: false,
        },
      });

      expect(
        screen.getByTestId(CashbackSelectors.FUNDING_WARNING),
      ).toBeOnTheScreen();
      expect(screen.getByText('Set up Linea funding')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'You need at least one approved funding source on Linea before redeeming cashback.',
        ),
      ).toBeOnTheScreen();
    });

    it('navigates to Spending Limit with the resolved delegation token pre-selected', () => {
      render({
        destination: {
          isMoneyAccountDestination: false,
          hasApprovedDestination: false,
        },
      });

      fireEvent.press(screen.getByText('Set up funding'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.SPENDING_LIMIT, {
        flow: 'enable',
        selectedToken: expect.objectContaining({
          symbol: 'USDC',
          caipChainId: 'eip155:59144',
        }),
      });
    });

    it('blocks withdrawal when the destination delegation is missing', () => {
      mockHookReturn.wallet = {
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

      render({
        destination: {
          isMoneyAccountDestination: false,
          hasApprovedDestination: false,
        },
      });

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).not.toHaveBeenCalled();
    });

    it('shows the generic loading error instead of missing-funding warning when card home data failed to load', () => {
      mockHookReturn.wallet = {
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

      render({
        cardHomeDataStatus: 'error',
        destination: { hasApprovedDestination: false },
      });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByText('Failed to load cashback. Please try again.'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CashbackSelectors.DETAILS_CARD),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('keeps withdrawal disabled while the destination is unresolved (estimation pending)', () => {
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };

      render({
        destination: { isResolved: false, hasApprovedDestination: false },
      });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).not.toHaveBeenCalled();
    });
  });

  describe('money account destination requirement', () => {
    const setWithdrawableWallet = () => {
      mockHookReturn.wallet = {
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
    };

    it('shows a Money Account warning and starts link flow when no Money Account is delegated', () => {
      setWithdrawableWallet();

      render({
        destination: {
          isMoneyAccountDestination: true,
          hasApprovedDestination: false,
        },
      });

      expect(
        screen.getByTestId(CashbackSelectors.FUNDING_WARNING),
      ).toBeOnTheScreen();
      expect(
        screen.getAllByText('Set up Money Account').length,
      ).toBeGreaterThan(0);
      expect(
        screen.getByText(
          'You need a linked Money Account before redeeming cashback.',
        ),
      ).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('confirm-button'));

      expect(mockStartLinkFlow).toHaveBeenCalledWith(
        CASHBACK_MONEY_ACCOUNT_ORIGIN,
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('hides the Money Account setup CTA when the link flow cannot complete (canLink is false)', () => {
      setWithdrawableWallet();
      mockLinkageReturn = {
        startLinkFlow: mockStartLinkFlow,
        canLink: false,
      };

      render({
        destination: {
          isMoneyAccountDestination: true,
          hasApprovedDestination: false,
        },
      });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();
      expect(mockStartLinkFlow).not.toHaveBeenCalled();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).not.toHaveBeenCalled();
    });

    it('blocks withdrawal when no Money Account is delegated', () => {
      setWithdrawableWallet();

      render({
        destination: {
          isMoneyAccountDestination: true,
          hasApprovedDestination: false,
        },
      });

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).not.toHaveBeenCalled();
    });

    it('allows withdrawal when the Money Account destination is delegated', () => {
      setWithdrawableWallet();

      render({
        destination: {
          isMoneyAccountDestination: true,
          hasApprovedDestination: true,
        },
      });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).toHaveBeenCalledWith('10.00');
    });
  });

  describe('approved destination', () => {
    const setWithdrawableWallet = () => {
      mockHookReturn.wallet = {
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
    };

    it('allows withdrawal when the funding destination is approved', () => {
      setWithdrawableWallet();

      render({
        destination: {
          isMoneyAccountDestination: false,
          hasApprovedDestination: true,
        },
      });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).toHaveBeenCalledWith('10.00');
    });

    it('shows the funding warning and redirects to Spending Limit when no destination is configured', () => {
      setWithdrawableWallet();

      render({
        destination: {
          isMoneyAccountDestination: false,
          hasApprovedDestination: false,
        },
      });

      expect(
        screen.getByTestId(CashbackSelectors.FUNDING_WARNING),
      ).toBeOnTheScreen();
      expect(screen.getByText('Set up Linea funding')).toBeOnTheScreen();

      fireEvent.press(screen.getByText('Set up funding'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.SPENDING_LIMIT, {
        flow: 'enable',
        selectedToken: expect.objectContaining({
          symbol: 'USDC',
          caipChainId: 'eip155:59144',
        }),
      });
      expect(mockStartLinkFlow).not.toHaveBeenCalled();
    });
  });

  describe('withdraw action', () => {
    it('calls withdraw with full balance on button press', () => {
      mockHookReturn.wallet = {
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

    it('submits the full cashback balance for dust-sized claims', () => {
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '0.0007',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.estimation = {
        wei: '100000',
        eth: '0.0001',
        price: '0.0005',
      };

      render();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).toHaveBeenCalledWith('0.0007');
    });

    it('tracks analytics event on withdraw', () => {
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = {
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

    it('navigates back after successful withdrawal', () => {
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.monitoringStatus = 'success';

      render();

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('does not navigate back when monitoring fails', () => {
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.monitoringStatus = 'failed';

      render();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not navigate back when status is idle', () => {
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.monitoringStatus = 'idle';

      render();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('shows failure toast when monitoring fails', () => {
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = {
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

    it('shows failure toast when withdraw mutation fails', () => {
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      mockHookReturn.withdrawError = new Error('POST /reward failed');

      render();

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          hasNoTimeout: false,
          labelOptions: [{ label: 'Withdrawal failed. Please try again.' }],
        }),
      );
    });
  });

  describe('estimation fetch', () => {
    it('fetches estimation when wallet data loads', () => {
      mockHookReturn.wallet = {
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
      mockHookReturn.wallet = null;

      render();

      expect(mockFetchEstimation).not.toHaveBeenCalled();
    });
  });

  describe('destination "To" row', () => {
    it('renders the To row with the receiving wallet address by default', () => {
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };

      render({ cardHomeDataStatus: 'success' });

      const toRow = screen.getByTestId(CashbackSelectors.TO_ROW);
      expect(toRow).toBeOnTheScreen();
      expect(screen.getByText('To')).toBeOnTheScreen();
      expect(toRow).toHaveTextContent(/0x11111/);
    });

    it('renders "Money account" in the To row for a Money account destination', () => {
      mockHookReturn.wallet = {
        id: 'w1',
        balance: '10.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };

      render({
        cardHomeDataStatus: 'success',
        destination: {
          isMoneyAccountDestination: true,
          hasApprovedDestination: true,
        },
      });

      expect(screen.getByText('Money account')).toBeOnTheScreen();
    });
  });

  describe('cleanup', () => {
    it('calls resetWithdraw on unmount', () => {
      mockHookReturn.wallet = {
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
