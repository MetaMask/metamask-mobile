import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { MarketingConsentSyncServiceMessenger } from '@metamask/marketing-consent-sync-service';
import type { RootMessenger } from '../types';

export function getMarketingConsentSyncServiceMessenger(
  rootMessenger: RootMessenger,
): MarketingConsentSyncServiceMessenger {
  const controllerMessenger = new Messenger<
    'MarketingConsentSyncService',
    MessengerActions<MarketingConsentSyncServiceMessenger>,
    MessengerEvents<MarketingConsentSyncServiceMessenger>,
    RootMessenger
  >({
    namespace: 'MarketingConsentSyncService',
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
      'AnalyticsController:applyRemoteMarketingConsent',
      'AnalyticsController:clearMarketingConsentSyncPending',
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
