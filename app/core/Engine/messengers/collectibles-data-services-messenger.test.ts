import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PackPartnerDataServiceActions,
  PackPartnerDataServiceEvents,
} from '../../../components/UI/Collectibles/services/data/PackPartnerDataService';
import { getPackPartnerDataServiceMessenger } from './collectibles-data-services-messenger';

/** Granular cache event of one PackPartner read, by query hash. */
const CACHE_UPDATED_EVENT: `PackPartnerDataService:cacheUpdated:${string}` =
  'PackPartnerDataService:cacheUpdated:hash';

describe('getPackPartnerDataServiceMessenger', () => {
  it('exposes Pack Partner cache invalidation to the root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PackPartnerDataServiceActions,
      PackPartnerDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const serviceMessenger = getPackPartnerDataServiceMessenger(rootMessenger);
    const invalidate = jest.fn().mockResolvedValue(undefined);
    serviceMessenger.registerActionHandler(
      'PackPartnerDataService:invalidateQueries',
      invalidate,
    );

    await rootMessenger.call('PackPartnerDataService:invalidateQueries', {});

    expect(invalidate).toHaveBeenCalledWith({});
  });

  it('publishes cache updates to root subscribers', () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PackPartnerDataServiceActions,
      PackPartnerDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const serviceMessenger = getPackPartnerDataServiceMessenger(rootMessenger);
    const listener = jest.fn<void, [DataServiceGranularCacheUpdatedPayload]>();
    rootMessenger.subscribe(CACHE_UPDATED_EVENT, listener);

    serviceMessenger.publish(CACHE_UPDATED_EVENT, {
      objectType: 'query',
      type: 'removed',
      state: null,
    });

    expect(listener).toHaveBeenCalledWith({
      objectType: 'query',
      type: 'removed',
      state: null,
    });
  });
});
