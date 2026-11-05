import type { Mockttp } from 'mockttp';
import { setupMockRequest } from '../helpers/mockHelpers';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  REFEREE_INVITED_BENEFIT_TITLE,
  referralMeWithInvitedBenefit,
} from '../../component-view/presets/rewardsMoney';

export { REFEREE_INVITED_BENEFIT_TITLE, referralMeWithInvitedBenefit };

/**
 * Session id the fixture seeds. A signed-in e2e wallet mints its own profile
 * id, so the dashboard read still goes through the mocks below.
 */
export const REWARDS_MONEY_E2E_PROFILE_ID = 'rewards-money-referee';

export const REWARDS_MONEY_SUBSCRIPTION_ID = 'rewards-money-subscription';

/**
 * Dev, UAT, and prod. e2e builds use the UAT Money host unless
 * REWARDS_MONEY_API_URL is set; Rewards itself stays on prod.
 */
const REWARDS_MONEY_HOST = String.raw`https:\/\/rewards-money\.(?:dev-|uat-)?api\.cx\.metamask\.io`;

const REWARDS_HOST = String.raw`https:\/\/rewards\.(?:dev-|uat-)?api\.cx\.metamask\.io`;

const EMPTY_LEDGER = {
  results: [],
  has_more: false,
  cursor: null,
  window: null,
};

/**
 * Authenticated Money reads plus the Rewards login the opted-in account
 * attempts. An empty campaigns list keeps `?campaign=money` on the dashboard.
 */
export async function mockRewardsMoneyApi(mockServer: Mockttp): Promise<void> {
  const referralMe = referralMeWithInvitedBenefit();

  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: new RegExp(`^${REWARDS_HOST}\\/auth\\/mobile-login$`),
    responseCode: 200,
    response: {
      sessionId: 'rewards-money-session',
      subscription: {
        id: REWARDS_MONEY_SUBSCRIPTION_ID,
        referralCode: 'SOPHIE',
        accounts: [],
        features: { vip: { enabled: false } },
      },
    },
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(`^${REWARDS_HOST}\\/campaigns$`),
    responseCode: 200,
    response: [],
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(`^${REWARDS_HOST}\\/public\\/client-version-requirements$`),
    responseCode: 200,
    response: {},
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(`^${REWARDS_HOST}\\/benefits(?:\\?.*)?$`),
    responseCode: 200,
    response: { results: [] },
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(`^${REWARDS_MONEY_HOST}\\/referral\\/me$`),
    responseCode: 200,
    response: referralMe,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(`^${REWARDS_MONEY_HOST}\\/earnings\\/summary(?:\\?.*)?$`),
    responseCode: 200,
    response: CLAIMABLE_EARNINGS_SUMMARY,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(`^${REWARDS_MONEY_HOST}\\/earnings\\/ledger(?:\\?.*)?$`),
    responseCode: 200,
    response: EMPTY_LEDGER,
  });
}
