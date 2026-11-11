import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getKycFlowControllerMessenger } from '../../messengers/kyc/kyc-flow-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { kycFlowControllerInit } from './kyc-flow-controller-init';
import { sumsubLauncher } from './sumSubLauncher';
import { createKalshiAccountLinkAdapter } from '../../../../components/UI/KYC/Kalshi/kalshiAccountLinkAdapter';
import {
  KycFlowController,
  type KycFlowControllerMessenger,
  type KycFlowControllerState,
} from '@metamask/kyc-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/kyc-controller', () => {
  class MockKycFlowController {
    static lastConstructorArgs: Record<string, unknown>[] = [];

    constructor(args: Record<string, unknown>) {
      MockKycFlowController.lastConstructorArgs.push(args);
      Object.assign(this, args);
    }
  }

  return { KycFlowController: MockKycFlowController };
});

jest.mock(
  '../../../../components/UI/KYC/Kalshi/kalshiAccountLinkAdapter',
  () => ({
    createKalshiAccountLinkAdapter: jest.fn(() => ({
      startLink: jest.fn(),
      verifyLink: jest.fn(),
    })),
  }),
);

interface MockKycFlowControllerConstructor {
  lastConstructorArgs: Record<string, unknown>[];
}

function getLastConstructorArgs(): Record<string, unknown> | undefined {
  return (
    KycFlowController as unknown as MockKycFlowControllerConstructor
  ).lastConstructorArgs.at(-1);
}

function getInitRequestMock(
  overrides: {
    persistedState?: { KycFlowController?: Partial<KycFlowControllerState> };
  } = {},
): jest.Mocked<MessengerClientInitRequest<KycFlowControllerMessenger>> {
  const { persistedState = {} } = overrides;

  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getKycFlowControllerMessenger(baseMessenger),
    persistedState,
  };
}

describe('kycFlowControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      KycFlowController as unknown as MockKycFlowControllerConstructor
    ).lastConstructorArgs = [];
  });

  it('instantiates the KycFlowController', () => {
    const { controller } = kycFlowControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(KycFlowController);
  });

  it('hydrates state from persistedState', () => {
    const persisted: Partial<KycFlowControllerState> = {
      vendors: { kalshi: { step: 'kyc_pending', sessionId: 'sid-1' } },
    };

    kycFlowControllerInit(
      getInitRequestMock({ persistedState: { KycFlowController: persisted } }),
    );

    expect(getLastConstructorArgs()?.state).toStrictEqual(persisted);
  });

  it('starts without state when nothing was persisted', () => {
    kycFlowControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.state).toBeUndefined();
  });

  it('injects the SumSub launcher', () => {
    kycFlowControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.sumsubLauncher).toBe(sumsubLauncher);
  });

  it('injects the Kalshi account link calls', () => {
    kycFlowControllerInit(getInitRequestMock());

    expect(createKalshiAccountLinkAdapter).toHaveBeenCalledTimes(1);
    expect(getLastConstructorArgs()?.accountLinkAdapters).toStrictEqual({
      kalshi: expect.objectContaining({
        startLink: expect.any(Function),
        verifyLink: expect.any(Function),
      }),
    });
  });
});
