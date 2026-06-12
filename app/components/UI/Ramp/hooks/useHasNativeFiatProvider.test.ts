import { renderHook } from '@testing-library/react-hooks';
import { useHasNativeFiatProvider } from './useHasNativeFiatProvider';
import { useRampsProviders } from './useRampsProviders';

jest.mock('./useRampsProviders');

describe('useHasNativeFiatProvider', () => {
  const useRampsProvidersMock = jest.mocked(useRampsProviders);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  function mockProviders(providers: unknown[]) {
    useRampsProvidersMock.mockReturnValue({
      providers,
    } as unknown as ReturnType<typeof useRampsProviders>);
  }

  it('returns true when a native provider exists', () => {
    mockProviders([
      { id: '/providers/transak', type: 'aggregator' },
      { id: '/providers/transak-native', type: 'native' },
    ]);
    const { result } = renderHook(() => useHasNativeFiatProvider());
    expect(result.current).toBe(true);
  });

  it('returns false when only aggregator providers exist', () => {
    mockProviders([{ id: '/providers/transak', type: 'aggregator' }]);
    const { result } = renderHook(() => useHasNativeFiatProvider());
    expect(result.current).toBe(false);
  });

  it('returns false when the provider list is empty', () => {
    mockProviders([]);
    const { result } = renderHook(() => useHasNativeFiatProvider());
    expect(result.current).toBe(false);
  });

  it('returns false when provider type is absent (pre-v2 catalog)', () => {
    mockProviders([{ id: '/providers/transak' }]);
    const { result } = renderHook(() => useHasNativeFiatProvider());
    expect(result.current).toBe(false);
  });
});
