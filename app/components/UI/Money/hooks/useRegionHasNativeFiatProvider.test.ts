import { renderHook } from '@testing-library/react-native';
import { useRegionHasNativeFiatProvider } from './useRegionHasNativeFiatProvider';
import { useRampsProviders } from '../../Ramp/hooks/useRampsProviders';

jest.mock('../../Ramp/hooks/useRampsProviders', () => ({
  useRampsProviders: jest.fn(),
}));

const mockUseRampsProviders = useRampsProviders as jest.Mock;

describe('useRegionHasNativeFiatProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when the region offers at least one native provider', () => {
    mockUseRampsProviders.mockReturnValue({
      providers: [{ type: 'aggregator' }, { type: 'native' }],
    });

    const { result } = renderHook(() => useRegionHasNativeFiatProvider());

    expect(result.current).toBe(true);
  });

  it('returns false when the region offers only aggregator providers', () => {
    mockUseRampsProviders.mockReturnValue({
      providers: [{ type: 'aggregator' }, { type: 'aggregator' }],
    });

    const { result } = renderHook(() => useRegionHasNativeFiatProvider());

    expect(result.current).toBe(false);
  });

  it('returns false when the region has no providers', () => {
    mockUseRampsProviders.mockReturnValue({ providers: [] });

    const { result } = renderHook(() => useRegionHasNativeFiatProvider());

    expect(result.current).toBe(false);
  });
});
