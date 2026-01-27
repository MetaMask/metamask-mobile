import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { createStore, Store } from 'redux';
import useIsInsufficientBalance, {
  formatEffectiveGasFee,
  transformEffectiveToAtomic,
} from './index';
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
  ({ children }: { children: React.ReactNode }) =>
    <Provider store={store}>{children}</Provider>;

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

    it('returns false when user has sufficient SOL', () => {
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
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toBe(false);
    });

    it('returns true when user has insufficient SOL', () => {
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
            amount: '3', // 3 SOL
            token: solToken,
            latestAtomicBalance: BigNumber.from('2000000000'), // 2 SOL
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

    it('returns false when balance is undefined', () => {
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

      expect(result.current).toBe(false);
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
      const atomicGasFee = transformEffectiveToAtomic(
        effectiveGasFee,
        decimals,
      );
      expect(atomicGasFee.toString()).toBe('1');
    });

    it('transforms effective gas fee to atomic gas fee with decimals', () => {
      const effectiveGasFee = '0.000001426955931521';
      const decimals = 6;
      const atomicGasFee = transformEffectiveToAtomic(
        effectiveGasFee,
        decimals,
      );
      expect(atomicGasFee.toString()).toBe('1');
    });
  });

  describe('formatEffectiveGasFee', () => {
    it('formats effective gas fee to string', () => {
      const effectiveGasFee = '0.000000000000000001';
      const decimals = 18;
      const formattedGasFee = formatEffectiveGasFee(effectiveGasFee, decimals);
      expect(formattedGasFee).toBe(effectiveGasFee);
    });

    it('formats effective gas fee to string for integer part > 0', () => {
      const effectiveGasFee = '23.000000000000000001';
      const decimals = 18;
      const formattedGasFee = formatEffectiveGasFee(effectiveGasFee, decimals);
      expect(formattedGasFee).toBe(effectiveGasFee);
    });

    it('formats effective gas fee to string when token decimals is less than effective gas fee decimals', () => {
      const effectiveGasFee = '0.000005426955931521';
      const decimals = 6;
      const formattedGasFee = formatEffectiveGasFee(effectiveGasFee, decimals);
      expect(formattedGasFee).toBe('0.000005');
    });

    it('formats effective gas fee to string when token decimals is more than effective gas fee decimals', () => {
      const effectiveGasFee = '0.000005';
      const decimals = 18;
      const formattedGasFee = formatEffectiveGasFee(effectiveGasFee, decimals);
      expect(formattedGasFee).toBe('0.000005');
    });
  });
});
