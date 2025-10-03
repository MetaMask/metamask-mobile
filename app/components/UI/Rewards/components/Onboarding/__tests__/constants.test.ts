import { REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL } from '../constants';

describe('Onboarding Constants', () => {
  describe('REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL', () => {
    it('should be defined', () => {
      expect(REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL).toBeDefined();
    });

    it('should be a valid URL string', () => {
      expect(typeof REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL).toBe('string');
      expect(REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL).toMatch(
        /^https?:\/\//,
      );
    });

    it('should point to the correct MetaMask support URL', () => {
      expect(REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL).toBe(
        'https://support.metamask.io/manage-crypto/rewards',
      );
    });
  });
});
