import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import ContentDisplay from '../../../AssetOverview/AboutAsset/ContentDisplay';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectAllTokens } from '../../../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useTokenPerformance } from '../../hooks/useTokenPerformance';
import {
  useTokenTransactions,
  type UseTokenTransactionsResult,
} from '../../hooks/useTokenTransactions';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { filterDuplicateOutgoingTransactions } from '../../../Transactions/utils';
import { mapTransactionToActivityItem } from '../../../Transactions/AssetDetailsActivityListItem.utils';
import {
  TokenDetailsAction,
  type TokenDetailsRouteParams,
} from '../../constants/constants';
import {
  OVERVIEW_TAB_ACTIVITY_TEST_ID,
  OVERVIEW_TAB_BALANCE_TEST_ID,
  OVERVIEW_TAB_DESCRIPTION_TEST_ID,
  OVERVIEW_TAB_TEST_ID,
  OVERVIEW_TAB_TOKEN_DETAILS_TEST_ID,
  default as OverviewTab,
} from './OverviewTab';
import { OVERVIEW_TAB_PERFORMANCE_TEST_ID } from '../sections/PerformanceSection';
import type { TokenSecurityData } from '@metamask/assets-controllers';

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

jest.mock('../../../../../selectors/tokensController', () => ({
  selectAllTokens: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
  }),
);

jest.mock('../../hooks/useTokenPerformance', () => ({
  useTokenPerformance: jest.fn(),
}));

const mockUseTokenAssetDetails = jest.fn();
jest.mock('../../queries/tokenAssetQuery', () => ({
  useTokenAssetDetails: (assetId: unknown) => mockUseTokenAssetDetails(assetId),
}));

jest.mock('../../hooks/useTokenTransactions', () => ({
  useTokenTransactions: jest.fn(),
}));

jest.mock('../../hooks/useTokenBalance', () => ({
  __esModule: true,
  useTokenBalance: jest.fn(),
}));

const mockTrackActionTapped = jest.fn();
jest.mock('../../hooks/useTokenDetailsActionTracking', () => ({
  __esModule: true,
  useTokenDetailsActionTracking: () => mockTrackActionTapped,
}));

const mockMarketInsightsProps: Record<string, unknown>[] = [];
jest.mock('../sections/TokenDetailsMarketInsightsSection', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockMarketInsightsProps.push(props);
      return <View testID="mock-market-insights" />;
    },
  };
});

const mockBalanceProps: Record<string, unknown>[] = [];
jest.mock('../../../AssetOverview/Balance', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockBalanceProps.push(props);
      return <View testID="mock-balance" />;
    },
  };
});

const mockTokenDetailsProps: Record<string, unknown>[] = [];
jest.mock('../../../AssetOverview/TokenDetails', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockTokenDetailsProps.push(props);
      return <View testID="mock-token-details" />;
    },
  };
});

const mockUnifiedTxActions = {
  speedUpIsOpen: false,
  cancelIsOpen: false,
  confirmDisabled: false,
  existingTx: null,
  onSpeedUpAction: jest.fn(),
  onCancelAction: jest.fn(),
  onSpeedUpCancelCompleted: jest.fn(),
  speedUpTransaction: jest.fn(),
  cancelTransaction: jest.fn(),
};
jest.mock('../../../../Views/ActivityList/useUnifiedTxActions', () => ({
  useUnifiedTxActions: () => mockUnifiedTxActions,
}));

jest.mock('../../../../Views/Asset/ActivityHeader', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-activity-header" />,
  };
});

jest.mock(
  '../../../../Views/confirmations/components/modals/cancel-speedup-modal',
  () => ({
    CancelSpeedupModal: () => {
      const { View } = jest.requireActual('react-native');
      return <View testID="mock-cancel-speedup-modal" />;
    },
  }),
);

