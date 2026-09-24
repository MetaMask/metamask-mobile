import { usePredictionsDefaultSectionModel } from './usePredictionsDefaultSectionModel';

const createInput = (
  overrides: Partial<
    Parameters<typeof usePredictionsDefaultSectionModel>[0]
  > = {},
): Parameters<typeof usePredictionsDefaultSectionModel>[0] => ({
  isPredictEnabled: true,
  isLoadingPositions: false,
  isLoadingMarkets: false,
  isTreatmentDiscovery: false,
  isLoadingWorldCupHomepage: false,
  hasPositions: false,
  positionsLength: 0,
  positionsError: null,
  marketsError: null,
  marketsLength: 1,
  ...overrides,
});

describe('usePredictionsDefaultSectionModel', () => {
  it('ignores World Cup loading in the control carousel layout', () => {
    const result = usePredictionsDefaultSectionModel(
      createInput({
        isTreatmentDiscovery: false,
        isLoadingWorldCupHomepage: true,
      }),
    );

    expect(result.isLoading).toBe(false);
    expect(result.predictTimeToContentReady).toBe(true);
  });

  it('includes World Cup loading in the treatment discovery layout', () => {
    const result = usePredictionsDefaultSectionModel(
      createInput({
        isTreatmentDiscovery: true,
        isLoadingWorldCupHomepage: true,
        marketsLength: 0,
      }),
    );

    expect(result.isLoading).toBe(true);
    expect(result.predictTimeToContentReady).toBe(false);
  });

  it('treats claimable-only users as having no homepage positions', () => {
    const result = usePredictionsDefaultSectionModel(
      createInput({
        hasPositions: false,
        positionsLength: 0,
        marketsLength: 2,
      }),
    );

    expect(result.hasAnyPositions).toBe(false);
    expect(result.showTrendingAbove).toBe(true);
    expect(result.itemCount).toBe(2);
  });

  it('counts open positions when the user has them', () => {
    const result = usePredictionsDefaultSectionModel(
      createInput({
        hasPositions: true,
        positionsLength: 3,
        marketsLength: 2,
      }),
    );

    expect(result.hasAnyPositions).toBe(true);
    expect(result.showTrendingAbove).toBe(false);
    expect(result.itemCount).toBe(3);
  });
});
