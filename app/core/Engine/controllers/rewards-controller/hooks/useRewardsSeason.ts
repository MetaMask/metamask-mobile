import { useGetSeasonQuery, useGetSeasonStatusQuery } from '../services';

export const useRewardsSeason = (skipSeasonData: boolean = false) => {
  const { data: seasonData } = useGetSeasonQuery(undefined, {
    refetchOnMountOrArgChange: 60 * 10, // 10 minutes
  });

  const { data: seasonStatusData } = useGetSeasonStatusQuery(
    seasonData?.id || '',
    {
      refetchOnMountOrArgChange: 30, // 30 seconds
      skip: skipSeasonData || !seasonData?.id,
    },
  );

  return {
    seasonData,
    seasonStatusData,
  };
};
