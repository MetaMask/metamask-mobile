import { renderHook } from '@testing-library/react-native';
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
const navigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
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
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.VENDOR_TERMS,
    });
  });

  it('opens at email when vendor terms are accepted locally', async () => {
    mockHasAcceptedVbaVendorTerms.mockResolvedValue(true);
    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockHasAcceptedVbaVendorTerms).toHaveBeenCalledWith('0xabc');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.EMAIL,
    });
  });

  it('navigates to Money home when the autoramp is ready', async () => {
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
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
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.KYC_PENDING,
    });
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR,
    });
  });

  it('opens the error screen when hydrate throws', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.ERROR,
    });
  });

  it('opens the error screen when no wallet address is selected', async () => {
    mockGetState.mockReturnValue({ address: null });

    const { result } = renderHook(() => useOpenVbaOnboarding());

    await result.current();

    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.ERROR,
    });
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.VENDOR_TERMS,
    });
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
      params: { snapshot },
    });
  });
});
