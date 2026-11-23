import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getMarketingConsentControllerMessenger } from './marketing-consent-controller-messenger';

describe('getMarketingConsentControllerMessenger', () => {
  it('delegates the AUS, analytics, auth and keyring access the controller needs', () => {
    const rootMessenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    const messenger = getMarketingConsentControllerMessenger(
      rootMessenger as never,
    );

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
