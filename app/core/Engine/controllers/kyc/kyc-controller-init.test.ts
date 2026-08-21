import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getKycControllerMessenger,
  type KycControllerInitMessenger,
} from '../../messengers/kyc/kyc-controller-messenger';
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

const createMockInitMessenger = (): KycControllerInitMessenger =>
  ({
    subscribe: jest.fn(),
  }) as unknown as KycControllerInitMessenger;

function getInitRequestMock(
  overrides: {
    persistedState?: Record<string, unknown>;
  } = {},
): jest.Mocked<
  MessengerClientInitRequest<KycControllerMessenger, KycControllerInitMessenger>
> {
  const { persistedState = {} } = overrides;

  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getKycControllerMessenger(baseMessenger),
    initMessenger: createMockInitMessenger(),
    persistedState,
  };

  return requestMock as jest.Mocked<
    MessengerClientInitRequest<
      KycControllerMessenger,
      KycControllerInitMessenger
    >
  >;
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

  it('does not subscribe to KYC status from kyc-controller init', () => {
    const request = getInitRequestMock();

    kycControllerInit(request);

    expect(request.initMessenger.subscribe).not.toHaveBeenCalled();
  });
});
