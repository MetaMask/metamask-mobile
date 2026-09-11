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
  const originalKycApiUrl = process.env.KYC_API_URL;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.KYC_API_URL = originalKycApiUrl;
  });

  it('instantiates the KycService', () => {
    const { controller } = kycServiceInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(KycService);
  });

  it('passes the messenger, fetch, and configured KYC API base URL', () => {
    process.env.KYC_API_URL = 'https://kyc-api.example.com';
    const requestMock = getInitRequestMock();

    const { controller } = kycServiceInit(requestMock);

    expect(controller).toMatchObject({
      messenger: requestMock.controllerMessenger,
      fetch,
      baseUrl: 'https://kyc-api.example.com',
    });
  });

  it('falls back to the UAT host when KYC_API_URL is unset', () => {
    delete process.env.KYC_API_URL;

    const { controller } = kycServiceInit(getInitRequestMock());

    expect(controller).toMatchObject({
      baseUrl: 'https://kyc-api.uat-api.cx.metamask.io',
    });
  });
});
