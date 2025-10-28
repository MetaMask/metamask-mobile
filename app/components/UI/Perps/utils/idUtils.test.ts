import {
  generatePerpsId,
  generateDepositId,
  generateWithdrawalId,
  generateOrderId,
  generateTransactionId,
} from './idUtils';

describe('idUtils', () => {
  describe('generatePerpsId', () => {
    it('generates unique IDs without prefix', () => {
      const id1 = generatePerpsId();
      const id2 = generatePerpsId();

      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(id2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(id1).not.toBe(id2);
    });

    it('generates unique IDs with prefix', () => {
      const id1 = generatePerpsId('deposit');
      const id2 = generatePerpsId('deposit');

      expect(id1).toMatch(
        /^deposit-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(id2).toMatch(
        /^deposit-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(id1).not.toBe(id2);
    });

    it('generates different IDs for different prefixes', () => {
      const depositId = generatePerpsId('deposit');
      const withdrawalId = generatePerpsId('withdrawal');

      expect(depositId).toMatch(/^deposit-/);
      expect(withdrawalId).toMatch(/^withdrawal-/);
      expect(depositId).not.toBe(withdrawalId);
    });
  });

  describe('generateDepositId', () => {
    it('generates deposit IDs with correct format', () => {
      const id = generateDepositId();

      expect(id).toMatch(
        /^deposit-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('generates unique deposit IDs', () => {
      const id1 = generateDepositId();
      const id2 = generateDepositId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('generateWithdrawalId', () => {
    it('generates withdrawal IDs with correct format', () => {
      const id = generateWithdrawalId();

      expect(id).toMatch(
        /^withdrawal-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('generates unique withdrawal IDs', () => {
      const id1 = generateWithdrawalId();
      const id2 = generateWithdrawalId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('generateOrderId', () => {
    it('generates order IDs with correct format', () => {
      const id = generateOrderId();

      expect(id).toMatch(
        /^order-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('generates unique order IDs', () => {
      const id1 = generateOrderId();
      const id2 = generateOrderId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTransactionId', () => {
    it('generates transaction IDs with correct format', () => {
      const id = generateTransactionId();

      expect(id).toMatch(
        /^transaction-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('generates unique transaction IDs', () => {
      const id1 = generateTransactionId();
      const id2 = generateTransactionId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('uniqueness', () => {
    it('generates unique IDs across different types', () => {
      const depositId = generateDepositId();
      const withdrawalId = generateWithdrawalId();
      const orderId = generateOrderId();
      const transactionId = generateTransactionId();

      const ids = [depositId, withdrawalId, orderId, transactionId];
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('generates unique IDs in bulk', () => {
      const ids = Array.from({ length: 100 }, () => generatePerpsId());
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(100);
    });
  });
});
