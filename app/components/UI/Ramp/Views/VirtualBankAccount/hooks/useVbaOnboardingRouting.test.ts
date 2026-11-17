import { renderHook } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Logger from '../../../../../../util/Logger';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  canOpenPersistedVbaDetails,
  navigateToVbaOnboardingDestination,
  openAsOnlyOnboardingRoute,
  openCompletedVbaAccount,
  openVbaAccountSetup,
  openVbaEntry,
  resolveVbaOnboarding,
  useOpenVbaOnboarding,
} from './useVbaOnboardingRouting';
import { readVbaKycStatusOverrideEnv } from '../vbaDevOverrides.env';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../vbaOnboardingSnapshot';
import { VbaOnboardingRoutes } from '../routes';
import { VBA_KYC_VENDOR } from '../constants';
import { buildVbaBaseProperties } from '../vbaAnalytics';
import { TraceName } from '../../../../../../util/trace';
import { endVbaCufChildTrace, startVbaCufChildTrace } from '../vbaCufTrace';
import { VBA_CUF_END_REASON } from '../vbaCufTags';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const callerRoute = { key: 'home-1', name: 'Home' };
const mainNavigatorState = () => ({
  index: 0,
  routeNames: ['Home', 'RampVbaOnboarding'],
  routes: [callerRoute],
});
const navigation = {
  navigate: mockNavigate,
  dispatch: mockDispatch,
  getState: mainNavigatorState,
} as unknown as AppNavigationProp;

const expectResetTo = (screenRoute: { name: string; params?: unknown }) => {
  expect(mockDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'RESET',
      payload: expect.objectContaining({
        index: 1,
        routes: [
          callerRoute,
          {
            name: Routes.RAMP.VBA_ONBOARDING,
            state: {
              index: 0,
              routes: [screenRoute],
            },
          },
        ],
      }),
    }),
  );
  expect(mockNavigate).not.toHaveBeenCalled();
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockDispatch,
    getState: () => ({
      index: 0,
      routeNames: ['Home', 'RampVbaOnboarding'],
      routes: [{ key: 'home-1', name: 'Home' }],
    }),
  }),
}));

const mockHydrate = jest.fn();
const mockRegisterWallet = jest.fn();
const mockCreateAutoramp = jest.fn();
const mockGetState = jest.fn();
const mockHasAcceptedVbaVendorTerms = jest.fn();
const mockGetVbaVendorTermsAcceptance = jest.fn();
const mockRecordVendorDisclaimers = jest.fn();
const mockReadSessionStatus = jest.fn();
const mockGetSessionStatusForVendor = jest.fn();
const mockStartSession = jest.fn();
const mockReset = jest.fn();
const mockKycState: { email: string | null } = { email: null };
const mockRampsState: {
  autoramps: { id: string; walletAddress: string; status: string }[];
} = { autoramps: [] };

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      get state() {
        return mockRampsState;
      },
      hydrateVbaOnboarding: (...args: unknown[]) => mockHydrate(...args),
      registerMoneyAccountWallet: (...args: unknown[]) =>
        mockRegisterWallet(...args),
      createAutoramp: (...args: unknown[]) => mockCreateAutoramp(...args),
    },
    KycController: {
      get state() {
        return mockKycState;
      },
      readSessionStatus: () => mockReadSessionStatus(),
      getSessionStatusForVendor: (...args: unknown[]) =>
        mockGetSessionStatusForVendor(...args),
      startSession: (...args: unknown[]) => mockStartSession(...args),
      reset: () => mockReset(),
      recordVendorDisclaimers: (...args: unknown[]) =>
        mockRecordVendorDisclaimers(...args),
    },
  },
}));

jest.mock('../../../../../../core/redux', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));
jest.mock('../vbaCufTrace', () => ({
  startVbaCufChildTrace: jest.fn(() => 'vba-hydrate-id'),
  endVbaCufChildTrace: jest.fn(),
}));

const mockStartVbaCufChildTrace = jest.mocked(startVbaCufChildTrace);
const mockEndVbaCufChildTrace = jest.mocked(endVbaCufChildTrace);

jest.mock('../../../../../../selectors/rampsController', () => ({
  findUsableVbaAutoramp: jest.requireActual(
    '../../../../../../selectors/rampsController',
  ).findUsableVbaAutoramp,
  selectSelectedVbaWalletAddress: jest.fn(
    (state: { address?: string }) => state.address ?? null,
  ),
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../vbaDevOverrides.env', () => ({
  readVbaKycStatusOverrideEnv: jest.fn(() => undefined),
}));

jest.mock('../vbaVendorTermsStorage', () => ({
  hasAcceptedVbaVendorTerms: (...args: unknown[]) =>
    mockHasAcceptedVbaVendorTerms(...args),
  getVbaVendorTermsAcceptance: (...args: unknown[]) =>
    mockGetVbaVendorTermsAcceptance(...args),
}));

