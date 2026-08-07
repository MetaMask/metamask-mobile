import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getKycControllerMessenger } from '../../messengers/kyc/kyc-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { kycControllerInit } from './kyc-controller-init';
import {
  KycController,
  type KycControllerMessenger,
} from '@metamask/kyc-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/kyc-controller', () => ({
  KycController: class KycController {
    constructor(args: Record<string, unknown>) {
      Object.assign(this, args);
    }
  },
}));

function getInitRequestMock(
  overrides: {
    persistedState?: Record<string, unknown>;
  } = {},
): jest.Mocked<MessengerClientInitRequest<KycControllerMessenger>> {
  const { persistedState = {} } = overrides;

  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getKycControllerMessenger(baseMessenger),
    persistedState,
  };

  return requestMock;
}

describe('kycControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the KycController', () => {
    const { controller } = kycControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(KycController);
  });

  it('hydrates state from persistedState', () => {
    const persistedState = {
      KycController: {
        termsAcceptedAt: '2025-01-01T00:00:00Z',
        acceptedDisclaimerIds: ['disclaimer-1'],
        kycRequiredByProduct: { ramps: true },
      },
    };

    const { controller } = kycControllerInit(
      getInitRequestMock({ persistedState }),
    );

    expect(controller).toBeInstanceOf(KycController);
  });
});
