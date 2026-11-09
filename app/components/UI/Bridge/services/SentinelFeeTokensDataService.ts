import {
  BaseDataService,
  type DataServiceCacheUpdatedEvent,
  type DataServiceGranularCacheUpdatedEvent,
  type DataServiceInvalidateQueriesAction,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import { store } from '../../../../store';
import { selectSentinelFeeTokensCacheTtlMs } from '../../../../selectors/bridge/featureFlags';
import {
  fetchSentinelFeeTokens,
  type SentinelFeeTokensByChain,
} from '../api/sentinelFeeTokens';
import { sentinelFeeTokensQueries } from '../queries/sentinelFeeTokens';

export const SENTINEL_FEE_TOKENS_DATA_SERVICE_NAME =
  'SentinelFeeTokensDataService' as const;

export interface SentinelFeeTokensDataServiceGetAction {
  type: 'SentinelFeeTokensDataService:getSentinelFeeTokens';
  handler: () => Promise<SentinelFeeTokensByChain>;
}

export type SentinelFeeTokensDataServiceActions =
  | SentinelFeeTokensDataServiceGetAction
  | DataServiceInvalidateQueriesAction<
      typeof SENTINEL_FEE_TOKENS_DATA_SERVICE_NAME
    >;

export type SentinelFeeTokensDataServiceEvents =
  | DataServiceCacheUpdatedEvent<typeof SENTINEL_FEE_TOKENS_DATA_SERVICE_NAME>
  | DataServiceGranularCacheUpdatedEvent<
      typeof SENTINEL_FEE_TOKENS_DATA_SERVICE_NAME
    >;

export type SentinelFeeTokensDataServiceMessenger = Messenger<
  typeof SENTINEL_FEE_TOKENS_DATA_SERVICE_NAME,
  SentinelFeeTokensDataServiceActions,
  SentinelFeeTokensDataServiceEvents
>;

interface SentinelFeeTokensDataServiceOptions {
  messenger: SentinelFeeTokensDataServiceMessenger;
}

export class SentinelFeeTokensDataService extends BaseDataService<
  typeof SENTINEL_FEE_TOKENS_DATA_SERVICE_NAME,
  SentinelFeeTokensDataServiceMessenger
> {
  private lastSuccessfulResponse?: SentinelFeeTokensByChain;

  constructor({ messenger }: SentinelFeeTokensDataServiceOptions) {
    super({
      name: SENTINEL_FEE_TOKENS_DATA_SERVICE_NAME,
      messenger,
    });

    messenger.registerActionHandler(
      'SentinelFeeTokensDataService:getSentinelFeeTokens',
      this.getSentinelFeeTokens.bind(this),
    );
  }

  async getSentinelFeeTokens(): Promise<SentinelFeeTokensByChain> {
    const cacheTtlMs = selectSentinelFeeTokensCacheTtlMs(store.getState());
    const descriptor =
      sentinelFeeTokensQueries.getSentinelFeeTokens(cacheTtlMs);

    try {
      const response = await this.fetchQuery({
        queryKey: descriptor.queryKey,
        staleTime: descriptor.staleTime,
        queryFn: () =>
          fetchSentinelFeeTokens() as Promise<Json & SentinelFeeTokensByChain>,
      });
      this.lastSuccessfulResponse = response;
      return response;
    } catch (error) {
      if (this.lastSuccessfulResponse) {
        return this.lastSuccessfulResponse;
      }

      throw error;
    }
  }
}
