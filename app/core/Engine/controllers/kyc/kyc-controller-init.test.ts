import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getKycControllerMessenger } from '../../messengers/kyc/kyc-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { kycControllerInit } from './kyc-controller-init';
import { sumSubLauncher } from './sumSubLauncher';
import {
  KycController,
  type KycControllerMessenger,
} from '@metamask/kyc-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/kyc-controller', () => {
  class MockKycController {
    static lastConstructorArgs: Record<string, unknown>[] = [];

    constructor(args: Record<string, unknown>) {
      MockKycController.lastConstructorArgs.push(args);
      Object.assign(this, args);
    }
  }

  return { KycController: MockKycController };
});

interface MockKycControllerConstructor {
  lastConstructorArgs: Record<string, unknown>[];
}

function getLastConstructorArgs(): Record<string, unknown> | undefined {
  return (
    KycController as unknown as MockKycControllerConstructor
  ).lastConstructorArgs.at(-1);
}

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
    jest.resetAllMocks();
    (
      KycController as unknown as MockKycControllerConstructor
    ).lastConstructorArgs = [];
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
    expect(getLastConstructorArgs()?.state).toStrictEqual(
      persistedState.KycController,
    );
  });

  it('does not pin an identity vendor in constructor state', () => {
    kycControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.state).toBeUndefined();
  });

  it('injects the SumSub launcher', () => {
    kycControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.sumsubLauncher).toBe(sumSubLauncher);
  });
});
