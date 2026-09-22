import { renderHook } from '@testing-library/react-native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Logger from '../../../../../../util/Logger';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  navigateToVbaOnboardingRoute,
  resetVbaOnboardingSnapshotCache,
  useAdvanceVbaOnboarding,
  useResumeVbaOnboarding,
} from './useVbaOnboardingRouting';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../vbaOnboardingSnapshot';

const mockNavigate = jest.fn();
const navigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockHydrate = jest.fn();
const mockGetState = jest.fn();
const mockHasAcceptedVbaTermsOne = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      hydrateVbaOnboarding: (...args: unknown[]) => mockHydrate(...args),
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
    error: jest.fn(),
  },
}));

jest.mock('../vbaTermsOneStorage', () => ({
  hasAcceptedVbaTermsOne: (...args: unknown[]) =>
    mockHasAcceptedVbaTermsOne(...args),
}));

describe('useResumeVbaOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetVbaOnboardingSnapshotCache();
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockHasAcceptedVbaTermsOne.mockResolvedValue(false);
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
    });
  });

  it('hydrates then navigates to the route for the returned snapshot', async () => {
    const { result } = renderHook(() => useResumeVbaOnboarding());

    await result.current();

    expect(mockHydrate).toHaveBeenCalledWith({ walletAddress: '0xabc' });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.GET_PIX_KEY);
  });

  it('resumes at email when Terms 1 is accepted locally', async () => {
    mockHasAcceptedVbaTermsOne.mockResolvedValue(true);
    const { result } = renderHook(() => useResumeVbaOnboarding());

    await result.current();

    expect(mockHasAcceptedVbaTermsOne).toHaveBeenCalledWith('0xabc');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_KYC_EMAIL);
  });

  it('navigates to Money home when activation is ready', async () => {
    mockHydrate.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      kycStatus: 'approved',
      finalStatus: 'approved',
      activation: 'ready',
    });

    const { result } = renderHook(() => useResumeVbaOnboarding());

    await result.current();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('opens the error screen when hydrate throws', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() => useResumeVbaOnboarding());

    await result.current();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING_ERROR);
  });

  it('opens the error screen when no wallet address is selected', async () => {
    mockGetState.mockReturnValue({ address: null });

    const { result } = renderHook(() => useResumeVbaOnboarding());

    await result.current();

    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING_ERROR);
  });

  it('logs failures with the default source when none is supplied', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() => useResumeVbaOnboarding());

    await result.current();

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({ source: 'unspecified' }),
      }),
    );
  });

  it('logs failures with the hook default source', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() =>
      useResumeVbaOnboarding('get-pix-key-continue'),
    );

    await result.current();

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({ source: 'get-pix-key-continue' }),
      }),
    );
  });

  it('logs failures with a per-call source override', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() => useResumeVbaOnboarding('hook-default'));

    await result.current('call-override');

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({ source: 'call-override' }),
      }),
    );
  });

  it('navigates to a provided VBA route', () => {
    navigateToVbaOnboardingRoute(navigation, Routes.RAMP.GET_PIX_KEY);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.GET_PIX_KEY);
  });
});

describe('useAdvanceVbaOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetVbaOnboardingSnapshotCache();
  });

  it('advances Terms 1 to email without hydrating', () => {
    const { result } = renderHook(() => useAdvanceVbaOnboarding('termsOne'));

    result.current();

    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_KYC_EMAIL);
  });
});
