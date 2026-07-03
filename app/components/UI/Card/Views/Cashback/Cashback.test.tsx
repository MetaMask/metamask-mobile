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
  },
  CardEntryPoint: {
    CASHBACK: 'CASHBACK',
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

const mockSelectCardHasApprovedLineaFunding = jest.fn();
const mockSelectCardHomeDataStatus = jest.fn();
const mockSelectCardLineaUsdcToken = jest.fn();
const mockSelectIsCardResidencyBlocked = jest.fn();
const mockSelectIsMoneyAccountDelegatedForCard = jest.fn();
const mockSelectMoneyEnableMoneyAccountFlag = jest.fn();

jest.mock('../../../../../selectors/cardController', () => ({
  selectCardHasApprovedLineaFunding: () =>
    mockSelectCardHasApprovedLineaFunding(),
  selectCardHomeDataStatus: () => mockSelectCardHomeDataStatus(),
  selectCardLineaUsdcToken: () => mockSelectCardLineaUsdcToken(),
  selectIsCardResidencyBlocked: () => mockSelectIsCardResidencyBlocked(),
  selectIsMoneyAccountDelegatedForCard: () =>
    mockSelectIsMoneyAccountDelegatedForCard(),
}));

jest.mock('../../../Money/selectors/featureFlags', () => ({
  selectMoneyEnableMoneyAccountFlag: () =>
    mockSelectMoneyEnableMoneyAccountFlag(),
}));

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
  withdrawError: null as Error | null,
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
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { CASHBACK_MONEY_ACCOUNT_ORIGIN } from '../../hooks/useCardPostAuthRedirect';

const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

const MOCK_LINEA_USDC_TOKEN = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xusdc000000000000000000000000000000000001',
  decimals: 6,
  caipChainId: 'eip155:59144',
};

const CashbackWithToast = () => (
  <ToastContext.Provider value={{ toastRef: mockToastRef }}>
    <Cashback />
  </ToastContext.Provider>
);

interface SelectorOverrides {
  hasApprovedLineaFunding?: boolean;
  cardHomeDataStatus?: string;
  lineaUsdcToken?: unknown;
  residencyBlocked?: boolean;
  moneyAccountDelegated?: boolean;
  moneyAccountEnabled?: boolean;
}

