import { RampsControllerMessenger } from '@metamask/ramps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
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
