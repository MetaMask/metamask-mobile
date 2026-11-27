import { strings } from '../../../../../../locales/i18n';
import React from 'react';
import {
  SolScope,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import {
  useTokenTransactions,
  type UseTokenTransactionsResult,
} from '../../hooks/useTokenTransactions';
import { type TokenDetailsRouteParams } from '../../constants/constants';
import ActivitySection, {
  TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID,
  TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID,
} from './ActivitySection';

let mockMaliciousTokenKeys = new Set<string>();

jest.mock(
  '../../../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys',
  () => ({
    useMultichainActivityMaliciousTokenKeys: () => ({
      maliciousTokenKeys: mockMaliciousTokenKeys,
    }),
  }),
);
jest.mock('../../../Bridge/hooks/useBridgeHistoryItemBySrcTxHash', () => ({
  useBridgeHistoryItemBySrcTxHash: () => ({
    bridgeHistoryItemsBySrcTxHash: {},
    bridgeHistoryItemsByDestTxHash: {},
  }),
}));
jest.mock(
  '../../../../Views/MultichainTransactionsView/MultichainTransactionsFooter',
  () => () => null,
);
jest.mock(
  '../../../../Views/MultichainTransactionsView/MultichainAssetDetailsActivityListItem',
  () => {
    const { Text: RowText } = jest.requireActual('react-native');
    return ({ transaction }: { transaction: { id: string } }) => (
      <RowText>{transaction.id}</RowText>
    );
  },
);
jest.mock('../../../../Views/ActivityList/getActivityDetailsRoute', () => ({
  getActivityDetailsRoute: jest.fn(),
}));
jest.mock('../../../Bridge/utils/transaction-history', () => ({
  handleUnifiedSwapsTxHistoryItemClick: jest.fn(),
}));
jest.mock('../../../../../core/Multichain/utils', () => ({
  getAddressUrl: () => '',
  isNonEvmChainId: () => false,
}));

jest.mock('../../../ActivityListItemRow/ActivityListItemRow', () => ({
  ActivityListItemRow: () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="mock-bridge-arrival" />;
  },
}));
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({ addProperties: () => ({ build: jest.fn() }) }),
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn(),
}));

jest.mock('../../hooks/useTokenTransactions', () => ({
  useTokenTransactions: jest.fn(),
}));

jest.mock('../../../../Views/Asset/ActivityHeader', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-activity-header" />,
  };
});

jest.mock('../../../Transactions/AssetDetailsActivityListItem', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ transaction }: { transaction: { id: string } }) => (
      <View testID={`mock-activity-item-${transaction.id}`} />
    ),
  };
});

jest.mock('../../../Transactions/AssetDetailsActivityListItem.utils', () => ({
  mapTransactionToActivityItem: ({
    transaction,
  }: {
    transaction: {
      id: string;
      time: number;
      chainId: string;
      status: string;
    };
  }) => ({
    chainId: transaction.chainId,
    timestamp: transaction.time * 1000,
    type: 'transaction',
    hash: transaction.id,
    status: transaction.status,
  }),
}));

jest.mock('../../../Transactions/utils', () => ({
  filterDuplicateOutgoingTransactions: (list: unknown[]) => list,
}));

jest.mock('../../../ActivityListItemRow/ActivityListDateHeader', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ timestamp, label }: { timestamp?: number; label?: string }) => (
      <View
        testID={
          label ? `mock-date-header-${label}` : `mock-date-header-${timestamp}`
        }
      />
    ),
  };
});

const mockUseSelector = jest.mocked(useSelector);
const mockUseNavigation = jest.mocked(useNavigation);
const mockNavigate = jest.fn();
const mockSelectSelectedInternalAccount = jest.mocked(
  selectSelectedInternalAccount,
);
const mockUseTokenTransactions = jest.mocked(useTokenTransactions);

const NOW = 1_700_000_000;

