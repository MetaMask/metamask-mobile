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
} from '../../../components/UI/PredictNext/types';
import Logger from '../../../util/Logger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getPredictLiveDataServiceMessenger } from '../messengers/predict-live-data-service-messenger';
import type { RootExtendedMessenger } from '../types';
import type { MessengerClientInitRequest } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import {
  predictLiveDataServiceInit,
  predictMarketDataServiceInit,
  predictPortfolioServiceInit,
} from './predict-service-init';
import { resolvePredictApiBaseUrl } from './predict-next-config';

jest.mock('../../../util/Logger');
jest.mock('./predict-next-config');

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

  it('publishes socket updates on the live-data service messenger', () => {
    jest
      .mocked(resolvePredictApiBaseUrl)
      .mockReturnValue('https://predict.example/');
    const rootMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      PredictLiveDataServiceActions,
      PredictLiveDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const messenger = getPredictLiveDataServiceMessenger(rootMessenger);
    const request = {
      ...buildMessengerClientInitRequestMock(rootMessenger),
      controllerMessenger: messenger,
      initMessenger: undefined,
    } as unknown as MessengerClientInitRequest<PredictLiveDataServiceMessenger>;
    const listener = jest.fn();
    messenger.subscribe('PredictLiveDataService:gameLiveUpdated', listener);
    const update = {
      venueId: KALSHI_VENUE_ID,
      eventId: 'event-1' as PredictEntityId,
      type: 'football_game',
      details: { status: 'live' },
    };

    const { controller } = predictLiveDataServiceInit(request);
    controller.onGameUpdate(update);

    expect(listener).toHaveBeenCalledWith(update);
    expect(Logger.log).not.toHaveBeenCalled();
    controller.destroy();
  });

  it('disables live updates when the base URL is unusable', () => {
    jest.mocked(resolvePredictApiBaseUrl).mockReturnValue(undefined);
    const rootMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      PredictLiveDataServiceActions,
      PredictLiveDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const messenger = getPredictLiveDataServiceMessenger(rootMessenger);
    const request = {
      ...buildMessengerClientInitRequestMock(rootMessenger),
      controllerMessenger: messenger,
      initMessenger: undefined,
    } as unknown as MessengerClientInitRequest<PredictLiveDataServiceMessenger>;

    const { controller } = predictLiveDataServiceInit(request);

    expect(() =>
      messenger.call('PredictLiveDataService:watchGames', KALSHI_VENUE_ID, [
        'event-1' as PredictEntityId,
      ]),
    ).not.toThrow();
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Live game updates are disabled.'),
    );
    controller.destroy();
  });
});
