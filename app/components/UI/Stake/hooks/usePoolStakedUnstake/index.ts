import { PooledStakingContract, ChainId } from '@metamask/stake-sdk';
import { useStakeContext } from '../useStakeContext';
import {
  TransactionParams,
  WalletDevice,
} from '@metamask/transaction-controller';
import { addTransaction } from '../../../../../util/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import trackErrorAsAnalytics from '../../../../../util/metrics/TrackError/trackErrorAsAnalytics';

const generateUnstakeTxParams = (
  activeAccountAddress: string,
  contractAddress: string,
  encodedUnstakeTransactionData: string,
  chainId: ChainId,
): TransactionParams => ({
  to: contractAddress,
  from: activeAccountAddress,
  chainId: `0x${chainId}`,
  data: encodedUnstakeTransactionData,
  value: '0',
});

const attemptUnstakeTransaction =
  (pooledStakingContract: PooledStakingContract) =>
  // Note: receiver is the user address attempting to unstake.
  async (valueWei: string, receiver: string) => {
    try {
      const shares = await pooledStakingContract.convertToShares(valueWei);

      const gasLimit = await pooledStakingContract.estimateEnterExitQueueGas(
        shares.toString(),
        receiver,
      );

      const { data, chainId } =
        await pooledStakingContract.encodeEnterExitQueueTransactionData(
          shares,
          receiver,
          { gasLimit },
        );

      const txParams = generateUnstakeTxParams(
        receiver,
        pooledStakingContract.contract.address,
        data,
        chainId,
      );

      return await addTransaction(txParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        origin: ORIGIN_METAMASK,
      });
    } catch (e) {
      const errorMessage = (e as Error).message;
      trackErrorAsAnalytics(
        'Pooled Staking Unstake Transaction Failed',
        errorMessage,
      );
    }
  };

const usePoolStakedUnstake = () => {
  const stakeContext = useStakeContext();

  const stakingContract = stakeContext.stakingContract as PooledStakingContract;

  return {
    attemptUnstakeTransaction: attemptUnstakeTransaction(stakingContract),
  };
};

export default usePoolStakedUnstake;
