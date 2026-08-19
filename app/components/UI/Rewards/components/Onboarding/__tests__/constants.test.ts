import { REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL } from '../constants';

describe('Onboarding Constants', () => {
  it('REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL points to the correct MetaMask support URL', () => {
    expect(REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL).toBe(
      'https://support.metamask.io/manage-crypto/metamask-rewards/?utm_source=mobile_app',
    );
  });
});
