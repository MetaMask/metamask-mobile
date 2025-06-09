import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
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
const useEarnTokens = ({
  includeStakingTokens = false,
  includeLendingTokens = false,
  includeReceiptTokens = false,
}: Partial<{
  includeStakingTokens: boolean;
  includeLendingTokens: boolean;
  includeReceiptTokens: boolean;
}> = {}) => {
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

  const supportedEarnTokens = useMemo(() => {
    if (isLoadingStakingEligibility || !isPortfolioViewEnabled()) return [];

    const allTokens = Object.values(tokens).flat() as TokenI[];

    if (!allTokens.length) return [];

    const supportedTokens = getSupportedEarnTokens(allTokens, {
      stakingTokens: includeStakingTokens,
      lendingTokens: includeLendingTokens,
      receiptTokens: includeReceiptTokens,
    });

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
    includeLendingTokens,
    includeReceiptTokens,
    includeStakingTokens,
    isEligibleToStake,
    isLoadingStakingEligibility,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    tokens,
  ]);

  return supportedEarnTokens;
};

export const useHasSupportedStablecoin = (
  tokenChainId: Hex,
  tokenSymbol?: string,
  isStaked?: boolean,
) => {
  const tokens = useSelector((state: RootState) =>
    selectAccountTokensAcrossChains(state),
  );

  const hasSupportedStablecoin = useMemo(() => {
    const tokensByChainId = tokens?.[tokenChainId] as TokenI[] | undefined;
    return (
      isStaked &&
      tokensByChainId?.some(
        (t) => t?.chainId === tokenChainId && t?.symbol === tokenSymbol,
      )
    );
  }, [isStaked, tokenChainId, tokenSymbol, tokens]);

  return Boolean(hasSupportedStablecoin);
};

export default useEarnTokens;
