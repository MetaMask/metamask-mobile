import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictLiveDataService';
import {
  KALSHI_VENUE_ID,
  type PredictEntityId,
  type PredictTimestamp,
} from '../../../components/UI/PredictNext/types';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { PredictMarketDataServiceGetEventAction } from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import {
  getPredictLiveDataServiceInitMessenger,
  getPredictLiveDataServiceMessenger,
} from './predict-live-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({ namespace: MOCK_ANY_NAMESPACE });

describe('getPredictLiveDataServiceMessenger', () => {
  it('exposes live-data events to the root messenger', () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger = getPredictLiveDataServiceMessenger(rootMessenger);
    const listener = jest.fn();
    const update = {
      venueId: KALSHI_VENUE_ID,
      eventId: 'event-1' as PredictEntityId,
      type: 'football_game',
      observedAt: '2026-09-08T13:00:00.000Z' as PredictTimestamp,
      details: { status: 'live' },
    };
    rootMessenger.subscribe('PredictLiveDataService:gameLiveUpdated', listener);

    serviceMessenger.publish('PredictLiveDataService:gameLiveUpdated', update);

    expect(listener).toHaveBeenCalledWith(update);
  });
});

describe('getPredictLiveDataServiceInitMessenger', () => {
  type InitRootMessenger = Messenger<
    MockAnyNamespace,
    | AuthenticationController.AuthenticationControllerGetBearerTokenAction
    | PredictMarketDataServiceGetEventAction,
    never
  >;

  it('delegates the bearer-token action from the root messenger', async () => {
    const rootMessenger: InitRootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('bearer-token'),
    );

    const initMessenger = getPredictLiveDataServiceInitMessenger(rootMessenger);

    await expect(
      initMessenger.call('AuthenticationController:getBearerToken'),
    ).resolves.toBe('bearer-token');
  });

  it('delegates the cached Event read from the root messenger', async () => {
    const rootMessenger: InitRootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const event = { venueId: KALSHI_VENUE_ID, id: 'event-1', markets: [] };
    rootMessenger.registerActionHandler(
      'PredictMarketDataService:getEvent',
      jest.fn().mockResolvedValue(event),
    );

    const initMessenger = getPredictLiveDataServiceInitMessenger(rootMessenger);

    await expect(
      initMessenger.call(
        'PredictMarketDataService:getEvent',
        KALSHI_VENUE_ID,
        'event-1' as PredictEntityId,
      ),
    ).resolves.toBe(event);
  });
});
