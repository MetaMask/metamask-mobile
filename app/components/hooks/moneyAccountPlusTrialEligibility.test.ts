import { QueryClient } from '@tanstack/react-query';
import { SUBSCRIPTIONS_QUERY_KEY } from './useSubscriptions';
import {
  clearMoneyAccountPlusTrialEligibilityCache,
  MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
} from './moneyAccountPlusTrialEligibility';

const trialKey = [
  ...MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
  'social-user-a',
];

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

describe('clearMoneyAccountPlusTrialEligibilityCache', () => {
  it('drops the cached trial answer and leaves subscriptions untouched', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(trialKey, true);
    queryClient.setQueryData(SUBSCRIPTIONS_QUERY_KEY, []);

    clearMoneyAccountPlusTrialEligibilityCache(queryClient);

    expect(queryClient.getQueryData(trialKey)).toBeUndefined();
    expect(queryClient.getQueryData(SUBSCRIPTIONS_QUERY_KEY)).toEqual([]);
    expect(
      queryClient.getQueryState(SUBSCRIPTIONS_QUERY_KEY)?.isInvalidated,
    ).toBe(false);
  });
});
