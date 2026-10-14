import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import type { VbaOnboardingSnapshot } from '@metamask/ramps-controller';
import Routes from '../../../../../../constants/navigation/Routes';
import { flushPromises } from '../../../../../../util/test/utils';
import { VbaOnboardingRoutes } from '../routes';
import { useVbaKycStatusRedirect } from './useVbaKycStatusRedirect';

// Runs the watcher with the real coordinator and funnel. Only Engine, Redux,
// navigation, and local storage are mocked.

let mockRootState: unknown;
const mockDispatch = jest.fn();
const mockHydrate = jest.fn();
const mockRefreshSessionStatus = jest.fn();
const mockOnboardingStackState = {
  index: 0,
  routeNames: [
    VbaOnboardingRoutes.VENDOR_TERMS,
    VbaOnboardingRoutes.KYC_PENDING,
    VbaOnboardingRoutes.KYC_REJECTED,
    VbaOnboardingRoutes.IDENTITY_VERIFICATION,
    VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR,
  ],
  routes: [
    {
      key: `${VbaOnboardingRoutes.KYC_PENDING}-1`,
      name: VbaOnboardingRoutes.KYC_PENDING,
    },
  ],
};
const mockRampStackState = {
  index: 0,
  routeNames: [Routes.RAMP.VBA_ONBOARDING, Routes.RAMP.VBA_DETAILS],
  routes: [
    {
      key: 'vba-onboarding',
      name: Routes.RAMP.VBA_ONBOARDING,
    },
  ],
};

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector(mockRootState),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    dispatch: mockDispatch,
    getParent: () => ({
      dispatch: mockDispatch,
      getParent: () => undefined,
      getState: () => mockRampStackState,
    }),
    getState: () => mockOnboardingStackState,
  }),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      hydrateVbaOnboarding: (...args: unknown[]) => mockHydrate(...args),
      registerMoneyAccountWallet: jest.fn(),
      createAutoramp: jest.fn(),
    },
    KycController: {
      refreshSessionStatus: () => mockRefreshSessionStatus(),
      recordVendorDisclaimers: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../core/redux', () => ({
  store: {
    getState: () => mockRootState,
  },
}));

jest.mock('../../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: () => '0xabc',
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../vbaDevOverrides.env', () => ({
  readVbaKycStatusOverrideEnv: () => undefined,
}));

jest.mock('../vbaVendorTermsStorage', () => ({
  hasAcceptedVbaVendorTerms: jest.fn(async () => true),
  getVbaVendorTermsAcceptance: jest.fn(async () => null),
}));

const setSession = (finalStatus: string, kycStatus: string) => {
  mockRootState = {
    engine: {
      backgroundState: {
        KycController: {
          sessionStatus: {
            id: 'session-1',
            externalUserId: 'user-1',
            vendor: 'sumsub',
            vendorStatus: 'completed',
            finalStatus,
            kycStatus,
          },
          providerFlowStatus: 'submitted',
        },
      },
    },
  };
};

const decidedSnapshot = (
  kycStatus: VbaOnboardingSnapshot['kycStatus'],
  autorampStatus: VbaOnboardingSnapshot['autorampStatus'] = 'not_ready',
): VbaOnboardingSnapshot => ({
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus,
  autorampStatus,
});

const expectResetTo = (name: string) =>
  expect(mockDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'RESET',
      payload: expect.objectContaining({
        routes: [expect.objectContaining({ name })],
      }),
    }),
  );

describe('useVbaKycStatusRedirect with the onboarding funnel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(
        () =>
          ({ remove: jest.fn() }) as unknown as ReturnType<
            typeof AppState.addEventListener
          >,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens bank details when KYC is approved and the account is ready', async () => {
    setSession('approved', 'approved');
    mockHydrate.mockResolvedValue(decidedSnapshot('approved', 'ready'));

    renderHook(() => useVbaKycStatusRedirect());
    await act(flushPromises);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'NAVIGATE',
        payload: expect.objectContaining({
          name: Routes.RAMP.VBA_DETAILS,
        }),
      }),
    );
  });

  it('opens the verification failed screen when KYC is rejected', async () => {
    setSession('rejected', 'rejected');
    mockHydrate.mockResolvedValue(decidedSnapshot('rejected'));

    renderHook(() => useVbaKycStatusRedirect());
    await act(flushPromises);

    expectResetTo(VbaOnboardingRoutes.KYC_REJECTED);
  });

  it('stays on the pending screen when KYC is approved but the account is not ready', async () => {
    setSession('approved', 'approved');
    mockHydrate.mockResolvedValue(decidedSnapshot('approved'));

    renderHook(() => useVbaKycStatusRedirect());
    await act(flushPromises);

    expect(mockHydrate).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('reopens identity verification when KYC asks the customer to retry', async () => {
    setSession('retry', 'retry');
    mockHydrate.mockResolvedValue(decidedSnapshot('retry'));

    renderHook(() => useVbaKycStatusRedirect());
    await act(flushPromises);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          routes: [
            expect.objectContaining({
              name: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
              params: expect.objectContaining({
                snapshot: expect.objectContaining({ kycStatus: 'retry' }),
              }),
            }),
          ],
        }),
      }),
    );
  });

  it('opens the account setup error when an approved account cannot be provisioned', async () => {
    setSession('approved', 'approved');
    mockHydrate.mockResolvedValue(
      decidedSnapshot('approved', 'retryable_failure'),
    );

    renderHook(() => useVbaKycStatusRedirect());
    await act(flushPromises);

    expectResetTo(VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR);
  });
});
