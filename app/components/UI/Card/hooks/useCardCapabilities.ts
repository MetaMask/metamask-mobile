import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCardActiveProviderId,
  selectCardUserLocation,
} from '../../../../selectors/cardController';
import Engine from '../../../../core/Engine';
import type { CardProviderCapabilities } from '../../../../core/Engine/controllers/card-controller/provider-types';

export const useCardCapabilities = (): CardProviderCapabilities | null => {
  const providerId = useSelector(selectCardActiveProviderId);
  // Include location as a dep so capabilities re-compute when the user's
  // location changes (e.g. after auth, when location is set from tokens).
  const userLocation = useSelector(selectCardUserLocation);
  return useMemo(() => {
    if (!providerId) return null;
    return Engine.context?.CardController?.getCapabilities() ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, userLocation]);
};
