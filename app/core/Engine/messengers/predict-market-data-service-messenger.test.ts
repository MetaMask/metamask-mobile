import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import {
  getPredictMarketDataServiceInitMessenger,
  getPredictMarketDataServiceMessenger,
} from './predict-market-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents
>;

describe('getPredictMarketDataServiceMessenger', () => {
  it('exposes registered market-data actions to the root messenger', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const serviceMessenger =
      getPredictMarketDataServiceMessenger(rootMessenger);
    serviceMessenger.registerActionHandler(
      'PredictMarketDataService:getVenueStatus',
      jest.fn().mockResolvedValue('status'),
    );

    const result = await rootMessenger.call(
      'PredictMarketDataService:getVenueStatus',
      'kalshi' as never,
    );

    expect(result).toBe('status');
  });
});

describe('getPredictMarketDataServiceInitMessenger', () => {
  it('delegates the bearer-token action from the root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      AuthenticationController.AuthenticationControllerGetBearerTokenAction,
      never
    >({ namespace: MOCK_ANY_NAMESPACE });
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('bearer-token'),
    );

    const initMessenger =
      getPredictMarketDataServiceInitMessenger(rootMessenger);

    await expect(
      initMessenger.call('AuthenticationController:getBearerToken'),
    ).resolves.toBe('bearer-token');
  });
});
