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
  PredictOrderServiceActions,
  PredictOrderServiceEvents,
  PredictOrderServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictOrderService';
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
  predictOrderServiceInit,
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

  it('registers authenticated Order actions on the Engine root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictOrderServiceActions,
      PredictOrderServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: PredictOrderServiceMessenger = new Messenger({
      namespace: 'PredictOrderService',
      parent: rootMessenger,
    });
    const call = jest.fn().mockResolvedValue('test-bearer-token');
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
      initMessenger: { call } as never,
    };
    const { controller } = predictOrderServiceInit(request);

    const result = rootMessenger.call(
      'PredictOrderService:requestQuote',
      'kalshi' as never,
      { marketId: 'KXTEST-26-A', side: 'yes', amount: '20' } as never,
    );

    await expect(result).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    expect(call).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    controller.destroy();
  });

  it('publishes socket updates on the live-data service messenger', () => {
    const rootMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      PredictLiveDataServiceActions,
      PredictLiveDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const messenger = getPredictLiveDataServiceMessenger(rootMessenger);
    const request = {
      ...buildMessengerClientInitRequestMock(rootMessenger),
      controllerMessenger: messenger,
      initMessenger: {
        call: jest.fn().mockResolvedValue('test-bearer-token'),
      },
    } as unknown as MessengerClientInitRequest<
      PredictLiveDataServiceMessenger,
      PredictLiveDataServiceInitMessenger
    >;
    const listener = jest.fn();
    messenger.subscribe('PredictLiveDataService:gameLiveUpdated', listener);
    const update = {
      venueId: KALSHI_VENUE_ID,
      eventId: 'event-1' as PredictEntityId,
      type: 'football_game',
      status: 'in_progress' as const,
      observedAt: '2026-09-08T13:00:00.000Z' as PredictTimestamp,
    };

    const { controller } = predictLiveDataServiceInit(request);
    messenger.call('PredictLiveDataService:watchGames', KALSHI_VENUE_ID, [
      update.eventId,
    ]);
    controller.onGameUpdate(update);

    expect(listener).toHaveBeenCalledWith({
      ...update,
      observedAtByField: { status: update.observedAt },
    });
    controller.destroy();
  });
});
