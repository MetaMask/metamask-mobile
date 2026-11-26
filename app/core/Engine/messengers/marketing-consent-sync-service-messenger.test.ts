import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getMarketingConsentSyncServiceMessenger } from './marketing-consent-sync-service-messenger';

describe('getMarketingConsentSyncServiceMessenger', () => {
  it('delegates the AUS, analytics, auth and keyring access the service needs', () => {
    const rootMessenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    const messenger = getMarketingConsentSyncServiceMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
    expect(delegateSpy).toHaveBeenCalledWith({
      messenger,
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
  });
});
