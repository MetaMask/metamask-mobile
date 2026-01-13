import React from 'react';
import { RefreshControl } from 'react-native';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import UnifiedTransactionsView from './UnifiedTransactionsView';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../../styles/common', () => ({ baseStyles: { flexGrow: {} } }));
jest.mock('../../../../locales/i18n', () => ({ strings: (k: string) => k }));
jest.mock('../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: () => ({}),
}));

const makeTextMock =
  (id: string, text: string) =>
  // eslint-disable-next-line react/display-name
  (props: any) => {
    const { Text } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    return ReactActual.createElement(
      Text,
      { testID: typeof id === 'function' ? id(props) : id },
      text,
    );
  };

jest.mock('../../UI/AssetOverview/PriceChart/PriceChart.context', () => {
  const ReactActual = jest.requireActual('react');
  const Ctx = ReactActual.createContext({ isChartBeingTouched: false });
  return {
    __esModule: true,
    default: Ctx,
    PriceChartProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});
jest.mock('../../UI/TransactionElement', () => ({
  __esModule: true,
  default: makeTextMock((p: any) => `evm-transaction-item-${p.i}`, 'evm'),
}));
jest.mock('../../UI/MultichainTransactionListItem', () => ({
  __esModule: true,
  default: makeTextMock((p: any) => `non-evm-item-${p.index}`, 'non-evm'),
}));
jest.mock('../../UI/MultichainBridgeTransactionListItem', () => ({
  __esModule: true,
  default: makeTextMock((p: any) => `bridge-item-${p.index}`, 'bridge'),
}));

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../selectors/transactionController', () => ({
  selectSortedEVMTransactionsForSelectedAccountGroup: jest.fn(),
}));
jest.mock('../../../selectors/multichain/multichain', () => ({
  selectNonEvmTransactionsForSelectedAccountGroup: jest.fn(),
}));
jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));
jest.mock('../../../selectors/tokensController', () => ({
  selectTokens: jest.fn(),
}));
jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: jest.fn(),
  }),
);
jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
  selectNetworkConfigurations: jest.fn(),
  selectProviderType: jest.fn(),
  selectRpcUrl: jest.fn(),
  selectProviderConfig: jest.fn(),
}));
jest.mock('../../../selectors/networkEnablementController', () => ({
  selectEVMEnabledNetworks: jest.fn(),
  selectNonEVMEnabledNetworks: jest.fn(),
}));
jest.mock('../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../util/activity', () => ({
  filterByAddress: jest.fn(() => true),
  isTransactionOnChains: jest.fn(() => true),
  sortTransactions: jest.fn((a: unknown[]) => a),
}));
jest.mock('../../../util/transactions', () => ({
  addAccountTimeFlagFilter: jest.fn(() => false),
}));
jest.mock('../../UI/Transactions/utils', () => ({
  filterDuplicateOutgoingTransactions: jest.fn((a: unknown[]) => a),
}));
jest.mock('../../../util/networks', () => ({
  __esModule: true,
  findBlockExplorerForRpc: jest.fn(() => 'https://explorer.example'),
  getBlockExplorerAddressUrl: jest.fn(),
}));
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { muted: '#999' },
      background: { default: '#fff' },
      primary: { default: '#00f' },
      icon: { default: '#000' },
      overlay: { default: '#000' },
    },
  }),
}));

jest.mock('../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash', () => ({
  useBridgeHistoryItemBySrcTxHash: () => ({
    bridgeHistoryItemsBySrcTxHash:
      (global as { __bridgeMap?: Record<string, unknown> }).__bridgeMap || {},
  }),
}));

const mockGetBlockExplorerUrl = jest.fn(() => undefined);
const mockGetBlockExplorerName = jest.fn(() => 'Explorer');
jest.mock('../../hooks/useBlockExplorer', () => ({
  __esModule: true,
  default: () => ({
    getBlockExplorerUrl: mockGetBlockExplorerUrl,
    getBlockExplorerName: mockGetBlockExplorerName,
  }),
}));

