import { renderHook } from '@testing-library/react-native';

import { usePerpsProvider } from './usePerpsProvider';
import {
  getPerpsProviderLogoIds,
  usePerpsProviderLogoIds,
} from './usePerpsProviderLogoIds';

jest.mock('./usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

const mockUsePerpsProvider = jest.mocked(usePerpsProvider);

describe('getPerpsProviderLogoIds', () => {
  it('returns the Hyperliquid mark for the Hyperliquid provider', () => {
    expect(getPerpsProviderLogoIds('hyperliquid')).toEqual(['hyperliquid']);
  });

  it('returns the Lighter mark for the Lighter provider', () => {
    expect(getPerpsProviderLogoIds('lighter')).toEqual(['lighter']);
  });

  it('returns Hyperliquid then Lighter for aggregated mode', () => {
    expect(getPerpsProviderLogoIds('aggregated')).toEqual([
      'hyperliquid',
      'lighter',
    ]);
  });

  it('returns no marks when the provider is missing', () => {
    expect(getPerpsProviderLogoIds(undefined)).toEqual([]);
  });
});

describe('usePerpsProviderLogoIds', () => {
  it('returns no logos when multi-provider is disabled', () => {
    mockUsePerpsProvider.mockReturnValue({
      isMultiProviderEnabled: false,
      activeProvider: 'hyperliquid',
    } as ReturnType<typeof usePerpsProvider>);

    const { result } = renderHook(() => usePerpsProviderLogoIds());

    expect(result.current).toEqual([]);
  });

  it('returns the active provider logos when multi-provider is enabled', () => {
    mockUsePerpsProvider.mockReturnValue({
      isMultiProviderEnabled: true,
      activeProvider: 'lighter',
    } as ReturnType<typeof usePerpsProvider>);

    const { result } = renderHook(() => usePerpsProviderLogoIds());

    expect(result.current).toEqual(['lighter']);
  });
});
