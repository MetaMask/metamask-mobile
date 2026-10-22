import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type {
  KeyringControllerGetStateAction,
  KeyringControllerStateChangeEvent,
} from '@metamask/keyring-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { PredictPortfolioServiceMessenger } from '../../../components/UI/PredictNext/services/PredictPortfolioService';
import {
  createPredictUserIdentitySource,
  type PredictUserIdentitySource,
} from '../../../components/UI/PredictNext/services/internal/predictUserIdentity';
import type { RootMessenger } from '../types';

export const getPredictPortfolioServiceMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictPortfolioServiceMessenger>,
    MessengerEvents<PredictPortfolioServiceMessenger>
  >,
): PredictPortfolioServiceMessenger =>
  new Messenger({
    namespace: 'PredictPortfolioService',
    parent: rootMessenger,
  });

export type PredictPortfolioServiceInitMessengerActions =
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction
  // The Predict User is derived from authentication and keyring state, so the
  // service clears cached account data when either changes.
  | AuthenticationController.AuthenticationControllerGetStateAction
  | KeyringControllerGetStateAction;

export type PredictPortfolioServiceInitMessengerEvents =
  | AuthenticationController.AuthenticationControllerStateChangeEvent
  | KeyringControllerStateChangeEvent;

export type PredictPortfolioServiceInitMessenger = Messenger<
  'PredictPortfolioServiceInit',
  PredictPortfolioServiceInitMessengerActions,
  PredictPortfolioServiceInitMessengerEvents
>;

export const getPredictPortfolioServiceInitMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictPortfolioServiceInitMessenger>,
    MessengerEvents<PredictPortfolioServiceInitMessenger>
  >,
): PredictPortfolioServiceInitMessenger => {
  const messenger: PredictPortfolioServiceInitMessenger = new Messenger({
    namespace: 'PredictPortfolioServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AuthenticationController:getBearerToken',
      'AuthenticationController:getState',
      'KeyringController:getState',
    ],
    events: [
      'AuthenticationController:stateChange',
      'KeyringController:stateChange',
    ],
    messenger,
  });
  return messenger;
};

/**
 * Builds the Predict User identity source the Portfolio service clears cached
 * account data for. The identity is the primary SRP's session profile, the
 * same value the backend derives from the bearer token.
 *
 * @param initMessenger - The Portfolio service init messenger.
 * @returns The identity source.
 */
export const getPredictPortfolioServicePredictUserIdentity = (
  initMessenger: PredictPortfolioServiceInitMessenger,
): PredictUserIdentitySource =>
  createPredictUserIdentitySource({
    getAuthenticationState: () =>
      initMessenger.call('AuthenticationController:getState'),
    getKeyringState: () => initMessenger.call('KeyringController:getState'),
    subscribe: (onChange) => {
      initMessenger.subscribe('AuthenticationController:stateChange', onChange);
      initMessenger.subscribe('KeyringController:stateChange', onChange);
      return () => {
        initMessenger.unsubscribe(
          'AuthenticationController:stateChange',
          onChange,
        );
        initMessenger.unsubscribe('KeyringController:stateChange', onChange);
      };
    },
  });
