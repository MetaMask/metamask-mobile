import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getKycFlowControllerMessenger } from './kyc-flow-controller-messenger';

const getRootMessenger = () =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getKycFlowControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getKycFlowControllerMessenger(getRootMessenger());

    expect(messenger).toBeInstanceOf(Messenger);
  });

  it('delegates the KycService steps and the secret storage', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getKycFlowControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'KycService:getStep',
          'KycService:acceptVendorTerms',
          'KycService:markProviderSubmitted',
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

  it('does not delegate the old controller’s partner identity calls', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getKycFlowControllerMessenger(rootMessenger);

    const { actions } = delegateSpy.mock.calls[0][0] as { actions: string[] };
    expect(actions).not.toContain(
      'AuthenticationController:getPartnerIdentityToken',
    );
  });
});
