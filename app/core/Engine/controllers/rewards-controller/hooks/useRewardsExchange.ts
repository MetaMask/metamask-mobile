import { useGetTokenPricesQuery } from '../services';

export const useRewardsExchange = () =>
  useGetTokenPricesQuery(undefined, {
    refetchOnMountOrArgChange: 60 * 1, // 1 minute
    refetchOnFocus: false,
  });
