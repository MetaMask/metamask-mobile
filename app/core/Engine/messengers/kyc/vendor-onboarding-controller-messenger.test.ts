import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getVendorOnboardingControllerMessenger } from './vendor-onboarding-controller-messenger';

const getRootMessenger = () =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getVendorOnboardingControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger =
      getVendorOnboardingControllerMessenger(getRootMessenger());

    expect(messenger).toBeInstanceOf(Messenger);
  });

  it('delegates the KycService steps and the secret storage', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getVendorOnboardingControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'KycService:getStep',
          'KycService:acceptVendorTerms',
          'KycService:postOnboardingStep',
          'KycService:createUkycSession',
          'KycService:submitSessionDisclaimers',
          'KycService:createJourney',
          'UserStorageController:performGetStorage',
          'UserStorageController:performSetStorage',
        ]),
      }),
    );
  });

  it('delegates the identity-sharing consent and the token mint together', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getVendorOnboardingControllerMessenger(rootMessenger);

    // kyc-api takes the session's email from the partner identity token, and
    // MetaMask Auth will not mint one without the consent, so the controller
    // needs both or neither.
    const { actions } = delegateSpy.mock.calls[0][0] as { actions: string[] };
    expect(actions).toEqual(
      expect.arrayContaining([
        'AuthenticatedUserStorageService:putIdentitySharingConsent',
        'AuthenticationController:getPartnerIdentityToken',
      ]),
    );
  });
});
