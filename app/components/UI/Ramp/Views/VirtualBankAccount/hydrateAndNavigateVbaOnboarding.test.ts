import { VbaOnboardingStage } from '@metamask/ramps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  hydrateAndNavigateVbaOnboarding,
  navigateToVbaOnboardingRoute,
} from './hydrateAndNavigateVbaOnboarding';

const mockNavigate = jest.fn();
const navigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

const mockHydrate = jest.fn();
const mockGetState = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      hydrateVbaOnboarding: (...args: unknown[]) => mockHydrate(...args),
    },
  },
}));

jest.mock('../../../../../core/redux', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: jest.fn(
    (state: { address?: string }) => state.address ?? null,
  ),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

describe('hydrateAndNavigateVbaOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockHydrate.mockResolvedValue(VbaOnboardingStage.EmailOtpRequired);
  });

  it('hydrates then navigates to the route for the returned stage', async () => {
    await hydrateAndNavigateVbaOnboarding(navigation);

    expect(mockHydrate).toHaveBeenCalledWith({ walletAddress: '0xabc' });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_KYC_EMAIL);
  });

  it('navigates to Money home when the stage is completed', async () => {
    mockHydrate.mockResolvedValue(VbaOnboardingStage.Completed);

    await hydrateAndNavigateVbaOnboarding(navigation);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('opens the error screen when hydrate throws', async () => {
    mockHydrate.mockRejectedValue(new Error('hydrate failed'));

    await hydrateAndNavigateVbaOnboarding(navigation);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING_ERROR);
  });

  it('opens the error screen when no wallet address is selected', async () => {
    mockGetState.mockReturnValue({ address: null });

    await hydrateAndNavigateVbaOnboarding(navigation);

    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING_ERROR);
  });

  it('navigates to a provided VBA route', () => {
    navigateToVbaOnboardingRoute(navigation, Routes.RAMP.GET_PIX_KEY);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.GET_PIX_KEY);
  });
});
