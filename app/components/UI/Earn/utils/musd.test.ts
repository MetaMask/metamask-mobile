import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { isMusdClaimForCurrentView, convertMusdClaimAmount } from './musd';
import { MUSD_TOKEN_ADDRESS } from '../constants/musd';

const LINEA_CHAIN_ID = '0xe708' as Hex;
const MAINNET_CHAIN_ID = '0x1' as Hex;

describe('musd utils', () => {
  describe('isMusdClaimForCurrentView', () => {
    const baseTx = {
      type: TransactionType.musdClaim,
      status: 'confirmed',
      chainId: LINEA_CHAIN_ID,
    };

    it('returns true when viewing mUSD by address with matching chainId', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
      });
      expect(result).toBe(true);
    });

    it('returns true when viewing mUSD by symbol (case-insensitive)', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: '0xsomeotheraddress',
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
      });
      expect(result).toBe(true);
    });

    it('returns false when viewing a different token', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        navSymbol: 'usdc',
        chainId: LINEA_CHAIN_ID,
      });
      expect(result).toBe(false);
    });

    it('returns false for unapproved transactions', () => {
      const result = isMusdClaimForCurrentView({
        tx: { ...baseTx, status: 'unapproved' },
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
      });
      expect(result).toBe(false);
    });

    it('returns false when chainId does not match', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: MAINNET_CHAIN_ID,
      });
      expect(result).toBe(false);
    });

    it('returns false for non-musdClaim transaction types', () => {
      const result = isMusdClaimForCurrentView({
        tx: { ...baseTx, type: TransactionType.contractInteraction },
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
      });
      expect(result).toBe(false);
    });

    it('handles checksummed address comparison', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: '0xAcA92E438df0B2401fF60dA7E4337B687a2435DA', // checksummed
        navSymbol: 'other',
        chainId: LINEA_CHAIN_ID,
      });
      expect(result).toBe(true);
    });
  });

  describe('convertMusdClaimAmount', () => {
    // 100 mUSD in raw units (6 decimals)
    const claimAmountRaw = '100000000';

    it('converts to user currency when rates are available', () => {
      // ETH = $2000 USD, ETH = €1800 EUR
      // So €1 = $2000/1800 = $1.11 USD
      // 100 mUSD ≈ $100 USD ≈ €90 EUR
      const result = convertMusdClaimAmount({
        claimAmountRaw,
        conversionRate: 1800, // ETH to EUR
        usdConversionRate: 2000, // ETH to USD
      });

      expect(result.claimAmountDecimal.toNumber()).toBe(100);
      expect(result.fiatValue.toNumber()).toBe(90); // 100 * (1800/2000)
      expect(result.isConverted).toBe(true);
    });

    it('falls back to USD when conversionRate is 0', () => {
      const result = convertMusdClaimAmount({
        claimAmountRaw,
        conversionRate: 0,
        usdConversionRate: 2000,
      });

      expect(result.claimAmountDecimal.toNumber()).toBe(100);
      expect(result.fiatValue.toNumber()).toBe(100); // 1:1 with USD
      expect(result.isConverted).toBe(false);
    });

    it('falls back to USD when usdConversionRate is 0', () => {
      const result = convertMusdClaimAmount({
        claimAmountRaw,
        conversionRate: 1800,
        usdConversionRate: 0,
      });

      expect(result.claimAmountDecimal.toNumber()).toBe(100);
      expect(result.fiatValue.toNumber()).toBe(100);
      expect(result.isConverted).toBe(false);
    });

    it('accepts BigNumber for conversionRate', () => {
      const result = convertMusdClaimAmount({
        claimAmountRaw,
        conversionRate: new BigNumber(1800),
        usdConversionRate: 2000,
      });

      expect(result.fiatValue.toNumber()).toBe(90);
      expect(result.isConverted).toBe(true);
    });

    it('handles small claim amounts correctly', () => {
      // 0.01 mUSD
      const result = convertMusdClaimAmount({
        claimAmountRaw: '10000',
        conversionRate: 2000,
        usdConversionRate: 2000,
      });

      expect(result.claimAmountDecimal.toNumber()).toBe(0.01);
      expect(result.fiatValue.toNumber()).toBe(0.01);
      expect(result.isConverted).toBe(true);
    });

    it('handles large claim amounts correctly', () => {
      // 1,000,000 mUSD
      const result = convertMusdClaimAmount({
        claimAmountRaw: '1000000000000',
        conversionRate: 1800,
        usdConversionRate: 2000,
      });

      expect(result.claimAmountDecimal.toNumber()).toBe(1000000);
      expect(result.fiatValue.toNumber()).toBe(900000);
      expect(result.isConverted).toBe(true);
    });
  });
});
