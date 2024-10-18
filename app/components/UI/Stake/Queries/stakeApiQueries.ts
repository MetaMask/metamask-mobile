import { StakingApiService } from '@metamask/stake-sdk';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const getPooledStakeApi = (
    apiService: StakingApiService,
) => {
    return createApi({
        reducerPath: 'PooledStakingQuery',
        baseQuery: fetchBaseQuery({ baseUrl: '/' }),
        tagTypes: ['PooledStaking'],
        endpoints: (builder) => ({
            //Sends request to backend - using sdk api service
            getPooledStakingEligibility: builder.query({
                queryFn: async ({ addresses }: { addresses: string[] }) => {
                    const data = await apiService.getPooledStakingEligibility(addresses);
                    ////console.log(data, 'new state')
                    return { data };
                },
            }),
        })
    });
}