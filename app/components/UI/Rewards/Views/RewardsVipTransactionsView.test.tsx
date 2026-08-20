import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsVipTransactionsView, {
  REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS,
} from './RewardsVipTransactionsView';
import { useGetVipTransactions } from '../hooks/useGetVipTransactions';
import { useVipDashboard } from '../hooks/useVipDashboard';
import type {
  VipDashboardState,
  VipTransactionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    addListener: jest.fn(() => jest.fn()),
    isFocused: () => true,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('../components/Vip/VipPerpsTransactionRow', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      transaction,
      testID,
    }: {
      transaction: { id: string; type: string };
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, `perps-${transaction.id}`),
      ),
  };
});

jest.mock('../components/Vip/VipSwapTransactionRow', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      transaction,
      testID,
    }: {
      transaction: { id: string; type: string };
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, `swap-${transaction.id}`),
      ),
  };
});

jest.mock('../utils/formatUtils', () => ({
  formatRewardsDateLabel: (date: Date) => {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  },
}));

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
    }: {
      title: string;
      onConfirm?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'error-banner' },
        ReactActual.createElement(Text, null, title),
        onConfirm
          ? ReactActual.createElement(
              Pressable,
              { testID: 'error-banner-retry', onPress: onConfirm },
              ReactActual.createElement(Text, null, 'Retry'),
            )
          : null,
      ),
  };
});

jest.mock('../hooks/useGetVipTransactions');
const mockUseGetVipTransactions = jest.mocked(useGetVipTransactions);

jest.mock('../hooks/useVipDashboard');
const mockUseVipDashboard = jest.mocked(useVipDashboard);

jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.vip_transactions.select_type': 'Select type',
      'rewards.vip_transactions.type_perps': 'Perps',
      'rewards.vip_transactions.type_swap': 'Swaps',
      'rewards.vip_transactions.error_title': 'Failed to load transactions',
      'rewards.vip_transactions.error_description': 'Please try again.',
      'rewards.vip_transactions.retry_button': 'Retry',
      'rewards.vip_transactions.empty_title': 'No transactions yet',
    };
    return translations[key] ?? key;
  },
}));

const MOCK_PERPS_TX: VipTransactionDto = {
  id: 'tx-perps-1',
  type: 'PERPS',
  timestamp: '2026-03-28T14:30:00.000Z',
  feeUsd: '1.25',
  volumeUsd: '1000.00',
  perps: {
    coin: 'ETH',
    feeCoin: 'USDC',
    rawFee: '1250000',
    rawNotionalVolume: '1000000000',
    tradeId: 'trade-1',
    orderId: 'order-1',
  },
};

const MOCK_SWAP_TX: VipTransactionDto = {
  id: 'tx-swap-1',
  type: 'SWAP',
  timestamp: '2026-03-28T12:00:00.000Z',
  feeUsd: '0.50',
  volumeUsd: '250.00',
  swap: {
    quoteId: 'quote-1',
    srcChainId: '1',
    srcAssetSymbol: 'ETH',
    destChainId: '1',
    destAssetSymbol: 'USDC',
  },
};

const defaultDashboard = {
  localizedText: {
    transactionsTitle: 'Transactions',
  },
} as VipDashboardState;

const transactionDefaults = {
  transactions: null as VipTransactionDto[] | null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null as string | null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  retry: jest.fn(),
  isRefreshing: false,
};

