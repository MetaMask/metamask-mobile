import { usePredictionsDefaultSectionModel } from './usePredictionsDefaultSectionModel';

const createInput = (
  overrides: Partial<
    Parameters<typeof usePredictionsDefaultSectionModel>[0]
  > = {},
): Parameters<typeof usePredictionsDefaultSectionModel>[0] => ({
  isPredictEnabled: true,
  isLoadingPositions: false,
  isLoadingClaimable: false,
  isLoadingMarkets: false,
  isTreatmentDiscovery: false,
  isLoadingWorldCupHomepage: false,
  hasPositions: false,
  positionsLength: 0,
  positionsError: null,
  marketsError: null,
  marketsLength: 1,
  totalClaimableValue: 0,
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
});
