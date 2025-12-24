import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import { getDecimalChainId } from '../../../../util/networks';
import { TokenI } from '../../Tokens/types';
import { EarnTokenDetails } from '../types/lending.types';
import { getEstimatedAnnualRewards } from '../utils/token';

const useEarnTokens = () => {
  const earnTokensData = useSelector(earnSelectors.selectEarnTokens);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const getEarnToken = useCallback(
    (token: TokenI | EarnTokenDetails) => {
      const earnToken =
        earnTokensData.earnTokensByChainIdAndAddress?.[
          getDecimalChainId(token?.chainId)
        ]?.[token.address.toLowerCase()];
      if (token?.isETH && token?.isStaked !== earnToken?.isStaked) return;

      return earnToken;
    },
    [earnTokensData.earnTokensByChainIdAndAddress],
  );

  const getOutputToken = useCallback(
    (token: TokenI | EarnTokenDetails) => {
      const outputToken =
        earnTokensData.earnOutputTokensByChainIdAndAddress?.[
          getDecimalChainId(token?.chainId)
        ]?.[token.address.toLowerCase()];
      if (token?.isETH && token?.isStaked !== outputToken?.isStaked) return;

      return outputToken;
    },
    [earnTokensData.earnOutputTokensByChainIdAndAddress],
  );

  const getPairedEarnOutputToken = useCallback(
    (underlyingToken: TokenI | EarnTokenDetails) => {
      const pairedEarnOutputToken =
        earnTokensData.earnTokenPairsByChainIdAndAddress?.[
          getDecimalChainId(underlyingToken.chainId)
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
          getDecimalChainId(outputToken.chainId)
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

  const getEstimatedAnnualRewardsForAmount = (
    earnToken: EarnTokenDetails,
    amountTokenMinimalUnit: string,
    amountFiatNumber: number,
  ) =>
    getEstimatedAnnualRewards(
      earnToken.experience.apr,
      amountFiatNumber,
      amountTokenMinimalUnit,
      currentCurrency,
      earnToken.decimals,
      earnToken?.ticker || earnToken.symbol,
    );

  return {
    ...earnTokensData,
    getEarnToken,
    getOutputToken,
    getPairedEarnTokens,
    getEarnExperience,
    getEstimatedAnnualRewardsForAmount,
  };
};

export default useEarnTokens;
