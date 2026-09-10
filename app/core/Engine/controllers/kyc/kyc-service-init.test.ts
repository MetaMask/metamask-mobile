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
  const originalKycApiUrl = process.env.KYC_API_URL;
  const originalIdosEnclaveUrl = process.env.IDOS_ENCLAVE_URL;
  const originalIdosRelayUrl = process.env.IDOS_RELAY_URL;
  const originalMetaMaskEnv = process.env.METAMASK_ENVIRONMENT;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.KYC_API_URL = originalKycApiUrl;
    process.env.IDOS_ENCLAVE_URL = originalIdosEnclaveUrl;
    process.env.IDOS_RELAY_URL = originalIdosRelayUrl;
    process.env.METAMASK_ENVIRONMENT = originalMetaMaskEnv;
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

  it('passes the configured idOS enclave and relay JWKS hosts', () => {
    process.env.IDOS_ENCLAVE_URL = 'https://enclave.example.com';
    process.env.IDOS_RELAY_URL = 'https://relay.example.com';

    const { controller } = kycServiceInit(getInitRequestMock());

    expect(controller).toMatchObject({
      idosEnclaveBaseUrl: 'https://enclave.example.com',
      idosRelayBaseUrl: 'https://relay.example.com',
    });
  });

  it('falls back to env-keyed idOS hosts when the env vars are unset', () => {
    delete process.env.IDOS_ENCLAVE_URL;
    delete process.env.IDOS_RELAY_URL;
    process.env.METAMASK_ENVIRONMENT = 'dev';

    const { controller } = kycServiceInit(getInitRequestMock());

    expect(controller).toMatchObject({
      idosEnclaveBaseUrl: AppConstants.IDOS_ENCLAVE_URL.DEV,
      idosRelayBaseUrl: AppConstants.IDOS_RELAY_URL.DEV,
    });
  });

  it.each(['dev', 'test', 'e2e', 'local'] as const)(
    'falls back to the dev host when KYC_API_URL is unset in the %s environment',
    (metaMaskEnv) => {
      delete process.env.KYC_API_URL;
      process.env.METAMASK_ENVIRONMENT = metaMaskEnv;

      const { controller } = kycServiceInit(getInitRequestMock());

      expect(controller).toMatchObject({
        baseUrl: AppConstants.KYC_API_URL.DEV,
      });
    },
  );

  it('falls back to the UAT host when KYC_API_URL is unset in the exp environment', () => {
    delete process.env.KYC_API_URL;
    process.env.METAMASK_ENVIRONMENT = 'exp';

    const { controller } = kycServiceInit(getInitRequestMock());

    expect(controller).toMatchObject({
      baseUrl: AppConstants.KYC_API_URL.UAT,
    });
  });

  it.each(['production', 'beta', 'rc', 'pre-release'] as const)(
    'falls back to the production host when KYC_API_URL is unset in the %s environment',
    (metaMaskEnv) => {
      delete process.env.KYC_API_URL;
      process.env.METAMASK_ENVIRONMENT = metaMaskEnv;

      const { controller } = kycServiceInit(getInitRequestMock());

      expect(controller).toMatchObject({
        baseUrl: AppConstants.KYC_API_URL.PRD,
      });
    },
  );

  it.each([undefined, 'some-unknown-env'] as const)(
    'falls back to the production host when KYC_API_URL is unset for %s',
    (metaMaskEnv) => {
      delete process.env.KYC_API_URL;
      if (metaMaskEnv === undefined) {
        delete process.env.METAMASK_ENVIRONMENT;
      } else {
        process.env.METAMASK_ENVIRONMENT = metaMaskEnv;
      }

      const { controller } = kycServiceInit(getInitRequestMock());

      expect(controller).toMatchObject({
        baseUrl: AppConstants.KYC_API_URL.PRD,
      });
    },
  );
});
