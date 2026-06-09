import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenTransactions } from './useTokenTransactions';
import { TokenI } from '../../Tokens/types';
import { TX_CONFIRMED } from '../../../../constants/transaction';
import {
  selectTransactions,
  selectSwapsTransactions,
} from '../../../../selectors/transactionController';
import { selectTokens } from '../../../../selectors/tokensController';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn((chainId: string) => `eip155:${chainId}`),
}));

jest.mock('../../../../selectors/tokensController', () => ({
  selectTokens: jest.fn(),
}));

jest.mock('../../../../selectors/transactionController', () => ({
  selectTransactions: jest.fn(),
  selectSwapsTransactions: jest.fn(),
}));

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

const setupMocks = (transactions: unknown[] = []) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectTransactions) return transactions;
    if (selector === selectSwapsTransactions) return {};
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
});
