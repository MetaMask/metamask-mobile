import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Hex } from 'viem';

import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../Bridge/hooks/useSwapBridgeNavigation';
import Routes from '../../../../constants/navigation/Routes';
import { BridgeToken } from '../../Bridge/types';
import { CardTokenAllowance } from '../types';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { getHighestFiatToken } from '../util/getHighestFiatToken';
import { setDestToken } from '../../../../core/redux/slices/bridge';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { selectAllPopularNetworkConfigurations } from '../../../../selectors/networkController';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';

export interface OpenSwapsParams {
  chainId: string;
  cardholderAddress?: string;
  beforeNavigate?: (navigate: () => void) => void;
}

export interface UseOpenSwapsOptions {
  location?: SwapBridgeNavigationLocation;
  sourcePage?: string;
  priorityToken?: CardTokenAllowance;
}

export const useOpenSwaps = ({
  location = SwapBridgeNavigationLocation.TokenDetails,
  sourcePage = Routes.CARD.HOME,
  priorityToken,
}: UseOpenSwapsOptions = {}) => {
  const dispatch = useDispatch();
  const popularNetworks = useSelector(selectAllPopularNetworkConfigurations);
  const chainIds = Object.entries(popularNetworks).map(
    (network) => network[1].chainId,
  );
  const tokensWithBalance = useTokensWithBalance({
    chainIds,
  });
  const { trackEvent, createEventBuilder } = useMetrics();

  const sourceToken = useMemo(() => {
    if (priorityToken) {
      const highestFiatToken = getHighestFiatToken(
        tokensWithBalance,
        priorityToken.address as Hex,
      );

      return highestFiatToken;
    }
  }, [tokensWithBalance, priorityToken]);

  const { goToSwaps } = useSwapBridgeNavigation({
    location,
    sourcePage,
    sourceToken,
  });

  const openSwaps = useCallback(
    ({ chainId, beforeNavigate }: OpenSwapsParams) => {
      if (!priorityToken) return;

      const destToken: BridgeToken = {
        ...priorityToken,
        image: buildTokenIconUrl(chainId, priorityToken.address),
      } as BridgeToken;
      dispatch(setDestToken(destToken));

      const navigate = () => {
        goToSwaps(sourceToken);
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_SWAPS_CLICKED)
            .addProperties({
              source_token: sourceToken?.symbol,
              destination_token: destToken.symbol,
            })
            .build(),
        );
      };

      if (beforeNavigate) {
        beforeNavigate(navigate);
      } else {
        navigate();
      }
    },
    [
      dispatch,
      goToSwaps,
      trackEvent,
      createEventBuilder,
      sourceToken,
      priorityToken,
    ],
  );

  return { openSwaps };
};
