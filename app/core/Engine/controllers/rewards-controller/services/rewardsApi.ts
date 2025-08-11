import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import AppConstants from '../../../../AppConstants';
import type {
  GenerateChallengeDto,
  ChallengeResponseDto,
  LoginDto,
  DevOnlyLoginDto,
  SubscriptionDto,
  JoinSubscriptionDto,
  AccountLifeTimeSpendDto,
  SeasonDto,
  SeasonStatusDto,
  PointsEventDto,
  CursorPaginatedResultsDto,
  SeasonRewardsCatalogDto,
  RewardDto,
  ClaimRewardDto,
} from '../types';

/**
 * RTK Query API slice for rewards service
 */
export const rewardsApi = createApi({
  reducerPath: 'rewardsApi',
  tagTypes: [
    'Subscription',
    'PointsEvents',
    'AccountLifetimeSpend',
    'TokenPrices',
    'Season',
    'SeasonStatus',
    'SeasonRewardsCatalog',
    'RewardsStatus',
  ],
  baseQuery: fetchBaseQuery({
    baseUrl: AppConstants.REWARDS_API_URL,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
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
    login: builder.mutation<void, LoginDto>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        'Subscription',
        'PointsEvents',
        'AccountLifetimeSpend',
        'SeasonStatus',
        'RewardsStatus',
      ],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: [
        'Subscription',
        'PointsEvents',
        'AccountLifetimeSpend',
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
        'AccountLifetimeSpend',
        'SeasonStatus',
        'RewardsStatus',
      ],
    }),

    // Subscription endpoints
    getSubscription: builder.query<SubscriptionDto, void>({
      query: () => '/subscriptions',
      providesTags: ['Subscription'],
    }),
    joinSubscription: builder.mutation<void, JoinSubscriptionDto>({
      query: (body) => ({
        url: '/subscriptions/join',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription'],
    }),

    // Account lifetime spend endpoints
    getAccountLifetimeSpend: builder.query<AccountLifeTimeSpendDto, string>({
      query: (address) => `/account-lifetime-spend/${address}`,
      providesTags: ['AccountLifetimeSpend'],
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
  useLoginMutation,
  useLogoutMutation,
  useDevOnlyLoginMutation,
  useGetSubscriptionQuery,
  useJoinSubscriptionMutation,
  useGetAccountLifetimeSpendQuery,
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
