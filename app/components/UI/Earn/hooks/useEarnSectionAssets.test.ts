import { renderHook, waitFor } from '@testing-library/react-native';
import Logger from '../../../../util/Logger';
import useEarnAssetCatalogue from './useEarnAssetCatalogue';
import useEarnSectionAssets from './useEarnSectionAssets';

jest.mock('../../../../util/Logger');
jest.mock('./useEarnAssetCatalogue');

const mockUseEarnAssetCatalogue = useEarnAssetCatalogue as jest.MockedFunction<
  typeof useEarnAssetCatalogue
>;
const mockLoggerError = jest.mocked(Logger.error);

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

  it('does not refresh the catalogue for the initial trigger', () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ refresh }),
    );

    renderHook(() => useEarnSectionAssets({ refreshTrigger: 0 }));

    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes the catalogue when the trigger increments', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ refresh }),
    );

    const { rerender } = renderHook(
      ({ refreshTrigger }: { refreshTrigger: number }) =>
        useEarnSectionAssets({ refreshTrigger }),
      { initialProps: { refreshTrigger: 0 } },
    );

    rerender({ refreshTrigger: 1 });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('logs a rejected catalogue refresh', async () => {
    const refreshError = new Error('Catalogue refresh failed');
    const refresh = jest.fn().mockRejectedValue(refreshError);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ refresh }),
    );

    renderHook(() => useEarnSectionAssets({ refreshTrigger: 1 }));

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        refreshError,
        'EarnSection: Failed to refresh Earn data',
      );
    });
  });
});
