import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { UnconnectedTransactions } from '.';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import Logger from '../../../util/Logger';
import { isHardwareAccount } from '../../../util/address';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import {
  findBlockExplorerForNonEvmChainId,
  findBlockExplorerForRpc,
  findBlockExplorerUrlForChain,
  getBlockExplorerAddressUrl,
  getBlockExplorerName,
} from '../../../util/networks';
import { speedUpTransaction } from '../../../util/transaction-controller';

const mockGroupActivityListItems = jest.fn();
const mockMapTransactionToActivityItem = jest.fn();
const mockCreateQRSigningTransactionModalNavDetails = jest.fn();
const mockExecuteHardwareWalletOperation = jest.fn();

jest.mock('@shopify/flash-list', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    FlashList: ReactActual.forwardRef(
      (
        {
          data,
          keyExtractor,
          ListEmptyComponent,
          ListFooterComponent,
          onScroll,
          refreshControl,
          renderItem,
          testID,
        },
        ref,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          scrollToIndex: jest.fn(),
        }));

        return (
          <View testID={testID}>
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
              onPress={() => refreshControl?.props.onRefresh()}
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

jest.mock('../TransactionElement', () => ({
  __esModule: true,
  default: 'TransactionElement',
}));
jest.mock('./AssetDetailsActivityListItem', () => ({
  __esModule: true,
  default: 'AssetDetailsActivityListItem',
}));
jest.mock(
  '../../../components/Views/confirmations/components/modals/cancel-speedup-modal',
  () => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return {
      CancelSpeedupModal: ({ isVisible, onConfirm }) =>
        isVisible ? (
          <TouchableOpacity
            testID="cancel-speedup-modal-confirm"
            onPress={() => onConfirm({})}
          />
        ) : null,
    };
  },
);
jest.mock('../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn(),
}));
jest.mock('../../../util/networks', () => ({
  findBlockExplorerForNonEvmChainId: jest.fn(),
  findBlockExplorerForRpc: jest.fn(),
  findBlockExplorerUrlForChain: jest.fn(),
  getBlockExplorerAddressUrl: jest.fn(),
  getBlockExplorerName: jest.fn(),
  getHexEvmChainId: jest.fn((chainId: string) => chainId),
  isMainnetByChainId: jest.fn(),
}));
jest.mock('../../../util/address', () => ({ isHardwareAccount: jest.fn() }));
jest.mock('../../../core/NotificationManager', () => ({
  getTransactionToView: jest.fn(),
}));
jest.mock('../../../util/transaction-controller', () => ({
  getPreviousGasFromController: jest.fn(),
  speedUpTransaction: jest.fn(),
}));
jest.mock('../../../util/confirmation/gas', () => ({
  getGasValuesForReplacement: jest.fn((gasValues) => gasValues),
  getMediumGasPriceHex: jest.fn(() => '0x123'),
  normalizeReplacementGasFeeParams: jest.fn((params) => params?.legacyGasFee),
}));
jest.mock('../../../util/transactions', () => ({
  validateTransactionActionBalance: jest.fn(() => false),
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
jest.mock('../../UI/QRHardware/QRSigningTransactionModal', () => ({
  QRSignMode: { SpeedUp: 'speed-up', Cancel: 'cancel' },
  createQRSigningTransactionModalNavDetails: (...args: unknown[]) =>
    mockCreateQRSigningTransactionModalNavDetails(...args),
}));
jest.mock('../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({}),
  executeHardwareWalletOperation: (...args: unknown[]) =>
    mockExecuteHardwareWalletOperation(...args),
}));
jest.mock('../../../core/Engine', () => ({
  context: {
    ApprovalController: {
      acceptRequest: jest.fn(),
      rejectRequest: jest.fn(),
    },
    TransactionController: {
      cancelTransaction: jest.fn(),
      stopTransaction: jest.fn(),
    },
  },
}));
jest.mock('../../../core/ToastService/ToastService', () => ({
  __esModule: true,
  default: { showToast: jest.fn() },
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
jest.mock('../../../actions/alert', () => ({ showAlert: jest.fn() }));
jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));
jest.mock('../../../selectors/accountTrackerController', () => ({
  selectAccounts: jest.fn(),
}));
jest.mock('../../../selectors/confirmTransaction', () => ({
  selectGasFeeEstimates: jest.fn(),
}));
jest.mock('../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));
jest.mock('../../../selectors/gasFeeController', () => ({
  selectGasFeeControllerEstimateType: jest.fn(),
}));
jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
  selectNetworkClientId: jest.fn(),
  selectNetworkConfigurations: jest.fn(),
  selectProviderConfig: jest.fn(),
  selectProviderType: jest.fn(),
}));
jest.mock('../../../selectors/settings', () => ({
  selectPrimaryCurrency: jest.fn(),
}));
jest.mock('../../../selectors/featureFlagController/activityRedesign', () => ({
  selectIsActivityRedesignEnabled: jest.fn(),
}));
jest.mock('../../../reducers/collectibles', () => ({
  collectibleContractsSelector: jest.fn(),
}));
jest.mock('../QRHardware/withQRHardwareAwareness', () => ({
  __esModule: true,
  default: (Component: React.ComponentType) => Component,
}));

