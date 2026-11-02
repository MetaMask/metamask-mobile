import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ActivitiesViewSelectorsIDs } from '../../Views/ActivityView/ActivitiesView.testIds';
import { UnconnectedTransactions, mapStateToProps } from '.';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import {
  findBlockExplorerForNonEvmChainId,
  findBlockExplorerUrlForChain,
  getBlockExplorerName,
} from '../../../util/networks';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../selectors/networkController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import { selectAllTokens } from '../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../selectors/multichainAccounts/accountTreeController';

const mockGroupActivityListItems = jest.fn();
const mockMapTransactionToActivityItem = jest.fn();

type FlashListItem = Record<string, unknown>;

interface FlashListHarnessRef {
  scrollToIndex: jest.Mock;
}

interface FlashListHarnessProps {
  data: FlashListItem[];
  keyExtractor: (item: FlashListItem, index: number) => string;
  ListEmptyComponent?: React.ComponentType | React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
  refreshControl?: React.ReactElement<{ onRefresh?: () => void }>;
  renderItem: (args: { item: FlashListItem; index: number }) => React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

jest.mock('@shopify/flash-list', () => {
  const ReactActual: typeof React = jest.requireActual('react');
  const { TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    FlashList: ReactActual.forwardRef<
      FlashListHarnessRef,
      FlashListHarnessProps
    >(
      (
        {
          data,
          keyExtractor,
          ListEmptyComponent,
          ListFooterComponent,
          onScroll,
          refreshControl,
          renderItem,
          contentContainerStyle,
          testID,
        }: FlashListHarnessProps,
        ref: React.ForwardedRef<FlashListHarnessRef>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          scrollToIndex: jest.fn(),
        }));

        return (
          <View testID={testID} style={contentContainerStyle}>
            {data.length ? (
              data.map((item, index) => (
                <View key={keyExtractor(item, index)}>
                  {renderItem({ item, index })}
                </View>
              ))
            ) : typeof ListEmptyComponent === 'function' ? (
              <ListEmptyComponent />
            ) : (
              ListEmptyComponent
            )}
            {ListFooterComponent}
            <TouchableOpacity
              testID="flash-list-refresh"
              onPress={() => refreshControl?.props.onRefresh?.()}
            />
            <TouchableOpacity
              testID="flash-list-scroll"
              onPress={() =>
                onScroll?.({ nativeEvent: { contentOffset: { y: 42 } } })
              }
            />
          </View>
        );
      },
    ),
  };
});

jest.mock('./AssetDetailsActivityListItem', () => ({
  __esModule: true,
  default: 'AssetDetailsActivityListItem',
}));
jest.mock('../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn(),
}));
jest.mock('../../../util/networks', () => ({
  findBlockExplorerForNonEvmChainId: jest.fn(),
  findBlockExplorerUrlForChain: jest.fn(),
  getBlockExplorerName: jest.fn(),
  getHexEvmChainId: jest.fn((chainId: string) => chainId),
  isMainnetByChainId: jest.fn(),
}));
jest.mock('../../../util/activity-adapters', () => ({
  ...jest.requireActual('../../../util/activity-adapters'),
  getGroupedActivityListItemKey: jest.fn((item) => item.type),
  groupActivityListItems: (...args: unknown[]) =>
    mockGroupActivityListItems(...args),
}));
jest.mock('./AssetDetailsActivityListItem.utils', () => ({
  mapTransactionToActivityItem: (...args: unknown[]) =>
    mockMapTransactionToActivityItem(...args),
}));
jest.mock('../../../util/Logger', () => ({ error: jest.fn() }));
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));
jest.mock('../../../util/analytics/externalLinkTracking', () => ({
  trackBlockExplorerLinkClicked: jest.fn(),
}));
jest.mock('../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: { createEventBuilder: jest.fn() },
}));
jest.mock('../../../component-library/components-temp/TabEmptyState', () => ({
  TabEmptyState: () => null,
}));
jest.mock('../AssetOverview/PriceChart/PriceChart.context', () => {
  const ReactModule = jest.requireActual('react');
  return {
    __esModule: true,
    PriceChartProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    default: {
      Consumer: ({
        children,
      }: {
        children: (value: { isChartBeingTouched: boolean }) => React.ReactNode;
      }) => children({ isChartBeingTouched: false }),
    },
  };
});
jest.mock('../../../util/theme', () => {
  const ReactModule = jest.requireActual('react');
  const actualTheme = jest.requireActual('../../../util/theme');
  const theme = {
    ...actualTheme.mockTheme,
    colors: {
      ...actualTheme.mockTheme.colors,
      transparent: actualTheme.mockTheme.colors.background.default,
    },
  };
  return {
    ...actualTheme,
    ThemeContext: ReactModule.createContext(theme),
    useAppThemeFromContext: () => theme,
    useTheme: () => theme,
  };
});
jest.mock('../../../styles/common', () => {
  const actualStyles = jest.requireActual('../../../styles/common');
  return {
    baseStyles: { flexGrow: {} },
    colors: actualStyles.colors,
    fontStyles: { normal: {} },
  };
});
jest.mock('../../../component-library/hooks', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  const theme = {
    ...mockTheme,
    colors: {
      ...mockTheme.colors,
      transparent: mockTheme.colors.background.default,
    },
  };
  return {
    useStyles: (
      styleSheet: (params: {
        theme: typeof theme;
        vars: unknown;
      }) => Record<string, unknown>,
      vars: unknown,
    ) => ({
      styles: styleSheet({ theme, vars }),
      theme,
    }),
  };
});
jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));
jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
  selectNetworkConfigurations: jest.fn(),
}));
jest.mock('../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn(),
}));
jest.mock('../../../selectors/tokensController', () => ({
  selectAllTokens: jest.fn(),
}));
jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
  }),
);
let mockNavigation: { navigate: jest.Mock; push: jest.Mock };

