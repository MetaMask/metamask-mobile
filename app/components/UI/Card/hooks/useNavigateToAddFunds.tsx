import { useSelector } from 'react-redux';
import AppConstants from '../../../../core/AppConstants';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { useMemo, useCallback } from 'react';
import { isSwapsAllowed } from '../../Swaps/utils';
import { selectChainId } from '../../../../selectors/networkController';

export const useNavigateToAddFunds = (
  navigation: NavigationProp<ParamListBase>,
  destinationTokenAddress: string,
) => {
  const chainId = useSelector(selectChainId);
  const isSwapEnabled = useMemo(
    () => AppConstants.SWAPS.ACTIVE && isSwapsAllowed(chainId),
    [chainId],
  );
  const { trackEvent, createEventBuilder } = useMetrics();

  const navigateToAddFunds = useCallback(() => {
    if (isSwapEnabled) {
      navigation?.navigate(Routes.SWAPS, {
        screen: Routes.SWAPS_AMOUNT_VIEW,
        params: {
          chainId,
          destinationToken: destinationTokenAddress,
          sourcePage: 'CardHome',
        },
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED).build(),
      );
    }
  }, [
    isSwapEnabled,
    navigation,
    chainId,
    destinationTokenAddress,
    trackEvent,
    createEventBuilder,
  ]);

  return {
    navigateToAddFunds,
    isSwapEnabled,
  };
};