function render(overrides: SelectorOverrides = {}) {
  if (overrides.hasApprovedLineaFunding !== undefined) {
    mockSelectCardHasApprovedLineaFunding.mockReturnValue(
      overrides.hasApprovedLineaFunding,
    );
  }
  if (overrides.cardHomeDataStatus !== undefined) {
    mockSelectCardHomeDataStatus.mockReturnValue(overrides.cardHomeDataStatus);
  }
  if (overrides.lineaUsdcToken !== undefined) {
    mockSelectCardLineaUsdcToken.mockReturnValue(overrides.lineaUsdcToken);
  }
  if (overrides.residencyBlocked !== undefined) {
    mockSelectIsCardResidencyBlocked.mockReturnValue(
      overrides.residencyBlocked,
    );
  }
  if (overrides.moneyAccountDelegated !== undefined) {
    mockSelectIsMoneyAccountDelegatedForCard.mockReturnValue(
      overrides.moneyAccountDelegated,
    );
  }
  if (overrides.moneyAccountEnabled !== undefined) {
    mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(
      overrides.moneyAccountEnabled,
    );
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

    mockSelectCardHasApprovedLineaFunding.mockReturnValue(true);
    mockSelectCardHomeDataStatus.mockReturnValue('success');
    mockSelectCardLineaUsdcToken.mockReturnValue(MOCK_LINEA_USDC_TOKEN);
    mockSelectIsCardResidencyBlocked.mockReturnValue(false);
    mockSelectIsMoneyAccountDelegatedForCard.mockReturnValue(false);
    mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(false);

    mockHookReturn = {
      cashbackWallet: null,
      isLoading: false,
      error: null,
      estimation: null,
      isEstimating: false,
      fetchEstimation: mockFetchEstimation,
      withdraw: mockWithdraw,
      isWithdrawing: false,
      withdrawError: null,
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

    it('shows unavailable label when net amount floors to zero', () => {
      mockHookReturn.cashbackWallet = {
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

  describe('Linea funding requirement', () => {
    it('shows a warning when the user has no approved Linea funding', () => {
      render({ hasApprovedLineaFunding: false });

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

    it('navigates to Spending Limit with USDC on Linea pre-selected', () => {
      render({ hasApprovedLineaFunding: false });

      fireEvent.press(screen.getByText('Set up funding'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.SPENDING_LIMIT, {
        flow: 'enable',
        selectedToken: expect.objectContaining({
          symbol: 'USDC',
          caipChainId: 'eip155:59144',
        }),
      });
    });

    it('blocks withdrawal when approved Linea funding is missing', () => {
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

      render({ hasApprovedLineaFunding: false });

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).not.toHaveBeenCalled();
    });

    it('shows the generic loading error instead of missing-funding warning when card home data failed to load', () => {
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

      render({ cardHomeDataStatus: 'error' });

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
  });

  describe('Money Account funding requirement (supported regions)', () => {
    const setWithdrawableWallet = () => {
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
    };

    it('shows a Money Account warning and starts link flow when no Money Account is delegated', () => {
      setWithdrawableWallet();

      render({ moneyAccountEnabled: true, hasApprovedLineaFunding: false });

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

      render({ moneyAccountEnabled: true, hasApprovedLineaFunding: false });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();
      expect(mockStartLinkFlow).not.toHaveBeenCalled();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).not.toHaveBeenCalled();
    });

    it('blocks withdrawal when no Money Account is delegated in a supported region', () => {
      setWithdrawableWallet();

      render({ moneyAccountEnabled: true, hasApprovedLineaFunding: false });

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).not.toHaveBeenCalled();
    });

    it('allows withdrawal when Money Account is delegated in a supported region', () => {
      setWithdrawableWallet();

      render({
        moneyAccountEnabled: true,
        moneyAccountDelegated: true,
        hasApprovedLineaFunding: false,
      });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).toHaveBeenCalledWith('9.5');
    });
  });

  describe('UK / restricted region funding requirement', () => {
    const setWithdrawableWallet = () => {
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
    };

    it('allows withdrawal when only Linea funding is approved', () => {
      setWithdrawableWallet();

      render({
        moneyAccountEnabled: true,
        residencyBlocked: true,
        hasApprovedLineaFunding: true,
        moneyAccountDelegated: false,
      });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).toHaveBeenCalledWith('9.5');
    });

    it('allows withdrawal when only Money Account is delegated', () => {
      setWithdrawableWallet();

      render({
        moneyAccountEnabled: true,
        residencyBlocked: true,
        hasApprovedLineaFunding: false,
        moneyAccountDelegated: true,
      });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).toHaveBeenCalledWith('9.5');
    });

    it('shows Linea warning and redirects to Spending Limit when neither destination is configured', () => {
      setWithdrawableWallet();

      render({
        moneyAccountEnabled: true,
        residencyBlocked: true,
        hasApprovedLineaFunding: false,
        moneyAccountDelegated: false,
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

  describe('Money Account feature flag disabled', () => {
    it('uses the UK-style Linea or Money Account gate when the Money Account FF is off', () => {
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

      render({
        moneyAccountEnabled: false,
        moneyAccountDelegated: true,
        hasApprovedLineaFunding: false,
      });

      expect(
        screen.queryByTestId(CashbackSelectors.FUNDING_WARNING),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CashbackSelectors.WITHDRAW_BUTTON));

      expect(mockWithdraw).toHaveBeenCalledWith('9.5');
    });
  });

  describe('withdraw action', () => {
    it('calls withdraw with net amount on button press', () => {
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

      expect(mockWithdraw).toHaveBeenCalledWith('9.5');
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

    it('navigates back after successful withdrawal', () => {
      mockHookReturn.cashbackWallet = {
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
      mockHookReturn.cashbackWallet = {
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
      mockHookReturn.cashbackWallet = {
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

    it('shows failure toast when withdraw mutation fails', () => {
      mockHookReturn.cashbackWallet = {
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
