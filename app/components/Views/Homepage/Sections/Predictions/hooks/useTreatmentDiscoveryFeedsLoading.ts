import { useLayoutEffect, useRef, useState } from 'react';

/**
 * True while treatment discovery feeds have not completed their first settled fetch.
 * Avoids treating `isFetching === false` as "ready" on the same render `enabled` flips
 * true (before `usePredictMarketData`'s layout effect sets loading).
 */
export function useTreatmentDiscoveryFeedsLoading({
  isTreatmentDiscovery,
  isWorldCupFetching,
  isNbaChampionFetching,
}: {
  isTreatmentDiscovery: boolean;
  isWorldCupFetching: boolean;
  isNbaChampionFetching: boolean;
}): boolean {
  const [hasDiscoveryFeedsSettled, setHasDiscoveryFeedsSettled] =
    useState(false);
  const wasTreatmentDiscoveryRef = useRef(isTreatmentDiscovery);

  useLayoutEffect(() => {
    if (!isTreatmentDiscovery) {
      setHasDiscoveryFeedsSettled(false);
      wasTreatmentDiscoveryRef.current = false;
      return;
    }

    if (!wasTreatmentDiscoveryRef.current) {
      setHasDiscoveryFeedsSettled(false);
      wasTreatmentDiscoveryRef.current = true;
    }

    if (!isWorldCupFetching && !isNbaChampionFetching) {
      setHasDiscoveryFeedsSettled(true);
    }
  }, [isTreatmentDiscovery, isWorldCupFetching, isNbaChampionFetching]);

  return isTreatmentDiscovery && !hasDiscoveryFeedsSettled;
}
