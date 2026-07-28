import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import ActivityList, { type ActivityListHandle } from './ActivityList';
import { ActivityListSelectorsIDs } from './ActivityList.testIds';
import { getPreloadedActivityItem } from './preloadedActivityItemStore';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ActivityTypeFilter } from '../ActivityScreen/types';
import { useTransactionsQuery } from './useTransactionsQuery';
import { useLocalActivityItems } from './hooks/useLocalActivityItems';
import { useRampActivityItems } from './hooks/useRampActivityItems';
import { useUnifiedTxActions } from './useUnifiedTxActions';
import Engine from '../../../core/Engine';
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';
import Routes from '../../../constants/navigation/Routes';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../constants/on-ramp';
import decodeTransaction from '../../UI/TransactionElement/utils';
import { handleUnifiedSwapsTxHistoryItemClick } from '../../UI/Bridge/utils/transaction-history';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn((state) => state.selectedAccount),
}));

jest.mock('../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn((state) => state.currentCurrency),
  selectConversionRateByChainId: jest.fn(),
  selectCurrencyRates: jest.fn(),
}));

jest.mock('../../../selectors/multichain/multichain', () => ({
  selectNonEvmTransactionsForSelectedAccountGroup: jest.fn(
    (state) => state.nonEvmState,
  ),
}));

jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: jest.fn(
      (state) => state.selectedGroupAccounts,
    ),
  }),
);

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn((state) => state.evmConfigs),
  selectProviderType: jest.fn((state) => state.providerType),
  selectAllConfiguredEvmChainIds: jest.fn((state) => state.enabledEvm),
  selectTickerByChainId: jest.fn(),
}));

jest.mock('../../../selectors/multichainNetworkController', () => ({
  selectAllConfiguredNonEvmChainIds: jest.fn((state) => state.enabledNonEvm),
}));

jest.mock('../../../selectors/transactionController', () => ({
  selectRelatedChainIdsByTransactionId: jest.fn((state) => state.related),
  selectSwapsTransactions: jest.fn(),
}));

jest.mock('../../../selectors/tokenRatesController', () => ({
  selectContractExchangeRatesByChainId: jest.fn(),
}));

jest.mock('../../../selectors/settings', () => ({
  selectPrimaryCurrency: jest.fn(),
}));

jest.mock('../../../selectors/tokensController', () => ({
  selectTokensByChainIdAndWalletAddress: jest.fn(),
}));

jest.mock('../../../store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

jest.mock('../../UI/TransactionElement/utils', () => ({
  __esModule: true,
  default: jest.fn(async () => [
    { actionKey: 'Sent ETH' },
    { hash: '0xconfirmed', renderFrom: '0xfrom', renderTo: '0xto' },
  ]),
}));

jest.mock('../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn((state) => state.bridgeHistory),
}));

jest.mock('../../../selectors/featureFlagController/activityRedesign', () => ({
  selectIsTransactionsRedesignEnabled: jest.fn((state) => state.isTxRedesign),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.createAnimatedComponent = (
    Component: React.ComponentType,
  ) => Component;
  return Reanimated;
});

const mockScrollToOffset = jest.fn();

jest.mock('@shopify/flash-list', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    FlashList: ReactActual.forwardRef(
      (
        {
          data,
          keyExtractor,
          ListEmptyComponent,
          ListFooterComponent,
          ListHeaderComponent,
          onScroll,
          onViewableItemsChanged,
          refreshControl,
          renderItem,
          testID,
        }: {
          data: unknown[];
          keyExtractor: (item: unknown, index: number) => string;
          ListEmptyComponent?: React.ReactElement | (() => React.ReactElement);
          ListFooterComponent?: React.ReactElement | null;
          ListHeaderComponent?: React.ReactElement;
          onScroll?: (event: object) => void;
          onViewableItemsChanged?: (args: object) => void;
          refreshControl?: React.ReactElement;
          renderItem: (args: {
            item: unknown;
            index: number;
          }) => React.ReactNode;
          testID?: string;
        },
        ref: React.Ref<{ scrollToOffset: jest.Mock }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          scrollToOffset: mockScrollToOffset,
        }));
        const empty =
          typeof ListEmptyComponent === 'function' ? (
            <ListEmptyComponent />
          ) : (
            ListEmptyComponent
          );
        return (
          <View testID={testID}>
            {ListHeaderComponent}
            {data.length
              ? data.map((item, index) => (
                  <View
                    key={keyExtractor(item, index)}
                    testID={`mock-key-${keyExtractor(item, index)}`}
                  >
                    {renderItem({ item, index })}
                  </View>
                ))
              : empty}
            {ListFooterComponent}
            <TouchableOpacity
              testID="mock-refresh"
              onPress={() =>
                (
                  refreshControl as
                    | React.ReactElement<{ onRefresh: () => void }>
                    | undefined
                )?.props.onRefresh()
              }
            />
            <TouchableOpacity
              testID="mock-scroll"
              onPress={() =>
                onScroll?.({ nativeEvent: { contentOffset: { y: 12 } } })
              }
            />
            <TouchableOpacity
              testID="mock-viewable"
              onPress={() =>
                onViewableItemsChanged?.({ viewableItems: [{ index: 0 }] })
              }
            >
              <Text>viewable</Text>
            </TouchableOpacity>
          </View>
        );
      },
    ),
  };
});

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: 'white' },
      icon: { default: 'black' },
      primary: { default: 'blue' },
    },
  }),
}));

jest.mock('../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      emptyList: {},
    },
  }),
}));

jest.mock('../ActivityScreen/components/ActivityEmptyState', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ typeFilter }: { typeFilter?: string }) =>
      ReactActual.createElement(
        Text,
        { testID: 'activity-empty-state' },
        `empty:${typeFilter}`,
      ),
  };
});

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    createEventBuilder: jest.fn(),
    trackEvent: jest.fn(),
  }),
}));

jest.mock('../../../util/analytics/externalLinkTracking', () => ({
  trackBlockExplorerLinkClicked: jest.fn(),
}));

