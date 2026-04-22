import { renderHook } from '@testing-library/react-native';
import { BigNumber } from 'ethers';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope } from '@metamask/keyring-api';
import useQuickBuyNativeGasInsufficient from './useQuickBuyNativeGasInsufficient';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import type { EnrichedQuickBuyQuote } from './useQuickBuyQuotes';

const ethToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  chainId: CHAIN_IDS.MAINNET as `0x${string}`,
} as BridgeToken;

const maticToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'MATIC',
  decimals: 18,
  chainId: CHAIN_IDS.POLYGON as `0x${string}`,
} as BridgeToken;

const usdcToken: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
  chainId: CHAIN_IDS.MAINNET as `0x${string}`,
} as BridgeToken;

const solToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'SOL',
  decimals: 9,
  chainId: SolScope.Mainnet,
} as BridgeToken;

const makeQuote = (overrides: {
  gasFeeEffectiveAmount?: string | null;
  gasIncluded?: boolean;
  gasIncluded7702?: boolean;
  gasSponsored?: boolean;
}): EnrichedQuickBuyQuote =>
  ({
    quote: {
      gasIncluded: overrides.gasIncluded ?? false,
      gasIncluded7702: overrides.gasIncluded7702 ?? false,
      gasSponsored: overrides.gasSponsored ?? false,
    },
    gasFee: {
      effective: {
        amount: overrides.gasFeeEffectiveAmount ?? '0.01',
      },
    },
  }) as unknown as EnrichedQuickBuyQuote;

describe('useQuickBuyNativeGasInsufficient', () => {
  it('returns true when ETH amount + gas exceeds balance', () => {
    // 0.99 ETH + 0.02 ETH gas = 1.01 ETH > 1 ETH balance
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '0.99',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: makeQuote({ gasFeeEffectiveAmount: '0.02' }),
      }),
    );
    expect(result.current).toBe(true);
  });

  it('returns false when ETH amount + gas fits inside balance', () => {
    // 0.5 ETH + 0.01 ETH gas = 0.51 ETH < 1 ETH balance
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '0.5',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: makeQuote({ gasFeeEffectiveAmount: '0.01' }),
      }),
    );
    expect(result.current).toBe(false);
  });

  it('returns true when MATIC amount + gas exceeds balance', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '5',
        token: maticToken,
        latestAtomicBalance: BigNumber.from('5000000000000000000'), // 5 MATIC
        quote: makeQuote({ gasFeeEffectiveAmount: '0.1' }),
      }),
    );
    expect(result.current).toBe(true);
  });

  it('returns false for ERC-20 sources (gas handled elsewhere)', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '100',
        token: usdcToken,
        latestAtomicBalance: BigNumber.from('1'),
        quote: makeQuote({ gasFeeEffectiveAmount: '0.01' }),
      }),
    );
    expect(result.current).toBe(false);
  });

  it('returns false for Solana sources (rent exemption handled by the shared hook)', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '1',
        token: solToken,
        latestAtomicBalance: BigNumber.from('1000000000'),
        quote: makeQuote({ gasFeeEffectiveAmount: '0.0001' }),
      }),
    );
    expect(result.current).toBe(false);
  });

  it('returns false when the quote is gasless (gasIncluded)', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '1',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: makeQuote({
          gasFeeEffectiveAmount: '0.5',
          gasIncluded: true,
        }),
      }),
    );
    expect(result.current).toBe(false);
  });

  it('returns false when the quote is gasless via 7702', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '1',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: makeQuote({
          gasFeeEffectiveAmount: '0.5',
          gasIncluded7702: true,
        }),
      }),
    );
    expect(result.current).toBe(false);
  });

  it('returns false when the quote is gas-sponsored', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '1',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: makeQuote({
          gasFeeEffectiveAmount: '0.5',
          gasSponsored: true,
        }),
      }),
    );
    expect(result.current).toBe(false);
  });

  it('handles scientific-notation gas amounts', () => {
    // 0.5 ETH + 1.5e-3 (0.0015) ETH = 0.5015 ETH < 1 ETH
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '0.5',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: makeQuote({ gasFeeEffectiveAmount: '1.5e-3' }),
      }),
    );
    expect(result.current).toBe(false);
  });

  it('handles scientific-notation amounts on the input side', () => {
    // 1e-18 ETH (1 wei) + 0.01 ETH gas > 0 balance
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '1e-18',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('0'),
        quote: makeQuote({ gasFeeEffectiveAmount: '0.01' }),
      }),
    );
    expect(result.current).toBe(true);
  });

  it('returns false when the quote is missing', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '1',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: undefined,
      }),
    );
    expect(result.current).toBe(false);
  });

  it('returns false when the gas amount is not a valid number', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '0.5',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: makeQuote({ gasFeeEffectiveAmount: null }),
      }),
    );
    expect(result.current).toBe(false);
  });

  it('returns false when inputs are missing', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: undefined,
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: makeQuote({}),
      }),
    );
    expect(result.current).toBe(false);
  });

  it('returns false for the transient "." input', () => {
    const { result } = renderHook(() =>
      useQuickBuyNativeGasInsufficient({
        amount: '.',
        token: ethToken,
        latestAtomicBalance: BigNumber.from('1000000000000000000'),
        quote: makeQuote({}),
      }),
    );
    expect(result.current).toBe(false);
  });
});
