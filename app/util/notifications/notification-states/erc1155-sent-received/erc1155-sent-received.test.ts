import state from './erc1155-sent-received';
import {
  createMockNotificationERC1155Sent,
  createMockNotificationERC1155Received,
} from '../../../../components/UI/Notification/__mocks__/mock_notifications';

describe('erc1155-sent-received handler', () => {
  describe('createMenuItem title', () => {
    it('returns a non-empty string for sent', () => {
      const item = state.createMenuItem(createMockNotificationERC1155Sent());
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });

    it('returns a non-empty string for received', () => {
      const item = state.createMenuItem(
        createMockNotificationERC1155Received(),
      );
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });
  });
});
