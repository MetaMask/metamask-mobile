import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictPortfolioServiceActions,
  PredictPortfolioServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictPortfolioService';
import type {
  KeyringControllerGetStateAction,
  KeyringControllerState,
  KeyringControllerStateChangeEvent,
} from '@metamask/keyring-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { AuthenticationControllerState } from '@metamask/profile-sync-controller/auth';
import {
  getPredictPortfolioServiceInitMessenger,
  getPredictPortfolioServiceMessenger,
  getPredictPortfolioServicePredictUserIdentity,
} from './predict-portfolio-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictPortfolioServiceActions,
  PredictPortfolioServiceEvents
>;

describe('getPredictPortfolioServiceMessenger', () => {
  it('exposes registered portfolio actions to the root messenger', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const serviceMessenger = getPredictPortfolioServiceMessenger(rootMessenger);
    serviceMessenger.registerActionHandler(
      'PredictPortfolioService:getBalance',
      jest.fn().mockResolvedValue('balance'),
    );

    const result = await rootMessenger.call(
      'PredictPortfolioService:getBalance',
      'kalshi' as never,
    );

    expect(result).toBe('balance');
  });
});

describe('getPredictPortfolioServiceInitMessenger', () => {
  const buildRoot = () =>
    new Messenger<
      MockAnyNamespace,
      | AuthenticationController.AuthenticationControllerGetStateAction
      | AuthenticationController.AuthenticationControllerGetBearerTokenAction
      | KeyringControllerGetStateAction,
      | AuthenticationController.AuthenticationControllerStateChangeEvent
      | KeyringControllerStateChangeEvent
    >({ namespace: MOCK_ANY_NAMESPACE });

  const authenticationState = {
    isSignedIn: true,
    srpSessionData: {
      'srp-primary': { profile: { canonicalProfileId: 'profile-a' } },
    },
  } as unknown as AuthenticationControllerState;

  const keyringState = {
    isUnlocked: true,
    keyrings: [
      { type: 'HD Key Tree', accounts: [], metadata: { id: 'srp-primary' } },
    ],
  } as unknown as KeyringControllerState;

  it('delegates the bearer token and the identity state reads', async () => {
    const rootMessenger = buildRoot();
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('bearer-token'),
    );
    rootMessenger.registerActionHandler(
      'AuthenticationController:getState',
      () => authenticationState,
    );
    rootMessenger.registerActionHandler(
      'KeyringController:getState',
      () => keyringState,
    );

    const initMessenger =
      getPredictPortfolioServiceInitMessenger(rootMessenger);

    await expect(
      initMessenger.call('AuthenticationController:getBearerToken'),
    ).resolves.toBe('bearer-token');
    expect(initMessenger.call('AuthenticationController:getState')).toBe(
      authenticationState,
    );
    expect(initMessenger.call('KeyringController:getState')).toBe(keyringState);
  });

  it('derives the Predict User from the delegated state and forwards changes', () => {
    const rootMessenger = buildRoot();
    rootMessenger.registerActionHandler(
      'AuthenticationController:getState',
      () => authenticationState,
    );
    rootMessenger.registerActionHandler(
      'KeyringController:getState',
      () => keyringState,
    );
    const initMessenger =
      getPredictPortfolioServiceInitMessenger(rootMessenger);
    const identity =
      getPredictPortfolioServicePredictUserIdentity(initMessenger);
    const onChange = jest.fn();

    expect(identity.current()).toEqual({
      kind: 'identified',
      canonicalProfileId: 'profile-a',
    });

    const unsubscribe = identity.subscribe(onChange);
    rootMessenger.publish(
      'AuthenticationController:stateChange',
      authenticationState,
      [],
    );
    rootMessenger.publish('KeyringController:stateChange', keyringState, []);
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    rootMessenger.publish(
      'AuthenticationController:stateChange',
      authenticationState,
      [],
    );
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
