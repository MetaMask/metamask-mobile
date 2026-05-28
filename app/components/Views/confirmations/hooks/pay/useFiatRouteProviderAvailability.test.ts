import { renderHook } from '@testing-library/react-native';
import type { Provider } from '@metamask/ramps-controller';
import { useFiatRouteProviderAvailability } from './useFiatRouteProviderAvailability';
import { useRampsProviders } from '../../../../UI/Ramp/hooks/useRampsProviders';
import { RAMPS_PROVIDER_IDS } from '../../../../UI/Ramp/constants/providerIds';

jest.mock('../../../../UI/Ramp/hooks/useRampsProviders', () => ({
  useRampsProviders: jest.fn(),
}));

const TRANSAK_NATIVE: Provider = {
  id: RAMPS_PROVIDER_IDS.TRANSAK_NATIVE,
  name: 'Transak',
} as unknown as Provider;

const OTHER_PROVIDER: Provider = {
  id: 'moonpay',
  name: 'MoonPay',
} as unknown as Provider;

describe('useFiatRouteProviderAvailability', () => {
  const mockUseRampsProviders = jest.mocked(useRampsProviders);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockProviders(overrides: {
    providers?: Provider[];
    isLoading?: boolean;
  }) {
    mockUseRampsProviders.mockReturnValue({
      providers: overrides.providers ?? [],
      isLoading: overrides.isLoading ?? false,
    } as unknown as ReturnType<typeof useRampsProviders>);
  }

  it('reports the target provider as available when present', () => {
    mockProviders({ providers: [OTHER_PROVIDER, TRANSAK_NATIVE] });

    const { result } = renderHook(() => useFiatRouteProviderAvailability());

    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.provider).toBe(TRANSAK_NATIVE);
  });

  it('reports unavailable when the target provider is missing from the list', () => {
    mockProviders({ providers: [OTHER_PROVIDER] });

    const { result } = renderHook(() => useFiatRouteProviderAvailability());

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.provider).toBeUndefined();
  });

  it('does not flag as available while still loading', () => {
    mockProviders({ providers: [TRANSAK_NATIVE], isLoading: true });

    const { result } = renderHook(() => useFiatRouteProviderAvailability());

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.provider).toBe(TRANSAK_NATIVE);
  });
});
