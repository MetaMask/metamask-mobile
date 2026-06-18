import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import { useMoneyAccountCardTransactions } from '../../hooks/useMoneyAccountCardTransactions';
import { useMoneyAccountCashbackTransactions } from '../../hooks/useMoneyAccountCashbackTransactions';
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';
import {
  isMoneyActivityDeposit,
  isMoneyActivityTransfer,
} from '../../constants/moneyActivityFilters';
import { MoneyActivityLoadingTestIds } from '../../components/MoneyActivityLoading/MoneyActivityLoading.testIds';
import MoneyActivityView from './MoneyActivityView';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';
import type {
  CardTransaction,
  CashbackTransaction,
} from '../../types/moneyActivity';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

const mockTrackScreenViewed = jest.fn();
const mockTrackButtonClicked = jest.fn();
const mockTrackActivitySurfaceClicked = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../hooks/useMoneyAccountTransactions', () => ({
  useMoneyAccountTransactions: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountCardTransactions', () => ({
  useMoneyAccountCardTransactions: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountCashbackTransactions', () => ({
  useMoneyAccountCashbackTransactions: jest.fn(),
}));

jest.mock('../../components/MoneyActivityItem/MoneyActivityItem', () => {
  const { Text, Pressable: RNPressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      tx,
      onPress,
    }: {
      tx: { id: string };
      onPress?: (tx: { id: string }) => void;
    }) => (
      <RNPressable
        testID={`activity-mock-tx-${tx.id}`}
        onPress={() => onPress?.(tx)}
      >
        <Text>{tx.id}</Text>
      </RNPressable>
    ),
  };
});

jest.mock('../../components/CardActivityItem/CardActivityItem', () => {
  const { Text, Pressable: RNPressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ card }: { card: { hash: string } }) => (
      <RNPressable testID={`activity-mock-card-${card.hash}`}>
        <Text>{card.hash}</Text>
      </RNPressable>
    ),
  };
});

jest.mock('../../components/CashbackActivityItem/CashbackActivityItem', () => {
  const { Text, Pressable: RNPressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ cashback }: { cashback: { hash: string } }) => (
      <RNPressable testID={`activity-mock-cashback-${cashback.hash}`}>
        <Text>{cashback.hash}</Text>
      </RNPressable>
    ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => {
    const map: Record<string, string> = {
      'money.activity.title': 'Activity',
      'money.activity.empty': 'No activity yet',
      'money.activity.filter_all': 'All',
      'money.activity.filter_deposits': 'Deposits',
      'money.activity.filter_sends': 'Sends',
      'money.activity.pending': 'Pending',
    };
    return map[key] ?? key;
  },
}));

const mockUseMoneyAccountTransactions = jest.mocked(
  useMoneyAccountTransactions,
);
const mockUseMoneyAccountCardTransactions = jest.mocked(
  useMoneyAccountCardTransactions,
);
const mockUseMoneyAccountCashbackTransactions = jest.mocked(
  useMoneyAccountCashbackTransactions,
);

const MOCK_DEPOSITS = MOCK_MONEY_TRANSACTIONS.filter(isMoneyActivityDeposit);
const MOCK_TRANSFERS = MOCK_MONEY_TRANSACTIONS.filter(isMoneyActivityTransfer);

const CARD_TX: CardTransaction = {
  hash: '0xcard1',
  time: 1780574031000,
  chainId: '0x8f',
  token: {
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    symbol: 'mUSD',
    decimals: 6,
  },
  amount: '5381986',
  to: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e',
};
const CARD_ROW_TEST_ID = `activity-mock-card-${CARD_TX.hash}`;

const CASHBACK_TX: CashbackTransaction = {
  hash: '0xback1',
  time: 1780574031000,
  chainId: '0x8f',
  token: {
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    symbol: 'mUSD',
    decimals: 6,
  },
  amount: '300000',
  from: '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0',
};
const CASHBACK_ROW_TEST_ID = `activity-mock-cashback-${CASHBACK_TX.hash}`;

