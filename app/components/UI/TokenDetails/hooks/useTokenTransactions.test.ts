import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenTransactions } from './useTokenTransactions';
import { TokenI } from '../../Tokens/types';
import { TX_CONFIRMED, TX_SUBMITTED } from '../../../../constants/transaction';
import { selectTransactions } from '../../../../selectors/transactionController';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import { selectIsActivityRedesignEnabled } from '../../../../selectors/featureFlagController/activityRedesign';
import { selectTokens } from '../../../../selectors/tokensController';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { TransactionType } from '@metamask/transaction-controller';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../../selectors/multichain';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  // Real `formatChainIdToHex` / `isNonEvmChainId` so `getMaybeHexChainId`
  // normalizes destination chain ids for real in these tests.
  ...jest.requireActual('@metamask/bridge-controller'),
  formatChainIdToCaip: jest.fn((chainId: string) => `eip155:${chainId}`),
}));

jest.mock('../../../../selectors/tokensController', () => ({
  selectTokens: jest.fn(),
}));

jest.mock('../../../../selectors/transactionController', () => ({
  selectTransactions: jest.fn(),
  selectSwapsTransactions: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/activityRedesign',
  () => ({
    selectIsActivityRedesignEnabled: jest.fn(),
  }),
);

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
  selectSelectedInternalAccountAddress: jest.fn(),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectConversionRate: jest.fn(),
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../util/activity', () => ({
  sortTransactions: jest.fn((txs: unknown[]) => txs),
}));

jest.mock('../../../../util/transactions', () => ({
  addAccountTimeFlagFilter: jest.fn(() => false),
}));

jest.mock('../../../../util/transaction-controller', () => ({
  updateIncomingTransactions: jest.fn(),
}));

jest.mock('../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn(() => false),
}));

jest.mock('../../Earn/utils/musd', () => ({
  isMusdClaimForCurrentView: jest.fn(() => false),
}));

jest.mock('../../../../selectors/multichain', () => ({
  selectNonEvmTransactionsForSelectedAccountGroup: jest.fn(),
}));

jest.mock('../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn(),
}));

jest.mock('../../../../selectors/accountTrackerController', () => ({
  selectAccounts: jest.fn(),
  selectAccountsByChainId: jest.fn(),
}));

jest.mock('../../../UI/TransactionElement/utils', () => ({
  TOKEN_CATEGORY_HASH: {
    tokenMethodApprove: true,
    tokenMethodSetApprovalForAll: true,
    tokenMethodTransfer: true,
    tokenMethodTransferFrom: true,
    tokenMethodIncreaseAllowance: true,
  },
}));

jest.mock('../../../../store', () => ({
  store: {
    getState: () => ({
      inpageProvider: { networkId: '1' },
    }),
  },
}));

const MOCK_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const MOCK_RECIPIENT = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const MONAD_CHAIN_ID = '0x279f';
const ETH_CHAIN_ID = '0x1';
const MOCK_TOKEN_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';
const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOL_ASSET_ID = `${SOLANA_CHAIN_ID}/slip44:501`;
const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_ASSET_ID = `${SOLANA_CHAIN_ID}/token:${USDC_ADDRESS}`;
const SOLANA_ADDRESS = '7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv';

const mockUseSelector = jest.mocked(useSelector);

const createMockTransaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1',
  chainId: ETH_CHAIN_ID,
  status: TX_CONFIRMED,
  time: Date.now(),
  txParams: {
    from: MOCK_ADDRESS,
    to: MOCK_RECIPIENT,
  },
  isTransfer: false,
  ...overrides,
});

const createAsset = (overrides: Partial<TokenI> = {}): TokenI => ({
  address: '',
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
  balance: '1000000000000000000',
  logo: undefined,
  isETH: true,
  chainId: ETH_CHAIN_ID,
  isNative: true,
  ...overrides,
});