const token = {
  address: '0xabc',
  chainId: '0x1',
  decimals: 18,
  symbol: 'PEPE',
  name: 'Pepe',
} as unknown as TokenDetailsRouteParams;

const makeTransaction = (
  id: string,
  offsetSeconds: number,
  status = 'confirmed',
) => ({
  id,
  chainId: '0x1',
  time: NOW - offsetSeconds,
  status,
});

const mockTransactionsResult = (
  overrides: Partial<UseTokenTransactionsResult> = {},
): UseTokenTransactionsResult =>
  ({
    transactions: [],
    submittedTxs: [],
    confirmedTxs: [],
    loading: false,
    refreshing: false,
    transactionsUpdated: false,
    selectedAddress: '0x123',
    conversionRate: 1,
    currentCurrency: 'usd',
    isNonEvmAsset: false,
    bridgeArrivalTxs: [],
    onRefresh: async () => undefined,
    ...overrides,
  }) as unknown as UseTokenTransactionsResult;

describe('ActivitySection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaliciousTokenKeys = new Set();
    jest.mocked(selectBridgeHistoryForAccount).mockReturnValue({});
    mockUseSelector.mockImplementation((selector: unknown) =>
      (selector as (state: undefined) => unknown)(undefined),
    );
    mockSelectSelectedInternalAccount.mockReturnValue({
      address: '0x123',
      metadata: { importTime: 0 },
    } as never);
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as never);
    mockUseTokenTransactions.mockReturnValue(mockTransactionsResult());
  });

  it('renders the activity rows grouped by date', () => {
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        transactions: [
          makeTransaction('tx-recent', 2 * 60 * 60),
          makeTransaction('tx-latest', 60),
          makeTransaction('tx-yesterday', 24 * 60 * 60 + 60),
        ],
      }),
    );

    const { getByTestId, getAllByTestId, queryByTestId } = render(
      <ActivitySection token={token} />,
    );

    expect(getByTestId(TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID)).toBeTruthy();
    expect(getAllByTestId(/^mock-date-header-\d+$/)).toHaveLength(2);
    expect(getByTestId('mock-activity-item-tx-recent')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-latest')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-yesterday')).toBeTruthy();
    expect(queryByTestId('mock-date-header-Pending')).toBeNull();
  });

  it('renders a pending header before the pending rows', () => {
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        submittedTxs: [makeTransaction('tx-pending', 30, 'pending')],
        confirmedTxs: [makeTransaction('tx-confirmed', 60)],
      }),
    );

    const { getByTestId, getAllByTestId } = render(
      <ActivitySection token={token} />,
    );

    expect(getAllByTestId(/^mock-date-header-/)).toHaveLength(2);
    expect(getByTestId('mock-date-header-Pending')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-pending')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-confirmed')).toBeTruthy();
  });

  it('hides the activity section when there are no transactions', () => {
    const { queryByTestId } = render(<ActivitySection token={token} />);
    expect(queryByTestId(TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID)).toBeNull();
  });

  it('hides the activity section for non-EVM assets', () => {
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        transactions: [makeTransaction('tx-solana', 60)],
        isNonEvmAsset: true,
      }),
    );

    const { queryByTestId } = render(<ActivitySection token={token} />);
    expect(queryByTestId(TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID)).toBeNull();
  });

  it('shows three Solana transactions initially and five more per press when enabled', () => {
    const transactions = Array.from({ length: 10 }, (_, index) => ({
      id: `sol-${index}`,
      timestamp: NOW - index * 60,
      chain: SolScope.Mainnet,
      from: [{ address: '0x123' }],
      to: [{ address: 'other' }],
      type: TransactionType.Send,
      status: TransactionStatus.Confirmed,
    }));
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({ transactions, isNonEvmAsset: true }),
    );

    const { getByTestId, getByText, queryByTestId, queryByText } = render(
      <ActivitySection
        token={{ ...token, chainId: SolScope.Mainnet }}
        includeNonEvm
      />,
    );

    expect(getByText('sol-2')).toBeOnTheScreen();
    expect(queryByText('sol-3')).not.toBeOnTheScreen();
    fireEvent.press(getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID));
    expect(getByText('sol-7')).toBeOnTheScreen();
    expect(queryByText('sol-8')).not.toBeOnTheScreen();
    fireEvent.press(getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID));
    expect(getByText('sol-9')).toBeOnTheScreen();
    expect(
      queryByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID),
    ).not.toBeOnTheScreen();
  });

  it('restores the disclaimer and opens the asset-chain explorer on standard EVM pages', () => {
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        transactions: [makeTransaction('tx-1', 60)],
      }),
    );
    const { getByText, getByTestId } = render(
      <ActivitySection token={token} showEvmFooter />,
    );

    expect(getByText(strings('asset_overview.disclaimer'))).toBeOnTheScreen();
    fireEvent.press(getByTestId('transactions-footer-view-explorer'));
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: 'https://etherscan.io/address/0x123', title: 'Etherscan' },
    });
  });

  it('excludes malicious Solana movements and deduplicates bridge arrivals', () => {
    const solTransaction = {
      timestamp: NOW,
      chain: SolScope.Mainnet,
      from: [{ address: '0x123' }],
      to: [{ address: 'other' }],
      type: TransactionType.Send,
      status: TransactionStatus.Confirmed,
    };
    const maliciousMint = 'So11111111111111111111111111111111111111112';
    mockMaliciousTokenKeys = new Set([`solana:${maliciousMint}`]);
    jest.mocked(selectBridgeHistoryForAccount).mockReturnValue({
      'tx-arrival': { status: { destChain: { txHash: 'bridge-dest' } } },
    } as unknown as ReturnType<typeof selectBridgeHistoryForAccount>);
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        isNonEvmAsset: true,
        bridgeArrivalTxs: [makeTransaction('tx-arrival', 60)],
        transactions: [
          { ...solTransaction, id: 'bridge-dest' },
          { ...solTransaction, id: 'sol-safe' },
          {
            ...solTransaction,
            id: 'sol-malicious',
            from: [
              {
                address: '0x123',
                asset: {
                  fungible: true,
                  type: `${SolScope.Mainnet}/token:${maliciousMint}`,
                },
              },
            ],
          },
        ],
      }),
    );
    const { getByText, getByTestId, queryByText } = render(
      <ActivitySection
        token={{ ...token, chainId: SolScope.Mainnet }}
        includeNonEvm
      />,
    );

    expect(getByTestId('mock-bridge-arrival')).toBeOnTheScreen();
    expect(getByText('sol-safe')).toBeOnTheScreen();
    expect(queryByText('bridge-dest')).not.toBeOnTheScreen();
    expect(queryByText('sol-malicious')).not.toBeOnTheScreen();
  });

  it('paginates by rows: 3 initially, +5 per "View more" press until all visible', () => {
    const txs = Array.from({ length: 12 }, (_, i) =>
      makeTransaction(`tx-${i}`, i * 60),
    );
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        transactions: txs,
      }),
    );

    // 1 date header + 12 tx rows. Only the first 3 rows render initially.
    const { getByTestId, queryByTestId } = render(
      <ActivitySection token={token} />,
    );

    expect(getByTestId('mock-activity-item-tx-0')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-1')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-2')).toBeTruthy();
    expect(queryByTestId('mock-activity-item-tx-3')).toBeNull();
    expect(getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID)).toBeTruthy();

    // First press: +5 rows (8 visible), button still present.
    fireEvent.press(getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID));
    expect(getByTestId('mock-activity-item-tx-7')).toBeTruthy();
    expect(queryByTestId('mock-activity-item-tx-8')).toBeNull();
    expect(getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID)).toBeTruthy();

    // Second press: remaining 4 rows, button disappears once exhausted.
    fireEvent.press(getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID));
    expect(getByTestId('mock-activity-item-tx-11')).toBeTruthy();
    expect(queryByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID)).toBeNull();
  });
});