describe('useOpenVbaOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockHasAcceptedVbaVendorTerms.mockResolvedValue(false);
    mockGetVbaVendorTermsAcceptance.mockResolvedValue(null);
    mockRecordVendorDisclaimers.mockResolvedValue([]);
    mockKycState.email = null;
    mockReadSessionStatus.mockReturnValue(null);
    mockGetSessionStatusForVendor.mockResolvedValue(null);
    mockStartSession.mockResolvedValue({ id: 'session-1' });
    mockReset.mockResolvedValue(undefined);
    mockRegisterWallet.mockResolvedValue({ type: 'alreadyRegistered' });
    mockCreateAutoramp.mockResolvedValue({
      id: 'autoramp-1',
      status: 'Created',
    });
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
    });
    mockRampsState.autoramps = [];
  });

  it('hydrates then navigates to the route for the returned snapshot', async () => {
    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockHydrate).toHaveBeenCalledWith({
      walletAddress: '0xabc',
      refreshKyc: true,
      refreshAutoramps: true,
    });
    expect(mockStartSession).not.toHaveBeenCalled();
    expectResetTo({ name: VbaOnboardingRoutes.VENDOR_TERMS });
  });

  it('opens the error screen when resuming a persisted session fails', async () => {
    mockReadSessionStatus.mockReturnValue({ id: 'session-1' });
    mockStartSession.mockRejectedValue(new Error('resume failed'));

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockHydrate).not.toHaveBeenCalled();
    expectResetTo({ name: VbaOnboardingRoutes.ERROR });
  });

  it('opens at email when vendor terms are accepted locally', async () => {
    mockHasAcceptedVbaVendorTerms.mockResolvedValue(true);
    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockHasAcceptedVbaVendorTerms).toHaveBeenCalledWith('0xabc');
    expectResetTo({ name: VbaOnboardingRoutes.EMAIL });
  });

  it('reattaches a remote KYC session after reinstall and opens the existing account', async () => {
    mockGetSessionStatusForVendor.mockResolvedValue({ id: 'session-remote' });
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: false,
      sessionDisclaimersComplete: false,
      kycStatus: 'approved',
      autorampStatus: 'ready',
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockGetSessionStatusForVendor).toHaveBeenCalledWith(VBA_KYC_VENDOR);
    expect(mockStartSession).toHaveBeenCalledWith({ vendor: VBA_KYC_VENDOR });
    expect(mockHydrate).toHaveBeenCalledWith({
      walletAddress: '0xabc',
      refreshKyc: true,
      refreshAutoramps: true,
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 1,
          routes: [callerRoute, { name: Routes.RAMP.VBA_DETAILS }],
        }),
      }),
    );
  });

  it('navigates to the VBA details screen when the autoramp is ready', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      kycStatus: 'approved',
      autorampStatus: 'ready',
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockRegisterWallet).not.toHaveBeenCalled();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 1,
          routes: [callerRoute, { name: Routes.RAMP.VBA_DETAILS }],
        }),
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens identity verification when a session exists without recorded vendor disclaimers', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
    });
    mockHasAcceptedVbaVendorTerms.mockResolvedValue(true);
    mockGetVbaVendorTermsAcceptance.mockResolvedValue({
      disclaimerIds: ['privacy', 'terms'],
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockRecordVendorDisclaimers).toHaveBeenCalledWith({
      disclaimerIds: ['privacy', 'terms'],
    });
    expectResetTo({
      name: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
      params: {
        snapshot: {
          ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
          sessionExists: true,
          vendorTermsAcceptedLocally: true,
        },
      },
    });
  });

  it('opens identity verification when a session is pending before provider terms', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      kycStatus: 'pending',
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expectResetTo({
      name: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
      params: {
        snapshot: {
          ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
          sessionExists: true,
          vendorDisclaimersComplete: true,
          vendorTermsAcceptedLocally: true,
          kycStatus: 'pending',
        },
      },
    });
  });

  it('opens the KYC pending status after identity submission', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted',
      kycStatus: 'pending',
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expectResetTo({ name: VbaOnboardingRoutes.KYC_PENDING });
  });

  it('opens the KYC failure page when verification is rejected', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      kycStatus: 'rejected',
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expectResetTo({ name: VbaOnboardingRoutes.KYC_REJECTED });
  });

  it('keeps a rejected KYC session on the failure page', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      kycStatus: 'rejected',
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current({ retryRejectedKyc: true });

    expectResetTo({ name: VbaOnboardingRoutes.KYC_REJECTED });
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PUSH' }),
    );
  });

  it('opens identity verification when retrying a KYC session whose status is retry', async () => {
    const retrySnapshot = {
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      kycStatus: 'retry' as const,
    };
    mockHydrate.mockResolvedValue(retrySnapshot);

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current({ retryRejectedKyc: true });

    const snapshot = {
      ...retrySnapshot,
      vendorTermsAcceptedLocally: true,
    };
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.push(VbaOnboardingRoutes.IDENTITY_VERIFICATION, {
        snapshot,
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('re-enters identity verification on a retry KYC session with an existing autoramp', async () => {
    mockRampsState.autoramps = [
      { id: 'ar-1', walletAddress: '0xabc', status: 'Pending' },
    ];
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      kycStatus: 'retry',
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current({ retryRejectedKyc: true });

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.push(VbaOnboardingRoutes.IDENTITY_VERIFICATION, {
        snapshot: expect.objectContaining({ kycStatus: 'retry' }),
      }),
    );
  });

  it('opens the retry page when KYC status is retry after the provider flow was submitted', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted' as const,
      kycStatus: 'retry' as const,
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expectResetTo({ name: VbaOnboardingRoutes.KYC_REJECTED });
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PUSH' }),
    );
  });

  it('re-enters identity verification from the retry page after the provider flow was submitted', async () => {
    const retrySnapshot = {
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted' as const,
      kycStatus: 'retry' as const,
    };
    mockHydrate.mockResolvedValue(retrySnapshot);

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current({ retryRejectedKyc: true });

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.push(VbaOnboardingRoutes.IDENTITY_VERIFICATION, {
        snapshot: { ...retrySnapshot, vendorTermsAcceptedLocally: true },
      }),
    );
  });

  it('opens identity verified without signing or creating when no usable autoramp exists', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      kycStatus: 'approved',
      autorampStatus: 'needs_wallet_registration',
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockRegisterWallet).not.toHaveBeenCalled();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
    expectResetTo({ name: VbaOnboardingRoutes.IDENTITY_VERIFIED });
  });

  it('opens the error screen when navigation after hydrate throws', async () => {
    jest.mocked(Logger.log).mockImplementationOnce(() => {
      throw new Error('log failed');
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expectResetTo({ name: VbaOnboardingRoutes.ERROR });
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          name: 'useOpenVbaOnboarding',
          data: { source: 'unspecified', step: 'navigate' },
        }),
      }),
    );
  });

  it('opens the error screen when hydrate throws', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expectResetTo({ name: VbaOnboardingRoutes.ERROR });
  });

  it('opens the error screen when no wallet address is selected', async () => {
    mockGetState.mockReturnValue({ address: null });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockHydrate).not.toHaveBeenCalled();
    expectResetTo({ name: VbaOnboardingRoutes.ERROR });
  });

  it('logs failures with the default source when none is supplied', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          name: 'useOpenVbaOnboarding',
          data: { source: 'unspecified' },
        }),
      }),
    );
  });

  it('logs failures with the hook default source', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() =>
      useOpenVbaOnboarding('create-virtual-bank-account-continue'),
    );

    await result.current();

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          name: 'useOpenVbaOnboarding',
          data: { source: 'create-virtual-bank-account-continue' },
        }),
      }),
    );
  });

  it('logs failures with a per-call source override', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() => useOpenVbaOnboarding('hook-default'));

    await result.current('call-override');

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          name: 'useOpenVbaOnboarding',
          data: { source: 'call-override' },
        }),
      }),
    );
  });

  it('navigates to a provided VBA destination', () => {
    navigateToVbaOnboardingDestination(navigation, 'vendorTerms');

    expectResetTo({ name: VbaOnboardingRoutes.VENDOR_TERMS });
  });

  it('passes the hydrated snapshot only to the identity module', () => {
    const snapshot = {
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
    };

    navigateToVbaOnboardingDestination(
      navigation,
      'identityVerification',
      snapshot,
    );

    expectResetTo({
      name: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
      params: { snapshot },
    });
  });

  it('keeps the caller under the completed account', () => {
    const onboardingDispatch = jest.fn();
    const parentDispatch = jest.fn();
    const onboardingNavigation = {
      navigate: jest.fn(),
      dispatch: onboardingDispatch,
      getState: () => ({
        index: 0,
        routeNames: [VbaOnboardingRoutes.KYC_PENDING],
        routes: [{ name: VbaOnboardingRoutes.KYC_PENDING }],
      }),
      getParent: () => ({
        navigate: jest.fn(),
        dispatch: parentDispatch,
        getState: () => ({
          index: 1,
          routeNames: [
            'Home',
            Routes.RAMP.VBA_ONBOARDING,
            Routes.RAMP.VBA_DETAILS,
          ],
          routes: [
            { key: 'home-1', name: 'Home' },
            { key: 'vba-1', name: Routes.RAMP.VBA_ONBOARDING },
          ],
        }),
      }),
    } as unknown as AppNavigationProp;

    navigateToVbaOnboardingDestination(onboardingNavigation, 'complete');

    expect(parentDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 1,
          routes: [
            { key: 'home-1', name: 'Home' },
            { name: Routes.RAMP.VBA_DETAILS },
          ],
        }),
      }),
    );
    expect(onboardingDispatch).not.toHaveBeenCalled();
  });

  it('replaces the onboarding stack in place so the root screen stays mounted', () => {
    const onboardingDispatch = jest.fn();
    const parentDispatch = jest.fn();
    const onboardingNavigate = jest.fn();
    const onboardingNavigation = {
      navigate: onboardingNavigate,
      dispatch: onboardingDispatch,
      getState: () => ({
        index: 1,
        routeNames: [
          VbaOnboardingRoutes.VENDOR_TERMS,
          VbaOnboardingRoutes.LOADING,
          VbaOnboardingRoutes.EMAIL,
        ],
        routes: [
          { name: VbaOnboardingRoutes.VENDOR_TERMS },
          { name: VbaOnboardingRoutes.LOADING },
        ],
      }),
      getParent: () => ({
        navigate: jest.fn(),
        dispatch: parentDispatch,
        getState: () => ({
          index: 1,
          routeNames: ['Home', Routes.RAMP.VBA_ONBOARDING],
          routes: [
            { key: 'home-1', name: 'Home' },
            { key: 'vba-1', name: Routes.RAMP.VBA_ONBOARDING },
          ],
        }),
      }),
    } as unknown as AppNavigationProp;

    navigateToVbaOnboardingDestination(onboardingNavigation, 'email');

    expect(onboardingDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 0,
          routes: [{ name: VbaOnboardingRoutes.EMAIL }],
        }),
      }),
    );
    expect(parentDispatch).not.toHaveBeenCalled();
    expect(onboardingNavigate).not.toHaveBeenCalled();
  });

  it('resets the onboarding stack when called from the identity navigator', () => {
    const onboardingDispatch = jest.fn();
    const rootDispatch = jest.fn();
    const identityNavigation = {
      navigate: jest.fn(),
      dispatch: jest.fn(),
      getState: () => ({
        index: 0,
        routeNames: ['VbaIdentityVerificationProvider'],
        routes: [{ name: 'VbaIdentityVerificationProvider' }],
      }),
      getParent: () => ({
        navigate: jest.fn(),
        dispatch: onboardingDispatch,
        getState: () => ({
          index: 0,
          routeNames: [
            VbaOnboardingRoutes.VENDOR_TERMS,
            VbaOnboardingRoutes.IDENTITY_VERIFICATION,
          ],
          routes: [{ name: VbaOnboardingRoutes.IDENTITY_VERIFICATION }],
        }),
        getParent: () => ({
          dispatch: rootDispatch,
          getState: () => ({
            index: 1,
            routeNames: ['Home', Routes.RAMP.VBA_ONBOARDING],
            routes: [
              { key: 'home-1', name: 'Home' },
              { key: 'vba-1', name: Routes.RAMP.VBA_ONBOARDING },
            ],
          }),
        }),
      }),
    } as unknown as AppNavigationProp;

    navigateToVbaOnboardingDestination(identityNavigation, 'kycPending');

    expect(onboardingDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 0,
          routes: [{ name: VbaOnboardingRoutes.KYC_PENDING }],
        }),
      }),
    );
    expect(rootDispatch).not.toHaveBeenCalled();
  });

  it('keeps the screens under the caller on first entry', () => {
    const dispatch = jest.fn();
    const parentNavigate = jest.fn();
    const childNavigate = jest.fn();
    const sheetNavigation = {
      navigate: childNavigate,
      getState: () => ({
        index: 0,
        routeNames: ['MoneyAddMoneySheet'],
        routes: [{ name: 'MoneyAddMoneySheet' }],
      }),
      getParent: () => ({
        navigate: parentNavigate,
        dispatch,
        getState: () => ({
          index: 1,
          routeNames: ['Home', Routes.RAMP.VBA_ONBOARDING],
          routes: [
            { key: 'settings-1', name: 'Settings' },
            { key: 'home-1', name: 'Home' },
          ],
        }),
      }),
    } as unknown as AppNavigationProp;

    navigateToVbaOnboardingDestination(sheetNavigation, 'kycPending');

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 2,
          routes: [
            { key: 'settings-1', name: 'Settings' },
            { key: 'home-1', name: 'Home' },
            {
              name: Routes.RAMP.VBA_ONBOARDING,
              state: {
                index: 0,
                routes: [{ name: VbaOnboardingRoutes.KYC_PENDING }],
              },
            },
          ],
        }),
      }),
    );
    expect(parentNavigate).not.toHaveBeenCalled();
    expect(childNavigate).not.toHaveBeenCalled();
  });

  it('resets a mounted onboarding route found on an ancestor navigator', () => {
    const dispatch = jest.fn();
    const parentNavigate = jest.fn();
    const mountedOnboardingState = {
      index: 1,
      routes: [
        { name: VbaOnboardingRoutes.VENDOR_TERMS },
        { name: VbaOnboardingRoutes.EMAIL },
      ],
    };
    const parentState = {
      index: 2,
      routeNames: ['Wallet', Routes.RAMP.VBA_ONBOARDING],
      routes: [
        { name: 'Settings' },
        { name: 'Wallet' },
        {
          key: 'vba-1',
          name: Routes.RAMP.VBA_ONBOARDING,
          state: mountedOnboardingState,
        },
      ],
    };
    const childNavigate = jest.fn();
    const ancestorNavigation = {
      navigate: childNavigate,
      getState: () => ({
        index: 0,
        routeNames: ['MoneyHome'],
        routes: [{ name: 'MoneyHome' }],
      }),
      getParent: () => ({
        navigate: parentNavigate,
        dispatch,
        getState: () => parentState,
      }),
    } as unknown as AppNavigationProp;

    navigateToVbaOnboardingDestination(ancestorNavigation, 'kycPending');

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 2,
          routes: [
            { name: 'Settings' },
            { name: 'Wallet' },
            {
              key: 'vba-1',
              name: Routes.RAMP.VBA_ONBOARDING,
              state: {
                index: 0,
                routes: [{ name: VbaOnboardingRoutes.KYC_PENDING }],
              },
            },
          ],
        }),
      }),
    );
    expect(parentNavigate).not.toHaveBeenCalled();
    expect(childNavigate).not.toHaveBeenCalled();
  });

  it('uses Money home when no caller route is available', () => {
    const dispatch = jest.fn();
    const navigationWithoutCaller = {
      navigate: jest.fn(),
      dispatch,
      getState: () => ({
        index: 0,
        routeNames: [Routes.RAMP.VBA_ONBOARDING],
        routes: [{ name: Routes.RAMP.VBA_ONBOARDING }],
      }),
    } as unknown as AppNavigationProp;

    navigateToVbaOnboardingDestination(navigationWithoutCaller, 'kycPending');

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 1,
          routes: [
            {
              name: Routes.HOME_TABS,
              params: {
                screen: Routes.MONEY.ROOT,
                params: { screen: Routes.MONEY.HOME },
              },
            },
            {
              name: Routes.RAMP.VBA_ONBOARDING,
              state: {
                index: 0,
                routes: [{ name: VbaOnboardingRoutes.KYC_PENDING }],
              },
            },
          ],
        }),
      }),
    );
  });
});

