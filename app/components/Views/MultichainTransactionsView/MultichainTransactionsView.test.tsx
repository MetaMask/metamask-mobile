import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { fireEvent, render } from '@testing-library/react-native';
import {
  BtcScope,
  SolScope,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import MultichainTransactionsView, {
  getMultichainTransactionItemType,
} from './MultichainTransactionsView';
import { selectNonEvmTransactions } from '../../../selectors/multichain';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { configureUseAnalyticsExternalLinkMock } from '../../../util/test/analyticsMock';
import {
  selectIsActivityRedesignEnabled,
  selectIsTransactionsRedesignEnabled,
} from '../../../selectors/featureFlagController/activityRedesign';
import { ActivityListItemRow } from '../../UI/ActivityListItemRow/ActivityListItemRow';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import { handleUnifiedSwapsTxHistoryItemClick } from '../../UI/Bridge/utils/transaction-history';
import Routes from '../../../constants/navigation/Routes';
jest.useFakeTimers();

jest.mock('../../../util/analytics/externalLinkTracking', () => ({
  ...jest.requireActual('../../../util/analytics/externalLinkTracking'),
  trackBlockExplorerLinkClicked: jest.fn(),
}));
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';
const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));
jest.mock(
  '../../UI/MultichainTransactionListItem',
  () => 'MockTransactionListItem',
);
jest.mock('../../UI/ActivityListItemRow/ActivityListItemRow', () => ({
  ActivityListItemRow: jest.fn(() => null),
}));
jest.mock('../../../selectors/featureFlagController/activityRedesign', () => ({
  selectIsActivityRedesignEnabled: jest.fn(() => false),
  selectIsTransactionsRedesignEnabled: jest.fn(() => false),
}));
jest.mock('../../UI/Bridge/utils/transaction-history', () => ({
  handleUnifiedSwapsTxHistoryItemClick: jest.fn(),
  isBridgeTxHistoryItemBridge: jest.fn(
    (item: { quote: { srcChainId: unknown; destChainId: unknown } }) =>
      item.quote.srcChainId !== item.quote.destChainId,
  ),
}));
jest.mock('../../hooks/useMultichainTransactionDisplay', () => ({
  useMultichainTransactionDisplay: jest.fn(() => ({
    title: 'Send TRX',
    to: { amount: '1', unit: 'TRX' },
    isRedeposit: false,
  })),
}));
jest.mock('../../../component-library/components/Buttons/Button', () => {
  const ButtonVariants = { Link: 'Link', Primary: 'Primary' };
  const ButtonSize = { Lg: 'Lg', Md: 'Md' };

  const MockButton = (props: ButtonProps) => {
    MockButton.lastProps = props;
    return 'MockButton';
  };

  MockButton.lastProps = {} as ButtonProps;

  return {
    __esModule: true,
    default: MockButton,
    ButtonVariants,
    ButtonSize,
  };
});

jest.mock('../../../core/Multichain/utils', () => ({
  getAddressUrl: jest.fn(() => 'https://solscan.io/account/testaddress'),
  nonEvmNetworkChainIdByAccountAddress: jest.fn(() => 'solana:mainnet'),
}));

jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');

  return {
    ...ReactNative,
    View: 'View',
    Text: 'Text',
    FlatList: 'FlatList',
    ActivityIndicator: 'ActivityIndicator',
  };
});

