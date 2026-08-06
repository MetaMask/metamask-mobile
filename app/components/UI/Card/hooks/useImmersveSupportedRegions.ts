import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { CardProviderIds } from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  selectCardFeatureFlag,
  selectImmersveOnboardingEnabled,
} from '../../../../selectors/featureFlagController/card';
import { cardQueries } from '../queries';
import {
  getOnboardingLegalDocuments,
  getPermanentLegalDocuments,
  getRegionByCode,
} from '../util/immersveLegalDocuments';

export interface UseImmersveSupportedRegionsOptions {
  /**
   * When provided, overrides the default Immersve FF + country gate.
   * Use on Card Home when the active provider is already Immersve.
   */
  enabled?: boolean;
}

function getController() {
  const controller = Engine.context?.CardController;
  if (!controller) {
    throw new Error('CardController not initialized');
  }
  return controller;
}

/**
 * Fetches Immersve supported-regions (full list) via CardController / Card API,
 * caches for 5 minutes, and derives region docs by filtering locally.
 */
const useImmersveSupportedRegions = (
  regionCode: string | null | undefined,
  options: UseImmersveSupportedRegionsOptions = {},
) => {
  const immersveOnboardingEnabled = useSelector(
    selectImmersveOnboardingEnabled,
  );
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);

  const isImmersveCountry = Boolean(
    immersveOnboardingEnabled &&
      regionCode &&
      (cardFeatureFlag.immersveCountries ?? []).includes(regionCode),
  );

  const queryEnabled =
    options.enabled !== undefined ? options.enabled : isImmersveCountry;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: cardQueries.dashboard.keys.immersveSupportedRegions(),
    queryFn: () =>
      getController().getSupportedRegions(CardProviderIds.Immersve),
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const region = getRegionByCode(data, regionCode);
  const onboardingDocuments = getOnboardingLegalDocuments(region?.documents);
  const permanentDocuments = getPermanentLegalDocuments(region?.documents);

  return {
    region,
    onboardingDocuments,
    permanentDocuments,
    // RQ v4: isLoading is status==='loading' (true even when fetchStatus is
    // 'paused'). Do not AND with isFetching — that is isInitialLoading and
    // hides the loading state while the first fetch is paused offline.
    isLoading: Boolean(queryEnabled && isLoading),
    error: (error as Error | null) ?? null,
    refetch: async () => {
      const result = await refetch();
      return result.data ?? null;
    },
  };
};

export default useImmersveSupportedRegions;
