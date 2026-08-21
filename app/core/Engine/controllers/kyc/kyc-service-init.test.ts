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

  it('passes messenger, fetch, and environment-derived KYC / Fractal URLs', () => {
    const requestMock = getInitRequestMock();

    const { controller } = kycServiceInit(requestMock);

    // `transform-inline-environment-variables` bakes `METAMASK_ENVIRONMENT`
    // as `'test'` (see jest.config.js), so the constructor receives the dev
    // KYC host and the Fractal DEV JWKS host.
    expect(controller).toMatchObject({
      messenger: requestMock.controllerMessenger,
      fetch,
      baseUrl: 'https://kyc-api.dev-api.cx.metamask.io',
      fractalEncryptionBaseUrl: AppConstants.FRACTAL_ENCRYPTION_URL.DEV,
    });
  });
});