describe('RewardsVipTransactionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVipDashboard.mockReturnValue({
      dashboard: defaultDashboard,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: jest.fn(),
    });
    mockUseGetVipTransactions.mockReturnValue({ ...transactionDefaults });
  });

  it('renders localized transactions title from the VIP dashboard', () => {
    const { getByText, getByTestId } = render(<RewardsVipTransactionsView />);

    expect(
      getByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Transactions')).toBeOnTheScreen();
  });

  it('falls back to Transactions when dashboard is unavailable', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: null,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: jest.fn(),
    });

    const { getByText } = render(<RewardsVipTransactionsView />);

    expect(getByText('Transactions')).toBeOnTheScreen();
  });

  it('renders layout-matching skeletons while loading with no transactions', () => {
    mockUseGetVipTransactions.mockReturnValue({
      ...transactionDefaults,
      isLoading: true,
      transactions: null,
    });

    const { getByTestId, queryByTestId } = render(
      <RewardsVipTransactionsView />,
    );

    expect(
      getByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.EMPTY),
    ).toBeNull();
  });

  it('renders skeletons when transactions are still null before loading starts', () => {
    mockUseGetVipTransactions.mockReturnValue({
      ...transactionDefaults,
      isLoading: false,
      transactions: null,
    });

    const { getByTestId, queryByTestId } = render(
      <RewardsVipTransactionsView />,
    );

    expect(
      getByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.EMPTY),
    ).toBeNull();
  });

  it('keeps empty state visible while pull-to-refresh runs', () => {
    mockUseGetVipTransactions.mockReturnValue({
      ...transactionDefaults,
      isRefreshing: true,
      isLoading: false,
      transactions: [],
    });

    const { getByTestId, queryByTestId } = render(
      <RewardsVipTransactionsView />,
    );

    expect(
      getByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.EMPTY),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.SKELETON),
    ).toBeNull();
  });

  it('does not render skeletons when an error is present', () => {
    mockUseGetVipTransactions.mockReturnValue({
      ...transactionDefaults,
      isLoading: true,
      error: 'Network failure',
      transactions: null,
    });

    const { queryByTestId, getByTestId } = render(
      <RewardsVipTransactionsView />,
    );

    expect(
      queryByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.SKELETON),
    ).toBeNull();
    expect(getByTestId('error-banner')).toBeOnTheScreen();
  });

  it('opens the type selector sheet', () => {
    const { getByTestId } = render(<RewardsVipTransactionsView />);

    fireEvent.press(
      getByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.TYPE_SELECTOR),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_SELECT_SHEET,
      expect.objectContaining({
        title: 'Select type',
        selectedValue: 'PERPS',
      }),
    );
  });

  it('renders date-grouped perps transactions', () => {
    mockUseGetVipTransactions.mockReturnValue({
      ...transactionDefaults,
      transactions: [MOCK_PERPS_TX],
    });

    const { getByText, getByTestId } = render(<RewardsVipTransactionsView />);

    expect(getByTestId('vip-transaction-row-0')).toBeOnTheScreen();
    expect(getByText('perps-tx-perps-1')).toBeOnTheScreen();
    expect(getByText(/Mar 28, 2026/)).toBeOnTheScreen();
  });

  it('renders swap rows when selected type returns swap transactions', () => {
    mockUseGetVipTransactions.mockReturnValue({
      ...transactionDefaults,
      transactions: [MOCK_SWAP_TX],
    });

    const { getByText } = render(<RewardsVipTransactionsView />);

    expect(getByText('swap-tx-swap-1')).toBeOnTheScreen();
  });

  it('renders empty state when there are no transactions', () => {
    mockUseGetVipTransactions.mockReturnValue({
      ...transactionDefaults,
      transactions: [],
    });

    const { getByTestId, getByText } = render(<RewardsVipTransactionsView />);

    expect(
      getByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.EMPTY),
    ).toBeOnTheScreen();
    expect(getByText('No transactions yet')).toBeOnTheScreen();
  });

  it('renders error banner and retries on confirm', () => {
    const retry = jest.fn();
    mockUseGetVipTransactions.mockReturnValue({
      ...transactionDefaults,
      error: 'Network failure',
      retry,
    });

    const { getByTestId, getByText } = render(<RewardsVipTransactionsView />);

    expect(getByTestId('error-banner')).toBeOnTheScreen();
    expect(getByText('Failed to load transactions')).toBeOnTheScreen();
    fireEvent.press(getByTestId('error-banner-retry'));
    expect(retry).toHaveBeenCalled();
  });

  it('calls loadMore when the list reaches the end and has more pages', () => {
    const loadMore = jest.fn();
    mockUseGetVipTransactions.mockReturnValue({
      ...transactionDefaults,
      transactions: [MOCK_PERPS_TX],
      hasMore: true,
      loadMore,
    });

    const { getByTestId } = render(<RewardsVipTransactionsView />);
    const list = getByTestId(REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.LIST);

    fireEvent(list, 'onEndReached');

    expect(loadMore).toHaveBeenCalled();
  });
});