jest.mock('../../UI/AssetOverview/PriceChart/PriceChart.context', () => {
  const ReactActual = jest.requireActual('react');
  const PriceChartContext = {
    Consumer: ({
      children,
    }: {
      children: (value: object) => React.ReactNode;
    }) => children({ isChartBeingTouched: false }),
  };
  return {
    __esModule: true,
    default: PriceChartContext,
    PriceChartProvider: ({ children }: { children?: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

jest.mock('./useTransactionsQuery', () => ({
  useTransactionsQuery: jest.fn(),
}));

jest.mock('./hooks/useLocalActivityItems', () => ({
  useLocalActivityItems: jest.fn(),
}));

jest.mock('./hooks/useRampActivityItems', () => ({
  useRampActivityItems: jest.fn(),
}));

const mockGoToBuy = jest.fn();
jest.mock('../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(() => ({ goToBuy: mockGoToBuy })),
}));

jest.mock('../../UI/Ramp/Aggregator/Views/OrderDetails/OrderDetails', () => {
  const RoutesActual = jest.requireActual(
    '../../../constants/navigation/Routes',
  );
  return {
    createOrderDetailsNavDetails: (params: { orderId: string }) => [
      RoutesActual.default.RAMP.ORDER_DETAILS,
      params,
    ],
  };
});

jest.mock('../../UI/Ramp/Views/OrderDetails', () => {
  const RoutesActual = jest.requireActual(
    '../../../constants/navigation/Routes',
  );
  return {
    createRampsOrderDetailsNavDetails: (params: { orderId: string }) => [
      RoutesActual.default.RAMP.RAMPS_ORDER_DETAILS,
      params,
    ],
  };
});

jest.mock(
  '../../UI/Ramp/Views/OrderDetails/DepositOrderDetails/DepositOrderDetails',
  () => {
    const RoutesActual = jest.requireActual(
      '../../../constants/navigation/Routes',
    );
    return {
      createDepositOrderDetailsNavDetails: (params: { orderId: string }) => [
        RoutesActual.default.DEPOSIT.ORDER_DETAILS,
        params,
      ],
    };
  },
);

jest.mock('./useUnifiedTxActions', () => ({
  useUnifiedTxActions: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TransactionController: {
      updateIncomingTransactions: jest.fn(() => Promise.resolve()),
    },
  },
}));

const updateIncomingTransactions = (
  Engine.context.TransactionController as unknown as {
    updateIncomingTransactions: jest.Mock;
  }
).updateIncomingTransactions;

jest.mock('../../UI/ActivityListItemRow/ActivityListItemRow', () => ({
  ActivityListItemRow: ({
    item,
    onPress,
    title,
  }: {
    item: {
      type?: string;
      hash?: string;
      status?: string;
      raw?: { type: string; data: { primaryTransaction: { id: string } } };
    };
    onPress: (item: unknown) => void;
    title?: string;
  }) => {
    const { Text, TouchableOpacity } = jest.requireActual('react-native');
    const hash = item.hash ?? 'no-hash';
    return (
      <TouchableOpacity testID={`row-${hash}`} onPress={() => onPress(item)}>
        <Text testID={`row-kind-${hash}`}>{item.type}</Text>
        <Text testID={`row-status-${hash}`}>{item.status}</Text>
        <Text testID={`row-raw-${hash}`}>{item.raw?.type}</Text>
        <Text>{title ?? item.hash}</Text>
      </TouchableOpacity>
    );
  },
  resolveActivityListItemTitle: jest.fn(() => 'Activity title'),
}));

jest.mock('../../UI/Transactions/TransactionsFooter', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onViewBlockExplorer }: { onViewBlockExplorer: () => void }) => (
      <TouchableOpacity testID="evm-footer" onPress={onViewBlockExplorer}>
        <Text>EVM footer</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../MultichainTransactionsView/MultichainTransactionsFooter', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onViewMore }: { onViewMore: () => void }) => (
      <TouchableOpacity testID="non-evm-footer" onPress={onViewMore}>
        <Text>Non-EVM footer</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../confirmations/components/modals/cancel-speedup-modal', () => {
  const { View } = jest.requireActual('react-native');
  return {
    CancelSpeedupModal: ({ isVisible }: { isVisible: boolean }) =>
      isVisible ? <View testID="cancel-speedup-modal" /> : null,
  };
});

jest.mock('../../hooks/useBlockExplorer', () => ({
  __esModule: true,
  default: () => ({
    getBlockExplorerName: jest.fn(() => 'Explorer'),
    getBlockExplorerUrl: jest.fn(() => 'https://explorer.test/address/0xevm'),
  }),
}));

jest.mock('../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash', () => ({
  ...jest.requireActual(
    '../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash',
  ),
  useBridgeHistoryItemBySrcTxHash: jest.fn(() => ({
    bridgeHistoryItemsBySrcTxHash: {
      '0xconfirmed': {
        title: 'bridge-history',
        quote: {
          srcChainId: '0x1',
          destChainId: '0x1',
          srcAsset: { chainId: '0x1' },
          destAsset: { chainId: '0x1' },
        },
      },
      // Same-chain swap (src and dest chains match → not a cross-chain bridge).
      solanaBridge: {
        title: 'solana-bridge',
        quote: {
          srcChainId: 'solana:mainnet',
          destChainId: 'solana:mainnet',
          srcAsset: { chainId: 'solana:mainnet' },
          destAsset: { chainId: 'solana:mainnet' },
        },
      },
      // Cross-chain bridge whose destination leg hasn't landed yet.
      solanaCross: {
        title: 'solana-cross-bridge',
        quote: {
          srcChainId: 'solana:mainnet',
          destChainId: 1,
          srcAsset: { chainId: 'solana:mainnet' },
          destAsset: { chainId: 1 },
        },
        status: { status: 'PENDING', srcChain: { txHash: 'solanaCross' } },
      },
      // Cross-chain bridge whose destination leg has landed.
      solanaCrossDone: {
        title: 'solana-cross-bridge-done',
        quote: {
          srcChainId: 'solana:mainnet',
          destChainId: 1,
          srcAsset: { chainId: 'solana:mainnet' },
          destAsset: { chainId: 1 },
        },
        status: {
          status: 'COMPLETE',
          srcChain: { txHash: 'solanaCrossDone' },
          destChain: { txHash: '0xdest' },
        },
      },
    },
  })),
}));

jest.mock('../../UI/Bridge/utils/transaction-history', () => ({
  getSwapBridgeTxActivityTitle: jest.fn(() => 'Bridge title'),
  handleUnifiedSwapsTxHistoryItemClick: jest.fn(),
  // Mirrors the real predicate: cross-chain when quote src/dest chains differ.
  isBridgeTxHistoryItemBridge: jest.fn(
    (item: { quote: { srcChainId?: unknown; destChainId?: unknown } }) =>
      item.quote.srcChainId !== item.quote.destChainId,
  ),
}));

jest.mock('../../../util/multichain/multichainTransactionTokenScan', () => ({
  filterMultichainTransactionsExcludingMaliciousTokenActivity: jest.fn(
    (txs) => txs,
  ),
}));

jest.mock(
  '../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys',
  () => ({
    useMultichainActivityMaliciousTokenKeys: jest.fn(() => ({
      maliciousTokenKeys: new Set(),
    })),
  }),
);

jest.mock('../../../core/Multichain/utils', () => ({
  getAddressUrl: jest.fn(() => 'https://solana.explorer/address/sol'),
}));

jest.mock('../../../util/networks', () => ({
  getBlockExplorerAddressUrl: jest.fn(() => ({
    title: 'Configured Explorer',
    url: 'https://configured.explorer/address/0xevm',
  })),
  getBlockExplorerName: jest.fn(() => 'Configured'),
}));

jest.mock('./helpers/adapters', () => ({
  normalizeTransaction: jest.fn(() => ({
    chainId: '0x1',
    id: 'normalized',
    txParams: { from: '0xevm', to: '0xto' },
  })),
}));

jest.mock('./helpers/transformations', () => {
  const actual = jest.requireActual('./helpers/transformations');
  return {
    ...actual,
    mergeTransactionsByTime: jest.fn(
      (local, confirmed, nonEvm, perps = [], predict = [], ramp = []) => [
        ...perps,
        ...predict,
        ...ramp,
        ...local,
        ...confirmed,
        ...nonEvm,
      ],
    ),
  };
});

jest.mock('../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(
    (state: { perpsEnabled: boolean }) => state.perpsEnabled,
  ),
}));

jest.mock('../../UI/Predict', () => ({
  selectPredictEnabledFlag: jest.fn(
    (state: { predictEnabled: boolean }) => state.predictEnabled,
  ),
}));

