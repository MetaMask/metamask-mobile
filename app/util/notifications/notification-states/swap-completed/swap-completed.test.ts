import state from './swap-completed';
import { createMockNotificationMetaMaskSwapsCompleted } from '../../../../components/UI/Notification/__mocks__/mock_notifications';

describe('swap-completed handler', () => {
  describe('createMenuItem title', () => {
    it('returns a non-empty string', () => {
      const item = state.createMenuItem(
        createMockNotificationMetaMaskSwapsCompleted(),
      );
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });
  });
});
