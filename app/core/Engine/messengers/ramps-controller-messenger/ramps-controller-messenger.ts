import {
  RampsControllerMessenger,
  type RampsControllerOrderStatusChangedEvent,
} from '@metamask/ramps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
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
  rootMessenger: RootMessenger,
): RampsControllerMessenger {
  const messenger = new Messenger<
    'RampsController',
    AllowedActions,
    AllowedEvents,
    typeof rootMessenger
  >({
    namespace: 'RampsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
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
      'TransakService:subscribeToOrder',
      'TransakService:unsubscribeFromOrder',
      'TransakService:disconnectWebSocket',
      'TransakService:getWebSocketSubscriptions',
    ],
    events: ['TransakService:orderUpdate'],
  });

  return messenger;
}

export type RampsControllerInitMessenger = ReturnType<
  typeof getRampsControllerInitMessenger
>;

/**
 * Get the init messenger for the RampsController. Scoped to actions
 * needed during initialization (reading feature flags).
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsControllerInitMessenger.
 */
export function getRampsControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'RampsControllerInit',
    RemoteFeatureFlagControllerGetStateAction,
    RampsControllerOrderStatusChangedEvent,
    RootMessenger
  >({
    namespace: 'RampsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: ['RampsController:orderStatusChanged'],
    messenger,
  });

  return messenger;
}
