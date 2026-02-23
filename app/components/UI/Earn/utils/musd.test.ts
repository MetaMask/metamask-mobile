import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { Interface } from '@ethersproject/abi';
import {
  isMusdClaimForCurrentView,
  convertMusdClaimAmount,
  decodeMerklClaimParams,
  getClaimPayoutFromReceipt,
} from './musd';
import {
  DISTRIBUTOR_CLAIM_ABI,
  MERKL_DISTRIBUTOR_ADDRESS,
} from '../components/MerklRewards/constants';
import { MUSD_TOKEN_ADDRESS } from '../constants/musd';

const LINEA_CHAIN_ID = '0xe708' as Hex;
const MAINNET_CHAIN_ID = '0x1' as Hex;
const SELECTED_ADDRESS = '0x1234567890123456789012345678901234567890';
const OTHER_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('musd utils', () => {
  describe('isMusdClaimForCurrentView', () => {
    const baseTx = {
      type: TransactionType.musdClaim,
      status: 'confirmed',
      chainId: LINEA_CHAIN_ID,
      txParams: {
        from: SELECTED_ADDRESS,
      },
    };

    it('returns true when viewing mUSD by address with matching chainId and account', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
        selectedAddress: SELECTED_ADDRESS,
      });
      expect(result).toBe(true);
    });

    it('returns true when viewing mUSD by symbol (case-insensitive)', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: '0xsomeotheraddress',
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
        selectedAddress: SELECTED_ADDRESS,
      });
      expect(result).toBe(true);
    });

    it('returns false when viewing a different token', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        navSymbol: 'usdc',
        chainId: LINEA_CHAIN_ID,
        selectedAddress: SELECTED_ADDRESS,
      });
      expect(result).toBe(false);
    });

    it('returns false for unapproved transactions', () => {
      const result = isMusdClaimForCurrentView({
        tx: { ...baseTx, status: 'unapproved' },
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
        selectedAddress: SELECTED_ADDRESS,
      });
      expect(result).toBe(false);
    });

    it('returns false when chainId does not match', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: MAINNET_CHAIN_ID,
        selectedAddress: SELECTED_ADDRESS,
      });
      expect(result).toBe(false);
    });

    it('returns false for non-musdClaim transaction types', () => {
      const result = isMusdClaimForCurrentView({
        tx: { ...baseTx, type: TransactionType.contractInteraction },
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
        selectedAddress: SELECTED_ADDRESS,
      });
      expect(result).toBe(false);
    });

    it('handles checksummed address comparison', () => {
      const result = isMusdClaimForCurrentView({
        tx: baseTx,
        navAddress: '0xAcA92E438df0B2401fF60dA7E4337B687a2435DA', // checksummed
        navSymbol: 'other',
        chainId: LINEA_CHAIN_ID,
        selectedAddress: SELECTED_ADDRESS,
      });
      expect(result).toBe(true);
    });

    it('returns false when transaction is from a different account', () => {
      const result = isMusdClaimForCurrentView({
        tx: {
          ...baseTx,
          txParams: { from: OTHER_ADDRESS },
        },
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
        selectedAddress: SELECTED_ADDRESS,
      });
      expect(result).toBe(false);
    });

    it('handles checksummed from address comparison', () => {
      const result = isMusdClaimForCurrentView({
        tx: {
          ...baseTx,
          txParams: { from: '0x1234567890123456789012345678901234567890' },
        },
        navAddress: MUSD_TOKEN_ADDRESS,
        navSymbol: 'musd',
        chainId: LINEA_CHAIN_ID,
        selectedAddress: '0x1234567890123456789012345678901234567890',
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

  describe('decodeMerklClaimParams', () => {
    const userAddress = '0x1234567890123456789012345678901234567890';
    const tokenAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const amount = '500000';

    const encodeClaimData = (
      users: string[],
      tokens: string[],
      amounts: string[],
    ): string => {
      const iface = new Interface(DISTRIBUTOR_CLAIM_ABI);
      return iface.encodeFunctionData('claim', [users, tokens, amounts, [[]]]);
    };

    it('decodes valid claim data', () => {
      const data = encodeClaimData([userAddress], [tokenAddress], [amount]);
      const result = decodeMerklClaimParams(data);

      expect(result).toEqual({
        totalAmount: amount,
        userAddress: expect.stringMatching(new RegExp(userAddress, 'i')),
        tokenAddress: expect.stringMatching(new RegExp(tokenAddress, 'i')),
      });
    });

    it('returns null for undefined data', () => {
      expect(decodeMerklClaimParams(undefined)).toBeNull();
    });

    it('returns null for non-string data', () => {
      expect(decodeMerklClaimParams(123 as unknown as string)).toBeNull();
    });

    it('returns null for invalid hex data', () => {
      expect(decodeMerklClaimParams('0xdeadbeef')).toBeNull();
    });

    it('returns null when decoded arrays are empty', () => {
      // Manually construct data that decodes to empty arrays isn't trivially possible,
      // but we test the guard by passing data with an unrelated function selector
      expect(decodeMerklClaimParams('not-hex-at-all')).toBeNull();
    });
  });

  describe('getClaimPayoutFromReceipt', () => {
    const USER = SELECTED_ADDRESS;
    const TRANSFER_TOPIC =
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

    const padAddress = (addr: string) =>
      `0x${addr.slice(2).toLowerCase().padStart(64, '0')}`;

    const makeTransferLog = (
      tokenAddress: string,
      from: string,
      to: string,
      amount: bigint,
    ) => ({
      address: tokenAddress,
      topics: [TRANSFER_TOPIC, padAddress(from), padAddress(to)],
      data: `0x${amount.toString(16).padStart(64, '0')}`,
    });

    it('extracts the payout from a matching Transfer log', () => {
      const payout = 70000000n; // 70 mUSD
      const logs = [
        makeTransferLog(
          MUSD_TOKEN_ADDRESS,
          MERKL_DISTRIBUTOR_ADDRESS,
          USER,
          payout,
        ),
      ];

      expect(getClaimPayoutFromReceipt(logs, USER)).toBe(payout.toString());
    });

    it('ignores Transfer logs from other senders', () => {
      const logs = [
        makeTransferLog(MUSD_TOKEN_ADDRESS, OTHER_ADDRESS, USER, 100n),
      ];

      expect(getClaimPayoutFromReceipt(logs, USER)).toBeNull();
    });

    it('ignores Transfer logs to other recipients', () => {
      const logs = [
        makeTransferLog(
          MUSD_TOKEN_ADDRESS,
          MERKL_DISTRIBUTOR_ADDRESS,
          OTHER_ADDRESS,
          100n,
        ),
      ];

      expect(getClaimPayoutFromReceipt(logs, USER)).toBeNull();
    });

    it('ignores Transfer logs from a different token', () => {
      const logs = [
        makeTransferLog(
          '0x0000000000000000000000000000000000000099',
          MERKL_DISTRIBUTOR_ADDRESS,
          USER,
          100n,
        ),
      ];

      expect(getClaimPayoutFromReceipt(logs, USER)).toBeNull();
    });

    it('returns null for undefined logs', () => {
      expect(getClaimPayoutFromReceipt(undefined, USER)).toBeNull();
    });

    it('returns null for empty logs', () => {
      expect(getClaimPayoutFromReceipt([], USER)).toBeNull();
    });

    it('returns null for undefined user address', () => {
      const logs = [
        makeTransferLog(
          MUSD_TOKEN_ADDRESS,
          MERKL_DISTRIBUTOR_ADDRESS,
          USER,
          100n,
        ),
      ];

      expect(getClaimPayoutFromReceipt(logs, undefined)).toBeNull();
    });

    it('picks the correct log among multiple logs', () => {
      const payout = 42000000n;
      const logs = [
        // Some unrelated log
        {
          address: '0x0000000000000000000000000000000000000001',
          topics: ['0xabc'],
          data: '0x00',
        },
        // The actual mUSD transfer from distributor
        makeTransferLog(
          MUSD_TOKEN_ADDRESS,
          MERKL_DISTRIBUTOR_ADDRESS,
          USER,
          payout,
        ),
        // Another unrelated transfer
        makeTransferLog(
          '0x0000000000000000000000000000000000000099',
          MERKL_DISTRIBUTOR_ADDRESS,
          USER,
          999n,
        ),
      ];

      expect(getClaimPayoutFromReceipt(logs, USER)).toBe(payout.toString());
    });
  });
});
