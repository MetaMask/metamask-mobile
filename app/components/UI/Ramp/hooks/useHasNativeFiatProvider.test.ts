import { renderHook } from '@testing-library/react-hooks';
import { useHasNativeFiatProvider } from './useHasNativeFiatProvider';
import { useRampsProviders } from './useRampsProviders';
import { useHeadlessAllProvidersEnabled } from './useHeadlessAllProvidersEnabled';

jest.mock('./useRampsProviders');
jest.mock('./useHeadlessAllProvidersEnabled');

describe('useHasNativeFiatProvider', () => {
  const useRampsProvidersMock = jest.mocked(useRampsProviders);
  const useHeadlessAllProvidersEnabledMock = jest.mocked(
    useHeadlessAllProvidersEnabled,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    // Default to native-only; widened cases opt in via mockFlag(true).
    useHeadlessAllProvidersEnabledMock.mockReturnValue(false);
  });

  function mockSelection(selectedProvider: unknown, providers: unknown[] = []) {
    useRampsProvidersMock.mockReturnValue({
      providers,
      selectedProvider,
    } as unknown as ReturnType<typeof useRampsProviders>);
  }

  function mockFlag(allProvidersEnabled: boolean) {
    useHeadlessAllProvidersEnabledMock.mockReturnValue(allProvidersEnabled);
  }

  describe('flag disabled (native-only)', () => {
    it('returns true when the selected (preferred) provider is native', () => {
      mockSelection({ id: '/providers/transak-native', type: 'native' });
      const { result } = renderHook(() => useHasNativeFiatProvider());
      expect(result.current).toBe(true);
    });

    it('returns false when the selected provider is an aggregator, even if a native provider exists in the region', () => {
      mockSelection({ id: '/providers/transak', type: 'aggregator' }, [
        { id: '/providers/transak', type: 'aggregator' },
        { id: '/providers/transak-native', type: 'native' },
      ]);
      const { result } = renderHook(() => useHasNativeFiatProvider());
      expect(result.current).toBe(false);
    });

    it('returns false when no provider is selected', () => {
      mockSelection(null, [
        { id: '/providers/transak-native', type: 'native' },
      ]);
      const { result } = renderHook(() => useHasNativeFiatProvider());
      expect(result.current).toBe(false);
    });

    it('returns false when the selected provider has no type (pre-v2 catalog)', () => {
      mockSelection({ id: '/providers/transak' });
      const { result } = renderHook(() => useHasNativeFiatProvider());
      expect(result.current).toBe(false);
    });
  });

  describe('flag enabled (widened to all providers)', () => {
    beforeEach(() => {
      mockFlag(true);
    });

    it('returns true for a native selected provider', () => {
      mockSelection({ id: '/providers/transak-native', type: 'native' });
      const { result } = renderHook(() => useHasNativeFiatProvider());
      expect(result.current).toBe(true);
    });

    it('returns true when an aggregator is selected but the region has providers', () => {
      mockSelection({ id: '/providers/moonpay', type: 'aggregator' }, [
        { id: '/providers/moonpay', type: 'aggregator' },
      ]);
      const { result } = renderHook(() => useHasNativeFiatProvider());
      expect(result.current).toBe(true);
    });

    it('returns true when no provider is selected but the region has providers', () => {
      mockSelection(null, [{ id: '/providers/moonpay', type: 'aggregator' }]);
      const { result } = renderHook(() => useHasNativeFiatProvider());
      expect(result.current).toBe(true);
    });

    it('returns false when the region has no providers', () => {
      mockSelection(null, []);
      const { result } = renderHook(() => useHasNativeFiatProvider());
      expect(result.current).toBe(false);
    });
  });
});
