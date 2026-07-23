import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { isRouteToken, RelayFixedSpreadConfig } from './relayFixedSpread';

const MOCK_CONFIG: RelayFixedSpreadConfig = {
  routes: [
    {
      sourceChain: CHAIN_IDS.MAINNET as Hex,
      sourceToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
      targetChain: CHAIN_IDS.MAINNET as Hex,
      targetToken: '0xdac17f958d2ee523a2206206994597c13d831ec7' as Hex,
    },
    {
      sourceChain: CHAIN_IDS.BSC as Hex,
      sourceToken: '0x55d398326f99059ff775485246999027b3197955' as Hex,
      targetChain: CHAIN_IDS.BSC as Hex,
      targetToken: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d' as Hex,
    },
    {
      sourceChain: CHAIN_IDS.LINEA_MAINNET as Hex,
      sourceToken: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff' as Hex,
      targetChain: CHAIN_IDS.LINEA_MAINNET as Hex,
      targetToken: '0xa219439258ca9da29e9cc4ce5596924745e12b93' as Hex,
    },
  ],
};

const EMPTY_CONFIG: RelayFixedSpreadConfig = { routes: [] };

describe('isRouteToken', () => {
  it('returns true for a source token', () => {
    expect(
      isRouteToken(MOCK_CONFIG, {
        chainId: CHAIN_IDS.MAINNET,
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      }),
    ).toBe(true);
  });

  it('returns true for a target token', () => {
    expect(
      isRouteToken(MOCK_CONFIG, {
        chainId: CHAIN_IDS.MAINNET,
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      }),
    ).toBe(true);
  });

  it('returns false for unknown address', () => {
    expect(
      isRouteToken(MOCK_CONFIG, {
        chainId: CHAIN_IDS.MAINNET,
        address: '0x0000000000000000000000000000000000000001',
      }),
    ).toBe(false);
  });

  it('returns false for unknown chainId', () => {
    expect(
      isRouteToken(MOCK_CONFIG, {
        chainId: '0xfffff',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      }),
    ).toBe(false);
  });

  it('returns false with empty config', () => {
    expect(
      isRouteToken(EMPTY_CONFIG, {
        chainId: CHAIN_IDS.MAINNET,
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      }),
    ).toBe(false);
  });

  it('handles case-insensitive addresses', () => {
    expect(
      isRouteToken(MOCK_CONFIG, {
        chainId: CHAIN_IDS.MAINNET,
        address: '0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
      }),
    ).toBe(true);
  });
});
