import { useGetAccountLifetimeSpendQuery } from '../services';

export const useCalculateAls = (address: string) => useGetAccountLifetimeSpendQuery(address, {
    skip: !address,
  });
