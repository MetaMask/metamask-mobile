import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import {
  PREDICT_FUNDING_SERVICE_NAME,
  type PredictFundingServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictFundingService';
import type { PredictDeviceAuthServiceActions } from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the Predict Funding service. This is scoped to the
 * actions that the Predict Funding service is allowed to handle, plus the
 * portfolio invalidation action it consumes after a credited deposit.
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
      PredictDeviceAuthServiceActions,
      {
        type:
          | 'PredictDeviceAuthService:signOperation'
          | 'PredictDeviceAuthService:getApprovalGeneration'
          | 'PredictDeviceAuthService:invalidateA2t';
      }
    >,
  never
>;

/**
 * Get the init messenger for the Predict Funding service: the bearer token
 * and the device signer the deposit routes need.
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
      'PredictDeviceAuthService:signOperation',
      'PredictDeviceAuthService:getApprovalGeneration',
      'PredictDeviceAuthService:invalidateA2t',
    ],
    events: [],
    messenger,
  });
  return messenger;
};
