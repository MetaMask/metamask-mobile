import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getKycControllerMessenger,
  type KycControllerInitMessenger,
} from '../../messengers/kyc/kyc-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { kycControllerInit } from './kyc-controller-init';
import { createRegisterMoneyAccountOnKycCompletion } from '../../../../components/UI/Ramp/Views/VirtualBankAccount/registerMoneyAccountOnKycCompletion';
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

const mockHandler = jest.fn();
jest.mock(
  '../../../../components/UI/Ramp/Views/VirtualBankAccount/registerMoneyAccountOnKycCompletion',
  () => ({
    createRegisterMoneyAccountOnKycCompletion: jest.fn(() => mockHandler),
  }),
);

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
        vendorDisclaimersAccepted: {
          moonpay: { termsAcceptedAt: '2025-01-01T00:00:00Z' },
          iron: { disclaimerIds: ['disclaimer-1'] },
        },
        kycRequiredByProduct: { ramps: true },
      },
    };

    const { controller } = kycControllerInit(
      getInitRequestMock({ persistedState }),
    );

    expect(controller).toBeInstanceOf(KycController);
  });

  it('subscribes the Money Account registration orchestrator to statusChanged', () => {
    const request = getInitRequestMock();

    kycControllerInit(request);

    expect(createRegisterMoneyAccountOnKycCompletion).toHaveBeenCalledTimes(1);
    expect(request.initMessenger.subscribe).toHaveBeenCalledWith(
      'KycController:statusChanged',
      mockHandler,
    );
  });
});