const setupMocks = (
  transactions: unknown[] = [],
  {
    isActivityRedesignEnabled = false,
    bridgeHistory = {} as Record<string, unknown>,
  } = {},
) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectTransactions) return transactions;
    if (selector === selectBridgeHistoryForAccount) return bridgeHistory;
    if (selector === selectIsActivityRedesignEnabled)
      return isActivityRedesignEnabled;
    if (selector === selectTokens) return [];
    if (selector === selectSelectedInternalAccount) {
      return { address: MOCK_ADDRESS, metadata: { importTime: 0 } };
    }
    if (selector === selectSelectedInternalAccountByScope) {
      return () => ({ address: MOCK_ADDRESS });
    }
    if (selector === selectConversionRate) return 1;
    if (selector === selectCurrentCurrency) return 'usd';
    // Inline selector for selectedAddressForAsset
    return MOCK_ADDRESS;
  });
};

describe('useTokenTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('filter selection for native tokens', () => {
    it('includes native send transaction for ETH (isETH=true)', async () => {
      const tx = createMockTransaction({ chainId: ETH_CHAIN_ID });
      setupMocks([tx]);

      const asset = createAsset({
        symbol: 'ETH',
        isETH: true,
        isNative: true,
        address: '',
        chainId: ETH_CHAIN_ID,
      });

      const { result } = renderHook(() => useTokenTransactions(asset));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.confirmedTxs.length).toBe(1);
    });

    it('includes native send transaction for non-ETH native token (MON on Monad)', async () => {
      const tx = createMockTransaction({
        chainId: MONAD_CHAIN_ID,
        txParams: { from: MOCK_ADDRESS, to: MOCK_RECIPIENT },
      });
      setupMocks([tx]);

      const asset = createAsset({
        symbol: 'MON',
        isETH: false,
        isNative: true,
        address: '0x0000000000000000000000000000000000000000',
        chainId: MONAD_CHAIN_ID,
      });

      const { result } = renderHook(() => useTokenTransactions(asset));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      // Core regression test: MON native sends must appear
      expect(result.current.confirmedTxs.length).toBe(1);
    });

    it('excludes token-category transactions from native token view', async () => {
      const tx = createMockTransaction({
        chainId: MONAD_CHAIN_ID,
        type: 'tokenMethodTransfer',
        txParams: { from: MOCK_ADDRESS, to: MOCK_TOKEN_ADDRESS },
      });
      setupMocks([tx]);

      const asset = createAsset({
        symbol: 'MON',
        isETH: false,
        isNative: true,
        address: '0x0000000000000000000000000000000000000000',
        chainId: MONAD_CHAIN_ID,
      });

      const { result } = renderHook(() => useTokenTransactions(asset));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.confirmedTxs.length).toBe(0);
      expect(result.current.transactions.length).toBe(0);
    });

    it('includes ERC20 token transaction in token-specific view', async () => {
      const tx = createMockTransaction({
        chainId: ETH_CHAIN_ID,
        txParams: { from: MOCK_ADDRESS, to: MOCK_TOKEN_ADDRESS },
      });
      setupMocks([tx]);

      const asset = createAsset({
        symbol: 'DAI',
        isETH: false,
        isNative: false,
        address: MOCK_TOKEN_ADDRESS,
        chainId: ETH_CHAIN_ID,
      });

      const { result } = renderHook(() => useTokenTransactions(asset));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.confirmedTxs.length).toBe(1);
    });

    it('excludes unrelated transactions from ERC20 token view', async () => {
      const tx = createMockTransaction({
        chainId: ETH_CHAIN_ID,
        txParams: { from: MOCK_ADDRESS, to: MOCK_RECIPIENT },
      });
      setupMocks([tx]);

      const asset = createAsset({
        symbol: 'DAI',
        isETH: false,
        isNative: false,
        address: MOCK_TOKEN_ADDRESS,
        chainId: ETH_CHAIN_ID,
      });

      const { result } = renderHook(() => useTokenTransactions(asset));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.confirmedTxs.length).toBe(0);
    });

    it('includes gas-sponsored native send for non-ETH chain', async () => {
      const tx = createMockTransaction({
        chainId: MONAD_CHAIN_ID,
        txParams: {
          from: MOCK_ADDRESS,
          to: MOCK_RECIPIENT,
          gasPrice: '0x0',
          maxFeePerGas: '0x0',
        },
      });
      setupMocks([tx]);

      const asset = createAsset({
        symbol: 'MON',
        isETH: false,
        isNative: true,
        address: '0x0000000000000000000000000000000000000000',
        chainId: MONAD_CHAIN_ID,
      });

      const { result } = renderHook(() => useTokenTransactions(asset));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      // Gas-sponsored (zero gas fee) native sends must still appear
      expect(result.current.confirmedTxs.length).toBe(1);
    });
  });

  describe('cross-chain filtering', () => {
    it('excludes transactions from a different chain', async () => {
      const tx = createMockTransaction({
        chainId: ETH_CHAIN_ID,
        txParams: { from: MOCK_ADDRESS, to: MOCK_RECIPIENT },
      });
      setupMocks([tx]);

      const asset = createAsset({
        symbol: 'MON',
        isETH: false,
        isNative: true,
        address: '0x0000000000000000000000000000000000000000',
        chainId: MONAD_CHAIN_ID,
      });

      const { result } = renderHook(() => useTokenTransactions(asset));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.confirmedTxs.length).toBe(0);
    });
  });

  describe('gas_payment fee legs', () => {
    it('hides gas_payment transactions when activity redesign is on', async () => {
      const send = createMockTransaction({
        id: 'send',
        type: TransactionType.simpleSend,
        txParams: { from: MOCK_ADDRESS, to: MOCK_TOKEN_ADDRESS },
      });
      const fee = createMockTransaction({
        id: 'fee',
        type: TransactionType.gasPayment,
        txParams: { from: MOCK_ADDRESS, to: MOCK_TOKEN_ADDRESS },
      });
      setupMocks([send, fee], { isActivityRedesignEnabled: true });

      const asset = createAsset({
        symbol: 'USDT',
        isETH: false,
        isNative: false,
        address: MOCK_TOKEN_ADDRESS,
      });

      const { result } = renderHook(() => useTokenTransactions(asset));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual(['send']);
    });

    it('keeps gas_payment transactions when activity redesign is off', async () => {
      const send = createMockTransaction({
        id: 'send',
        type: TransactionType.simpleSend,
        txParams: { from: MOCK_ADDRESS, to: MOCK_TOKEN_ADDRESS },
      });
      const fee = createMockTransaction({
        id: 'fee',
        type: TransactionType.gasPayment,
        txParams: { from: MOCK_ADDRESS, to: MOCK_TOKEN_ADDRESS },
      });
      setupMocks([send, fee], { isActivityRedesignEnabled: false });

      const asset = createAsset({
        symbol: 'USDT',
        isETH: false,
        isNative: false,
        address: MOCK_TOKEN_ADDRESS,
      });

      const { result } = renderHook(() => useTokenTransactions(asset));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id).sort()).toEqual([
        'fee',
        'send',
      ]);
    });
  });

  describe('EVM swaps on ERC-20 token pages', () => {
    const SWAP_ROUTER = '0x0439e60f02a8900a951603950d8d4527f400c3f1';
    const DAI_ADDRESS = MOCK_TOKEN_ADDRESS;
    const UNRELATED_TOKEN = '0x111111111117dc0aa78b770fa6a738034120c302';

    // Unified swaps route through the bridge/swaps router, so `txParams.to` is
    // never the token contract and the tx is not an ERC-20 transfer.
    const createSwapTransaction = (overrides: Record<string, unknown> = {}) =>
      createMockTransaction({
        id: 'swap-1',
        type: TransactionType.swap,
        txParams: { from: MOCK_ADDRESS, to: SWAP_ROUTER },
        ...overrides,
      });

    const createQuoteBridgeHistory = ({
      txId = 'swap-1',
      srcAddress,
      destAddress,
    }: {
      txId?: string;
      srcAddress: string;
      destAddress: string;
    }) => ({
      [txId]: {
        quote: {
          srcChainId: ETH_CHAIN_ID,
          destChainId: ETH_CHAIN_ID,
          srcAsset: { address: srcAddress, symbol: 'SRC' },
          destAsset: { address: destAddress, symbol: 'DST' },
        },
      },
    });

    const erc20Asset = (address: string, symbol: string) =>
      createAsset({
        symbol,
        isETH: false,
        isNative: false,
        address,
        chainId: ETH_CHAIN_ID,
      });

    it('includes a swap on the source token page', async () => {
      setupMocks([createSwapTransaction()], {
        bridgeHistory: createQuoteBridgeHistory({
          srcAddress: DAI_ADDRESS,
          destAddress: NATIVE_ADDRESS,
        }),
      });

      const { result } = renderHook(() =>
        useTokenTransactions(erc20Asset(DAI_ADDRESS, 'DAI')),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'swap-1',
      ]);
    });

    it('includes a swap on the destination token page', async () => {
      setupMocks([createSwapTransaction()], {
        bridgeHistory: createQuoteBridgeHistory({
          srcAddress: NATIVE_ADDRESS,
          destAddress: DAI_ADDRESS,
        }),
      });

      const { result } = renderHook(() =>
        useTokenTransactions(erc20Asset(DAI_ADDRESS, 'DAI')),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'swap-1',
      ]);
    });

    it('resolves bridge history keyed by actionId rather than tx id', async () => {
      setupMocks([createSwapTransaction({ actionId: 'action-1' })], {
        bridgeHistory: createQuoteBridgeHistory({
          txId: 'action-1',
          srcAddress: DAI_ADDRESS,
          destAddress: NATIVE_ADDRESS,
        }),
      });

      const { result } = renderHook(() =>
        useTokenTransactions(erc20Asset(DAI_ADDRESS, 'DAI')),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'swap-1',
      ]);
    });

    it('excludes a swap between two unrelated tokens', async () => {
      setupMocks([createSwapTransaction()], {
        bridgeHistory: createQuoteBridgeHistory({
          srcAddress: UNRELATED_TOKEN,
          destAddress: NATIVE_ADDRESS,
        }),
      });

      const { result } = renderHook(() =>
        useTokenTransactions(erc20Asset(DAI_ADDRESS, 'DAI')),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions).toEqual([]);
    });

    it('includes a bridge whose source leg is this token', async () => {
      setupMocks([createSwapTransaction({ type: TransactionType.bridge })], {
        bridgeHistory: {
          'swap-1': {
            quote: {
              srcChainId: ETH_CHAIN_ID,
              destChainId: '0x2105',
              srcAsset: { address: DAI_ADDRESS, symbol: 'DAI' },
              destAsset: { address: DAI_ADDRESS, symbol: 'DAI' },
            },
          },
        },
      });

      const { result } = renderHook(() =>
        useTokenTransactions(erc20Asset(DAI_ADDRESS, 'DAI')),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'swap-1',
      ]);
    });

    it('falls back to swap symbols for legacy transactions with no bridge history', async () => {
      setupMocks([
        createSwapTransaction({
          swapMetaData: { token_from: 'DAI', token_to: 'ETH' },
        }),
      ]);

      const { result } = renderHook(() =>
        useTokenTransactions(erc20Asset(DAI_ADDRESS, 'DAI')),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'swap-1',
      ]);
    });

    it('ignores the symbol fallback when the quote already names both legs', async () => {
      setupMocks(
        [
          createSwapTransaction({
            // An impostor token sharing DAI's symbol must not hijack the page
            // when the quote gives authoritative addresses.
            sourceTokenSymbol: 'DAI',
          }),
        ],
        {
          bridgeHistory: createQuoteBridgeHistory({
            srcAddress: UNRELATED_TOKEN,
            destAddress: NATIVE_ADDRESS,
          }),
        },
      );

      const { result } = renderHook(() =>
        useTokenTransactions(erc20Asset(DAI_ADDRESS, 'DAI')),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions).toEqual([]);
    });

    it('does not treat non-swap transactions as swaps', async () => {
      setupMocks([
        createSwapTransaction({
          type: TransactionType.contractInteraction,
          swapMetaData: { token_from: 'DAI', token_to: 'ETH' },
        }),
      ]);

      const { result } = renderHook(() =>
        useTokenTransactions(erc20Asset(DAI_ADDRESS, 'DAI')),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions).toEqual([]);
    });
  });

  describe('bridge arrivals on the destination chain page', () => {
    const BASE_CHAIN_ID = '0x2105';
    const DAI_ADDRESS = MOCK_TOKEN_ADDRESS;
    const UNRELATED_TOKEN = '0x111111111117dc0aa78b770fa6a738034120c302';

    // Source tx lives on Base; the destination leg has no local tx at all.
    const createBaseBridge = (destAsset: { address: string; symbol: string }) =>
      createMockTransaction({
        id: 'bridge-1',
        chainId: BASE_CHAIN_ID,
        type: TransactionType.bridge,
        txParams: { from: MOCK_ADDRESS, to: MOCK_RECIPIENT },
      });

    const bridgeHistoryTo = (
      destChainId: unknown,
      destAddress: string,
      destSymbol = 'DST',
    ) => ({
      'bridge-1': {
        quote: {
          srcChainId: 8453,
          destChainId,
          srcAsset: { address: UNRELATED_TOKEN, symbol: 'USDC' },
          destAsset: { address: destAddress, symbol: destSymbol },
        },
      },
    });

    const nativeAsset = (chainIdValue: string) =>
      createAsset({
        symbol: 'ETH',
        isETH: true,
        isNative: true,
        address: NATIVE_ADDRESS,
        chainId: chainIdValue,
      });

    it('shows a bridge arriving as native on the destination native page', async () => {
      setupMocks(
        [createBaseBridge({ address: NATIVE_ADDRESS, symbol: 'ETH' })],
        {
          // Quotes carry EVM chain ids as numbers.
          bridgeHistory: bridgeHistoryTo(1, NATIVE_ADDRESS, 'ETH'),
        },
      );

      const { result } = renderHook(() =>
        useTokenTransactions(nativeAsset(ETH_CHAIN_ID)),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'bridge-1',
      ]);
    });

    it('shows a bridge arriving as an ERC-20 on the destination token page', async () => {
      setupMocks([createBaseBridge({ address: DAI_ADDRESS, symbol: 'DAI' })], {
        bridgeHistory: bridgeHistoryTo(1, DAI_ADDRESS, 'DAI'),
      });

      const { result } = renderHook(() =>
        useTokenTransactions(
          createAsset({
            symbol: 'DAI',
            isETH: false,
            isNative: false,
            address: DAI_ADDRESS,
            chainId: ETH_CHAIN_ID,
          }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'bridge-1',
      ]);
    });

    it('accepts a hex destChainId as well as a number', async () => {
      setupMocks(
        [createBaseBridge({ address: NATIVE_ADDRESS, symbol: 'ETH' })],
        {
          bridgeHistory: bridgeHistoryTo('0x1', NATIVE_ADDRESS, 'ETH'),
        },
      );

      const { result } = renderHook(() =>
        useTokenTransactions(nativeAsset(ETH_CHAIN_ID)),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'bridge-1',
      ]);
    });

    it('does not show it on an unrelated token page on the destination chain', async () => {
      setupMocks([createBaseBridge({ address: DAI_ADDRESS, symbol: 'DAI' })], {
        bridgeHistory: bridgeHistoryTo(1, DAI_ADDRESS, 'DAI'),
      });

      const { result } = renderHook(() =>
        useTokenTransactions(
          createAsset({
            symbol: 'ONE',
            isETH: false,
            isNative: false,
            address: UNRELATED_TOKEN,
            chainId: ETH_CHAIN_ID,
          }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions).toEqual([]);
    });

    it('does not show it on a native page of some third chain', async () => {
      setupMocks(
        [createBaseBridge({ address: NATIVE_ADDRESS, symbol: 'ETH' })],
        {
          bridgeHistory: bridgeHistoryTo(1, NATIVE_ADDRESS, 'ETH'),
        },
      );

      const { result } = renderHook(() =>
        useTokenTransactions(nativeAsset(MONAD_CHAIN_ID)),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions).toEqual([]);
    });

    it('ignores a non-EVM CAIP destination rather than mis-matching it', async () => {
      setupMocks(
        [createBaseBridge({ address: NATIVE_ADDRESS, symbol: 'SOL' })],
        {
          bridgeHistory: bridgeHistoryTo(
            SOLANA_CHAIN_ID,
            NATIVE_ADDRESS,
            'SOL',
          ),
        },
      );

      const { result } = renderHook(() =>
        useTokenTransactions(nativeAsset(ETH_CHAIN_ID)),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions).toEqual([]);
    });

    it('does not treat a non-bridge type as an arrival', async () => {
      setupMocks(
        [
          createMockTransaction({
            id: 'bridge-1',
            chainId: BASE_CHAIN_ID,
            type: TransactionType.swap,
            txParams: { from: MOCK_ADDRESS, to: MOCK_RECIPIENT },
          }),
        ],
        { bridgeHistory: bridgeHistoryTo(1, NATIVE_ADDRESS, 'ETH') },
      );

      const { result } = renderHook(() =>
        useTokenTransactions(nativeAsset(ETH_CHAIN_ID)),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions).toEqual([]);
    });
  });

  describe('bridge arrivals on a non-EVM destination page', () => {
    const SOLANA_NUMERIC_CHAIN_ID = 1151111081099710;

    const setupSolanaPageMocks = (
      bridgeHistory: Record<string, unknown>,
      evmTxs: unknown[],
    ) => {
      jest.mocked(isNonEvmChainId).mockReturnValue(true);
      jest
        .mocked(formatChainIdToCaip)
        .mockImplementation((chainId: unknown) =>
          chainId === SOLANA_NUMERIC_CHAIN_ID || chainId === SOLANA_CHAIN_ID
            ? (SOLANA_CHAIN_ID as never)
            : (`eip155:${chainId}` as never),
        );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectTransactions) return evmTxs;
        if (selector === selectBridgeHistoryForAccount) return bridgeHistory;
        if (selector === selectIsActivityRedesignEnabled) return true;
        if (selector === selectTokens) return [];
        if (selector === selectSelectedInternalAccount) {
          return { address: SOLANA_ADDRESS, metadata: { importTime: 0 } };
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return () => ({ address: SOLANA_ADDRESS });
        }
        if (selector === selectNonEvmTransactionsForSelectedAccountGroup) {
          return { transactions: [] };
        }
        if (selector === selectConversionRate) return 1;
        if (selector === selectCurrentCurrency) return 'usd';
        return SOLANA_ADDRESS;
      });
    };

    const evmBridgeTx = {
      id: 'bridge-arrival-1',
      chainId: '0x2105',
      hash: '0xbase-source',
      status: TX_CONFIRMED,
      time: 5,
      type: TransactionType.bridge,
      txParams: { from: MOCK_ADDRESS, to: MOCK_RECIPIENT },
    };

    const historyTo = (destAssetId: string) => ({
      'bridge-arrival-1': {
        quote: {
          srcChainId: 8453,
          destChainId: SOLANA_NUMERIC_CHAIN_ID,
          srcAsset: { chainId: 8453, assetId: 'eip155:8453/erc20:0xusdc' },
          destAsset: {
            chainId: SOLANA_NUMERIC_CHAIN_ID,
            assetId: destAssetId,
          },
        },
      },
    });

    const solanaAsset = (overrides: Partial<TokenI>) =>
      createAsset({ chainId: SOLANA_CHAIN_ID, isETH: false, ...overrides });

    it('returns an EVM bridge whose destination is this native non-EVM asset', async () => {
      setupSolanaPageMocks(historyTo(SOL_ASSET_ID), [evmBridgeTx]);

      const { result } = renderHook(() =>
        useTokenTransactions(
          solanaAsset({ symbol: 'SOL', isNative: true, address: SOL_ASSET_ID }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.bridgeArrivalTxs.map((tx) => tx.id)).toEqual([
        'bridge-arrival-1',
      ]);
    });

    it('returns an EVM bridge whose destination is this non-EVM token', async () => {
      setupSolanaPageMocks(historyTo(USDC_ASSET_ID), [evmBridgeTx]);

      const { result } = renderHook(() =>
        useTokenTransactions(
          solanaAsset({
            symbol: 'USDC',
            isNative: false,
            address: USDC_ADDRESS,
          }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.bridgeArrivalTxs.map((tx) => tx.id)).toEqual([
        'bridge-arrival-1',
      ]);
    });

    it('excludes a bridge whose destination asset is a different non-EVM token', async () => {
      setupSolanaPageMocks(historyTo(USDC_ASSET_ID), [evmBridgeTx]);

      const { result } = renderHook(() =>
        useTokenTransactions(
          solanaAsset({ symbol: 'SOL', isNative: true, address: SOL_ASSET_ID }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.bridgeArrivalTxs).toEqual([]);
    });

    it('excludes a non-bridge EVM transaction', async () => {
      setupSolanaPageMocks(historyTo(SOL_ASSET_ID), [
        { ...evmBridgeTx, type: TransactionType.swap },
      ]);

      const { result } = renderHook(() =>
        useTokenTransactions(
          solanaAsset({ symbol: 'SOL', isNative: true, address: SOL_ASSET_ID }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.bridgeArrivalTxs).toEqual([]);
    });

    it('returns nothing for an EVM asset page', async () => {
      setupMocks([evmBridgeTx], { bridgeHistory: historyTo(SOL_ASSET_ID) });

      const { result } = renderHook(() =>
        useTokenTransactions(
          createAsset({ symbol: 'ETH', isETH: true, isNative: true }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.bridgeArrivalTxs).toEqual([]);
    });
  });

  describe('submitted transactions', () => {
    const ethAsset = () => createAsset({ symbol: 'ETH', isETH: true });

    // Earlier non-EVM describes leave these mocked; `jest.clearAllMocks()`
    // clears calls but not implementations, so restore the EVM defaults.
    beforeEach(() => {
      jest.mocked(isNonEvmChainId).mockReturnValue(false);
      jest
        .mocked(formatChainIdToCaip)
        .mockImplementation((chainId: unknown) => `eip155:${chainId}` as never);
    });

    it('drops a submitted transaction that was not sent by the selected account', async () => {
      setupMocks([
        createMockTransaction({
          id: 'submitted-own',
          status: TX_SUBMITTED,
          txParams: { from: MOCK_ADDRESS, to: MOCK_RECIPIENT, nonce: '0x1' },
        }),
        // Reaches submittedTxs because the selected account is the recipient.
        createMockTransaction({
          id: 'submitted-incoming',
          status: TX_SUBMITTED,
          txParams: { from: MOCK_RECIPIENT, to: MOCK_ADDRESS, nonce: '0x2' },
        }),
      ]);

      const { result } = renderHook(() => useTokenTransactions(ethAsset()));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.submittedTxs.map((tx) => tx.id)).toStrictEqual([
        'submitted-own',
      ]);
    });

    it('drops a submitted transaction whose nonce is already confirmed', async () => {
      setupMocks([
        createMockTransaction({
          id: 'confirmed-5',
          status: TX_CONFIRMED,
          txParams: { from: MOCK_ADDRESS, to: MOCK_RECIPIENT, nonce: '0x5' },
        }),
        createMockTransaction({
          id: 'submitted-5',
          status: TX_SUBMITTED,
          txParams: { from: MOCK_ADDRESS, to: MOCK_RECIPIENT, nonce: '0x5' },
        }),
      ]);

      const { result } = renderHook(() => useTokenTransactions(ethAsset()));

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.submittedTxs).toStrictEqual([]);
      expect(result.current.confirmedTxs.map((tx) => tx.id)).toStrictEqual([
        'confirmed-5',
      ]);
    });
  });

  describe('non-EVM asset filtering', () => {
    const setupNonEvmMocks = (transactions: unknown[]) => {
      jest.mocked(isNonEvmChainId).mockReturnValue(true);
      jest
        .mocked(formatChainIdToCaip)
        .mockImplementation((chainId: unknown) => chainId as never);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectTransactions) return [];
        if (selector === selectBridgeHistoryForAccount) return {};
        if (selector === selectIsActivityRedesignEnabled) return true;
        if (selector === selectTokens) return [];
        if (selector === selectSelectedInternalAccount) {
          return { address: SOLANA_ADDRESS, metadata: { importTime: 0 } };
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return () => ({ address: SOLANA_ADDRESS });
        }
        if (selector === selectNonEvmTransactionsForSelectedAccountGroup) {
          return { transactions };
        }
        if (selector === selectConversionRate) return 1;
        if (selector === selectCurrentCurrency) return 'usd';
        return SOLANA_ADDRESS;
      });
    };

    const createSolanaMovement = (assetType: string, unit: string) => ({
      address: SOLANA_ADDRESS,
      asset: { fungible: true, amount: '1', unit, type: assetType },
    });

    // SOL -> USDC swap: the native leg leaves, the token leg arrives.
    const createSolanaSwap = (id: string) => ({
      id,
      chain: SOLANA_CHAIN_ID,
      status: TX_CONFIRMED,
      time: 2,
      from: [createSolanaMovement(SOL_ASSET_ID, 'SOL')],
      to: [createSolanaMovement(USDC_ASSET_ID, 'USDC')],
    });

    const createSolanaTokenSend = (id: string) => ({
      id,
      chain: SOLANA_CHAIN_ID,
      status: TX_CONFIRMED,
      time: 1,
      from: [createSolanaMovement(USDC_ASSET_ID, 'USDC')],
      to: [createSolanaMovement(USDC_ASSET_ID, 'USDC')],
    });

    const solanaAsset = (overrides: Partial<TokenI>) =>
      createAsset({
        chainId: SOLANA_CHAIN_ID,
        isETH: false,
        ...overrides,
      });

    it('includes a swap on the native token page even though it moves a non-native leg', async () => {
      setupNonEvmMocks([createSolanaSwap('swap-native-page')]);

      const { result } = renderHook(() =>
        useTokenTransactions(
          solanaAsset({
            symbol: 'SOL',
            name: 'Solana',
            isNative: true,
            address: SOL_ASSET_ID,
          }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'swap-native-page',
      ]);
    });

    it('includes the same swap on the destination token page', async () => {
      setupNonEvmMocks([createSolanaSwap('swap-token-page')]);

      const { result } = renderHook(() =>
        useTokenTransactions(
          solanaAsset({
            symbol: 'USDC',
            name: 'USD Coin',
            isNative: false,
            address: USDC_ADDRESS,
          }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'swap-token-page',
      ]);
    });

    it('matches a movement by unit when the asset type names a different mint', async () => {
      setupNonEvmMocks([
        {
          id: 'legacy-usdc-send',
          chain: SOLANA_CHAIN_ID,
          status: TX_CONFIRMED,
          time: 3,
          from: [
            {
              address: SOLANA_ADDRESS,
              asset: {
                fungible: true,
                amount: '1',
                unit: 'USDC',
                // Not this page's mint, so only the symbol can identify it.
                type: `${SOLANA_CHAIN_ID}/token:So11111111111111111111111111111111111111112`,
              },
            },
          ],
          to: [],
        },
      ]);

      const { result } = renderHook(() =>
        useTokenTransactions(
          solanaAsset({
            symbol: 'USDC',
            name: 'USD Coin',
            isNative: false,
            address: USDC_ADDRESS,
          }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toStrictEqual([
        'legacy-usdc-send',
      ]);
    });

    it('excludes a token-only transfer from the native token page', async () => {
      setupNonEvmMocks([
        createSolanaSwap('swap-mixed'),
        createSolanaTokenSend('token-send-mixed'),
      ]);

      const { result } = renderHook(() =>
        useTokenTransactions(
          solanaAsset({
            symbol: 'SOL',
            name: 'Solana',
            isNative: true,
            address: SOL_ASSET_ID,
          }),
        ),
      );

      await waitFor(() => {
        expect(result.current.transactionsUpdated).toBe(true);
      });

      expect(result.current.transactions.map((tx) => tx.id)).toEqual([
        'swap-mixed',
      ]);
    });
  });
});
