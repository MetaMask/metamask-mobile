import type {
  DataServiceGranularCacheUpdatedPayload,
  DataServiceInvalidateQueriesAction,
} from '@metamask/base-data-service';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { PACK_PARTNER_ENVIRONMENT } from '../../../components/UI/Collectibles/providers/pack-partner/constants';
import type { CollectiblesOpening } from '../../../components/UI/Collectibles/types';
import type {
  CollectiblesApiDataServiceActions,
  CollectiblesApiDataServiceEvents,
} from '../../../components/UI/Collectibles/services/data/CollectiblesApiDataService';
import type {
  CollectiblesSocialApiDataServiceActions,
  CollectiblesSocialApiDataServiceEvents,
} from '../../../components/UI/Collectibles/services/data/CollectiblesSocialApiDataService';
import type {
  PackPartnerDataServiceActions,
  PackPartnerDataServiceEvents,
} from '../../../components/UI/Collectibles/services/data/PackPartnerDataService';
import {
  getCollectiblesApiDataServiceMessenger,
  getCollectiblesSocialApiDataServiceMessenger,
  getPackPartnerDataServiceMessenger,
} from './collectibles-data-services-messenger';

/** Granular cache event of one PackPartner read, by query hash. */
const CACHE_UPDATED_EVENT: `PackPartnerDataService:cacheUpdated:${string}` =
  'PackPartnerDataService:cacheUpdated:hash';

describe('getPackPartnerDataServiceMessenger', () => {
  it('exposes registered PackPartner reads to the root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PackPartnerDataServiceActions,
      PackPartnerDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const serviceMessenger = getPackPartnerDataServiceMessenger(rootMessenger);
    serviceMessenger.registerActionHandler(
      'PackPartnerDataService:getOwnedCards',
      jest.fn().mockResolvedValue([]),
    );

    const result = await rootMessenger.call(
      'PackPartnerDataService:getOwnedCards',
      'mainnet',
      'So1anaWa11etAddre55',
    );

    expect(result).toEqual([]);
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

describe('getCollectiblesApiDataServiceMessenger', () => {
  it('exposes registered Collectibles API reads to the root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      CollectiblesApiDataServiceActions,
      CollectiblesApiDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const serviceMessenger =
      getCollectiblesApiDataServiceMessenger(rootMessenger);
    serviceMessenger.registerActionHandler(
      'CollectiblesApiDataService:getPackInsights',
      jest.fn().mockResolvedValue('pack-insights'),
    );

    const result = await rootMessenger.call(
      'CollectiblesApiDataService:getPackInsights',
      'mainnet:public',
      { packTypes: ['pack_partner:pokemon_25'] },
    );

    expect(result).toBe('pack-insights');
  });
});

describe('getCollectiblesSocialApiDataServiceMessenger', () => {
  it('exposes registered Social reads to the root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      CollectiblesSocialApiDataServiceActions,
      CollectiblesSocialApiDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const serviceMessenger =
      getCollectiblesSocialApiDataServiceMessenger(rootMessenger);
    serviceMessenger.registerActionHandler(
      'CollectiblesSocialApiDataService:getProfile',
      jest.fn().mockResolvedValue(null),
    );

    const result = await rootMessenger.call(
      'CollectiblesSocialApiDataService:getProfile',
      'mainnet:public',
      { profileId: 'collector' },
    );

    expect(result).toBeNull();
  });
});
