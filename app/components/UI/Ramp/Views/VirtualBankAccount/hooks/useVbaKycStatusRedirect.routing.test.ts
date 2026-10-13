import { AppState, type AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import type { VbaOnboardingSnapshot } from '@metamask/ramps-controller';
import { flushPromises } from '../../../../../../util/test/utils';
import { VbaOnboardingRoutes } from '../routes';
import {
  useVbaKycStatusRedirect,
  VBA_ACCOUNT_SETUP_RECHECK_DELAYS_MS,
} from './useVbaKycStatusRedirect';

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
    VbaOnboardingRoutes.DETAILS,
  ],
  routes: [
    {
      key: `${VbaOnboardingRoutes.KYC_PENDING}-1`,
      name: VbaOnboardingRoutes.KYC_PENDING,
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
    getParent: () => undefined,
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

const setApprovedSession = () => {
  mockRootState = {
    engine: {
      backgroundState: {
        KycController: {
          sessionStatus: {
            id: 'session-1',
            externalUserId: 'user-1',
            vendor: 'sumsub',
            vendorStatus: 'completed',
            finalStatus: 'approved',
            kycStatus: 'approved',
          },
          providerFlowStatus: 'submitted',
        },
      },
    },
  };
};

const approvedSnapshot = (
  autorampStatus: VbaOnboardingSnapshot['autorampStatus'],
): VbaOnboardingSnapshot => ({
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus: 'approved',
  autorampStatus,
});

const expectOpenedDetails = () =>
  expect(mockDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'RESET',
      payload: expect.objectContaining({
        routes: [{ name: VbaOnboardingRoutes.DETAILS }],
      }),
    }),
  );

describe('useVbaKycStatusRedirect with the onboarding funnel', () => {
  let appStateChangeHandler: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    setApprovedSession();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, handler) => {
        appStateChangeHandler = handler as (state: AppStateStatus) => void;
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof AppState.addEventListener
        >;
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('stays on the pending screen while the approved account is not ready', async () => {
    mockHydrate.mockResolvedValue(approvedSnapshot('not_ready'));

    renderHook(() => useVbaKycStatusRedirect());
    await act(flushPromises);

    expect(mockHydrate).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('opens bank details once a later check finds the account ready', async () => {
    mockHydrate
      .mockResolvedValueOnce(approvedSnapshot('not_ready'))
      .mockResolvedValue(approvedSnapshot('ready'));
    renderHook(() => useVbaKycStatusRedirect());
    await act(flushPromises);

    await act(async () => {
      jest.advanceTimersByTime(VBA_ACCOUNT_SETUP_RECHECK_DELAYS_MS[0]);
      await flushPromises();
    });

    expect(mockHydrate).toHaveBeenCalledTimes(2);
    expectOpenedDetails();
  });

  it('opens bank details when the app returns to the foreground and the account is ready', async () => {
    mockHydrate
      .mockResolvedValueOnce(approvedSnapshot('not_ready'))
      .mockResolvedValue(approvedSnapshot('ready'));
    renderHook(() => useVbaKycStatusRedirect());
    await act(flushPromises);

    await act(async () => {
      appStateChangeHandler?.('active');
      await flushPromises();
    });

    expect(mockHydrate).toHaveBeenCalledTimes(2);
    expectOpenedDetails();
  });
});
