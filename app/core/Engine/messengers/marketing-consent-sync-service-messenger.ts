import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { MarketingConsentControllerMessenger } from '@metamask/marketing-consent-controller';
import type { RootMessenger } from '../types';

export function getMarketingConsentControllerMessenger(
  rootMessenger: RootMessenger,
): MarketingConsentControllerMessenger {
  const controllerMessenger = new Messenger<
    'MarketingConsentController',
    MessengerActions<MarketingConsentControllerMessenger>,
    MessengerEvents<MarketingConsentControllerMessenger>,
    RootMessenger
  >({
    namespace: 'MarketingConsentController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger: controllerMessenger,
    actions: [
      'AuthenticatedUserStorageService:invalidateQueries',
      'AuthenticatedUserStorageService:getMarketingConsent',
      'AuthenticatedUserStorageService:putMarketingConsent',
      'AuthenticatedUserStorageService:getNotificationPreferences',
      'AuthenticatedUserStorageService:putNotificationPreferences',
      'AnalyticsController:getState',
      'AnalyticsController:optInToMarketing',
      'AnalyticsController:optOutOfMarketing',
      'AuthenticationController:getState',
      'KeyringController:getState',
    ],
    events: [
      'AnalyticsController:stateChanged',
      'AuthenticationController:stateChanged',
      'KeyringController:lock',
      'KeyringController:unlock',
    ],
  });
  return controllerMessenger;
}
