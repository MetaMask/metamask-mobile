import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { PredictDeviceAuthServiceActions } from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import {
  PREDICT_FUNDING_SERVICE_NAME,
  type PredictFundingServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictFundingService';
import type { GlobalActions, GlobalEvents, RootMessenger } from '../types';

/**
 * Get the messenger for the Predict Funding service. This is scoped to the
 * actions that the Predict Funding service is allowed to handle, plus the
 * portfolio invalidation action it consumes after a credited deposit or a
 * Withdrawal that moves the balance.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PredictFundingServiceMessenger.
 */
export const getPredictFundingServiceMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictFundingServiceMessenger>,
    MessengerEvents<PredictFundingServiceMessenger>
  >,
): PredictFundingServiceMessenger => {
  const messenger: PredictFundingServiceMessenger = new Messenger({
    namespace: PREDICT_FUNDING_SERVICE_NAME,
    parent: rootMessenger,
  });
  // A credited deposit or a Withdrawal invalidates the authoritative balance
  // reads; the cache itself stays owned by the portfolio service.
  rootMessenger.delegate({
    actions: ['PredictPortfolioService:invalidateQueries'],
    events: [],
    messenger,
  });
  return messenger;
};

export type PredictFundingServiceInitMessenger = Messenger<
  'PredictFundingServiceInit',
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction
  | Extract<
      GlobalActions,
      {
        type:
          | 'AuthenticationController:getState'
          | 'KeyringController:getState';
      }
    >
  | Extract<
      PredictDeviceAuthServiceActions,
      {
        type:
          | 'PredictDeviceAuthService:signOperation'
          | 'PredictDeviceAuthService:getApprovalGeneration'
          | 'PredictDeviceAuthService:invalidateA2t';
      }
    >,
  Extract<
    GlobalEvents,
    {
      type:
        | 'KeyringController:lock'
        | 'KeyringController:unlock'
        | 'AuthenticationController:stateChange'
        | 'AuthenticationController:profileSignIn';
    }
  >
>;

/**
 * Get the init messenger for the Predict Funding service: the bearer token,
 * the device signer the deposit routes need, and the identity events that
 * fence a previous Predict User's Withdrawals.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PredictFundingServiceInitMessenger.
 */
export const getPredictFundingServiceInitMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictFundingServiceInitMessenger>,
    MessengerEvents<PredictFundingServiceInitMessenger>
  >,
): PredictFundingServiceInitMessenger => {
  const messenger: PredictFundingServiceInitMessenger = new Messenger({
    namespace: 'PredictFundingServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AuthenticationController:getBearerToken',
      'AuthenticationController:getState',
      'KeyringController:getState',
      'PredictDeviceAuthService:signOperation',
      'PredictDeviceAuthService:getApprovalGeneration',
      'PredictDeviceAuthService:invalidateA2t',
    ],
    events: [
      'KeyringController:lock',
      'KeyringController:unlock',
      'AuthenticationController:stateChange',
      'AuthenticationController:profileSignIn',
    ],
    messenger,
  });
  return messenger;
};
