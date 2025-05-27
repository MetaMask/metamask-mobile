import {
  LendingMarketWithPosition,
  LendingPositionWithMarket,
  selectLendingMarkets,
  selectLendingPositionsWithMarket,
} from '@metamask-previews/earn-controller';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import { getDecimalChainId } from '../../../../util/networks';
import { TokenI } from '../../Tokens/types';
import { EarnTokenDetails } from '../types/lending.types';

// TODO: move to earn-controller
const selectLendingPositionsByProtocolChainIdMarketId = createSelector(
  selectLendingPositionsWithMarket,
  (positionsWithMarket) =>
    positionsWithMarket.reduce((acc, position) => {
      acc[position.protocol] ??= {};
      acc[position.protocol][position.chainId] ??= {};
      acc[position.protocol][position.chainId][position.marketId] = position;
      return acc;
    }, {} as Record<string, Record<string, Record<string, LendingPositionWithMarket>>>),
);

export const selectLendingMarketsWithPosition = createSelector(
  selectLendingPositionsByProtocolChainIdMarketId,
  selectLendingMarkets,
  (positionsByProtocolChainIdMarketId, lendingMarkets) =>
    lendingMarkets.map((market) => {
      const position =
        positionsByProtocolChainIdMarketId?.[market.protocol]?.[
          market.chainId
        ]?.[market.id];
      return {
        ...market,
        position: position || null,
      };
    }),
);

export const selectLendingMarketsByChainIdAndOutputTokenAddress =
  createSelector(selectLendingMarketsWithPosition, (marketsWithPosition) =>
    marketsWithPosition.reduce((acc, market) => {
      if (market.outputToken?.address) {
        acc[market.chainId] = acc?.[market.chainId] || {};
        acc[market.chainId][market.outputToken.address] =
          acc?.[market.chainId]?.[market.outputToken.address] || [];
        acc[market.chainId][market.outputToken.address].push(market);
      }
      return acc;
    }, {} as Record<string, Record<string, LendingMarketWithPosition[]>>),
  );

// we want a list of markets across protocols for chainId and token address
export const selectLendingMarketsByChainIdAndTokenAddress = createSelector(
  selectLendingMarketsWithPosition,
  (marketsWithPosition) =>
    marketsWithPosition.reduce((acc, market) => {
      if (market.underlying?.address) {
        acc[market.chainId] = acc?.[market.chainId] || {};
        acc[market.chainId][market.underlying.address] =
          acc?.[market.chainId]?.[market.underlying.address] || [];
        acc[market.chainId][market.underlying.address].push(market);
      }
      return acc;
    }, {} as Record<string, Record<string, LendingMarketWithPosition[]>>),
);

const useEarnTokens = () => {
  const earnTokensData = useSelector(earnSelectors.selectEarnTokens);

  const getEarnToken = useCallback(
    (token: TokenI | EarnTokenDetails) => {
      const earnToken =
        earnTokensData.earnTokensByChainIdAndAddress?.[
          getDecimalChainId(token.chainId)
        ]?.[token.address.toLowerCase()];

      if (token.isETH && token.isStaked !== earnToken?.isStaked) return;

      return earnToken;
    },
    [earnTokensData.earnTokensByChainIdAndAddress],
  );

  const getOutputToken = useCallback(
    (token: TokenI | EarnTokenDetails) => {
      const outputToken =
        earnTokensData.earnOutputTokensByChainIdAndAddress?.[
          getDecimalChainId(token.chainId)
        ]?.[token.address.toLowerCase()];

      if (token.isETH && token.isStaked !== outputToken?.isStaked) return;

      return outputToken;
    },
    [earnTokensData.earnOutputTokensByChainIdAndAddress],
  );

  const getPairedEarnOutputToken = useCallback(
    (underlyingToken: TokenI | EarnTokenDetails) => {
      const pairedEarnOutputToken =
        earnTokensData.earnTokenPairsByChainIdAndAddress?.[
          Number(underlyingToken.chainId)
        ]?.[underlyingToken.address.toLowerCase()]?.[0];

      if (
        underlyingToken.isETH &&
        underlyingToken.isStaked === pairedEarnOutputToken?.isStaked
      )
        return;

      return pairedEarnOutputToken;
    },

    [earnTokensData.earnTokenPairsByChainIdAndAddress],
  );

  const getPairedEarnTokenFromOutputToken = useCallback(
    (outputToken: TokenI | EarnTokenDetails) => {
      const pairedEarnToken =
        earnTokensData.earnOutputTokenPairsByChainIdAndAddress?.[
          Number(outputToken.chainId)
        ]?.[outputToken.address.toLowerCase()]?.[0];

      if (
        outputToken.isETH &&
        outputToken.isStaked === pairedEarnToken?.isStaked
      )
        return;

      return pairedEarnToken;
    },
    [earnTokensData.earnOutputTokenPairsByChainIdAndAddress],
  );

  const getEarnExperience = useCallback(
    (token: TokenI | EarnTokenDetails) => {
      const tokenToUse = getEarnToken(token) || getOutputToken(token);
      return tokenToUse?.experiences?.[0];
    },
    [getEarnToken, getOutputToken],
  );

  const getPairedEarnTokens = useCallback(
    (token: TokenI | EarnTokenDetails) => {
      let earnTokenToUse;
      let outputTokenToUse;
      const earnToken = getEarnToken(token);
      const outputToken = getOutputToken(token);
      if (earnToken) {
        earnTokenToUse = earnToken;
        outputTokenToUse = getPairedEarnOutputToken(earnToken);
      } else if (outputToken) {
        outputTokenToUse = outputToken;
        earnTokenToUse = getPairedEarnTokenFromOutputToken(outputToken);
      }
      return {
        earnToken: earnTokenToUse,
        outputToken: outputTokenToUse,
      };
    },
    [
      getEarnToken,
      getOutputToken,
      getPairedEarnOutputToken,
      getPairedEarnTokenFromOutputToken,
    ],
  );

  return {
    ...earnTokensData,
    getEarnToken,
    getOutputToken,
    getPairedEarnTokens,
    getEarnExperience,
  };
};

export default useEarnTokens;