describe('opening a bank account from card home', () => {
  const cardHomeState = (): {
    index: number;
    routeNames: string[];
    routes: { key: string; name: string }[];
  } => ({
    index: 1,
    routeNames: [
      'Home',
      Routes.CARD.ROOT,
      Routes.RAMP.VBA_ONBOARDING,
      Routes.RAMP.VBA_DETAILS,
    ],
    routes: [
      { key: 'home-1', name: 'Home' },
      { key: 'card-1', name: Routes.CARD.ROOT },
    ],
  });

  it('keeps wallet home under card home when the account details open', () => {
    const dispatch = jest.fn();
    const navigationFromCardHome = {
      dispatch,
      getState: cardHomeState,
    } as unknown as AppNavigationProp;

    openCompletedVbaAccount(navigationFromCardHome);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 2,
          routes: [
            { key: 'home-1', name: 'Home' },
            { key: 'card-1', name: Routes.CARD.ROOT },
            { name: Routes.RAMP.VBA_DETAILS },
          ],
        }),
      }),
    );
  });

  it('keeps wallet home under card home when onboarding opens', () => {
    const dispatch = jest.fn();
    const navigationFromCardHome = {
      dispatch,
      getState: cardHomeState,
    } as unknown as AppNavigationProp;

    openAsOnlyOnboardingRoute(
      navigationFromCardHome,
      VbaOnboardingRoutes.LOADING,
    );

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 2,
          routes: [
            { key: 'home-1', name: 'Home' },
            { key: 'card-1', name: Routes.CARD.ROOT },
            {
              name: Routes.RAMP.VBA_ONBOARDING,
              state: {
                index: 0,
                routes: [{ name: VbaOnboardingRoutes.LOADING }],
              },
            },
          ],
        }),
      }),
    );
  });
});

