import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getVendorOnboardingControllerMessenger } from '../../messengers/kyc/vendor-onboarding-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { vendorOnboardingControllerInit } from './vendor-onboarding-controller-init';
import { sumsubLauncher } from './sumSubLauncher';
import { createKalshiAccountLinkAdapter } from '../../../../components/UI/KYC/Kalshi/kalshiAccountLinkAdapter';
import {
  VendorOnboardingController,
  type VendorOnboardingControllerMessenger,
  type VendorOnboardingControllerState,
} from '@metamask/kyc-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/kyc-controller', () => {
  class MockVendorOnboardingController {
    static lastConstructorArgs: Record<string, unknown>[] = [];

    constructor(args: Record<string, unknown>) {
      MockVendorOnboardingController.lastConstructorArgs.push(args);
      Object.assign(this, args);
    }
  }

  return { VendorOnboardingController: MockVendorOnboardingController };
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

interface MockVendorOnboardingControllerConstructor {
  lastConstructorArgs: Record<string, unknown>[];
}

function getLastConstructorArgs(): Record<string, unknown> | undefined {
  return (
    VendorOnboardingController as unknown as MockVendorOnboardingControllerConstructor
  ).lastConstructorArgs.at(-1);
}

function getInitRequestMock(
  overrides: {
    persistedState?: {
      VendorOnboardingController?: Partial<VendorOnboardingControllerState>;
    };
  } = {},
): jest.Mocked<
  MessengerClientInitRequest<VendorOnboardingControllerMessenger>
> {
  const { persistedState = {} } = overrides;

  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getVendorOnboardingControllerMessenger(baseMessenger),
    persistedState,
  };
}

describe('vendorOnboardingControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      VendorOnboardingController as unknown as MockVendorOnboardingControllerConstructor
    ).lastConstructorArgs = [];
  });

  it('instantiates the VendorOnboardingController', () => {
    const { controller } = vendorOnboardingControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(VendorOnboardingController);
  });

  it('hydrates state from persistedState', () => {
    const persisted: Partial<VendorOnboardingControllerState> = {
      vendors: { kalshi: { step: 'kyc_pending', sessionId: 'sid-1' } },
    };

    vendorOnboardingControllerInit(
      getInitRequestMock({
        persistedState: { VendorOnboardingController: persisted },
      }),
    );

    expect(getLastConstructorArgs()?.state).toStrictEqual(persisted);
  });

  it('starts without state when nothing was persisted', () => {
    vendorOnboardingControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.state).toBeUndefined();
  });

  it('injects the SumSub launcher', () => {
    vendorOnboardingControllerInit(getInitRequestMock());

    expect(getLastConstructorArgs()?.sumsubLauncher).toBe(sumsubLauncher);
  });

  it('injects the Kalshi account link calls', () => {
    vendorOnboardingControllerInit(getInitRequestMock());

    expect(createKalshiAccountLinkAdapter).toHaveBeenCalledTimes(1);
    expect(getLastConstructorArgs()?.accountLinkAdapters).toStrictEqual({
      kalshi: expect.objectContaining({
        startLink: expect.any(Function),
        verifyLink: expect.any(Function),
      }),
    });
  });
});
