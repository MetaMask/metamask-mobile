import { QueryClient } from '@tanstack/react-query';
import { SUBSCRIPTIONS_QUERY_KEY } from './useSubscriptions';
import {
  clearMoneyAccountPlusTrialEligibilityCache,
  MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
} from './moneyAccountPlusTrialEligibility';

describe('clearMoneyAccountPlusTrialEligibilityCache', () => {
  it('drops the cached trial answer and marks subscriptions stale', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const trialKey = [
      ...MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
      'social-user-a',
    ];
    queryClient.setQueryData(trialKey, true);
    queryClient.setQueryData(SUBSCRIPTIONS_QUERY_KEY, []);

    await clearMoneyAccountPlusTrialEligibilityCache(queryClient);

    expect(queryClient.getQueryData(trialKey)).toBeUndefined();
    expect(
      queryClient.getQueryState(SUBSCRIPTIONS_QUERY_KEY)?.isInvalidated,
    ).toBe(true);
  });
});