describe('resolveVbaOnboarding', () => {
  const devGlobal = globalThis as { __DEV__?: boolean };

  beforeEach(() => {
    jest.clearAllMocks();
    devGlobal.__DEV__ = true;
    jest.mocked(readVbaKycStatusOverrideEnv).mockReturnValue(undefined);
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockHasAcceptedVbaVendorTerms.mockResolvedValue(false);
    mockGetVbaVendorTermsAcceptance.mockResolvedValue(null);
    mockRecordVendorDisclaimers.mockResolvedValue([]);
    mockKycState.email = null;
    mockReadSessionStatus.mockReturnValue(null);
    mockGetSessionStatusForVendor.mockResolvedValue(null);
    mockStartSession.mockResolvedValue({ id: 'session-1' });
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
    });
    mockRampsState.autoramps = [];
  });

  it('opens the account when the Money account already has a usable autoramp, even with no funnel facts', async () => {
    mockRampsState.autoramps = [
      { id: 'ar-1', walletAddress: '0xABC', status: 'Pending' },
    ];

    const resolved = await resolveVbaOnboarding('money-home-card');

    expect(resolved).toEqual(
      expect.objectContaining({ status: 'ready', destinationId: 'complete' }),
    );
  });

  it.each([
    ['rejected', 'not_started', 'kycRejected'],
    ['retry', 'not_started', 'kycRejected'],
    ['retry', 'submitted', 'kycRejected'],
    ['pending', 'submitted', 'kycPending'],
  ] as const)(
    'keeps the %s KYC destination for an existing autoramp',
    async (kycStatus, providerFlowStatus, destinationId) => {
      mockRampsState.autoramps = [
        { id: 'ar-1', walletAddress: '0xabc', status: 'Pending' },
      ];
      mockHydrate.mockResolvedValue({
        ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
        sessionExists: true,
        vendorDisclaimersComplete: true,
        sessionDisclaimersComplete: true,
        providerFlowStatus,
        kycStatus,
      });

      const resolved = await resolveVbaOnboarding('money-home-card');

      expect(resolved).toEqual(
        expect.objectContaining({ status: 'ready', destinationId }),
      );
    },
  );

  it('lets the dev KYC status override win over an existing autoramp', async () => {
    jest.mocked(readVbaKycStatusOverrideEnv).mockReturnValue('rejected');
    mockRampsState.autoramps = [
      { id: 'ar-1', walletAddress: '0xabc', status: 'Approved' },
    ];

    const resolved = await resolveVbaOnboarding('money-home-card');

    expect(resolved).toEqual(
      expect.objectContaining({
        status: 'ready',
        destinationId: 'kycRejected',
      }),
    );
  });

  it('does not treat an autoramp on another address as an existing account', async () => {
    mockRampsState.autoramps = [
      { id: 'ar-1', walletAddress: '0xdef', status: 'Approved' },
    ];

    const resolved = await resolveVbaOnboarding('money-home-card');

    expect(resolved).toEqual(
      expect.objectContaining({
        status: 'ready',
        destinationId: 'vendorTerms',
      }),
    );
  });

  it('remembers the hydrated facts for analytics', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      kycStatus: 'pending',
      autorampStatus: 'in_progress',
    });

    await resolveVbaOnboarding('money-add-money-bank-account');

    expect(buildVbaBaseProperties()).toMatchObject({
      kyc_status: 'pending',
      autoramp_status: 'in_progress',
    });
  });

  it('returns an error when no wallet address is selected', async () => {
    mockGetState.mockReturnValue({ address: null });

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual({
      status: 'error',
    });
    expect(mockHydrate).not.toHaveBeenCalled();
  });

  it('returns an error when hydrate throws', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual({
      status: 'error',
    });
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          data: { source: 'money-add-money-bank-account' },
        }),
      }),
    );
    expect(mockStartVbaCufChildTrace).toHaveBeenCalledWith(
      TraceName.VbaHydrate,
    );
    expect(mockEndVbaCufChildTrace).toHaveBeenCalledWith(
      'vba-hydrate-id',
      false,
      VBA_CUF_END_REASON.ERROR,
    );
  });

  it('resumes a persisted KYC session before hydration', async () => {
    mockReadSessionStatus.mockReturnValue({ id: 'session-1' });
    const calls: string[] = [];
    mockStartSession.mockImplementation(async () => {
      calls.push('start');
      return { id: 'session-1' };
    });
    mockHydrate.mockImplementation(async () => {
      calls.push('hydrate');
      return { ...EMPTY_VBA_ONBOARDING_SNAPSHOT };
    });

    await resolveVbaOnboarding('money-add-money-bank-account');

    expect(mockGetSessionStatusForVendor).not.toHaveBeenCalled();
    expect(mockStartSession).toHaveBeenCalledWith({
      vendor: VBA_KYC_VENDOR,
    });
    expect(calls).toEqual(['start', 'hydrate']);
  });

  it('resumes a persisted KYC session when no email is stored', async () => {
    mockKycState.email = null;
    mockReadSessionStatus.mockReturnValue({ id: 'session-1' });

    await resolveVbaOnboarding('money-add-money-bank-account');

    expect(mockStartSession).toHaveBeenCalledWith({
      vendor: VBA_KYC_VENDOR,
    });
    expect(mockHydrate).toHaveBeenCalled();
  });

  it('does not start a KYC session when the vendor has no latest session', async () => {
    await resolveVbaOnboarding('money-add-money-bank-account');

    expect(mockGetSessionStatusForVendor).toHaveBeenCalledWith(VBA_KYC_VENDOR);
    expect(mockStartSession).not.toHaveBeenCalled();
    expect(mockHydrate).toHaveBeenCalled();
    expect(mockEndVbaCufChildTrace).toHaveBeenCalledWith(
      'vba-hydrate-id',
      true,
    );
  });

  it('reattaches the latest vendor session before hydrate when nothing is persisted', async () => {
    mockGetSessionStatusForVendor.mockResolvedValue({ id: 'session-remote' });
    const calls: string[] = [];
    mockStartSession.mockImplementation(async () => {
      calls.push('start');
      return { id: 'session-remote' };
    });
    mockHydrate.mockImplementation(async () => {
      calls.push('hydrate');
      return {
        ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
        sessionExists: true,
        kycStatus: 'approved',
        autorampStatus: 'ready',
      };
    });

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'ready',
        destinationId: 'complete',
      }),
    );
    expect(calls).toEqual(['start', 'hydrate']);
  });

  it('keeps a reattached provider-pending session out of SumSub after reinstall', async () => {
    mockGetSessionStatusForVendor.mockResolvedValue({ id: 'session-remote' });
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'not_started',
      kycStatus: 'pending',
    });

    await expect(resolveVbaOnboarding('money-home-card')).resolves.toEqual(
      expect.objectContaining({
        status: 'ready',
        destinationId: 'kycPending',
      }),
    );
    expect(mockGetSessionStatusForVendor).toHaveBeenCalledWith(VBA_KYC_VENDOR);
    expect(mockStartSession).toHaveBeenCalledWith({
      vendor: VBA_KYC_VENDOR,
    });
  });

  it('continues as a new user when the discovered session is gone before start', async () => {
    mockGetSessionStatusForVendor.mockResolvedValue({ id: 'session-remote' });
    mockStartSession.mockRejectedValue(
      new Error(
        'KycController.startSession: aal2Token is required to create a KYC session.',
      ),
    );

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'ready',
        destinationId: 'vendorTerms',
      }),
    );
    expect(mockHydrate).toHaveBeenCalled();
  });

  it('returns an error when looking up the latest vendor session fails', async () => {
    mockGetSessionStatusForVendor.mockRejectedValue(new Error('offline'));

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual({ status: 'error' });
    expect(mockHydrate).not.toHaveBeenCalled();
  });

  it('keeps the stored session when the geoCountry changed, then hydrates', async () => {
    mockReadSessionStatus.mockReturnValue({ id: 'session-1' });
    mockStartSession.mockRejectedValueOnce(
      new Error(
        'KycController already initialized with a different geoCountry',
      ),
    );

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual(expect.objectContaining({ status: 'ready' }));

    expect(mockReset).not.toHaveBeenCalled();
    expect(mockStartSession).toHaveBeenCalledTimes(1);
    expect(mockHydrate).toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('resets empty KYC state when the geoCountry changed with no stored session', async () => {
    mockGetSessionStatusForVendor.mockResolvedValue({ id: 'session-remote' });
    mockStartSession
      .mockRejectedValueOnce(
        new Error(
          'KycController already initialized with a different geoCountry',
        ),
      )
      .mockResolvedValueOnce({ id: 'session-remote' });

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual(expect.objectContaining({ status: 'ready' }));

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockStartSession).toHaveBeenCalledTimes(2);
    expect(mockReset.mock.invocationCallOrder[0]).toBeLessThan(
      mockHydrate.mock.invocationCallOrder[0],
    );
  });

  it('continues as a new user when the retry after a geoCountry reset has no session and no AAL2 token', async () => {
    mockGetSessionStatusForVendor.mockResolvedValue({ id: 'session-remote' });
    mockStartSession
      .mockRejectedValueOnce(
        new Error(
          'KycController already initialized with a different geoCountry',
        ),
      )
      .mockRejectedValueOnce(
        new Error(
          'KycController.startSession: aal2Token is required to create a KYC session.',
        ),
      );

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'ready',
        destinationId: 'vendorTerms',
      }),
    );
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockHydrate).toHaveBeenCalled();
  });

  it('does not reset for an email mismatch and returns an error', async () => {
    mockReadSessionStatus.mockReturnValue({ id: 'session-1' });
    mockStartSession.mockRejectedValue(
      new Error('KycController already initialized with a different email'),
    );

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual({ status: 'error' });
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockHydrate).not.toHaveBeenCalled();
  });

  it('returns an error without hydrating when session resume fails', async () => {
    mockReadSessionStatus.mockReturnValue({ id: 'session-1' });
    mockStartSession.mockRejectedValue(new Error('resume failed'));

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual({ status: 'error' });
    expect(mockHydrate).not.toHaveBeenCalled();
  });

  it('applies the dev KYC status override before choosing a destination', async () => {
    jest.mocked(readVbaKycStatusOverrideEnv).mockReturnValue('rejected');

    await expect(
      resolveVbaOnboarding('money-add-money-bank-account'),
    ).resolves.toEqual({
      status: 'ready',
      destinationId: 'kycRejected',
      snapshot: expect.objectContaining({
        kycStatus: 'rejected',
        sessionExists: true,
        vendorDisclaimersComplete: true,
        sessionDisclaimersComplete: true,
      }),
    });
  });
});

