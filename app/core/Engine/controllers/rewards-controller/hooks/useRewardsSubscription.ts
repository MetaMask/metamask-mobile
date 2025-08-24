import { useGetSubscriptionQuery } from '../services';

export const useRewardsSubscription = () => {
  const query = useGetSubscriptionQuery(undefined, {
    refetchOnMountOrArgChange: 60 * 60, // 60 minutes
  });

  return {
    ...query,
    subscription: query.data,
    accounts: query.data?.accounts,
  };
};
