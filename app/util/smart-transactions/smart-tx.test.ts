import { publishHook } from './smart-tx';

describe('smart-tx', () => {
  describe('publishHook', () => {
    it('should return undefined transactionHash if transaction is not a smart transaction', async () => {
      const result = await publishHook({
        transactionMeta: {} as any,
        smartTransactionsController: {} as any,
        transactionController: {} as any,
        isSmartTransaction: false,
        approvalController: {} as any,
        featureFlags: {} as any,
      });
      expect(result).toEqual({
        transactionHash: undefined,
      });
    });
    it.skip('should start an approval flow if tx is not a MM Swap swap tx', () => {});
    it.skip('should not start an approval flow if tx is MM Swap swap tx', () => {});
    it.skip('should end the approval flow once hook is finished');
  });
});