describe('navigateToVbaOnboardingDestination account create error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the bank-details error screen', () => {
    navigateToVbaOnboardingDestination(navigation, 'accountCreateDetails');

    expectResetTo({
      name: VbaOnboardingRoutes.ACCOUNT_CREATE_ERROR,
      params: { variant: 'details' },
    });
  });

  it('passes the safe registration fields to contact support', () => {
    navigateToVbaOnboardingDestination(
      navigation,
      'accountCreateDetails',
      undefined,
      { httpStatus: 400, traceId: 'moonpay-trace' },
    );

    expectResetTo({
      name: VbaOnboardingRoutes.ACCOUNT_CREATE_ERROR,
      params: {
        variant: 'details',
        failure: { httpStatus: 400, traceId: 'moonpay-trace' },
      },
    });
  });

  it('passes the source currency to the retry screen', () => {
    navigateToVbaOnboardingDestination(
      navigation,
      'accountCreateGeneric',
      undefined,
      { httpStatus: 500 },
      'USD',
    );

    expectResetTo({
      name: VbaOnboardingRoutes.ACCOUNT_CREATE_ERROR,
      params: {
        variant: 'generic',
        failure: { httpStatus: 500 },
        sourceCurrency: 'USD',
      },
    });
  });

  it('marks recoverable setup failures as retryable', () => {
    navigateToVbaOnboardingDestination(
      navigation,
      'accountCreateGeneric',
      undefined,
      undefined,
      'BRL',
      true,
    );

    expectResetTo({
      name: VbaOnboardingRoutes.ACCOUNT_CREATE_ERROR,
      params: {
        variant: 'generic',
        sourceCurrency: 'BRL',
        retryable: true,
      },
    });
  });

  it('keeps Money home under an error opened from account details', () => {
    const dispatch = jest.fn();
    const detailsNavigation = {
      dispatch,
      getState: () => ({
        index: 1,
        routeNames: [
          'Home',
          Routes.RAMP.VBA_DETAILS,
          Routes.RAMP.VBA_ONBOARDING,
        ],
        routes: [
          callerRoute,
          { key: 'details-1', name: Routes.RAMP.VBA_DETAILS },
        ],
      }),
      getParent: () => undefined,
    } as unknown as AppNavigationProp;

    navigateToVbaOnboardingDestination(
      detailsNavigation,
      'accountCreateGeneric',
      undefined,
      { httpStatus: 500 },
      'BRL',
    );

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 1,
          routes: [
            callerRoute,
            {
              name: Routes.RAMP.VBA_ONBOARDING,
              state: {
                index: 0,
                routes: [
                  {
                    name: VbaOnboardingRoutes.ACCOUNT_CREATE_ERROR,
                    params: {
                      variant: 'generic',
                      failure: { httpStatus: 500 },
                      sourceCurrency: 'BRL',
                    },
                  },
                ],
              },
            },
          ],
        }),
      }),
    );
  });
});

