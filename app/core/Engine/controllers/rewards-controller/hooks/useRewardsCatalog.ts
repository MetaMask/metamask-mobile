import {
  useGetRewardsCatalogQuery,
  useGetRewardsQuery,
  useGetSeasonQuery,
} from '../services/rewardsApi';

export const useRewardsCatalog = () => {
  const { data: seasonData } = useGetSeasonQuery(undefined, {
    refetchOnMountOrArgChange: 60 * 10, // 10 minutes
  });

  const { data: rewardsCatalog } = useGetRewardsCatalogQuery(
    seasonData?.id || '',
    {
      refetchOnMountOrArgChange: 60 * 10, // 10 minutes
      skip: !seasonData?.id,
    },
  );

  const { data: rewards } = useGetRewardsQuery(seasonData?.id || '', {
    refetchOnMountOrArgChange: 60 * 10, // 10 minutes
    skip: !seasonData?.id,
  });

  return {
    rewardsCatalog,
    rewards,
  };
};
