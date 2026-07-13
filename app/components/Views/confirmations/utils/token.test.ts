import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { isStablecoin } from './token';
import { RelayFixedSpreadConfig } from './relayFixedSpread';

const MOCK_CONFIG: RelayFixedSpreadConfig = {
  routes: [
    {
      sourceChain: CHAIN_IDS.MAINNET as Hex,
      sourceToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex, // USDC
      targetChain: CHAIN_IDS.MAINNET as Hex,
      targetToken: '0xdac17f958d2ee523a2206206994597c13d831ec7' as Hex, // USDT
    },
    {
      sourceChain: CHAIN_IDS.BSC as Hex,
      sourceToken: '0x55d398326f99059ff775485246999027b3197955' as Hex, // USDT
      targetChain: CHAIN_IDS.BSC as Hex,
      targetToken: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d' as Hex, // USDC
    },
    {
      sourceChain: CHAIN_IDS.LINEA_MAINNET as Hex,
      sourceToken: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff' as Hex, // USDC
      targetChain: CHAIN_IDS.LINEA_MAINNET as Hex,
      targetToken: '0xa219439258ca9da29e9cc4ce5596924745e12b93' as Hex, // USDT
    },
  ],
};

const EMPTY_CONFIG: RelayFixedSpreadConfig = { routes: [] };

describe('isStablecoin', () => {
  it('returns true for USDC on Ethereum (0x1)', () => {
    expect(
      isStablecoin(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        CHAIN_IDS.MAINNET as Hex,
        MOCK_CONFIG,
      ),
    ).toBe(true);
  });

  it('returns true for USDT on BSC (0x38)', () => {
    expect(
      isStablecoin(
        '0x55d398326f99059ff775485246999027b3197955',
        CHAIN_IDS.BSC as Hex,
        MOCK_CONFIG,
      ),
    ).toBe(true);
  });

  it('returns true for a target token in a route', () => {
    expect(
      isStablecoin(
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
        CHAIN_IDS.MAINNET as Hex,
        MOCK_CONFIG,
      ),
    ).toBe(true);
  });

  it('returns false for non-stablecoin address', () => {
    expect(
      isStablecoin(
        '0x0000000000000000000000000000000000000001',
        CHAIN_IDS.MAINNET as Hex,
        MOCK_CONFIG,
      ),
    ).toBe(false);
  });

  it('returns false for unknown chainId', () => {
    expect(
      isStablecoin(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0xfffff' as Hex,
        MOCK_CONFIG,
      ),
    ).toBe(false);
  });

  it('returns false with empty config', () => {
    expect(
      isStablecoin(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        CHAIN_IDS.MAINNET as Hex,
        EMPTY_CONFIG,
      ),
    ).toBe(false);
  });

  it('handles case-insensitive addresses (uppercase input)', () => {
    expect(
      isStablecoin(
        '0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
        CHAIN_IDS.MAINNET as Hex,
        MOCK_CONFIG,
      ),
    ).toBe(true);
  });

  it('matches lowercase route tokens against lowercase input', () => {
    expect(
      isStablecoin(
        '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
        CHAIN_IDS.LINEA_MAINNET as Hex,
        MOCK_CONFIG,
      ),
    ).toBe(true);
  });
});
