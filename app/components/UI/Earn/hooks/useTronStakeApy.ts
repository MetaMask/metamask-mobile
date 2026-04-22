import { useCallback, useEffect, useState } from 'react';
import { tronStakingApiService } from '../../Stake/sdk/stakeSdkProvider';
import { ChainId } from '@metamask/stake-sdk';
import { truncateNumber } from '../utils';

type TronChainId = ChainId.TRON_MAINNET | ChainId.TRON_NILE;

// Consensys has witnesses for the following chains:
const CONSENSYS_WITNESS_ADDRESS_BY_CHAIN_ID: Record<TronChainId, string> = {
  [ChainId.TRON_MAINNET]: 'TVMwGfdDz58VvM7yTzGMWWSHsmofSxa9jH',
  [ChainId.TRON_NILE]: 'TBSX9dpxbNrsLgTADXtkC2ASmxW4Q2mTgY',
};

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
        setApyDecimal(consensysWitness.annualizedRate);
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
    apyDecimal,
    apyPercent,
    refetch,
  };
};

export default useTronStakeApy;