let mockPerpsSourceState: {
  items: unknown[];
  isLoading: boolean;
  error: string | null;
  refetch?: () => Promise<void>;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
  isFetchingMore?: boolean;
} = { items: [], isLoading: false, error: null };

jest.mock('./hooks/PerpsActivitySource', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    INITIAL_PERPS_ACTIVITY_SOURCE_STATE: {
      items: [],
      isLoading: false,
      error: null,
    },
    PerpsActivitySource: ({
      onChange,
    }: {
      onChange: (state: unknown) => void;
    }) => {
      ReactActual.useEffect(() => {
        onChange(mockPerpsSourceState);
      }, [onChange]);
      return ReactActual.createElement(View, {
        testID: 'perps-source-mounted',
      });
    },
  };
});

let mockPredictSourceState: {
  items: unknown[];
  isLoading: boolean;
  error: string | null;
  refetch?: () => Promise<void>;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
  isFetchingMore?: boolean;
} = { items: [], isLoading: false, error: null };

jest.mock('./hooks/PredictActivitySource', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    INITIAL_PREDICT_ACTIVITY_SOURCE_STATE: {
      items: [],
      isLoading: false,
      error: null,
    },
    PredictActivitySource: ({
      onChange,
    }: {
      onChange: (state: unknown) => void;
    }) => {
      ReactActual.useEffect(() => {
        onChange(mockPredictSourceState);
      }, [onChange]);
      return ReactActual.createElement(View, {
        testID: 'predict-source-mounted',
      });
    },
  };
});

const mockNavigate = jest.fn();
const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn(() => Promise.resolve());

const selectorValues = {
  bridgeHistory: {
    solanaBridge: { status: { srcChain: { txHash: 'solanaBridge' } } },
  } as Record<string, unknown>,
  currentCurrency: 'usd',
  enabledEvm: ['0x1'],
  enabledNonEvm: [] as string[],
  evmConfigs: {
    '0x1': {
      blockExplorerUrls: ['https://configured.explorer'],
      defaultBlockExplorerUrlIndex: 0,
    },
  },
  nonEvmState: { transactions: [] as unknown[] },
  perpsEnabled: false,
  predictEnabled: false,
  providerType: 'mainnet',
  related: new Map(),
  selectedAccount: { address: '0xselected' },
  selectedGroupAccounts: [{ address: '0xevm', type: 'eip155:eoa' }],
  isTxRedesign: false,
};

const confirmedItem = {
  type: 'send',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 3,
  hash: '0xconfirmed',
  data: {
    from: '0xevm',
    to: '0xto',
    token: { symbol: 'ETH' },
  },
  raw: {
    type: 'apiEvmTransaction',
    data: { chainId: 1, from: '0xevm', hash: '0xconfirmed', nonce: 7 },
  },
};

const localPendingItem = {
  type: 'send',
  chainId: 'eip155:1',
  status: 'pending',
  timestamp: 4,
  hash: '0xlocal',
  data: {},
  raw: {
    type: 'localTransaction',
    data: {
      primaryTransaction: {
        chainId: '0x1',
        hash: '0xlocal',
        id: 'local-id',
        txParams: { from: '0xevm', nonce: '0x8' },
      },
    },
  },
};

const rampItem = {
  type: 'buy',
  chainId: 'eip155:59144',
  status: 'success',
  timestamp: 5,
  hash: '0xramp',
  data: {
    from: '0xevm',
    token: { amount: '5.01', symbol: 'mUSD', direction: 'in' },
  },
  raw: {
    type: 'rampOrder',
    data: {
      id: 'ramp-order-id',
      provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    },
  },
};

