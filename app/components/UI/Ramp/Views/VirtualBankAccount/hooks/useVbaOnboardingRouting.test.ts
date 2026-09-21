import { VbaOnboardingStage } from '@metamask/ramps-controller';
import { renderHook } from '@testing-library/react-native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Logger from '../../../../../../util/Logger';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  navigateToVbaOnboardingRoute,
  useVbaOnboardingRouting,
} from './useVbaOnboardingRouting';

const mockNavigate = jest.fn();
const navigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockHydrate = jest.fn();
const mockGetState = jest.fn();

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

describe('useVbaOnboardingRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockHydrate.mockResolvedValue(VbaOnboardingStage.EmailOtpRequired);
  });

  it('hydrates then navigates to the route for the returned stage', async () => {
    const { result } = renderHook(() => useVbaOnboardingRouting());

    await result.current();

    expect(mockHydrate).toHaveBeenCalledWith({ walletAddress: '0xabc' });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_KYC_EMAIL);
  });

  it('navigates to Money home when the stage is completed', async () => {
    mockHydrate.mockResolvedValue(VbaOnboardingStage.Completed);

    const { result } = renderHook(() => useVbaOnboardingRouting());

    await result.current();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('opens the error screen when hydrate throws', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() => useVbaOnboardingRouting());

    await result.current();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING_ERROR);
  });

  it('opens the error screen when no wallet address is selected', async () => {
    mockGetState.mockReturnValue({ address: null });

    const { result } = renderHook(() => useVbaOnboardingRouting());

    await result.current();

    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING_ERROR);
  });

  it('logs failures with the default source when none is supplied', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    const { result } = renderHook(() => useVbaOnboardingRouting());

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
      useVbaOnboardingRouting('get-pix-key-continue'),
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

    const { result } = renderHook(() =>
      useVbaOnboardingRouting('hook-default'),
    );

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
