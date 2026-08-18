import {
  BaseDataService,
  type DataServiceCacheUpdatedEvent,
  type DataServiceGranularCacheUpdatedEvent,
  type DataServiceInvalidateQueriesAction,
} from '@metamask/base-data-service';
import { handleWhen } from '@metamask/controller-utils';
import type { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import {
  UiSlotsHttpError,
  UiSlotsInvalidResponseError,
  type FetchUiSlotsScreenRequest,
  type FetchUiSlotsScreenResult,
  type UiSlotsReadTransport,
} from './UiSlotsApiReadClient';

export const UI_SLOTS_DATA_SERVICE_NAME = 'UiSlotsDataService' as const;

export interface UiSlotsDataServiceGetScreenAction {
  type: 'UiSlotsDataService:getScreen';
  handler: (
    request: Omit<FetchUiSlotsScreenRequest, 'signal'>,
  ) => Promise<FetchUiSlotsScreenResult>;
}

export type UiSlotsDataServiceActions =
  | UiSlotsDataServiceGetScreenAction
  | DataServiceInvalidateQueriesAction<typeof UI_SLOTS_DATA_SERVICE_NAME>;

export type UiSlotsDataServiceEvents =
  | DataServiceCacheUpdatedEvent<typeof UI_SLOTS_DATA_SERVICE_NAME>
  | DataServiceGranularCacheUpdatedEvent<typeof UI_SLOTS_DATA_SERVICE_NAME>;

export type UiSlotsDataServiceMessenger = Messenger<
  typeof UI_SLOTS_DATA_SERVICE_NAME,
  UiSlotsDataServiceActions,
  UiSlotsDataServiceEvents
>;

export const isRetryableUiSlotsError = (error: unknown): boolean =>
  error instanceof UiSlotsInvalidResponseError ||
  (error instanceof UiSlotsHttpError
    ? error.status === 429 || error.status >= 500
    : error instanceof TypeError);

export class UiSlotsDataService extends BaseDataService<
  typeof UI_SLOTS_DATA_SERVICE_NAME,
  UiSlotsDataServiceMessenger
> {
  readonly #transport: UiSlotsReadTransport;

  constructor({
    messenger,
    transport,
  }: {
    messenger: UiSlotsDataServiceMessenger;
    transport: UiSlotsReadTransport;
  }) {
    super({
      name: UI_SLOTS_DATA_SERVICE_NAME,
      messenger,
      policyOptions: {
        maxRetries: 2,
        retryFilterPolicy: handleWhen(isRetryableUiSlotsError),
        isServiceFailure: isRetryableUiSlotsError,
      },
    });
    this.#transport = transport;

    messenger.registerActionHandler(
      'UiSlotsDataService:getScreen',
      this.getScreen.bind(this),
    );
  }

  getScreen(
    request: Omit<FetchUiSlotsScreenRequest, 'signal'>,
  ): Promise<FetchUiSlotsScreenResult> {
    return this.fetchQuery({
      queryKey: ['ui-slots', request.screenId, request.locale, 'mobile'],
      // The controller owns freshness and persisted last-known-good state.
      // Keeping this at zero ensures an ETag revalidation is a real HTTP read.
      staleTime: 0,
      queryFn: ({ signal }) =>
        this.#transport.fetchScreen({
          ...request,
          signal,
        }) as Promise<Json & FetchUiSlotsScreenResult>,
    });
  }
}
