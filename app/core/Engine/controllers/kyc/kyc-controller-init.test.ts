import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getKycControllerMessenger } from '../../messengers/kyc/kyc-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { kycControllerInit } from './kyc-controller-init';
import {
  handleKycStatusChangedForMetrics,
  handleVerificationStatusChangedForMetrics,
} from './event-handlers/analytics';
import {
  endTrace,
  getPerformanceTimestamp,
  trace,
  TraceName,
} from '../../../../util/trace';
import { sumsubLauncher } from './sumSubLauncher';
import {
  KycController,
  type KycControllerMessenger,
  type KycControllerState,
} from '@metamask/kyc-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  getPerformanceTimestamp: jest.fn(() => 1234),
  TraceName: {
    KycProviderFlow: 'KYC Provider Flow',
  },
}));

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

jest.mock('./event-handlers/analytics', () => ({
  handleVerificationStatusChangedForMetrics: jest.fn(),
  handleKycStatusChangedForMetrics: jest.fn(),
}));

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
    persistedState?: { KycController?: Partial<KycControllerState> };
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
    const persistedKycState: Partial<KycControllerState> = {
      email: 'user@example.com',
      vendor: 'iron',
      geoCountry: 'BRA',
      sessionStatus: {
        id: 'session-1',
        finalStatus: 'pending',
        externalUserId: 'user-1',
        kycStatus: 'pending',
        vendor: 'iron',
        vendorStatus: 'pending',
      },
      vendorDisclaimersAccepted: {
        moonpay: { termsAcceptedAt: '2025-01-01T00:00:00Z' },
        iron: { disclaimerIds: ['disclaimer-1'] },
      },
    };
    const persistedState = {
      KycController: persistedKycState,
    };

    const { controller } = kycControllerInit(
      getInitRequestMock({ persistedState }),
    );

    expect(controller).toBeInstanceOf(KycController);
    expect(getLastConstructorArgs()?.state).toStrictEqual(persistedKycState);
  });

  it('does not pin an identity vendor in constructor state', () => {
    kycControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.state).toBeUndefined();
  });

  it('injects the SumSub launcher', () => {
    kycControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.sumsubLauncher).toBe(sumsubLauncher);
  });

  it('passes trace to the controller', () => {
    jest.mocked(getPerformanceTimestamp).mockReturnValue(1234);
    kycControllerInit(getInitRequestMock());

    const traceProviderFlow = getLastConstructorArgs()?.trace as (
      request: {
        name: string;
        op?: string;
        startTime?: number;
        tags?: Record<string, string>;
      },
      fn?: () => void,
    ) => void;
    const finish = jest.fn();

    traceProviderFlow(
      {
        name: 'KYC Provider Flow',
        op: 'kyc.operation',
        startTime: 1,
        tags: { feature: 'kyc', result: 'submitted' },
      },
      finish,
    );

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.KycProviderFlow,
      data: undefined,
      id: undefined,
      startTime: 1,
      tags: { feature: 'kyc', result: 'submitted' },
      op: 'kyc.operation',
      forceTransaction: true,
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.KycProviderFlow,
      id: undefined,
      timestamp: 1234,
    });
    expect(getPerformanceTimestamp).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it('passes the analytics callbacks to the controller', () => {
    kycControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.trackKycAnalytics).toStrictEqual({
      verificationOutcome: handleVerificationStatusChangedForMetrics,
      statusChanged: handleKycStatusChangedForMetrics,
    });
  });
});
