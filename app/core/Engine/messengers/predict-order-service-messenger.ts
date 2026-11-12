import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import {
  PREDICT_ORDER_SERVICE_NAME,
  type PredictOrderServiceActions,
  type PredictOrderServiceEvents,
  type PredictOrderServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictOrderService';
import type { PredictDeviceAuthServiceActions } from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import type { GlobalActions, GlobalEvents, RootMessenger } from '../types';

/**
 * Get the messenger for the Predict Order service. This is scoped to the
 * actions that the Predict Order service is allowed to handle, plus the
 * portfolio invalidation action it consumes after a terminal receipt.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PredictOrderServiceMessenger.
 */
export const getPredictOrderServiceMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictOrderServiceMessenger>,
    MessengerEvents<PredictOrderServiceMessenger>
  >,
): PredictOrderServiceMessenger => {
  const messenger: PredictOrderServiceMessenger = new Messenger({
    namespace: PREDICT_ORDER_SERVICE_NAME,
    parent: rootMessenger,
  });
  // The Order workflow invalidates the authoritative portfolio reads (its
  // consumed action); the cache itself stays owned by the portfolio service.
  rootMessenger.delegate({
    actions: ['PredictPortfolioService:invalidateQueries'],
    events: [],
    messenger,
  });
  return messenger;
};

export type PredictOrderServiceInitMessenger = Messenger<
  'PredictOrderServiceInit',
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction
  | Extract<GlobalActions, { type:
      | 'AuthenticationController:getSessionProfile'
      | 'AuthenticationController:getState'
      | 'KeyringController:getState'
    }>
  | Extract<
      PredictDeviceAuthServiceActions,
      {
        type:
          | 'PredictDeviceAuthService:signOperation'
          | 'PredictDeviceAuthService:signRead'
          | 'PredictDeviceAuthService:invalidateA2t';
      }
    >,
  Extract<GlobalEvents, { type:
    | 'KeyringController:lock'
    | 'KeyringController:unlock'
    | 'AuthenticationController:stateChange'
    | 'AuthenticationController:profileSignIn'
    | 'RemoteFeatureFlagController:stateChange'
  }>
>;

export const getPredictOrderServiceInitMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictOrderServiceInitMessenger>,
    MessengerEvents<PredictOrderServiceInitMessenger>
  >,
): PredictOrderServiceInitMessenger => {
  const messenger: PredictOrderServiceInitMessenger = new Messenger({
    namespace: 'PredictOrderServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AuthenticationController:getBearerToken',
      'AuthenticationController:getSessionProfile',
      'AuthenticationController:getState',
      'KeyringController:getState',
      'PredictDeviceAuthService:signOperation',
      'PredictDeviceAuthService:signRead',
      'PredictDeviceAuthService:invalidateA2t',
    ],
    events: [
      'KeyringController:lock',
      'KeyringController:unlock',
      'AuthenticationController:stateChange',
      'AuthenticationController:profileSignIn',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger,
  });
  return messenger;
};
