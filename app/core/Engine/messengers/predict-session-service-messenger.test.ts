import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  PredictSessionService,
  type PredictSessionServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictSessionService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/types';
import { getPredictSessionServiceMessenger } from './predict-session-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<PredictSessionServiceMessenger>,
  MessengerEvents<PredictSessionServiceMessenger>
>;

describe('getPredictSessionServiceMessenger', () => {
  it('delegates required authentication to the session service', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('test-token'),
    );
    const messenger = getPredictSessionServiceMessenger(rootMessenger);

    const result = await messenger.call(
      'AuthenticationController:getBearerToken',
    );

    expect(result).toBe('test-token');
  });

  it('delegates authentication and lock events to the session service', () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const messenger = getPredictSessionServiceMessenger(rootMessenger);
    const authListener = jest.fn();
    const lockListener = jest.fn();
    messenger.subscribe('AuthenticationController:stateChange', authListener);
    messenger.subscribe('KeyringController:lock', lockListener);

    rootMessenger.publish(
      'AuthenticationController:stateChange',
      { isSignedIn: false },
      [],
    );
    rootMessenger.publish('KeyringController:lock');

    expect(authListener).toHaveBeenCalled();
    expect(lockListener).toHaveBeenCalled();
  });

  it('clears projected readiness after authentication changes or lock', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const messenger = getPredictSessionServiceMessenger(rootMessenger);
    const service = new PredictSessionService({
      messenger,
      account: {
        fetchAccountReadiness: jest.fn().mockResolvedValue({
          venueId: KALSHI_VENUE_ID,
          status: 'ready',
        }),
      },
      authenticate: async () => undefined,
      venueId: KALSHI_VENUE_ID,
    });
    await service.refreshAccountReadiness(KALSHI_VENUE_ID);

    rootMessenger.publish(
      'AuthenticationController:stateChange',
      { isSignedIn: true },
      [],
    );
    expect(service.state.accountReadiness).toBeNull();

    await service.refreshAccountReadiness(KALSHI_VENUE_ID);
    rootMessenger.publish('KeyringController:lock');
    expect(service.state.accountReadiness).toBeNull();
    service.destroy();
  });

  it('projects readiness after authentication changes during token acquisition', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const messenger = getPredictSessionServiceMessenger(rootMessenger);
    const service = new PredictSessionService({
      messenger,
      account: {
        fetchAccountReadiness: jest.fn().mockResolvedValue({
          venueId: KALSHI_VENUE_ID,
          status: 'ready',
        }),
      },
      authenticate: async () => {
        rootMessenger.publish(
          'AuthenticationController:stateChange',
          { isSignedIn: true },
          [],
        );
      },
      venueId: KALSHI_VENUE_ID,
    });

    await service.refreshAccountReadiness(KALSHI_VENUE_ID);

    expect(service.state).toEqual({
      accountReadiness: {
        venueId: KALSHI_VENUE_ID,
        status: 'ready',
      },
      requestStatus: 'success',
    });
    service.destroy();
  });

  it('invalidates readiness when authentication changes during the account request', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const messenger = getPredictSessionServiceMessenger(rootMessenger);
    const service = new PredictSessionService({
      messenger,
      account: {
        fetchAccountReadiness: jest.fn().mockImplementation(async () => {
          rootMessenger.publish(
            'AuthenticationController:stateChange',
            { isSignedIn: false },
            [],
          );
          return { venueId: KALSHI_VENUE_ID, status: 'ready' };
        }),
      },
      authenticate: async () => undefined,
      venueId: KALSHI_VENUE_ID,
    });

    await service.refreshAccountReadiness(KALSHI_VENUE_ID);

    expect(service.state).toEqual({
      accountReadiness: null,
      requestStatus: 'idle',
    });
    service.destroy();
  });

  it('removes authentication and lock subscriptions on destroy', () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const messenger = getPredictSessionServiceMessenger(rootMessenger);
    const service = new PredictSessionService({
      messenger,
      authenticate: async () => undefined,
      venueId: KALSHI_VENUE_ID,
    });
    const clearReadinessSpy = jest.spyOn(service, 'clearAccountReadiness');
    service.destroy();
    clearReadinessSpy.mockClear();

    rootMessenger.publish(
      'AuthenticationController:stateChange',
      { isSignedIn: false },
      [],
    );
    rootMessenger.publish('KeyringController:lock');

    expect(clearReadinessSpy).not.toHaveBeenCalled();
  });
});
