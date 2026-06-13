import state from './erc721-sent-received';
import {
  createMockNotificationERC721Sent,
  createMockNotificationERC721Received,
} from '../../../../components/UI/Notification/__mocks__/mock_notifications';

describe('erc721-sent-received handler', () => {
  describe('createMenuItem title', () => {
    it('returns a non-empty string for sent', () => {
      const item = state.createMenuItem(createMockNotificationERC721Sent());
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });

    it('returns a non-empty string for received', () => {
      const item = state.createMenuItem(createMockNotificationERC721Received());
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });
  });
});
