<<<<<<< HEAD
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
=======
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import useStakingEligibility from '../../Stake/hooks/useStakingEligibility';
import { TokenI } from '../../Tokens/types';
import { getSupportedEarnTokens, filterEligibleTokens } from '../utils';
import { selectAccountTokensAcrossChains } from '../../../../selectors/multichain';
import { isPortfolioViewEnabled } from '../../../../util/networks';
import { RootState } from '../../BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { useEarnTokenDetails } from './useEarnTokenDetails';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../selectors/featureFlags';

// Filters user's tokens to only return the supported and enabled earn tokens.
const useEarnTokens = () => {
  const tokens = useSelector((state: RootState) =>
    selectAccountTokensAcrossChains(state),
  );

  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();

  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const {
    isEligible: isEligibleToStake,
    isLoadingEligibility: isLoadingStakingEligibility,
  } = useStakingEligibility();

  const supportedStablecoins = useMemo(() => {
    if (isLoadingStakingEligibility || !isPortfolioViewEnabled()) return [];

    const allTokens = Object.values(tokens).flat() as TokenI[];

    if (!allTokens.length) return [];

    const supportedTokens = getSupportedEarnTokens(allTokens);

    const eligibleTokens = filterEligibleTokens(
      supportedTokens,
      // TODO: Add eligibility check for stablecoin lending before launch.
      {
        canStake: isEligibleToStake && isPooledStakingEnabled,
        canLend: isStablecoinLendingEnabled,
      },
    );

    const eligibleTokensWithBalances = eligibleTokens?.map((token) =>
      getTokenWithBalanceAndApr(token),
    );

    // Tokens with a balance of 0 are placed at the end of the list.
    return eligibleTokensWithBalances.sort((a, b) => {
      const fiatBalanceA = parseFloat(a.balanceFormatted);
      const fiatBalanceB = parseFloat(b.balanceFormatted);

      return (fiatBalanceA === 0 ? 1 : 0) - (fiatBalanceB === 0 ? 1 : 0);
    });
  }, [
    getTokenWithBalanceAndApr,
    isEligibleToStake,
    isLoadingStakingEligibility,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    tokens,
  ]);

  return supportedStablecoins;
>>>>>>> stable
};

export default useEarnTokens;
