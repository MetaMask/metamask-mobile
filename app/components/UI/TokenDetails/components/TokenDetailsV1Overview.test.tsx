import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import ContentDisplay from '../../AssetOverview/AboutAsset/ContentDisplay';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import { selectAllTokens } from '../../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { useTokenPerformance } from '../hooks/useTokenPerformance';
import {
  useTokenTransactions,
  type UseTokenTransactionsResult,
} from '../hooks/useTokenTransactions';
import { filterDuplicateOutgoingTransactions } from '../../Transactions/utils';
import { mapTransactionToActivityItem } from '../../Transactions/AssetDetailsActivityListItem.utils';
import type { TokenDetailsRouteParams } from '../constants/constants';
import {
  TOKEN_DETAILS_V1_ACTIVITY_TEST_ID,
  TOKEN_DETAILS_V1_DESCRIPTION_TEST_ID,
  TOKEN_DETAILS_V1_OVERVIEW_TEST_ID,
  default as TokenDetailsV1Overview,
} from './TokenDetailsV1Overview';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn(),
}));

jest.mock('../../../../selectors/tokensController', () => ({
  selectAllTokens: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
  }),
);

jest.mock('../hooks/useTokenPerformance', () => ({
  useTokenPerformance: jest.fn(),
}));

jest.mock('../hooks/useTokenTransactions', () => ({
  useTokenTransactions: jest.fn(),
}));

// Heavy row that navigates into the transaction sheet — out of scope here.
jest.mock('../../Transactions/AssetDetailsActivityListItem', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ transaction }: { transaction: { id: string } }) => (
      <View testID={`mock-activity-item-${transaction.id}`} />
    ),
  };
});

jest.mock('../../Transactions/AssetDetailsActivityListItem.utils', () => ({
  // Simplified mapping: preserve ordering, per-transaction identity and the
  // pending status that drives the pending-header grouping.
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

jest.mock('../../Transactions/utils', () => ({
  filterDuplicateOutgoingTransactions: (list: unknown[]) => list,
}));

jest.mock('../../ActivityListItemRow/ActivityListDateHeader', () => {
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
const mockSelectSelectedInternalAccount = jest.mocked(
  selectSelectedInternalAccount,
);
const mockUseTokenPerformance = jest.mocked(useTokenPerformance);
const mockUseTokenTransactions = jest.mocked(useTokenTransactions);

const NOW = 1_700_000_000; // seconds

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

/** Full `UseTokenTransactionsResult` with overridable list fields. */
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

describe('TokenDetailsV1Overview', () => {
  const performance = {
    fiveMinute: 0.12,
    oneHour: -0.52,
    fourHour: null,
    twentyFourHour: 3.09,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: unknown) =>
      (selector as (state: undefined) => unknown)(undefined),
    );
    mockSelectSelectedInternalAccount.mockReturnValue({
      address: '0x123',
      metadata: { importTime: 0 },
    } as never);
    mockUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    } as never);
    mockUseTokenPerformance.mockReturnValue(performance);
    mockUseTokenTransactions.mockReturnValue(mockTransactionsResult());
  });

  it('renders the description through ContentDisplay when the token has one', () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsV1Overview
        token={{ ...token, description: 'Pepe the frog' }}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(getByTestId(TOKEN_DETAILS_V1_OVERVIEW_TEST_ID)).toBeTruthy();
    expect(getByTestId(TOKEN_DETAILS_V1_DESCRIPTION_TEST_ID)).toBeTruthy();
    expect(getByText('Pepe the frog')).toBeTruthy();
  });

  it('hides the description section when the token has no description', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1Overview
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(queryByTestId(TOKEN_DETAILS_V1_DESCRIPTION_TEST_ID)).toBeNull();
  });

  it('passes the performance cells to the Performance section', () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsV1Overview
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(mockUseTokenPerformance).toHaveBeenCalledWith({
      token,
      assetId: 'eip155:1/erc20:0xabc',
      currentCurrency: 'usd',
    });
    // Filled cells render the formatted value; missing data renders a dash.
    expect(
      getByTestId('token-details-v1-performance-value-1h'),
    ).toHaveTextContent('-0.52%');
    expect(
      getByTestId('token-details-v1-performance-value-24h'),
    ).toHaveTextContent('+3.09%');
    expect(
      getByTestId('token-details-v1-performance-value-4h'),
    ).toHaveTextContent('—');
    expect(getByText('Performance')).toBeTruthy();
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
      <TokenDetailsV1Overview
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(getByTestId(TOKEN_DETAILS_V1_ACTIVITY_TEST_ID)).toBeTruthy();
    expect(getAllByTestId(/^mock-date-header-\d+$/)).toHaveLength(2);
    expect(getByTestId('mock-activity-item-tx-recent')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-latest')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-yesterday')).toBeTruthy();
    expect(queryByTestId('mock-date-header-Pending')).toBeNull();
  });

  it('renders a pending header before the pending rows', () => {
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        // With pending transactions present, the list is built from
        // submitted + confirmed transactions — matching the legacy flow.
        submittedTxs: [makeTransaction('tx-pending', 30, 'pending')],
        confirmedTxs: [makeTransaction('tx-confirmed', 60)],
      }),
    );

    const { getByTestId, getAllByTestId } = render(
      <TokenDetailsV1Overview
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(getAllByTestId(/^mock-date-header-/)).toHaveLength(2);
    expect(getByTestId('mock-date-header-Pending')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-pending')).toBeTruthy();
    expect(getByTestId('mock-activity-item-tx-confirmed')).toBeTruthy();
  });

  it('hides the activity section when there are no transactions', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1Overview
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(queryByTestId(TOKEN_DETAILS_V1_ACTIVITY_TEST_ID)).toBeNull();
  });

  it('hides the activity section for non-EVM assets', () => {
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        transactions: [makeTransaction('tx-solana', 60)],
        isNonEvmAsset: true,
      }),
    );

    const { queryByTestId } = render(
      <TokenDetailsV1Overview
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(queryByTestId(TOKEN_DETAILS_V1_ACTIVITY_TEST_ID)).toBeNull();
  });
});
