import { PooledStake, PooledStakingContract } from '@metamask/stake-sdk';
import { useStakeContext } from '../useStakeContext';
import trackErrorAsAnalytics from '../../../../../util/metrics/TrackError/trackErrorAsAnalytics';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { addTransaction } from '../../../../../util/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  generateClaimTxParams,
  isRequestClaimable,
  transformAggregatedClaimableExitRequestToMulticallArgs,
} from './utils';
import { NetworkClientId } from '@metamask/network-controller';
import { Stake } from '../../sdk/stakeSdkProvider';

const attemptMultiCallClaimTransaction = async (
  pooledStakesData: PooledStake,
  poolStakingContract: PooledStakingContract,
  activeAccountAddress: string,
  networkClientId: NetworkClientId,
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
      { gasLimit },
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
    networkClientId,
    origin: ORIGIN_METAMASK,
    type: TransactionType.stakingClaim,
  });
};

const attemptSingleClaimTransaction = async (
  pooledStakesData: PooledStake,
  poolStakingContract: PooledStakingContract,
  activeAccountAddress: string,
  networkClientId: NetworkClientId,
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
    networkClientId,
    origin: ORIGIN_METAMASK,
    type: TransactionType.stakingClaim,
  });
};

const attemptPoolStakedClaimTransaction =
  (
    poolStakingContract: PooledStakingContract,
    networkClientId: NetworkClientId,
  ) =>
  async (activeAccountAddress: string, pooledStakesData: PooledStake) => {
    try {
      if (pooledStakesData.exitRequests.length === 0) return;

      const isMultiCallClaim = pooledStakesData.exitRequests.length > 1;

      return isMultiCallClaim
        ? await attemptMultiCallClaimTransaction(
            pooledStakesData,
            poolStakingContract,
            activeAccountAddress,
            networkClientId,
          )
        : await attemptSingleClaimTransaction(
            pooledStakesData,
            poolStakingContract,
            activeAccountAddress,
            networkClientId,
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
  const { networkClientId, stakingContract } =
    useStakeContext() as Required<Stake>;

  return {
    attemptPoolStakedClaimTransaction: attemptPoolStakedClaimTransaction(
      stakingContract,
      networkClientId,
    ),
  };
};

export default usePoolStakedClaim;
