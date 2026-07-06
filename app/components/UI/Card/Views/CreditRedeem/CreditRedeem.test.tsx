const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
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
  return { ToastContext, ToastVariants: { Icon: 'Icon' } };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('../../../../../core/Analytics', () => ({
  MetaMetricsEvents: { CARD_BUTTON_CLICKED: 'CARD_BUTTON_CLICKED' },
}));

jest.mock('../../util/metrics', () => ({
  CardActions: {
    CASHBACK_BUTTON: 'CASHBACK_BUTTON',
    CREDIT_BUTTON: 'CREDIT_BUTTON',
  },
  CardEntryPoint: { CASHBACK: 'CASHBACK', CREDIT: 'CREDIT' },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  };
});

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return { ...actual, useTheme: jest.fn(() => actual.mockTheme) };
});

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'card.credit_screen.title': 'Card refunds',
      'card.credit_screen.available_credit': 'Refund balance',
      'card.credit_screen.network_fee': 'Network fee',
      'card.credit_screen.expected_to_receive': 'Expected to receive',
      'card.credit_screen.to': 'To',
      'card.credit_screen.withdraw': 'Move funds',
      'card.credit_screen.withdraw_to_money_account': 'Move to Money account',
      'card.credit_screen.withdraw_unavailable': 'Redemption unavailable',
      'card.card_spending_limit.money_account_label': 'Money account',
    };
    return translations[key] ?? key;
  },
}));

jest.mock('../../../Money/utils/moneyActivityFiat', () => ({
  getUsdToFiatConversionRate: jest.fn(() => 1),
}));

jest.mock('../../hooks/useMoneyAccountCardLinkage', () => ({
  useMoneyAccountCardLinkage: jest.fn(() => ({
    startLinkFlow: jest.fn(),
    canLink: true,
  })),
}));

jest.mock('../../../../../selectors/cardController', () => ({
  selectCardHomeDataStatus: () => 'success',
  selectIsCardAuthenticated: jest.fn(() => true),
}));

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
  isMoneyAccountDestination: true,
  hasApprovedDestination: true,
  delegationToken: { isMoneyAccountEntry: true, symbol: 'musd' },
});

let mockDestination: DestinationReturn = defaultDestination();

jest.mock('../../hooks/useRedeemDestination', () => ({
  __esModule: true,
  default: () => mockDestination,
}));

const createMockHookReturn = () => ({
  wallet: {
    id: 'w1',
    balance: '10.86',
    currency: 'musd',
    isWithdrawable: true,
    type: 'credit',
  } as {
    id: string;
    balance: string;
    currency: string;
    isWithdrawable: boolean;
    type: string;
  } | null,
  isLoading: false,
  error: null as Error | null,
  estimation: { wei: '1', eth: '0', price: '0.01', network: 'linea' } as {
    wei: string;
    eth: string;
    price: string;
    network?: string;
  } | null,
  isEstimating: false,
  fetchWallet: jest.fn(),
  estimationError: null as Error | null,
  fetchEstimation: jest.fn().mockResolvedValue(undefined),
  withdraw: jest.fn(),
  isWithdrawing: false,
  withdrawError: null as Error | null,
  txHash: null as string | null,
  monitoringStatus: 'idle' as string,
  monitoringError: null as Error | null,
  resetWithdraw: jest.fn(),
});

let mockHookReturn = createMockHookReturn();

jest.mock('../../hooks/useRedeemableWallet', () => ({
  __esModule: true,
  default: jest.fn(() => mockHookReturn),
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
  getMemoizedInternalAccountByAddress: jest.fn(() => ({
    metadata: { name: '' },
  })),
}));

import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import CreditRedeem from './CreditRedeem';
import { CreditRedeemSelectors } from './CreditRedeem.testIds';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const CreditRedeemWithToast = () => (
  <ToastContext.Provider value={{ toastRef: { current: null } }}>
    <CreditRedeem />
  </ToastContext.Provider>
);

function render() {
  return renderScreen(
    CreditRedeemWithToast,
    { name: 'CreditRedeem' },
    { state: { engine: { backgroundState } } },
  );
}

describe('CreditRedeem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
    mockHookReturn = createMockHookReturn();
    mockDestination = defaultDestination();
  });

  it('renders the "Card refunds" title and "Refund balance" label', () => {
    render();

    expect(screen.getByText('Card refunds')).toBeOnTheScreen();
    expect(screen.getByText('Refund balance')).toBeOnTheScreen();
  });

  it('renders the headline balance in fiat', () => {
    render();

    expect(screen.getByText(/10\.86/)).toBeOnTheScreen();
  });

  it('shows "Move to Money account" when the destination is the Money account', () => {
    render();

    expect(
      screen.getByTestId(CreditRedeemSelectors.WITHDRAW_BUTTON),
    ).toHaveTextContent('Move to Money account');
  });

  it('shows "Move funds" when redeeming to a wallet (no Money account)', () => {
    mockDestination = {
      ...defaultDestination(),
      isMoneyAccountDestination: false,
      delegationToken: { isMoneyAccountEntry: false, symbol: 'usdc' },
    };

    render();

    expect(
      screen.getByTestId(CreditRedeemSelectors.WITHDRAW_BUTTON),
    ).toHaveTextContent('Move funds');
  });

  it('falls back to the truncated address in the To row when the account name is empty', () => {
    mockDestination = {
      ...defaultDestination(),
      isMoneyAccountDestination: false,
      delegationToken: { isMoneyAccountEntry: false, symbol: 'usdc' },
      receivingAddress: '0x1111111111111111111111111111111111111111',
    };

    render();

    expect(screen.getByTestId(CreditRedeemSelectors.TO_ROW)).toHaveTextContent(
      /0x11111/,
    );
  });

  it('submits the full credit balance for dust-sized claims', () => {
    mockHookReturn.wallet = {
      id: 'w1',
      balance: '0.0007',
      currency: 'musd',
      isWithdrawable: true,
      type: 'credit',
    };
    mockHookReturn.estimation = {
      wei: '1',
      eth: '0',
      price: '0.0005',
      network: 'linea',
    };

    render();

    fireEvent.press(screen.getByTestId(CreditRedeemSelectors.WITHDRAW_BUTTON));

    expect(mockHookReturn.withdraw).toHaveBeenCalledWith('0.0007');
  });
});
