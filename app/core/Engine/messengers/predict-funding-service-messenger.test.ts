import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { PredictFundingServiceActions } from '../../../components/UI/PredictNext/services/PredictFundingService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import type { GlobalActions, GlobalEvents } from '../types';
import {
  getPredictFundingServiceInitMessenger,
  getPredictFundingServiceMessenger,
} from './predict-funding-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictFundingServiceActions,
  never
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({ namespace: MOCK_ANY_NAMESPACE });

describe('getPredictFundingServiceMessenger', () => {
  it('exposes the Withdraw actions to the root messenger', async () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger = getPredictFundingServiceMessenger(rootMessenger);
    const handler = jest.fn().mockResolvedValue({ previewId: 'preview-1' });
    rootMessenger.registerActionHandler(
      'PredictFundingService:requestWithdrawPreview',
      handler,
    );

    await rootMessenger.call(
      'PredictFundingService:requestWithdrawPreview',
      KALSHI_VENUE_ID,
      { sweepAll: true },
    );

    expect(handler).toHaveBeenCalledWith(KALSHI_VENUE_ID, { sweepAll: true });
    expect(serviceMessenger).toBeDefined();
  });

  it('delegates only the balance-family invalidation action it consumes', async () => {
    const rootMessenger = getRootMessenger();
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    rootMessenger.registerActionHandler(
      'PredictPortfolioService:invalidateQueries',
      invalidateQueries,
    );
    const serviceMessenger = getPredictFundingServiceMessenger(rootMessenger);
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

describe('getPredictFundingServiceInitMessenger', () => {
  it('delegates the bearer token used by the unauthenticated-withdraw routes', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      AuthenticationController.AuthenticationControllerGetBearerTokenAction,
      never
    >({ namespace: MOCK_ANY_NAMESPACE });
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('bearer-token'),
    );

    const initMessenger = getPredictFundingServiceInitMessenger(rootMessenger);

    await expect(
      initMessenger.call('AuthenticationController:getBearerToken'),
    ).resolves.toBe('bearer-token');
  });

  it('delegates the identity events that abandon observation', () => {
    const rootMessenger = new Messenger<MockAnyNamespace, never, GlobalEvents>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const initMessenger = getPredictFundingServiceInitMessenger(
      rootMessenger as unknown as Messenger<
        MockAnyNamespace,
        GlobalActions,
        GlobalEvents
      >,
    );
    const abandon = jest.fn();

    initMessenger.subscribe('KeyringController:lock', abandon);
    initMessenger.subscribe('AuthenticationController:profileSignIn', abandon);
    rootMessenger.publish('KeyringController:lock');

    expect(abandon).toHaveBeenCalledTimes(1);
  });

  it('exposes the service state actions a session change needs', () => {
    const rootMessenger = new Messenger<MockAnyNamespace, GlobalActions, never>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const signedIn = { isSignedIn: true } as never;
    rootMessenger.registerActionHandler(
      'AuthenticationController:getState',
      () => signedIn,
    );
    const initMessenger = getPredictFundingServiceInitMessenger(
      rootMessenger as unknown as Messenger<
        MockAnyNamespace,
        GlobalActions,
        GlobalEvents
      >,
    );

    expect(initMessenger.call('AuthenticationController:getState')).toBe(
      signedIn,
    );
  });
});
