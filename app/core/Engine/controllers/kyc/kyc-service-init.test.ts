import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getKycServiceMessenger } from '../../messengers/kyc/kyc-service-messenger';
import { kycServiceInit } from './kyc-service-init';
import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import { MessengerClientInitRequest } from '../../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

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

  it('passes the messenger, fetch, and configured KYC API base URL', () => {
    const originalBaseUrl = process.env.KYC_API_URL;
    process.env.KYC_API_URL = 'https://kyc-api.example.com';

    try {
      const requestMock = getInitRequestMock();
      const { controller } = kycServiceInit(requestMock);

      expect(controller).toMatchObject({
        messenger: requestMock.controllerMessenger,
        fetch,
        baseUrl: 'https://kyc-api.example.com',
      });
    } finally {
      process.env.KYC_API_URL = originalBaseUrl;
    }
  });

  it('always resolves a non-empty base URL, since KycService throws without one', () => {
    const { controller } = kycServiceInit(getInitRequestMock());

    expect(controller).toMatchObject({
      baseUrl: expect.stringMatching(/^https:\/\//u),
    });
  });
});
