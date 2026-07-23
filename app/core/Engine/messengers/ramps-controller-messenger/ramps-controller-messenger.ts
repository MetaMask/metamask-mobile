import {
  RampsControllerMessenger,
  type RampsControllerOrderStatusChangedEvent,
} from '@metamask/ramps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import { RootMessenger } from '../../types';

type AllowedActions = MessengerActions<RampsControllerMessenger>;

type AllowedEvents = MessengerEvents<RampsControllerMessenger>;

/**
 * Get the RampsControllerMessenger for the RampsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsControllerMessenger.
 */
export function getRampsControllerMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): RampsControllerMessenger {
  const messenger: RampsControllerMessenger = new Messenger({
    namespace: 'RampsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
      // The controller reads the `moneyHeadlessAllProviders` feature flag
      // itself for quote widening.
      'RemoteFeatureFlagController:getState',
      'RampsService:getGeolocation',
      'RampsService:getCountries',
      'RampsService:getTokens',
      'RampsService:getProviders',
      'RampsService:getPaymentMethods',
      'RampsService:getQuotes',
      'RampsService:getBuyWidgetUrl',
      'RampsService:getOrder',
      'RampsService:getOrderFromCallback',
      'TransakService:setApiKey',
      'TransakService:setAccessToken',
      'TransakService:clearAccessToken',
      'TransakService:sendUserOtp',
      'TransakService:verifyUserOtp',
      'TransakService:logout',
      'TransakService:getUserDetails',
      'TransakService:getBuyQuote',
      'TransakService:getKycRequirement',
      'TransakService:getAdditionalRequirements',
      'TransakService:createOrder',
      'TransakService:getOrder',
      'TransakService:getUserLimits',
      'TransakService:requestOtt',
      'TransakService:generatePaymentWidgetUrl',
      'TransakService:submitPurposeOfUsageForm',
      'TransakService:patchUser',
      'TransakService:submitSsnDetails',
      'TransakService:confirmPayment',
      'TransakService:getTranslation',
      'TransakService:getIdProofStatus',
      'TransakService:cancelOrder',
      'TransakService:cancelAllActiveOrders',
      'TransakService:getActiveOrders',
    ],
    events: [],
  });

  return messenger;
}

export type RampsControllerInitMessenger = Messenger<
  'RampsControllerInit',
  RemoteFeatureFlagControllerGetStateAction,
  | RampsControllerOrderStatusChangedEvent
  | RemoteFeatureFlagControllerStateChangeEvent
>;

/**
 * Get the init messenger for the RampsController. Scoped to actions
 * needed during initialization (reading feature flags).
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsControllerInitMessenger.
 */
export function getRampsControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<RampsControllerInitMessenger>,
    MessengerEvents<RampsControllerInitMessenger>
  >,
): RampsControllerInitMessenger {
  const messenger: RampsControllerInitMessenger = new Messenger({
    namespace: 'RampsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: [
      'RampsController:orderStatusChanged',
      'RemoteFeatureFlagController:stateChange', // React when flags arrive (avoids race with async fetch)
    ],
    messenger,
  });

  return messenger;
}
