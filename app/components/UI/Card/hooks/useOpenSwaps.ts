import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Hex } from 'viem';

import {
  selectEvmTokenFiatBalances,
  selectEvmTokens,
} from '../../../../selectors/multichain';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../Bridge/hooks/useSwapBridgeNavigation';
import Routes from '../../../../constants/navigation/Routes';
import { BridgeToken } from '../../Bridge/types';
import { CardTokenAllowance } from '../types';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { getHighestFiatToken } from '../util/getHighestFiatToken';
import {
  setDestToken,
  setSourceToken,
} from '../../../../core/redux/slices/bridge';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { TokenI } from '../../Tokens/types';
import Logger from '../../../../util/Logger';

export interface OpenSwapsParams {
  priorityToken: CardTokenAllowance;
  chainId: string;
  cardholderAddress?: string;
  beforeNavigate?: (navigate: () => void) => void;
}

export interface UseOpenSwapsOptions {
  location?: SwapBridgeNavigationLocation;
  sourcePage?: string;
}

export const useOpenSwaps = ({
  location = SwapBridgeNavigationLocation.TokenDetails,
  sourcePage = Routes.CARD.HOME,
}: UseOpenSwapsOptions = {}) => {
  const dispatch = useDispatch();
  const evmTokens = useSelector(selectEvmTokens);
  const [storedTopToken, setTopToken] = useState<TokenI | null>(null);
  const tokenFiatBalances = useSelector(selectEvmTokenFiatBalances);
  const { goToSwaps } = useSwapBridgeNavigation({ location, sourcePage });
  const { trackEvent, createEventBuilder } = useMetrics();

  const tokens = useMemo(
    () =>
      evmTokens.map((token, i) => ({
        ...token,
        tokenFiatAmount: tokenFiatBalances[i],
      })),
    [evmTokens, tokenFiatBalances],
  );

  Logger.log('tokens', tokens);

  const openSwaps = useCallback(
    ({
      priorityToken,
      chainId,
      cardholderAddress,
      beforeNavigate,
    }: OpenSwapsParams) => {
      if (!priorityToken) return;

      const destToken: BridgeToken = {
        ...priorityToken,
        image: buildTokenIconUrl(chainId, priorityToken.address),
      } as BridgeToken;
      dispatch(setDestToken(destToken));

      if (cardholderAddress) {
        const topToken = getHighestFiatToken(
          tokens,
          priorityToken.address as Hex,
        );
        Logger.log('topToken', topToken);

        if (topToken && !topToken.isETH) {
          Logger.log('========== IS NOT ETH AND TOPTOKEN EXISTS =============');
          setTopToken(topToken);
          dispatch(
            setSourceToken({
              chainId: topToken.chainId as Hex,
              address: topToken.address,
              decimals: topToken.decimals,
              symbol: topToken.symbol,
              balance: topToken.balance,
              image: topToken.image,
              balanceFiat: topToken.balanceFiat,
              name: topToken.name,
            }),
          );
        }
      }

      const navigate = () => {
        goToSwaps();
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_SWAPS_CLICKED)
            .addProperties({
              source_token: storedTopToken?.symbol,
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
      tokens,
      goToSwaps,
      trackEvent,
      createEventBuilder,
      storedTopToken,
    ],
  );

  return { openSwaps };
};
