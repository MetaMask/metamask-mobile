import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
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

jest.mock('../../hooks/useTokenCaipAssetId', () => ({
  useTokenCaipAssetId: jest.fn(),
}));

jest.mock('../../../../Views/ActivityList/hooks/useLocalActivityItems', () => ({
  useLocalActivityItems: jest.fn(() => []),
}));

jest.mock('../../../../Views/ActivityList/useTransactionsQuery', () => ({
  useTransactionsQuery: jest.fn(() => ({ data: { pages: [] } })),
}));

jest.mock('../../../../Views/ActivityList/getActivityDetailsRoute', () => ({
  getActivityDetailsRoute: jest.fn(
    (item: { chainId: string; hash: string }) => ({
      chainId: item.chainId,
      txIdentifier: item.hash,
    }),
  ),
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

jest.mock('../../../ActivityListItemRow/ActivityListItemRow', () => {
  const { View, TouchableOpacity } = jest.requireActual('react-native');
  return {
    ActivityListItemRow: ({
      item,
      onPress,
    }: {
      item: { hash?: string; type: string };
      onPress?: (item: unknown) => void;
    }) => (
      <TouchableOpacity
        testID={`mock-api-activity-item-${item.hash ?? item.type}`}
        onPress={() => onPress?.(item)}
      >
        <View />
      </TouchableOpacity>
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
const mockUseTokenTransactions = jest.mocked(useTokenTransactions);
const mockUseTokenCaipAssetId = jest.mocked(
  jest.requireMock('../../hooks/useTokenCaipAssetId').useTokenCaipAssetId,
);

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
    mockUseTokenTransactions.mockReturnValue(mockTransactionsResult());
    mockUseTokenCaipAssetId.mockReturnValue('eip155:1/erc20:0xabc');
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

    expect(
      getByTestId(TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID),
    ).toBeOnTheScreen();
    expect(getAllByTestId(/^mock-date-header-\d+$/)).toHaveLength(2);
    expect(getByTestId('mock-activity-item-tx-recent')).toBeOnTheScreen();
    expect(getByTestId('mock-activity-item-tx-latest')).toBeOnTheScreen();
    expect(getByTestId('mock-activity-item-tx-yesterday')).toBeOnTheScreen();
    expect(queryByTestId('mock-date-header-Pending')).not.toBeOnTheScreen();
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
    expect(getByTestId('mock-date-header-Pending')).toBeOnTheScreen();
    expect(getByTestId('mock-activity-item-tx-pending')).toBeOnTheScreen();
    expect(getByTestId('mock-activity-item-tx-confirmed')).toBeOnTheScreen();
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

    expect(getByTestId('mock-activity-item-tx-0')).toBeOnTheScreen();
    expect(getByTestId('mock-activity-item-tx-1')).toBeOnTheScreen();
    expect(getByTestId('mock-activity-item-tx-2')).toBeOnTheScreen();
    expect(queryByTestId('mock-activity-item-tx-3')).not.toBeOnTheScreen();
    expect(
      getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID),
    ).toBeOnTheScreen();

    // First press: +5 rows (8 visible), button still present.
    fireEvent.press(getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID));
    expect(getByTestId('mock-activity-item-tx-7')).toBeOnTheScreen();
    expect(queryByTestId('mock-activity-item-tx-8')).not.toBeOnTheScreen();
    expect(
      getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID),
    ).toBeOnTheScreen();

    // Second press: remaining 4 rows, button disappears once exhausted.
    fireEvent.press(getByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID));
    expect(getByTestId('mock-activity-item-tx-11')).toBeOnTheScreen();
    expect(
      queryByTestId(TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID),
    ).not.toBeOnTheScreen();
  });

  it('renders API ERC-20 receives from useTransactionsQuery', () => {
    const { useTransactionsQuery } = jest.requireMock(
      '../../../../Views/ActivityList/useTransactionsQuery',
    );
    useTransactionsQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              {
                chainId: 'eip155:1',
                timestamp: NOW * 1000,
                type: 'receive',
                hash: '0xapiReceive',
                status: 'confirmed',
                data: {
                  from: '0xSender',
                  to: '0x123',
                  token: {
                    assetId: 'eip155:1/erc20:0xabc',
                    decimals: 18,
                    symbol: 'PEPE',
                    amount: '100',
                    direction: 'in',
                  },
                },
              },
            ],
          },
        ],
      },
    });

    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        transactions: [makeTransaction('tx-local', 60)],
      }),
    );

    const mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as never);

    const { getByTestId } = render(<ActivitySection token={token} />);

    expect(getByTestId('mock-activity-item-tx-local')).toBeOnTheScreen();
    expect(
      getByTestId('mock-api-activity-item-0xapiReceive'),
    ).toBeOnTheScreen();

    // Press the API row and verify navigation
    fireEvent.press(getByTestId('mock-api-activity-item-0xapiReceive'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.ACTIVITY_DETAILS, {
      chainId: 'eip155:1',
      txIdentifier: '0xapiReceive',
    });
  });

  it('keeps local swap over API receive with same hash (collision precedence)', () => {
    const { useTransactionsQuery } = jest.requireMock(
      '../../../../Views/ActivityList/useTransactionsQuery',
    );
    const utils = jest.requireMock(
      '../../../Transactions/AssetDetailsActivityListItem.utils',
    );

    const mapperSpy = jest
      .spyOn(utils, 'mapTransactionToActivityItem')
      .mockReturnValue({
        chainId: 'eip155:137',
        timestamp: NOW * 1000,
        type: 'swap',
        hash: '0xCollision',
        status: 'confirmed',
      });

    useTransactionsQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              {
                chainId: 'eip155:137',
                timestamp: NOW * 1000,
                type: 'receive',
                hash: '0xCollision',
                status: 'confirmed',
                data: {
                  from: '0xSender',
                  to: '0x123',
                  token: {
                    assetId: 'eip155:137/erc20:0xabc',
                    decimals: 18,
                    symbol: 'PEPE',
                    amount: '100',
                    direction: 'in',
                  },
                },
              },
            ],
          },
        ],
      },
    });

    mockUseTokenTransactions.mockReturnValue(
      mockTransactionsResult({
        transactions: [makeTransaction('0xCollision', 60)],
      }),
    );

    const polygonToken = {
      chainId: '0x89',
      address: '0xabc',
      symbol: 'PEPE',
      decimals: 18,
      name: 'Pepe',
    } as unknown as TokenDetailsRouteParams;

    mockUseTokenCaipAssetId.mockReturnValue('eip155:137/erc20:0xabc');

    const { getByTestId, queryByTestId } = render(
      <ActivitySection token={polygonToken} />,
    );

    expect(useTransactionsQuery).toHaveBeenCalledWith({
      assetId: 'eip155:137/erc20:0xabc',
    });

    expect(getByTestId('mock-activity-item-0xCollision')).toBeOnTheScreen();
    expect(
      queryByTestId('mock-api-activity-item-0xCollision'),
    ).not.toBeOnTheScreen();

    mapperSpy.mockRestore();
  });

  it('does not render API rows when caipAssetId is null', () => {
    const { useTransactionsQuery } = jest.requireMock(
      '../../../../Views/ActivityList/useTransactionsQuery',
    );

    mockUseTokenCaipAssetId.mockReturnValue(null);

    useTransactionsQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              {
                chainId: 'eip155:1',
                timestamp: NOW * 1000,
                type: 'receive',
                hash: '0xShouldNotRender',
                status: 'confirmed',
                data: {
                  from: '0xSender',
                  to: '0x123',
                  token: {
                    assetId: 'eip155:1/erc20:0xabc',
                    decimals: 18,
                    symbol: 'PEPE',
                    amount: '100',
                    direction: 'in',
                  },
                },
              },
            ],
          },
        ],
      },
    });

    mockUseTokenTransactions.mockReturnValue(mockTransactionsResult());

    const { queryByTestId } = render(<ActivitySection token={token} />);

    expect(
      queryByTestId('mock-api-activity-item-0xShouldNotRender'),
    ).not.toBeOnTheScreen();
  });

  it('fetches next page when first page has no matching rows', () => {
    const { useTransactionsQuery } = jest.requireMock(
      '../../../../Views/ActivityList/useTransactionsQuery',
    );

    const mockFetchNextPage = jest.fn();

    useTransactionsQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [],
          },
        ],
      },
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    mockUseTokenTransactions.mockReturnValue(mockTransactionsResult());

    render(<ActivitySection token={token} />);

    expect(mockFetchNextPage).toHaveBeenCalled();
  });
});
