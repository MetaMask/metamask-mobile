import { NETWORK_CHAIN_ID } from '../../../../util/networks/customNetworks';
import { getSwapDestToken } from './getSwapDestToken';

const ARC_CHAIN_ID = NETWORK_CHAIN_ID.ARC; // '0x13b2'
const ARC_EURC_ADDRESS = '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1';
const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const MAINNET_CHAIN_ID = NETWORK_CHAIN_ID.MAINNET; // '0x1'
const MAINNET_MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const UNKNOWN_CHAIN_ID = '0xdeadbeef';

describe('getSwapDestToken', () => {
  describe('without sourceAddress — returns chain-wide default', () => {
    it('returns the chain default for a configured chain (Mainnet → mUSD)', () => {
      const result = getSwapDestToken(MAINNET_CHAIN_ID);

      expect(result).toBeDefined();
      expect(result?.address).toBe(MAINNET_MUSD_ADDRESS);
      expect(result?.symbol).toBe('mUSD');
    });

    it('returns the chain default for Arc (EURC)', () => {
      const result = getSwapDestToken(ARC_CHAIN_ID);

      expect(result).toBeDefined();
      expect(result?.address).toBe(ARC_EURC_ADDRESS);
      expect(result?.symbol).toBe('EURC');
    });

    it('returns undefined for an unconfigured chain', () => {
      const result = getSwapDestToken(UNKNOWN_CHAIN_ID);

      expect(result).toBeUndefined();
    });
  });

  describe('with sourceAddress — returns per-source override only', () => {
    it('returns the USDC override for EURC on Arc', () => {
      const result = getSwapDestToken(ARC_CHAIN_ID, ARC_EURC_ADDRESS);

      expect(result).toBeDefined();
      expect(result?.address).toBe(ARC_USDC_ADDRESS);
      expect(result?.symbol).toBe('USDC');
    });

    it('matches the source address case-insensitively', () => {
      const result = getSwapDestToken(
        ARC_CHAIN_ID,
        ARC_EURC_ADDRESS.toLowerCase(),
      );

      expect(result?.address).toBe(ARC_USDC_ADDRESS);
    });

    // Regression: before the fix, this returned the Mainnet chain default (mUSD)
    // instead of undefined, which caused `destTokenOverride` to be non-undefined
    // for every token on Mainnet — not just tokens with an explicit override.
    it('returns undefined (NOT the chain default) when the source has no per-source override', () => {
      const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';

      const result = getSwapDestToken(MAINNET_CHAIN_ID, DAI_ADDRESS);

      expect(result).toBeUndefined();
    });

    // Same regression but on Arc: a non-EURC token should not get the EURC default.
    it('returns undefined for a non-EURC token on Arc (no override configured)', () => {
      const SOME_OTHER_ARC_TOKEN = '0x1111111111111111111111111111111111111111';

      const result = getSwapDestToken(ARC_CHAIN_ID, SOME_OTHER_ARC_TOKEN);

      expect(result).toBeUndefined();
    });

    it('returns undefined for an unconfigured chain even with a sourceAddress', () => {
      const result = getSwapDestToken(
        UNKNOWN_CHAIN_ID,
        '0x1111111111111111111111111111111111111111',
      );

      expect(result).toBeUndefined();
    });
  });
});
