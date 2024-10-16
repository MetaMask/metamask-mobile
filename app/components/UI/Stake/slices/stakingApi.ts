import {
  ChainId,
  StakeSdk,
  StakingApiEnvironments,
  StakingType,
  type PooledStakes,
  type StakeSdkConfig,
  type VaultData,
} from '@metamask/stake-sdk';
import {
  createApi,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

// Configuration for SDK initialization
export const sdkConfig: StakeSdkConfig = {
  chainId: ChainId.ETHEREUM, // Ethereum mainnet
  stakingType: StakingType.POOLED,
  endpointEnv: StakingApiEnvironments.PROD,
};

// Initialize the StakeSdk
export const sdk = StakeSdk.create(sdkConfig);

// Access the StakingApiService from the SDK
export const stakingApiService = sdk.stakingApiService;

export const stakeApi = createApi({
  reducerPath: 'stakeApi',
  baseQuery: fetchBaseQuery({ baseUrl: stakingApiService.baseUrl }),
  endpoints: (builder) => ({
    getPooledStakes: builder.query<
      PooledStakes,
      { accounts: string[]; chainId?: ChainId; resetCache?: boolean }
    >({
      queryFn: async ({ accounts, chainId, resetCache }) => {
        try {
          const pooledStakes = await stakingApiService.getPooledStakes(
            accounts,
            chainId,
            resetCache,
          );
          return { data: pooledStakes };
        } catch (error) {
          return { error: error as FetchBaseQueryError };
        }
      },
    }),
    getPooledStakingEligibility: builder.query<
      { isEligible: boolean },
      { addresses: string[] }
    >({
      async queryFn({ addresses }) {
        try {
          const result = await stakingApiService.getPooledStakingEligibility(
            addresses,
          );
          return {
            data: {
              isEligible: result.eligible,
            },
          };
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
    }),
    getVaultData: builder.query<VaultData, { chainId: ChainId }>({
      async queryFn({ chainId }) {
        try {
          const vaultData = await stakingApiService.getVaultData(chainId);
          return { data: vaultData };
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
    }),
  }),
});

export const {
  useGetPooledStakesQuery,
  useGetVaultDataQuery,
  useGetPooledStakingEligibilityQuery,
} = stakeApi;