describe('ActivityList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectorValues.enabledEvm = ['0x1'];
    selectorValues.enabledNonEvm = [];
    selectorValues.nonEvmState = { transactions: [] };
    selectorValues.perpsEnabled = false;
    selectorValues.predictEnabled = false;
    mockPerpsSourceState = { items: [], isLoading: false, error: null };
    mockPredictSourceState = { items: [], isLoading: false, error: null };
    selectorValues.selectedGroupAccounts = [
      { address: '0xevm', type: 'eip155:eoa' },
    ];
    selectorValues.isTxRedesign = false;
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [confirmedItem] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });
    (useLocalActivityItems as jest.Mock).mockReturnValue([localPendingItem]);
    (useRampActivityItems as jest.Mock).mockReturnValue([]);
    (useUnifiedTxActions as jest.Mock).mockReturnValue({
      cancelIsOpen: false,
      cancelTransaction: jest.fn(),
      cancelUnsignedQRTransaction: jest.fn(),
      confirmDisabled: false,
      existingTx: null,
      onCancelAction: jest.fn(),
      onSpeedUpAction: jest.fn(),
      onSpeedUpCancelCompleted: jest.fn(),
      signLedgerTransaction: jest.fn(),
      signQRTransaction: jest.fn(),
      speedUpIsOpen: false,
      speedUpTransaction: jest.fn(),
    });
    (useSelector as unknown as jest.Mock).mockImplementation((selector) =>
      selector(selectorValues),
    );
  });

  it('renders local pending and confirmed rows, refreshes, paginates, and opens the EVM explorer', async () => {
    render(<ActivityList header={<></>} />);

    expect(
      screen.getByTestId(ActivityListSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    // Pending local EVM rows now render through ActivityListItemRow, not the
    // legacy TransactionElement.
    expect(screen.getByTestId('row-0xlocal')).toBeOnTheScreen();
    expect(screen.getByTestId('row-0xconfirmed')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('mock-refresh'));
    await waitFor(() => expect(updateIncomingTransactions).toHaveBeenCalled());
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    // Scrolling should not throw (drives the UI-thread scroll handler).
    fireEvent.press(screen.getByTestId('mock-scroll'));

    fireEvent.press(screen.getByTestId('mock-viewable'));
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('evm-footer'));
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      params: {
        title: 'Configured Explorer',
        url: 'https://configured.explorer/address/0xevm',
      },
      screen: 'SimpleWebview',
    });
    expect(jest.mocked(trackBlockExplorerLinkClicked)).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        location: 'activity_tab',
        url: 'https://configured.explorer/address/0xevm',
      }),
    );
  });

  it('keeps the typed local staking row over the generic confirmed copy', () => {
    const stakingHash = '0xstake';
    const localStakingDeposit = {
      type: 'deposit',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 5,
      hash: stakingHash,
      data: { token: { symbol: 'ETH' } },
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: {
            chainId: '0x1',
            hash: stakingHash,
            id: 'stake-id',
            txParams: { from: '0xevm', nonce: '0x9' },
          },
        },
      },
    };
    // Backend categorises the pooled-staking call as a generic contract call.
    const confirmedStakingContractCall = {
      type: 'contractInteraction',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 5,
      hash: stakingHash,
      data: { from: '0xevm', to: '0xpool' },
      raw: {
        type: 'apiEvmTransaction',
        data: { chainId: 1, from: '0xevm', hash: stakingHash, nonce: 9 },
      },
    };
    (useLocalActivityItems as jest.Mock).mockReturnValue([localStakingDeposit]);
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [confirmedStakingContractCall] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });

    render(<ActivityList header={<></>} />);

    // One row for the hash, and it's the typed staking deposit — the generic
    // confirmed "contractInteraction" copy is deduped away (not the reverse).
    expect(screen.getAllByTestId(`row-${stakingHash}`)).toHaveLength(1);
    expect(screen.getByTestId(`row-kind-${stakingHash}`)).toHaveTextContent(
      'deposit',
    );
  });

  // TMCU-1066: a perps deposit/withdrawal is a real Arbitrum USDC tx, so it also
  // lands in the generic EVM stream. The perps source already surfaces it, so
  // the generic copy is dropped to stop it double-rendering across filters.
  const makePerpsLocalTx = (
    txType: TransactionType,
    options: {
      nestedTxTypes?: TransactionType[];
      originalType?: TransactionType;
      initialTransactionType?: TransactionType;
    } = {},
  ) => ({
    type: 'contractInteraction' as const,
    chainId: 'eip155:1',
    status: 'pending' as const,
    timestamp: 9,
    hash: '0xperpsdep',
    data: { from: '0xevm', to: '0xusdc' },
    raw: {
      type: 'localTransaction',
      data: {
        primaryTransaction: {
          chainId: '0x1',
          hash: '0xperpsdep',
          id: 'perps-dep-id',
          type: txType,
          ...(options.originalType
            ? { originalType: options.originalType }
            : {}),
          ...(options.nestedTxTypes
            ? {
                nestedTransactions: options.nestedTxTypes.map((type) => ({
                  type,
                })),
              }
            : {}),
          txParams: { from: '0xevm', nonce: '0x1' },
        },
        ...(options.initialTransactionType
          ? {
              initialTransaction: {
                chainId: '0x1',
                hash: '0xperpsdep-initial',
                id: 'perps-dep-id-initial',
                type: options.initialTransactionType,
                txParams: { from: '0xevm', nonce: '0x1' },
              },
            }
          : {}),
      },
    },
  });

  it.each([
    ['perpsDeposit', TransactionType.perpsDeposit],
    ['perpsDepositAndOrder', TransactionType.perpsDepositAndOrder],
    ['perpsWithdraw', TransactionType.perpsWithdraw],
  ])(
    'suppresses the generic EVM copy of a %s tx when perps is enabled',
    (_label, txType) => {
      selectorValues.perpsEnabled = true;
      (useLocalActivityItems as jest.Mock).mockReturnValue([
        makePerpsLocalTx(txType),
      ]);
      (useTransactionsQuery as jest.Mock).mockReturnValue({
        data: { pages: [{ data: [] }] },
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
        isFetchingNextPage: false,
        isInitialLoading: false,
        refetch: mockRefetch,
      });

      render(<ActivityList header={<></>} />);

      expect(screen.queryByTestId('row-0xperpsdep')).toBeNull();
    },
  );

  it('suppresses the generic EVM copy of a batch-wrapped perps withdraw when perps is enabled', () => {
    selectorValues.perpsEnabled = true;
    (useLocalActivityItems as jest.Mock).mockReturnValue([
      makePerpsLocalTx(TransactionType.batch, {
        nestedTxTypes: [TransactionType.perpsWithdraw],
      }),
    ]);
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });

    render(<ActivityList header={<></>} />);

    expect(screen.queryByTestId('row-0xperpsdep')).toBeNull();
  });

  // After a speed-up/cancel the group's primaryTransaction is the replacement
  // meta ('retry'/'cancel'); the perps type survives only on originalType and
  // on the group's initialTransaction.
  it.each([
    ['sped-up (retry)', TransactionType.retry],
    ['cancelled', TransactionType.cancel],
  ])(
    'suppresses the generic EVM copy of a %s perps deposit when perps is enabled',
    (_label, replacementType) => {
      selectorValues.perpsEnabled = true;
      (useLocalActivityItems as jest.Mock).mockReturnValue([
        makePerpsLocalTx(replacementType, {
          originalType: TransactionType.perpsDeposit,
          initialTransactionType: TransactionType.perpsDeposit,
        }),
      ]);
      (useTransactionsQuery as jest.Mock).mockReturnValue({
        data: { pages: [{ data: [] }] },
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
        isFetchingNextPage: false,
        isInitialLoading: false,
        refetch: mockRefetch,
      });

      render(<ActivityList header={<></>} />);

      expect(screen.queryByTestId('row-0xperpsdep')).toBeNull();
    },
  );

  it('keeps the generic EVM copy of a perps deposit when perps is disabled', () => {
    selectorValues.perpsEnabled = false;
    (useLocalActivityItems as jest.Mock).mockReturnValue([
      makePerpsLocalTx(TransactionType.perpsDeposit),
    ]);
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });

    render(<ActivityList header={<></>} />);

    // Perps off → the perps source emits nothing, so the generic copy is the
    // only representation and must remain.
    expect(screen.getByTestId('row-0xperpsdep')).toBeOnTheScreen();
  });

  it('keeps the typed local smart-account-upgrade row over the generic confirmed copy', () => {
    const upgradeHash = '0xupgrade';
    const localUpgrade = {
      type: 'smartAccountUpgrade',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 6,
      hash: upgradeHash,
      data: { from: '0xevm', to: '0xevm' },
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: {
            chainId: '0x1',
            hash: upgradeHash,
            id: 'upgrade-id',
            txParams: { from: '0xevm', nonce: '0xa' },
          },
        },
      },
    };
    // Backend can't recognise a 7702 upgrade — the confirmed copy is a generic
    // contract call with the same hash.
    const confirmedUpgradeContractCall = {
      type: 'contractInteraction',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 6,
      hash: upgradeHash,
      data: { from: '0xevm', to: '0xevm' },
      raw: {
        type: 'apiEvmTransaction',
        data: { chainId: 1, from: '0xevm', hash: upgradeHash, nonce: 10 },
      },
    };
    (useLocalActivityItems as jest.Mock).mockReturnValue([localUpgrade]);
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [confirmedUpgradeContractCall] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });

    render(<ActivityList header={<></>} />);

    // The typed "smartAccountUpgrade" row wins; the generic confirmed copy is
    // deduped away (it must not regress to "Smart contract interaction").
    expect(screen.getAllByTestId(`row-${upgradeHash}`)).toHaveLength(1);
    expect(screen.getByTestId(`row-kind-${upgradeHash}`)).toHaveTextContent(
      'smartAccountUpgrade',
    );
  });

  it('keeps the quote-enriched local swap row over a bare confirmed contractInteraction copy', () => {
    const swapHash = '0xswap';
    const localSwap = {
      type: 'swap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 7,
      hash: swapHash,
      data: {
        sourceToken: { direction: 'out', symbol: 'POL', decimals: 18 },
        destinationToken: { direction: 'in', symbol: 'USDT', decimals: 6 },
      },
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: {
            chainId: '0x1',
            hash: swapHash,
            id: 'swap-id',
            txParams: { from: '0xevm', nonce: '0xb' },
          },
        },
      },
    };
    // Indexer hasn't classified the swap yet — the confirmed copy is a bare
    // contract call with the same hash.
    const confirmedSwapContractCall = {
      type: 'contractInteraction',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 7,
      hash: swapHash,
      data: { from: '0xevm', to: '0xrouter' },
      raw: {
        type: 'apiEvmTransaction',
        data: { chainId: 1, from: '0xevm', hash: swapHash, nonce: 11 },
      },
    };
    (useLocalActivityItems as jest.Mock).mockReturnValue([localSwap]);
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [confirmedSwapContractCall] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });

    render(<ActivityList header={<></>} />);

    // One row, and it's the typed swap (with both tokens) — the bare confirmed
    // "contractInteraction" copy is deduped away, not the reverse.
    expect(screen.getAllByTestId(`row-${swapHash}`)).toHaveLength(1);
    expect(screen.getByTestId(`row-kind-${swapHash}`)).toHaveTextContent(
      'swap',
    );
  });

  it('keeps the local approve row with the cap amount over the amount-less confirmed copy', () => {
    const approveHash = '0xapprovecap';
    const localApprove = {
      type: 'approveSpendingCap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 7,
      hash: approveHash,
      data: {
        token: {
          direction: 'out',
          amount: '100000',
          decimals: 6,
          symbol: 'USDC',
        },
      },
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: {
            chainId: '0x1',
            hash: approveHash,
            id: 'approve-id',
            txParams: { from: '0xevm', nonce: '0xb' },
          },
        },
      },
    };
    // The accounts API returns no calldata for an approve, so the confirmed
    // copy carries no cap amount.
    const confirmedApproveNoAmount = {
      type: 'approveSpendingCap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 7,
      hash: approveHash,
      data: {},
      raw: {
        type: 'apiEvmTransaction',
        data: { chainId: 1, from: '0xevm', hash: approveHash, nonce: 11 },
      },
    };
    (useLocalActivityItems as jest.Mock).mockReturnValue([localApprove]);
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [confirmedApproveNoAmount] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });

    render(<ActivityList header={<></>} />);

    // One row, and it's the local copy (which carries the cap amount) — the
    // amount-less confirmed copy is deduped away, not the reverse.
    expect(screen.getAllByTestId(`row-${approveHash}`)).toHaveLength(1);
    expect(screen.getByTestId(`row-raw-${approveHash}`)).toHaveTextContent(
      'localTransaction',
    );
  });

  it('navigates to transaction details when a confirmed row is pressed', async () => {
    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xconfirmed'));

    // The press handler decodes the tx (async) before navigating.
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          screen: expect.any(String),
        }),
      ),
    );
  });

  it('navigates to the redesigned ActivityDetails screen when the transactions redesign flag is on', () => {
    selectorValues.isTxRedesign = true;
    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xconfirmed'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.ACTIVITY_DETAILS, {
      chainId: 'eip155:1',
      txIdentifier: '0xconfirmed',
    });
    // Must not also open the legacy sheet.
    const legacyCalls = mockNavigate.mock.calls.filter(
      (call) => call[1]?.screen === Routes.SHEET.TRANSACTION_DETAILS,
    );
    expect(legacyCalls).toHaveLength(0);
  });

  it('routes Ramp sell rows to legacy OrderDetails even when the redesign flag is on', () => {
    selectorValues.isTxRedesign = true;
    (useRampActivityItems as jest.Mock).mockReturnValue([
      {
        ...rampItem,
        type: 'sell',
        hash: '0xramp-sell',
        raw: {
          ...rampItem.raw,
          data: {
            ...rampItem.raw.data,
            id: 'ramp-sell-order-id',
            orderType: 'SELL',
          },
        },
      },
    ]);

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xramp-sell'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.ORDER_DETAILS, {
      orderId: 'ramp-sell-order-id',
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.anything(),
    );
  });

  it('routes Ramp rows to the redesigned ActivityDetails screen when the transactions redesign flag is on', () => {
    selectorValues.isTxRedesign = true;
    (useRampActivityItems as jest.Mock).mockReturnValue([rampItem]);

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xramp'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.ACTIVITY_DETAILS, {
      chainId: 'eip155:59144',
      txIdentifier: '0xramp',
    });
  });

  it('routes Ramp rows to the legacy Ramp details screen when the transactions redesign flag is off', () => {
    selectorValues.isTxRedesign = false;
    (useRampActivityItems as jest.Mock).mockReturnValue([rampItem]);

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xramp'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.ORDER_DETAILS, {
      orderId: 'ramp-order-id',
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.anything(),
    );
  });

  it('routes RAMPS_V2 rows to the V2 Ramp details screen when the transactions redesign flag is off', () => {
    selectorValues.isTxRedesign = false;
    (useRampActivityItems as jest.Mock).mockReturnValue([
      {
        ...rampItem,
        hash: '0xramps-v2',
        raw: {
          ...rampItem.raw,
          data: {
            ...rampItem.raw.data,
            id: 'ramps-v2-order-id',
            provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
          },
        },
      },
    ]);

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xramps-v2'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.RAMPS_ORDER_DETAILS, {
      orderId: 'ramps-v2-order-id',
    });
  });

  it('routes deposit CREATED rows to goToBuy when the redesign flag is off', () => {
    selectorValues.isTxRedesign = false;
    (useRampActivityItems as jest.Mock).mockReturnValue([
      {
        ...rampItem,
        hash: '0xdeposit-created',
        raw: {
          ...rampItem.raw,
          data: {
            ...rampItem.raw.data,
            id: 'deposit-created-id',
            provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
            state: FIAT_ORDER_STATES.CREATED,
          },
        },
      },
    ]);

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xdeposit-created'));

    expect(mockGoToBuy).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('routes deposit rows to the deposit details screen when the transactions redesign flag is off', () => {
    selectorValues.isTxRedesign = false;
    (useRampActivityItems as jest.Mock).mockReturnValue([
      {
        ...rampItem,
        hash: '0xdeposit',
        raw: {
          ...rampItem.raw,
          data: {
            ...rampItem.raw.data,
            id: 'deposit-order-id',
            provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
            state: FIAT_ORDER_STATES.COMPLETED,
          },
        },
      },
    ]);

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xdeposit'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ORDER_DETAILS, {
      orderId: 'deposit-order-id',
    });
  });

  it('uses bridge history keyed by actionId for local bridge transaction taps', () => {
    const bridgeHistoryItem = { id: 'bridge-history-item' };
    selectorValues.bridgeHistory = {
      bridgeAction: bridgeHistoryItem,
    };
    (useLocalActivityItems as jest.Mock).mockReturnValue([
      {
        ...localPendingItem,
        type: 'bridge',
        hash: '0xbridge',
        raw: {
          type: 'localTransaction',
          data: {
            primaryTransaction: {
              chainId: '0x1',
              hash: '0xbridge',
              id: 'bridge-tx-id',
              // Older persisted bridge history can be keyed only by actionId.
              actionId: 'bridgeAction',
              type: 'bridge',
              txParams: { from: '0xevm', nonce: '0x8' },
            },
          },
        },
      },
    ]);

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xbridge'));

    expect(handleUnifiedSwapsTxHistoryItemClick).toHaveBeenCalledWith(
      expect.objectContaining({
        bridgeTxHistoryItem: bridgeHistoryItem,
        evmTxMeta: expect.objectContaining({
          id: 'bridge-tx-id',
          actionId: 'bridgeAction',
        }),
      }),
    );
  });

  it('opens only the most-recently-pressed row when decodes resolve out of order', async () => {
    const decodeMock = jest.mocked(decodeTransaction);
    type DecodeResult = Awaited<ReturnType<typeof decodeTransaction>>;
    let resolveFirst: (value: DecodeResult) => void = () => undefined;
    let resolveSecond: (value: DecodeResult) => void = () => undefined;
    decodeMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xconfirmed'));
    fireEvent.press(screen.getByTestId('row-0xlocal'));

    resolveSecond([{ actionKey: 'Approve' }, { hash: '0xlocal' }]);
    resolveFirst([{ actionKey: 'Sent' }, { hash: '0xconfirmed' }]);

    await waitFor(() => {
      const detailCalls = mockNavigate.mock.calls.filter(
        (call) => call[1]?.screen === Routes.SHEET.TRANSACTION_DETAILS,
      );
      expect(detailCalls).toHaveLength(1);
    });

    const detailCalls = mockNavigate.mock.calls.filter(
      (call) => call[1]?.screen === Routes.SHEET.TRANSACTION_DETAILS,
    );
    expect(detailCalls[0][1].params.tx.hash).toBe('0xlocal');
  });

  it('falls back to a minimal details view when decoding throws', async () => {
    jest
      .mocked(decodeTransaction)
      .mockRejectedValueOnce(new Error('decode failed'));

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-0xconfirmed'));

    await waitFor(() => {
      const detailCalls = mockNavigate.mock.calls.filter(
        (call) => call[1]?.screen === Routes.SHEET.TRANSACTION_DETAILS,
      );
      expect(detailCalls).toHaveLength(1);
    });

    const call = mockNavigate.mock.calls.find(
      (c) => c[1]?.screen === Routes.SHEET.TRANSACTION_DETAILS,
    );
    // Minimal transactionDetails are built from the item (addresses via
    // getActivityFromTo) rather than the decoded data.
    expect(call?.[1].params.transactionDetails).toEqual(
      expect.objectContaining({
        hash: '0xconfirmed',
        renderFrom: '0xevm',
        renderTo: '0xto',
        transactionType: 'send',
      }),
    );
    expect(call?.[1].params.transactionElement).toEqual(
      expect.objectContaining({ actionKey: expect.any(String) }),
    );
  });

  it('uses unique chain-aware fallback keys for rows without hashes', () => {
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: {
        pages: [
          {
            data: [
              {
                ...confirmedItem,
                chainId: 'eip155:1',
                hash: undefined,
                raw: undefined,
                timestamp: 123,
              },
              {
                ...confirmedItem,
                chainId: 'eip155:137',
                hash: undefined,
                raw: undefined,
                timestamp: 123,
              },
            ],
          },
        ],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });
    (useLocalActivityItems as jest.Mock).mockReturnValue([]);
    selectorValues.enabledEvm = ['0x1', '0x89'];

    render(<ActivityList header={<></>} />);

    expect(
      screen.getByTestId('mock-key-eip155:1-send-123-1'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('mock-key-eip155:137-send-123-2'),
    ).toBeOnTheScreen();
  });

  it('exposes a scrollToTop handle that scrolls the list to the top', () => {
    const ref = React.createRef<ActivityListHandle>();
    render(<ActivityList ref={ref} header={<></>} />);

    ref.current?.scrollToTop();

    expect(mockScrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: true,
    });
  });

  it('scrolls to top when the type filter changes (but not on initial render)', () => {
    const { rerender } = render(
      <ActivityList
        header={<></>}
        typeFilter={ActivityTypeFilter.Transactions}
      />,
    );

    // No scroll on initial mount.
    expect(mockScrollToOffset).not.toHaveBeenCalled();

    rerender(
      <ActivityList header={<></>} typeFilter={ActivityTypeFilter.Perps} />,
    );

    // Non-animated so the new filter presents at the top instead of visibly
    // scrolling up from FlashList's retained offset.
    expect(mockScrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: false,
    });
  });

  it('resets scrollY to 0 when the type filter changes so the pinned filter bar unpins', () => {
    // The programmatic scroll-to-offset above doesn't emit `onScroll`, so
    // without this reset `scrollY` keeps its pre-switch value and the parent
    // keeps a duplicate (pinned) filter bar rendered over the reset header.
    const scrollY = { value: 500 };

    const { rerender } = render(
      <ActivityList
        header={<></>}
        typeFilter={ActivityTypeFilter.Transactions}
        scrollY={scrollY as unknown as SharedValue<number>}
      />,
    );

    // Untouched on initial render.
    expect(scrollY.value).toBe(500);

    rerender(
      <ActivityList
        header={<></>}
        typeFilter={ActivityTypeFilter.Perps}
        scrollY={scrollY as unknown as SharedValue<number>}
      />,
    );

    expect(scrollY.value).toBe(0);
  });

  it('hides rows whose kind does not match the type filter', () => {
    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);

    expect(screen.queryByTestId('row-0xconfirmed')).toBeNull();
    expect(screen.queryByTestId('row-0xlocal')).toBeNull();
  });

  it('keeps rows whose kind matches the type filter', () => {
    render(<ActivityList typeFilter={ActivityTypeFilter.Transactions} />);

    expect(screen.getByTestId('row-0xconfirmed')).toBeOnTheScreen();
    expect(screen.getByTestId('row-0xlocal')).toBeOnTheScreen();
  });

  it('hides rows outside the selected network filter', () => {
    render(<ActivityList networkFilter={['eip155:59144']} />);

    expect(screen.queryByTestId('row-0xconfirmed')).toBeNull();
  });

  it('renders perps items when the perps flag is on and the Perps filter is selected', () => {
    selectorValues.perpsEnabled = true;
    mockPerpsSourceState = {
      items: [
        {
          type: 'perpsOpenLong',
          chainId: 'eip155:42161',
          status: 'success',
          timestamp: 5,
          hash: 'perps-fill-1',
          data: { token: { symbol: 'USD' } },
        },
      ],
      isLoading: false,
      error: null,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);

    expect(screen.getByTestId('row-perps-fill-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('row-0xconfirmed')).toBeNull();
  });

  const perpsItem = {
    type: 'perpsOpenLong',
    chainId: 'eip155:42161',
    status: 'success',
    timestamp: 5,
    hash: 'perps-fill-1',
    data: { token: { symbol: 'USD' } },
  };
  const predictItem = {
    type: 'predictionPlaced',
    chainId: 'eip155:137',
    status: 'success',
    timestamp: 5,
    hash: 'predict-1',
    data: { token: { symbol: 'USDC' } },
  };

  it('advances the perps source when scrolled near the bottom and more history exists', () => {
    selectorValues.perpsEnabled = true;
    const perpsLoadMore = jest.fn(() => Promise.resolve());
    mockPerpsSourceState = {
      items: [perpsItem],
      isLoading: false,
      error: null,
      loadMore: perpsLoadMore,
      hasMore: true,
      isFetchingMore: false,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);
    fireEvent.press(screen.getByTestId('mock-viewable'));

    expect(perpsLoadMore).toHaveBeenCalled();
  });

  it('does not advance a domain source whose load is already in flight', () => {
    selectorValues.perpsEnabled = true;
    const perpsLoadMore = jest.fn(() => Promise.resolve());
    mockPerpsSourceState = {
      items: [perpsItem],
      isLoading: false,
      error: null,
      loadMore: perpsLoadMore,
      hasMore: true,
      isFetchingMore: true,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);
    fireEvent.press(screen.getByTestId('mock-viewable'));

    expect(perpsLoadMore).not.toHaveBeenCalled();
  });

  it('advances the predict source when scrolled near the bottom and more history exists', () => {
    selectorValues.predictEnabled = true;
    const predictLoadMore = jest.fn(() => Promise.resolve());
    mockPredictSourceState = {
      items: [predictItem],
      isLoading: false,
      error: null,
      loadMore: predictLoadMore,
      hasMore: true,
      isFetchingMore: false,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Predictions} />);
    fireEvent.press(screen.getByTestId('mock-viewable'));

    expect(predictLoadMore).toHaveBeenCalled();
  });

  it('does not advance the predict source under a non-Predictions filter', () => {
    selectorValues.predictEnabled = true;
    const predictLoadMore = jest.fn(() => Promise.resolve());
    mockPredictSourceState = {
      items: [predictItem],
      isLoading: false,
      error: null,
      loadMore: predictLoadMore,
      hasMore: true,
      isFetchingMore: false,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Transactions} />);
    fireEvent.press(screen.getByTestId('mock-viewable'));

    expect(predictLoadMore).not.toHaveBeenCalled();
  });

  it('shows the load-more indicator while a domain source is fetching more', () => {
    selectorValues.predictEnabled = true;
    mockPredictSourceState = {
      items: [predictItem],
      isLoading: false,
      error: null,
      loadMore: jest.fn(() => Promise.resolve()),
      hasMore: true,
      isFetchingMore: true,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Predictions} />);

    expect(
      screen.getByTestId(ActivityListSelectorsIDs.LOAD_MORE_INDICATOR),
    ).toBeOnTheScreen();
  });

  it('hides the load-more indicator for a domain fetch not shown under the active filter', () => {
    selectorValues.predictEnabled = true;
    mockPredictSourceState = {
      items: [predictItem],
      isLoading: false,
      error: null,
      loadMore: jest.fn(() => Promise.resolve()),
      hasMore: true,
      isFetchingMore: true,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Transactions} />);

    expect(
      screen.queryByTestId(ActivityListSelectorsIDs.LOAD_MORE_INDICATOR),
    ).toBeNull();
  });

  it('shows the loading indicator (not the empty state) while Perps is still loading after the EVM query settles', () => {
    selectorValues.perpsEnabled = true;
    // Perps source still loading with nothing yet...
    mockPerpsSourceState = { items: [], isLoading: true, error: null };
    // ...and the EVM query has already settled with no rows.
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });
    (useLocalActivityItems as jest.Mock).mockReturnValue([]);

    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);

    expect(
      screen.getByTestId(ActivityListSelectorsIDs.LOADING_INDICATOR),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('activity-empty-state')).toBeNull();
  });

  it('shows the empty state once every enabled source has settled with no rows', () => {
    selectorValues.perpsEnabled = true;
    mockPerpsSourceState = { items: [], isLoading: false, error: null };
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });
    (useLocalActivityItems as jest.Mock).mockReturnValue([]);

    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);

    expect(screen.getByTestId('activity-empty-state')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(ActivityListSelectorsIDs.LOADING_INDICATOR),
    ).toBeNull();
  });

  it('shows the Transactions empty state once EVM settles, even while Perps is still loading', () => {
    // Perps flag on and its source still loading...
    selectorValues.perpsEnabled = true;
    mockPerpsSourceState = { items: [], isLoading: true, error: null };
    // ...but the EVM query has settled with no rows, and we're on Transactions.
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });
    (useLocalActivityItems as jest.Mock).mockReturnValue([]);

    render(<ActivityList typeFilter={ActivityTypeFilter.Transactions} />);

    // Perps loading is irrelevant to the Transactions filter, so the empty
    // state shows rather than a spinner blocked on the domain fetch.
    expect(screen.getByTestId('activity-empty-state')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(ActivityListSelectorsIDs.LOADING_INDICATOR),
    ).toBeNull();
  });

  it('does not render perps items when the perps flag is disabled', () => {
    selectorValues.perpsEnabled = false;
    mockPerpsSourceState = {
      items: [
        {
          type: 'perpsOpenLong',
          chainId: 'eip155:42161',
          status: 'success',
          timestamp: 5,
          hash: 'perps-fill-1',
          data: { token: { symbol: 'USD' } },
        },
      ],
      isLoading: false,
      error: null,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);

    expect(screen.queryByTestId('row-perps-fill-1')).toBeNull();
  });

  it('renders predict items when the predict flag is on and the Predictions filter is selected', () => {
    selectorValues.predictEnabled = true;
    mockPredictSourceState = {
      items: [
        {
          type: 'predictionPlaced',
          chainId: 'eip155:137',
          status: 'success',
          timestamp: 6,
          hash: 'predict-1',
          data: { token: { symbol: 'USDC' } },
        },
      ],
      isLoading: false,
      error: null,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Predictions} />);

    expect(screen.getByTestId('row-predict-1')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-source-mounted')).toBeOnTheScreen();
  });

  it('does NOT mount the predict source on the default Transactions tab', () => {
    selectorValues.predictEnabled = true;

    render(<ActivityList typeFilter={ActivityTypeFilter.Transactions} />);

    expect(screen.queryByTestId('predict-source-mounted')).toBeNull();
  });

  it('does NOT mount the perps source on the Transactions tab', () => {
    selectorValues.perpsEnabled = true;

    render(<ActivityList typeFilter={ActivityTypeFilter.Transactions} />);

    expect(screen.queryByTestId('perps-source-mounted')).toBeNull();
  });

  it('keeps the perps source mounted after switching away from Perps (no refetch churn)', () => {
    selectorValues.perpsEnabled = true;

    const { rerender } = render(
      <ActivityList typeFilter={ActivityTypeFilter.Perps} />,
    );
    expect(screen.getByTestId('perps-source-mounted')).toBeOnTheScreen();

    rerender(<ActivityList typeFilter={ActivityTypeFilter.Transactions} />);
    expect(screen.getByTestId('perps-source-mounted')).toBeOnTheScreen();
  });

  it('does not render predict items when the predict flag is disabled', () => {
    selectorValues.predictEnabled = false;
    mockPredictSourceState = {
      items: [
        {
          type: 'predictionPlaced',
          chainId: 'eip155:137',
          status: 'success',
          timestamp: 6,
          hash: 'predict-1',
          data: { token: { symbol: 'USDC' } },
        },
      ],
      isLoading: false,
      error: null,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Predictions} />);

    expect(screen.queryByTestId('row-predict-1')).toBeNull();
  });

  it('navigates a perps trade row to the position transaction detail screen', () => {
    selectorValues.perpsEnabled = true;
    const perpsTx = { id: 'fill-1', type: 'trade' };
    mockPerpsSourceState = {
      items: [
        {
          type: 'perpsOpenLong',
          chainId: 'eip155:42161',
          status: 'success',
          timestamp: 5,
          raw: { type: 'perpsTransaction', data: perpsTx },
          hash: 'perps-fill-1',
          data: { token: { symbol: 'USD' } },
        },
      ],
      isLoading: false,
      error: null,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);
    fireEvent.press(screen.getByTestId('row-perps-fill-1'));

    expect(mockNavigate).toHaveBeenCalledWith('PerpsPositionTransaction', {
      transaction: perpsTx,
    });
  });

  it('routes perps rows to ActivityDetails when the transactions redesign flag is on', () => {
    selectorValues.perpsEnabled = true;
    selectorValues.isTxRedesign = true;
    const perpsTx = { id: 'fill-2', type: 'trade' };
    const perpsRedesignItem = {
      type: 'perpsOpenLong',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 5,
      raw: { type: 'perpsTransaction', data: perpsTx },
      hash: 'perps-fill-2',
      data: { token: { symbol: 'USD' } },
    };
    mockPerpsSourceState = {
      items: [perpsRedesignItem],
      isLoading: false,
      error: null,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);
    fireEvent.press(screen.getByTestId('row-perps-fill-2'));

    // Params stay serializable; the row is handed off via the store by key.
    const call = mockNavigate.mock.calls.find(
      ([route]) => route === Routes.ACTIVITY_DETAILS,
    );
    const params = call?.[1] as
      | { chainId: string; txIdentifier: string; preloadKey?: string }
      | undefined;
    expect(params).toEqual({
      chainId: 'eip155:42161',
      txIdentifier: 'perps-fill-2',
      preloadKey: expect.any(String),
    });
    expect(getPreloadedActivityItem(params?.preloadKey)).toEqual(
      perpsRedesignItem,
    );
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'PerpsPositionTransaction',
      expect.anything(),
    );
  });

  it('navigates a perps funding row to the funding transaction detail screen', () => {
    selectorValues.perpsEnabled = true;
    const perpsTx = { id: 'funding-1', type: 'funding' };
    mockPerpsSourceState = {
      items: [
        {
          type: 'perpsPaidFundingFees',
          chainId: 'eip155:42161',
          status: 'success',
          timestamp: 5,
          raw: { type: 'perpsTransaction', data: perpsTx },
          hash: 'perps-funding-1',
          data: { token: { symbol: 'USD' } },
        },
      ],
      isLoading: false,
      error: null,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);
    fireEvent.press(screen.getByTestId('row-perps-funding-1'));

    expect(mockNavigate).toHaveBeenCalledWith('PerpsFundingTransaction', {
      transaction: perpsTx,
    });
  });

  it('navigates a predict row to the predict activity detail screen', () => {
    selectorValues.predictEnabled = true;
    const predictActivity = {
      id: 'p1',
      providerId: 'polymarket',
      title: 'Will Spain win the 2026 FIFA World Cup?',
      outcome: 'Yes',
      entry: { type: 'buy', timestamp: 1_700_000_000, amount: 3, price: 0.42 },
    };
    mockPredictSourceState = {
      items: [
        {
          type: 'predictionPlaced',
          chainId: 'eip155:137',
          status: 'success',
          timestamp: 1_700_000_000_000,
          raw: { type: 'predictActivity', data: predictActivity },
          hash: 'predict-1',
          data: { token: { symbol: 'USDC' } },
        },
      ],
      isLoading: false,
      error: null,
    };

    render(<ActivityList typeFilter={ActivityTypeFilter.Predictions} />);
    fireEvent.press(screen.getByTestId('row-predict-1'));

    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictActivityDetail',
      params: {
        activity: expect.objectContaining({
          id: 'p1',
          type: 'BUY',
          marketTitle: 'Will Spain win the 2026 FIFA World Cup?',
          amountUsd: 3,
          outcome: 'Yes',
        }),
      },
    });
  });

  it('renders non-EVM swap/bridge rows through ActivityListItemRow', () => {
    selectorValues.enabledEvm = [];
    selectorValues.enabledNonEvm = ['solana:mainnet'];
    selectorValues.nonEvmState = {
      transactions: [
        { chain: 'solana:mainnet', id: 'solanaBridge', from: [], to: [] },
      ],
    };
    selectorValues.selectedGroupAccounts = [
      { address: 'solana-address', type: 'solana:data-account' },
    ];
    (useTransactionsQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [] }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      refetch: mockRefetch,
    });
    (useLocalActivityItems as jest.Mock).mockReturnValue([]);

    render(<ActivityList chainId="solana:mainnet" />);

    expect(screen.getByTestId('row-solanaBridge')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('non-evm-footer'));
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      params: { url: 'https://solana.explorer/address/sol' },
      screen: 'SimpleWebview',
    });
  });

  it('routes non-EVM cross-chain bridge taps to the unified swaps detail screen', () => {
    selectorValues.enabledNonEvm = ['solana:mainnet'];
    selectorValues.nonEvmState = {
      transactions: [
        { chain: 'solana:mainnet', id: 'solanaCross', from: [], to: [] },
      ],
    };

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-solanaCross'));

    expect(handleUnifiedSwapsTxHistoryItemClick).toHaveBeenCalledWith({
      navigation: expect.any(Object),
      multiChainTx: expect.objectContaining({
        chain: 'solana:mainnet',
        id: 'solanaCross',
      }),
      bridgeTxHistoryItem: expect.objectContaining({
        title: 'solana-cross-bridge',
      }),
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the multichain details sheet for non-EVM same-chain swaps with bridge history', () => {
    selectorValues.enabledNonEvm = ['solana:mainnet'];
    selectorValues.nonEvmState = {
      transactions: [
        { chain: 'solana:mainnet', id: 'solanaBridge', from: [], to: [] },
      ],
    };

    render(<ActivityList header={<></>} />);

    fireEvent.press(screen.getByTestId('row-solanaBridge'));

    expect(handleUnifiedSwapsTxHistoryItemClick).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS,
      }),
    );
  });

  it('presents in-flight non-EVM cross-chain bridges as pending bridge rows', () => {
    selectorValues.enabledNonEvm = ['solana:mainnet'];
    selectorValues.nonEvmState = {
      transactions: [
        {
          chain: 'solana:mainnet',
          id: 'solanaCross',
          status: 'confirmed',
          from: [],
          to: [],
        },
        {
          chain: 'solana:mainnet',
          id: 'solanaBridge',
          type: 'swap',
          status: 'confirmed',
          from: [],
          to: [],
        },
      ],
    };

    render(<ActivityList header={<></>} />);

    // The destination leg hasn't landed, so the confirmed source tx must not
    // present the row as completed.
    expect(screen.getByTestId('row-kind-solanaCross')).toHaveTextContent(
      'bridge',
    );
    expect(screen.getByTestId('row-status-solanaCross')).toHaveTextContent(
      'pending',
    );
    // Same-chain swaps keep their mapped kind and source-tx status.
    expect(screen.getByTestId('row-kind-solanaBridge')).toHaveTextContent(
      'swap',
    );
    expect(screen.getByTestId('row-status-solanaBridge')).toHaveTextContent(
      'success',
    );
  });

  it('marks non-EVM cross-chain bridges successful once the destination leg lands', () => {
    selectorValues.enabledNonEvm = ['solana:mainnet'];
    selectorValues.nonEvmState = {
      transactions: [
        { chain: 'solana:mainnet', id: 'solanaCrossDone', from: [], to: [] },
      ],
    };

    render(<ActivityList header={<></>} />);

    expect(screen.getByTestId('row-kind-solanaCrossDone')).toHaveTextContent(
      'bridge',
    );
    expect(screen.getByTestId('row-status-solanaCrossDone')).toHaveTextContent(
      'success',
    );
  });

  it('keeps failed non-EVM cross-chain bridges failed instead of pending', () => {
    selectorValues.enabledNonEvm = ['solana:mainnet'];
    selectorValues.nonEvmState = {
      transactions: [
        {
          chain: 'solana:mainnet',
          id: 'solanaCross',
          status: 'failed',
          from: [],
          to: [],
        },
      ],
    };

    render(<ActivityList header={<></>} />);

    expect(screen.getByTestId('row-kind-solanaCross')).toHaveTextContent(
      'bridge',
    );
    expect(screen.getByTestId('row-status-solanaCross')).toHaveTextContent(
      'failed',
    );
  });
});
