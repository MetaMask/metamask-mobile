import { useCallback, useMemo } from 'react';
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
  const tokenFiatBalances = useSelector(selectEvmTokenFiatBalances);
  const { goToSwaps } = useSwapBridgeNavigation({ location, sourcePage });

  const tokens = useMemo(
    () =>
      evmTokens.map((token, i) => ({
        ...token,
        tokenFiatAmount: tokenFiatBalances[i],
      })),
    [evmTokens, tokenFiatBalances],
  );

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
        if (topToken && !topToken.isETH) {
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
      };

      if (beforeNavigate) {
        beforeNavigate(navigate);
      } else {
        navigate();
      }
    },
    [dispatch, tokens, goToSwaps],
  );

  return { openSwaps };
};
