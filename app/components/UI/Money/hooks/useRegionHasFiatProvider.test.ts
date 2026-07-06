import { renderHook } from '@testing-library/react-native';
import { useRegionHasFiatProvider } from './useRegionHasFiatProvider';
import { useRampsProviders } from '../../Ramp/hooks/useRampsProviders';
import { useFiatProviderScope } from '../../Ramp/utils/providerScope';

jest.mock('../../Ramp/hooks/useRampsProviders', () => ({
  useRampsProviders: jest.fn(),
}));
jest.mock('../../Ramp/utils/providerScope', () => ({
  useFiatProviderScope: jest.fn(),
}));

const mockUseRampsProviders = useRampsProviders as jest.Mock;
const mockUseFiatProviderScope = useFiatProviderScope as jest.Mock;

describe('useRegionHasFiatProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFiatProviderScope.mockReturnValue('off');
  });

  it.each(['off', 'in-app', 'all'] as const)(
    'returns true when the region offers a native provider (scope %s)',
    (scope) => {
      mockUseFiatProviderScope.mockReturnValue(scope);
      mockUseRampsProviders.mockReturnValue({
        providers: [{ type: 'aggregator' }, { type: 'native' }],
      });

      const { result } = renderHook(() => useRegionHasFiatProvider());

      expect(result.current).toBe(true);
    },
  );

  describe("when scope is 'off' (native-only)", () => {
    beforeEach(() => {
      mockUseFiatProviderScope.mockReturnValue('off');
    });

    it('returns false when the region offers only aggregator providers', () => {
      mockUseRampsProviders.mockReturnValue({
        providers: [{ type: 'aggregator' }, { type: 'aggregator' }],
      });

      const { result } = renderHook(() => useRegionHasFiatProvider());

      expect(result.current).toBe(false);
    });

    it('returns false when the region has no providers', () => {
      mockUseRampsProviders.mockReturnValue({ providers: [] });

      const { result } = renderHook(() => useRegionHasFiatProvider());

      expect(result.current).toBe(false);
    });
  });

  describe.each(['in-app', 'all'] as const)("when scope is '%s'", (scope) => {
    beforeEach(() => {
      mockUseFiatProviderScope.mockReturnValue(scope);
    });

    it('returns true when the region offers only aggregator providers', () => {
      mockUseRampsProviders.mockReturnValue({
        providers: [{ type: 'aggregator' }, { type: 'aggregator' }],
      });

      const { result } = renderHook(() => useRegionHasFiatProvider());

      expect(result.current).toBe(true);
    });

    it('returns false when the region has no providers at all', () => {
      mockUseRampsProviders.mockReturnValue({ providers: [] });

      const { result } = renderHook(() => useRegionHasFiatProvider());

      expect(result.current).toBe(false);
    });
  });
});
