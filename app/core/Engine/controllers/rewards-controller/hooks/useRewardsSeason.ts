import { useGetSeasonQuery, useGetSeasonStatusQuery } from '../services';

export const useRewardsSeason = () => {
  const { data: seasonData } = useGetSeasonQuery(undefined, {
    refetchOnMountOrArgChange: 60 * 10, // 10 minutes
    refetchOnFocus: false,
  });

  const { data: seasonStatusData } = useGetSeasonStatusQuery(
    seasonData?.id || '',
    {
      refetchOnMountOrArgChange: 30, // 30 seconds
      skip: !seasonData?.id,
    },
  );

  return {
    seasonData,
    seasonStatusData,
  };
};
