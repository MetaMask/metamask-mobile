import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getKycServiceMessenger } from '../../messengers/kyc/kyc-service-messenger';
import { kycServiceInit } from './kyc-service-init';
import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import { MessengerClientInitRequest } from '../../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import AppConstants from '../../../AppConstants';

jest.mock('@metamask/kyc-controller', () => ({
  KycService: class KycService {
    constructor(args: Record<string, unknown>) {
      Object.assign(this, args);
    }
  },
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<KycServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getKycServiceMessenger(baseMessenger),
  };
}

describe('kycServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the KycService', () => {
    const { controller } = kycServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(KycService);
  });

  it('passes messenger, fetch, localhost KYC URL, and environment-derived idOS JWKS URLs', () => {
    const requestMock = getInitRequestMock();

    const { controller } = kycServiceInit(requestMock);

    expect(controller).toMatchObject({
      messenger: requestMock.controllerMessenger,
      fetch,
      baseUrl: 'http://localhost:3000',
      idosEnclaveBaseUrl: AppConstants.IDOS_ENCLAVE_URL.DEV,
      idosRelayBaseUrl: AppConstants.IDOS_RELAY_URL.DEV,
    });
  });
});