const mockTransactionsFooter = jest.fn();
jest.mock('../../UI/Transactions/TransactionsFooter', () => ({
  __esModule: true,
  default: (p: unknown) => {
    mockTransactionsFooter(p);
    return makeTextMock('transactions-footer', 'footer')(p);
  },
}));
const mockMultichainTransactionsFooter = jest.fn();
jest.mock('../MultichainTransactionsView/MultichainTransactionsFooter', () => ({
  __esModule: true,
  default: (p: unknown) => {
    mockMultichainTransactionsFooter(p);
    return makeTextMock('multichain-transactions-footer', 'footer')(p);
  },
}));

const mockGetAddressUrl = jest.fn(
  (_address?: string, _chainId?: string) => 'https://solscan.io/account/0xabc',
);
jest.mock('../../../core/Multichain/utils', () => ({
  __esModule: true,
  getAddressUrl: (a: string, c: string) => mockGetAddressUrl(a, c),
  isNonEvmChainId: jest.fn((c: string) => c.includes(':')),
}));

jest.mock('../../../util/transaction-controller', () => ({
  updateIncomingTransactions: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./useUnifiedTxActions', () => {
  const d = {
    retryIsOpen: false,
    retryErrorMsg: undefined,
    speedUpIsOpen: false,
    cancelIsOpen: false,
    speedUp1559IsOpen: false,
    cancel1559IsOpen: false,
    speedUpConfirmDisabled: false,
    cancelConfirmDisabled: false,
    existingGas: null,
    existingTx: null,
    speedUpTxId: null,
    cancelTxId: null,
    toggleRetry: jest.fn(),
    onSpeedUpAction: jest.fn(),
    onCancelAction: jest.fn(),
    onSpeedUpCompleted: jest.fn(),
    onCancelCompleted: jest.fn(),
    speedUpTransaction: jest.fn(),
    cancelTransaction: jest.fn(),
    signQRTransaction: jest.fn(),
    signLedgerTransaction: jest.fn(),
    cancelUnsignedQRTransaction: jest.fn(),
  };
  return {
    useUnifiedTxActions: () =>
      (global as { __actionsState?: Partial<typeof d> }).__actionsState || d,
  };
});

jest.mock('../../UI/TransactionActionModal', () => ({
  __esModule: true,
  default: ({
    isVisible,
    titleText,
  }: {
    isVisible: boolean;
    titleText?: string;
  }) =>
    isVisible
      ? makeTextMock(
          titleText?.includes('speedup') ? 'speedup-modal' : 'cancel-modal',
          'modal',
        )({})
      : null,
}));
jest.mock('../confirmations/legacy/components/UpdateEIP1559Tx', () => ({
  __esModule: true,
  default: makeTextMock('eip1559-modal', 'eip1559'),
}));
jest.mock('../../UI/Transactions/RetryModal', () => ({
  __esModule: true,
  default: ({ retryIsOpen }: { retryIsOpen: boolean }) =>
    retryIsOpen ? makeTextMock('retry-modal', 'retry')({}) : null,
}));

const { selectSortedEVMTransactionsForSelectedAccountGroup } = jest.requireMock(
  '../../../selectors/transactionController',
);
const { selectNonEvmTransactionsForSelectedAccountGroup } = jest.requireMock(
  '../../../selectors/multichain/multichain',
);
const { selectSelectedInternalAccount } = jest.requireMock(
  '../../../selectors/accountsController',
);
const { selectSelectedAccountGroupInternalAccounts } = jest.requireMock(
  '../../../selectors/multichainAccounts/accountTreeController',
);
const { selectTokens } = jest.requireMock(
  '../../../selectors/tokensController',
);
const {
  selectEvmNetworkConfigurationsByChainId,
  selectNetworkConfigurations,
  selectProviderType,
  selectRpcUrl,
  selectProviderConfig,
} = jest.requireMock('../../../selectors/networkController');
const { selectEVMEnabledNetworks, selectNonEVMEnabledNetworks } =
  jest.requireMock('../../../selectors/networkEnablementController');
const { selectCurrentCurrency } = jest.requireMock(
  '../../../selectors/currencyRateController',
);
const { updateIncomingTransactions } = jest.requireMock(
  '../../../util/transaction-controller',
);
const networksMock = jest.requireMock('../../../util/networks');

type Overrides = Array<[unknown, unknown]>;
const ACC_EVM = { address: '0xabc', type: 'eip155:eoa' };
const ACC_SOL = {
  address: 'SoLAddreSS11111111111111111111111',
  type: 'solana:data-account',
};
const DEFAULTS: Overrides = [
  [selectSortedEVMTransactionsForSelectedAccountGroup, []],
  [selectNonEvmTransactionsForSelectedAccountGroup, { transactions: [] }],
  [
    selectSelectedInternalAccount,
    { address: '0xabc', metadata: { importTime: 0 } },
  ],
  [selectSelectedAccountGroupInternalAccounts, [ACC_EVM, ACC_SOL]],
  [selectTokens, []],
  [
    selectEvmNetworkConfigurationsByChainId,
    {
      '0x1': {
        blockExplorerUrls: ['https://explorer.example'],
        defaultBlockExplorerUrlIndex: 0,
      },
    },
  ],
  [selectNetworkConfigurations, {}],
  [selectProviderType, 'rpc'],
  [selectRpcUrl, 'https://rpc.example'],
  [selectProviderConfig, { type: 'rpc', rpcUrl: 'https://rpc.example' }],
  [selectEVMEnabledNetworks, ['0x1']],
  [selectNonEVMEnabledNetworks, ['solana:mainnet']],
  [selectCurrentCurrency, 'USD'],
];

const withSelectors = (overrides: Overrides = []) => {
  const map = new Map([...DEFAULTS, ...overrides]);
  (useSelector as unknown as jest.Mock).mockImplementation((s: unknown) =>
    map.get(s),
  );
};

describe('UnifiedTransactionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionsFooter.mockClear();
    mockMultichainTransactionsFooter.mockClear();
    mockGetAddressUrl.mockClear();
    mockGetBlockExplorerUrl.mockClear();
    mockGetBlockExplorerName.mockClear();
    mockGetBlockExplorerUrl.mockReturnValue(undefined);
    mockGetBlockExplorerName.mockReturnValue('Explorer');
    mockGetAddressUrl.mockImplementation(
      (a?: string) => `https://solscan.io/account/${a}`,
    );
    networksMock.getBlockExplorerAddressUrl.mockClear();
    networksMock.getBlockExplorerAddressUrl.mockImplementation(() => ({
      url: 'https://explorer.example/address/0xabc',
      title: 'explorer.example',
    }));
    (global as any).__actionsState = undefined;
    (global as any).__bridgeMap = {};
    withSelectors();
  });

  it('renders empty state when there are no transactions', () => {
    expect(
      render(<UnifiedTransactionsView />).getByText('wallet.no_transactions'),
    ).toBeTruthy();
  });

  it('renders EVM transactions via TransactionElement list items', () => {
    withSelectors([
      [
        selectSortedEVMTransactionsForSelectedAccountGroup,
        [
          {
            id: 'a',
            status: 'submitted',
            txParams: { from: '0xabc', nonce: '0x1' },
            chainId: '0x1',
            time: 2,
          },
          {
            id: 'b',
            status: 'confirmed',
            txParams: { from: '0xabc', nonce: '0x2' },
            chainId: '0x1',
            time: 1,
          },
        ],
      ],
    ]);
    expect(
      render(<UnifiedTransactionsView />).queryAllByTestId(
        /evm-transaction-item-/,
      ).length,
    ).toBe(2);
  });

  describe('nonce check in alreadyConfirmed filtering', () => {
    const base = (submittedNonce: any, confirmedNonce: any) =>
      [
        [
          selectSortedEVMTransactionsForSelectedAccountGroup,
          [
            {
              id: 'a',
              status: 'submitted',
              txParams: { from: '0xabc', nonce: submittedNonce },
              chainId: '0x1',
              time: 2,
            },
            {
              id: 'b',
              status: 'confirmed',
              txParams: { from: '0xabc', nonce: confirmedNonce },
              chainId: '0x1',
              time: 1,
            },
          ],
        ],
        [selectSelectedAccountGroupInternalAccounts, [ACC_EVM]],
      ] as Overrides;

    it.each([
      ['includes undefined nonce', undefined, '0x1', 2],
      ['includes null nonce', null, '0x1', 2],
      ['filters matching nonce', '0x1', '0x1', 1],
      ['includes non-matching nonce', '0x2', '0x1', 2],
    ])('%s', (_label, sub, conf, count) => {
      withSelectors(base(sub, conf));
      expect(
        render(<UnifiedTransactionsView />).queryAllByTestId(
          /evm-transaction-item-/,
        ).length,
      ).toBe(count);
    });
  });

  describe('dedupeKey logic with actionId', () => {
    it('includes multiple transactions with different actionIds when nonce is undefined', () => {
      withSelectors([
        [
          selectSortedEVMTransactionsForSelectedAccountGroup,
          [
            {
              id: 'a',
              status: 'submitted',
              txParams: { from: '0xabc', actionId: 'action-123' },
              chainId: '0x1',
              time: 2,
            },
            {
              id: 'b',
              status: 'submitted',
              txParams: { from: '0xabc', actionId: 'action-456' },
              chainId: '0x1',
              time: 1,
            },
          ],
        ],
      ]);
      expect(
        render(<UnifiedTransactionsView />).queryAllByTestId(
          /evm-transaction-item-/,
        ).length,
      ).toBe(2);
    });

    it('uses nonce for deduplication when nonce is defined', () => {
      withSelectors([
        [
          selectSortedEVMTransactionsForSelectedAccountGroup,
          [
            {
              id: 'a',
              status: 'submitted',
              txParams: { from: '0xabc', nonce: '0x1', actionId: 'action-123' },
              chainId: '0x1',
              time: 2,
            },
            {
              id: 'b',
              status: 'submitted',
              txParams: { from: '0xabc', nonce: '0x1', actionId: 'action-456' },
              chainId: '0x1',
              time: 1,
            },
          ],
        ],
      ]);
      expect(
        render(<UnifiedTransactionsView />).queryAllByTestId(
          /evm-transaction-item-/,
        ).length,
      ).toBe(1);
    });

    it('uses actionId when nonce is null', () => {
      withSelectors([
        [
          selectSortedEVMTransactionsForSelectedAccountGroup,
          [
            {
              id: 'a',
              status: 'submitted',
              txParams: { from: '0xabc', nonce: null, actionId: 'action-123' },
              chainId: '0x1',
              time: 2,
            },
            {
              id: 'b',
              status: 'submitted',
              txParams: { from: '0xabc', nonce: null, actionId: 'action-456' },
              chainId: '0x1',
              time: 1,
            },
          ],
        ],
      ]);
      expect(
        render(<UnifiedTransactionsView />).queryAllByTestId(
          /evm-transaction-item-/,
        ).length,
      ).toBe(2);
    });
  });

  it('pull-to-refresh calls updateIncomingTransactions', async () => {
    const { UNSAFE_getAllByType } = render(<UnifiedTransactionsView />);
    const [rc] = UNSAFE_getAllByType(RefreshControl);
    await rc.props.onRefresh();
    expect(updateIncomingTransactions).toHaveBeenCalled();
  });

  it('renders non-EVM transactions', () => {
    withSelectors([
      [selectSortedEVMTransactionsForSelectedAccountGroup, []],
      [
        selectNonEvmTransactionsForSelectedAccountGroup,
        {
          transactions: [
            { id: 'n1', timestamp: 1000, chain: 'solana:mainnet' },
            { id: 'n2', timestamp: 2000, chain: 'solana:mainnet' },
          ],
        },
      ],
    ]);
    expect(
      render(<UnifiedTransactionsView />).queryAllByTestId(/non-evm-item-/)
        .length,
    ).toBe(2);
  });

  it('renders TransactionsFooter when only EVM networks are enabled', () => {
    withSelectors([[selectNonEVMEnabledNetworks, []]]);
    render(<UnifiedTransactionsView />);
    expect(mockTransactionsFooter).toHaveBeenCalledTimes(1);
    expect(mockMultichainTransactionsFooter).not.toHaveBeenCalled();
    const p = mockTransactionsFooter.mock.calls[0][0] as {
      chainId?: string;
      providerType?: string;
      rpcBlockExplorer?: string;
    };
    expect(p.chainId).toBe('0x1');
    expect(p.providerType).toBe('rpc');
    expect(p.rpcBlockExplorer).toBe('https://explorer.example');
  });

  describe('block explorer url', () => {
    it('uses selected chain block explorer when a single chain is enabled', () => {
      withSelectors([
        [selectNonEVMEnabledNetworks, []],
        [
          selectEvmNetworkConfigurationsByChainId,
          {
            '0x5': {
              blockExplorerUrls: [
                'https://explorer0.example',
                'https://explorer1.example',
              ],
              defaultBlockExplorerUrlIndex: 1,
            },
          },
        ],
        [selectEVMEnabledNetworks, ['0x5']],
        [selectSelectedAccountGroupInternalAccounts, [ACC_EVM]],
      ]);
      render(<UnifiedTransactionsView />);
      const p = mockTransactionsFooter.mock.calls[0][0] as {
        rpcBlockExplorer?: string;
        onViewBlockExplorer?: () => void;
      };
      expect(p.rpcBlockExplorer).toBe('https://explorer1.example');
      p.onViewBlockExplorer?.();
      expect(networksMock.getBlockExplorerAddressUrl).toHaveBeenCalledWith(
        'rpc',
        '0xabc',
        'https://explorer1.example',
      );
    });

    it('omits block explorer when multiple EVM chains are selected', () => {
      withSelectors([
        [selectNonEVMEnabledNetworks, []],
        [
          selectEvmNetworkConfigurationsByChainId,
          {
            '0x1': {
              blockExplorerUrls: ['https://explorer0.example'],
              defaultBlockExplorerUrlIndex: 0,
            },
            '0x5': {
              blockExplorerUrls: ['https://explorer1.example'],
              defaultBlockExplorerUrlIndex: 0,
            },
          },
        ],
        [selectEVMEnabledNetworks, ['0x1', '0x5']],
        [selectSelectedAccountGroupInternalAccounts, [ACC_EVM]],
      ]);
      render(<UnifiedTransactionsView />);
      const p = mockTransactionsFooter.mock.calls[0][0] as {
        rpcBlockExplorer?: string;
      };
      expect(p.rpcBlockExplorer).toBeUndefined();
      expect(networksMock.getBlockExplorerAddressUrl).not.toHaveBeenCalled();
    });
  });

  it('renders MultichainTransactionsFooter with explorer link for Solana-only selection', () => {
    withSelectors([
      [selectEVMEnabledNetworks, []],
      [selectNonEVMEnabledNetworks, ['solana:mainnet']],
      [
        selectNonEvmTransactionsForSelectedAccountGroup,
        {
          transactions: [
            { id: 'n1', timestamp: 1000, chain: 'solana:mainnet' },
          ],
        },
      ],
    ]);
    render(<UnifiedTransactionsView />);
    expect(mockMultichainTransactionsFooter).toHaveBeenCalledTimes(1);
    const p = mockMultichainTransactionsFooter.mock.calls[0][0] as {
      showExplorerLink?: boolean;
      hasTransactions?: boolean;
      url?: string;
    };
    expect(p.showExplorerLink).toBe(true);
    expect(p.hasTransactions).toBe(true);
    expect(p.url).toContain('solscan.io');
    expect(p.url).toContain(ACC_SOL.address);
    expect(mockTransactionsFooter).not.toHaveBeenCalled();
  });

  it('hides explorer link when enabled non-EVM chains are not all Solana', () => {
    mockGetAddressUrl.mockImplementation(() => '');
    withSelectors([
      [selectEVMEnabledNetworks, []],
      [
        selectNonEVMEnabledNetworks,
        ['bip122:000000000019d6689c085ae165831e93'],
      ],
      [
        selectSelectedAccountGroupInternalAccounts,
        [{ address: 'bc1abcd', type: 'bip122:p2wpkh' }],
      ],
      [
        selectNonEvmTransactionsForSelectedAccountGroup,
        {
          transactions: [
            {
              id: 'n1',
              timestamp: 1000,
              chain: 'bip122:000000000019d6689c085ae165831e93',
            },
          ],
        },
      ],
    ]);
    render(<UnifiedTransactionsView />);
    const p = mockMultichainTransactionsFooter.mock.calls[0][0] as {
      showExplorerLink?: boolean;
      url?: string;
    };
    expect(p.showExplorerLink).toBe(false);
    expect(p.url).toBe('');
  });

  describe('nonEvmExplorerChainId resolution', () => {
    it('uses prop chainId when no non-EVM networks are enabled and chainId is CAIP', () => {
      withSelectors([
        [selectEVMEnabledNetworks, []],
        [selectNonEVMEnabledNetworks, []],
      ]);
      render(<UnifiedTransactionsView chainId="solana:mainnet" />);
      expect(mockGetAddressUrl).toHaveBeenCalledWith(
        ACC_SOL.address,
        'solana:mainnet',
      );
    });

    it('returns undefined when no non-EVM networks and prop chainId is not CAIP', () => {
      withSelectors([
        [selectEVMEnabledNetworks, []],
        [selectNonEVMEnabledNetworks, []],
      ]);
      render(<UnifiedTransactionsView chainId="0x1" />);
      expect(mockGetAddressUrl).not.toHaveBeenCalled();
    });
  });

  describe('non-TransactionMeta EVM transactions status handling', () => {
    it.each([
      'submitted',
      'signed',
      'unapproved',
      'approved',
      'pending',
    ] as const)('includes non-meta EVM tx with status %s', (status) => {
      withSelectors([
        [
          selectSortedEVMTransactionsForSelectedAccountGroup,
          [
            {
              id: 'smart-1',
              status,
              txParams: { from: '0xabc', nonce: '0x1' },
              time: 10,
            },
          ],
        ],
        [selectSelectedAccountGroupInternalAccounts, [ACC_EVM]],
      ]);
      expect(
        render(<UnifiedTransactionsView />).queryAllByTestId(
          /evm-transaction-item-/,
        ).length,
      ).toBe(1);
    });

    it('excludes non-meta EVM tx when status is not allowlisted', () => {
      withSelectors([
        [
          selectSortedEVMTransactionsForSelectedAccountGroup,
          [
            {
              id: 'smart-2',
              status: 'failed',
              txParams: { from: '0xabc', nonce: '0x1' },
              time: 10,
            },
          ],
        ],
        [selectSelectedAccountGroupInternalAccounts, [ACC_EVM]],
      ]);
      expect(
        render(<UnifiedTransactionsView />).queryAllByTestId(
          /evm-transaction-item-/,
        ).length,
      ).toBe(0);
    });
  });

  it('renders bridge non-EVM item when bridge history exists', () => {
    (global as any).__bridgeMap = { n1: { some: 'bridge' } };
    withSelectors([
      [
        selectNonEvmTransactionsForSelectedAccountGroup,
        {
          transactions: [
            { id: 'n1', timestamp: 1000, chain: 'solana:mainnet' },
            { id: 'n2', timestamp: 2000, chain: 'solana:mainnet' },
          ],
        },
      ],
      [selectSelectedAccountGroupInternalAccounts, [ACC_EVM]],
    ]);
    const r = render(<UnifiedTransactionsView />);
    expect(r.queryAllByTestId(/bridge-item-/).length).toBe(1);
    expect(r.queryAllByTestId(/non-evm-item-/).length).toBe(1);
  });

  it('shows legacy speedup and cancel modals when open', () => {
    (global as any).__actionsState = {
      speedUpIsOpen: true,
      cancelIsOpen: true,
    };
    const r = render(<UnifiedTransactionsView />);
    expect(r.getByTestId('speedup-modal')).toBeTruthy();
    expect(r.getByTestId('cancel-modal')).toBeTruthy();
  });

  it('shows EIP-1559 modal when speedUp1559IsOpen or cancel1559IsOpen is true', () => {
    (global as any).__actionsState = { speedUp1559IsOpen: true };
    const r = render(<UnifiedTransactionsView />);
    expect(r.getByTestId('eip1559-modal')).toBeTruthy();
    (global as any).__actionsState = { cancel1559IsOpen: true };
    r.rerender(<UnifiedTransactionsView />);
    expect(r.getByTestId('eip1559-modal')).toBeTruthy();
  });
});
