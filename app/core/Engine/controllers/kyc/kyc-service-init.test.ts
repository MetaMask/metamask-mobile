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
  const originalIdosEnclaveUrl = process.env.IDOS_ENCLAVE_URL;
  const originalIdosRelayUrl = process.env.IDOS_RELAY_URL;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.KYC_API_URL = originalKycApiUrl;
    process.env.IDOS_ENCLAVE_URL = originalIdosEnclaveUrl;
    process.env.IDOS_RELAY_URL = originalIdosRelayUrl;
  });

  it('instantiates the KycService', () => {
    const { controller } = kycServiceInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(KycService);
  });

  it('passes the messenger, fetch, and configured KYC and idOS hosts', () => {
    process.env.KYC_API_URL = 'https://kyc-api.example.com';
    process.env.IDOS_ENCLAVE_URL = 'https://enclave.example.com';
    process.env.IDOS_RELAY_URL = 'https://relay.example.com';
    const requestMock = getInitRequestMock();

    const { controller } = kycServiceInit(requestMock);

    expect(controller).toMatchObject({
      messenger: requestMock.controllerMessenger,
      fetch,
      baseUrl: 'https://kyc-api.example.com',
      idosEnclaveBaseUrl: 'https://enclave.example.com',
      idosRelayBaseUrl: 'https://relay.example.com',
    });
  });

  it('falls back to UAT hosts when KYC and idOS URLs are unset', () => {
    delete process.env.KYC_API_URL;
    delete process.env.IDOS_ENCLAVE_URL;
    delete process.env.IDOS_RELAY_URL;

    const { controller } = kycServiceInit(getInitRequestMock());

    expect(controller).toMatchObject({
      baseUrl: 'https://kyc-api.uat-api.cx.metamask.io',
      idosEnclaveBaseUrl: 'https://enclave.staging.sandbox.fractal.id',
      idosRelayBaseUrl: 'https://relay.staging.idos.network',
    });
  });
});
