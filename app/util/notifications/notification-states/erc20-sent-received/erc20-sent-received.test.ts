import state from './erc20-sent-received';
import {
  createMockNotificationERC20Sent,
  createMockNotificationERC20Received,
} from '../../../../components/UI/Notification/__mocks__/mock_notifications';

describe('erc20-sent-received handler', () => {
  describe('createMenuItem title', () => {
    it('returns a non-empty string for sent', () => {
      const item = state.createMenuItem(createMockNotificationERC20Sent());
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });

    it('returns a non-empty string for received', () => {
      const item = state.createMenuItem(createMockNotificationERC20Received());
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });
  });
});
