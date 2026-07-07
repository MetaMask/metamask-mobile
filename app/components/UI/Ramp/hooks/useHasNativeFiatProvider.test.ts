import { renderHook } from '@testing-library/react-hooks';
import { useHasNativeFiatProvider } from './useHasNativeFiatProvider';
import { useRampsProviders } from './useRampsProviders';

jest.mock('./useRampsProviders');

describe('useHasNativeFiatProvider', () => {
  const useRampsProvidersMock = jest.mocked(useRampsProviders);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  function mockSelection(selectedProvider: unknown, providers: unknown[] = []) {
    useRampsProvidersMock.mockReturnValue({
      providers,
      selectedProvider,
    } as unknown as ReturnType<typeof useRampsProviders>);
  }

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
    mockSelection(null, [{ id: '/providers/transak-native', type: 'native' }]);
    const { result } = renderHook(() => useHasNativeFiatProvider());
    expect(result.current).toBe(false);
  });

  it('returns false when the selected provider has no type (pre-v2 catalog)', () => {
    mockSelection({ id: '/providers/transak' });
    const { result } = renderHook(() => useHasNativeFiatProvider());
    expect(result.current).toBe(false);
  });
});
