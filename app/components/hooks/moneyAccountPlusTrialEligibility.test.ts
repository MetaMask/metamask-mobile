import { QueryClient, QueryObserver } from '@tanstack/react-query';
import Logger from '../../util/Logger';
import { SUBSCRIPTIONS_QUERY_KEY } from './useSubscriptions';
import {
  clearMoneyAccountPlusTrialEligibilityCache,
  MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
} from './moneyAccountPlusTrialEligibility';

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const trialKey = [
  ...MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
  'social-user-a',
];

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

describe('clearMoneyAccountPlusTrialEligibilityCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('drops the cached trial answer and marks subscriptions stale', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(trialKey, true);
    queryClient.setQueryData(SUBSCRIPTIONS_QUERY_KEY, []);

    await clearMoneyAccountPlusTrialEligibilityCache(queryClient);

    expect(queryClient.getQueryData(trialKey)).toBeUndefined();
    expect(
      queryClient.getQueryState(SUBSCRIPTIONS_QUERY_KEY)?.isInvalidated,
    ).toBe(true);
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('drops the cached trial answer when marking subscriptions stale fails', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(trialKey, true);
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockRejectedValue(new Error('subscriptions refetch failed'));

    await clearMoneyAccountPlusTrialEligibilityCache(queryClient);

    expect(queryClient.getQueryData(trialKey)).toBeUndefined();
    expect(Logger.error).toHaveBeenCalledTimes(1);
  });

  it('marks subscriptions stale without refetching an active observer', async () => {
    const queryClient = createQueryClient();
    const queryFn = jest.fn().mockResolvedValue([]);
    const observer = new QueryObserver(queryClient, {
      queryKey: SUBSCRIPTIONS_QUERY_KEY,
      queryFn,
    });
    const unsubscribe = observer.subscribe(() => undefined);

    await observer.refetch();
    queryFn.mockClear();
    queryClient.setQueryData(trialKey, true);

    await clearMoneyAccountPlusTrialEligibilityCache(queryClient);

    expect(queryFn).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryState(SUBSCRIPTIONS_QUERY_KEY)?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryData(trialKey)).toBeUndefined();
    unsubscribe();
  });
});
