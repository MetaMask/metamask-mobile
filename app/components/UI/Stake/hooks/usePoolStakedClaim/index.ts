import { PooledStake, PooledStakingContract } from '@metamask/stake-sdk';
import { useStakeContext } from '../useStakeContext';
import trackErrorAsAnalytics from '../../../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { WalletDevice } from '@metamask/transaction-controller';
import { addTransaction } from '../../../../../util/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  generateClaimTxParams,
  isRequestClaimable,
  transformAggregatedClaimableExitRequestToMulticallArgs,
} from './utils';

const attemptMultiCallClaimTransaction = async (
  pooledStakesData: PooledStake,
  poolStakingContract: PooledStakingContract,
  activeAccountAddress: string,
) => {
  const multiCallData = transformAggregatedClaimableExitRequestToMulticallArgs(
    pooledStakesData.exitRequests,
  );

  const gasLimit = await poolStakingContract.estimateMulticallGas(
    multiCallData,
    activeAccountAddress,
  );

  const { data, chainId } =
    await poolStakingContract.encodeMulticallTransactionData(
      multiCallData,
      activeAccountAddress,
      { gasLimit, gasBufferPct: 30 }, // 30% buffer
    );

  const txParams = generateClaimTxParams(
    activeAccountAddress,
    poolStakingContract.contract.address,
    data,
    chainId,
    gasLimit.toString(),
  );

  return addTransaction(txParams, {
    deviceConfirmedOn: WalletDevice.MM_MOBILE,
    origin: ORIGIN_METAMASK,
  });
};

const attemptSingleClaimTransaction = async (
  pooledStakesData: PooledStake,
  poolStakingContract: PooledStakingContract,
  activeAccountAddress: string,
) => {
  const { positionTicket, timestamp, exitQueueIndex } =
    pooledStakesData.exitRequests[0];

  if (!isRequestClaimable(exitQueueIndex, timestamp)) return;

  const gasLimit = await poolStakingContract.estimateClaimExitedAssetsGas(
    positionTicket,
    timestamp,
    exitQueueIndex,
    activeAccountAddress,
  );

  const { data, chainId } =
    await poolStakingContract.encodeClaimExitedAssetsTransactionData(
      positionTicket,
      timestamp,
      exitQueueIndex,
      activeAccountAddress,
      {
        gasLimit,
        gasBufferPct: 30, // 30% buffer
      },
    );

  const txParams = generateClaimTxParams(
    activeAccountAddress,
    poolStakingContract.contract.address,
    data,
    chainId,
    gasLimit.toString(),
  );

  return addTransaction(txParams, {
    deviceConfirmedOn: WalletDevice.MM_MOBILE,
    origin: ORIGIN_METAMASK,
  });
};

const attemptPoolStakedClaimTransaction =
  (poolStakingContract: PooledStakingContract) =>
  async (activeAccountAddress: string, pooledStakesData: PooledStake) => {
    try {
      if (pooledStakesData.exitRequests.length === 0) return;

      const isMultiCallClaim = pooledStakesData.exitRequests.length > 1;

      return isMultiCallClaim
        ? await attemptMultiCallClaimTransaction(
            pooledStakesData,
            poolStakingContract,
            activeAccountAddress,
          )
        : await attemptSingleClaimTransaction(
            pooledStakesData,
            poolStakingContract,
            activeAccountAddress,
          );
    } catch (e) {
      const errorMessage = (e as Error).message;
      trackErrorAsAnalytics(
        'Pooled Staking Claim Transaction Failed',
        errorMessage,
      );
    }
  };

const usePoolStakedClaim = () => {
  const poolStakeContext = useStakeContext();

  const stakingContract =
    poolStakeContext?.stakingContract as PooledStakingContract;

  return {
    attemptPoolStakedClaimTransaction:
      attemptPoolStakedClaimTransaction(stakingContract),
  };
};

export default usePoolStakedClaim;
