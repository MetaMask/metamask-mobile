import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type {
  PredictDeviceAuthServiceInvalidateA2tAction,
  PredictDeviceAuthServiceSignOperationAction,
} from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import type { PredictPortfolioServiceMessenger } from '../../../components/UI/PredictNext/services/PredictPortfolioService';
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

export type PredictPortfolioServiceInitMessenger = Messenger<
  'PredictPortfolioServiceInit',
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction
  | PredictDeviceAuthServiceSignOperationAction
  | PredictDeviceAuthServiceInvalidateA2tAction,
  never
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
      'PredictDeviceAuthService:signOperation',
      'PredictDeviceAuthService:invalidateA2t',
    ],
    events: [],
    messenger,
  });
  return messenger;
};
