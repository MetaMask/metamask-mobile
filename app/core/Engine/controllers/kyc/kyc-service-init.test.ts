import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getKycServiceMessenger } from '../../messengers/kyc/kyc-service-messenger';
import { kycServiceInit } from './kyc-service-init';
import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import { MessengerClientInitRequest } from '../../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../../util/environment', () => ({
  isProduction: jest.fn(),
}));
jest.mock('@metamask/kyc-controller', () => ({
  KycService: class KycService {
    constructor(args: Record<string, unknown>) {
      Object.assign(this, args);
    }
  },
}));

import { isProduction } from '../../../../util/environment';

const mockIsProduction = isProduction as jest.MockedFunction<
  typeof isProduction
>;

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
    mockIsProduction.mockReturnValue(false);
    const { controller } = kycServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(KycService);
  });

  it('passes production env when isProduction() returns true', () => {
    mockIsProduction.mockReturnValue(true);
    const requestMock = getInitRequestMock();

    const { controller } = kycServiceInit(requestMock);

    expect(controller).toMatchObject({
      messenger: requestMock.controllerMessenger,
      fetch,
      env: 'production',
    });
  });

  it('passes development env when isProduction() returns false', () => {
    mockIsProduction.mockReturnValue(false);
    const requestMock = getInitRequestMock();

    const { controller } = kycServiceInit(requestMock);

    expect(controller).toMatchObject({
      messenger: requestMock.controllerMessenger,
      fetch,
      env: 'development',
    });
  });
});