let mockNavigation: { navigate: jest.Mock; push: jest.Mock };

const resetNavigationMocks = () => {
  mockNavigation = { navigate: jest.fn(), push: jest.fn() };
};

const createDefaultTestProps = () => ({
  accounts: { '0x123': { balance: '1000000000000000000' } },
  chainId: '0x1',
  collectibleContracts: [],
  confirmedTransactions: [],
  currentCurrency: 'USD',
  gasFeeEstimates: { medium: { suggestedMaxFeePerGas: '20' } },
  loading: false,
  navigation: mockNavigation,
  networkConfigurations: {},
  providerConfig: { type: 'mainnet' },
  selectedAddress: '0x123',
  submittedTransactions: [],
  transactions: [],
});

const renderTransactions = (props = {}) => {
  const result = render(
    <UnconnectedTransactions {...createDefaultTestProps()} {...props} />,
  );
  act(() => {
    jest.advanceTimersByTime(100);
  });
  return result;
};

const asComponentType = (name: string) =>
  name as unknown as React.ComponentType;

const getTransactionElement = (
  rendered: ReturnType<typeof renderTransactions>,
) => rendered.UNSAFE_getByType(asComponentType('TransactionElement'));

const invokeTransactionAction = (
  rendered: ReturnType<typeof renderTransactions>,
  action: 'cancel' | 'cancelUnsignedQR' | 'press' | 'signQR' | 'speedUp',
  transaction: { id: string; time: number },
  enabled = true,
) => {
  const props = getTransactionElement(rendered).props;
  if (action === 'press') {
    props.onPressItem(transaction.id, props.i);
  } else if (action === 'speedUp') {
    props.onSpeedUpAction(enabled, transaction);
  } else if (action === 'cancel') {
    props.onCancelAction(enabled, transaction);
  } else if (action === 'cancelUnsignedQR') {
    props.cancelUnsignedQRTransaction(transaction);
  } else {
    props.signQRTransaction(transaction);
  }
};

