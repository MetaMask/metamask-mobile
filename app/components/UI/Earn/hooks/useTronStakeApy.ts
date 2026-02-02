import { useCallback, useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';
import { tronStakingApiService } from '../../Stake/sdk/stakeSdkProvider';
import { ChainId } from '@metamask/stake-sdk';
import { truncateNumber } from '../utils';

type TronChainId = ChainId.TRON_MAINNET | ChainId.TRON_NILE;

// Consensys has witnesses for the following chains:
const CONSENSYS_WITNESS_ADDRESS_BY_CHAIN_ID: Record<TronChainId, string> = {
  [ChainId.TRON_MAINNET]: 'TVMwGfdDz58VvM7yTzGMWWSHsmofSxa9jH',
  [ChainId.TRON_NILE]: 'TBSX9dpxbNrsLgTADXtkC2ASmxW4Q2mTgY',
};

/**
 * Fallback APR used when the API hasn't responded yet or fails.
 * Based on the current MetaMask witness annualized rate from Tronscan.
 */
const DEFAULT_APY_DECIMAL = '0.0244';
const DEFAULT_APY_PERCENT = '2.44%';

interface UseTronStakeApyOptions {
  fetchOnMount?: boolean;
  chainId?: TronChainId;
}

const useTronStakeApy = ({
  fetchOnMount = true,
  chainId = ChainId.TRON_MAINNET,
}: UseTronStakeApyOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apyDecimal, setApyDecimal] = useState<string | null>(null);
  const [apyPercent, setApyPercent] = useState<string | null>(null);

  const fetchConsensysWitness = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const witnesses = await tronStakingApiService.getWitnesses(chainId);

      const consensysWitness = witnesses?.data?.find(
        (witness) =>
          witness.address === CONSENSYS_WITNESS_ADDRESS_BY_CHAIN_ID[chainId],
      );

      if (consensysWitness) {
        // API returns percentage format (e.g., '4.56' for 4.56%), convert to decimal for calculations
        // Use BigNumber to avoid floating-point precision errors (e.g., 4.56/100 = 0.045599999999999995)
        const rateDecimal = new BigNumber(consensysWitness.annualizedRate)
          .dividedBy(100)
          .toString();
        setApyDecimal(rateDecimal);
        setApyPercent(`${truncateNumber(consensysWitness.annualizedRate)}%`);
      } else {
        setApyDecimal(null);
        setApyPercent(null);
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
      setApyDecimal(null);
      setApyPercent(null);
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchConsensysWitness();
    }
  }, [fetchConsensysWitness, fetchOnMount]);

  const refetch = useCallback(() => {
    setApyDecimal(null);
    setApyPercent(null);
    setErrorMessage(null);
    return fetchConsensysWitness();
  }, [fetchConsensysWitness]);

  return {
    isLoading,
    errorMessage,
    apyDecimal: apyDecimal ?? DEFAULT_APY_DECIMAL,
    apyPercent: apyPercent ?? DEFAULT_APY_PERCENT,
    refetch,
  };
};

export default useTronStakeApy;