jest.mock('../../../util/networks', () => ({
  getBlockExplorerName: jest.fn(() => 'Explorer'),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

describe('MultichainTransactionsView', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockSelectedAddress = '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV';

  const mockTransactions = [
    {
      id: 'tx-123',
      chain: SolScope.Mainnet,
      from: [{ address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' }],
      to: [{ address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' }],
      value: '1500000000',
      type: TransactionType.Send,
      status: TransactionStatus.Confirmed,
      timestamp: 1742313600,
      fees: [],
    },
    {
      id: 'tx-456',
      chain: SolScope.Mainnet,
      from: [{ address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' }],
      to: [{ address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' }],
      value: '2000000000',
      type: TransactionType.Receive,
      status: TransactionStatus.Confirmed,
      timestamp: 1742400000,
      fees: [],
    },
  ];

  it('uses distinct recycle pools for standard and bridge transactions', () => {
    expect(
      getMultichainTransactionItemType(mockTransactions[0], false, {}),
    ).toBe('transaction');
    expect(
      getMultichainTransactionItemType(mockTransactions[1], false, {}),
    ).toBe('transaction');
    expect(
      getMultichainTransactionItemType(mockTransactions[0], false, {
        [mockTransactions[0].id]: {},
      }),
    ).toBe('bridge-transaction');
  });

  const customRender = (ui: React.ReactElement) => {
    const utils = render(ui);

    return {
      ...utils,
      queryAllByTestId: (id: string) => {
        if (id === 'transaction-item') {
          return Array(mockTransactions.length).fill({});
        }
        return utils.queryAllByTestId(id);
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    const { default: MockButton } = jest.requireMock(
      '../../../component-library/components/Buttons/Button',
    ) as { default: { lastProps: ButtonProps } };
    MockButton.lastProps = {} as ButtonProps;

    configureUseAnalyticsExternalLinkMock();
    mockUseTheme.mockReturnValue({
      colors: {
        background: {
          alternative: 'background-alternative',
          default: 'background-default',
        },
        border: { muted: 'border-muted' },
        icon: { default: 'icon-default' },
        primary: { default: 'primary-default' },
        text: {
          alternative: 'text-alternative',
          default: 'text-default',
        },
      },
      typography: {},
    });

    // Ensure selector returns a static instance
    const mockTransactionsData = { transactions: mockTransactions };

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return mockTransactionsData;
      }
      if (selector === selectIsActivityRedesignEnabled) {
        return false;
      }
      return null;
    });
  });

  it('handles case when transactions data is not available', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return null;
      }
      return null;
    });

    const { getByText } = customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
      />,
    );

    expect(getByText('wallet.no_transactions')).toBeTruthy();
  });

  it('renders transaction list items when transactions are available', async () => {
    const { queryAllByTestId } = customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
      />,
    );

    const transactionItems = queryAllByTestId('transaction-item');
    expect(transactionItems.length).toBe(2);
  });

  it('renders redesigned activity rows for asset details when activity redesign is enabled', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return { transactions: mockTransactions };
      }
      if (selector === selectIsActivityRedesignEnabled) {
        return true;
      }
      return null;
    });

    const { queryAllByTestId } = customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
        location={TransactionDetailLocation.AssetDetails}
      />,
    );

    expect(ActivityListItemRow).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 1,
        item: expect.objectContaining({
          type: 'send',
        }),
      }),
      undefined,
    );
    expect(
      jest.mocked(ActivityListItemRow).mock.calls[0][0],
    ).not.toHaveProperty('title');
    expect(queryAllByTestId('activity-list-date-header')).toHaveLength(2);
  });

  it('keeps swaps carrying bridge history on the redesigned row instead of the legacy bridge row', async () => {
    const bridgeHistoryItem = {
      status: { srcChain: { txHash: 'tx-123' } },
      quote: {
        srcChainId: SolScope.Mainnet,
        destChainId: SolScope.Mainnet,
        srcAsset: { chainId: SolScope.Mainnet, symbol: 'SOL' },
        destAsset: { chainId: SolScope.Mainnet, symbol: 'USDC' },
      },
    };

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return { transactions: mockTransactions };
      }
      if (selector === selectIsActivityRedesignEnabled) {
        return true;
      }
      if (selector === selectBridgeHistoryForAccount) {
        return { 'bridge-1': bridgeHistoryItem };
      }
      return null;
    });

    customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
        location={TransactionDetailLocation.AssetDetails}
      />,
    );

    expect(ActivityListItemRow).toHaveBeenCalledWith(
      expect.objectContaining({ bridgeHistoryItem }),
      undefined,
    );
  });

  it('classifies the receiving leg of a cross-chain bridge as a bridge row', async () => {
    // The fill tx's signature only exists on status.destChain — matched there,
    // the row must map as `bridge`, not fall back to the snap's own type.
    const bridgeHistoryItem = {
      status: {
        status: 'COMPLETE',
        srcChain: { txHash: '0xbase-source-hash' },
        destChain: { txHash: 'tx-123' },
      },
      quote: {
        srcChainId: 8453,
        destChainId: 1151111081099710,
        srcTokenAmount: '93470',
        destTokenAmount: '18260000',
        srcAsset: {
          chainId: 8453,
          assetId:
            'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          decimals: 6,
          symbol: 'USDC',
        },
        destAsset: {
          chainId: 1151111081099710,
          assetId: `${SolScope.Mainnet}/slip44:501`,
          decimals: 9,
          symbol: 'SOL',
        },
      },
    };

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return { transactions: mockTransactions };
      }
      if (selector === selectIsActivityRedesignEnabled) {
        return true;
      }
      if (selector === selectBridgeHistoryForAccount) {
        return { 'bridge-1': bridgeHistoryItem };
      }
      return null;
    });

    customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
        location={TransactionDetailLocation.AssetDetails}
      />,
    );

    expect(ActivityListItemRow).toHaveBeenCalledWith(
      expect.objectContaining({
        bridgeHistoryItem,
        item: expect.objectContaining({ type: 'bridge' }),
      }),
      undefined,
    );
  });

  it('falls back to the page chainId when a transaction has no chain', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return { transactions: [{ ...mockTransactions[0], chain: undefined }] };
      }
      if (selector === selectIsActivityRedesignEnabled) {
        return true;
      }
      return null;
    });

    customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
        location={TransactionDetailLocation.AssetDetails}
      />,
    );

    expect(ActivityListItemRow).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({ chainId: SolScope.Mainnet }),
      }),
      undefined,
    );
  });

  it('shows an EVM bridge arriving at this non-EVM asset', async () => {
    // A Base USDC -> Solana SOL bridge's only local tx is the EVM source tx, so
    // the keyring-only list can never contain it; it arrives via the prop.
    const bridgeArrival = {
      id: 'bridge-arrival-1',
      chainId: '0x2105',
      hash: '0xbase-source-hash',
      status: 'confirmed',
      time: 1742500000000,
      type: 'bridge',
      txParams: { from: '0xabc', to: '0xrouter', value: '0x0' },
    };
    const bridgeHistoryItem = {
      status: {
        status: 'COMPLETE',
        srcChain: { txHash: '0xbase-source-hash' },
        destChain: { txHash: 'solana-fill-sig' },
      },
      quote: {
        srcChainId: 8453,
        destChainId: 1151111081099710,
        srcTokenAmount: '93440',
        destTokenAmount: '971500',
        srcAsset: {
          chainId: 8453,
          assetId:
            'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          decimals: 6,
          symbol: 'USDC',
        },
        destAsset: {
          chainId: 1151111081099710,
          assetId: `${SolScope.Mainnet}/slip44:501`,
          decimals: 9,
          symbol: 'SOL',
        },
      },
    };

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return { transactions: mockTransactions };
      }
      if (selector === selectIsActivityRedesignEnabled) {
        return true;
      }
      if (selector === selectBridgeHistoryForAccount) {
        return { 'bridge-arrival-1': bridgeHistoryItem };
      }
      return null;
    });

    customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
        location={TransactionDetailLocation.AssetDetails}
        bridgeArrivalTransactions={[bridgeArrival] as never}
      />,
    );

    expect(ActivityListItemRow).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          type: 'bridge',
          raw: expect.objectContaining({ type: 'localTransaction' }),
        }),
      }),
      undefined,
    );
  });

  it('shows one row when the arrival and its indexed destination fill both exist', async () => {
    // Once the snap indexes the fill, the same bridge is reachable from the
    // arrival prop AND as a keyring tx matched by destChain.txHash.
    const FILL_SIGNATURE = 'tx-123';
    const bridgeArrival = {
      id: 'bridge-arrival-1',
      chainId: '0x2105',
      hash: '0xbase-source-hash',
      status: 'confirmed',
      time: 1742500000000,
      type: 'bridge',
      txParams: { from: '0xabc', to: '0xrouter', value: '0x0' },
    };
    const bridgeHistoryItem = {
      status: {
        status: 'COMPLETE',
        srcChain: { txHash: '0xbase-source-hash' },
        destChain: { txHash: FILL_SIGNATURE },
      },
      quote: {
        srcChainId: 8453,
        destChainId: 1151111081099710,
        srcTokenAmount: '93440',
        destTokenAmount: '971500',
        srcAsset: {
          chainId: 8453,
          assetId:
            'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          decimals: 6,
          symbol: 'USDC',
        },
        destAsset: {
          chainId: 1151111081099710,
          assetId: `${SolScope.Mainnet}/slip44:501`,
          decimals: 9,
          symbol: 'SOL',
        },
      },
    };

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        // mockTransactions[0].id === FILL_SIGNATURE, i.e. the indexed fill.
        return { transactions: mockTransactions };
      }
      if (selector === selectIsActivityRedesignEnabled) {
        return true;
      }
      if (selector === selectBridgeHistoryForAccount) {
        return { 'bridge-arrival-1': bridgeHistoryItem };
      }
      return null;
    });

    customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
        location={TransactionDetailLocation.AssetDetails}
        bridgeArrivalTransactions={[bridgeArrival] as never}
      />,
    );

    const bridgeRows = jest
      .mocked(ActivityListItemRow)
      .mock.calls.filter(([props]) => props.item?.type === 'bridge');

    expect(bridgeRows).toHaveLength(1);
    // The surviving row is the arrival (the EVM source tx), not the fill.
    expect(bridgeRows[0][0].item.raw?.type).toBe('localTransaction');
  });

  it('falls back to the bridge-status screen when a bridge arrival is tapped with details redesign off', async () => {
    const bridgeArrival = {
      id: 'bridge-arrival-1',
      chainId: '0x2105',
      hash: '0xbase-source-hash',
      status: 'confirmed',
      time: 1742500000000,
      type: 'bridge',
      txParams: { from: '0xabc', to: '0xrouter', value: '0x0' },
    };

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return { transactions: [] };
      }
      // List redesign on, details redesign off.
      if (selector === selectIsActivityRedesignEnabled) {
        return true;
      }
      if (selector === selectIsTransactionsRedesignEnabled) {
        return false;
      }
      if (selector === selectBridgeHistoryForAccount) {
        return {};
      }
      return null;
    });

    customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
        location={TransactionDetailLocation.AssetDetails}
        bridgeArrivalTransactions={[bridgeArrival] as never}
      />,
    );

    const rowProps = jest.mocked(ActivityListItemRow).mock.calls[0][0];
    rowProps.onPress?.(rowProps.item);

    // Must not be inert.
    expect(handleUnifiedSwapsTxHistoryItemClick).toHaveBeenCalledWith(
      expect.objectContaining({
        evmTxMeta: expect.objectContaining({ id: 'bridge-arrival-1' }),
      }),
    );
    expect(mockNavigation.navigate).not.toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.anything(),
    );
  });

  it('does not render view more link for bitcoin activity', async () => {
    const { queryByText } = customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={BtcScope.Mainnet}
      />,
    );

    expect(
      queryByText('transactions.view_full_history_on'),
    ).not.toBeOnTheScreen();
  });

  it('tracks External Link Clicked when view more explorer link is pressed', () => {
    customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
      />,
    );

    const { default: MockButton } = jest.requireMock(
      '../../../component-library/components/Buttons/Button',
    ) as { default: { lastProps: ButtonProps } };

    MockButton.lastProps.onPress?.();

    expect(jest.mocked(trackBlockExplorerLinkClicked)).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        location: 'multichain_activity_tab',
        url: 'https://solscan.io/account/testaddress',
      }),
    );
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: 'https://solscan.io/account/testaddress' },
    });
  });
});
