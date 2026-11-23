export interface UsePredictionsDefaultSectionModelInput {
  isPredictEnabled: boolean;
  isLoadingPositions: boolean;
  isLoadingMarkets: boolean;
  isTreatmentDiscovery: boolean;
  isLoadingWorldCupHomepage: boolean;
  hasPositions: boolean;
  positionsLength: number;
  positionsError: string | null;
  marketsError: string | null;
  marketsLength: number;
}

export interface PredictionsDefaultSectionModel {
  hasAnyPositions: boolean;
  hasError: boolean;
  isEmpty: boolean;
  showTrendingAbove: boolean;
  predictTimeToContentReady: boolean;
  willRender: boolean;
  isLoading: boolean;
  itemCount: number;
}

export function usePredictionsDefaultSectionModel({
  isPredictEnabled,
  isLoadingPositions,
  isLoadingMarkets,
  isTreatmentDiscovery,
  isLoadingWorldCupHomepage,
  hasPositions,
  positionsLength,
  positionsError,
  marketsError,
  marketsLength,
}: UsePredictionsDefaultSectionModelInput): PredictionsDefaultSectionModel {
  const inPositionsLayout = hasPositions || isLoadingPositions;

  const hasError = Boolean(
    !isLoadingPositions &&
      !isLoadingMarkets &&
      !hasPositions &&
      marketsLength === 0 &&
      (positionsError || (!isTreatmentDiscovery && marketsError)),
  );

  const isLoading =
    isLoadingPositions ||
    (isTreatmentDiscovery && isLoadingWorldCupHomepage) ||
    (!isTreatmentDiscovery && isLoadingMarkets);

  const isEmpty =
    !isLoading &&
    !hasPositions &&
    !hasError &&
    !isTreatmentDiscovery &&
    marketsLength === 0;

  const showTrendingAbove =
    !hasPositions &&
    !isLoadingPositions &&
    (isTreatmentDiscovery || isLoadingMarkets || marketsLength > 0);

  const predictTimeToContentReady = Boolean(
    isPredictEnabled &&
      (hasError ||
        (inPositionsLayout
          ? !isLoadingPositions && (hasPositions || !isLoadingMarkets)
          : isTreatmentDiscovery
            ? !isLoadingWorldCupHomepage
            : !isLoadingMarkets)),
  );

  const willRender =
    isPredictEnabled &&
    !hasError &&
    !isLoading &&
    (hasPositions || marketsLength > 0 || isTreatmentDiscovery);

  const itemCount = hasPositions
    ? positionsLength
    : isTreatmentDiscovery
      ? 1
      : marketsLength;

  return {
    hasAnyPositions: hasPositions,
    hasError,
    isEmpty,
    showTrendingAbove,
    predictTimeToContentReady,
    willRender,
    isLoading,
    itemCount,
  };
}
