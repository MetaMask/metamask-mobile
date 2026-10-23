import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import {
  getKycControllerInitMessenger,
  getKycControllerMessenger,
} from './kyc-controller-messenger';

const getRootMessenger = () =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getKycControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();

    const kycControllerMessenger = getKycControllerMessenger(rootMessenger);

    expect(kycControllerMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates partner identity actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getKycControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'KycService:resetWrappingKeys',
          'AuthenticatedUserStorageService:putIdentitySharingConsent',
          'AuthenticationController:getPartnerIdentityToken',
        ]),
      }),
    );
  });
});

describe('getKycControllerInitMessenger', () => {
  it('delegates the verification and KYC status events to the init messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    const initMessenger = getKycControllerInitMessenger(rootMessenger);

    expect(initMessenger).toBeInstanceOf(Messenger);
    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [
          'KycController:verificationStatusChanged',
          'KycController:kycStatusChanged',
        ],
      }),
    );
  });
});
