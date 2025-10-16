import { RestrictedControllerMessenger } from '@metamask/base-controller';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';

type AllowedActions = RemoteFeatureFlagControllerGetStateAction;

type AllowedEvents = never;

export type MultichainAccountServiceInitMessenger = RestrictedControllerMessenger<
  'MultichainAccountServiceInit',
  AllowedActions,
  AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

export function getMultichainAccountServiceInitMessenger(
  controllerMessenger: any,
): MultichainAccountServiceInitMessenger {
  return controllerMessenger.getRestricted({
    name: 'MultichainAccountServiceInit',
    allowedActions: ['RemoteFeatureFlagController:getState'],
    allowedEvents: [],
  });
}