describe('MoneyActivityView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: MOCK_MONEY_TRANSACTIONS,
      deposits: MOCK_DEPOSITS,
      transfers: MOCK_TRANSFERS,
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
      mockDataEnabled: false,
    });
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackScreenViewed: mockTrackScreenViewed,
      trackButtonClicked: mockTrackButtonClicked,
      trackActivitySurfaceClicked: mockTrackActivitySurfaceClicked,
    });
    mockUseMoneyAccountCardTransactions.mockReturnValue({
      cardTransactions: [],
      isLoading: false,
      error: false,
      refetch: jest.fn(),
    });
    mockUseMoneyAccountCashbackTransactions.mockReturnValue({
      cashbackTransactions: [],
      isLoading: false,
      error: false,
      refetch: jest.fn(),
    });
  });

  it('shows the loading spinner (not rows) while card payments load', () => {
    mockUseMoneyAccountCardTransactions.mockReturnValue({
      cardTransactions: [],
      isLoading: true,
      error: false,
      refetch: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyActivityView />,
    );

    expect(
      getByTestId(MoneyActivityLoadingTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId('activity-mock-tx-money-tx-converted')).toBeNull();
  });

  it('renders the main container', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId(MoneyActivityViewTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the activity title', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId(MoneyActivityViewTestIds.TITLE)).toBeOnTheScreen();
  });

  it('renders filter controls', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId(MoneyActivityViewTestIds.FILTER_ALL)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyActivityViewTestIds.FILTER_DEPOSITS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyActivityViewTestIds.FILTER_TRANSFERS),
    ).toBeOnTheScreen();
  });

  it('pressing the back button calls navigation.goBack', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    fireEvent.press(getByTestId(MoneyActivityViewTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders transaction rows from activity data', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(
      getByTestId('activity-mock-tx-money-tx-converted'),
    ).toBeOnTheScreen();
  });

  it('renders a Pending section for in-flight rows', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    // The fixture includes submitted (pending) rows, so the bucket appears.
    expect(
      getByTestId(MoneyActivityViewTestIds.PENDING_HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId('activity-mock-tx-money-tx-depositing'),
    ).toBeOnTheScreen();
  });

  it('omits the Pending section when nothing is in flight', () => {
    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: MOCK_DEPOSITS.filter(
        (tx) => tx.id === 'money-tx-converted',
      ),
      deposits: MOCK_DEPOSITS.filter((tx) => tx.id === 'money-tx-converted'),
      transfers: [],
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
      mockDataEnabled: false,
    });

    const { queryByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(queryByTestId(MoneyActivityViewTestIds.PENDING_HEADER)).toBeNull();
  });

  it('shows only deposit rows when the Deposits filter is selected', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyActivityView />,
    );

    fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_DEPOSITS));

    expect(
      getByTestId('activity-mock-tx-money-tx-converted'),
    ).toBeOnTheScreen();
    expect(queryByTestId('activity-mock-tx-money-tx-sent')).toBeNull();
  });

  it('shows only transfer rows when the Transfers filter is selected', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyActivityView />,
    );

    fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_TRANSFERS));

    expect(getByTestId('activity-mock-tx-money-tx-sent')).toBeOnTheScreen();
    expect(queryByTestId('activity-mock-tx-money-tx-converted')).toBeNull();
  });

  it('renders empty state when there are no transactions', () => {
    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: [],
      deposits: [],
      transfers: [],
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
      mockDataEnabled: false,
    });

    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId(MoneyActivityViewTestIds.EMPTY_LIST)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
    ).toBeOnTheScreen();
  });

  it('pressing a row navigates to the transaction details sheet when mockDataEnabled is false', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    fireEvent.press(getByTestId('activity-mock-tx-money-tx-converted'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('renders card payment rows merged into the list', () => {
    mockUseMoneyAccountCardTransactions.mockReturnValue({
      cardTransactions: [CARD_TX],
      isLoading: false,
      error: false,
      refetch: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId(CARD_ROW_TEST_ID)).toBeOnTheScreen();
  });

  it('buckets card payments into Transfers and All, but not Deposits', () => {
    mockUseMoneyAccountCardTransactions.mockReturnValue({
      cardTransactions: [CARD_TX],
      isLoading: false,
      error: false,
      refetch: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyActivityView />,
    );

    // All (default): present.
    expect(getByTestId(CARD_ROW_TEST_ID)).toBeOnTheScreen();

    // Deposits: absent (card spends are outgoing).
    fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_DEPOSITS));
    expect(queryByTestId(CARD_ROW_TEST_ID)).toBeNull();

    // Transfers: present.
    fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_TRANSFERS));
    expect(getByTestId(CARD_ROW_TEST_ID)).toBeOnTheScreen();
  });

  it('buckets cashback credits into Deposits and All, but not Transfers', () => {
    mockUseMoneyAccountCashbackTransactions.mockReturnValue({
      cashbackTransactions: [CASHBACK_TX],
      isLoading: false,
      error: false,
      refetch: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyActivityView />,
    );

    // All (default): present.
    expect(getByTestId(CASHBACK_ROW_TEST_ID)).toBeOnTheScreen();

    // Deposits: present (cashback credits are incoming).
    fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_DEPOSITS));
    expect(getByTestId(CASHBACK_ROW_TEST_ID)).toBeOnTheScreen();

    // Transfers: absent.
    fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_TRANSFERS));
    expect(queryByTestId(CASHBACK_ROW_TEST_ID)).toBeNull();
  });

  it('does not render card rows in mock-data mode', () => {
    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: MOCK_MONEY_TRANSACTIONS,
      deposits: MOCK_DEPOSITS,
      transfers: MOCK_TRANSFERS,
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
      mockDataEnabled: true,
    });
    mockUseMoneyAccountCardTransactions.mockReturnValue({
      cardTransactions: [CARD_TX],
      isLoading: false,
      error: false,
      refetch: jest.fn(),
    });

    const { queryByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(queryByTestId(CARD_ROW_TEST_ID)).toBeNull();
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_ACTIVITY screen_name', () => {
      renderWithProvider(<MoneyActivityView />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        screen_name: SCREEN_NAMES.MONEY_ACTIVITY,
      });
    });

    it('calls trackScreenViewed on mount', () => {
      renderWithProvider(<MoneyActivityView />);

      expect(mockTrackScreenViewed).toHaveBeenCalledTimes(1);
    });

    it('calls trackButtonClicked with FILTER intent and All filter label when "All" filter is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyActivityView />);

      fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_ALL));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.FILTER,
        label_key: 'money.activity.filter_all',
        component_name: COMPONENT_NAMES.MONEY_ACTIVITY_FILTER_ALL,
      });
    });

    it('calls trackButtonClicked with FILTER intent and Deposits filter label when "Deposits" filter is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyActivityView />);

      fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_DEPOSITS));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.FILTER,
        label_key: 'money.activity.filter_deposits',
        component_name: COMPONENT_NAMES.MONEY_ACTIVITY_FILTER_DEPOSITS,
      });
    });

    it('calls trackActivitySurfaceClicked with transaction and MONEY_ACTIVITY_DETAILS redirect when a row is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyActivityView />);

      fireEvent.press(getByTestId('activity-mock-tx-money-tx-converted'));

      expect(mockTrackActivitySurfaceClicked).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_target: SCREEN_NAMES.MONEY_ACTIVITY_DETAILS,
          component_name: COMPONENT_NAMES.MONEY_ACTIVITY_LIST_ITEM,
          transaction: expect.objectContaining({ id: 'money-tx-converted' }),
        }),
      );
    });
  });
});
