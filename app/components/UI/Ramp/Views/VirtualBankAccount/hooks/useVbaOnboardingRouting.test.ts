import { renderHook } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Logger from '../../../../../../util/Logger';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  navigateToVbaOnboardingDestination,
  useOpenVbaOnboarding,
} from './useVbaOnboardingRouting';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../vbaOnboardingSnapshot';
import { VbaOnboardingRoutes } from '../routes';

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
const mockGetState = jest.fn();
const mockHasAcceptedVbaVendorTerms = jest.fn();
const mockGetVbaVendorTermsAcceptance = jest.fn();
const mockRecordVendorDisclaimers = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      hydrateVbaOnboarding: (...args: unknown[]) => mockHydrate(...args),
    },
    KycController: {
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

jest.mock('../../../../../../selectors/rampsController', () => ({
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
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
    });
  });

  it('hydrates then navigates to the route for the returned snapshot', async () => {
    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockHydrate).toHaveBeenCalledWith({ walletAddress: '0xabc' });
    expectResetTo({ name: VbaOnboardingRoutes.VENDOR_TERMS });
  });

  it('opens at email when vendor terms are accepted locally', async () => {
    mockHasAcceptedVbaVendorTerms.mockResolvedValue(true);
    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockHasAcceptedVbaVendorTerms).toHaveBeenCalledWith('0xabc');
    expectResetTo({ name: VbaOnboardingRoutes.EMAIL });
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

    expectResetTo({ name: VbaOnboardingRoutes.DETAILS });
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

  it('opens identity verification when retrying a still-rejected KYC session', async () => {
    const rejectedSnapshot = {
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      kycStatus: 'rejected' as const,
    };
    mockHydrate.mockResolvedValue(rejectedSnapshot);

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current({ retryRejectedKyc: true });

    const snapshot = {
      ...rejectedSnapshot,
      vendorTermsAcceptedLocally: true,
    };
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.push(VbaOnboardingRoutes.IDENTITY_VERIFICATION, {
        snapshot,
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens a retryable status when account provisioning fails', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      kycStatus: 'approved',
      autorampStatus: 'retryable_failure',
    });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expectResetTo({ name: VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR });
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
          VbaOnboardingRoutes.EMAIL,
        ],
        routes: [
          { name: VbaOnboardingRoutes.VENDOR_TERMS },
          { name: VbaOnboardingRoutes.EMAIL },
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

  it('keeps only the active caller and destination on first entry', () => {
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
          index: 1,
          routes: [
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
          index: 1,
          routes: [
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
