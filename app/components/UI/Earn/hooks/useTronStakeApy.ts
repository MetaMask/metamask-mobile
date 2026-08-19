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
const UNSUPPORTED_CHAIN_ERROR_MESSAGE = 'Unsupported or missing Tron chain ID';

function isSupportedTronChainId(
  chainId: ChainId | undefined,
): chainId is TronChainId {
  return chainId === ChainId.TRON_MAINNET || chainId === ChainId.TRON_NILE;
}

function isValidAnnualizedRate(annualizedRate: string): boolean {
  return (
    annualizedRate.trim() !== '' && Number.isFinite(Number(annualizedRate))
  );
}

export enum FetchStatus {
  Initial = 'initial',
  Fetching = 'fetching',
  Fetched = 'fetched',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Error = 'error',
}

interface UseTronStakeApyOptions {
  fetchOnMount?: boolean;
  chainId?: TronChainId;
  strictChainHandling?: boolean;
}

const useTronStakeApy = ({
  fetchOnMount = true,
  chainId,
  strictChainHandling = false,
}: UseTronStakeApyOptions = {}) => {
  const resolvedChainId =
    chainId ?? (strictChainHandling ? undefined : ChainId.TRON_MAINNET);
  const hasUnsupportedStrictChain = strictChainHandling && !chainId;
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>(
    hasUnsupportedStrictChain ? FetchStatus.Error : FetchStatus.Initial,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasUnsupportedStrictChain ? UNSUPPORTED_CHAIN_ERROR_MESSAGE : null,
  );
  const [apyDecimal, setApyDecimal] = useState<string | null>(null);
  const [apyPercent, setApyPercent] = useState<string | null>(null);

  const fetchConsensysWitness = useCallback(async () => {
    if (!isSupportedTronChainId(resolvedChainId)) {
      setFetchStatus(FetchStatus.Error);
      setErrorMessage(UNSUPPORTED_CHAIN_ERROR_MESSAGE);
      setApyDecimal(null);
      setApyPercent(null);
      return;
    }

    try {
      setFetchStatus(FetchStatus.Fetching);
      setErrorMessage(null);

      const witnesses =
        await tronStakingApiService.getWitnesses(resolvedChainId);

      const consensysWitness = witnesses?.data?.find(
        (witness) =>
          witness.address ===
          CONSENSYS_WITNESS_ADDRESS_BY_CHAIN_ID[resolvedChainId],
      );

      setFetchStatus(FetchStatus.Fetched);

      if (
        consensysWitness &&
        isValidAnnualizedRate(consensysWitness.annualizedRate)
      ) {
        setApyDecimal(consensysWitness.annualizedRate);
        setApyPercent(`${truncateNumber(consensysWitness.annualizedRate)}%`);
      } else {
        setApyDecimal(null);
        setApyPercent(null);
      }
    } catch (error: unknown) {
      setFetchStatus(FetchStatus.Error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
      setApyDecimal(null);
      setApyPercent(null);
    }
  }, [resolvedChainId]);

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
    fetchStatus,
    errorMessage,
    apyDecimal,
    apyPercent,
    refetch,
  };
};

export default useTronStakeApy;
