import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { PredictDeviceAuthServiceMessenger } from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import type { GlobalActions, GlobalEvents, RootMessenger } from '../types';

type InitActionType =
  | 'AuthenticationController:getBearerToken'
  | 'AuthenticationController:getSessionProfile'
  | 'AuthenticationController:getState'
  | 'KeyringController:getState'
  | 'RemoteFeatureFlagController:getState'
  | 'SnapController:handleRequest';

type InitEventType =
  | 'AuthenticationController:profileSignIn'
  | 'AuthenticationController:stateChange'
  | 'KeyringController:lock'
  | 'RemoteFeatureFlagController:stateChange';

export type PredictDeviceAuthServiceInitMessenger = Messenger<
  'PredictDeviceAuthServiceInit',
  Extract<GlobalActions, { type: InitActionType }>,
  Extract<GlobalEvents, { type: InitEventType }>
>;

export const getPredictDeviceAuthServiceMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictDeviceAuthServiceMessenger>,
    MessengerEvents<PredictDeviceAuthServiceMessenger>
  >,
): PredictDeviceAuthServiceMessenger =>
  new Messenger({
    namespace: 'PredictDeviceAuthService',
    parent: rootMessenger,
  });

export const getPredictDeviceAuthServiceInitMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictDeviceAuthServiceInitMessenger>,
    MessengerEvents<PredictDeviceAuthServiceInitMessenger>
  >,
): PredictDeviceAuthServiceInitMessenger => {
  const messenger: PredictDeviceAuthServiceInitMessenger = new Messenger({
    namespace: 'PredictDeviceAuthServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger,
    actions: [
      'AuthenticationController:getBearerToken',
      'AuthenticationController:getSessionProfile',
      'AuthenticationController:getState',
      'KeyringController:getState',
      'RemoteFeatureFlagController:getState',
      'SnapController:handleRequest',
    ],
    events: [
      'AuthenticationController:profileSignIn',
      'AuthenticationController:stateChange',
      'KeyringController:lock',
      'RemoteFeatureFlagController:stateChange',
    ],
  });
  return messenger;
};