describe('openVbaEntry', () => {
  const devGlobal = globalThis as { __DEV__?: boolean };
  const originalDev = devGlobal.__DEV__;
  const dispatch = jest.fn();
  const entryNavigation = {
    dispatch,
    getState: () => ({
      index: 0,
      routeNames: [Routes.HOME_TABS, Routes.RAMP.VBA_ONBOARDING],
      routes: [{ name: Routes.HOME_TABS }],
    }),
  } as unknown as AppNavigationProp;
  const lastResetRoutes = () =>
    dispatch.mock.calls[dispatch.mock.calls.length - 1][0].payload.routes;

  beforeEach(() => {
    jest.clearAllMocks();
    devGlobal.__DEV__ = true;
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockHydrate.mockResolvedValue(EMPTY_VBA_ONBOARDING_SNAPSHOT);
    jest.mocked(readVbaKycStatusOverrideEnv).mockReturnValue(undefined);
    mockRampsState.autoramps = [
      { id: 'ar-1', walletAddress: '0xabc', status: 'Approved' },
    ];
  });

  afterAll(() => {
    devGlobal.__DEV__ = originalDev;
  });

  it('opens details directly and hydrates in the background for an approved account', () => {
    expect(canOpenPersistedVbaDetails()).toBe(true);

    openVbaEntry(entryNavigation, { source: 'vba-action-row-details' });

    expect(lastResetRoutes()[1]).toEqual({ name: Routes.RAMP.VBA_DETAILS });
    expect(mockHydrate).toHaveBeenCalledWith({
      walletAddress: '0xabc',
      refreshKyc: true,
      refreshAutoramps: true,
    });
  });

  it('logs a failed background hydrate without leaving details', async () => {
    mockHydrate.mockRejectedValue(new Error('offline'));

    openVbaEntry(entryNavigation);
    await Promise.resolve();

    expect(lastResetRoutes()[1]).toEqual({ name: Routes.RAMP.VBA_DETAILS });
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: { name: 'openVbaEntry', data: { step: 'hydrate' } },
      }),
    );
  });

  it.each([
    ['the autoramp is not approved yet', 'Created', '0xabc'],
    ['the approved autoramp belongs to another wallet', 'Approved', '0xdef'],
  ])('opens the loading screen when %s', (_case, status, walletAddress) => {
    mockRampsState.autoramps = [{ id: 'ar-1', walletAddress, status }];

    expect(canOpenPersistedVbaDetails()).toBe(false);

    openVbaEntry(entryNavigation, { source: 'vba-action-row-details' });

    expect(lastResetRoutes()[1]).toEqual(
      expect.objectContaining({
        name: Routes.RAMP.VBA_ONBOARDING,
        state: {
          index: 0,
          routes: [
            {
              name: VbaOnboardingRoutes.LOADING,
              params: { source: 'vba-action-row-details' },
            },
          ],
        },
      }),
    );
    expect(mockHydrate).not.toHaveBeenCalled();
  });

  it('opens the loading screen when a dev KYC override is set', () => {
    jest.mocked(readVbaKycStatusOverrideEnv).mockReturnValue('rejected');

    openVbaEntry(entryNavigation);

    expect(lastResetRoutes()[1]).toEqual(
      expect.objectContaining({ name: Routes.RAMP.VBA_ONBOARDING }),
    );
    expect(mockHydrate).not.toHaveBeenCalled();
  });

  it('opens the loading screen when no wallet is selected', () => {
    mockGetState.mockReturnValue({});

    openVbaEntry(entryNavigation);

    expect(lastResetRoutes()[1]).toEqual(
      expect.objectContaining({ name: Routes.RAMP.VBA_ONBOARDING }),
    );
  });
});