const resetNavigationMocks = () => {
  mockNavigation = { navigate: jest.fn(), push: jest.fn() };
};

const createDefaultTestProps = () => ({
  chainId: '0x1',
  confirmedTransactions: [],
  loading: false,
  navigation: mockNavigation,
  networkConfigurations: {},
  selectedAddress: '0x123',
  submittedTransactions: [],
  transactions: [],
});

const renderTransactions = (props = {}) =>
  render(<UnconnectedTransactions {...createDefaultTestProps()} {...props} />);

const asComponentType = (name: string) =>
  name as unknown as React.ComponentType;

describe('UnconnectedTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNavigationMocks();
    (isNonEvmChainId as jest.Mock).mockReturnValue(false);
    (getBlockExplorerName as jest.Mock).mockReturnValue('Etherscan');
    mockMapTransactionToActivityItem.mockImplementation(({ transaction }) => ({
      type: 'activity',
      id: transaction.id,
    }));
    mockGroupActivityListItems.mockImplementation((items) => items);
  });

  describe('list lifecycle', () => {
    it('omits the empty-state footer when requested', () => {
      renderTransactions({ hideEmptyState: true });

      expect(screen.getByTestId('transactions-container')).toBeOnTheScreen();
    });

    it('lists submitted transactions newest first without mutating the input', () => {
      const submittedTransactions = [
        { id: 'older', time: 1 },
        { id: 'newer', time: 2 },
      ];

      renderTransactions({ submittedTransactions });

      expect(submittedTransactions.map(({ id }) => id)).toEqual([
        'older',
        'newer',
      ]);
      expect(
        mockMapTransactionToActivityItem.mock.calls.map(
          ([{ transaction }]) => transaction.id,
        ),
      ).toEqual(['newer', 'older']);
    });

    it('forwards scroll position and refreshes the list', async () => {
      const onScrollThroughContent = jest.fn();

      renderTransactions({ onScrollThroughContent });

      fireEvent.press(screen.getByTestId('flash-list-scroll'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('flash-list-refresh'));
      });

      expect(onScrollThroughContent).toHaveBeenCalledWith(42);
    });
  });

  describe('block explorer', () => {
    it('opens the asset chain explorer from the footer', () => {
      const transaction = { id: 'transaction', time: 1 };
      (findBlockExplorerUrlForChain as jest.Mock).mockReturnValue(
        'https://polygonscan.com',
      );
      (getBlockExplorerName as jest.Mock).mockReturnValue('Polygonscan');

      renderTransactions({
        tokenChainId: '0x89',
        transactions: [transaction],
      });
      fireEvent.press(screen.getByTestId('transactions-footer-view-explorer'));

      expect(mockNavigation.push).toHaveBeenCalledWith('Webview', {
        params: {
          title: 'Polygonscan',
          url: 'https://polygonscan.com/address/0x123',
        },
        screen: 'SimpleWebview',
      });
    });

    it('looks up the non-EVM explorer for a non-EVM token chain', () => {
      (isNonEvmChainId as jest.Mock).mockReturnValue(true);
      (findBlockExplorerForNonEvmChainId as jest.Mock).mockReturnValue(
        'https://solscan.io',
      );

      renderTransactions({ tokenChainId: 'solana:mainnet' });

      expect(findBlockExplorerForNonEvmChainId).toHaveBeenCalledWith(
        'solana:mainnet',
      );
      expect(findBlockExplorerUrlForChain).not.toHaveBeenCalled();
    });

    it('hides the explorer link when the asset chain has no explorer', () => {
      const transaction = { id: 'transaction', time: 1 };
      (findBlockExplorerUrlForChain as jest.Mock).mockReturnValue(undefined);

      renderTransactions({
        tokenChainId: '0x89',
        transactions: [transaction],
      });

      expect(
        screen.queryByTestId('transactions-footer-view-explorer'),
      ).not.toBeOnTheScreen();
      expect(mockNavigation.push).not.toHaveBeenCalled();
    });
  });

  describe('grouped activity', () => {
    it('creates pending, date, and local transaction activity items', () => {
      const transaction = { id: 'transaction', time: 1 };
      const activityItem = { type: 'activity' };
      const activityRow = {
        type: 'activity',
        item: activityItem,
      };
      mockMapTransactionToActivityItem.mockReturnValue(activityItem);
      mockGroupActivityListItems.mockReturnValue([
        { type: 'pending-header' },
        { date: 1, type: 'date-header' },
        activityRow,
      ]);

      const rendered = renderTransactions({ transactions: [transaction] });

      expect(mockMapTransactionToActivityItem).toHaveBeenCalledWith({
        assetSymbol: undefined,
        currentChainId: '0x1',
        tokenChainId: undefined,
        transaction,
      });
      expect(screen.getAllByTestId('activity-list-date-header')).toHaveLength(
        2,
      );
      expect(
        rendered.UNSAFE_getByType(
          asComponentType('AssetDetailsActivityListItem'),
        ).props.transaction,
      ).toEqual(transaction);
    });
  });
});

