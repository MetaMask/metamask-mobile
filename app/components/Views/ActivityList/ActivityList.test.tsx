import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import ActivityList, { type ActivityListHandle } from './ActivityList';
import { ActivityListSelectorsIDs } from './ActivityList.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ActivityTypeFilter } from '../ActivityScreen/types';
import { useTransactionsQuery } from './useTransactionsQuery';
import { useLocalActivityItems } from './hooks/useLocalActivityItems';
import { useUnifiedTxActions } from './useUnifiedTxActions';
import Engine from '../../../core/Engine';
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';

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
}));

jest.mock('../../../selectors/multichainNetworkController', () => ({
  selectAllConfiguredNonEvmChainIds: jest.fn((state) => state.enabledNonEvm),
}));

jest.mock('../../../selectors/transactionController', () => ({
  selectRelatedChainIdsByTransactionId: jest.fn((state) => state.related),
}));

jest.mock('../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn((state) => state.bridgeHistory),
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
          keyExtractor: (item: unknown) => string;
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
                  <View key={keyExtractor(item)}>
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
    item: { hash?: string };
    onPress: (item: unknown) => void;
    title?: string;
  }) => {
    const { Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <TouchableOpacity
        testID={`row-${item.hash ?? 'no-hash'}`}
        onPress={() => onPress(item)}
      >
        <Text>{title ?? item.hash}</Text>
      </TouchableOpacity>
    );
  },
  resolveActivityListItemTitle: jest.fn(() => 'Activity title'),
}));

jest.mock('../../UI/TransactionElement', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ tx }: { tx: { id: string } }) => (
      <View testID={`pending-${tx.id}`}>
        <Text>Pending tx</Text>
      </View>
    ),
  };
});

jest.mock('../../UI/MultichainBridgeTransactionListItem', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ transaction }: { transaction: { id: string } }) => (
      <View testID={`bridge-${transaction.id}`}>
        <Text>Bridge tx</Text>
      </View>
    ),
  };
});

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
  useBridgeHistoryItemBySrcTxHash: jest.fn(() => ({
    bridgeHistoryItemsBySrcTxHash: {
      '0xconfirmed': { title: 'bridge-history' },
      solanaBridge: { title: 'solana-bridge' },
    },
  })),
}));

jest.mock('../../UI/Bridge/utils/transaction-history', () => ({
  getSwapBridgeTxActivityTitle: jest.fn(() => 'Bridge title'),
  handleUnifiedSwapsTxHistoryItemClick: jest.fn(),
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
    mapNonEvmTransactions: jest.fn((txs) =>
      txs.map((tx: { id: string; chain: string }) => ({
        type: 'send',
        chainId: tx.chain,
        status: 'success',
        timestamp: 2,
        hash: tx.id,
        data: {},
        raw: { type: 'keyringTransaction', data: tx },
      })),
    ),
    mergeTransactionsByTime: jest.fn(
      (local, confirmed, nonEvm, perps = [], predict = []) => [
        ...perps,
        ...predict,
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
} = { items: [], isLoading: false, error: null };

jest.mock('./hooks/PerpsActivitySource', () => {
  const ReactActual = jest.requireActual('react');
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
      return null;
    },
  };
});

let mockPredictSourceState: {
  items: unknown[];
  isLoading: boolean;
  error: string | null;
  refetch?: () => Promise<void>;
} = { items: [], isLoading: false, error: null };

jest.mock('./hooks/PredictActivitySource', () => {
  const ReactActual = jest.requireActual('react');
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
      return null;
    },
  };
});

const mockNavigate = jest.fn();
const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn(() => Promise.resolve());

const selectorValues = {
  bridgeHistory: {
    solanaBridge: { status: { srcChain: { txHash: 'solanaBridge' } } },
  },
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
    expect(screen.getByTestId('pending-local-id')).toBeOnTheScreen();
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

    fireEvent.press(screen.getByTestId('row-0xconfirmed'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        screen: expect.any(String),
      }),
    );
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

    expect(mockScrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: true,
    });
  });

  it('hides rows whose kind does not match the type filter', () => {
    render(<ActivityList typeFilter={ActivityTypeFilter.Perps} />);

    expect(screen.queryByTestId('row-0xconfirmed')).toBeNull();
    expect(screen.queryByTestId('pending-local-id')).toBeNull();
  });

  it('keeps rows whose kind matches the type filter', () => {
    render(<ActivityList typeFilter={ActivityTypeFilter.Transactions} />);

    expect(screen.getByTestId('row-0xconfirmed')).toBeOnTheScreen();
    expect(screen.getByTestId('pending-local-id')).toBeOnTheScreen();
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

  it('renders non-EVM bridge rows and footer when only non-EVM chains are enabled', () => {
    selectorValues.enabledEvm = [];
    selectorValues.enabledNonEvm = ['solana:mainnet'];
    selectorValues.nonEvmState = {
      transactions: [{ chain: 'solana:mainnet', id: 'solanaBridge' }],
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

    expect(screen.getByTestId('bridge-solanaBridge')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('non-evm-footer'));
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      params: { url: 'https://solana.explorer/address/sol' },
      screen: 'SimpleWebview',
    });
  });
});