describe('openVbaAccountSetup', () => {
  const dispatch = jest.fn();
  const rootNavigation = {
    dispatch,
    getParent: () => undefined,
    getState: () => ({
      index: 0,
      routeNames: [Routes.HOME_TABS, Routes.RAMP.VBA_ONBOARDING],
      routes: [{ name: Routes.HOME_TABS }],
    }),
  } as unknown as AppNavigationProp;
  const onboardingDispatch = jest.fn();
  const onboardingNavigation = {
    dispatch: onboardingDispatch,
    getParent: () => rootNavigation,
    getState: () => ({
      index: 0,
      routeNames: [
        VbaOnboardingRoutes.VENDOR_TERMS,
        VbaOnboardingRoutes.IDENTITY_VERIFIED,
        VbaOnboardingRoutes.CHOOSE_CURRENCY,
      ],
      routes: [{ name: VbaOnboardingRoutes.IDENTITY_VERIFIED }],
    }),
  } as unknown as AppNavigationProp;
  const lastRootResetRoutes = () =>
    dispatch.mock.calls[dispatch.mock.calls.length - 1][0].payload.routes;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens account details from outside onboarding when Choose Currency is off', () => {
    openVbaAccountSetup(rootNavigation, false);

    expect(lastRootResetRoutes()).toEqual([
      { name: Routes.HOME_TABS },
      { name: Routes.RAMP.VBA_DETAILS },
    ]);
  });

  it('opens Choose Currency as the only onboarding route from outside onboarding', () => {
    openVbaAccountSetup(rootNavigation, true);

    expect(lastRootResetRoutes()[1]).toEqual(
      expect.objectContaining({
        name: Routes.RAMP.VBA_ONBOARDING,
        state: {
          index: 0,
          routes: [{ name: VbaOnboardingRoutes.CHOOSE_CURRENCY }],
        },
      }),
    );
  });

  it('pushes Choose Currency inside onboarding so Back returns to Identity verified', () => {
    openVbaAccountSetup(onboardingNavigation, true);

    expect(onboardingDispatch).toHaveBeenCalledWith(
      StackActions.push(VbaOnboardingRoutes.CHOOSE_CURRENCY),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('opens account details from inside onboarding when Choose Currency is off', () => {
    openVbaAccountSetup(onboardingNavigation, false);

    expect(onboardingDispatch).not.toHaveBeenCalled();
    expect(lastRootResetRoutes()).toEqual([
      { name: Routes.HOME_TABS },
      { name: Routes.RAMP.VBA_DETAILS },
    ]);
  });
});
