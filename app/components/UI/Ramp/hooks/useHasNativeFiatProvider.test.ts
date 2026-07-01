import { renderHook } from '@testing-library/react-hooks';
import { useHasNativeFiatProvider } from './useHasNativeFiatProvider';
import { useRampsProviders } from './useRampsProviders';
import { useFiatProviderScope } from '../utils/providerScope';
import type { FiatProviderScope } from '../../../../reducers/fiatOrders/types';

jest.mock('./useRampsProviders');
jest.mock('../utils/providerScope');

describe('useHasNativeFiatProvider', () => {
  const useRampsProvidersMock = jest.mocked(useRampsProviders);
  const useFiatProviderScopeMock = jest.mocked(useFiatProviderScope);

  beforeEach(() => {
    jest.resetAllMocks();
    // Default to native-only; individual widened cases opt in via mockScope.
    useFiatProviderScopeMock.mockReturnValue('off');
  });

  function mockSelection(selectedProvider: unknown, providers: unknown[] = []) {
    useRampsProvidersMock.mockReturnValue({
      providers,
      selectedProvider,
    } as unknown as ReturnType<typeof useRampsProviders>);
  }

  function mockScope(scope: FiatProviderScope) {
    useFiatProviderScopeMock.mockReturnValue(scope);
  }

  describe('scope off (native-only)', () => {
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

  describe('scope in-app / all (widened)', () => {
    const widened: FiatProviderScope[] = ['in-app', 'all'];

    it.each(widened)(
      'returns true for a native selected provider (scope %s)',
      (scope) => {
        mockScope(scope);
        mockSelection({ id: '/providers/transak-native', type: 'native' });
        const { result } = renderHook(() => useHasNativeFiatProvider());
        expect(result.current).toBe(true);
      },
    );

    it.each(widened)(
      'returns true when an aggregator is selected but the region has providers (scope %s)',
      (scope) => {
        mockScope(scope);
        mockSelection({ id: '/providers/moonpay', type: 'aggregator' }, [
          { id: '/providers/moonpay', type: 'aggregator' },
        ]);
        const { result } = renderHook(() => useHasNativeFiatProvider());
        expect(result.current).toBe(true);
      },
    );

    it.each(widened)(
      'returns true when no provider is selected but the region has providers (scope %s)',
      (scope) => {
        mockScope(scope);
        mockSelection(null, [{ id: '/providers/moonpay', type: 'aggregator' }]);
        const { result } = renderHook(() => useHasNativeFiatProvider());
        expect(result.current).toBe(true);
      },
    );

    it.each(widened)(
      'returns false when the region has no providers (scope %s)',
      (scope) => {
        mockScope(scope);
        mockSelection(null, []);
        const { result } = renderHook(() => useHasNativeFiatProvider());
        expect(result.current).toBe(false);
      },
    );
  });
});
