import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import AppConstants from '../../../../AppConstants';
import { getSubscriptionToken } from '../utils/MultiSubscriptionTokenVault';
import Engine from '../../../Engine';
import Logger from '../../../../../util/Logger';
import type {
  GenerateChallengeDto,
  ChallengeResponseDto,
  LoginDto,
  DevOnlyLoginDto,
  SubscriptionDto,
  JoinSubscriptionDto,
  SeasonDto,
  SeasonStatusDto,
  PointsEventDto,
  CursorPaginatedResultsDto,
  SeasonRewardsCatalogDto,
  RewardDto,
  ClaimRewardDto,
  LoginResponseDto,
} from '../types';

/**
 * RTK Query API slice for rewards service
 */
export const rewardsApi = createApi({
  reducerPath: 'rewardsApi',
  tagTypes: [
    'Subscription',
    'PointsEvents',
    'TokenPrices',
    'Season',
    'SeasonStatus',
    'SeasonRewardsCatalog',
    'RewardsStatus',
  ],
  baseQuery: fetchBaseQuery({
    baseUrl: AppConstants.REWARDS_API_URL,
    credentials: 'omit',
    prepareHeaders: async (headers) => {
      headers.set('Content-Type', 'application/json');
      // Add Bearer token for authenticated requests
      try {
        const rewardsController = Engine.context.RewardsController;
        const selectedAccount =
          Engine.context.AccountsController.getSelectedAccount();

        if (selectedAccount && rewardsController) {
          const subscriptionId = rewardsController.getSubscriptionIdForAccount(
            selectedAccount.address,
          );
          if (subscriptionId) {
            const tokenResult = await getSubscriptionToken(subscriptionId);
            if (tokenResult.success && tokenResult.token) {
              headers.set('rewards-api-key', `${tokenResult.token}`);
            }
          }
        }
      } catch (error) {
        // Silently fail if we can't get the token - the request will proceed without auth
        Logger.log('Failed to get subscription token for API request:', error);
      }

      return headers;
    },
  }),
  keepUnusedDataFor: 60 * 30, // 30 minutes
  refetchOnMountOrArgChange: 60 * 1, // 1 minute
  endpoints: (builder) => ({
    // Auth endpoints
    generateChallenge: builder.mutation<
      ChallengeResponseDto,
      GenerateChallengeDto
    >({
      query: (body) => ({
        url: '/auth/challenge/generate',
        method: 'POST',
        body,
      }),
    }),
    optin: builder.mutation<LoginResponseDto, LoginDto>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        'Subscription',
        'PointsEvents',
        'SeasonStatus',
        'RewardsStatus',
      ],
      async onQueryStarted(_args, { queryFulfilled }) {
        try {
          const { data: loginResponse } = await queryFulfilled;

          // Get the current selected account address
          const selectedAccount =
            Engine.context.AccountsController.getSelectedAccount();
          if (!selectedAccount?.address) {
            return;
          }

          // Update the RewardsController state directly
          const rewardsController = Engine.context.RewardsController;
          if (rewardsController) {
            await rewardsController.updateStateWithOptinResponse(
              selectedAccount.address,
              loginResponse,
            );
          }
        } catch (error) {
          // Do nothing if the query fails
        }
      },
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: [
        'Subscription',
        'PointsEvents',
        'SeasonStatus',
        'RewardsStatus',
      ],
    }),
    devOnlyLogin: builder.mutation<void, DevOnlyLoginDto>({
      query: (body) => ({
        url: '/auth/dev-only/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        'Subscription',
        'PointsEvents',
        'SeasonStatus',
        'RewardsStatus',
      ],
    }),

    // Subscription endpoints
    getSubscription: builder.query<SubscriptionDto, void>({
      query: () => '/subscriptions',
      providesTags: ['Subscription'],
    }),
    joinSubscription: builder.mutation<SubscriptionDto, JoinSubscriptionDto>({
      query: (body) => ({
        url: '/subscriptions/join',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription'],
    }),

    // Token prices endpoint (external API)
    getTokenPrices: builder.query<Record<string, number>, void>({
      providesTags: ['TokenPrices'],
      queryFn: async () => {
        try {
          const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,weth,usd-coin,dai&vs_currencies=usd',
          );
          const data = await response.json();

          return {
            data: {
              ETH: data.ethereum?.usd,
              WETH: data.weth?.usd,
              USDC: data['usd-coin']?.usd,
              DAI: data.dai?.usd,
            },
          };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
    }),

    // Season
    getSeason: builder.query<SeasonDto, void>({
      query: () => '/seasons/current',
      providesTags: ['Season'],
    }),

    getSeasonStatus: builder.query<SeasonStatusDto, string>({
      query: (seasonId) => `/seasons/${seasonId}/status`,
      providesTags: ['SeasonStatus'],
    }),

    // Points events
    getPointsEvents: builder.query<
      CursorPaginatedResultsDto<PointsEventDto>,
      { seasonId: string; cursor?: string }
    >({
      query: ({ seasonId, cursor }) => {
        if (!cursor) return `/seasons/${seasonId}/points-events`;

        let url = `/seasons/${seasonId}/points-events`;

        // Build query parameters
        const queryParams = new URLSearchParams();
        if (cursor) queryParams.append('cursor', cursor);

        // Add query parameters to URL if any exist
        const queryString = queryParams.toString();
        if (queryString) url += `?${queryString}`;

        return url;
      },
      providesTags: ['PointsEvents'],
    }),

    // Rewards catalog
    getRewardsCatalog: builder.query<SeasonRewardsCatalogDto, string>({
      query: (seasonId) => `/seasons/${seasonId}/rewards-catalog`,
      providesTags: ['SeasonRewardsCatalog'],
    }),

    getRewards: builder.query<RewardDto[], string>({
      query: (seasonId) => `/rewards?season_id=${seasonId}`,
      providesTags: ['RewardsStatus'],
    }),

    // Claim reward
    claimReward: builder.mutation<
      void,
      { rewardId: string; body: ClaimRewardDto }
    >({
      query: ({ rewardId, body }) => ({
        url: `/rewards/${rewardId}/claim`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RewardsStatus'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
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
} = rewardsApi;

// Export the reducer and middleware
export const { reducer: rewardsApiReducer, middleware: rewardsApiMiddleware } =
  rewardsApi;
