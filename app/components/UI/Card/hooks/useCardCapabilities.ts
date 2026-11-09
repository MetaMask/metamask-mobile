import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCardActiveProviderId,
  selectCardUserLocation,
  selectImmersveFundingChannelForSelectedCountry,
} from '../../../../selectors/cardController';
import Engine from '../../../../core/Engine';
import type { CardProviderCapabilities } from '../../../../core/Engine/controllers/card-controller/provider-types';

export const useCardCapabilities = (): CardProviderCapabilities | null => {
  const providerId = useSelector(selectCardActiveProviderId);
  // Location and the resolved funding channel both change Immersve
  // capabilities without changing the provider id.
  const userLocation = useSelector(selectCardUserLocation);
  const fundingChannel = useSelector(
    selectImmersveFundingChannelForSelectedCountry,
  );
  return useMemo(() => {
    if (!providerId) return null;
    return Engine.context?.CardController?.getCapabilities() ?? null;
  }, [providerId, userLocation, fundingChannel]);
};