const resetSectionMocks = () => {
  mockMarketInsightsProps.length = 0;
  mockBalanceProps.length = 0;
  mockTokenDetailsProps.length = 0;
};

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
const mockSelectSelectedInternalAccount = jest.mocked(
  selectSelectedInternalAccount,
);
const mockUseTokenPerformance = jest.mocked(useTokenPerformance);
const mockUseTokenTransactions = jest.mocked(useTokenTransactions);
const mockUseTokenBalance = jest.mocked(useTokenBalance);

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

describe('OverviewTab', () => {
  const performance = {
    fiveMinute: 0.12,
    oneHour: -0.52,
    fourHour: null,
    twentyFourHour: 3.09,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetSectionMocks();
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
    mockUseTokenAssetDetails.mockReturnValue({
      asset: null,
      isLoading: false,
      isError: false,
    });
    mockUseTokenTransactions.mockReturnValue(mockTransactionsResult());
    mockUseTokenBalance.mockReturnValue({
      balance: '4200000',
      fiatBalance: '$69.42',
      tokenFormattedBalance: '4200000 PEPE',
    } as never);
  });

  it('renders the description through ContentDisplay when the token has one', () => {
    const { getByTestId, getByText } = render(
      <OverviewTab
        token={{ ...token, description: 'Pepe the frog' }}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(getByTestId(OVERVIEW_TAB_TEST_ID)).toBeTruthy();
    expect(getByTestId(OVERVIEW_TAB_DESCRIPTION_TEST_ID)).toBeTruthy();
    expect(getByText('Pepe the frog')).toBeTruthy();
  });

  it('hides the description section when the resolved description is empty', () => {
    const { queryByTestId } = render(
      <OverviewTab
        token={{ ...token, description: '' }}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(queryByTestId(OVERVIEW_TAB_DESCRIPTION_TEST_ID)).toBeNull();
  });

  it('renders the asset query description ahead of the token description', () => {
    mockUseTokenAssetDetails.mockReturnValue({
      asset: {
        launchpadData: { description: 'From the assets API' },
      },
      isLoading: false,
      isError: false,
    });

    const { getByText, queryByText } = render(
      <OverviewTab
        token={{ ...token, description: 'From the route' }}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(getByText('From the assets API')).toBeTruthy();
    expect(queryByText('From the route')).toBeNull();
  });

  it('hides the description section when the token and the asset record have none', () => {
    const { queryByTestId } = render(
      <OverviewTab
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(queryByTestId(OVERVIEW_TAB_DESCRIPTION_TEST_ID)).toBeNull();
  });

  it('hides the description section when the text is only spaces', () => {
    mockUseTokenAssetDetails.mockReturnValue({
      asset: {
        launchpadData: { description: '   ' },
      },
      isLoading: false,
      isError: false,
    });

    const { queryByTestId } = render(
      <OverviewTab
        token={{ ...token, description: '  ' }}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(queryByTestId(OVERVIEW_TAB_DESCRIPTION_TEST_ID)).toBeNull();
  });

  it('passes the performance cells to the Performance section', () => {
    const { getByTestId, getByText } = render(
      <OverviewTab
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
    expect(
      getByTestId('token-details-overview-tab-performance-value-1h'),
    ).toHaveTextContent('-0.52%');
    expect(
      getByTestId('token-details-overview-tab-performance-value-24h'),
    ).toHaveTextContent('+3.09%');
    expect(
      getByTestId('token-details-overview-tab-performance-value-4h'),
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
      <OverviewTab
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(getByTestId(OVERVIEW_TAB_ACTIVITY_TEST_ID)).toBeTruthy();
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
      <OverviewTab
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
      <OverviewTab
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(queryByTestId(OVERVIEW_TAB_ACTIVITY_TEST_ID)).toBeNull();
  });

  it('hides the activity section for non-EVM assets', () => {
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        transactions: [makeTransaction('tx-solana', 60)],
        isNonEvmAsset: true,
      }),
    );

    const { queryByTestId } = render(
      <OverviewTab
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(queryByTestId(OVERVIEW_TAB_ACTIVITY_TEST_ID)).toBeNull();
  });

  it('renders the Your balance section from the token balance, as in the legacy view', () => {
    const { getByTestId } = render(
      <OverviewTab
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(getByTestId(OVERVIEW_TAB_BALANCE_TEST_ID)).toBeTruthy();
    expect(mockBalanceProps[0].asset).toBe(token);
    expect(mockBalanceProps[0].mainBalance).toBe('$69.42');
    expect(mockBalanceProps[0].secondaryBalance).toBe('4200000 PEPE');
  });

  it('hides the Your balance section when the token has no balance', () => {
    mockUseTokenBalance.mockReturnValue({
      balance: undefined,
      fiatBalance: undefined,
      tokenFormattedBalance: undefined,
    } as never);

    const { queryByTestId } = render(
      <OverviewTab
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(queryByTestId(OVERVIEW_TAB_BALANCE_TEST_ID)).toBeNull();
  });

  it('renders the Token Details & Market Details section with copy-address tracking', () => {
    const { getByTestId } = render(
      <OverviewTab
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
      />,
    );

    expect(getByTestId(OVERVIEW_TAB_TOKEN_DETAILS_TEST_ID)).toBeTruthy();
    expect(mockTokenDetailsProps[0].asset).toBe(token);
    const onCopyAddress = mockTokenDetailsProps[0].onCopyAddress as () => void;
    onCopyAddress();
    expect(mockTrackActionTapped).toHaveBeenCalledWith(
      TokenDetailsAction.CopyTokenAddress,
    );
  });

  it('wires the AI Market Insights card with the security data and 24h change', () => {
    const { getByTestId } = render(
      <OverviewTab
        token={token}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
        securityData={
          {
            created: '2024-01-01T00:00:00Z',
          } as unknown as TokenSecurityData
        }
      />,
    );

    expect(getByTestId('mock-market-insights')).toBeTruthy();
    expect(mockMarketInsightsProps[0].securityData).toStrictEqual({
      created: '2024-01-01T00:00:00Z',
    });
    expect(mockMarketInsightsProps[0].pricePercentChange).toBe(
      performance.twentyFourHour,
    );
  });

  it('renders the sections in prototype order: description, performance, balance, token details, insights, activity', () => {
    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        transactions: [makeTransaction('tx-1', 60)],
      }),
    );
    const { toJSON } = render(
      <OverviewTab
        token={{ ...token, description: 'Pepe the frog' }}
        assetId={'eip155:1/erc20:0xabc' as never}
        currentCurrency="usd"
        securityData={
          {
            created: '2024-01-01T00:00:00Z',
          } as unknown as TokenSecurityData
        }
      />,
    );

    const testIds = (rendered: ReturnType<typeof toJSON>): string[] => {
      const ids: string[] = [];
      const visit = (node: unknown) => {
        if (!node || typeof node !== 'object') return;
        const n = node as {
          props?: { testID?: string };
          children?: unknown[];
        };
        if (n.props?.testID) ids.push(n.props.testID);
        n.children?.forEach(visit);
      };
      visit(rendered);
      return ids;
    };
    const ids = testIds(toJSON());
    const sectionOrder = [
      OVERVIEW_TAB_DESCRIPTION_TEST_ID,
      OVERVIEW_TAB_PERFORMANCE_TEST_ID,
      OVERVIEW_TAB_BALANCE_TEST_ID,
      OVERVIEW_TAB_TOKEN_DETAILS_TEST_ID,
      'mock-market-insights',
      OVERVIEW_TAB_ACTIVITY_TEST_ID,
    ].map((id) => ids.indexOf(id));
    sectionOrder.forEach((index) => expect(index).toBeGreaterThan(-1));
    expect(sectionOrder).toStrictEqual([...sectionOrder].sort((a, b) => a - b));
  });
});
