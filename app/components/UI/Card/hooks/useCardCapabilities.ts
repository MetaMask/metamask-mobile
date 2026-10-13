import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCardActiveProviderId,
  selectCardSelectedCountry,
  selectCardUserLocation,
} from '../../../../selectors/cardController';
import Engine from '../../../../core/Engine';
import type { CardProviderCapabilities } from '../../../../core/Engine/controllers/card-controller/provider-types';

export const useCardCapabilities = (): CardProviderCapabilities | null => {
  const providerId = useSelector(selectCardActiveProviderId);
  // Location and country both change Immersve capabilities without changing
  // the provider id: NZ turns Money account linking on, other countries do not.
  const userLocation = useSelector(selectCardUserLocation);
  const selectedCountry = useSelector(selectCardSelectedCountry);
  return useMemo(() => {
    if (!providerId) return null;
    return Engine.context?.CardController?.getCapabilities() ?? null;
  }, [providerId, userLocation, selectedCountry]);
};
