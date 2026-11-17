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
import type { GlobalActions, GlobalEvents, RootMessenger } from '../types';

/**
 * Get the messenger for the Predict Funding service. It is scoped to the
 * portfolio invalidation the service consumes after a Withdrawal moves the
 * balance.
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
  // A Withdrawal invalidates the authoritative balance reads; the cache
  // itself stays owned by the portfolio service.
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
