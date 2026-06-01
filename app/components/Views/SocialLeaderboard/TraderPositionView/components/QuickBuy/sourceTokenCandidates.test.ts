import { SolScope } from '@metamask/keyring-api';
import { NETWORK_CHAIN_ID } from '../../../../../../util/networks/customNetworks';
import { getSourceTokenCandidates, getTokenKey } from './sourceTokenCandidates';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

const mockNativeToken = (chainId: string): BridgeToken =>
  ({
    address: '0x0000000000000000000000000000000000000000',
    chainId,
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
  }) as unknown as BridgeToken;

jest.mock('../../../../../UI/Bridge/utils/tokenUtils', () => ({
  getNativeSourceToken: jest.fn((chainId: string) => mockNativeToken(chainId)),
}));

jest.mock(
  '../../../../../UI/Bridge/constants/default-swap-dest-tokens',
  () => ({
    DefaultSwapDestTokens: {
      'eip155:1/erc20:usdc': {
        symbol: 'USDC',
        address: '0xusdc',
        chainId: '0x1',
        decimals: 6,
        name: 'USD Coin',
      },
      'eip155:137/erc20:usdc_matic': {
        symbol: 'USDC',
        address: '0xusdc_matic',
        chainId: '0x89',
        decimals: 6,
        name: 'USD Coin (Polygon)',
      },
      'eip155:1/erc20:eth': {
        symbol: 'WETH',
        address: '0xweth',
        chainId: '0x1',
        decimals: 18,
        name: 'Wrapped Ether',
      },
    },
    Bip44TokensForDefaultPairs: {
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        symbol: 'USDC',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
        decimals: 6,
        name: 'USD Coin',
      },
    },
  }),
);

jest.mock('../../../../../../constants/bridge', () => ({
  ETH_USDT_ADDRESS: '0xdac17f958d2ee523a2206206994597c13d831ec7',
}));

describe('getTokenKey', () => {
  it('returns address:chainId with address lowercased', () => {
    const token = {
      address: '0xABCD',
      chainId: '0x1',
    } as unknown as BridgeToken;

    expect(getTokenKey(token)).toBe('0xabcd:0x1');
  });

  it('handles already lowercase addresses', () => {
    const token = {
      address: '0xabcd',
      chainId: '0x89',
    } as unknown as BridgeToken;

    expect(getTokenKey(token)).toBe('0xabcd:0x89');
  });
});

describe('getSourceTokenCandidates', () => {
  it('returns an array of BridgeToken candidates', () => {
    const candidates = getSourceTokenCandidates(NETWORK_CHAIN_ID.MAINNET);
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it('includes stablecoin candidates (USDC, USDT)', () => {
    const candidates = getSourceTokenCandidates(NETWORK_CHAIN_ID.MAINNET);
    const symbols = candidates.map((t) => t.symbol);
    expect(symbols).toContain('USDC');
    expect(symbols).toContain('USDT');
  });

  it('includes native SOL for Solana mainnet', () => {
    const candidates = getSourceTokenCandidates(NETWORK_CHAIN_ID.MAINNET);
    const solTokens = candidates.filter((t) => t.chainId === SolScope.Mainnet);
    expect(solTokens.length).toBeGreaterThan(0);
  });

  it('includes native token for all major EVM chains', () => {
    const candidates = getSourceTokenCandidates(undefined);
    const chainIds = candidates.map((t) => t.chainId);
    expect(chainIds).toContain(NETWORK_CHAIN_ID.MAINNET);
    expect(chainIds).toContain(NETWORK_CHAIN_ID.BASE);
  });

  it('does not duplicate native token when destChainId is already in NATIVE_TOKEN_CHAIN_IDS', () => {
    const candidates = getSourceTokenCandidates(NETWORK_CHAIN_ID.MAINNET);
    const mainnetNatives = candidates.filter(
      (t) =>
        t.chainId === NETWORK_CHAIN_ID.MAINNET &&
        t.address === '0x0000000000000000000000000000000000000000',
    );
    // Should appear exactly once from the NATIVE_TOKEN_CHAIN_IDS loop
    expect(mainnetNatives.length).toBe(1);
  });

  it('adds native token for a novel EVM destChainId not in NATIVE_TOKEN_CHAIN_IDS', () => {
    const novelChain = '0x12345';
    const candidates = getSourceTokenCandidates(novelChain);
    const novelNatives = candidates.filter((t) => t.chainId === novelChain);
    expect(novelNatives.length).toBeGreaterThan(0);
  });

  it('does NOT add native token for a non-EVM (non-0x) destChainId', () => {
    const candidates = getSourceTokenCandidates(SolScope.Mainnet);
    // Solana mainnet natives are added explicitly, not through the EVM branch
    const solNatives = candidates.filter((t) => t.chainId === SolScope.Mainnet);
    // Exactly one SOL native (added in the explicit push, not duplicated)
    expect(solNatives.length).toBe(1);
  });

  it('handles undefined destChainId without error', () => {
    expect(() => getSourceTokenCandidates(undefined)).not.toThrow();
  });
});
