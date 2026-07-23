import {
  buildCampaignOutcomeToastCompositeKey,
  buildSubscriptionCampaignCompositeKey,
  buildSubscriptionVipTransactionCompositeKey,
} from './compositeKeys';

describe('rewards compositeKeys', () => {
  describe('buildSubscriptionCampaignCompositeKey', () => {
    it('joins subscription and campaign ids', () => {
      expect(buildSubscriptionCampaignCompositeKey('sub-1', 'camp-2')).toBe(
        'sub-1:camp-2',
      );
    });
  });

  describe('buildSubscriptionVipTransactionCompositeKey', () => {
    it('joins subscription id and vip transaction type', () => {
      expect(
        buildSubscriptionVipTransactionCompositeKey('sub-1', 'PERPS'),
      ).toBe('sub-1:PERPS');
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