describe('UnconnectedTransactions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetNavigationMocks();
    (isHardwareAccount as jest.Mock).mockReturnValue(false);
    (isNonEvmChainId as jest.Mock).mockReturnValue(false);
    (NotificationManager.getTransactionToView as jest.Mock).mockReturnValue(
      null,
    );
    (getBlockExplorerAddressUrl as jest.Mock).mockReturnValue({
      title: 'Etherscan',
      url: 'https://etherscan.io/address/0x123',
    });
    (getBlockExplorerName as jest.Mock).mockReturnValue('Etherscan');
    mockCreateQRSigningTransactionModalNavDetails.mockReturnValue([
      'QRSigningTransactionModal',
      { transactionId: 'transaction-id' },
    ]);
    mockGroupActivityListItems.mockImplementation((items) => items);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('list lifecycle', () => {
    it('expands the transaction selected by a notification', () => {
      const transaction = { id: 'notification-transaction', time: 2 };
      (NotificationManager.getTransactionToView as jest.Mock).mockReturnValue(
        transaction.id,
      );

      const rendered = renderTransactions({ transactions: [transaction] });
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      expect(NotificationManager.getTransactionToView).toHaveBeenCalledTimes(1);
      expect(getTransactionElement(rendered).props.tx).toEqual(transaction);
    });

    it('sorts submitted transactions without mutating the input', () => {
      const submittedTransactions = [
        { id: 'older', time: 1 },
        { id: 'newer', time: 2 },
      ];

      const rendered = renderTransactions({ submittedTransactions });

      expect(submittedTransactions.map(({ id }) => id)).toEqual([
        'older',
        'newer',
      ]);
      expect(
        rendered
          .UNSAFE_getAllByType(asComponentType('TransactionElement'))
          .map(({ props }) => props.tx.id),
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

    it('expands and collapses a transaction from its list callback', () => {
      const transaction = { id: 'expandable', time: 1 };

      const rendered = renderTransactions({
        headerHeight: 1,
        transactions: [transaction],
      });

      act(() => {
        invokeTransactionAction(rendered, 'press', transaction);
        jest.advanceTimersByTime(300);
        invokeTransactionAction(rendered, 'press', transaction);
      });

      expect(getTransactionElement(rendered).props.tx).toEqual(transaction);
    });
  });

  describe('block explorer', () => {
    it('opens an EVM explorer from the footer', () => {
      const close = jest.fn();
      const transaction = { id: 'transaction', time: 1 };
      (findBlockExplorerForRpc as jest.Mock).mockReturnValue(
        'https://rpc.explorer',
      );

      renderTransactions({
        close,
        providerConfig: { type: 'rpc', rpcUrl: 'https://rpc.example' },
        transactions: [transaction],
      });
      fireEvent.press(screen.getByTestId('transactions-footer-view-explorer'));

      expect(getBlockExplorerAddressUrl).toHaveBeenCalledWith(
        'rpc',
        '0x123',
        'https://rpc.explorer',
      );
      expect(mockNavigation.push).toHaveBeenCalledWith('Webview', {
        params: {
          title: 'Etherscan',
          url: 'https://etherscan.io/address/0x123',
        },
        screen: 'SimpleWebview',
      });
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('opens the asset chain explorer for asset details', () => {
      const transaction = { id: 'transaction', time: 1 };
      (findBlockExplorerUrlForChain as jest.Mock).mockReturnValue(
        'https://polygonscan.com',
      );
      (getBlockExplorerName as jest.Mock).mockReturnValue('Polygonscan');

      renderTransactions({
        location: TransactionDetailLocation.AssetDetails,
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

    it('logs missing explorer URLs instead of navigating', () => {
      const transaction = { id: 'transaction', time: 1 };
      (getBlockExplorerAddressUrl as jest.Mock).mockReturnValue({});
      (findBlockExplorerForRpc as jest.Mock).mockReturnValue(
        'https://rpc.explorer',
      );

      renderTransactions({
        providerConfig: { type: 'rpc', rpcUrl: 'https://rpc.example' },
        transactions: [transaction],
      });
      fireEvent.press(screen.getByTestId('transactions-footer-view-explorer'));

      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
        message: "can't get a block explorer link for network ",
        type: 'rpc',
      });
      expect(mockNavigation.push).not.toHaveBeenCalled();
    });

    it('looks up RPC and non-EVM explorers when context changes', () => {
      (findBlockExplorerForRpc as jest.Mock).mockReturnValue(
        'https://rpc.explorer',
      );
      (isNonEvmChainId as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValue(true);
      (findBlockExplorerForNonEvmChainId as jest.Mock).mockReturnValue(
        'https://solscan.io',
      );

      const { rerender } = render(
        <UnconnectedTransactions
          {...createDefaultTestProps()}
          providerConfig={{ type: 'rpc', rpcUrl: 'https://rpc.example' }}
        />,
      );
      rerender(
        <UnconnectedTransactions
          {...createDefaultTestProps()}
          chainId="solana:mainnet"
        />,
      );

      expect(findBlockExplorerForRpc).toHaveBeenCalledWith(
        'https://rpc.example',
        {},
      );
      expect(findBlockExplorerForNonEvmChainId).toHaveBeenCalledWith(
        'solana:mainnet',
      );
    });
  });

  describe('grouped activity', () => {
    it('creates pending, date, and local transaction activity items', () => {
      const transaction = { id: 'transaction', time: 1 };
      const activityRow = {
        type: 'activity',
        item: {
          raw: {
            data: { primaryTransaction: transaction },
            type: 'localTransaction',
          },
        },
      };
      mockGroupActivityListItems.mockReturnValue([
        { type: 'pending-header' },
        { date: 1, type: 'date-header' },
        activityRow,
      ]);

      const rendered = renderTransactions({
        isActivityRedesignEnabled: true,
        location: TransactionDetailLocation.AssetDetails,
        transactions: [transaction],
      });

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

  describe('replacement transactions', () => {
    const transaction = {
      id: 'replacement',
      time: 1,
      txParams: { gasPrice: '0x0' },
    };

    const openReplacementModal = (action: 'speedup' | 'cancel') => {
      const rendered = renderTransactions({ transactions: [transaction] });
      act(() => {
        invokeTransactionAction(
          rendered,
          action === 'speedup' ? 'speedUp' : action,
          transaction,
        );
      });
      return rendered;
    };

    it('closes the replacement modal when speed-up is declined', () => {
      const rendered = renderTransactions({ transactions: [transaction] });

      act(() => {
        invokeTransactionAction(rendered, 'speedUp', transaction, false);
      });

      expect(
        screen.queryByTestId('cancel-speedup-modal-confirm'),
      ).not.toBeOnTheScreen();
    });

    it('leaves the replacement modal closed without a transaction', () => {
      const rendered = renderTransactions({ transactions: [transaction] });

      act(() => {
        getTransactionElement(rendered).props.onCancelAction(true);
      });

      expect(
        screen.queryByTestId('cancel-speedup-modal-confirm'),
      ).not.toBeOnTheScreen();
    });

    it('closes the replacement modal when cancellation is declined', () => {
      const rendered = renderTransactions({ transactions: [transaction] });

      act(() => {
        invokeTransactionAction(rendered, 'cancel', transaction, false);
      });

      expect(
        screen.queryByTestId('cancel-speedup-modal-confirm'),
      ).not.toBeOnTheScreen();
    });

    it('submits a normal speed-up transaction', async () => {
      openReplacementModal('speedup');

      await act(async () => {
        fireEvent.press(screen.getByTestId('cancel-speedup-modal-confirm'));
      });

      expect(speedUpTransaction).toHaveBeenCalledWith('replacement', {
        gasPrice: '0x123',
      });
    });

    it('submits a normal cancellation transaction', async () => {
      openReplacementModal('cancel');

      await act(async () => {
        fireEvent.press(screen.getByTestId('cancel-speedup-modal-confirm'));
      });

      expect(
        Engine.context.TransactionController.stopTransaction,
      ).toHaveBeenCalledWith('replacement', { gasPrice: '0x123' });
    });

    it('opens QR signing for a replacement transaction', async () => {
      (isHardwareAccount as jest.Mock).mockImplementation(
        (_address, keyrings?: string[]) =>
          keyrings?.includes(ExtendedKeyringTypes.qr) ?? false,
      );
      openReplacementModal('speedup');

      await act(async () => {
        fireEvent.press(screen.getByTestId('cancel-speedup-modal-confirm'));
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'QRSigningTransactionModal',
        expect.objectContaining({ transactionId: 'transaction-id' }),
      );
    });

    it('signs a Ledger replacement through the hardware operation', async () => {
      (isHardwareAccount as jest.Mock).mockImplementation(
        (_address, keyrings?: string[]) =>
          keyrings?.includes(ExtendedKeyringTypes.ledger) ?? false,
      );
      mockExecuteHardwareWalletOperation.mockImplementation(
        async ({ execute }: { execute: () => Promise<void> }) => {
          await execute();
          return true;
        },
      );
      openReplacementModal('speedup');

      await act(async () => {
        fireEvent.press(screen.getByTestId('cancel-speedup-modal-confirm'));
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '0x123',
          operationType: 'transaction',
        }),
      );
      expect(speedUpTransaction).toHaveBeenCalledWith('replacement', {
        gasPrice: '0x123',
      });
    });

    it('reports failed speed-up submissions through the transaction toast', async () => {
      const error = new Error('replacement failed');
      (speedUpTransaction as jest.Mock).mockRejectedValue(error);
      openReplacementModal('speedup');

      await act(async () => {
        fireEvent.press(screen.getByTestId('cancel-speedup-modal-confirm'));
      });

      expect(Logger.error).toHaveBeenCalledWith(error, {
        message: 'speedUpTransaction failed ',
        speedUpTxId: 'replacement',
      });
    });

    it('cancels unsigned QR transactions and opens QR signing', async () => {
      const rendered = renderTransactions({ transactions: [transaction] });

      await act(async () => {
        invokeTransactionAction(rendered, 'cancelUnsignedQR', transaction);
        invokeTransactionAction(rendered, 'signQR', transaction);
      });

      expect(
        Engine.context.ApprovalController.rejectRequest,
      ).toHaveBeenCalledWith('replacement', expect.any(Object));
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'QRSigningTransactionModal',
        expect.any(Object),
      );
    });
  });
});
