import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents,
  PredictLiveDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictLiveDataService';
import type {
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents,
  PredictMarketDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import type {
  PredictPortfolioServiceActions,
  PredictPortfolioServiceEvents,
  PredictPortfolioServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictPortfolioService';
import {
  KALSHI_VENUE_ID,
  type PredictEntityId,
  type PredictTimestamp,
} from '../../../components/UI/PredictNext/types';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getPredictLiveDataServiceMessenger,
  type PredictLiveDataServiceInitMessenger,
} from '../messengers/predict-live-data-service-messenger';
import type {
  MessengerClientInitRequest,
  RootExtendedMessenger,
} from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import {
  predictLiveDataServiceInit,
  predictMarketDataServiceInit,
  predictPortfolioServiceInit,
} from './predict-service-init';

describe('Predict service initialization', () => {
  it('registers market-data actions on the Engine root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictMarketDataServiceActions,
      PredictMarketDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: PredictMarketDataServiceMessenger =
      new Messenger({
        namespace: 'PredictMarketDataService',
        parent: rootMessenger,
      });
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
      initMessenger: {
        call: jest.fn().mockResolvedValue('test-bearer-token'),
      } as never,
    };
    const { controller } = predictMarketDataServiceInit(request);

    const result = rootMessenger.call(
      'PredictMarketDataService:getVenueStatus',
      'kalshi' as never,
    );

    await expect(result).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    controller.destroy();
  });

  it('registers authenticated portfolio actions on the Engine root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictPortfolioServiceActions,
      PredictPortfolioServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: PredictPortfolioServiceMessenger = new Messenger(
      {
        namespace: 'PredictPortfolioService',
        parent: rootMessenger,
      },
    );
    const call = jest.fn().mockResolvedValue('test-bearer-token');
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
      initMessenger: { call } as never,
    };
    const { controller } = predictPortfolioServiceInit(request);

    const result = rootMessenger.call(
      'PredictPortfolioService:getBalance',
      'kalshi' as never,
    );

    await expect(result).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    expect(call).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    controller.destroy();
  });

  it('publishes socket updates on the live-data service messenger', async () => {
    const rootMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      PredictLiveDataServiceActions,
      PredictLiveDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const messenger = getPredictLiveDataServiceMessenger(rootMessenger);
    const eventId = 'event-1' as PredictEntityId;
    const event = {
      venueId: KALSHI_VENUE_ID,
      id: eventId,
      title: 'Game',
      sports: {
        sport: { id: 'football', label: 'Football' },
        game: {
          status: 'in_progress',
          homeTeam: { name: 'Home' },
          awayTeam: { name: 'Away' },
          observedAt: '2026-09-08T12:00:00.000Z',
        },
      },
      markets: [],
    };
    const initCall = jest.fn((action: string) =>
      action === 'PredictMarketDataService:getEvent'
        ? Promise.resolve(event)
        : Promise.resolve('test-bearer-token'),
    );
    const request = {
      ...buildMessengerClientInitRequestMock(rootMessenger),
      controllerMessenger: messenger,
      initMessenger: { call: initCall },
    } as unknown as MessengerClientInitRequest<
      PredictLiveDataServiceMessenger,
      PredictLiveDataServiceInitMessenger
    >;
    const listener = jest.fn();
    messenger.subscribe('PredictLiveDataService:gameLiveUpdated', listener);
    const update = {
      venueId: KALSHI_VENUE_ID,
      eventId,
      type: 'football_game',
      status: 'in_progress' as const,
      observedAt: '2026-09-08T13:00:00.000Z' as PredictTimestamp,
    };

    const { controller } = predictLiveDataServiceInit(request);
    messenger.call('PredictLiveDataService:watchEvents', KALSHI_VENUE_ID, [
      eventId,
    ]);
    await Promise.resolve();
    controller.onGameUpdate(update);

    expect(initCall).toHaveBeenCalledWith(
      'PredictMarketDataService:getEvent',
      KALSHI_VENUE_ID,
      eventId,
    );
    expect(listener).toHaveBeenCalledWith({
      ...update,
      observedAtByField: { status: update.observedAt },
    });
    controller.destroy();
  });
});
