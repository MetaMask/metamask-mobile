import {
  buildCampaignReminderCompositeKey,
  reminderStorageKeyForComposite,
} from './useCampaignReminderSubscriptions';

describe('useCampaignReminderSubscriptions helpers', () => {
  describe('buildCampaignReminderCompositeKey', () => {
    it('joins subscription and campaign with colon', () => {
      expect(buildCampaignReminderCompositeKey('sub-1', 'camp-2')).toBe(
        'sub-1:camp-2',
      );
    });
  });

  describe('reminderStorageKeyForComposite', () => {
    it('prefixes composite key for isolated MMKV rows', () => {
      expect(reminderStorageKeyForComposite('sub-1:camp-2')).toBe(
        'rewards_campaign_reminder_subscribed::sub-1:camp-2',
      );
    });
  });
});
