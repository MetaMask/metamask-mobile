import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
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
import type { RootExtendedMessenger } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import {
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
});
