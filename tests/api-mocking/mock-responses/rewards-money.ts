import type { Mockttp } from 'mockttp';
import { setupMockRequest } from '../helpers/mockHelpers';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  REFEREE_INVITED_BENEFIT_TITLE,
  referralMeWithInvitedBenefit,
} from '../../component-view/presets/rewardsMoney';
import type { EarningsSummaryDto } from '../../../app/core/Engine/controllers/rewards-money-controller/types';

export { REFEREE_INVITED_BENEFIT_TITLE, referralMeWithInvitedBenefit };

export const REWARDS_MONEY_E2E_PROFILE_ID = 'rewards-money-referee';

export const REWARDS_MONEY_SUBSCRIPTION_ID = 'rewards-money-subscription';

const REWARDS_MONEY_HOST = String.raw`https:\/\/rewards-money\.(?:dev-|uat-)?api\.cx\.metamask\.io`;

const REWARDS_HOST = String.raw`https:\/\/rewards\.(?:dev-|uat-)?api\.cx\.metamask\.io`;

const EMPTY_LEDGER = {
  results: [],
  has_more: false,
  cursor: null,
  window: null,
};
const CLEARED_TAX_ME = {
  state: 'COMPLETE_OR_VERIFIED',
  next_action: 'NONE',
  reason: null,
  clears_until: null,
  cleared: true,
  can_change_answer: false,
};

export async function mockRewardsMoneyApi(
  mockServer: Mockttp,
  summary: EarningsSummaryDto = CLAIMABLE_EARNINGS_SUMMARY,
): Promise<void> {
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
    response: summary,
  });
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(`^${REWARDS_MONEY_HOST}\\/earnings\\/ledger(?:\\?.*)?$`),
    responseCode: 200,
    response: EMPTY_LEDGER,
  });
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(
      `^${REWARDS_MONEY_HOST}\\/earnings\\/claim\\/me(?:\\?.*)?$`,
    ),
    responseCode: 200,
    response: { results: [], has_more: false, cursor: null },
  });
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(
      `^${REWARDS_MONEY_HOST}\\/referral\\/me\\/commissions(?:\\?.*)?$`,
    ),
    responseCode: 200,
    response: EMPTY_LEDGER,
  });
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: new RegExp(`^${REWARDS_MONEY_HOST}\\/tax\\/me(?:\\?.*)?$`),
    responseCode: 200,
    response: CLEARED_TAX_ME,
  });
}
