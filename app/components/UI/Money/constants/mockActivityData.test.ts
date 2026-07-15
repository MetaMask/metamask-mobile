import MOCK_MONEY_TRANSACTIONS from './mockActivityData';

describe('mockActivityData', () => {
  it('exposes mock transactions with stable ids for Money activity UI', () => {
    expect(MOCK_MONEY_TRANSACTIONS.length).toBeGreaterThan(0);
    for (const tx of MOCK_MONEY_TRANSACTIONS) {
      expect(tx.id).toBeTruthy();
      expect(typeof tx.time).toBe('number');
    }
  });
});
