import state from './lido-stake-ready-to-be-withdrawn';
import { createMockNotificationLidoReadyToBeWithdrawn } from '../../../../components/UI/Notification/__mocks__/mock_notifications';

describe('lido-stake-ready-to-be-withdrawn handler', () => {
  describe('createMenuItem title', () => {
    it('returns a non-empty string', () => {
      const item = state.createMenuItem(
        createMockNotificationLidoReadyToBeWithdrawn(),
      );
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });
  });

  describe('createMenuItem description', () => {
    it('returns a non-empty string', () => {
      const item = state.createMenuItem(
        createMockNotificationLidoReadyToBeWithdrawn(),
      );
      expect(typeof item.description.start).toBe('string');
      expect((item.description.start as string).length).toBeGreaterThan(0);
    });
  });
});
