import {
  buildCampaignOutcomeToastCompositeKey,
  buildSubscriptionCampaignCompositeKey,
} from './compositeKeys';

describe('rewards compositeKeys', () => {
  describe('buildSubscriptionCampaignCompositeKey', () => {
    it('joins subscription and campaign ids', () => {
      expect(buildSubscriptionCampaignCompositeKey('sub-1', 'camp-2')).toBe(
        'sub-1:camp-2',
      );
    });
  });

  describe('buildCampaignOutcomeToastCompositeKey', () => {
    it('uses campaignId:subscriptionId:variant order', () => {
      expect(
        buildCampaignOutcomeToastCompositeKey('camp-3', 'sub-9', 'winner'),
      ).toBe('camp-3:sub-9:winner');
    });
  });
});
