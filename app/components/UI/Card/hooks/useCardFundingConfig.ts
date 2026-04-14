import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  selectCardActiveProviderId,
  selectIsCardAuthenticated,
} from '../../../../selectors/cardController';
import Engine from '../../../../core/Engine';

export const useCardFundingConfig = () => {
  const providerId = useSelector(selectCardActiveProviderId);
  const isAuthenticated = useSelector(selectIsCardAuthenticated);

  return useQuery({
    queryKey: ['card', 'funding-config', providerId],
    queryFn: () => Engine.context.CardController.getFundingConfig(),
    enabled: !!providerId && isAuthenticated,
    staleTime: 5 * 60_000,
  });
};
