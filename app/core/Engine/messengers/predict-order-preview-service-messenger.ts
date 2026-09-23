import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import {
  PREDICT_ORDER_PREVIEW_SERVICE_NAME,
  type PredictOrderPreviewServiceActions,
  type PredictOrderPreviewServiceEvents,
  type PredictOrderPreviewServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictOrderPreviewService';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the Predict Order Preview service. This is scoped to
 * the actions that the Predict Order Preview service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PredictOrderPreviewServiceMessenger.
 */
export const getPredictOrderPreviewServiceMessenger = (
  rootMessenger: RootMessenger<
    PredictOrderPreviewServiceActions,
    PredictOrderPreviewServiceEvents
  >,
): PredictOrderPreviewServiceMessenger =>
  new Messenger({
    namespace: PREDICT_ORDER_PREVIEW_SERVICE_NAME,
    parent: rootMessenger,
  });

export type PredictOrderPreviewServiceInitMessenger = Messenger<
  'PredictOrderPreviewServiceInit',
  AuthenticationController.AuthenticationControllerGetBearerTokenAction,
  never
>;

export const getPredictOrderPreviewServiceInitMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictOrderPreviewServiceInitMessenger>,
    MessengerEvents<PredictOrderPreviewServiceInitMessenger>
  >,
): PredictOrderPreviewServiceInitMessenger => {
  const messenger: PredictOrderPreviewServiceInitMessenger = new Messenger({
    namespace: 'PredictOrderPreviewServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
};
