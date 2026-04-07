import { useSelector } from 'react-redux';
import { selectCardActiveProviderId } from '../../../../selectors/cardController';
import Engine from '../../../../core/Engine';
import type { CardProviderCapabilities } from '../../../../core/Engine/controllers/card-controller/provider-types';

export const useCardCapabilities = (): CardProviderCapabilities | null => {
  const providerId = useSelector(selectCardActiveProviderId);
  if (!providerId) return null;
  return Engine.context?.CardController?.getCapabilities() ?? null;
};
