export interface UsePredictionsDefaultSectionModelInput {
  isPredictEnabled: boolean;
  isLoadingPositions: boolean;
  isLoadingClaimable: boolean;
  isLoadingMarkets: boolean;
  isTreatmentDiscovery: boolean;
  isLoadingWorldCupHomepage: boolean;
  hasPositions: boolean;
  positionsLength: number;
  positionsError: string | null;
  marketsError: string | null;
  marketsLength: number;
  totalClaimableValue: number;
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
  isLoadingClaimable,
  isLoadingMarkets,
  isTreatmentDiscovery,
  isLoadingWorldCupHomepage,
  hasPositions,
  positionsLength,
  positionsError,
  marketsError,
  marketsLength,
  totalClaimableValue,
}: UsePredictionsDefaultSectionModelInput): PredictionsDefaultSectionModel {
  const hasClaimablePositions = !isLoadingClaimable && totalClaimableValue > 0;
  const hasAnyPositions = hasPositions || hasClaimablePositions;
  const inPositionsLayout =
    hasAnyPositions || isLoadingPositions || isLoadingClaimable;

  const hasError = Boolean(
    !isLoadingPositions &&
      !isLoadingMarkets &&
      !isLoadingClaimable &&
      !hasAnyPositions &&
      marketsLength === 0 &&
      (positionsError || marketsError),
  );

  const isLoading =
    isLoadingPositions ||
    isLoadingClaimable ||
    isLoadingWorldCupHomepage ||
    (!isTreatmentDiscovery && isLoadingMarkets);

  const isEmpty =
    !isLoading &&
    !hasAnyPositions &&
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
    (hasAnyPositions || marketsLength > 0 || isTreatmentDiscovery);

  const itemCount = hasPositions
    ? positionsLength
    : hasClaimablePositions
      ? marketsLength || 1
      : isTreatmentDiscovery
        ? 1
        : marketsLength;

  return {
    hasAnyPositions,
    hasError,
    isEmpty,
    showTrendingAbove,
    predictTimeToContentReady,
    willRender,
    isLoading,
    itemCount,
  };
}
