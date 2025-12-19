import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { ethers } from 'ethers';
import {
  AAVE_V3_SUPPLY_ABI,
  AAVE_V3_WITHDRAW_ABI,
  LENDING_TYPES,
  getLendingTransactionInfo,
  decodeLendingTransactionData,
  extractUnderlyingTokenAddress,
  getTrackEventProperties,
  getMetricsEvent,
  LendingTransactionInfo,
} from './lending-transaction';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { EARN_EXPERIENCES } from '../constants/experiences';

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('lending-transaction utils', () => {
  const UNDERLYING_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const CHAIN_ID = '0x1';

  const createSupplyData = (): string => {
    const contractInterface = new ethers.utils.Interface(AAVE_V3_SUPPLY_ABI);
    return contractInterface.encodeFunctionData('supply', [
      UNDERLYING_TOKEN_ADDRESS,
      '1000000',
      '0x1230000000000000000000000000000000000456',
      0,
    ]);
  };

  const createWithdrawData = (): string => {
    const contractInterface = new ethers.utils.Interface(AAVE_V3_WITHDRAW_ABI);
    return contractInterface.encodeFunctionData('withdraw', [
      UNDERLYING_TOKEN_ADDRESS,
      '1000000',
      '0x1230000000000000000000000000000000000456',
    ]);
  };

  const createTransactionMeta = (
    type: TransactionType,
    data?: string,
    nestedTransactions?: { type: TransactionType; data?: string }[],
  ): TransactionMeta =>
    ({
      id: 'test-tx-1',
      type,
      chainId: CHAIN_ID,
      networkClientId: 'mainnet',
      time: Date.now(),
      txParams: {
        from: '0x1230000000000000000000000000000000000456',
        to: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        data,
      },
      nestedTransactions,
    }) as TransactionMeta;

  describe('LENDING_TYPES', () => {
    it('contains lendingDeposit and lendingWithdraw types', () => {
      expect(LENDING_TYPES).toContain(TransactionType.lendingDeposit);
      expect(LENDING_TYPES).toContain(TransactionType.lendingWithdraw);
      expect(LENDING_TYPES).toHaveLength(2);
    });
  });

  describe('getLendingTransactionInfo', () => {
    describe('direct transactions', () => {
      it('returns info for direct lendingDeposit transaction', () => {
        const data = createSupplyData();
        const txMeta = createTransactionMeta(
          TransactionType.lendingDeposit,
          data,
        );

        const result = getLendingTransactionInfo(txMeta);

        expect(result).toEqual({
          type: TransactionType.lendingDeposit,
          data,
        });
      });

      it('returns info for direct lendingWithdraw transaction', () => {
        const data = createWithdrawData();
        const txMeta = createTransactionMeta(
          TransactionType.lendingWithdraw,
          data,
        );

        const result = getLendingTransactionInfo(txMeta);

        expect(result).toEqual({
          type: TransactionType.lendingWithdraw,
          data,
        });
      });

      it('returns null for direct lending tx without data', () => {
        const txMeta = createTransactionMeta(TransactionType.lendingDeposit);

        const result = getLendingTransactionInfo(txMeta);

        expect(result).toBeNull();
      });
    });

    describe('batch transactions', () => {
      it('extracts lendingDeposit from nested transactions', () => {
        const depositData = createSupplyData();
        const txMeta = createTransactionMeta(TransactionType.batch, undefined, [
          { type: TransactionType.tokenMethodApprove, data: '0xapprove' },
          { type: TransactionType.lendingDeposit, data: depositData },
        ]);

        const result = getLendingTransactionInfo(txMeta);

        expect(result).toEqual({
          type: TransactionType.lendingDeposit,
          data: depositData,
        });
      });

      it('extracts lendingWithdraw from nested transactions', () => {
        const withdrawData = createWithdrawData();
        const txMeta = createTransactionMeta(TransactionType.batch, undefined, [
          { type: TransactionType.lendingWithdraw, data: withdrawData },
        ]);

        const result = getLendingTransactionInfo(txMeta);

        expect(result).toEqual({
          type: TransactionType.lendingWithdraw,
          data: withdrawData,
        });
      });

      it('returns null for batch without lending nested tx', () => {
        const txMeta = createTransactionMeta(TransactionType.batch, undefined, [
          { type: TransactionType.tokenMethodApprove, data: '0xapprove' },
          { type: TransactionType.swap, data: '0xswap' },
        ]);

        const result = getLendingTransactionInfo(txMeta);

        expect(result).toBeNull();
      });

      it('returns null for batch with nested lending tx but no data', () => {
        const txMeta = createTransactionMeta(TransactionType.batch, undefined, [
          { type: TransactionType.lendingDeposit },
        ]);

        const result = getLendingTransactionInfo(txMeta);

        expect(result).toBeNull();
      });
    });

    describe('non-lending transactions', () => {
      it('returns null for swap transaction', () => {
        const txMeta = createTransactionMeta(TransactionType.swap, '0xdata');

        const result = getLendingTransactionInfo(txMeta);

        expect(result).toBeNull();
      });
    });
  });

  describe('decodeLendingTransactionData', () => {
    it('decodes token address and amount from deposit (supply) data', () => {
      const data = createSupplyData();
      const lendingInfo: LendingTransactionInfo = {
        type: TransactionType.lendingDeposit,
        data,
      };

      const result = decodeLendingTransactionData(lendingInfo);

      expect(result).not.toBeNull();
      expect(result?.tokenAddress.toLowerCase()).toBe(
        UNDERLYING_TOKEN_ADDRESS.toLowerCase(),
      );
      expect(result?.amountMinimalUnit).toBe('1000000');
    });

    it('decodes token address and amount from withdraw data', () => {
      const data = createWithdrawData();
      const lendingInfo: LendingTransactionInfo = {
        type: TransactionType.lendingWithdraw,
        data,
      };

      const result = decodeLendingTransactionData(lendingInfo);

      expect(result).not.toBeNull();
      expect(result?.tokenAddress.toLowerCase()).toBe(
        UNDERLYING_TOKEN_ADDRESS.toLowerCase(),
      );
      expect(result?.amountMinimalUnit).toBe('1000000');
    });

    it('returns null for invalid data', () => {
      const lendingInfo: LendingTransactionInfo = {
        type: TransactionType.lendingDeposit,
        data: '0xinvaliddata',
      };

      const result = decodeLendingTransactionData(lendingInfo);

      expect(result).toBeNull();
    });
  });

  describe('extractUnderlyingTokenAddress (deprecated)', () => {
    it('decodes token address from deposit (supply) data', () => {
      const data = createSupplyData();
      const lendingInfo: LendingTransactionInfo = {
        type: TransactionType.lendingDeposit,
        data,
      };

      const result = extractUnderlyingTokenAddress(lendingInfo);

      expect(result?.toLowerCase()).toBe(
        UNDERLYING_TOKEN_ADDRESS.toLowerCase(),
      );
    });

    it('decodes token address from withdraw data', () => {
      const data = createWithdrawData();
      const lendingInfo: LendingTransactionInfo = {
        type: TransactionType.lendingWithdraw,
        data,
      };

      const result = extractUnderlyingTokenAddress(lendingInfo);

      expect(result?.toLowerCase()).toBe(
        UNDERLYING_TOKEN_ADDRESS.toLowerCase(),
      );
    });

    it('returns null for invalid data', () => {
      const lendingInfo: LendingTransactionInfo = {
        type: TransactionType.lendingDeposit,
        data: '0xinvaliddata',
      };

      const result = extractUnderlyingTokenAddress(lendingInfo);

      expect(result).toBeNull();
    });
  });

  describe('getTrackEventProperties', () => {
    it('builds correct properties for deposit with all data', () => {
      const txMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        '0xdata',
      );
      const earnToken = {
        symbol: 'USDC',
        address: UNDERLYING_TOKEN_ADDRESS,
        decimals: 6,
        balanceFormatted: '100.00 USDC',
      };

      const result = getTrackEventProperties(
        txMeta,
        'deposit',
        earnToken,
        '1000000',
        'Ethereum Mainnet',
      );

      expect(result).toEqual({
        action_type: 'deposit',
        token: 'USDC',
        network: 'Ethereum Mainnet',
        user_token_balance: '100.00 USDC',
        transaction_value: '1 USDC',
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        transaction_id: 'test-tx-1',
        transaction_type: TransactionType.lendingDeposit,
      });
    });

    it('builds correct properties for withdrawal with all data', () => {
      const txMeta = createTransactionMeta(
        TransactionType.lendingWithdraw,
        '0xdata',
      );
      const earnToken = {
        symbol: 'USDC',
        address: UNDERLYING_TOKEN_ADDRESS,
        decimals: 6,
        balanceFormatted: '50.00 USDC',
      };

      const result = getTrackEventProperties(
        txMeta,
        'withdrawal',
        earnToken,
        '500000',
        'Arbitrum One',
      );

      expect(result).toEqual({
        action_type: 'withdrawal',
        token: 'USDC',
        network: 'Arbitrum One',
        user_token_balance: '50.00 USDC',
        transaction_value: '0.5 USDC',
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        transaction_id: 'test-tx-1',
        transaction_type: TransactionType.lendingWithdraw,
      });
    });

    it('handles undefined earnToken', () => {
      const txMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        '0xdata',
      );

      const result = getTrackEventProperties(txMeta, 'deposit', undefined);

      expect(result.token).toBeUndefined();
      expect(result.user_token_balance).toBeUndefined();
      expect(result.transaction_value).toBeUndefined();
    });

    it('handles missing amount and network', () => {
      const txMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        '0xdata',
      );
      const earnToken = {
        symbol: 'USDC',
        address: UNDERLYING_TOKEN_ADDRESS,
        decimals: 6,
        balanceFormatted: '100.00 USDC',
      };

      const result = getTrackEventProperties(txMeta, 'deposit', earnToken);

      expect(result.network).toBeUndefined();
      expect(result.transaction_value).toBeUndefined();
      expect(result.user_token_balance).toBe('100.00 USDC');
    });
  });

  describe('getMetricsEvent', () => {
    it('returns correct event for submitted', () => {
      expect(getMetricsEvent('submitted')).toBe(
        MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED,
      );
    });

    it('returns correct event for confirmed', () => {
      expect(getMetricsEvent('confirmed')).toBe(
        MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED,
      );
    });

    it('returns correct event for rejected', () => {
      expect(getMetricsEvent('rejected')).toBe(
        MetaMetricsEvents.EARN_TRANSACTION_REJECTED,
      );
    });

    it('returns correct event for dropped', () => {
      expect(getMetricsEvent('dropped')).toBe(
        MetaMetricsEvents.EARN_TRANSACTION_DROPPED,
      );
    });

    it('returns correct event for failed', () => {
      expect(getMetricsEvent('failed')).toBe(
        MetaMetricsEvents.EARN_TRANSACTION_FAILED,
      );
    });
  });
});
