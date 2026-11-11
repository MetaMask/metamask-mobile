import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getKycControllerMessenger } from '../../messengers/kyc/kyc-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { kycControllerInit } from './kyc-controller-init';
import {
  handleKycStatusChangedForMetrics,
  handleVerificationStatusChangedForMetrics,
} from './event-handlers/analytics';
import { sumsubLauncher } from './sumSubLauncher';
import {
  KycController,
  type KycControllerMessenger,
  type KycControllerState,
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
      sessions: {
        iron: {
          sessionStatus: {
            id: 'session-1',
            finalStatus: 'pending',
            externalUserId: 'user-1',
            kycStatus: 'pending',
            vendor: 'iron',
            vendorStatus: 'pending',
          },
          providerFlowStatus: 'not_started',
          residenceCountry: 'BRA',
          vendorDisclaimersAccepted: {
            disclaimerIds: ['disclaimer-1'],
            acceptedAt: null,
            submitted: true,
          },
          providerDisclaimersAccepted: null,
          idosDisclaimersAccepted: null,
          credentialReusabilityConsentGiven: null,
          nextStep: null,
          vendorAccount: null,
        },
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

  it('passes the analytics callbacks to the controller', () => {
    kycControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.trackKycAnalytics).toStrictEqual({
      verificationOutcome: handleVerificationStatusChangedForMetrics,
      statusChanged: handleKycStatusChangedForMetrics,
    });
  });
});
