import { renderHook } from '@testing-library/react-native';
import useEarnAssetCatalogue from './useEarnAssetCatalogue';
import useEarnSectionAssets from './useEarnSectionAssets';

jest.mock('./useEarnAssetCatalogue');

const mockUseEarnAssetCatalogue = useEarnAssetCatalogue as jest.MockedFunction<
  typeof useEarnAssetCatalogue
>;

type EarnAssetCatalogueResult = ReturnType<typeof useEarnAssetCatalogue>;

const createCatalogueResult = (
  overrides: Partial<EarnAssetCatalogueResult> = {},
): EarnAssetCatalogueResult => ({
  assets: [],
  assetsById: {},
  isLoading: false,
  hasError: false,
  errors: [],
  refresh: jest.fn().mockResolvedValue(undefined),
  moneyApyPercent: undefined,
  moneyRateStatus: 'unavailable',
  ...overrides,
});

describe('useEarnSectionAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEarnAssetCatalogue.mockReturnValue(createCatalogueResult());
  });

  it('does not refresh the catalogue when rendered', () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ refresh }),
    );

    renderHook(() => useEarnSectionAssets());

    expect(refresh).not.toHaveBeenCalled();
  });

  it('returns the catalogue refresh function', () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ refresh }),
    );

    const { result } = renderHook(() => useEarnSectionAssets());

    expect(result.current.refresh).toBe(refresh);
  });

  it('forwards enabled state to the catalogue hook', () => {
    renderHook(() => useEarnSectionAssets({ enabled: false }));

    expect(mockUseEarnAssetCatalogue).toHaveBeenCalledWith({ enabled: false });
  });
});
