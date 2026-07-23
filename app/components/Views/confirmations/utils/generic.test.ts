import { CHAIN_IDS } from '@metamask/transaction-controller';
import { TokenI } from '../../../UI/Tokens/types';
import {
  getHostFromUrl,
  isNativeToken,
  getPaymentMethodDisplayName,
} from './generic';

describe('generic utils', () => {
  describe('getHostFromUrl', () => {
    it('returns undefined when url is empty', () => {
      const result = getHostFromUrl('');

      expect(result).toBe(undefined);
    });

    it('returns host when url is valid', () => {
      const result = getHostFromUrl('https://www.dummy.com');

      expect(result).toBe('www.dummy.com');
    });
  });

  describe('isNativeToken', () => {
    it('returns true when isNative is true', () => {
      const token = {
        isNative: true,
        isETH: false,
        address: '0x1234',
        chainId: CHAIN_IDS.MAINNET,
      } as TokenI;

      const result = isNativeToken(token);

      expect(result).toBe(true);
    });

    it('returns true when isETH is true', () => {
      const token = {
        isNative: false,
        isETH: true,
        address: '0x1234',
        chainId: CHAIN_IDS.MAINNET,
      } as TokenI;

      const result = isNativeToken(token);

      expect(result).toBe(true);
    });

    it('returns true when address matches native token address for Ethereum mainnet', () => {
      const token = {
        isNative: false,
        isETH: false,
        address: '0x0000000000000000000000000000000000000000',
        chainId: CHAIN_IDS.MAINNET,
      } as TokenI;

      const result = isNativeToken(token);

      expect(result).toBe(true);
    });

    it('returns true when address matches native token address for Polygon', () => {
      const token = {
        isNative: false,
        isETH: false,
        address: '0x0000000000000000000000000000000000001010',
        chainId: CHAIN_IDS.POLYGON,
      } as TokenI;

      const result = isNativeToken(token);

      expect(result).toBe(true);
    });

    it('returns false when all conditions are false', () => {
      const token = {
        isNative: false,
        isETH: false,
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        chainId: CHAIN_IDS.MAINNET,
      } as TokenI;

      const result = isNativeToken(token);

      expect(result).toBe(false);
    });

    it('returns false when address does not match native token address', () => {
      const token = {
        isNative: false,
        isETH: false,
        address: '0x1234567890123456789012345678901234567890',
        chainId: CHAIN_IDS.MAINNET,
      } as TokenI;

      const result = isNativeToken(token);

      expect(result).toBe(false);
    });

    it('returns true when isNative is true regardless of address', () => {
      const token = {
        isNative: true,
        isETH: false,
        address: '0x1234567890123456789012345678901234567890',
        chainId: CHAIN_IDS.MAINNET,
      } as TokenI;

      const result = isNativeToken(token);

      expect(result).toBe(true);
    });

    it('returns true when isETH is true regardless of address', () => {
      const token = {
        isNative: false,
        isETH: true,
        address: '0x1234567890123456789012345678901234567890',
        chainId: CHAIN_IDS.MAINNET,
      } as TokenI;

      const result = isNativeToken(token);

      expect(result).toBe(true);
    });
  });

  describe('getPaymentMethodDisplayName', () => {
    it('overrides display name when paymentType has a mapping', () => {
      expect(
        getPaymentMethodDisplayName('debit-credit-card', 'Debit or Credit'),
      ).toBe('Debit');
    });

    it('falls back to name when paymentType has no mapping', () => {
      expect(getPaymentMethodDisplayName('apple-pay', 'Apple Pay')).toBe(
        'Apple Pay',
      );
      expect(
        getPaymentMethodDisplayName('bank-transfer', 'Bank Transfer'),
      ).toBe('Bank Transfer');
    });

    it('returns fallbackName when paymentType is undefined', () => {
      expect(getPaymentMethodDisplayName(undefined, 'Apple Pay')).toBe(
        'Apple Pay',
      );
    });

    it('returns undefined when both args are undefined', () => {
      expect(getPaymentMethodDisplayName(undefined, undefined)).toBeUndefined();
    });

    it('returns fallbackName for empty paymentType', () => {
      expect(getPaymentMethodDisplayName('', 'Some Name')).toBe('Some Name');
    });
  });
});