describe('mapStateToProps', () => {
  const mockState = {} as never;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectChainId).mockReturnValue('0x1');
  });

  it('derives chainId from tokenChainId instead of the globally selected network', () => {
    const result = mapStateToProps(mockState, { tokenChainId: '0x89' });

    expect(result.chainId).toBe('0x89');
    expect(selectChainId).not.toHaveBeenCalled();
  });

  it('falls back to the globally selected chain when no tokenChainId is given', () => {
    const result = mapStateToProps(mockState, {});

    expect(selectChainId).toHaveBeenCalledWith(mockState);
    expect(result.chainId).toBe('0x1');
  });

  it('selects asset enrichment data once in the parent', () => {
    const internalAccount = { metadata: { importTime: 123 } };
    const groupAccount = { address: '0x123' };
    const networkConfigurations = { '0x89': { nativeCurrency: 'POL' } };
    const allTokens = { '0x89': { '0x123': [] } };
    const bridgeHistory = { bridge: {} };
    jest
      .mocked(selectSelectedInternalAccount)
      .mockReturnValue(internalAccount as never);
    jest
      .mocked(selectSelectedAccountGroupEvmInternalAccount)
      .mockReturnValue(groupAccount as never);
    jest
      .mocked(selectEvmNetworkConfigurationsByChainId)
      .mockReturnValue(networkConfigurations as never);
    jest.mocked(selectAllTokens).mockReturnValue(allTokens as never);
    jest
      .mocked(selectBridgeHistoryForAccount)
      .mockReturnValue(bridgeHistory as never);

    const result = mapStateToProps(mockState, { tokenChainId: '0x89' });

    expect(result).toEqual(
      expect.objectContaining({
        accountImportTime: 123,
        groupEvmAccountAddress: '0x123',
        networkConfigurationsByChainId: networkConfigurations,
        allTokens,
        bridgeHistory,
      }),
    );
  });
});

describe('Transactions list bottom inset', () => {
  it('keeps the default bottom padding', () => {
    renderTransactions({ transactions: [] });

    expect(
      screen.getByTestId(ActivitiesViewSelectorsIDs.CONTAINER),
    ).toHaveStyle({ paddingBottom: 80 });
  });

  it('pads the list to clear a footer floating over it', () => {
    renderTransactions({ transactions: [], contentBottomInset: 120 });

    expect(
      screen.getByTestId(ActivitiesViewSelectorsIDs.CONTAINER),
    ).toHaveStyle({ paddingBottom: 120 });
  });
});

describe('Transactions refresh spinner', () => {
  it('moves the spinner below a floating header', () => {
    renderTransactions({ transactions: [], refreshControlOffset: 96 });

    expect(
      screen.UNSAFE_getByType(FlashList).props.refreshControl.props
        .progressViewOffset,
    ).toBe(96);
  });
});
