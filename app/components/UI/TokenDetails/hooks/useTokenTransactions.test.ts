import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useTokenTransactions } from './useTokenTransactions';
import { TokenI } from '../../Tokens/types';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS, MUSD_TOKEN } from '../../Earn/constants/musd';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { Hex } from '@metamask/utils';

const MOCK_USER_ADDRESS = '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756';
const LINEA_CHAIN_ID = '0xe708' as Hex;
const MAINNET_CHAIN_ID = '0x1' as Hex;

// --- Mock Transactions ---

const mockMusdClaimTx = {
  id: 'musd-claim-tx-1',
  txParams: {
    from: MOCK_USER_ADDRESS,
    to: '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae', // Merkl distributor
  },
  hash: '0xmusdclaim123',
  status: TransactionStatus.confirmed,
  chainId: LINEA_CHAIN_ID,
  networkID: '0xe708',
  type: TransactionType.musdClaim,
  time: 2000000,
};

// --- Mock Token Factory ---

const createMockToken = (overrides: Partial<TokenI> = {}): TokenI => ({
  address: '',
  symbol: '',
  name: '',
  decimals: 18,
  chainId: MAINNET_CHAIN_ID,
  balance: '100',
  image: '',
  logo: '',
  isETH: false,
  ...overrides,
});

const MOCK_MUSD_TOKEN_LINEA = createMockToken({
  address: MUSD_TOKEN_ADDRESS,
  symbol: MUSD_TOKEN.symbol,
  name: MUSD_TOKEN.name,
  decimals: MUSD_TOKEN.decimals,
  chainId: LINEA_CHAIN_ID,
});

const MOCK_MUSD_TOKEN_MAINNET = createMockToken({
  address: MUSD_TOKEN_ADDRESS,
  symbol: MUSD_TOKEN.symbol,
  name: MUSD_TOKEN.name,
  decimals: MUSD_TOKEN.decimals,
  chainId: MAINNET_CHAIN_ID,
});

const MOCK_USDC_TOKEN = createMockToken({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
});

const MOCK_ETH_TOKEN = createMockToken({
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Ether',
  balance: '1',
  isETH: true,
});

// --- Mock State Factory ---

const createMockState = (transactions = [mockMusdClaimTx]) => ({
  inpageProvider: { networkId: '0x1' },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      TokensController: {
        allTokens: { '0x1': { [MOCK_USER_ADDRESS.toLowerCase()]: [] } },
      },
      TransactionController: { transactions },
    },
  },
});

// --- Test Helper ---

const getMusdClaimTxCount = (
  token: TokenI,
  transactions = [mockMusdClaimTx],
): number => {
  const { result } = renderHookWithProvider(() => useTokenTransactions(token), {
    state: createMockState(transactions),
  });
  return result.current.transactions.filter(
    (tx: { type: string }) => tx.type === TransactionType.musdClaim,
  ).length;
};

// --- Tests ---

describe('useTokenTransactions', () => {
  describe('musdClaim Transaction Filtering', () => {
    it('includes musdClaim transactions when viewing mUSD token by address', () => {
      expect(getMusdClaimTxCount(MOCK_MUSD_TOKEN_LINEA)).toBe(1);
    });

    it('includes musdClaim transactions when viewing mUSD token by symbol', () => {
      const tokenWithSymbolOnly = createMockToken({
        address: MUSD_TOKEN_ADDRESS,
        symbol: 'MUSD',
        name: 'MUSD',
        decimals: 6,
        chainId: LINEA_CHAIN_ID,
      });
      expect(getMusdClaimTxCount(tokenWithSymbolOnly)).toBe(1);
    });

    it('excludes musdClaim transactions when viewing a different token', () => {
      expect(getMusdClaimTxCount(MOCK_USDC_TOKEN)).toBe(0);
    });

    it('excludes unapproved musdClaim transactions', () => {
      const unapprovedTx = {
        ...mockMusdClaimTx,
        status: TransactionStatus.unapproved,
      };
      expect(getMusdClaimTxCount(MOCK_MUSD_TOKEN_LINEA, [unapprovedTx])).toBe(
        0,
      );
    });

    it('excludes musdClaim transactions when chainId does not match', () => {
      // tx is on Linea, but viewing mUSD on mainnet
      expect(getMusdClaimTxCount(MOCK_MUSD_TOKEN_MAINNET)).toBe(0);
    });
  });

  describe('Basic Functionality', () => {
    it('returns empty arrays when no transactions exist', () => {
      const { result } = renderHookWithProvider(
        () => useTokenTransactions(MOCK_ETH_TOKEN),
        { state: createMockState([]) },
      );

      expect(result.current.transactions).toEqual([]);
      expect(result.current.submittedTxs).toEqual([]);
      expect(result.current.confirmedTxs).toEqual([]);
    });

    it('returns proper initial state values', () => {
      const { result } = renderHookWithProvider(
        () => useTokenTransactions(MOCK_ETH_TOKEN),
        { state: createMockState() },
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.refreshing).toBe(false);
      expect(typeof result.current.selectedAddress).toBe('string');
      expect(typeof result.current.conversionRate).toBe('number');
      expect(typeof result.current.currentCurrency).toBe('string');
    });
  });
});
