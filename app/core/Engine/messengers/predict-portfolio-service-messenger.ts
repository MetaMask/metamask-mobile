import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
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
  AuthenticationController.AuthenticationControllerGetBearerTokenAction,
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
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
};
