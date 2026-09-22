import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictOrderPreviewServiceActions,
  PredictOrderPreviewServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictOrderPreviewService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/types';
import {
  getPredictOrderPreviewServiceInitMessenger,
  getPredictOrderPreviewServiceMessenger,
} from './predict-order-preview-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictOrderPreviewServiceActions,
  PredictOrderPreviewServiceEvents
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({ namespace: MOCK_ANY_NAMESPACE });

describe('getPredictOrderPreviewServiceMessenger', () => {
  it('exposes the service actions to the root messenger', async () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger =
      getPredictOrderPreviewServiceMessenger(rootMessenger);
    const handler = jest.fn().mockResolvedValue({ previewId: 'preview-1' });
    rootMessenger.registerActionHandler(
      'PredictOrderPreviewService:submitOrder',
      handler,
    );

    await rootMessenger.call(
      'PredictOrderPreviewService:submitOrder',
      KALSHI_VENUE_ID,
      'preview-1',
    );

    expect(handler).toHaveBeenCalledWith(KALSHI_VENUE_ID, 'preview-1');
  });
});

describe('getPredictOrderPreviewServiceInitMessenger', () => {
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
      getPredictOrderPreviewServiceInitMessenger(rootMessenger);

    await expect(
      initMessenger.call('AuthenticationController:getBearerToken'),
    ).resolves.toBe('bearer-token');
  });
});
