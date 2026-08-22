import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  buildFiatDepositCaipAssetId,
  deriveFiatDepositAsset,
  deriveFiatDepositAssetId,
  resolveFiatDepositTransactionType,
} from './fiatDepositAsset';

describe('fiatDepositAsset', () => {
  describe('resolveFiatDepositTransactionType', () => {
    it('returns the transaction type for non-batch transactions', () => {
      const result = resolveFiatDepositTransactionType(
        { type: TransactionType.moneyAccountDeposit } as TransactionMeta,
        [TransactionType.moneyAccountDeposit],
      );

      expect(result).toBe(TransactionType.moneyAccountDeposit);
    });

    it('returns the first nested enabled type for batch transactions', () => {
      const result = resolveFiatDepositTransactionType(
        {
          type: TransactionType.batch,
          nestedTransactions: [
            { type: TransactionType.tokenMethodApprove },
            { type: TransactionType.moneyAccountDeposit },
          ],
        } as TransactionMeta,
        [TransactionType.moneyAccountDeposit],
      );

      expect(result).toBe(TransactionType.moneyAccountDeposit);
    });
  });

  describe('deriveFiatDepositAsset', () => {
    it('uses feature-flag override when present', () => {
      const result = deriveFiatDepositAsset(
        { type: TransactionType.moneyAccountDeposit } as TransactionMeta,
        [TransactionType.moneyAccountDeposit],
        {
          [TransactionType.moneyAccountDeposit]: {
            address: '0xabc',
            chainId: '0x89',
          },
        },
      );

      expect(result).toEqual({ address: '0xabc', chainId: '0x89' });
    });

    it('falls back to ETH mainnet for moneyAccountDeposit without override', () => {
      const result = deriveFiatDepositAsset(
        { type: TransactionType.moneyAccountDeposit } as TransactionMeta,
        [TransactionType.moneyAccountDeposit],
      );

      expect(result).toEqual({
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
      });
    });
  });

  describe('buildFiatDepositCaipAssetId', () => {
    it('builds slip44 CAIP for native ETH', () => {
      const result = buildFiatDepositCaipAssetId({
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
      });

      expect(result).toBe('eip155:1/slip44:60');
    });

    it('builds slip44 CAIP for Polygon native POL address', () => {
      const result = buildFiatDepositCaipAssetId({
        address: '0x0000000000000000000000000000000000001010',
        chainId: '0x89',
      });

      expect(result).toBe('eip155:137/slip44:966');
    });

    it('builds erc20 CAIP for token addresses', () => {
      const result = buildFiatDepositCaipAssetId({
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: '0x1',
      });

      expect(result).toBe(
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      );
    });
  });

  describe('deriveFiatDepositAssetId', () => {
    it('returns the CAIP id for the resolved deposit asset', () => {
      const result = deriveFiatDepositAssetId(
        { type: TransactionType.perpsDeposit } as TransactionMeta,
        [TransactionType.perpsDeposit],
      );

      expect(result).toBe('eip155:42161/slip44:60');
    });
  });
});
