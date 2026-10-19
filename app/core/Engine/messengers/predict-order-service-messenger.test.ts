import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictOrderServiceActions,
  PredictOrderServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictOrderService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/types';
import {
  getPredictOrderServiceInitMessenger,
  getPredictOrderServiceMessenger,
} from './predict-order-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictOrderServiceActions,
  PredictOrderServiceEvents
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({ namespace: MOCK_ANY_NAMESPACE });

describe('getPredictOrderServiceMessenger', () => {
  it('exposes the service actions to the root messenger', async () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger = getPredictOrderServiceMessenger(rootMessenger);
    const handler = jest.fn().mockResolvedValue({
      previewId: 'preview-1',
    });
    rootMessenger.registerActionHandler(
      'PredictOrderService:commitPreview',
      handler,
    );

    await rootMessenger.call(
      'PredictOrderService:commitPreview',
      KALSHI_VENUE_ID,
      'preview-1',
    );

    expect(handler).toHaveBeenCalledWith(KALSHI_VENUE_ID, 'preview-1');
    expect(serviceMessenger).toBeDefined();
  });

  it('delegates the portfolio invalidation action to the service messenger', async () => {
    const rootMessenger = getRootMessenger();
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    rootMessenger.registerActionHandler(
      'PredictPortfolioService:invalidateQueries',
      invalidateQueries,
    );
    const serviceMessenger = getPredictOrderServiceMessenger(rootMessenger);

    const filters = {
      queryKey: [
        'PredictPortfolioService:getBalance',
        KALSHI_VENUE_ID,
      ] as const,
    };
    await serviceMessenger.call(
      'PredictPortfolioService:invalidateQueries',
      filters,
    );

    expect(invalidateQueries).toHaveBeenCalledWith(filters);
  });
});

describe('getPredictOrderServiceInitMessenger', () => {
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

    const initMessenger = getPredictOrderServiceInitMessenger(rootMessenger);

    await expect(
      initMessenger.call('AuthenticationController:getBearerToken'),
    ).resolves.toBe('bearer-token');
  });
});
