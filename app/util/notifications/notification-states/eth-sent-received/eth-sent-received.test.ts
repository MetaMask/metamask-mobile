import state from './eth-sent-received';
import {
  createMockNotificationEthSent,
  createMockNotificationEthReceived,
} from '../../../../components/UI/Notification/__mocks__/mock_notifications';

describe('eth-sent-received handler', () => {
  describe('createMenuItem title', () => {
    it('returns a non-empty string for sent', () => {
      const item = state.createMenuItem(createMockNotificationEthSent());
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });

    it('returns a non-empty string for received', () => {
      const item = state.createMenuItem(createMockNotificationEthReceived());
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });
  });
});
