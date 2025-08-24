// Export the Rewards Data Service
export type {
  RewardsDataServiceActions,
  RewardsDataServiceEvents,
  RewardsDataServiceLoginAction,
  RewardsDataServiceMessenger,
} from './rewards-data-service';

export { RewardsDataService } from './rewards-data-service';

// Export the RTK Query API slice and hooks
export {
  rewardsApi,
  useGenerateChallengeMutation,
  useOptinMutation,
  useLogoutMutation,
  useDevOnlyLoginMutation,
  useGetSubscriptionQuery,
  useJoinSubscriptionMutation,
  useGetTokenPricesQuery,
  useGetSeasonQuery,
  useGetSeasonStatusQuery,
  useGetPointsEventsQuery,
  useGetRewardsCatalogQuery,
  useGetRewardsQuery,
  useClaimRewardMutation,
  rewardsApiReducer,
  rewardsApiMiddleware,
} from './rewardsApi';
