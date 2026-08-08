import state from './lido-withdrawal-requested';
import { createMockNotificationLidoWithdrawalRequested } from '../../../../components/UI/Notification/__mocks__/mock_notifications';

describe('lido-withdrawal-requested handler', () => {
  describe('createMenuItem title', () => {
    it('returns a non-empty string', () => {
      const item = state.createMenuItem(
        createMockNotificationLidoWithdrawalRequested(),
      );
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });
  });

  describe('createMenuItem description', () => {
    it('returns a non-empty string', () => {
      const item = state.createMenuItem(
        createMockNotificationLidoWithdrawalRequested(),
      );
      expect(typeof item.description.start).toBe('string');
      expect((item.description.start as string).length).toBeGreaterThan(0);
    });
  });
});
