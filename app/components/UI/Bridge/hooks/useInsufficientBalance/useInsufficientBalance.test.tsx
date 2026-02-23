import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { createStore, Store } from 'redux';
import useIsInsufficientBalance, { formatAmount, parseAmount } from './index';
import { BridgeToken } from '../../types';
import { BigNumber } from 'ethers';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope } from '@metamask/keyring-api';
import { initialState } from '../../_mocks_/initialState';

// Mock the selectBridgeQuotes selector
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockQuotes: any = null;
jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectBridgeQuotes: jest.fn(() => mockQuotes),
}));

// Mock selectMinSolBalance
jest.mock('../../../../../selectors/bridgeController', () => ({
  selectMinSolBalance: jest.fn(() => '0.001'),
}));

// Helper to create a mock store with proper state structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockStore = (quotes: any): Store => {
  mockQuotes = quotes;
  const rootReducer = (state = initialState) => state;
  return createStore(rootReducer, initialState);
};

// Helper to wrap hook with provider
const wrapper =
  (store: Store) =>
  ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

describe('useIsInsufficientBalance', () => {
  afterEach(() => {
    mockQuotes = null;
  });

  describe('ERC-20 Tokens', () => {
    const usdcToken: BridgeToken = {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      symbol: 'USDC',
      decimals: 6,
      chainId: CHAIN_IDS.MAINNET as `0x${string}`,
    };

    it('returns false when user has sufficient USDC balance for swap (gasless)', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: true,
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '50', // 50 USDC
            token: usdcToken,
            latestAtomicBalance: BigNumber.from('100000000'), // 100 USDC (6 decimals)
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(false);
    });

    it('returns true when user has insufficient USDC balance', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '150', // 150 USDC
            token: usdcToken,
            latestAtomicBalance: BigNumber.from('100000000'), // 100 USDC (6 decimals)
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(true);
    });

    it('returns false for cross-chain USDC transaction with sufficient token balance (gas checked separately)', () => {
      // For ERC-20 tokens, gas is checked in useHasSufficientGas, not here
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
          gasFee: {
            effective: {
              amount: '0.001', // 0.001 ETH gas
            },
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '50', // 50 USDC
            token: usdcToken,
            latestAtomicBalance: BigNumber.from('100000000'), // 100 USDC
          }),
        { wrapper: wrapper(store) },
      );

      // Should return false because USDC balance is sufficient
      // Gas check happens in useHasSufficientGas
      expect(result.current).toBe(false);
    });
  });

  describe('Native Tokens - Ethereum (ETH)', () => {
    const ethToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      decimals: 18,
      chainId: CHAIN_IDS.MAINNET as `0x${string}`,
    };

    it('returns false when user has sufficient ETH for gasless swap', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: true, // Gasless swap
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '0.5', // 0.5 ETH
            token: ethToken,
            latestAtomicBalance: BigNumber.from('1000000000000000000'), // 1 ETH
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(false);
    });

    it('returns false when user has sufficient ETH including gas for cross-chain', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false, // Cross-chain, needs gas
          },
          gasFee: {
            effective: {
              amount: '0.01', // 0.01 ETH gas
            },
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '0.5', // 0.5 ETH
            token: ethToken,
            latestAtomicBalance: BigNumber.from('1000000000000000000'), // 1 ETH
            // Total needed: 0.5 + 0.01 = 0.51 ETH < 1 ETH ✓
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(false);
    });

    it('returns true when ETH amount + gas exceeds balance for cross-chain', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
          gasFee: {
            effective: {
              amount: '0.02', // 0.02 ETH gas
            },
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '0.99', // 0.99 ETH
            token: ethToken,
            latestAtomicBalance: BigNumber.from('1000000000000000000'), // 1 ETH
            // Total needed: 0.99 + 0.02 = 1.01 ETH > 1 ETH ✗
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(true);
    });

    it('returns true when user tries to send more ETH than balance (even without gas)', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
          gasFee: {
            effective: {
              amount: '0.001',
            },
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '2', // 2 ETH
            token: ethToken,
            latestAtomicBalance: BigNumber.from('1000000000000000000'), // 1 ETH
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(true);
    });

    it('handles scientific notation in gas amounts', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
          gasFee: {
            effective: {
              amount: '1.5e-3', // 0.0015 ETH in scientific notation
            },
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '0.5', // 0.5 ETH
            token: ethToken,
            latestAtomicBalance: BigNumber.from('1000000000000000000'), // 1 ETH
            // Total needed: 0.5 + 0.0015 = 0.5015 ETH < 1 ETH ✓
          }),
        { wrapper: wrapper(store) },
      );

      // Should handle scientific notation correctly and return false
      expect(result.current).toBe(false);
    });

    it('returns true when scientific notation gas causes insufficient balance', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
          gasFee: {
            effective: {
              amount: '5e-2', // 0.05 ETH in scientific notation
            },
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '0.96', // 0.96 ETH
            token: ethToken,
            latestAtomicBalance: BigNumber.from('1000000000000000000'), // 1 ETH
            // Total needed: 0.96 + 0.05 = 1.01 ETH > 1 ETH ✗
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(true);
    });
  });

  describe('Native Tokens - Polygon (MATIC)', () => {
    const maticToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'MATIC',
      decimals: 18,
      chainId: CHAIN_IDS.POLYGON as `0x${string}`,
    };

    it('returns false when user has sufficient MATIC including gas', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
          gasFee: {
            effective: {
              amount: '0.1', // 0.1 MATIC gas
            },
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '5', // 5 MATIC
            token: maticToken,
            latestAtomicBalance: BigNumber.from('10000000000000000000'), // 10 MATIC
            // Total needed: 5 + 0.1 = 5.1 MATIC < 10 MATIC ✓
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(false);
    });

    it('returns true when MATIC amount + gas exceeds balance', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
          gasFee: {
            effective: {
              amount: '1', // 1 MATIC gas
            },
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '9.5', // 9.5 MATIC
            token: maticToken,
            latestAtomicBalance: BigNumber.from('10000000000000000000'), // 10 MATIC
            // Total needed: 9.5 + 1 = 10.5 MATIC > 10 MATIC ✗
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(true);
    });
  });

  describe('Solana (SOL)', () => {
    const solToken: BridgeToken = {
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      symbol: 'SOL',
      decimals: 9,
      chainId: SolScope.Mainnet,
    };

    it('returns false when user has sufficient SOL above rent exemption', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '1', // 1 SOL
            token: solToken,
            latestAtomicBalance: BigNumber.from('3000000000'), // 3 SOL (9 decimals)
            // Remaining: 3 - 1 = 2 SOL > 0.001 SOL rent exemption ✓
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(false);
    });

    it('returns true when SOL balance would drop below rent exemption', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '1.9999', // 1.9999 SOL
            token: solToken,
            latestAtomicBalance: BigNumber.from('2000000000'), // 2 SOL
            // Remaining: 2 - 1.9999 = 0.0001 SOL < 0.001 SOL rent exemption ✗
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    const ethToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      decimals: 18,
      chainId: CHAIN_IDS.MAINNET as `0x${string}`,
    };

    it('returns false when amount is undefined', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: undefined,
            token: ethToken,
            latestAtomicBalance: BigNumber.from('1000000000000000000'),
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(false);
    });

    it('returns false when amount is just a decimal point', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '.',
            token: ethToken,
            latestAtomicBalance: BigNumber.from('1000000000000000000'),
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(false);
    });

    it('returns false when token is undefined', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '1',
            token: undefined,
            latestAtomicBalance: BigNumber.from('1000000000000000000'),
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(false);
    });

    it('returns true when balance is undefined', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '1',
            token: ethToken,
            latestAtomicBalance: undefined,
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(true);
    });

    it('still checks balance when no quote is available', () => {
      const store = createMockStore(null);

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '1',
            token: ethToken,
            latestAtomicBalance: BigNumber.from('500000000000000000'), // 0.5 ETH
          }),
        { wrapper: wrapper(store) },
      );

      // Should return true because 1 ETH > 0.5 ETH balance
      // Even without a quote, basic balance check still applies
      expect(result.current).toBe(true);
    });

    it('handles zero balance correctly', () => {
      const store = createMockStore({
        recommendedQuote: {
          quote: {
            gasIncluded: false,
          },
        },
      });

      const { result } = renderHook(
        () =>
          useIsInsufficientBalance({
            amount: '0.1',
            token: ethToken,
            latestAtomicBalance: BigNumber.from('0'),
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(true);
    });
  });

  describe('transformEffectiveToAtomic', () => {
    it('transforms effective gas fee to atomic gas fee', () => {
      const effectiveGasFee = '0.000000000000000001';
      const decimals = 18;
      const atomicGasFee = parseAmount(effectiveGasFee, decimals);
      expect(atomicGasFee.toString()).toBe('1');
    });

    it('transforms effective gas fee to atomic gas fee with decimals', () => {
      const effectiveGasFee = '0.000001426955931521';
      const decimals = 6;
      const atomicGasFee = parseAmount(effectiveGasFee, decimals);
      expect(atomicGasFee.toString()).toBe('1');
    });
  });

  describe('formatEffectiveGasFee', () => {
    it('formats effective gas fee to string', () => {
      const effectiveGasFee = '0.000000000000000001';
      const decimals = 18;
      const formattedGasFee = formatAmount(effectiveGasFee, decimals);
      expect(formattedGasFee).toBe(effectiveGasFee);
    });

    it('formats effective gas fee to string for integer part > 0', () => {
      const effectiveGasFee = '23.000000000000000001';
      const decimals = 18;
      const formattedGasFee = formatAmount(effectiveGasFee, decimals);
      expect(formattedGasFee).toBe(effectiveGasFee);
    });

    it('formats effective gas fee to string when token decimals is less than effective gas fee decimals', () => {
      const effectiveGasFee = '0.000005426955931521';
      const decimals = 6;
      const formattedGasFee = formatAmount(effectiveGasFee, decimals);
      expect(formattedGasFee).toBe('0.000005');
    });

    it('formats effective gas fee to string when token decimals is more than effective gas fee decimals', () => {
      const effectiveGasFee = '0.000005';
      const decimals = 18;
      const formattedGasFee = formatAmount(effectiveGasFee, decimals);
      expect(formattedGasFee).toBe('0.000005');
    });
  });

  describe('parseAmount - Cross-chain decimal handling', () => {
    describe('Ethereum and EVM chains (18 decimals)', () => {
      const decimals = 18;

      it('parses whole number correctly', () => {
        const amount = '1';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1000000000000000000'); // 1e18
      });

      it('parses decimal number correctly', () => {
        const amount = '1.5';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1500000000000000000'); // 1.5e18
      });

      it('parses very small amount correctly', () => {
        const amount = '0.000000000000000001';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1'); // 1 wei
      });

      it('handles maximum precision (18 decimals)', () => {
        const amount = '1.123456789012345678';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1123456789012345678');
      });

      it('truncates excess decimals beyond 18', () => {
        const amount = '1.1234567890123456789999'; // 22 decimals
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1123456789012345678'); // Truncated to 18
      });
    });

    describe('USDC/USDT (6 decimals)', () => {
      const decimals = 6;

      it('parses whole number correctly', () => {
        const amount = '100';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('100000000'); // 100e6
      });

      it('parses decimal number correctly', () => {
        const amount = '0.5';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('500000'); // 0.5e6
      });

      it('parses very small amount correctly', () => {
        const amount = '0.000001';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1'); // 1 micro unit
      });

      it('handles maximum precision (6 decimals)', () => {
        const amount = '1.123456';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1123456');
      });

      it('truncates excess decimals beyond 6', () => {
        const amount = '1.123456789'; // 9 decimals
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1123456'); // Truncated to 6
      });

      it('handles typical USDC amount', () => {
        const amount = '50.25';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('50250000');
      });
    });

    describe('Bitcoin (8 decimals)', () => {
      const decimals = 8;

      it('parses whole number correctly', () => {
        const amount = '1';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('100000000'); // 1 BTC = 100,000,000 satoshis
      });

      it('parses decimal number correctly', () => {
        const amount = '0.5';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('50000000'); // 0.5 BTC
      });

      it('parses very small amount (1 satoshi)', () => {
        const amount = '0.00000001';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1'); // 1 satoshi
      });

      it('handles typical BTC amount', () => {
        const amount = '0.0114';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1140000'); // 1,140,000 satoshis
      });

      it('truncates excess decimals beyond 8', () => {
        const amount = '0.123456789012'; // 12 decimals
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('12345678'); // Truncated to 8
      });
    });

    describe('Solana (9 decimals)', () => {
      const decimals = 9;

      it('parses whole number correctly', () => {
        const amount = '1';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1000000000'); // 1 SOL = 1,000,000,000 lamports
      });

      it('parses decimal number correctly', () => {
        const amount = '2.5';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('2500000000');
      });

      it('parses very small amount (1 lamport)', () => {
        const amount = '0.000000001';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1'); // 1 lamport
      });

      it('handles maximum precision (9 decimals)', () => {
        const amount = '1.123456789';
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1123456789');
      });

      it('truncates excess decimals beyond 9', () => {
        const amount = '1.12345678901234'; // 14 decimals
        const parsed = parseAmount(amount, decimals);
        expect(parsed.toString()).toBe('1123456789'); // Truncated to 9
      });
    });

    describe('Scientific notation handling (via normalizeAmount)', () => {
      it('handles scientific notation for 18 decimals after normalization', () => {
        // Scientific notation needs to be normalized first (as done in the hook)
        const amount = '0.000000000000000001'; // 1e-18 normalized
        const parsed = parseAmount(amount, 18);
        expect(parsed.toString()).toBe('1'); // 1 wei
      });

      it('handles scientific notation for 6 decimals after normalization', () => {
        const amount = '0.000001'; // 1e-6 normalized
        const parsed = parseAmount(amount, 6);
        expect(parsed.toString()).toBe('1'); // 1 micro unit
      });

      it('handles large numbers after normalization', () => {
        const amount = '1000000'; // 1e6 normalized
        const parsed = parseAmount(amount, 18);
        expect(parsed.toString()).toBe('1000000000000000000000000'); // 1e24 wei
      });

      it('handles very small scientific notation (1e-9) for Solana', () => {
        const amount = '0.000000001'; // 1e-9 normalized
        const parsed = parseAmount(amount, 9);
        expect(parsed.toString()).toBe('1'); // 1 lamport
      });
    });

    describe('Edge cases', () => {
      it('handles zero amount', () => {
        const amount = '0';
        const parsed = parseAmount(amount, 18);
        expect(parsed.toString()).toBe('0');
      });

      it('handles amount with no decimal part', () => {
        const amount = '100.';
        const parsed = parseAmount(amount, 6);
        expect(parsed.toString()).toBe('100000000');
      });

      it('handles very large amounts', () => {
        const amount = '1000000';
        const parsed = parseAmount(amount, 18);
        expect(parsed.toString()).toBe('1000000000000000000000000'); // 1e24
      });

      it('handles amounts with trailing zeros', () => {
        const amount = '1.100000';
        const parsed = parseAmount(amount, 6);
        expect(parsed.toString()).toBe('1100000');
      });
    });
  });
});
